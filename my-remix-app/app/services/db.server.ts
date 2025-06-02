import { Pool } from "pg";

// Configure the PostgreSQL connection pool
// The pool will use environment variables PGDATABASE, PGHOST, PGPORT, PGUSER, PGPASSWORD
// if they are set, or the connection string DATABASE_URL.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: process.env.DB_POOL_MIN ? parseInt(process.env.DB_POOL_MIN, 10) : 2,
  max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false, // Basic SSL config
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
  // Consider whether to exit the process on fatal pool errors:
  // process.exit(-1);
});

/**
 * Executes a SQL query using a client from the connection pool.
 * @param text The SQL query string.
 * @param params Optional array of parameters for the query.
 * @returns A Promise resolving to the query result.
 * @throws Re-throws any error encountered during query execution.
 */
export async function query(text: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } catch (err) {
    console.error("Error executing query:", { text, params, error: err });
    throw err; // Re-throw the error to be handled by the calling function
  } finally {
    client.release();
  }
}

/**
 * Provides access to the connection pool directly, for use with transactions
 * or when more control over the client lifecycle is needed.
 * @returns The PostgreSQL connection pool.
 */
export function getPool() {
  return pool;
}

// Optional: Listen for Node.js process exit signals to gracefully close the pool
// This helps prevent issues during server shutdown.
const gracefulShutdown = async () => {
  console.log("Attempting to gracefully shutdown PostgreSQL pool...");
  try {
    await pool.end();
    console.log("PostgreSQL pool has been closed.");
    process.exit(0);
  } catch (e) {
    console.error("Error closing PostgreSQL pool:", e);
    process.exit(1);
  }
};

process.on("SIGINT", gracefulShutdown); // Catches Ctrl+C
process.on("SIGTERM", gracefulShutdown); // Catches kill signals
process.on("SIGQUIT", gracefulShutdown); // Catches quit signals from other processes
