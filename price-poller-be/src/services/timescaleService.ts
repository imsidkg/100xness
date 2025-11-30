// import { pool } from "../config/db";
// import { Ticker } from "../models/ticker";


// export async function insertTickerBatch(batch: Ticker[]) {
//   const query = `
//     INSERT INTO tickers (time, symbol, trade_price, bid_price, ask_price, volume)
//     SELECT * FROM unnest(
//       $1::timestamptz[],
//       $2::text[],
//       $3::float8[],  -- trade_price
//       $4::float8[],  -- bid_price
//       $5::float8[],  -- ask_price
//       $6::float8[]   -- volume
//     )
//   `;

//   const values = batch.reduce(
//     (acc, ticker) => {
//       acc[0].push(ticker.time);
//       acc[1].push(ticker.symbol);
//       acc[2].push(ticker.tradePrice);
//       acc[3].push(ticker.bidPrice);
//       acc[4].push(ticker.askPrice);
//       acc[5].push(ticker.volume);
//       return acc;
//     },
//     [[], [], [], [], [], []] as [Date[], string[], number[], number[], number[], number[]]
//   );

//   await pool.query(query, values);
//   console.log(`Successfully inserted batch of ${batch.length} tickers`);
// }

// export async function   getAggregatedData(symbol: string, bucket: string) {
//   let query: string;
//   let params: any[];

//   if (bucket === "1 hour" || bucket === "1 day") {
//     query = `
//       SELECT bucket,
//              symbol,
//              avg_trade_price,
//              avg_bid_price,
//              avg_ask_price,
//              total_volume
//       FROM tickers_hourly
//       WHERE UPPER(symbol) = $1
//       ORDER BY bucket DESC
//       LIMIT 100;
//     `;
//     params = [symbol];
//   } else if (bucket === "1m" || bucket === "5m" || bucket === "10m") {
//     const viewName = `tickers_${bucket}`;
//     query = `
//       SELECT bucket,
//              open,
//              high,
//              low,
//              close,
//              volume
//       FROM ${viewName}
//       WHERE UPPER(symbol) = $1
//       ORDER BY bucket DESC
//       LIMIT 100;
//     `;
//     params = [symbol];
//   } else {
//     query = `
//       SELECT time_bucket($1, time) AS bucket,
//              first(trade_price, time) AS open,
//              MAX(trade_price) AS high,
//              MIN(trade_price) AS low,
//              last(trade_price, time) AS close
//       FROM tickers
//       WHERE UPPER(symbol) = $2
//       GROUP BY bucket
//       ORDER BY bucket DESC
//       LIMIT 100;
//     `;
//     params = [bucket, symbol];
//   }

//   const res = await pool.query(query, params);
//   return res.rows;
// }

// export async function getLatestTradePrice(symbol: string): Promise<number | null> {
//   const query = `
//     SELECT trade_price
//     FROM tickers
//     WHERE UPPER(symbol) = $1
//     ORDER BY time DESC
//     LIMIT 1;
//   `;
//   const res = await pool.query(query, [symbol]);
//   if (res.rows.length > 0) {
//     return res.rows[0].trade_price;
//   }
//   return null;
// }


import { pool } from "../config/db";
import { Ticker } from "../models/ticker";

export async function insertTickerBatch(batch: Ticker[]) {
  const query = `
    INSERT INTO tickers (time, symbol, trade_price, bid_price, ask_price, volume)
    SELECT * FROM unnest(
      $1::timestamptz[],
      $2::text[],
      $3::float8[],
      $4::float8[],
      $5::float8[],
      $6::float8[]
    )
  `;

  const values = batch.reduce(
    (acc, ticker) => {
      acc[0].push(ticker.time);
      acc[1].push(ticker.symbol);
      acc[2].push(ticker.tradePrice);
      acc[3].push(ticker.bidPrice);
      acc[4].push(ticker.askPrice);
      acc[5].push(ticker.volume);
      return acc;
    },
    [[], [], [], [], [], []] as [Date[], string[], number[], number[], number[], number[]]
  );

  let retries = 3;
  while (retries > 0) {
    try {
      await pool.query(query, values);
      console.log(`Successfully inserted batch of ${batch.length} tickers`);
      return;
    } catch (err: any) {
      retries--;
      console.error(`❌ Insert failed (${retries} retries left):`, err.message);
      if (retries === 0) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
    }
  }
}

export async function getAggregatedData(symbol: string, bucket: string) {
  let query: string;
  let params: any[];

  if (bucket === "1 hour" || bucket === "1 day") {
    query = `
      SELECT bucket,
             symbol,
             avg_trade_price,
             avg_bid_price,
             avg_ask_price,
             total_volume
      FROM tickers_hourly
      WHERE UPPER(symbol) = $1
      ORDER BY bucket DESC
      LIMIT 100;
    `;
    params = [symbol.toUpperCase()];
  } else if (bucket === "1m" || bucket === "5m" || bucket === "10m") {
    const viewName = `tickers_${bucket}`;
    query = `
      SELECT bucket,
             open,
             high,
             low,
             close,
             volume
      FROM ${viewName}
      WHERE UPPER(symbol) = $1
      ORDER BY bucket DESC
      LIMIT 100;
    `;
    params = [symbol.toUpperCase()];
  } else {
    query = `
      SELECT time_bucket($1, time) AS bucket,
             first(trade_price, time) AS open,
             MAX(trade_price) AS high,
             MIN(trade_price) AS low,
             last(trade_price, time) AS close
      FROM tickers
      WHERE UPPER(symbol) = $2
      GROUP BY bucket
      ORDER BY bucket DESC
      LIMIT 100;
    `;
    params = [bucket, symbol.toUpperCase()];
  }

  // Retry logic for queries
  let retries = 3;
  while (retries > 0) {
    try {
      const res = await pool.query(query, params);
      return res.rows;
    } catch (err: any) {
      retries--;
      console.error(`❌ Query failed (${retries} retries left):`, err.message);
      if (retries === 0) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export async function getLatestTradePrice(symbol: string): Promise<number | null> {
  const query = `
    SELECT trade_price
    FROM tickers
    WHERE UPPER(symbol) = $1
    ORDER BY time DESC
    LIMIT 1;
  `;
  
  try {
    const res = await pool.query(query, [symbol.toUpperCase()]);
    if (res.rows.length > 0) {
      return res.rows[0].trade_price;
    }
  } catch (err: any) {
    console.error(`❌ Failed to get latest price for ${symbol}:`, err.message);
  }
  return null;
}