import { pool } from "../config/db";

export async function initDB() {
  // Create table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickers (
      time TIMESTAMPTZ NOT NULL,
      symbol TEXT NOT NULL,
      trade_price DOUBLE PRECISION,
      bid_price DOUBLE PRECISION,
      ask_price DOUBLE PRECISION,
      volume DOUBLE PRECISION
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS balances (
      user_id INTEGER PRIMARY KEY,
      balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);

  // Check if 'balance' column in 'balances' table is BIGINT and alter to DOUBLE PRECISION if needed
  const balanceColumnType = await pool.query(`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_name = 'balances' AND column_name = 'balance';
  `);

  if (
    balanceColumnType.rows.length > 0 &&
    balanceColumnType.rows[0].data_type === "bigint"
  ) {
    console.log("Altering 'balance' column to DOUBLE PRECISION...");
    await pool.query(`
      ALTER TABLE balances ALTER COLUMN balance TYPE DOUBLE PRECISION;
    `);
    console.log("'balance' column altered to DOUBLE PRECISION.");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trades (
      order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'buy' or 'sell'
      margin DOUBLE PRECISION NOT NULL,
      leverage DOUBLE PRECISION NOT NULL,
      symbol TEXT NOT NULL,
      quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
      entry_price DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed', 'liquidated'
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      exit_price DOUBLE PRECISION,
      closed_at TIMESTAMPTZ,
      realized_pnl DOUBLE PRECISION,
      stop_loss DOUBLE PRECISION,
      take_profit DOUBLE PRECISION,
      commission DOUBLE PRECISION DEFAULT 0,
      swap DOUBLE PRECISION DEFAULT 0,
      order_type TEXT NOT NULL DEFAULT 'market', -- 'market', 'limit', 'stop'
      limit_price DOUBLE PRECISION,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);

  // Check if 'quantity' column exists in 'trades' table, and add if not
  const quantityColumnExists = await pool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'trades' AND column_name = 'quantity'
    );
  `);

  if (!quantityColumnExists.rows[0].exists) {
    await pool.query(`
      ALTER TABLE trades ADD COLUMN quantity DOUBLE PRECISION NOT NULL DEFAULT 0;
    `);
  }

  // Check if 'stop_loss' column exists in 'trades' table, and add if not
  const stopLossColumnExists = await pool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'trades' AND column_name = 'stop_loss'
    );
  `);

  if (!stopLossColumnExists.rows[0].exists) {
    await pool.query(`
      ALTER TABLE trades ADD COLUMN stop_loss DOUBLE PRECISION;
    `);
  }

  // Check if 'take_profit' column exists in 'trades' table, and add if not
  const takeProfitColumnExists = await pool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'trades' AND column_name = 'take_profit'
    );
  `);

  if (!takeProfitColumnExists.rows[0].exists) {
    await pool.query(`
      ALTER TABLE trades ADD COLUMN take_profit DOUBLE PRECISION;
    `);
  }

  // Check if 'commission' column exists in 'trades' table, and add if not
  const commissionColumnExists = await pool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'trades' AND column_name = 'commission'
    );
  `);

  if (!commissionColumnExists.rows[0].exists) {
    await pool.query(`
      ALTER TABLE trades ADD COLUMN commission DOUBLE PRECISION DEFAULT 0;
    `);
  }

  // Check if 'swap' column exists in 'trades' table, and add if not
  const swapColumnExists = await pool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'trades' AND column_name = 'swap'
    );
  `);

  if (!swapColumnExists.rows[0].exists) {
    await pool.query(`
      ALTER TABLE trades ADD COLUMN swap DOUBLE PRECISION DEFAULT 0;
    `);
  }

  // Check if 'order_type' column exists in 'trades' table, and add if not
  const orderTypeColumnExists = await pool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'trades' AND column_name = 'order_type'
    );
  `);

  if (!orderTypeColumnExists.rows[0].exists) {
    await pool.query(`
      ALTER TABLE trades ADD COLUMN order_type TEXT NOT NULL DEFAULT 'market';
    `);
  }

  // Check if 'limit_price' column exists in 'trades' table, and add if not
  const limitPriceColumnExists = await pool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'trades' AND column_name = 'limit_price'
    );
  `);

  if (!limitPriceColumnExists.rows[0].exists) {
    await pool.query(`
      ALTER TABLE trades ADD COLUMN limit_price DOUBLE PRECISION;
    `);
  }

  // Create hypertable (TimescaleDB)
  await pool.query(`
    SELECT create_hypertable('tickers', 'time', if_not_exists => TRUE);
  `);

  // Add 1 day retention policy to prevent disk space exhaustion
  try {
    await pool.query(`
      SELECT add_retention_policy('tickers', INTERVAL '1 day', if_not_exists => true);
    `);
    console.log("Added 1 day retention policy for tickers.");
  } catch (error: any) {
    if (
      !(
        error.code === "22023" &&
        error.detail &&
        error.detail.includes("policy already exists")
      )
    ) {
      console.warn(
        "Could not add retention policy for tickers:",
        error.message,
      );
    }
  }

  // Example: create materialized view (continuous aggregate)
  await pool.query(`
  CREATE MATERIALIZED VIEW IF NOT EXISTS tickers_hourly
  WITH (timescaledb.continuous) AS
  SELECT 
    time_bucket('1 hour', time) AS bucket,
    symbol,
    AVG(trade_price) AS avg_trade_price,
    AVG(bid_price) AS avg_bid_price,
    AVG(ask_price) AS avg_ask_price,
    SUM(volume) AS total_volume
  FROM tickers
  GROUP BY bucket, symbol;
`);

  try {
    await pool.query(`
    SELECT add_continuous_aggregate_policy(
      'tickers_hourly',
      start_offset => INTERVAL '1 day',
      end_offset => INTERVAL '1 minute',
      schedule_interval => INTERVAL '1 minute'
    );
  `);
  } catch (error: any) {
    if (
      !(
        error.code === "22023" &&
        error.detail &&
        error.detail.includes(
          "refresh policy with the same start and end offset already exists",
        )
      ) &&
      error.code !== "42710"
    ) {
      throw error;
    }
  }

  try {
    await pool.query(`
    CALL refresh_continuous_aggregate('tickers_hourly', NULL, NULL);
  `);
  } catch (error) {
    console.error(
      "Error refreshing continuous aggregate tickers_hourly:",
      error,
    );
  }

  await pool.query(`
  CREATE MATERIALIZED VIEW IF NOT EXISTS tickers_1m
  WITH (timescaledb.continuous) AS
  SELECT
    time_bucket('1 minute', time) AS bucket,
    symbol,
    first(trade_price, time) AS open,
    MAX(trade_price) AS high,
    MIN(trade_price) AS low,
    last(trade_price, time) AS close,
    SUM(volume) AS volume
  FROM tickers
  GROUP BY bucket, symbol;
`);

  try {
    await pool.query(`
      SELECT add_continuous_aggregate_policy(
        'tickers_1m',
        start_offset => INTERVAL '30 minute',
        end_offset => INTERVAL '1 minute',
        schedule_interval => INTERVAL '1 minute'
      );
    `);
  } catch (error: any) {
    if (
      !(
        error.code === "22023" &&
        error.detail &&
        error.detail.includes(
          "refresh policy with the same start and end offset already exists",
        )
      ) &&
      error.code !== "42710"
    ) {
      throw error;
    }
  }

  try {
    await pool.query(`
      CALL refresh_continuous_aggregate('tickers_1m', NULL, NULL);
    `);
  } catch (error) {
    console.error("Error refreshing continuous aggregate tickers_1m:", error);
  }

  await pool.query(`
  CREATE MATERIALIZED VIEW IF NOT EXISTS tickers_5m
  WITH (timescaledb.continuous) AS
  SELECT
    time_bucket('5 minutes', time) AS bucket,
    symbol,
    first(trade_price, time) AS open,
    MAX(trade_price) AS high,
    MIN(trade_price) AS low,
    last(trade_price, time) AS close,
    SUM(volume) AS volume
  FROM tickers
  GROUP BY bucket, symbol;
`);

  try {
    await pool.query(`
      SELECT add_continuous_aggregate_policy(
        'tickers_5m',
        start_offset => INTERVAL '1 hour',
        end_offset => INTERVAL '5 minutes',
        schedule_interval => INTERVAL '5 minutes'
      );
    `);
  } catch (error: any) {
    if (
      !(
        error.code === "22023" &&
        error.detail &&
        error.detail.includes(
          "refresh policy with the same start and end offset already exists",
        )
      ) &&
      error.code !== "42710"
    ) {
      throw error;
    }
  }

  try {
    await pool.query(`
      CALL refresh_continuous_aggregate('tickers_5m', NULL, NULL);
    `);
  } catch (error) {
    console.error("Error refreshing continuous aggregate tickers_5m:", error);
  }

  await pool.query(`
  CREATE MATERIALIZED VIEW IF NOT EXISTS tickers_10m
  WITH (timescaledb.continuous) AS
  SELECT
    time_bucket('10 minutes', time) AS bucket,
    symbol,
    first(trade_price, time) AS open,
    MAX(trade_price) AS high,
    MIN(trade_price) AS low,
    last(trade_price, time) AS close,
    SUM(volume) AS volume
  FROM tickers
  GROUP BY bucket, symbol;
`);

  try {
    await pool.query(`
      SELECT add_continuous_aggregate_policy(
        'tickers_10m',
        start_offset => INTERVAL '2 hour',
        end_offset => INTERVAL '10 minutes',
        schedule_interval => INTERVAL '10 minutes'
      );
    `);
  } catch (error: any) {
    if (
      !(
        error.code === "22023" &&
        error.detail &&
        error.detail.includes(
          "refresh policy with the same start and end offset already exists",
        )
      ) &&
      error.code !== "42710"
    ) {
      throw error;
    }
  }

  try {
    await pool.query(`
      CALL refresh_continuous_aggregate('tickers_10m', NULL, NULL);
    `);
  } catch (error) {
    console.error("Error refreshing continuous aggregate tickers_10m:", error);
  }

  console.log("Database initialized");
}
