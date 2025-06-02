// app/lib/.server/auth.server.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { User } from './db/user.server'; // Import the User interface

const BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS, 10) : 12;
const AUTH_SECRET = process.env.AUTH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SESSION_TIMEOUT_MS = process.env.SESSION_TIMEOUT ? parseInt(process.env.SESSION_TIMEOUT, 10) : 3600000 * 24 * 7; // Default 7 days

if (!AUTH_SECRET) {
  // In a real app, you might want to prevent startup if the secret is missing.
  // For now, this will throw an error when functions requiring it are called.
  console.error('CRITICAL: AUTH_SECRET environment variable is not set.');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: Pick<User, 'id' | 'email'>): string {
  if (!AUTH_SECRET) {
    throw new Error('AUTH_SECRET is not configured, cannot generate token.');
  }
  return jwt.sign({ userId: user.id, email: user.email }, AUTH_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function createAuthCookie(token: string): string {
  const maxAge = SESSION_TIMEOUT_MS / 1000; // Convert ms to seconds
  // Determine if 'Secure' attribute should be added.
  // Typically, in production (HTTPS), it should be.
  // process.env.NODE_ENV is a common way to check, but this might vary by deployment environment.
  // For Cloudflare Workers, you might check the URL protocol or a specific environment variable.
  // For this example, let's assume HTTPS if not explicitly in a 'development' NODE_ENV.
  const secureAttribute = process.env.NODE_ENV === 'development' ? '' : 'Secure;';
  
  return `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}; ${secureAttribute}`;
}

export function verifyToken(token: string): { userId: string; email: string; iat: number; exp: number } | null {
  if (!AUTH_SECRET) {
    console.error('AUTH_SECRET is not set. Cannot verify token.');
    return null;
  }
  try {
    // The type assertion helps if your payload is specifically { userId: string; email: string; ... }
    return jwt.verify(token, AUTH_SECRET) as { userId: string; email: string; iat: number; exp: number };
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
}

export function createLogoutCookie(): string {
  // Set Max-Age to 0 to expire the cookie immediately
  // Ensure Path and Domain (if used) match the original cookie
  // The Secure attribute should also match how it's set in createAuthCookie
  const secureAttribute = process.env.NODE_ENV === 'development' ? '' : 'Secure;';
  return `auth_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; ${secureAttribute}`;
}
