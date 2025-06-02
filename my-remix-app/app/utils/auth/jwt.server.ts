import { sign, verify, decode } from "jsonwebtoken"; // Removed unused OfficialJwtPayload
// import type { JwtPayload as OfficialJwtPayload } from "jsonwebtoken"; // If needed for direct use

const AUTH_SECRET = process.env.AUTH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!AUTH_SECRET) {
  throw new Error("AUTH_SECRET environment variable is not set. JWT signing will fail.");
}

export interface JwtPayload {
  id: string;
  email: string;
  // You can add other fields like roles, name, etc.
  // exp and iat are automatically added by jsonwebtoken
}

/**
 * Generates a JWT for a user.
 * @param userPayload The user information to include in the token.
 *                  Must contain at least `id` and `email`.
 * @returns The generated JWT string.
 */
export function generateToken(userPayload: { id: string; email: string }): string {
  if (!userPayload || !userPayload.id || !userPayload.email) {
    throw new Error("User payload must include id and email to generate a token.");
  }

  return sign(
    userPayload,
    AUTH_SECRET!, // Assert AUTH_SECRET is defined (checked at module load)
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verifies a JWT.
 * @param token The JWT string to verify.
 * @returns A promise that resolves to the decoded payload if the token is valid,
 *          or rejects with an error if invalid or expired.
 */
export function verifyToken(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    if (!token) {
      return reject(new Error("Token cannot be empty."));
    }

    verify(token, AUTH_SECRET!, (err, decoded) => {
      if (err) {
        return reject(err); // e.g., JsonWebTokenError: invalid signature, TokenExpiredError
      }
      // Type assertion because jwt.verify's decoded type is string | JwtPayload | undefined
      resolve(decoded as JwtPayload);
    });
  });
}

/**
 * (Optional) Decodes a JWT without verifying its signature.
 * Useful for debugging or getting claims from an already verified token.
 * IMPORTANT: Do not trust the output of this function for security-sensitive operations
 * without prior verification using `verifyToken`.
 * @param token The JWT string to decode.
 * @returns The decoded payload or null if decoding fails.
 */
export function decodeToken(token: string): JwtPayload | null {
  if (!token) {
    return null;
  }
  try {
    const decoded = decode(token);
    return decoded as JwtPayload;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

// Note: The OfficialJwtPayload from 'jsonwebtoken' might be slightly different
// from our custom JwtPayload if we added more custom fields.
// For compatibility, we've kept our custom JwtPayload definition but aliased the import.
// If our JwtPayload is exactly `id` and `email` plus standard claims,
// we could potentially use OfficialJwtPayload directly after adjusting for what `verify` and `decode` return.
