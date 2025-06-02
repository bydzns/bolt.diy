import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getUserByEmail } from '~/lib/.server/db/user.server';
import { verifyPassword, generateToken, createAuthCookie } from '~/lib/.server/auth.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');

  // Basic validation
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return json({ error: 'Email and password are required and must be strings' }, { status: 400 });
  }
  // Rudimentary email format check
  if (!email.includes('@')) {
    return json({ error: 'Invalid email format' }, { status: 400 });
  }

  try {
    const user = await getUserByEmail(email);

    if (!user) {
      return json({ error: 'Invalid credentials' }, { status: 401 }); // User not found
    }

    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return json({ error: 'Invalid credentials' }, { status: 401 }); // Password incorrect
    }

    const token = generateToken(user);
    const cookie = createAuthCookie(token);

    // Return a success response with user info (excluding password_hash)
    return json({ 
      id: user.id, 
      email: user.email, 
      name: user.name,
      created_at: user.created_at 
    }, {
      headers: { 'Set-Cookie': cookie },
    });
  } catch (error) {
    console.error('Login error:', error);
    // Check if error is an instance of Error to safely access message property
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return json({ error: errorMessage }, { status: 500 });
  }
}
