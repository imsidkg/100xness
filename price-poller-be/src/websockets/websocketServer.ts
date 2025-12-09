import { WebSocketServer } from "ws";
import http from "http";
import {
  BID_ASK_CHANNEL,
  redis,
  UNREALIZED_PNL_CHANNEL,
} from "../lib/redisClient";

const WS_PORT = parseInt(process.env.WS_PORT || "3002");

const TRADE_UPDATES_CHANNEL = "trade_updates"; // The new dedicated channel

export const startWebSocketServer = () => {
  const server = http.createServer();
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    ws.on("close", () => console.log("WebSocket client disconnected"));
    ws.on("error", (error) => console.error("WebSocket error:", error));
  });

  const subscriber = redis.duplicate();

  // Subscribe to all relevant channels
  subscriber.subscribe(
    BID_ASK_CHANNEL,
    TRADE_UPDATES_CHANNEL,
    UNREALIZED_PNL_CHANNEL,
    (err, count) => {
      if (err) {
        return console.error("Failed to subscribe to Redis channels:", err);
      }
      console.log(`Subsc ribed to ${count} channel(s).`);
    }
  );

  subscriber.on("message", (channel, message) => {
    try {
      console.log(`Received message on channel ${channel}:`, message);
      // Parse the message from Redis
      const parsedMessage = JSON.parse(message);

      // For bid/ask updates, send the raw data structure that frontend expects
      if (channel === BID_ASK_CHANNEL) {
        console.log("Processing bid/ask update:", parsedMessage);
        const outgoingPayload = JSON.stringify(parsedMessage);
        console.log(`Sending to ${wss.clients.size} clients:`, outgoingPayload);
        wss.clients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            client.send(outgoingPayload);
          }
        });
      } else {
        // For other channels, use the wrapped format
        console.log("Processing other channel update:", channel, parsedMessage);
        const outgoingPayload = JSON.stringify({
          channel: channel,
          data: parsedMessage,
        });

        wss.clients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            client.send(outgoingPayload);
          }
        });
      }
    } catch (error) {
      console.error(
        `Error parsing or sending message on channel ${channel}:`,
        error
      );
    }
  });

  server.listen(WS_PORT, () => {
    console.log(`WebSocket server is running on ws://localhost:${WS_PORT}`);
  });
};

// A specific function for broadcasting trade updates
export const broadcastTradeUpdate = (message: string) => {
  redis.publish(TRADE_UPDATES_CHANNEL, message);
};
