import crypto from "crypto";

/**
 * Generate a 64-char unguessable dashboard access token.
 * 32 chars from UUID (hyphens stripped) + 32 chars from random bytes.
 */
export function generateDashboardToken(): string {
  const uuid = crypto.randomUUID().replace(/-/g, "");
  const bytes = crypto.randomBytes(16).toString("hex");
  return uuid + bytes;
}

/**
 * Extract the token query param from a stored dashboard link URL.
 */
export function extractTokenFromLink(dashboardLink: string): string | null {
  try {
    return new URL(dashboardLink).searchParams.get("token");
  } catch {
    return null;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
