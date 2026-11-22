import { cbtService } from "../services/cbt.service";
import { logger } from "../utils/logger";

let sweeperInterval: NodeJS.Timeout | null = null;
let isTickRunning = false;

export const startExpirySweeperJob = (intervalMs = 60_000): void => {
  if (sweeperInterval) return;

  sweeperInterval = setInterval(async () => {
    if (isTickRunning) return;
    isTickRunning = true;

    try {
      const closedCount = await cbtService.sweepExpiredAttempts();
      if (closedCount > 0) {
        logger.info("Auto-submitted expired CBT exam attempts", { closedCount });
      }
    } catch (error) {
      const err = error as Error & { cause?: Error };
      const causeMessage = err.cause?.message;
      const isTransientTimeout =
        /timeout|ECONNRESET|ETIMEDOUT/i.test(causeMessage ?? err.message);

      if (isTransientTimeout) {
        logger.warn("CBT expiry sweeper skipped due to transient DB timeout; will retry next tick", {
          cause: causeMessage ?? err.message,
        });
      } else {
        logger.error("CBT expiry sweeper tick failed", {
          error: err.message,
          cause: causeMessage,
        });
      }
    } finally {
      isTickRunning = false;
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
