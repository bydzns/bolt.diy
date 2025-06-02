import { json } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { z } from "zod";

import type { MetaFunction, ActionFunctionArgs } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Request Password Reset" }];
};

// STUB: Input schema for validation
const RequestResetSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});

// STUB: Action function for handling password reset request
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;

  const validationResult = RequestResetSchema.safeParse({ email });

  if (!validationResult.success) {
    return json(
      { errors: validationResult.error.flatten().fieldErrors, values: { email } },
      { status: 400 }
    );
  }

  // STUB: Implement actual password reset request logic here
  // 1. Check if user with this email exists.
  // 2. Generate a unique, time-limited password reset token.
  // 3. Store the token (hashed) associated with the user and its expiry.
  // 4. Send an email to the user with a link containing the token
  //    (e.g., /auth/reset-password?token=YOUR_TOKEN_HERE).

  console.log(`STUB: Password reset requested for email: ${validationResult.data.email}`);

  // For now, simulate success
  return json({
    success: true,
    message: "If an account with this email exists, a password reset link has been sent.",
  });
}

export default function RequestPasswordResetPage() {
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
      <h1>Request Password Reset</h1>
      <p>Enter your email address and we&apos;ll send you a link to reset your password.</p>

      {actionData?.success && <p style={{ color: "green" }}>{actionData.message}</p>}
      {actionData?.errors?._global && (
        <p style={{ color: "red" }}>{actionData.errors._global.join(", ")}</p>
      )}

      <Form method="post">
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
        <button type="submit" disabled={isSubmitting} style={{ padding: "10px 15px" }}>
          {isSubmitting ? "Sending..." : "Send Reset Link"}
        </button>
      </Form>
      <p>
        Remembered your password? <a href="/auth/login">Login</a>
      </p>
    </div>
  );
}
