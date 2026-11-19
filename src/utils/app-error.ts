import { HttpStatus, HttpStatusCode } from "../config/http-status.config";

export const ErrorCodes = {
  ERR_INTERNAL: "ERR_INTERNAL",
  ERR_BAD_REQUEST: "ERR_BAD_REQUEST",
  ERR_UNAUTHORIZED: "ERR_UNAUTHORIZED",
  ERR_FORBIDDEN: "ERR_FORBIDDEN",
  ERR_NOT_FOUND: "ERR_NOT_FOUND",
  ERR_CONFLICT: "ERR_CONFLICT",
  ERR_VALIDATION: "ERR_VALIDATION",
  ERR_TOO_MANY_REQUESTS: "ERR_TOO_MANY_REQUESTS",
  ERR_MFA_REQUIRED: "ERR_MFA_REQUIRED",
  ERR_SESSION_LOCKED: "ERR_SESSION_LOCKED",
  ERR_EXAM_CLOSED: "ERR_EXAM_CLOSED",
} as const;

export type ErrorCodeType = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly errorCode: ErrorCodeType;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCodeType = ErrorCodes.ERR_INTERNAL,
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InternalServerException extends AppError {
  constructor(message = "Internal Server Error", details?: unknown) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.ERR_INTERNAL, details);
  }
}

export class NotFoundException extends AppError {
  constructor(message = "Resource Not Found", details?: unknown) {
    super(message, HttpStatus.NOT_FOUND, ErrorCodes.ERR_NOT_FOUND, details);
  }
}

export class BadRequestException extends AppError {
  constructor(message = "Bad Request", details?: unknown) {
    super(message, HttpStatus.BAD_REQUEST, ErrorCodes.ERR_BAD_REQUEST, details);
  }
}

export class UnauthorizedException extends AppError {
  constructor(message = "Unauthorized", details?: unknown) {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCodes.ERR_UNAUTHORIZED, details);
  }
}

export class ForbiddenException extends AppError {
  constructor(message = "Forbidden", details?: unknown) {
    super(message, HttpStatus.FORBIDDEN, ErrorCodes.ERR_FORBIDDEN, details);
  }
}

export class ConflictException extends AppError {
  constructor(message = "Conflict", details?: unknown) {
    super(message, HttpStatus.CONFLICT, ErrorCodes.ERR_CONFLICT, details);
  }
}

export class TooManyRequestsException extends AppError {
  constructor(message = "Too many requests. Try again later.", details?: unknown) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, ErrorCodes.ERR_TOO_MANY_REQUESTS, details);
  }
}

export class MfaRequiredException extends AppError {
  constructor(
    message = "Two-factor authentication enrollment is required for administrator accounts.",
    details?: unknown
  ) {
    super(message, HttpStatus.FORBIDDEN, ErrorCodes.ERR_MFA_REQUIRED, details);
  }
}

export class SessionLockedException extends AppError {
  constructor(
    message = "This exam attempt is locked to another active session. Contact your examiner or school admin to unlock it.",
    details?: unknown
  ) {
    super(message, HttpStatus.CONFLICT, ErrorCodes.ERR_SESSION_LOCKED, details);
  }
}

export class ExamClosedException extends AppError {
  constructor(message = "This exam is not currently accepting submissions.", details?: unknown) {
    super(message, HttpStatus.FORBIDDEN, ErrorCodes.ERR_EXAM_CLOSED, details);
  }
}
