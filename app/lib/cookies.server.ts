import { createCookie } from "@remix-run/node"; // Or your specific runtime like @remix-run/cloudflare
import config from "~/config.server";

// Function to parse duration strings like "7d", "24h", "60m" into seconds
// This is a simplified parser, more robust parsing might be needed for all cases.
function parseDurationToSeconds(durationStr: string): number | undefined {
  if (!durationStr) return undefined;

  const value = parseInt(durationStr.slice(0, -1));
  const unit = durationStr.slice(-1);

  if (isNaN(value)) return undefined;

  switch (unit) {
    case 's': // seconds
      return value;
    case 'm': // minutes
      return value * 60;
    case 'h': // hours
      return value * 60 * 60;
    case 'd': // days
      return value * 60 * 60 * 24;
    default:
      return undefined; // Unknown unit
  }
}

const jwtExpiresInSeconds = parseDurationToSeconds(config.JWT_EXPIRES_IN);

if (!jwtExpiresInSeconds) {
  console.warn(`Invalid JWT_EXPIRES_IN format: "${config.JWT_EXPIRES_IN}". Defaulting cookie maxAge to 7 days. Consider using 's', 'm', 'h', 'd' units.`);
}

export const authCookie = createCookie("auth-token", {
  secret: config.AUTH_SECRET, // Ensures the cookie is signed
  httpOnly: true, // The cookie cannot be accessed by client-side JavaScript
  secure: config.NODE_ENV === "production", // Send cookie only over HTTPS in production
  maxAge: jwtExpiresInSeconds || 60 * 60 * 24 * 7, // e.g., 7 days in seconds, aligned with JWT_EXPIRES_IN
  path: "/", // The cookie is available for all paths
  sameSite: "lax", // Protection against CSRF attacks
});
