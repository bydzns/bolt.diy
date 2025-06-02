import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10; // Recommended salt rounds for bcrypt

/**
 * Hashes a plain text password using bcrypt.
 * @param password - The plain text password to hash.
 * @returns A promise that resolves to the hashed password string.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error('Password cannot be empty.');
  }
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password.');
  }
}

/**
 * Verifies a plain text password against a previously hashed password.
 * @param password - The plain text password to verify.
 * @param hash - The hashed password string to compare against.
 * @returns A promise that resolves to true if the password matches the hash, false otherwise.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    // Avoids bcrypt error for empty password/hash and provides clearer feedback
    return false; 
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error verifying password:', error);
    // In case of an unexpected error during comparison, treat as non-match for security.
    return false;
  }
}
