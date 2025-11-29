import Redis from "ioredis";

// Configure Redis connection based on environment
const redisConfig: any = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  db: parseInt(process.env.REDIS_DB || "0"),
};

// Add password if provided
if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

// Add TLS for production
if (process.env.REDIS_TLS === "true") {
  redisConfig.tls = {
    rejectUnauthorized: false,
  };
}

export const redis = new Redis(redisConfig);

export const BID_ASK_CHANNEL = "bid_ask_updates"; // Redis channel for bid/ask updates
export const UNREALIZED_PNL_CHANNEL = "unrealized_pnl_updates"; // Redis channel for unrealized PnL updates

