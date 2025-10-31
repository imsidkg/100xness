import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/db";
import { User } from "../models/user";
import { getLatestTradePrice } from "../services/timescaleService";
import { getAccountSummary as getAccountSummaryService } from "../services/userService";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "your-default-secret";

export const signup = async (req: Request, res: Response) => {
  const { email, password }: User = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const userResult = await client.query(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id",
        [email, hashedPassword]
      );
      const userId = userResult.rows[0].id;

      const initialBalance = 5000;
      await client.query(
        "INSERT INTO balances (user_id, balance) VALUES ($1, $2)",
        [userId, initialBalance]
      );

      await client.query("COMMIT");

      const balanceResult = await client.query(
        "SELECT balance FROM balances WHERE user_id = $1",
        [userId]
      );
      const balance = balanceResult.rows[0]?.balance;

      const token = jwt.sign({ userId: userId }, JWT_SECRET, {
        expiresIn: "1h",
      });

      res.status(200).json({ token, balance: balance });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error during signup:", error);
      //@ts-ignore
      if (error.code === "23505") {
        // unique_violation
        return res
          .status(403)
          .json({ message: "User with this email already exists" });
      }
      res.status(403).json({ message: "Error while signing up" });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error connecting to database:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const signin = async (req: Request, res: Response) => {
  const { email, password }: User = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      return res.status(403).json({ message: "Incorrect credentials" });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(403).json({ message: "Incorrect credentials" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    const balanceResult = await pool.query(
      "SELECT balance FROM balances WHERE user_id = $1",
      [user.id]
    );
    const balance = balanceResult.rows[0]?.balance;

    res.status(200).json({ token, balance });
  } catch (error) {
    console.error("Error during signin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAccountSummary = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const summary = await getAccountSummaryService(userId);

    res.status(200).json(summary);
  } catch (error) {
    console.error("Error fetching account summary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
