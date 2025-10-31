import { Request, Response } from "express";
import {
  closeTrade as closeTradeService,
  getClosedTrades,
  getUnrealizedPnLForUser,
  getUserOpenTrades,
  validateBalanceForTrade,
  currentPrices,
} from "../services/tradeService";
import { AuthenticatedRequest } from "../middleware/auth";
import { redis } from "../lib/redisClient";

const TRADE_QUEUE_NAME = "trade:order:queue";

function isTradeRequest(body: any): body is TradeRequest {
  return (
    body &&
    (body.type === "buy" || body.type === "sell") &&
    (typeof body.leverage === "undefined" ||
      typeof body.leverage === "number") &&
    typeof body.symbol === "string" &&
    body.symbol.length > 0 &&
    typeof body.quantity === "number" &&
    body.quantity > 0 &&
    (typeof body.margin === "undefined" ||
      (typeof body.margin === "number" && body.margin > 0)) &&
    (typeof body.stopLoss === "undefined" ||
      typeof body.stopLoss === "number") &&
    (typeof body.takeProfit === "undefined" ||
      typeof body.takeProfit === "number")
  );
}

export const tradeProcessor = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  if (!isTradeRequest(req.body)) {
    return res.status(400).json({ message: "Invalid trade request format" });
  }

  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  const {
    type,
    leverage,
    symbol,
    quantity,
    margin: manualMargin,
    stopLoss,
    takeProfit,
  } = req.body as TradeRequest;

  const lowerCaseSymbol = symbol.toLowerCase();
  let entryPrice;
  if (type == "buy") {
    entryPrice = currentPrices.get(lowerCaseSymbol)?.ask;
  } else {
    entryPrice = currentPrices.get(lowerCaseSymbol)?.bid;
  }
  if (!entryPrice) {
    return res
      .status(400)
      .json({ message: "Entry price is not set for this symbol." });
  }

  const effectiveLeverage = leverage || 1;
  const margin =
    manualMargin !== undefined
      ? manualMargin
      : (quantity * entryPrice) / effectiveLeverage;

  try {
    await validateBalanceForTrade(userId, margin);

    const job = {
      userId: userId,
      tradeDetails: req.body as TradeRequest,
    };

    await redis.lpush(TRADE_QUEUE_NAME, JSON.stringify(job));
    res
      .status(202)
      .json({ message: "Trade request received and is being processed." });
  } catch (error: any) {
    console.error("Error processing trade request:", error);
    if (error.message.includes("Insufficient funds")) {
      return res.status(400).json({ message: error.message });
    } else if (error.message.includes("User balance record not found")) {
      return res.status(404).json({ message: error.message });
    } else {
      return res
        .status(500)
        .json({ message: "Failed to process trade request." });
    }
  }
};

export const closeTrade = async (req: Request, res: Response) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ message: "Order ID is required" });
  }

  try {
    const closedTrade = await closeTradeService(orderId);
    res
      .status(200)
      .json({ message: "Trade closed successfully", trade: closedTrade });
  } catch (error: any) {
    console.error("Error closing trade:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const getClosedTradesForUser = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    const trades = await getClosedTrades(userId);
    res.status(200).json(trades);
  } catch (error: any) {
    console.error("Error fetching closed trades:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const getUnrealizedPnL = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    const tradesWithUnrealizedPnL = await getUnrealizedPnLForUser(userId);
    res.status(200).json(tradesWithUnrealizedPnL);
  } catch (error: any) {
    console.error("Error fetching unrealized PnL:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const getOpenTradesForUser = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    const openTrades = await getUserOpenTrades(userId);

    // Format the response according to the specified structure
    const formattedTrades = openTrades.map((trade) => ({
      orderId: trade.order_id,
      type: trade.type,
      margin: Math.round(trade.margin * 100), // Convert to cents (2 decimal places)
      leverage: trade.leverage,
      openPrice: Math.round(trade.entry_price * 10000), // Convert to basis points (4 decimal places)
      symbol: trade.symbol,
      quantity: trade.quantity,
      stopLoss: trade.stop_loss
        ? Math.round(trade.stop_loss * 10000)
        : undefined,
      takeProfit: trade.take_profit
        ? Math.round(trade.take_profit * 10000)
        : undefined,
    }));

    res.status(200).json({ trades: formattedTrades });
  } catch (error: any) {
    console.error("Error fetching open trades:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};
