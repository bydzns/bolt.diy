import { redirect } from "@remix-run/node";
import { Form } from "@remix-run/react";

import { getSession, destroySession, getUserId } from "~/utils/auth/session.server";

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";

// Loader to redirect if user is not logged in or to show the logout button
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  if (!userId) {
    return redirect("/auth/login"); // Not logged in, nothing to log out from
  }
  return null; // User is logged in, allow rendering of the logout button
}

// Action to handle the logout process
export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  return redirect("/auth/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}

export default function LogoutPage() {
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        lineHeight: "1.8",
        maxWidth: "400px",
        margin: "auto",
      }}
    >
      <h1>Logout</h1>
      <p>Are you sure you want to log out?</p>
      <Form method="post">
        <button type="submit" style={{ padding: "10px 15px" }}>
          Logout
        </button>
      </Form>
      <p>
        <a href="/dashboard">Cancel and go to Dashboard</a>
      </p>
    </div>
  );
}
