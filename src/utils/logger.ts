import winston from "winston";
import { Env } from "../config/env.config";

const { colorize, combine, errors, json, printf, timestamp } = winston.format;

const SENSITIVE_KEY_PATTERN =
  /pass(word)?|secret|token|cookie|authorization|accesspin|pinhash|otp|backupcode|apikey|api_key|phone|guardian/i;

export const redactSensitiveValue = (value: unknown, depth = 0): unknown => {
  if (depth > 8 || value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = redactSensitiveValue(v, depth + 1);
      }
    }
    return out;
  }
  return value;
};

const redactFormat = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (key === "level" || key === "message" || key === "timestamp") continue;
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      info[key] = "[REDACTED]";
    } else {
      info[key] = redactSensitiveValue(info[key]);
    }
  }
  return info;
});

const developmentFormat = combine(
  redactFormat(),
  colorize({ all: true }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, stack, timestamp: loggedAt, ...meta }) => {
    const metadata = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${loggedAt} [${level}]: ${String(message)}${stack ? ` ${stack}` : ""}${metadata}`;
  })
);

export const logger = winston.createLogger({
  level: Env.LOG_LEVEL,
  format:
    Env.NODE_ENV === "production"
      ? combine(redactFormat(), timestamp(), errors({ stack: true }), json())
      : developmentFormat,
  transports: [new winston.transports.Console()],
  silent: Env.NODE_ENV === "test",
});
