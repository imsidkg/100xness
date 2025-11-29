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

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello from the price poller BE!");
});

app.get("/candles/:symbol", getCandles);

app.use("/api/v1/user", authRoutes); // Use authRoutes
app.use("/api/v1/trade", tradeRoutes); // Use tradeRoutes

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  startPriceListener(); // Start the price listener
  setInterval(monitorTradesForLiquidation, 5000); // Monitor trades every 5 seconds
});
