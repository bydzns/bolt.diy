import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { z } from "zod";

import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Reset Password" }];
};

// STUB: Input schema for validation
const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, { message: "Reset token is required." }),
    newPassword: z.string().min(8, { message: "New password must be at least 8 characters long." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"], // Path to field that gets the error
  });

// STUB: Loader function to validate the token from URL
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return redirect("/auth/login?error=notoken"); // Or show an error page
  }

  // STUB: Validate the token here
  // 1. Find the token in your database (ensure it's not expired and not already used).
  // 2. If invalid, redirect or show an error.
  const isTokenValid = true; // Assume valid for stub
  console.log(`STUB: Validating password reset token: ${token}`);

  if (!isTokenValid) {
    return redirect("/auth/login?error=invalidtoken");
  }

  return json({ token });
}

// STUB: Action function for handling the actual password reset
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const token = formData.get("token") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const validationResult = ResetPasswordSchema.safeParse({ token, newPassword, confirmPassword });

  if (!validationResult.success) {
    return json(
      { errors: validationResult.error.flatten().fieldErrors, values: { token } },
      { status: 400 }
    );
  }

  // STUB: Implement actual password reset logic here
  // 1. Re-validate the token (check expiry, usage).
  // 2. If valid, hash the newPassword.
  // 3. Update the user's password_hash in the database.
  // 4. Invalidate or mark the reset token as used.
  // 5. Optionally, log the user in.

  console.log(
    `STUB: Resetting password with token: ${validationResult.data.token} and new password: ${validationResult.data.newPassword}`
  );

  // For now, simulate success
  return redirect("/auth/login?reset=success");
}

export default function ResetPasswordPage() {
  const { token } = useLoaderData<typeof loader>();
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
      <h1>Reset Your Password</h1>

      {actionData?.errors?._global && (
        <p style={{ color: "red" }}>{actionData.errors._global.join(", ")}</p>
      )}

      <Form method="post">
        <input type="hidden" name="token" defaultValue={token} />
        <div>
          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            name="newPassword"
            required
            aria-invalid={actionData?.errors?.newPassword ? true : undefined}
            aria-describedby="newPassword-error"
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          {actionData?.errors?.newPassword && (
            <p id="newPassword-error" style={{ color: "red" }}>
              {actionData.errors.newPassword.join(", ")}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            required
            aria-invalid={actionData?.errors?.confirmPassword ? true : undefined}
            aria-describedby="confirmPassword-error"
            style={{ width: "100%", padding: "8px", marginBottom: "20px" }}
          />
          {actionData?.errors?.confirmPassword && (
            <p id="confirmPassword-error" style={{ color: "red" }}>
              {actionData.errors.confirmPassword.join(", ")}
            </p>
          )}
        </div>
        <button type="submit" disabled={isSubmitting} style={{ padding: "10px 15px" }}>
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>
      </Form>
    </div>
  );
}
