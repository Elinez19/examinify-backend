import { v2 as cloudinary } from "cloudinary";
import { Env } from "./env.config";
import { BadRequestException, InternalServerException } from "../utils/app-error";

export const ALLOWED_UPLOAD_FOLDERS = ["examinify/avatars", "examinify/diagrams"] as const;
export type AllowedUploadFolder = (typeof ALLOWED_UPLOAD_FOLDERS)[number];

export const ALLOWED_IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp"] as const;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const isConfigured = Boolean(
  Env.CLOUDINARY_CLOUD_NAME && Env.CLOUDINARY_API_KEY && Env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: Env.CLOUDINARY_CLOUD_NAME,
    api_key: Env.CLOUDINARY_API_KEY,
    api_secret: Env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const generateSignedUploadParams = (params: {
  folder: AllowedUploadFolder;
  userId: string;
}) => {
  if (!isConfigured) {
    throw new InternalServerException(
      "Cloudinary media storage is not configured on this server."
    );
  }

  if (!ALLOWED_UPLOAD_FOLDERS.includes(params.folder)) {
    throw new BadRequestException("Invalid media upload folder.");
  }

  const timestamp = Math.round(Date.now() / 1000);
  const publicIdPrefix = `${params.userId}_${timestamp}`;
  const signParams: Record<string, string | number> = {
    folder: params.folder,
    public_id: publicIdPrefix,
    timestamp,
    allowed_formats: ALLOWED_IMAGE_FORMATS.join(","),
  };

  const signature = cloudinary.utils.api_sign_request(
    signParams,
    Env.CLOUDINARY_API_SECRET!
  );

  return {
    cloudName: Env.CLOUDINARY_CLOUD_NAME!,
    apiKey: Env.CLOUDINARY_API_KEY!,
    timestamp,
    signature,
    folder: params.folder,
    publicId: publicIdPrefix,
    allowedFormats: ALLOWED_IMAGE_FORMATS,
    maxFileSizeBytes: MAX_IMAGE_SIZE_BYTES,
    uploadUrl: `https://api.cloudinary.com/v1_1/${Env.CLOUDINARY_CLOUD_NAME!}/image/upload`,
  };
};

export { cloudinary };
