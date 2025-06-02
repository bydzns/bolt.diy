// app/lib/.server/db/user.server.ts
import { Pool } from 'pg';
// import type { User } from '~/types/user'; // Assuming you'll define a User type

// Define a User type (or import if it will be defined elsewhere, e.g., app/types/user.ts)
// For now, let's define it here for simplicity for this subtask.
// In a later step, we can centralize type definitions.
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name?: string | null;
  avatar_url?: string | null;
  created_at: Date;
  updated_at: Date;
}

let pool: Pool;

function getPool() {
  if (!pool) {
    // Ensure DATABASE_URL is being read from process.env, 
    // as this server-side code will run in a Node.js environment locally 
    // or a similar environment in Cloudflare functions.
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set.');
    }
    pool = new Pool({
      connectionString,
      // Add other pool options from .env if needed, e.g., min/max connections
      min: process.env.DB_POOL_MIN ? parseInt(process.env.DB_POOL_MIN, 10) : 2,
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false, // Basic SSL config
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      // Optionally, you might want to terminate the process or reinitialize the pool
    });
  }
  return pool;
}

export async function createUser(
  email: string,
  passwordHash: string,
  name?: string,
  avatarUrl?: string,
): Promise<User | null> {
  const db = getPool();
  const query = `
    INSERT INTO users (email, password_hash, name, avatar_url)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, password_hash, name, avatar_url, created_at, updated_at;
  `;
  try {
    const res = await db.query(query, [email, passwordHash, name || null, avatarUrl || null]);
    return res.rows[0] as User;
  } catch (err) {
    console.error('Error creating user:', err);
    // Consider more specific error handling, e.g., for unique constraint violations
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getPool();
  const query = 'SELECT id, email, password_hash, name, avatar_url, created_at, updated_at FROM users WHERE email = $1;';
  try {
    const res = await db.query(query, [email]);
    return res.rows[0] || null;
  } catch (err) {
    console.error('Error getting user by email:', err);
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const db = getPool();
  const query = 'SELECT id, email, password_hash, name, avatar_url, created_at, updated_at FROM users WHERE id = $1;';
  try {
    const res = await db.query(query, [id]);
    return res.rows[0] || null;
  } catch (err) {
    console.error('Error getting user by id:', err);
    return null;
  }
}
