import { Request } from "express";
import { db } from "../db";
import { auditLogs } from "../db/schema";
import { logger } from "../utils/logger";

export interface AuditLogInput {
  actorUserId?: string | null;
  actorRole?: string | null;
  branchId?: string | null;
  schoolId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  req?: Request;
}

export const auditService = {
  async log(input: AuditLogInput): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        actorUserId: input.actorUserId ?? input.req?.auth?.user.id ?? null,
        actorRole: input.actorRole ?? input.req?.auth?.user.role ?? null,
        branchId: input.branchId ?? input.req?.auth?.user.primaryBranchId ?? null,
        schoolId: input.schoolId ?? input.req?.auth?.user.primarySchoolId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? {},
        ipAddress: input.req?.ip ?? null,
        userAgent: input.req?.get("user-agent") ?? null,
      });
    } catch (error) {
      logger.error("Failed to persist audit log", {
        action: input.action,
        entityType: input.entityType,
        error: (error as Error).message,
      });
    }
  },
};
