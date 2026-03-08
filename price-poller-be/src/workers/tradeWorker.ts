import { redis } from "../lib/redisClient"; // Keep this import for the original client
import { createTrade, monitorPendingOrders } from "../services/tradeService";
import { broadcastTradeUpdate } from "../websockets/websocketServer";

const TRADE_QUEUE_NAME = "trade:order:queue";
const MAX_RETRIES = 3;

interface TradeJob {
  userId: number;
  tradeDetails: TradeRequest;
}

// Use redis.duplicate() to create a new client with the same config
const workerRedis = redis.duplicate();

const processTradeJob = async (job: TradeJob) => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `Attempt ${attempt} for user ${job.userId}, trade: ${job.tradeDetails.symbol}`,
      );
      const orderId = await createTrade(job.userId, job.tradeDetails);

      // On success, broadcast and exit
      console.log(
        `Successfully created trade ${orderId} for user ${job.userId}`,
      );
      // Use the new, specific broadcast function
      broadcastTradeUpdate(
        JSON.stringify({
          type: "TRADE_SUCCESS",
          userId: job.userId,
          orderId: orderId,
          tradeDetails: job.tradeDetails,
        }),
      );
      return; // Exit after success
    } catch (error: any) {
      console.error(
        `Attempt ${attempt} failed for user ${job.userId}: ${error.message}`,
      );
      if (attempt === MAX_RETRIES) {
        // All retries failed, broadcast failure and give up
        console.log(
          `All ${MAX_RETRIES} retries failed for user ${job.userId}. Job will be discarded.`,
        );
        // Use the new, specific broadcast function
        broadcastTradeUpdate(
          JSON.stringify({
            type: "TRADE_FAILURE",
            userId: job.userId,
            reason: error.message,
            tradeDetails: job.tradeDetails,
          }),
        );
      }
      // Optional: Add a small delay before retrying
      await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
    }
  }
};

export const startTradeWorker = async () => {
  console.log("Trade worker started, waiting for jobs...");
  // Check for pending orders to be filled every second
  setInterval(async () => {
    try {
      await monitorPendingOrders();
    } catch (err) {
      console.error("Error monitoring pending orders:", err);
    }
  }, 1000);

  while (true) {
    try {
      const result = await workerRedis.brpop(TRADE_QUEUE_NAME, 0); // Use workerRedis
      if (result) {
        const jobString = result[1];
        const job: TradeJob = JSON.parse(jobString);
        processTradeJob(job);
      }
    } catch (error) {
      console.error("Critical error in trade worker loop:", error);
    }
  }
};

if (require.main === module) {
  startTradeWorker();
}
