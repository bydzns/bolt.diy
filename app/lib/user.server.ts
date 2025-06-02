import type { Request } from "@remix-run/node"; // Or your specific runtime
import { authCookie } from "~/lib/cookies.server";
import { verifyToken, type JWTPayload } from "~/lib/auth.server";

/**
 * Retrieves the current user's payload from the authentication token in the request cookie.
 *
 * @param request - The incoming Request object.
 * @returns A Promise that resolves to the JWTPayload if the user is authenticated and the token is valid,
 *          otherwise resolves to null.
 */
export async function getCurrentUser(request: Request): Promise<JWTPayload | null> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return null; // No cookie header found
  }

  try {
    const token = await authCookie.parse(cookieHeader);
    if (!token || typeof token !== 'string') {
      // console.log("No token found in cookie or token is not a string:", token);
      return null; // No token string found after parsing
    }

    const payload = verifyToken(token);
    if (!payload) {
      // console.log("Token verification failed.");
      return null; // Token is invalid or expired
    }

    return payload;
  } catch (error) {
    // This might happen if the cookie parsing itself fails (e.g., malformed cookie, secret mismatch if not handled by parse)
    // However, authCookie.parse is expected to return null or the value, not throw for typical parsing issues.
    // Logging for safety, but verifyToken handles most JWT-specific errors.
    console.error("Error parsing or verifying auth token cookie:", error);
    return null;
  }
}

/**
 * Utility function to require a user for a loader or action.
 * Redirects to a login page if the user is not authenticated.
 *
 * @param request - The incoming Request object.
 * @param loginUrl - The URL to redirect to if the user is not authenticated (defaults to '/login').
 * @returns A Promise that resolves to the JWTPayload if the user is authenticated.
 * @throws A Response redirecting to the login page if the user is not authenticated.
 */
// import { redirect } from "@remix-run/node"; // Or your specific runtime
// export async function requireUser(request: Request, loginUrl: string = "/login"): Promise<JWTPayload> {
//   const user = await getCurrentUser(request);
//   if (!user) {
//     // You might want to store the intended destination to redirect back after login
//     // const url = new URL(request.url);
//     // const searchParams = new URLSearchParams([["redirectTo", url.pathname]]);
//     // throw redirect(`${loginUrl}?${searchParams}`);
//     throw redirect(loginUrl);
//   }
//   return user;
// }
