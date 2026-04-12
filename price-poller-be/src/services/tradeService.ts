import { BID_ASK_CHANNEL, redis } from "../lib/redisClient";
import { pool } from "../config/db";
import { PoolClient } from "pg";
import { Trade } from "../models/trade";
import { getLatestTradePrice } from "./timescaleService";

const COMMISSION_RATE = 0.001; // 0.1% fee per side
const DAILY_SWAP_RATE = 0.0001; // 0.01% fee per day

export type TradeWithUnrealizedPnl = Trade & { unrealized_pnl: number | null };

export const currentPrices: Map<string, { ask: number; bid: number }> =
  new Map();

export const startPriceListener = () => {
  const subscriber = redis.duplicate();
  subscriber.subscribe(BID_ASK_CHANNEL, (error) => {
    if (error) {
      console.error(
        "Failed to subscribe to Redis channel for trading service",
        error,
      );
    } else {
      console.log("Price listener subscribed to Redis channel successfully");
    }
  });

  subscriber.on("message", (channel, message) => {
    if (channel === BID_ASK_CHANNEL) {
      try {
        const parsedMessage = JSON.parse(message);
        const symbol = parsedMessage.symbol;
        const askPrice = parsedMessage.ask;
        const bidPrice = parsedMessage.bid;
        if (symbol && askPrice !== undefined) {
          currentPrices.set(symbol, { ask: askPrice, bid: bidPrice });
        }
      } catch (error) {
        console.error("Error parsing Redis message:", error);
      }
    }
  });
};

export const createTrade = async (
  userId: number,
  tradeDetails: TradeRequest,
): Promise<string> => {
  const {
    type,
    leverage,
    symbol,
    quantity,
    margin: manualMargin,
    stopLoss,
    takeProfit,
    orderType = "market",
    limitPrice,
  } = tradeDetails;

  const lowerCaseSymbol = symbol.toLowerCase();

  let entryPrice: number;

  if (orderType === "market") {
    const priceInfo = currentPrices.get(lowerCaseSymbol);
    entryPrice = type === "buy" ? (priceInfo?.ask ?? 0) : (priceInfo?.bid ?? 0);

    console.log("[createTrade] Resolving market entry price", {
      userId,
      symbol: lowerCaseSymbol,
      type,
      priceInfo,
      chosenEntryPrice: entryPrice,
    });

    // Fallback: if the in‑memory price cache is empty (e.g. right after
    // startup or if the price listener briefly disconnects), try to pull the
    // latest price from Timescale instead of immediately failing.
    if (!entryPrice) {
      const latest = await getLatestTradePrice(lowerCaseSymbol);
      console.log("[createTrade] Fallback to DB latest price", {
        symbol: lowerCaseSymbol,
        latest,
      });
      if (!latest) {
        throw new Error(
          "Entry price is not available for this symbol right now.",
        );
      }
      entryPrice = latest;
    }
  } else {
    // For limit/stop orders we store the requested limit price; the actual
    // execution price is set later when the order is filled.
    if (!limitPrice) {
      throw new Error("limitPrice is required for limit and stop orders");
    }
    entryPrice = limitPrice;
  }

  // Determine the effective leverage, defaulting to 1 if not provided
  const effectiveLeverage = leverage || 1;

  // Calculate margin: use manualMargin if provided, otherwise calculate based on effectiveLverage
  const margin =
    manualMargin !== undefined
      ? manualMargin
      : (quantity * entryPrice) / effectiveLeverage;
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock the user's balance row and get current balance
    const balanceRes = await client.query(
      "SELECT balance FROM balances WHERE user_id = $1 FOR UPDATE",
      [userId],
    );
    if (balanceRes.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("User balance record not found.");
    }
    const balance = balanceRes.rows[0].balance;

    // 2. Get the sum of margins for all open trades for this user
    const openTradesMarginRes = await client.query(
      "SELECT COALESCE(SUM(margin), 0) as total_margin FROM trades WHERE user_id = $1 AND status = 'open'",
      [userId],
    );
    const totalOpenMargin = parseFloat(
      openTradesMarginRes.rows[0].total_margin,
    );

    // Calculate entry commission
    const commission = quantity * entryPrice * COMMISSION_RATE;

    // 3. Check if there are sufficient funds (free margin + commission) for the new trade
    // We must account for unrealized PnL from other open trades to get true free margin
    const userTradesWithPnl = await getUnrealizedPnLForUser(userId);
    const totalUnrealizedPnl = userTradesWithPnl.reduce(
      (sum, t) => sum + (t.unrealized_pnl || 0),
      0,
    );
    const equity = balance + totalUnrealizedPnl;
    const freeMargin = equity - totalOpenMargin;

    if (freeMargin < margin + commission) {
      await client.query("ROLLBACK");
      throw new Error("Insufficient funds to cover margin and commission.");
    }

    // Deduct entry commission from balance immediately
    await client.query(
      "UPDATE balances SET balance = balance - $1 WHERE user_id = $2",
      [commission, userId],
    );

    // 4. Insert the new trade record with stop loss and take profit
    const initialStatus = orderType === "market" ? "open" : "pending";
    const tradeQuery = `
      INSERT INTO trades (user_id, type, margin, leverage, symbol, quantity, entry_price, status, stop_loss, take_profit, commission, order_type, limit_price)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING order_id;
    `;
    const tradeRes = await client.query(tradeQuery, [
      userId,
      type,
      margin,
      effectiveLeverage, // Use effectiveLeverage here
      lowerCaseSymbol,
      quantity,
      entryPrice,
      initialStatus,
      stopLoss,
      takeProfit,
      commission,
      orderType,
      limitPrice || null,
    ]);

    await client.query("COMMIT");
    return tradeRes.rows[0].order_id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getTradeById = async (orderId: string): Promise<Trade | null> => {
  const query = `
    SELECT * FROM trades WHERE order_id = $1;
  `;
  const res = await pool.query(query, [orderId]);
  if (res.rows.length > 0) {
    return res.rows[0] as Trade;
  }
  return null;
};

export const calculatePnL = (
  trade: { type: "buy" | "sell"; entry_price: number; quantity: number },
  currentPrice: number,
): number => {
  let pnl = 0;
  if (trade.type === "buy") {
    pnl = (currentPrice - trade.entry_price) * trade.quantity;
  } else if (trade.type === "sell") {
    pnl = (trade.entry_price - currentPrice) * trade.quantity;
  }
  return pnl;
};

export const closeTrade = async (orderId: string): Promise<Trade> => {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const tradeResult = await client.query(
      "SELECT * FROM trades WHERE order_id = $1 FOR UPDATE",
      [orderId],
    );
    const trade = tradeResult.rows[0];

    if (!trade) throw new Error("Trade not found");
    if (trade.status !== "open") throw new Error("Trade is not open");

    const exitPrice = await getLatestTradePrice(trade.symbol);
    if (!exitPrice)
      throw new Error(`Could not get current price for ${trade.symbol}`);

    const realizedPnl = calculatePnL(
      {
        type: trade.type,
        entry_price: trade.entry_price,
        quantity: trade.quantity,
      },
      exitPrice,
    );

    // Calculate exit commission
    const exitCommission = trade.quantity * exitPrice * COMMISSION_RATE;
    const totalCommission = (trade.commission || 0) + exitCommission;

    const updateQuery = `
      UPDATE trades
      SET status = 'closed', exit_price = $1, closed_at = NOW(), realized_pnl = $2, commission = $3
      WHERE order_id = $4
      RETURNING *;
    `;
    const res = await client.query(updateQuery, [
      exitPrice,
      realizedPnl,
      totalCommission,
      orderId,
    ]);
    const closedTrade = res.rows[0] as Trade;

    // Credit realized PnL and return margin. Also deduct the exit commission.
    // The entry commission and swap were already deducted during their respective operations.
    // Expected change to balance = Margin + RealizedPnL - ExitCommission
    // However, the trades table 'margin' is just a locked amount, not deducted from balance.
    // Balance only changes by realized PnL minus the exit commission.
    const balanceQuery = `UPDATE balances SET balance = balance + $1 - $2 WHERE user_id = $3`;
    await client.query(balanceQuery, [
      realizedPnl,
      exitCommission,
      closedTrade.user_id,
    ]);

    await client.query("COMMIT");
    return closedTrade;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getClosedTrades = async (userId: number): Promise<Trade[]> => {
  const query = `
    SELECT * FROM trades WHERE user_id = $1 AND status = 'closed' ORDER BY closed_at DESC;
  `;
  const res = await pool.query(query, [userId]);
  return res.rows as Trade[];
};

export const getOpenTrades = async (): Promise<Trade[]> => {
  const query = `
    SELECT * FROM trades WHERE status = 'open';
  `;
  const res = await pool.query(query);
  return res.rows as Trade[];
};

export const getUserOpenTrades = async (userId: number): Promise<Trade[]> => {
  try {
    const query = `
      SELECT * FROM trades WHERE user_id = $1 AND status = 'open';
    `;
    const res = await pool.query(query, [userId]);
    return res.rows as Trade[];
  } catch (error) {
    console.error("Error in getUserOpenTrades:", error);
    throw error;
  }
};

export const getUnrealizedPnLForUser = async (
  userId: number,
): Promise<TradeWithUnrealizedPnl[]> => {
  const query = `
    SELECT * FROM trades WHERE user_id = $1 AND status = 'open';
  `;
  const res = await pool.query(query, [userId]);
  const openTrades = res.rows as Trade[];

  return openTrades.map((trade): TradeWithUnrealizedPnl => {
    let currentPrice;
    if (trade.type == "buy") {
      currentPrice = currentPrices.get(trade.symbol)?.ask;
    } else {
      currentPrice = currentPrices.get(trade.symbol)?.bid;
    }
    // const currentPrice = currentPrices.get(trade.symbol);
    if (currentPrice === undefined) {
      console.warn(
        `Price not available for symbol ${trade.symbol}. Cannot calculate unrealized PnL for trade ${trade.order_id}.`,
      );
      return { ...trade, unrealized_pnl: null }; // Or handle as appropriate
    }
    const unrealized_pnl = calculatePnL(
      {
        type: trade.type,
        entry_price: trade.entry_price,
        quantity: trade.quantity,
      },
      currentPrice,
    );
    return { ...trade, unrealized_pnl };
  });
};

export const monitorTradesForLiquidation = async () => {
  const openTrades = await getOpenTrades();

  for (const trade of openTrades) {
    // const currentPrice = currentPrices.get(trade.symbol);
    let currentPrice;
    if (trade.type == "buy") {
      currentPrice = currentPrices.get(trade.symbol)?.ask;
    } else {
      currentPrice = currentPrices.get(trade.symbol)?.bid;
    }
    if (currentPrice === undefined) {
      console.warn(
        `Price not available for symbol ${trade.symbol}. Skipping SL/TP check for trade ${trade.order_id}.`,
      );
      continue; // Skip this trade if price is not available
    }

    // Check Take Profit
    if (trade.take_profit !== null && trade.take_profit !== undefined) {
      if (trade.type === "buy" && currentPrice >= trade.take_profit) {
        console.log(
          `Trade ${trade.order_id} hit Take Profit at ${currentPrice}. Closing trade.`,
        );
        await closeTrade(trade.order_id);
        continue; // Move to the next trade after closing
      }
      if (trade.type === "sell" && currentPrice <= trade.take_profit) {
        console.log(
          `Trade ${trade.order_id} hit Take Profit at ${currentPrice}. Closing trade.`,
        );
        await closeTrade(trade.order_id);
        continue; // Move to the next trade after closing
      }
    }

    // Check Stop Loss
    if (trade.stop_loss !== null && trade.stop_loss !== undefined) {
      if (trade.type === "buy" && currentPrice <= trade.stop_loss) {
        console.log(
          `Trade ${trade.order_id} hit Stop Loss at ${currentPrice}. Closing trade.`,
        );
        await closeTrade(trade.order_id);
        continue; // Move to the next trade after closing
      }
      if (trade.type === "sell" && currentPrice >= trade.stop_loss) {
        console.log(
          `Trade ${trade.order_id} hit Stop Loss at ${currentPrice}. Closing trade.`,
        );
        await closeTrade(trade.order_id);
        continue; // Move to the next trade after closing
      }
    }

    // Original Liquidation condition (if still relevant, otherwise remove or modify)
    const pnl = calculatePnL(
      {
        type: trade.type,
        entry_price: trade.entry_price,
        quantity: trade.quantity,
      },
      currentPrice,
    );
    if (pnl <= -trade.margin) {
      // Assuming liquidateTrade is a function that handles liquidation, similar to closeTrade
      // For now, we'll just close it, but a separate liquidation logic might be needed
      console.log(
        `Trade ${trade.order_id} liquidated due to margin exhaustion. PnL: ${pnl}, Margin: ${trade.margin}`,
      );
      await closeTrade(trade.order_id); // Or call a specific liquidateTrade function
    }
  }
};

export const validateBalanceForTrade = async (
  userId: number,
  margin: number,
): Promise<void> => {
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    const balanceRes = await client.query(
      "SELECT balance FROM balances WHERE user_id = $1 FOR UPDATE",
      [userId],
    );
    if (balanceRes.rows.length === 0) {
      throw new Error("User balance record not found.");
    }
    const balance = parseFloat(balanceRes.rows[0].balance);

    // Get total margin used for open trades
    const marginRes = await client.query(
      "SELECT COALESCE(SUM(margin), 0) as total_margin FROM trades WHERE user_id = $1 AND status = 'open'",
      [userId],
    );
    const totalMarginUsed = parseFloat(marginRes.rows[0].total_margin);

    // Get total unrealized PnL from all open trades
    const tradesWithPnl = await getUnrealizedPnLForUser(userId);
    const totalUnrealizedPnl = tradesWithPnl.reduce(
      (sum, trade) => sum + (trade.unrealized_pnl || 0),
      0,
    );

    const equity = balance + totalUnrealizedPnl;
    const freeMargin = equity - totalMarginUsed;

    if (freeMargin < margin) {
      throw new Error("Insufficient funds to cover margin.");
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const applySwapCharges = async () => {
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Get all open trades
    const openTradesRes = await client.query(
      "SELECT * FROM trades WHERE status = 'open'",
    );
    const openTrades = openTradesRes.rows as Trade[];

    const now = new Date();

    for (const trade of openTrades) {
      // Logic for daily swap: For simplicity, apply swap if the trade crosses a daily boundary (e.g., 00:00 UTC)
      // or simply accrue it periodically based on hours held.
      // Here we assume this worker runs once every 24 hours at a specific cutoff time, or
      // we calculate the difference in days. Let's do a simple calculation:
      // If the trade was opened before today, and we haven't charged for today yet...
      // Since we don't track "last_swap_charge_time", a simple approach for an hourly worker:
      // We charge DAILY_SWAP_RATE / 24 for every hour.

      const currentSwapRateToApply = DAILY_SWAP_RATE / 24; // If run hourly
      const swapCharge =
        trade.quantity * trade.entry_price * currentSwapRateToApply;

      if (swapCharge > 0) {
        // Update the trade's swap field
        await client.query(
          "UPDATE trades SET swap = COALESCE(swap, 0) + $1 WHERE order_id = $2",
          [swapCharge, trade.order_id],
        );

        // Deduct from user balance
        await client.query(
          "UPDATE balances SET balance = balance - $1 WHERE user_id = $2",
          [swapCharge, trade.user_id],
        );
        console.log(
          `Applied swap charge of ${swapCharge} for trade ${trade.order_id}`,
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    console.error("Error applying swap charges:", error);
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
};

export const cancelPendingOrder = async (orderId: string): Promise<Trade> => {
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    const tradeRes = await client.query(
      "SELECT * FROM trades WHERE order_id = $1 FOR UPDATE",
      [orderId],
    );
    const trade = tradeRes.rows[0] as Trade;

    if (!trade) throw new Error("Order not found");
    if (trade.status !== "pending")
      throw new Error("Only pending orders can be cancelled");

    // Return the locked margin and the entry commission
    const commission = trade.commission || 0;
    const amountToReturn = trade.margin + commission;

    await client.query(
      "UPDATE balances SET balance = balance + $1 WHERE user_id = $2",
      [amountToReturn, trade.user_id],
    );

    const updateRes = await client.query(
      "UPDATE trades SET status = 'cancelled', closed_at = NOW() WHERE order_id = $1 RETURNING *",
      [orderId],
    );

    await client.query("COMMIT");
    return updateRes.rows[0] as Trade;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getPendingOrders = async (userId: number): Promise<Trade[]> => {
  const query = `
    SELECT * FROM trades WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC;
  `;
  const res = await pool.query(query, [userId]);
  return res.rows as Trade[];
};

export const monitorPendingOrders = async () => {
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get all pending orders
    const pendingRes = await client.query(
      "SELECT * FROM trades WHERE status = 'pending' FOR UPDATE SKIP LOCKED",
    );
    const pendingOrders = pendingRes.rows as Trade[];

    for (const order of pendingOrders) {
      if (!order.limit_price) continue;

      let prices;
      if (order.type == "buy") {
        prices = {
          ask: currentPrices.get(order.symbol)?.ask,
          bid: currentPrices.get(order.symbol)?.bid,
        };
      } else {
        prices = {
          ask: currentPrices.get(order.symbol)?.ask,
          bid: currentPrices.get(order.symbol)?.bid,
        };
      }

      if (!prices || prices.ask === undefined || prices.bid === undefined)
        continue;

      let shouldFill = false;
      let fillPrice = order.limit_price;

      if (order.order_type === "limit") {
        if (order.type === "buy" && prices.ask <= order.limit_price) {
          shouldFill = true;
          fillPrice = prices.ask;
        } else if (order.type === "sell" && prices.bid >= order.limit_price) {
          shouldFill = true;
          fillPrice = prices.bid;
        }
      } else if (order.order_type === "stop") {
        if (order.type === "buy" && prices.ask >= order.limit_price) {
          shouldFill = true;
          fillPrice = prices.ask;
        } else if (order.type === "sell" && prices.bid <= order.limit_price) {
          shouldFill = true;
          fillPrice = prices.bid;
        }
      }

      if (shouldFill) {
        console.log(
          `Filling pending order ${order.order_id} at price ${fillPrice}`,
        );
        await client.query(
          "UPDATE trades SET status = 'open', entry_price = $1, created_at = NOW() WHERE order_id = $2",
          [fillPrice, order.order_id],
        );

        redis.publish(
          "trade_updates",
          JSON.stringify({
            event: "pending_order_filled",
            orderId: order.order_id,
            fillPrice,
          }),
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    console.error("Error monitoring pending orders:", error);
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
};
