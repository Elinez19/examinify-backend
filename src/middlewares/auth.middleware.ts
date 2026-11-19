import { NextFunction, Request, RequestHandler, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "../config/auth.config";
import { db } from "../db";
import { user as userTable } from "../db/schema";
import { UserRole } from "../db/schema/enums";
import {
  ADMIN_MFA_ROLES,
  hasPermission,
  Permission,
} from "../config/permissions.config";
import {
  ForbiddenException,
  MfaRequiredException,
  UnauthorizedException,
} from "../utils/app-error";

export const requireAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!sessionData?.session || !sessionData?.user) {
      next(new UnauthorizedException("Authentication required."));
      return;
    }

    const [dbUser] = await db
      .select()
      .from(userTable)
      .where(and(eq(userTable.id, sessionData.user.id), isNull(userTable.deletedAt)))
      .limit(1);

    if (!dbUser || dbUser.banned || dbUser.status === "suspended") {
      next(new ForbiddenException("Account is suspended or inactive."));
      return;
    }

    if (dbUser.status === "pending") {
      next(new ForbiddenException("Account activation is pending."));
      return;
    }

    req.auth = {
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        username: dbUser.username,
        role: dbUser.role,
        status: dbUser.status,
        mustChangePassword: dbUser.mustChangePassword,
        twoFactorEnabled: Boolean(dbUser.twoFactorEnabled),
        primaryBranchId: dbUser.primaryBranchId,
        primarySchoolId: dbUser.primarySchoolId,
        image: dbUser.image,
      },
      session: {
        id: sessionData.session.id,
        token: sessionData.session.token,
        expiresAt: new Date(sessionData.session.expiresAt),
        ipAddress: sessionData.session.ipAddress ?? null,
        userAgent: sessionData.session.userAgent ?? null,
      },
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Enforces mandatory 2FA enrollment for super_admin and school_admin accounts
 * before allowing access to operational endpoints.
 */
export const requireMfaForAdmins: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const actor = req.auth?.user;
  if (!actor) {
    next(new UnauthorizedException("Authentication required."));
    return;
  }

  if (ADMIN_MFA_ROLES.has(actor.role) && !actor.twoFactorEnabled) {
    next(
      new MfaRequiredException(
        "Two-factor authentication must be enabled before accessing administrator endpoints."
      )
    );
    return;
  }

  next();
};

export const requireRole = (...allowedRoles: UserRole[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const actor = req.auth?.user;
    if (!actor) {
      next(new UnauthorizedException("Authentication required."));
      return;
    }

    if (!allowedRoles.includes(actor.role)) {
      next(new ForbiddenException("Insufficient role privileges for this operation."));
      return;
    }

    next();
  };
};

export const requirePermission = (...requiredPermissions: Permission[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const actor = req.auth?.user;
    if (!actor) {
      next(new UnauthorizedException("Authentication required."));
      return;
    }

    const allowed = requiredPermissions.every((perm) => hasPermission(actor.role, perm));
    if (!allowed) {
      next(
        new ForbiddenException(
          `Missing required permission: ${requiredPermissions.join(", ")}`
        )
      );
      return;
    }

    next();
  };
};
