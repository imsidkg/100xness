type BinanceTicker = {
  u: number; // Order book update id
  s: string; // Symbol
  b: string; // Best bid price
  B: string; // Best bid quantity
  a: string; // Best ask price
  A: string; // Best ask quantity
};

type BinanceTrade = {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  t: number; // Trade ID
  p: string; // Price
  q: string; // Quantity
  b: number; // Buyer order ID
  a: number; // Seller order ID
  T: number; // Trade time
  m: boolean; // Is the buyer the market maker?
  M: boolean; // Ignore
};

interface Candle {
  symbol: string;
  interval: string; // e.g., "1m", "5m"
  openTime: number; // Unix timestamp in milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradeRequest {
  type: "buy" | "sell";
  orderType?: "market" | "limit" | "stop";
  limitPrice?: number;
  margin?: number; // Make margin optional as it can be calculated
  leverage?: 5 | 10 | 20 | 100; // Make leverage optional
  symbol: string;
  quantity: number;
  stopLoss?: number; // Optional stop loss price
  takeProfit?: number; // Optional take profit price
}

interface ActiveTrade {
  orderId: string;
  type: "buy" | "sell";
  margin: number;
  leverage: 5 | 10 | 20 | 100;
  exposure: number;
  symbol: string;
  entryPrice: number; // Price at which the trade was opened
  status: "open" | "liquidated" | "closed"; // To track trade status
}

interface ClosedTrade extends ActiveTrade {
  exitPrice: number; // Price at which the trade was closed
  realizedPnl: number; // Profit or loss from the trade
  closedAt: Date; // Time when the trade was closed
}
