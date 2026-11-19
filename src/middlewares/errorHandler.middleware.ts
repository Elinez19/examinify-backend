import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError, ErrorCodes } from "../utils/app-error";
import { HttpStatus } from "../config/http-status.config";
import { logger } from "../utils/logger";
import { Env } from "../config/env.config";

export const formatZodError = (error: ZodError) => {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
};

export const errorHandler: ErrorRequestHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof ZodError) {
    res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      errorCode: ErrorCodes.ERR_VALIDATION,
      message: "Validation Error",
      errors: formatZodError(error),
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      errorCode: error.errorCode,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
    });
    return;
  }

  logger.error("Unhandled exception occurred", {
    error: error.message,
    stack: error.stack,
  });

  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    errorCode: ErrorCodes.ERR_INTERNAL,
    message: "Internal Server Error",
    ...(Env.NODE_ENV !== "production"
      ? { details: error.message, stack: error.stack }
      : {}),
  });
};
