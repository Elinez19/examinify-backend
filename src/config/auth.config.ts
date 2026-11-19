import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { admin, twoFactor, username } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { db } from "../db";
import * as schema from "../db/schema";
import { Env } from "./env.config";
import { emailService } from "../services/email.service";

export const auth = betterAuth({
  appName: "Examinify",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: Env.BETTER_AUTH_SECRET,
  baseURL: Env.BETTER_AUTH_URL,
  trustedOrigins: Env.CORS_ORIGINS,
  // No Google OAuth and no public signup: accounts are provisioned strictly by admins
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    async sendResetPassword({ user: targetUser, url }) {
      await emailService.sendPasswordResetEmail({
        to: targetUser.email,
        name: targetUser.name,
        resetUrl: url,
      });
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "student",
        input: false,
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "active",
        input: false,
      },
      mustChangePassword: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: false,
      },
      primaryBranchId: {
        type: "string",
        required: false,
        input: false,
      },
      primarySchoolId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: Env.NODE_ENV === "production" ? "lax" : "lax",
      secure: Env.NODE_ENV === "production",
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 64,
      usernameValidator: (value) => /^[a-zA-Z0-9._/-]+$/.test(value),
    }),
    twoFactor({
      issuer: "Examinify",
    }),
    admin({
      defaultRole: "student",
      adminRoles: ["super_admin", "school_admin"],
      roles: {
        super_admin: adminAc,
        school_admin: adminAc,
        examiner: userAc,
        teacher: userAc,
        non_academic_staff: userAc,
        student: userAc,
      },
    }),
  ],
});

export type AuthInstance = typeof auth;
