import { Pool } from 'pg';
import config from '~/config.server'; // Your server-side config

let pool: Pool;

function getPool(): Pool {
  if (!pool) {
    console.log(`Initializing PostgreSQL pool for database: ${config.DB_NAME} on ${config.DB_HOST}:${config.DB_PORT}`);
    pool = new Pool({
      user: config.DB_USER,
      host: config.DB_HOST,
      database: config.DB_NAME,
      password: config.DB_PASSWORD,
      port: config.DB_PORT,
      // ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined, // Example SSL config for production
      max: 20, // Max number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 10000, // How long to wait for a connection from the pool
    });

    pool.on('connect', (client) => {
      console.log(`Client connected to PostgreSQL database: ${client.database} as user: ${client.user}`);
      // You could set session parameters here if needed, e.g., client.query('SET search_path TO my_schema');
    });

    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
      // It's important to handle errors here, potentially by trying to reconnect
      // or by logging and alerting. For now, we log.
      // process.exit(-1); // Or some other restart mechanism if critical
    });

    // Test the connection
    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('Failed to connect to PostgreSQL pool:', err);
        // Potentially throw an error here or exit if the DB connection is critical at startup
      } else {
        console.log('PostgreSQL pool connected successfully at:', res.rows[0].now);
      }
    });
  }
  return pool;
}

/**
 * Executes a SQL query using the connection pool.
 * @param text The SQL query string (e.g., "SELECT * FROM users WHERE id = $1").
 * @param params Optional array of parameters to be substituted into the query.
 * @returns A Promise that resolves with the query result.
 * @throws An error if the query fails.
 */
export async function query<T = any>(text: string, params?: any[]) {
  const currentPool = getPool();
  const start = Date.now();
  try {
    const res = await currentPool.query<T>(text, params);
    const duration = Date.now() - start;
    // console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error: any) {
    console.error('Error executing query:', { text, params, error: error.message });
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Graceful shutdown (optional, but good practice)
// This might be more relevant in a standalone Node.js app than in some serverless environments.
// process.on('SIGINT', async () => {
//   console.log('SIGINT received, shutting down PostgreSQL pool');
//   if (pool) {
//     await pool.end();
//   }
//   process.exit(0);
// });

// process.on('SIGTERM', async () => {
//   console.log('SIGTERM received, shutting down PostgreSQL pool');
//   if (pool) {
//     await pool.end();
//   }
//   process.exit(0);
// });

// Ensure the pool is initialized when this module is loaded if you want to connect eagerly.
// Otherwise, it will connect lazily on the first query.
// getPool(); // Uncomment if you want to initialize the pool on module load.
// For Remix, lazy initialization on first query is often fine.

export default { query }; // Exporting as an object for potential future additions
