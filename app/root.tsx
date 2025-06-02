import { useStore } from '@nanostores/react';
import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node'; // Changed to node
import { Form, Links, Meta, Outlet, Scripts, ScrollRestoration, json, useLoaderData } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { getCurrentUser, type JWTPayload } from './lib/user.server'; // Adjust path as needed
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ClientOnly } from 'remix-utils/client-only';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('bolt_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

// Define User type based on JWTPayload for clarity
export type User = JWTPayload;

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getCurrentUser(request);
  return json({ user });
}

export function Layout({ children, user }: { children: React.ReactNode; user: User | null }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      {/* Basic Header for User Info and Logout */}
      <header className="p-4 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
        <div className="container mx-auto flex justify-between items-center">
          <div>{/* Potentially a logo or site title here */}</div>
          <div>
            {user ? (
              <div className="flex items-center gap-4">
                <span>Welcome, {user.email}</span>
                <Form method="post" action="/api/auth">
                  <input type="hidden" name="_action" value="logout" />
                  <button type="submit" className="text-blue-500 hover:underline">Logout</button>
                </Form>
              </div>
            ) : (
              <a href="/auth" className="text-blue-500 hover:underline">Login/Sign Up</a>
            )}
          </div>
        </div>
      </header>

      <ClientOnly>{() => <DndProvider backend={HTML5Backend}>{children}</DndProvider>}</ClientOnly>
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

import { logStore } from './lib/stores/logs';

export default function App() {
  const { user } = useLoaderData<typeof loader>();
  const theme = useStore(themeStore);

  useEffect(() => {
    logStore.logSystem('Application initialized', {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      authenticated: !!user,
    });
  }, [user]); // Added user to dependency array

  return (
    <Layout user={user}>
      <Outlet />
    </Layout>
  );
}
