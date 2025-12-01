// import express, { Request, Response } from "express";
// import cors from "cors";
// import { getCandles } from "./controllers/candleController";
// import authRoutes from "./routes/authRoutes";
// import tradeRoutes from "./routes/tradeRoutes";
// import {
//   startPriceListener,
//   monitorTradesForLiquidation,
// } from "./services/tradeService";

// const app = express();

// const port = parseInt(process.env.PORT || "3001");

// const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || ["http://localhost:5173"];

// const corsOptions = {
//   origin: allowedOrigins, // Simply pass the array - cors middleware handles it correctly
//   credentials: true,
//   optionsSuccessStatus: 200,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// };
// app.use(cors(corsOptions));
// app.use(express.json());

// app.get("/", (req: Request, res: Response) => {
//   res.send("Hello from the price poller BE!");
// });

// app.get("/candles/:symbol", getCandles);

// app.use("/api/v1/user", authRoutes); // Use authRoutes
// app.use("/api/v1/trade", tradeRoutes); // Use tradeRoutes

// const server = app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
//   startPriceListener();
//   setInterval(monitorTradesForLiquidation, 5000);
// });

// process.on("SIGTERM", async () => {
//   console.log("SIGTERM received, shutting down gracefully");
//   server.close(async () => {
//     const { pool } = await import("./config/db.js");
//     const { redis } = await import("./lib/redisClient.js");
//     await pool.end();
//     await redis.quit();
//     process.exit(0);
//   });
// });

// process.on("SIGINT", async () => {
//   console.log("SIGINT received, shutting down gracefully");
//   server.close(async () => {
//     const { pool } = await import("./config/db.js");
//     const { redis } = await import("./lib/redisClient.js");
//     await pool.end();
//     await redis.quit();
//     process.exit(0);
//   });
// });

// process.on("uncaughtException", (err) => {
//   console.error("Uncaught exception:", err);
// });

// process.on("unhandledRejection", (reason, promise) => {
//   console.error("Unhandled rejection at:", promise, "reason:", reason);
// });

import express, { Request, Response } from "express";
import cors from "cors";
import { getCandles } from "./controllers/candleController";
import authRoutes from "./routes/authRoutes";
import tradeRoutes from "./routes/tradeRoutes";
import {
  startPriceListener,
  monitorTradesForLiquidation,
} from "./services/tradeService";
import { refreshMaterializedViews } from "./config/db";
import { initDB } from "./db/init";

const app = express();

const port = parseInt(process.env.PORT || "3001");

const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || ["http://localhost:5173"];

const corsOptions = {
  origin: allowedOrigins,
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

app.use("/api/v1/user", authRoutes);
app.use("/api/v1/trade", tradeRoutes);

const server = app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
  
  console.log("Initializing database...");
  await initDB();
  console.log("Database initialized");
  
  startPriceListener();
  setInterval(monitorTradesForLiquidation, 5000);
  
  console.log(" Starting materialized view auto-refresh (every 5 minutes)");
  setInterval(refreshMaterializedViews, 5 * 60 * 1000);
  
  setTimeout(refreshMaterializedViews, 10000);
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
