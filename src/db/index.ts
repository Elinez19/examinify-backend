import dns from "dns";
import net from "net";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { Env } from "../config/env.config";
import { logger } from "../utils/logger";
import * as schema from "./schema";

dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

const normalizeDatabaseUrl = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl);
    const sslMode = parsed.searchParams.get("sslmode");
    if (sslMode === "require" || sslMode === "prefer" || sslMode === "verify-ca") {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
};

export const pool = new Pool({
  connectionString: normalizeDatabaseUrl(Env.DATABASE_URL),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 30_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

pool.on("error", (err) => {
  logger.error("Unexpected idle Postgres client error", { error: err.message });
});

export const db = drizzle(pool, { schema });
