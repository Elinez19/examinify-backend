import { cbtService } from "../services/cbt.service";
import { logger } from "../utils/logger";

let sweeperInterval: NodeJS.Timeout | null = null;

export const startExpirySweeperJob = (intervalMs = 60_000): void => {
  if (sweeperInterval) return;

  sweeperInterval = setInterval(async () => {
    try {
      const closedCount = await cbtService.sweepExpiredAttempts();
      if (closedCount > 0) {
        logger.info("Auto-submitted expired CBT exam attempts", { closedCount });
      }
    } catch (error) {
      logger.error("CBT expiry sweeper tick failed", {
        error: (error as Error).message,
      });
    }
  }, intervalMs);

  sweeperInterval.unref();
};

export const stopExpirySweeperJob = (): void => {
  if (sweeperInterval) {
    clearInterval(sweeperInterval);
    sweeperInterval = null;
  }
};
