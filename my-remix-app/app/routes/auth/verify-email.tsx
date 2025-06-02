import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";

import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Verify Email" }];
};

// STUB: Loader function to validate the email verification token
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    // No token provided, maybe show a message or redirect
    return json({ status: "error", message: "Verification token is missing." }, { status: 400 });
  }

  // STUB: Implement actual email verification logic here
  // 1. Find the token in your database (e.g., a table for email verification tokens).
  // 2. Ensure it's not expired and not already used.
  // 3. If valid, update the user's `email_verified_at` (or similar) field in the `users` table.
  // 4. Invalidate or mark the verification token as used.

  console.log(`STUB: Verifying email with token: ${token}`);
  const isTokenValid = true; // Assume valid for stub
  const userEmail = "user@example.com"; // Placeholder for the user's email

  if (isTokenValid) {
    // STUB: Mark user as verified in the database
    console.log(`STUB: User email ${userEmail} marked as verified.`);
    return json({
      status: "success",
      message: `Email ${userEmail} has been successfully verified.`,
    });
  } else {
    return json(
      { status: "error", message: "Invalid or expired verification token." },
      { status: 400 }
    );
  }
}

export default function VerifyEmailPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        lineHeight: "1.8",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <h1>Email Verification</h1>
      {data.status === "success" && (
        <>
          <p style={{ color: "green" }}>{data.message}</p>
          <p>
            You can now <Link to="/auth/login">login</Link> to your account.
          </p>
        </>
      )}
      {data.status === "error" && (
        <>
          <p style={{ color: "red" }}>{data.message}</p>
          <p>Please try again or contact support if the issue persists.</p>
          <p>
            <Link to="/auth/register">Register again</Link> or{" "}
            <Link to="/auth/login">go to Login</Link>
          </p>
        </>
      )}
    </div>
  );
}
