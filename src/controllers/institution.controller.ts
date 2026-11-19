import { Request, Response } from "express";
import { HttpStatus } from "../config/http-status.config";
import { institutionService } from "../services/institution.service";
import {
  createBranchSchema,
  createClassSchema,
  createSchoolSchema,
  createSessionSchema,
  createSubjectSchema,
  createTeacherAssignmentSchema,
  createTermSchema,
  recordAttendanceSchema,
} from "../validators/institution.validator";
import { BadRequestException } from "../utils/app-error";

export const institutionController = {
  async listBranches(_req: Request, res: Response) {
    const data = await institutionService.listBranches();
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async createBranch(req: Request, res: Response) {
    const payload = createBranchSchema.parse(req.body);
    const data = await institutionService.createBranch(payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },

  async listSchools(req: Request, res: Response) {
    const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
    const data = await institutionService.listSchools(branchId);
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async createSchool(req: Request, res: Response) {
    const payload = createSchoolSchema.parse(req.body);
    const data = await institutionService.createSchool(payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },

  async listSessions(_req: Request, res: Response) {
    const data = await institutionService.listAcademicSessions();
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async createSession(req: Request, res: Response) {
    const payload = createSessionSchema.parse(req.body);
    const data = await institutionService.createAcademicSession(payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },

  async createTerm(req: Request, res: Response) {
    const payload = createTermSchema.parse(req.body);
    const data = await institutionService.createTerm(payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },

  async listClasses(req: Request, res: Response) {
    const schoolId = typeof req.query.schoolId === "string" ? req.query.schoolId : undefined;
    const data = await institutionService.listClasses(req.auth!.user, schoolId);
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async createClass(req: Request, res: Response) {
    const payload = createClassSchema.parse(req.body);
    const data = await institutionService.createClass(req.auth!.user, payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },

  async listSubjects(req: Request, res: Response) {
    const level =
      req.query.schoolLevel === "primary" || req.query.schoolLevel === "secondary"
        ? req.query.schoolLevel
        : undefined;
    const data = await institutionService.listSubjects(level);
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async createSubject(req: Request, res: Response) {
    const payload = createSubjectSchema.parse(req.body);
    const data = await institutionService.createSubject(req.auth!.user, payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },

  async createTeacherAssignment(req: Request, res: Response) {
    const payload = createTeacherAssignmentSchema.parse(req.body);
    const data = await institutionService.createTeacherAssignment(req.auth!.user, payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },

  async recordAttendance(req: Request, res: Response) {
    const payload = recordAttendanceSchema.parse(req.body);
    const data = await institutionService.recordAttendance(req.auth!.user, payload, req);
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async listAttendance(req: Request, res: Response) {
    const classId = typeof req.query.classId === "string" ? req.query.classId : undefined;
    if (!classId) throw new BadRequestException("classId query parameter is required.");
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    const data = await institutionService.listAttendance(req.auth!.user, { classId, date });
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async listAuditLogs(req: Request, res: Response) {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const data = await institutionService.listAuditLogs(req.auth!.user, limit);
    res.status(HttpStatus.OK).json({ success: true, data });
  },
};
