import jwt from 'jsonwebtoken';
import config from '~/config.server';

// Define the structure of the JWT payload
export interface JWTPayload {
  userId: string;
  email: string; // Or other relevant user identifiers
  // Standard JWT claims:
  iat?: number; // Issued at
  exp?: number; // Expiration time
  iss?: string; // Issuer
  sub?: string; // Subject
}

/**
 * Generates a JWT for a given payload.
 * @param payload - The user-specific data to include in the token (e.g., { userId, email }).
 * @returns The signed JWT string.
 */
export function generateToken(payload: { userId: string; email: string }): string {
  if (!config.AUTH_SECRET) {
    throw new Error('AUTH_SECRET is not defined. Cannot sign JWTs.');
  }
  if (!config.JWT_EXPIRES_IN) {
    throw new Error('JWT_EXPIRES_IN is not defined. Cannot set token expiry.');
  }

  // Ensure payload is a plain object for JWT signing
  const tokenPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: payload.userId,
    email: payload.email,
  };

  return jwt.sign(tokenPayload, config.AUTH_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

/**
 * Verifies a JWT and returns its payload if valid.
 * @param token - The JWT string to verify.
 * @returns The decoded JWTPayload if the token is valid, otherwise null.
 */
export function verifyToken(token: string): JWTPayload | null {
  if (!config.AUTH_SECRET) {
    console.error('AUTH_SECRET is not defined. Cannot verify JWTs.');
    return null;
  }

  try {
    // jwt.verify can throw errors for invalid tokens (expired, malformed, etc.)
    const decoded = jwt.verify(token, config.AUTH_SECRET);

    // Check if decoded is an object and fits the JWTPayload structure
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded && 'email' in decoded) {
      return decoded as JWTPayload;
    }
    console.warn('Token verification resulted in an unexpected payload structure:', decoded);
    return null;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('Token expired:', error.message);
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Invalid token:', error.message);
    } else {
      console.error('An unexpected error occurred during token verification:', error);
    }
    return null;
  }
}
