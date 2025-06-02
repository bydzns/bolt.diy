import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { z } from "zod";

import { createUser, getUserByEmail } from "~/models/user.server";
import { hashPassword } from "~/utils/auth/bcrypt.server";
// import { generateToken } from "~/utils/auth/jwt.server"; // For potential auto-login after register - currently unused

import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Register" }];
};

// Input schema for validation
const RegisterSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
  name: z.string().min(1, { message: "Name cannot be empty." }).optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string | undefined;

  const validationResult = RegisterSchema.safeParse({ email, password, name });

  if (!validationResult.success) {
    return json(
      { errors: validationResult.error.flatten().fieldErrors, values: { email, name } },
      { status: 400 }
    );
  }

  try {
    const existingUser = await getUserByEmail(validationResult.data.email);
    if (existingUser) {
      return json(
        { errors: { email: ["User with this email already exists."] }, values: { email, name } },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(validationResult.data.password);
    const newUser = await createUser(
      validationResult.data.email,
      hashedPassword,
      validationResult.data.name
    );

    if (!newUser) {
      return json(
        {
          errors: { _global: ["Failed to create user. Please try again."] },
          values: { email, name },
        },
        { status: 500 }
      );
    }

    // Optional: Auto-login the user by creating a session/token
    // For simplicity, we'll redirect to login for now.
    // const token = generateToken({ id: newUser.id, email: newUser.email });
    // You would then typically set this token in an HttpOnly cookie.
    // return redirect("/dashboard", {
    //   headers: {
    //     "Set-Cookie": `your_token_name=${token}; HttpOnly; Path=/; Max-Age=...; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
    //   }
    // });

    return redirect("/auth/login?registered=true"); // Redirect to login with a success message
  } catch (error: unknown) {
    console.error("Registration error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return json(
      {
        errors: { _global: [message] },
        values: { email, name },
      },
      { status: 500 }
    );
  }
}

export default function RegisterPage() {
  const actionData = useActionData<typeof action>();
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
      <h1>Register</h1>
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
          <label htmlFor="name">Name (Optional)</label>
          <input
            id="name"
            type="text"
            name="name"
            defaultValue={actionData?.values?.name}
            aria-invalid={actionData?.errors?.name ? true : undefined}
            aria-describedby="name-error"
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          {actionData?.errors?.name && (
            <p id="name-error" style={{ color: "red" }}>
              {actionData.errors.name.join(", ")}
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
          {isSubmitting ? "Registering..." : "Register"}
        </button>
      </Form>
      <p>
        Already have an account? <a href="/auth/login">Login</a>
      </p>
    </div>
  );
}
