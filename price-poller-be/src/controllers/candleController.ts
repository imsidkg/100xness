import { Request, Response } from "express";
import { getAggregatedData } from "../services/timescaleService";

export const getCandles = async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { interval } = req.query;

    if (!symbol || !interval) {
      return res.json({
        error: "Interval or sybol is not present in teh url",
        status: 400,
      });
    }

    const data = await getAggregatedData(symbol as string, interval as string);
    return res.json({
      data,
      status: 200,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
