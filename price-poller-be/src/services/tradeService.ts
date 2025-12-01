import { BID_ASK_CHANNEL, redis } from "../lib/redisClient";
import { pool } from "../config/db";
import { PoolClient } from "pg";
import { Trade } from "../models/trade";
import { getLatestTradePrice } from "./timescaleService";

export type TradeWithUnrealizedPnl = Trade & { unrealized_pnl: number | null };

export const currentPrices: Map<string, { ask: number; bid: number }> =
  new Map();

export const startPriceListener = () => {
  const subscriber = redis.duplicate();
  subscriber.subscribe(BID_ASK_CHANNEL, (error) => {
    if (error) {
      console.error(
        "Failed to subscribe to Redis channel for trading service",
        error
      );
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
          console.log(`Updating price for ${symbol}: ${askPrice}`);
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
  tradeDetails: TradeRequest
): Promise<string> => {
  const {
    type,
    leverage,
    symbol,
    quantity,
    margin: manualMargin,
    stopLoss,
    takeProfit,
  } = tradeDetails;

  const lowerCaseSymbol = symbol.toLowerCase();

  let entryPrice;

  if (type == "buy") {
    entryPrice = currentPrices.get(lowerCaseSymbol)?.ask;
  } else {
    entryPrice = currentPrices.get(lowerCaseSymbol)?.bid;
  }
  if (!entryPrice) {
    throw new Error("Entry price is not set for this symbol");
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
      [userId]
    );
    if (balanceRes.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("User balance record not found.");
    }
    const balance = balanceRes.rows[0].balance;

    // 2. Get the sum of margins for all open trades for this user
    const openTradesMarginRes = await client.query(
      "SELECT COALESCE(SUM(margin), 0) as total_margin FROM trades WHERE user_id = $1 AND status = 'open'",
      [userId]
    );
    const totalOpenMargin = parseFloat(
      openTradesMarginRes.rows[0].total_margin
    );

    // 3. Check if there are sufficient funds (free margin) for the new trade
    const freeMargin = balance - totalOpenMargin;
    if (freeMargin < margin) {
      await client.query("ROLLBACK");
      throw new Error("Insufficient funds to cover margin.");
    }

    // 3. Insert the new trade record with stop loss and take profit
    const tradeQuery = `
      INSERT INTO trades (user_id, type, margin, leverage, symbol, quantity, entry_price, status, stop_loss, take_profit)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, $9)
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
      stopLoss,
      takeProfit,
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
  currentPrice: number
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
      [orderId]
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
      exitPrice
    );

    const updateQuery = `
      UPDATE trades
      SET status = 'closed', exit_price = $1, closed_at = NOW(), realized_pnl = $2
      WHERE order_id = $3
      RETURNING *;
    `;
    const res = await client.query(updateQuery, [
      exitPrice,
      realizedPnl,
      orderId,
    ]);
    const closedTrade = res.rows[0] as Trade;

    const balanceQuery = `UPDATE balances SET balance = balance + $1 WHERE user_id = $2`;
    await client.query(balanceQuery, [realizedPnl, closedTrade.user_id]);

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

export const getUserOpenTrades = async (
  userId: number
): Promise<Trade[]> => {
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
  userId: number
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
        `Price not available for symbol ${trade.symbol}. Cannot calculate unrealized PnL for trade ${trade.order_id}.`
      );
      return { ...trade, unrealized_pnl: null }; // Or handle as appropriate
    }
    const unrealized_pnl = calculatePnL(
      {
        type: trade.type,
        entry_price: trade.entry_price,
        quantity: trade.quantity,
      },
      currentPrice
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
        `Price not available for symbol ${trade.symbol}. Skipping SL/TP check for trade ${trade.order_id}.`
      );
      continue; // Skip this trade if price is not available
    }

    // Check Take Profit
    if (trade.take_profit !== null && trade.take_profit !== undefined) {
      if (trade.type === "buy" && currentPrice >= trade.take_profit) {
        console.log(
          `Trade ${trade.order_id} hit Take Profit at ${currentPrice}. Closing trade.`
        );
        await closeTrade(trade.order_id);
        continue; // Move to the next trade after closing
      }
      if (trade.type === "sell" && currentPrice <= trade.take_profit) {
        console.log(
          `Trade ${trade.order_id} hit Take Profit at ${currentPrice}. Closing trade.`
        );
        await closeTrade(trade.order_id);
        continue; // Move to the next trade after closing
      }
    }

    // Check Stop Loss
    if (trade.stop_loss !== null && trade.stop_loss !== undefined) {
      if (trade.type === "buy" && currentPrice <= trade.stop_loss) {
        console.log(
          `Trade ${trade.order_id} hit Stop Loss at ${currentPrice}. Closing trade.`
        );
        await closeTrade(trade.order_id);
        continue; // Move to the next trade after closing
      }
      if (trade.type === "sell" && currentPrice >= trade.stop_loss) {
        console.log(
          `Trade ${trade.order_id} hit Stop Loss at ${currentPrice}. Closing trade.`
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
      currentPrice
    );
    if (pnl <= -trade.margin) {
      // Assuming liquidateTrade is a function that handles liquidation, similar to closeTrade
      // For now, we'll just close it, but a separate liquidation logic might be needed
      console.log(
        `Trade ${trade.order_id} liquidated due to margin exhaustion. PnL: ${pnl}, Margin: ${trade.margin}`
      );
      await closeTrade(trade.order_id); // Or call a specific liquidateTrade function
    }
  }
};

export const validateBalanceForTrade = async (
  userId: number,
  margin: number
): Promise<void> => {
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    const balanceRes = await client.query(
      "SELECT balance FROM balances WHERE user_id = $1 FOR UPDATE",
      [userId]
    );
    if (balanceRes.rows.length === 0) {
      throw new Error("User balance record not found.");
    }
    const balance = balanceRes.rows[0].balance;
    if (balance < margin) {
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
