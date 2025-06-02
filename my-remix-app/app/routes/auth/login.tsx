import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { z } from "zod";

import { getUserByEmail } from "~/models/user.server";
import { verifyPassword } from "~/utils/auth/bcrypt.server";
import { generateToken } from "~/utils/auth/jwt.server";
import { getSession, commitSession } from "~/utils/auth/session.server"; // We'll create this next

import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Login" }];
};

// Schema for login input validation
const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password cannot be empty." }), // Min 1, actual length check by bcrypt
});

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (session.has("userId")) {
    // User is already logged in
    return redirect("/dashboard");
  }
  const url = new URL(request.url);
  const registered = url.searchParams.get("registered");
  return json({ registered: registered === "true" });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const validationResult = LoginSchema.safeParse({ email, password });

  if (!validationResult.success) {
    return json(
      { errors: validationResult.error.flatten().fieldErrors, values: { email } },
      { status: 400 }
    );
  }

  try {
    const user = await getUserByEmail(validationResult.data.email);
    if (!user) {
      return json(
        { errors: { email: ["No user found with this email."] }, values: { email } },
        { status: 400 }
      );
    }

    const isPasswordValid = await verifyPassword(
      validationResult.data.password,
      user.password_hash
    );
    if (!isPasswordValid) {
      return json(
        { errors: { password: ["Invalid password."] }, values: { email } },
        { status: 400 }
      );
    }

    const token = generateToken({ id: user.id, email: user.email });

    // Create a session and store the userId (or the whole token, though less common for server-side sessions)
    const session = await getSession(request.headers.get("Cookie"));
    session.set("userId", user.id); // Or session.set("token", token);
    session.set("userToken", token); // Storing the actual token for API requests if needed from client

    // Determine cookie maxAge from JWT_EXPIRES_IN (simplistic parsing)
    // For production, use a robust date/time library for this.
    let maxAgeSeconds;
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    if (expiresIn.endsWith("d")) {
      maxAgeSeconds = parseInt(expiresIn.slice(0, -1), 10) * 24 * 60 * 60;
    } else if (expiresIn.endsWith("h")) {
      maxAgeSeconds = parseInt(expiresIn.slice(0, -1), 10) * 60 * 60;
    } else if (expiresIn.endsWith("m")) {
      maxAgeSeconds = parseInt(expiresIn.slice(0, -1), 10) * 60;
    } else {
      maxAgeSeconds = 7 * 24 * 60 * 60; // Default to 7 days
    }

    return redirect("/dashboard", {
      headers: {
        "Set-Cookie": await commitSession(session, {
          maxAge: maxAgeSeconds, // Make cookie expire roughly with token
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          sameSite: "lax",
        }),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return json(
      { errors: { _global: ["An unexpected error occurred."] }, values: { email } },
      { status: 500 }
    );
  }
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const { registered } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        lineHeight: "1.8",
        maxWidth: "400px",
        margin: "auto",
      }}
    >
      <h1>Login</h1>
      {registered && <p style={{ color: "green" }}>Registration successful! Please log in.</p>}
      <Form method="post">
        {actionData?.errors?._global && (
          <p style={{ color: "red" }}>{actionData.errors._global.join(", ")}</p>
        )}
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            required
            defaultValue={actionData?.values?.email}
            aria-invalid={actionData?.errors?.email ? true : undefined}
            aria-describedby="email-error"
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          {actionData?.errors?.email && (
            <p id="email-error" style={{ color: "red" }}>
              {actionData.errors.email.join(", ")}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            required
            aria-invalid={actionData?.errors?.password ? true : undefined}
            aria-describedby="password-error"
            style={{ width: "100%", padding: "8px", marginBottom: "20px" }}
          />
          {actionData?.errors?.password && (
            <p id="password-error" style={{ color: "red" }}>
              {actionData.errors.password.join(", ")}
            </p>
          )}
        </div>
        <button type="submit" disabled={isSubmitting} style={{ padding: "10px 15px" }}>
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </Form>
      <p>
        Don&apos;t have an account? <a href="/auth/register">Register</a>
      </p>
    </div>
  );
}
