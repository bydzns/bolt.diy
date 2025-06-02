import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS, 10) : 12;

if (isNaN(BCRYPT_ROUNDS) || BCRYPT_ROUNDS < 10) {
  console.warn(
    "BCRYPT_ROUNDS environment variable is invalid or too low. Using default value of 12."
  );
  // BCRYPT_ROUNDS = 12; // Already defaulted above, this line is redundant
}

/**
 * Hashes a password using bcrypt.
 * @param password The password to hash.
 * @returns A promise that resolves to the hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error("Password cannot be empty.");
  }
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Verifies a password against a hash.
 * @param password The password to verify.
 * @param hash The hash to verify against.
 * @returns A promise that resolves to true if the password is valid, false otherwise.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false; // Or throw an error, depending on desired handling
  }
  return bcrypt.compare(password, hash);
}
