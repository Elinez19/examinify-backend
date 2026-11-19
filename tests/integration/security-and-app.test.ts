import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { NextFunction, Request, Response } from "express";
import { createApp } from "../../src/app";
import { requireMfaForAdmins } from "../../src/middlewares/auth.middleware";
import { scopeService } from "../../src/services/scope.service";
import { ErrorCodes, ForbiddenException, MfaRequiredException } from "../../src/utils/app-error";
import { AuthenticatedUser } from "../../src/types/express";

const makeUser = (overrides: Partial<AuthenticatedUser>): AuthenticatedUser => ({
  id: "u-1",
  name: "Test User",
  email: "test@examinify.edu.ng",
  username: "testuser",
  role: "student",
  status: "active",
  mustChangePassword: false,
  twoFactorEnabled: false,
  primaryBranchId: "branch-wuse",
  primarySchoolId: "school-wuse-sec",
  image: null,
  ...overrides,
});

describe("API Security Boundaries, MFA Gate & Branch/School ABAC", () => {
  const app = createApp();

  it("returns 200 ok on /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("blocks public self-signup on /api/auth/sign-up/email with 403 Forbidden", async () => {
    const res = await request(app)
      .post("/api/auth/sign-up/email")
      .send({ name: "Hacker", email: "hacker@example.com", password: "Password@123" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe(ErrorCodes.ERR_FORBIDDEN);
  });

  it("returns 401 Unauthorized for unauthenticated calls to protected /api/v1 endpoints", async () => {
    const res = await request(app).get("/api/v1/users/me");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe(ErrorCodes.ERR_UNAUTHORIZED);
  });

  it("blocks super_admin and school_admin without 2FA enabled via requireMfaForAdmins", () => {
    const nextAdminBlocked = vi.fn();
    requireMfaForAdmins(
      {
        auth: {
          user: makeUser({ role: "school_admin", twoFactorEnabled: false }),
          session: { id: "s1", token: "t1", expiresAt: new Date(), ipAddress: null, userAgent: null },
        },
      } as unknown as Request,
      {} as Response,
      nextAdminBlocked as unknown as NextFunction
    );
    expect(nextAdminBlocked).toHaveBeenCalledTimes(1);
    expect(nextAdminBlocked.mock.calls[0][0]).toBeInstanceOf(MfaRequiredException);

    const nextAdminAllowed = vi.fn();
    requireMfaForAdmins(
      {
        auth: {
          user: makeUser({ role: "school_admin", twoFactorEnabled: true }),
          session: { id: "s1", token: "t1", expiresAt: new Date(), ipAddress: null, userAgent: null },
        },
      } as unknown as Request,
      {} as Response,
      nextAdminAllowed as unknown as NextFunction
    );
    expect(nextAdminAllowed).toHaveBeenCalledWith();

    const nextTeacherAllowed = vi.fn();
    requireMfaForAdmins(
      {
        auth: {
          user: makeUser({ role: "teacher", twoFactorEnabled: false }),
          session: { id: "s1", token: "t1", expiresAt: new Date(), ipAddress: null, userAgent: null },
        },
      } as unknown as Request,
      {} as Response,
      nextTeacherAllowed as unknown as NextFunction
    );
    expect(nextTeacherAllowed).toHaveBeenCalledWith();
  });

  it("enforces ABAC branch/school isolation (Wuse admin cannot access Guzape resources)", () => {
    const wuseAdmin = makeUser({
      role: "school_admin",
      primaryBranchId: "branch-wuse",
      primarySchoolId: "school-wuse-sec",
    });

    expect(() =>
      scopeService.assertBranchSchoolScope(wuseAdmin, {
        branchId: "branch-wuse",
        schoolId: "school-wuse-sec",
      })
    ).not.toThrow();

    expect(() =>
      scopeService.assertBranchSchoolScope(wuseAdmin, {
        branchId: "branch-guzape",
        schoolId: "school-guzape-sec",
      })
    ).toThrow(ForbiddenException);

    const superAdmin = makeUser({
      role: "super_admin",
      primaryBranchId: null,
      primarySchoolId: null,
    });
    expect(() =>
      scopeService.assertBranchSchoolScope(superAdmin, {
        branchId: "branch-guzape",
        schoolId: "school-guzape-sec",
      })
    ).not.toThrow();
  });
});
