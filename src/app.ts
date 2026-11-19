import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { Env } from "./config/env.config";
import { auth } from "./config/auth.config";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { apiLimiter, authLimiter } from "./middlewares/rateLimiter.middleware";
import { v1Routes } from "./routes/v1";
import { setupSwagger } from "./docs/swagger";
import { ForbiddenException, NotFoundException } from "./utils/app-error";

export const createApp = () => {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
        },
      },
    })
  );

  if (Env.CORS_ORIGINS.length > 0) {
    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || Env.CORS_ORIGINS.includes(origin)) {
            callback(null, true);
            return;
          }
          callback(new ForbiddenException("Origin not allowed by CORS policy."));
        },
        credentials: true,
      })
    );
  }

  // Block public Better Auth signup routes explicitly at the Express boundary
  app.all("/api/auth/sign-up/*splat", (_req, _res, next) => {
    next(
      new ForbiddenException(
        "Public registration is disabled. Accounts are provisioned by institution administrators."
      )
    );
  });

  // Rate-limit all Better Auth endpoints BEFORE body parsers to preserve raw request stream
  app.all("/api/auth/*splat", authLimiter, toNodeHandler(auth));

  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ extended: true, limit: "256kb" }));
  app.use(cookieParser());

  // Infrastructure liveness probe (outside API versioning, never rate-limited)
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  // Swagger docs (disabled in production unless explicitly enabled + super_admin auth)
  setupSwagger(app);

  // Versioned API routes
  app.use("/api/v1", apiLimiter, v1Routes);

  // 404 handler
  app.use((_req: Request, _res: Response, next) => {
    next(new NotFoundException("Resource not found"));
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
};
