import { Express, NextFunction, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import { Env } from "../config/env.config";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { getOpenApiSpec } from "./openapi";

const customCss = `
  .swagger-ui .topbar {
    background-color: #0f172a;
    border-bottom: 2px solid #3b82f6;
    padding: 12px 0;
  }
  .swagger-ui .topbar .topbar-wrapper .link {
    display: flex;
    align-items: center;
    font-weight: 700;
    font-size: 1.25rem;
    color: #ffffff;
    text-decoration: none;
  }
`;

export const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  customSiteTitle: "Examinify API Documentation",
  customCss,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: "list",
    filter: true,
    tryItOutEnabled: true,
  },
};

export const setupSwagger = (app: Express): void => {
  // Disable Swagger docs in production unless explicitly opted-in
  if (Env.NODE_ENV === "production" && !Env.ENABLE_SWAGGER) {
    return;
  }

  const docsGuards =
    Env.NODE_ENV === "production"
      ? [requireAuth, requireRole("super_admin")]
      : [];

  const allowSwaggerAssets = (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: https://validator.swagger.io; " +
        "font-src 'self' https://fonts.gstatic.com;"
    );
    next();
  };

  const serveOpenApiJson = (req: Request, res: Response) => {
    const protocol = req.protocol || "http";
    const host = req.get("host") || `localhost:${Env.PORT}`;
    const serverUrl = `${protocol}://${host}`;
    res.status(200).json(getOpenApiSpec(serverUrl));
  };

  app.get("/docs/openapi.json", ...docsGuards, serveOpenApiJson);
  app.get("/api-docs/openapi.json", ...docsGuards, serveOpenApiJson);

  const swaggerSetupHandler = (req: Request, res: Response, next: NextFunction) => {
    const protocol = req.protocol || "http";
    const host = req.get("host") || `localhost:${Env.PORT}`;
    const serverUrl = `${protocol}://${host}`;
    return swaggerUi.setup(getOpenApiSpec(serverUrl), swaggerUiOptions)(req, res, next);
  };

  app.use("/docs", ...docsGuards, allowSwaggerAssets, swaggerUi.serve, swaggerSetupHandler);
  app.use("/api-docs", ...docsGuards, allowSwaggerAssets, swaggerUi.serve, swaggerSetupHandler);
};
