import { BID_ASK_CHANNEL, redis } from "../lib/redisClient";
import { insertTickerBatch } from "../services/timescaleService";
import { Ticker } from "../models/ticker";

const SPREAD_PERCENTAGE = 0.01;

export const processQueue = async () => {
  while (true) {
    let items: string[] = [];

    for (let i = 0; i < 50; i++) {
      const item = await redis.rpop("binance:trade:queue");
      if (!item) break;
      items.push(item);
    }

    if (items.length > 0) {
      const tickers: Ticker[] = items.map((msg) => {
        const trade: BinanceTrade = JSON.parse(msg);
        const tradePrice = parseFloat(trade.p);
        const tradeQuantity = parseFloat(trade.q);

        const bidPrice = tradePrice * (1 - SPREAD_PERCENTAGE);
        const askPrice = tradePrice * (1 + SPREAD_PERCENTAGE);

        // Pricing is already published real-time in binanceSocket.ts
        // We only prepare ticker data for DB insertion here

        return {
          time: new Date(trade.T),
          symbol: trade.s.toLowerCase(),
          tradePrice: tradePrice,
          bidPrice: bidPrice,
          askPrice: askPrice,
          volume: tradeQuantity,
        };
      });

      if (tickers.length > 0) {
        console.log(
          `Inserting batch of ${tickers.length} trades into tickers table.`,
        );
        await insertTickerBatch(tickers);
      }
    } else {
      await new Promise((res) => setTimeout(res, 100));
    }
  }
};
