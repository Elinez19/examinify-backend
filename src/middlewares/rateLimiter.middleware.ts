import { NextFunction, Request, RequestHandler, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { Ratelimit } from "@upstash/ratelimit";
import { redisClient } from "../config/redis.config";
import { ErrorCodes } from "../utils/app-error";
import { HttpStatus } from "../config/http-status.config";

type DurationUnit = "s" | "m" | "h" | "d";

interface LimiterConfig {
  prefix: string;
  maxRequests: number;
  windowMs: number;
  windowDuration: `${number} ${DurationUnit}`;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

const getClientIp = (req: Request): string => {
  return req.ip || req.socket.remoteAddress || "unknown";
};

const createLimiter = (config: LimiterConfig): RequestHandler => {
  const errorPayload = {
    success: false,
    errorCode: ErrorCodes.ERR_TOO_MANY_REQUESTS,
    message: config.message || "Too many requests. Try again later.",
  };

  if (redisClient) {
    const upstashLimiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.maxRequests, config.windowDuration),
      prefix: `examinify:rl:${config.prefix}`,
      analytics: false,
    });

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = config.keyGenerator ? config.keyGenerator(req) : getClientIp(req);
        const result = await upstashLimiter.limit(key);

        res.setHeader("RateLimit-Limit", String(result.limit));
        res.setHeader("RateLimit-Remaining", String(result.remaining));
        res.setHeader("RateLimit-Reset", String(Math.ceil(result.reset / 1000)));

        if (!result.success) {
          res.status(HttpStatus.TOO_MANY_REQUESTS).json(errorPayload);
          return;
        }
        next();
      } catch {
        // Fail open only if Upstash is transiently unreachable so live exams aren't halted
        next();
      }
    };
  }

  return rateLimit({
    windowMs: config.windowMs,
    limit: config.maxRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: config.keyGenerator
      ? (req) => config.keyGenerator!(req)
      : undefined,
    message: errorPayload,
  });
};

export const apiLimiter = createLimiter({
  prefix: "api",
  maxRequests: 120,
  windowMs: 60 * 1000,
  windowDuration: "1 m",
});

export const authLimiter = createLimiter({
  prefix: "auth",
  maxRequests: 15,
  windowMs: 15 * 60 * 1000,
  windowDuration: "15 m",
  message: "Too many authentication attempts. Please try again later.",
});

export const pinLimiter = createLimiter({
  prefix: "pin",
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
  windowDuration: "15 m",
  keyGenerator: (req) => `${req.auth?.user.id ?? getClientIp(req)}:${req.params.examId ?? "global"}`,
  message: "Too many exam PIN verification attempts. Contact your examiner.",
});

export const submitLimiter = createLimiter({
  prefix: "submit",
  maxRequests: 15,
  windowMs: 60 * 1000,
  windowDuration: "1 m",
  keyGenerator: (req) => req.auth?.user.id ?? getClientIp(req),
  message: "Too many exam submission requests. Please wait a moment.",
});

export const aiLimiter = createLimiter({
  prefix: "ai",
  maxRequests: 20,
  windowMs: 60 * 60 * 1000,
  windowDuration: "1 h",
  keyGenerator: (req) => req.auth?.user.id ?? getClientIp(req),
  message: "AI question generation quota exceeded for this hour.",
});
