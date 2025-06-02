import { type User, getUserById } from './db/user.server';
import { verifyToken } from './auth.server';
import { parse } from 'cookie';

export async function getAuthenticatedUser(request: Request): Promise<User | null> {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) {
    return null;
  }

  const cookies = parse(cookieHeader);
  const token = cookies.auth_token;

  if (!token) {
    return null;
  }

  const decodedPayload = verifyToken(token);
  if (!decodedPayload || !decodedPayload.userId) {
    // verifyToken logs the error, so we can just return null
    return null;
  }

  try {
    const user = await getUserById(decodedPayload.userId);
    return user; // This will be null if user not found, or the user object
  } catch (error) {
    console.error('Error fetching user by ID during authentication:', error);
    return null;
  }
}
