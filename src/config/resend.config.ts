import { Resend } from "resend";
import { Env } from "./env.config";
import { logger } from "../utils/logger";

export const resendClient: Resend | null = Env.RESEND_API_KEY
  ? new Resend(Env.RESEND_API_KEY)
  : null;

if (!resendClient && Env.NODE_ENV !== "test") {
  logger.warn("Resend API key is not configured; emails will be logged in development.");
}
