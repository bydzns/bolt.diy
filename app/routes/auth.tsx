import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import { useActionData } from "@remix-run/react";

import LoginForm, { type LoginActionData } from "~/components/auth/LoginForm";
import SignupForm, { type SignupActionData } from "~/components/auth/SignupForm";
import { getCurrentUser } from "~/lib/user.server";
// Assuming a shared interface for action data or using 'any' if structure varies widely
// For now, LoginActionData and SignupActionData are distinct but can be unioned if needed.
// type AuthActionData = LoginActionData | SignupActionData;

export const meta: MetaFunction = () => {
  return [{ title: "Authentication - BoltDIY" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getCurrentUser(request);
  if (user) {
    // User is already logged in, redirect to homepage or dashboard
    return redirect("/");
  }
  // No user, so proceed to render the auth page
  return json({}); // Return null or empty object, loader data not strictly needed if just redirecting
}

export default function AuthPage() {
  // This actionData would be relevant if this page itself had an action.
  // For errors from /api/auth, they are typically handled within the components
  // or if /api/auth redirects back here with error messages in the URL/session flashes.
  // const actionData = useActionData<AuthActionData>();

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold text-center mb-8">Welcome</h1>
      
      {/* We can use tabs or just separate sections for Login and Signup */}
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Login</h2>
          <LoginForm />
          {/* Example of displaying a general error if /api/auth redirected with one */}
          {/* {actionData?.error && actionData.context === 'login' && (
            <p className="text-red-500 text-sm mt-2">{actionData.error}</p>
          )} */}
        </div>

        <hr />

        <div>
          <h2 className="text-xl font-semibold mb-4">Sign Up</h2>
          <SignupForm />
           {/* Example of displaying a general error if /api/auth redirected with one */}
          {/* {actionData?.error && actionData.context === 'signup' && (
            <p className="text-red-500 text-sm mt-2">{actionData.error}</p>
          )}
          {actionData?.success && actionData.context === 'signup' && (
            <p className="text-green-500 text-sm mt-2">{actionData.message}</p>
          )} */}
        </div>
      </div>
    </div>
  );
}
