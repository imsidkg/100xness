import Websocket, { RawData } from "ws";
import { BID_ASK_CHANNEL, redis } from "../lib/redisClient";

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export const fetchBinanceData = async (symbols: string[]) => {
  const streams = symbols
    .map((symbol) => `${symbol.toLowerCase()}@trade`)
    .join("/");
  const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

  let reconnectDelay = INITIAL_RECONNECT_DELAY;

  const connect = () => {
    console.log(`Connecting to Binance WebSocket: ${url}`);
    const ws = new Websocket(url);
    let heartbeatInterval: NodeJS.Timeout;
    let isAlive = true;

    const setupHeartbeat = () => {
      isAlive = true;
      if (heartbeatInterval) clearInterval(heartbeatInterval);

      heartbeatInterval = setInterval(() => {
        if (!isAlive) {
          console.warn(
            "Binance WebSocket heartbeat failed. Terminating connection...",
          );
          ws.terminate();
          return;
        }
        isAlive = false;
        ws.ping();
      }, 30000); // Check every 30s
    };

    ws.on("open", () => {
      console.log("Websocket initialized for trade stream");
      reconnectDelay = INITIAL_RECONNECT_DELAY;
      setupHeartbeat();
    });

    ws.on("pong", () => {
      isAlive = true;
    });

    ws.on("message", async (data: RawData) => {
      isAlive = true;
      try {
        const parsedData = JSON.parse(data.toString());
        const trade: BinanceTrade = parsedData.data;

        if (!trade) return;

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
            tradeTime: tradeTime,
          }),
        );

        await redis.lpush("binance:trade:queue", JSON.stringify(trade));
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    ws.on("error", (error) => {
      console.error("Binance WebSocket error:", error);
    });

    ws.on("close", () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      console.log(
        `Binance WebSocket closed. Reconnecting in ${reconnectDelay / 1000}s...`,
      );

      setTimeout(() => {
        connect();
      }, reconnectDelay);

      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    });
  };

  connect();
};
