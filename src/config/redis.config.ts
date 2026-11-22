import { Redis } from "@upstash/redis";
import { Env } from "./env.config";
import { logger } from "../utils/logger";

const hasUpstash =
  Env.NODE_ENV !== "test" &&
  Boolean(Env.UPSTASH_REDIS_REST_URL && Env.UPSTASH_REDIS_REST_TOKEN);

export const redisClient: Redis | null = hasUpstash
  ? new Redis({
      url: Env.UPSTASH_REDIS_REST_URL!,
      token: Env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

if (!redisClient && Env.NODE_ENV !== "test") {
  logger.warn("Upstash Redis is not configured; using in-memory store for development only.");
}

interface MemoryEntry {
  value: string;
  expiresAt: number | null;
}

const memoryStore = new Map<string, MemoryEntry>();

const getLiveMemoryEntry = (key: string): MemoryEntry | undefined => {
  const entry = memoryStore.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return undefined;
  }
  return entry;
};

export const cacheStore = {
  async get(key: string): Promise<string | null> {
    if (redisClient) {
      const value = await redisClient.get<string>(key);
      return value ?? null;
    }
    return getLiveMemoryEntry(key)?.value ?? null;
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (redisClient) {
      if (ttlSeconds && ttlSeconds > 0) {
        await redisClient.set(key, value, { ex: ttlSeconds });
      } else {
        await redisClient.set(key, value);
      }
      return;
    }
    memoryStore.set(key, {
      value,
      expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  },

  async del(key: string): Promise<void> {
    if (redisClient) {
      await redisClient.del(key);
      return;
    }
    memoryStore.delete(key);
  },

  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    if (redisClient) {
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, ttlSeconds);
      }
      return count;
    }
    const existing = getLiveMemoryEntry(key);
    const next = existing ? Number(existing.value) + 1 : 1;
    memoryStore.set(key, {
      value: String(next),
      expiresAt: existing?.expiresAt ?? Date.now() + ttlSeconds * 1000,
    });
    return next;
  },

  clearMemoryStore(): void {
    memoryStore.clear();
  },
};
