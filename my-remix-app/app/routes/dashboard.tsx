import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import type { ClientUser } from "~/types/user";
import { requireUserId, getCurrentUser } from "~/utils/auth/session.server";

import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Dashboard" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // Method 1: Simple user ID requirement, then fetch user data
  await requireUserId(request);
  const user = await getCurrentUser(request);

  // Method 2: Using protectedLoader (if you prefer that pattern)
  // const { user } = await protectedLoader(request, async ({ user }) => {
  //   // user here is already fetched and verified by protectedLoader
  //   return { user };
  // });

  if (!user) {
    // This case should ideally be handled by requireUserId or protectedLoader already
    // by throwing a redirect. If it reaches here, something is inconsistent.
    throw new Response("Unauthorized", { status: 401 });
  }

  return json({ user });
}

export default function DashboardPage() {
  const { user } = useLoaderData<{ user: ClientUser }>();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8", padding: "20px" }}>
      <h1>Welcome to your Dashboard, {user.name || user.email}!</h1>
      <p>This is a protected area.</p>
      <div>
        <h2>Your Details:</h2>
        <p>
          <strong>ID:</strong> {user.id}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        {user.name && (
          <p>
            <strong>Name:</strong> {user.name}
          </p>
        )}
        {user.avatar_url && (
          <div>
            <strong>Avatar:</strong>{" "}
            <img
              src={user.avatar_url}
              alt="User avatar"
              style={{ maxWidth: "100px", maxHeight: "100px", borderRadius: "50%" }}
            />
          </div>
        )}
      </div>
      <br />
      <p>
        <Link to="/auth/logout">Logout</Link>
      </p>
      <p>
        <Link to="/">Go to Homepage</Link>
      </p>
    </div>
  );
}
