import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  closeTrade,
  tradeProcessor,
  getClosedTradesForUser,
  getOpenTradesForUser,
  cancelOrder,
  getPendingOrdersForUser,
} from "../controllers/tradeController";

const router = Router();
router.post("/", authenticateToken, tradeProcessor);
router.post("/close", authenticateToken, closeTrade);
router.get("/closed", authenticateToken, getClosedTradesForUser);
router.get("/open", authenticateToken, getOpenTradesForUser);
router.post("/cancel", authenticateToken, cancelOrder);
router.get("/pending", authenticateToken, getPendingOrdersForUser);

export default router;
