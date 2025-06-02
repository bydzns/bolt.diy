import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { createUser, getUserByEmail } from '~/lib/.server/db/user.server';
import { hashPassword, generateToken, createAuthCookie } from '~/lib/.server/auth.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');
  const name = formData.get('name') as string | undefined; // Optional

  // Basic validation
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return json({ error: 'Email and password are required and must be strings' }, { status: 400 });
  }
  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
  }
  // Rudimentary email format check
  if (!email.includes('@')) {
      return json({ error: 'Invalid email format' }, { status: 400 });
  }

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    // Pass name as undefined if it's null or empty, otherwise pass the value
    const newUser = await createUser(email, hashedPassword, name || undefined);

    if (!newUser) {
      return json({ error: 'Failed to create user' }, { status: 500 });
    }

    const token = generateToken(newUser);
    const cookie = createAuthCookie(token);

    // Return a success response with user info (excluding password_hash)
    return json({ 
      id: newUser.id, 
      email: newUser.email, 
      name: newUser.name,
      created_at: newUser.created_at 
    }, {
      headers: { 'Set-Cookie': cookie },
    });
  } catch (error) {
    console.error('Registration error:', error);
    // Check if error is an instance of Error to safely access message property
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return json({ error: errorMessage }, { status: 500 });
  }
}
