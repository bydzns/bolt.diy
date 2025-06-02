import type { ActionFunctionArgs } from "@remix-run/node"; // Or your specific runtime
import { json, redirect } from "@remix-run/node"; // Or your specific runtime

import { hashPassword, verifyPassword } from "~/lib/crypto.server";
import { generateToken } from "~/lib/auth.server";
import { authCookie } from "~/lib/cookies.server";
// import config from "~/config.server"; // For JWT_EXPIRES_IN if needed directly here

// Placeholder for database interactions
// Replace this with actual database calls when available
const usersDB: Map<string, { id: string; email: string; passwordHash: string }> = new Map();
let userIdCounter = 1;

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("_action") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/"; // Default redirect path

  // Basic input validation
  if (!actionType) {
    return json({ error: "Action type is missing." }, { status: 400 });
  }
  if (actionType !== "logout" && (!email || !password)) {
    return json({ error: "Email and password are required." }, { status: 400 });
  }
  if (email && typeof email !== 'string') {
    return json({ error: "Invalid email format." }, { status: 400 });
  }
  // Add more robust email validation if needed

  switch (actionType) {
    case "signup": {
      // 1. Check if user already exists (placeholder)
      if (Array.from(usersDB.values()).find(user => user.email === email)) {
        return json({ error: "User already exists with this email." }, { status: 409 });
      }

      // 2. Hash password
      const passwordHash = await hashPassword(password);

      // 3. Store new user (placeholder)
      const newUser = { id: `user-${userIdCounter++}`, email, passwordHash };
      usersDB.set(newUser.id, newUser);
      console.log("User signed up (in-memory):", { id: newUser.id, email: newUser.email });

      // 4. Optionally log the user in directly by generating a token and setting cookie
      // For this example, we'll require them to login after signup.
      return json({ success: true, message: "Signup successful. Please login." }, { status: 201 });
    }

    case "login": {
      // 1. Retrieve user by email (placeholder)
      const existingUser = Array.from(usersDB.values()).find(user => user.email === email);
      if (!existingUser) {
        return json({ error: "Invalid email or password." }, { status: 401 });
      }

      // 2. Verify password
      const passwordIsValid = await verifyPassword(password, existingUser.passwordHash);
      if (!passwordIsValid) {
        return json({ error: "Invalid email or password." }, { status: 401 });
      }

      // 3. Generate JWT
      const token = generateToken({ userId: existingUser.id, email: existingUser.email });

      // 4. Return JWT in an HttpOnly cookie and user data
      const headers = new Headers();
      headers.append("Set-Cookie", await authCookie.serialize(token));
      
      console.log("User logged in (in-memory):", { id: existingUser.id, email: existingUser.email });

      // Redirect to a protected page or dashboard, or return user data
      // For API-like behavior, returning user data might be preferred.
      // For web flow, redirecting is common.
      // return json({ success: true, user: { id: existingUser.id, email: existingUser.email } }, { headers });
      return redirect(redirectTo, { headers });
    }

    case "logout": {
      // 1. Clear the authentication cookie
      const headers = new Headers();
      headers.append("Set-Cookie", await authCookie.serialize("", { maxAge: 0 }));

      console.log("User logged out.");
      // Redirect to login page or home page
      // return json({ success: true, message: "Logged out successfully." }, { headers });
      return redirect(redirectTo || "/login", { headers });
    }

    default:
      return json({ error: "Invalid action type." }, { status: 400 });
  }
}

// Optional: Loader function to get current auth status (if needed for this route)
// export async function loader({ request }: LoaderFunctionArgs) {
//   const user = await getCurrentUser(request);
//   return json({ authenticated: !!user, user });
// }
