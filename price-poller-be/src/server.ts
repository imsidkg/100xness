import express, { Request, Response } from "express";
import cors from "cors";
import { getCandles } from "./controllers/candleController";
import authRoutes from "./routes/authRoutes";
import tradeRoutes from "./routes/tradeRoutes";
import {
  startPriceListener,
  monitorTradesForLiquidation,
} from "./services/tradeService";

const app = express();

const port = parseInt(process.env.PORT || "3001");

const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || ["http://localhost:5173"];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from the price poller BE!");
});

app.get("/candles/:symbol", getCandles);

app.use("/api/v1/user", authRoutes); // Use authRoutes
app.use("/api/v1/trade", tradeRoutes); // Use tradeRoutes

const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  startPriceListener();
  setInterval(monitorTradesForLiquidation, 5000);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(async () => {
    const { pool } = await import("./config/db.js");
    const { redis } = await import("./lib/redisClient.js");
    await pool.end();
    await redis.quit();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(async () => {
    const { pool } = await import("./config/db.js");
    const { redis } = await import("./lib/redisClient.js");
    await pool.end();
    await redis.quit();
    process.exit(0);
  });
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
});
