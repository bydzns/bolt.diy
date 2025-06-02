import { query } from "~/services/db.server"; // Use the centralized query function
import type { User } from "~/types/user";

/**
 * Creates a new user in the database.
 * @param email User's email.
 * @param passwordHash Hashed password for the user.
 * @param name Optional name of the user.
 * @param avatarUrl Optional URL to the user's avatar.
 * @returns The newly created user object or null if creation failed.
 */
export async function createUser(
  email: string,
  passwordHash: string,
  name?: string,
  avatarUrl?: string
): Promise<User | null> {
  const sql = `
    INSERT INTO users (email, password_hash, name, avatar_url)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, name, avatar_url, created_at, updated_at;
  `;
  try {
    const result = await query(sql, [email, passwordHash, name, avatarUrl]);
    return result.rows[0] as User;
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    // Check for unique constraint violation (code 23505 for PostgreSQL)
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw new Error("User with this email already exists.");
    }
    // Fallback for other errors
    if (error instanceof Error) {
      // You might want to log the original error for server-side debugging
      // console.error('Original error details:', error);
      throw new Error(`Failed to create user due to a database error.`);
    }
    // If it's not an Error instance or doesn't have a code, throw a generic error
    throw new Error("An unknown error occurred while creating the user.");
  }
}

/**
 * Retrieves a user by their email address.
 * @param email The email address of the user.
 * @returns The user object if found, otherwise null.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const sql = `SELECT id, email, password_hash, name, avatar_url, created_at, updated_at FROM users WHERE email = $1;`;
  try {
    const result = await query(sql, [email]);
    return result.rows.length > 0 ? (result.rows[0] as User) : null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
}

/**
 * Retrieves a user by their ID.
 * @param id The UUID of the user.
 * @returns The user object if found, otherwise null.
 */
export async function getUserById(id: string): Promise<User | null> {
  const sql = `SELECT id, email, password_hash, name, avatar_url, created_at, updated_at FROM users WHERE id = $1;`;
  try {
    const result = await query(sql, [id]);
    return result.rows.length > 0 ? (result.rows[0] as User) : null;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return null;
  }
}

// --- Placeholder for User Roles and Permissions ---
// This is where you might add functions related to user roles and permissions.
// For example:

/**
 * (Stub) Assigns a role to a user.
 * @param userId The ID of the user.
 * @param role The role to assign.
 */
export async function assignRoleToUser(userId: string, role: string): Promise<void> {
  console.log(`STUB: Assigning role "${role}" to user "${userId}"`);
  // Example implementation:
  // const sql = `INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT DO NOTHING;`;
  // await query(sql, [userId, role]);
}

/**
 * (Stub) Checks if a user has a specific permission.
 * @param userId The ID of the user.
 * @param permission The permission to check.
 * @returns A promise that resolves to true if the user has the permission, false otherwise.
 */
export async function checkUserPermission(userId: string, permission: string): Promise<boolean> {
  console.log(`STUB: Checking permission "${permission}" for user "${userId}"`);
  // Example implementation:
  // const sql = `
  //   SELECT COUNT(*) > 0 AS has_permission
  //   FROM user_roles ur
  //   JOIN role_permissions rp ON ur.role = rp.role
  //   WHERE ur.user_id = $1 AND rp.permission = $2;
  // `;
  // const result = await query(sql, [userId, permission]);
  // return result.rows[0]?.has_permission || false;
  return false; // Default to false for stub
}

// It's also common to define a User type.
// You can place this in a central types file, e.g., `app/types/user.d.ts`
// For now, I'll assume it's imported or will be created.
// Example:
// export interface User {
//   id: string;
//   email: string;
//   password_hash: string; // Be careful not to send this to the client
//   name?: string | null;
//   avatar_url?: string | null;
//   created_at: Date;
//   updated_at: Date;
// }
