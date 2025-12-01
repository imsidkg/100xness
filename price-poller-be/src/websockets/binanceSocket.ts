import Websocket, { RawData } from "ws";
import { BID_ASK_CHANNEL, redis } from "../lib/redisClient";

export const fetchBinanceData = async (symbols: string[]) => {
  const streams = symbols
    .map((symbol) => `${symbol.toLowerCase()}@trade`)
    .join("/");
  const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

  const ws = new Websocket(url);

  ws.on("open", () => {
    console.log("Websocket initialized for trade stream");
  });

  ws.on("message", async (data: RawData) => {
    try {
      const parsedData = JSON.parse(data.toString());
      const trade: BinanceTrade = parsedData.data;

      const symbol = trade.s.toLowerCase();
      const price = parseFloat(trade.p);
      const tradeTime = trade.T;
      const askPrice = price * (1 + 0.005);
      const bidPrice = price * (1 - 0.005);

      await redis.publish(
        BID_ASK_CHANNEL,
        JSON.stringify({ 
          symbol, 
          ask: askPrice, 
          bid: bidPrice,
          tradePrice: price,
          tradeTime: tradeTime
        })
      );

      // Also push to the trade queue for other workers if needed
      await redis.lpush("binance:trade:queue", JSON.stringify(trade));
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on("error", (error) => {
    console.log("Error connecting to websocket:", error);
  });

  ws.on("close", () => {
    console.log("Server is abruptly closed - may be from Binance");
  });
};
