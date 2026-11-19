import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const isTest = process.env.NODE_ENV === "test";

const emptyToUndefined = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? undefined : val;

const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    APP_FRONTEND_URL: z.string().url().default("http://localhost:5173"),

    // Neon PostgreSQL Database
    DATABASE_URL: isTest
      ? z.string().default("postgresql://test:test@localhost:5432/examinify_test")
      : z.string().min(1, "DATABASE_URL is required"),

    // Better Auth Configuration (fail-fast, no hardcoded fallback outside test)
    BETTER_AUTH_SECRET: isTest
      ? z.string().min(32).default("test_only_better_auth_secret_minimum_32_chars_long")
      : z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters long"),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:5000"),

    // Resend Transactional Email
    RESEND_API_KEY: optionalString,
    RESEND_FROM_EMAIL: z.string().default("Examinify <no-reply@examinify.edu.ng>"),

    // Cloudinary Media Uploads
    CLOUDINARY_CLOUD_NAME: optionalString,
    CLOUDINARY_API_KEY: optionalString,
    CLOUDINARY_API_SECRET: optionalString,

    // Upstash Redis (Rate limits, exam session locks, quotas)
    UPSTASH_REDIS_REST_URL: optionalUrl,
    UPSTASH_REDIS_REST_TOKEN: optionalString,

    // Gemini AI Question Generator
    GEMINI_API_KEY: optionalString,
    GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

    // Swagger / Docs Gate
    ENABLE_SWAGGER: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),

    // Bootstrap Super Admin (used by npm run db:seed:bootstrap)
    BOOTSTRAP_SUPER_ADMIN_NAME: z.string().default("Examinify Super Admin"),
    BOOTSTRAP_SUPER_ADMIN_USERNAME: z.string().default("superadmin"),
    BOOTSTRAP_SUPER_ADMIN_EMAIL: z.string().email().default("superadmin@examinify.edu.ng"),
    BOOTSTRAP_SUPER_ADMIN_PASSWORD: optionalString,
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      const prodRequired: Array<keyof typeof data> = [
        "RESEND_API_KEY",
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
      ];

      for (const key of prodRequired) {
        if (!data[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required in production mode`,
          });
        }
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${formatted}`);
}

const corsOrigins = parsed.data.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const Env = {
  ...parsed.data,
  CORS_ORIGINS: corsOrigins,
} as const;
