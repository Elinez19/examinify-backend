import { Request, Response } from "express";
import { HttpStatus } from "../config/http-status.config";
import { cbtService } from "../services/cbt.service";
import {
  forceSubmitSchema,
  recordInfractionSchema,
  saveAnswerSchema,
  startAttemptSchema,
} from "../validators/cbt.validator";

export const cbtController = {
  async startAttempt(req: Request, res: Response) {
    const payload = startAttemptSchema.parse(req.body ?? {});
    const data = await cbtService.startOrResumeAttempt(
      req.auth!,
      String(req.params.examId),
      payload,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async saveAnswer(req: Request, res: Response) {
    const payload = saveAnswerSchema.parse(req.body);
    const data = await cbtService.saveAnswer(
      req.auth!,
      String(req.params.attemptId),
      payload
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async recordInfraction(req: Request, res: Response) {
    const payload = recordInfractionSchema.parse(req.body);
    const data = await cbtService.recordInfraction(
      req.auth!,
      String(req.params.attemptId),
      payload
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async submitAttempt(req: Request, res: Response) {
    const data = await cbtService.submitAttempt(
      req.auth!,
      String(req.params.attemptId)
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async listMyResults(req: Request, res: Response) {
    const data = await cbtService.listMyResults(req.auth!.user.id);
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async forceSubmit(req: Request, res: Response) {
    const payload = forceSubmitSchema.parse(req.body ?? {});
    const data = await cbtService.forceSubmitAttempt(
      req.auth!,
      String(req.params.attemptId),
      payload.reason,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async unlockSession(req: Request, res: Response) {
    const data = await cbtService.unlockAttemptSession(
      req.auth!,
      String(req.params.attemptId),
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },
};
