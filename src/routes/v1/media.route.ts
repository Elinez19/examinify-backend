import { Request, Response, Router } from "express";
import { generateSignedUploadParams } from "../../config/cloudinary.config";
import { HttpStatus } from "../../config/http-status.config";
import { hasPermission, PERMISSIONS } from "../../config/permissions.config";
import { asyncHandler } from "../../middlewares/asyncHandler.middleware";
import { requireAuth, requireMfaForAdmins } from "../../middlewares/auth.middleware";
import { ForbiddenException } from "../../utils/app-error";
import { mediaSignatureSchema } from "../../validators/institution.validator";

export const mediaRoutes = Router();

mediaRoutes.post(
  "/upload-signature",
  requireAuth,
  requireMfaForAdmins,
  asyncHandler(async (req: Request, res: Response) => {
    const { folder } = mediaSignatureSchema.parse(req.body);
    const actor = req.auth!.user;

    if (
      folder === "examinify/diagrams" &&
      !hasPermission(actor.role, PERMISSIONS.MEDIA_UPLOAD_DIAGRAM)
    ) {
      throw new ForbiddenException("Only staff with authoring permissions can upload question diagrams.");
    }

    const signed = generateSignedUploadParams({
      folder,
      userId: actor.id,
    });

    res.status(HttpStatus.OK).json({ success: true, data: signed });
  })
);
