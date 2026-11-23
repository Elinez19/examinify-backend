import { Request, Response } from "express";
import { HttpStatus } from "../config/http-status.config";
import { UserRole } from "../db/schema/enums";
import { userService } from "../services/user.service";
import {
  completeFirstLoginSchema,
  createBranchMemberSchema,
  createSchoolAdminSchema,
  importCsvMembersSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from "../validators/user.validator";

export const userController = {
  async getMe(req: Request, res: Response) {
    const data = await userService.getMe(req.auth!.user);
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async createSchoolAdmin(req: Request, res: Response) {
    const payload = createSchoolAdminSchema.parse(req.body);
    const data = await userService.createSchoolAdmin(req.auth!.user, payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },

  async createBranchMember(req: Request, res: Response) {
    const payload = createBranchMemberSchema.parse(req.body);
    const data = await userService.createBranchMember(req.auth!.user, payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },

  async importMembersCsv(req: Request, res: Response) {
    const payload = importCsvMembersSchema.parse(req.body);
    const data = await userService.importMembersFromCsv(req.auth!.user, payload, req);
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async listDirectory(req: Request, res: Response) {
    const data = await userService.listDirectory(req.auth!.user, {
      role: typeof req.query.role === "string" ? (req.query.role as UserRole) : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      branchId: typeof req.query.branchId === "string" ? req.query.branchId : undefined,
      schoolId: typeof req.query.schoolId === "string" ? req.query.schoolId : undefined,
    });
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async updateStatus(req: Request, res: Response) {
    const payload = updateUserStatusSchema.parse(req.body);
    const data = await userService.updateUserStatus(
      req.auth!.user,
      String(req.params.userId),
      payload.status,
      payload.reason,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async updateRole(req: Request, res: Response) {
    const payload = updateUserRoleSchema.parse(req.body);
    const data = await userService.updateUserRole(
      req.auth!.user,
      String(req.params.userId),
      payload.role,
      payload.reason,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async completeFirstLogin(req: Request, res: Response) {
    const payload = completeFirstLoginSchema.parse(req.body);
    const data = await userService.completeFirstLoginPasswordChange(
      req.auth!.user,
      payload.currentPassword,
      payload.newPassword,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },
};
