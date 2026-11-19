import { Env } from "./config/env.config";
import { createApp } from "./app";
import { pool } from "./db";
import { realtimeGateway } from "./realtime/ws.server";
import { startExpirySweeperJob, stopExpirySweeperJob } from "./jobs/expiry-sweeper.job";
import { logger } from "./utils/logger";

const app = createApp();

const server = app.listen(Env.PORT, () => {
  realtimeGateway.init(server);
  startExpirySweeperJob();

  logger.info("API listening", {
    port: Env.PORT,
    environment: Env.NODE_ENV,
    docsUrl:
      Env.NODE_ENV !== "production" || Env.ENABLE_SWAGGER
        ? `http://localhost:${Env.PORT}/docs`
        : "disabled",
  });
});

const shutdownSignals: NodeJS.Signals[] = ["SIGTERM", "SIGINT"];
let shuttingDown = false;

const shutdown = async (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Shutting down API", { signal });

  stopExpirySweeperJob();

  try {
    await realtimeGateway.close();
  } catch (wsErr) {
    logger.error("Error closing WebSocket gateway", {
      error: (wsErr as Error).message,
    });
  }

  server.close(async (error) => {
    try {
      await pool.end();
      logger.info("Database pool closed successfully");
    } catch (poolErr) {
      logger.error("Error closing database pool", {
        error: (poolErr as Error).message,
      });
    }

    if (error) {
      logger.error("Shutdown failed", { error: error.message });
      process.exitCode = 1;
    } else {
      process.exitCode = 0;
    }
  });
};

shutdownSignals.forEach((signal) => process.once(signal, () => shutdown(signal)));

export { app, server };
