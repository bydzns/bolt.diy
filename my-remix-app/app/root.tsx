import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";

import type { LinksFunction } from "@remix-run/node";

import "./tailwind.css";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// V2 Error Boundary
// https://remix.run/docs/en/main/route/error-boundary-v2
import { isRouteErrorResponse, useRouteError } from "@remix-run/react";

export function ErrorBoundary() {
  const error = useRouteError();

  // when true, this is what used to go to `CatchBoundary`
  if (isRouteErrorResponse(error)) {
    return (
      <html lang="en">
        <head>
          <title>Oops! {error.status}</title>
          <Meta />
          <Links />
        </head>
        <body>
          <div>
            <h1>
              {error.status} {error.statusText}
            </h1>
            <p>{error.data?.message || error.data || "Something went wrong."}</p>
          </div>
          <Scripts />
        </body>
      </html>
    );
  }

  // Don't forget to typecheck with your own logic.
  // Any other errorBoundary value errors thrown by your route components.
  // This could be an Error instance or a string error.
  let errorMessage = "Unknown error";
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorMessage = error;
  }
  // You can also log the error to an error reporting service
  console.error("Root ErrorBoundary caught error:", error);


  return (
    <html lang="en">
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body>
        <div>
          <h1>Something went wrong!</h1>
          <p>{errorMessage}</p>
          <p>
            <a href="/">Go to homepage</a>
          </p>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
