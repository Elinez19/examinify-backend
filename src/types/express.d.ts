import { AccountStatus, UserRole } from "../db/schema/enums";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: UserRole;
  status: AccountStatus;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  primaryBranchId: string | null;
  primarySchoolId: string | null;
  image: string | null;
}

export interface AuthenticatedSession {
  id: string;
  token: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface RequestAuthContext {
  user: AuthenticatedUser;
  session: AuthenticatedSession;
}

declare global {
  namespace Express {
    interface Request {
      auth?: RequestAuthContext;
    }
  }
}

export {};
