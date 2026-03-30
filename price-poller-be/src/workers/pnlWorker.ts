import { getAllUserIds } from "../services/userService";
import {
  getUnrealizedPnLForUser,
  applySwapCharges,
} from "../services/tradeService";
import { redis, UNREALIZED_PNL_CHANNEL } from "../lib/redisClient";

const PNL_UPDATE_INTERVAL = 5000; // 5 seconds
const SWAP_UPDATE_INTERVAL = 1000 * 60 * 60; // 1 hour

const publishUnrealizedPnL = async () => {
  try {
    const userIds = await getAllUserIds();

    for (const userId of userIds) {
      const unrealizedPnL = await getUnrealizedPnLForUser(userId);
      // Publish user-specific PnL to the channel
      redis.publish(
        UNREALIZED_PNL_CHANNEL,
        JSON.stringify({ userId, unrealizedPnL }),
      );
    }
  } catch (error) {
    console.error("Error publishing unrealized PnL:", error);
  }
};

export const startPnLWorker = () => {
  setInterval(publishUnrealizedPnL, PNL_UPDATE_INTERVAL);
  setInterval(applySwapCharges, SWAP_UPDATE_INTERVAL);
  console.log("Unrealized PnL worker started.");
};
