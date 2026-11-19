import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { Env } from "../config/env.config";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

export const pool = new Pool({ connectionString: Env.DATABASE_URL });
export const db = drizzle(pool, { schema });
