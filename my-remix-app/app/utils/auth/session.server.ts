import { createCookieSessionStorage, redirect } from "@remix-run/node";

import { getUserById } from "~/models/user.server.js"; // Ensure .js if type:module in package.json
import type { User } from "~/types/user"; // Assuming User type

import { verifyToken, type JwtPayload } from "./jwt.server.js"; // Ensure .js if type:module in package.json

const SESSION_SECRET = process.env.AUTH_SECRET; // Reuse AUTH_SECRET for session signing
const SESSION_TIMEOUT_MS = process.env.SESSION_TIMEOUT
  ? parseInt(process.env.SESSION_TIMEOUT, 10)
  : 3600000; // Default to 1 hour

if (!SESSION_SECRET) {
  throw new Error("AUTH_SECRET environment variable is not set. Session storage will fail.");
}

// Configure session storage
// The `createCookieSessionStorage` function creates a session storage object that
// stores session data in a cookie.
export const { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: {
    name: "__session", // Name of the cookie
    secrets: [SESSION_SECRET], // Secret used to sign the cookie
    sameSite: "lax", // CSRF protection; "strict" is more secure but can affect UX
    path: "/",
    httpOnly: true, // Prevents client-side JS from accessing the cookie
    secure: process.env.NODE_ENV === "production", // Only send cookie over HTTPS in production
    maxAge: SESSION_TIMEOUT_MS / 1000, // Cookie lifetime in seconds
  },
});

/**
 * Retrieves the current user ID from the session cookie.
 * @param request The incoming Request object.
 * @returns The user ID if the user is logged in, otherwise null.
 */
export async function getUserId(request: Request): Promise<string | null> {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  return userId || null;
}

/**
 * Retrieves the current user's JWT from the session cookie.
 * @param request The incoming Request object.
 * @returns The JWT string if available, otherwise null.
 */
export async function getUserToken(request: Request): Promise<string | null> {
  const session = await getSession(request.headers.get("Cookie"));
  const token = session.get("userToken");
  return token || null;
}

/**
 * Retrieves the current authenticated user based on the session or JWT.
 * This function can be used in loaders to get user data.
 * @param request The incoming Request object.
 * @returns The user object (excluding password_hash) if authenticated, otherwise null.
 */
export async function getCurrentUser(
  request: Request
): Promise<Omit<User, "password_hash"> | null> {
  const userId = await getUserId(request);
  if (!userId) {
    return null;
  }

  const user = await getUserById(userId);
  if (!user) {
    // User ID from session is invalid (e.g., user deleted).
    // Clear the session to prevent further attempts with this invalid ID.
    const session = await getSession(request.headers.get("Cookie"));
    session.unset("userId");
    session.unset("userToken");
    // Note: We don't have access to response headers here to commit the session destruction immediately.
    // The session will be cleared on the next response that commits the session.
    // For critical scenarios, the loader using getCurrentUser might need to handle this.
    console.warn(`User with ID "${userId}" from session not found. Session data will be cleared on next commit.`);
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Protects a route by requiring authentication.
 * Use this in loader functions to ensure the user is logged in.
 * @param request The incoming Request object.
 * @param redirectTo The path to redirect to if the user is not authenticated (default: "/auth/login").
 * @returns The user ID if authenticated.
 * @throws {Response} A redirect response if the user is not authenticated.
 */
export async function requireUserId(
  request: Request,
  redirectTo: string = "/auth/login"
): Promise<string> {
  const userId = await getUserId(request);
  if (!userId) {
    // You can add a query param to redirect back after login
    const params = new URLSearchParams();
    const currentPath = new URL(request.url).pathname;
    if (currentPath !== "/") {
      // Avoid redirecting to / for root
      params.set("redirectTo", currentPath);
    }
    const search = params.toString();
    throw redirect(`${redirectTo}${search ? `?${search}` : ""}`);
  }
  return userId;
}

/**
 * Higher-order function to protect a loader by requiring authentication.
 * Verifies JWT from cookie (if used) or session user ID.
 * @param request The incoming Request object.
 * @param loaderCallback The original loader function to call if authenticated.
 * @param redirectTo Optional URL to redirect to if not authenticated.
 * @returns The result of the loaderCallback or a redirect Response.
 */
export async function protectedLoader<T>(
  request: Request,
  loaderCallback: (args: { request: Request; user: JwtPayload | User }) => Promise<T>,
  redirectTo: string = "/auth/login"
): Promise<T | Response> {
  // Attempt 1: Use JWT from session cookie (if you store it there)
  const token = await getUserToken(request);
  if (token) {
    try {
      const jwtPayload = await verifyToken(token);
      // Optionally, re-fetch user from DB to ensure freshness, or trust JWT payload for short-lived tokens
      const user = await getUserById(jwtPayload.id);
      if (!user) throw new Error("User from token not found");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...safeUser } = user;
      return loaderCallback({ request, user: safeUser });
    } catch (error) {
      // Invalid token (expired, tampered, etc.) or user not found
      console.warn("Token verification failed or user not found, clearing session:", error);
      // Clear the potentially invalid session/token and redirect
      const session = await getSession(request.headers.get("Cookie"));
      session.unset("userId");
      session.unset("userToken");

      const params = new URLSearchParams();
      const currentPath = new URL(request.url).pathname;
      if (currentPath !== "/") {
        params.set("redirectTo", currentPath);
      }
      const search = params.toString();

      return redirect(`${redirectTo}${search ? `?${search}` : ""}`, {
        headers: {
          "Set-Cookie": await destroySession(session),
        },
      });
    }
  }

  // Attempt 2: Fallback to simpler session ID check (if you don't store full JWT in cookie)
  const userId = await getUserId(request);
  if (!userId) {
    const params = new URLSearchParams();
    const currentPath = new URL(request.url).pathname;
    if (currentPath !== "/") {
      params.set("redirectTo", currentPath);
    }
    const search = params.toString();
    return redirect(`${redirectTo}${search ? `?${search}` : ""}`);
  }

  const user = await getUserById(userId);
  if (!user) {
    // Clear session if user ID is invalid
    const session = await getSession(request.headers.get("Cookie"));
    session.unset("userId");
    session.unset("userToken");
    const params = new URLSearchParams();
    const currentPath = new URL(request.url).pathname;
    if (currentPath !== "/") {
      params.set("redirectTo", currentPath);
    }
    const search = params.toString();
    return redirect(`${redirectTo}${search ? `?${search}` : ""}`, {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...safeUser } = user;
  return loaderCallback({ request, user: safeUser });
}
