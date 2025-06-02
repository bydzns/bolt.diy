import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { createLogoutCookie } from '~/lib/.server/auth.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const cookie = createLogoutCookie();

  return json({ message: 'Logged out successfully' }, {
    headers: { 'Set-Cookie': cookie },
  });
}
