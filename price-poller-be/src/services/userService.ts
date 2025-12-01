import { pool } from "../config/db";
import { getUnrealizedPnLForUser } from "./tradeService";

export const getAllUserIds = async (): Promise<number[]> => {
  try {
    const result = await pool.query("SELECT id FROM users");
    return result.rows.map((row) => row.id);
  } catch (error) {
    console.error("Error fetching all user IDs:", error);
    return [];
  }
};

export const getAccountSummary = async (userId: number) => {
  const client = await pool.connect();
  try {
    // Get balance
    const balanceRes = await client.query(
      "SELECT balance FROM balances WHERE user_id = $1",
      [userId]
    );
    if (balanceRes.rows.length === 0) {
      throw new Error("User balance not found");
    }
    const balance = parseFloat(balanceRes.rows[0].balance);

    // Get total margin used for open trades
    const marginRes = await client.query(
      "SELECT COALESCE(SUM(margin), 0) as total_margin FROM trades WHERE user_id = $1 AND status = 'open'",
      [userId]
    );
    const totalMarginUsed = parseFloat(marginRes.rows[0].total_margin);

    // Get total unrealized PnL from all open trades
    const tradesWithPnl = await getUnrealizedPnLForUser(userId);
    const totalUnrealizedPnl = tradesWithPnl.reduce(
      (sum, trade) => sum + (trade.unrealized_pnl || 0),
      0
    );

    return {
      balance,
      totalMarginUsed,
      totalUnrealizedPnl,
      equity: balance + totalUnrealizedPnl,
      freeMargin: balance - totalMarginUsed,
    };
  } catch (error) {
    console.error("Error fetching account summary:", error);
  } finally {
    client.release();
  }
};
