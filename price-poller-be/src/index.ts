import { startServer } from "./server";
import { fetchBinanceData } from "./websockets/binanceSocket";
import { initDB } from "./db/init";
import { processQueue } from "./workers/queryWorker";
import { startWebSocketServer } from "./websockets/websocketServer";
import { startTradeWorker } from "./workers/tradeWorker"; // Import the new worker
import { startPnLWorker } from "./workers/pnlWorker"; // Import the PnL worker

export const symbols = ["btcusdt", "ethusdt", "solusdt"];

const startApp = async () => {
  try {
    console.log("Initializing application...");
    await initDB();
    console.log("Database initialized");

    const port = parseInt(process.env.PORT || "3001");
    startServer(port);

    fetchBinanceData(symbols);
    startWebSocketServer();

    // Start background workers
    processQueue().catch((err) => console.error("Query Worker error:", err));
    startTradeWorker().catch((err) =>
      console.error("Trade Worker error:", err),
    );
    startPnLWorker();

    console.log("All services started successfully");
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
};

startApp();
