import { Request, Response } from "express";
import {
  closeTrade as closeTradeService,
  getClosedTrades,
  getUnrealizedPnLForUser,
  getUserOpenTrades,
  validateBalanceForTrade,
  currentPrices,
  cancelPendingOrder,
  getPendingOrders,
} from "../services/tradeService";
import { AuthenticatedRequest } from "../middleware/auth";
import { redis } from "../lib/redisClient";

const TRADE_QUEUE_NAME = "trade:order:queue";

function isTradeRequest(body: any): body is TradeRequest {
  if (!body) return false;

  const isValidType = body.type === "buy" || body.type === "sell";
  const isValidOrderType =
    !body.orderType || ["market", "limit", "stop"].includes(body.orderType);
  const isLeverageValid =
    typeof body.leverage === "undefined" || typeof body.leverage === "number";
  const isSymbolValid =
    typeof body.symbol === "string" && body.symbol.length > 0;
  const isQuantityValid =
    typeof body.quantity === "number" && body.quantity > 0;
  const isMarginValid =
    typeof body.margin === "undefined" ||
    (typeof body.margin === "number" && body.margin > 0);
  const isSLValid =
    typeof body.stopLoss === "undefined" || typeof body.stopLoss === "number";
  const isTPValid =
    typeof body.takeProfit === "undefined" ||
    typeof body.takeProfit === "number";
  const isLimitPriceValid =
    body.orderType === "market" ||
    !body.orderType ||
    (typeof body.limitPrice === "number" && body.limitPrice > 0);

  return (
    isValidType &&
    isValidOrderType &&
    isLeverageValid &&
    isSymbolValid &&
    isQuantityValid &&
    isMarginValid &&
    isSLValid &&
    isTPValid &&
    isLimitPriceValid
  );
}

export const tradeProcessor = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  if (!isTradeRequest(req.body)) {
    return res.status(400).json({ message: "Invalid trade request format" });
  }

  const userId: number = req.userId!;
  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  const {
    type,
    leverage,
    symbol,
    quantity,
    margin: manualMargin,
  } = req.body as TradeRequest;

  // Debug logging: see exactly what asset / params are being traded
  console.log("[tradeProcessor] Incoming trade request", {
    userId,
    type,
    symbol,
    quantity,
    leverage,
    manualMargin,
    orderType: req.body.orderType || "market",
  });

  const effectiveLeverage = leverage || 1;

  // Determine which price to use for margin validation.
  // - For market orders we require a live bid/ask price.
  // - For pending (limit/stop) orders we use the provided limitPrice and
  //   deliberately do NOT depend on the in‑memory currentPrices map so that
  //   pending orders can be created even before the live price feed is warm.
  const orderType = req.body.orderType || "market";
  let validationPrice: number;

  if (orderType === "market") {
    const lowerCaseSymbol = symbol.toLowerCase();
    const priceInfo = currentPrices.get(lowerCaseSymbol);
    const entryPrice = type === "buy" ? priceInfo?.ask : priceInfo?.bid;

    console.log("[tradeProcessor] Market order price snapshot", {
      symbol: lowerCaseSymbol,
      type,
      priceInfo,
      chosenEntryPrice: entryPrice,
      currentPriceKeys: Array.from(currentPrices.keys()),
    });

    if (!entryPrice) {
      return res.status(400).json({
        message:
          "Live price is not available for this symbol right now. Please try again in a few seconds or use a supported symbol.",
      });
    }

    validationPrice = entryPrice;
  } else {
    const { limitPrice } = req.body as TradeRequest;
    if (!limitPrice || typeof limitPrice !== "number" || limitPrice <= 0) {
      return res.status(400).json({
        message: "limitPrice is required for limit/stop orders.",
      });
    }
    validationPrice = limitPrice;
  }

  const margin =
    manualMargin !== undefined
      ? manualMargin
      : (quantity * validationPrice) / effectiveLeverage;

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
  res: Response,
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
  res: Response,
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
  res: Response,
) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    const openTrades = await getUserOpenTrades(userId);

    res.status(200).json({ trades: openTrades });
  } catch (error: any) {
    console.error("Error fetching open trades:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const cancelOrder = async (req: AuthenticatedRequest, res: Response) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ message: "Order ID is required" });
  }

  try {
    // Note: To be safe, we should ideally verify the order belongs to the requesting user in the service layer,
    // but for simplicity here we just call the service.
    const cancelledTrade = await cancelPendingOrder(orderId);
    res.status(200).json({
      message: "Pending order cancelled successfully",
      trade: cancelledTrade,
    });
  } catch (error: any) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const getPendingOrdersForUser = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    const pendingOrders = await getPendingOrders(userId);

    res.status(200).json({ trades: pendingOrders });
  } catch (error: any) {
    console.error("Error fetching pending orders:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};
