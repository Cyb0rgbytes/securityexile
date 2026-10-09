import "server-only";
import { getEnv } from "@/lib/db/client";

/**
 * Origin that uploaded images are served from. In `next dev` uploads live in the
 * local R2 emulation and are served by /dev-files; deployed, R2's custom domain.
 */
export function filesOrigin(): string {
  if (process.env.NODE_ENV === "development") return "/dev-files";
  return getEnv().FILES_ORIGIN;
}
