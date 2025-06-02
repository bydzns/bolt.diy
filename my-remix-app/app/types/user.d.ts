/**
 * Represents a user in the system.
 */
export interface User {
  id: string; // UUID
  email: string;
  password_hash: string; // Should not be sent to the client
  name?: string | null;
  avatar_url?: string | null;
  created_at: Date | string; // Can be Date object or ISO string from DB
  updated_at: Date | string; // Can be Date object or ISO string from DB
}

/**
 * Represents the user data that is safe to send to the client (e.g., in a session or JWT).
 * Excludes sensitive information like password_hash.
 */
export interface ClientUser {
  id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  // Add roles or other non-sensitive info if needed
}
