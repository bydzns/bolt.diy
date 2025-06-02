// @ts-check
require("dotenv").config(); // Load .env file

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "bolt_diy",
  user: process.env.DB_USER || "your_username",
  password: process.env.DB_PASSWORD || "your_password",
  ssl: process.env.DB_SSL === "true", // Convert string 'true' to boolean true
};

module.exports = {
  // Database connection configuration
  dbClient: "pg", // Specify the client (PostgreSQL)
  connectionString: `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}${dbConfig.ssl ? "?ssl=true" : ""}`,

  // Directory where migration files are stored
  dir: "db/migrations",

  // Name of the table to keep track of applied migrations
  migrationsTable: "pgmigrations",

  // Whether to create the schema for the migrations table if it doesn't exist
  createSchema: true,

  // Whether to create the migrations table if it doesn't exist
  createMigrationsTable: true,

  // Default migration direction
  direction: "up",

  // Number of migrations to run (0 for all)
  count: 0,

  // Whether to output verbose logging
  verbose: true,

  // Enable/disable transactions for migrations
  // Set to false if you have operations that cannot run inside a transaction (e.g., CREATE DATABASE, CREATE EXTENSION for some extensions)
  // However, it's generally safer to keep transactions enabled.
  decamelize: true, // This will convert camelCase table and column names from migration files to snake_case in the DB
  noTsLint: true, // Disable TSLint for generated migration files (if using TypeScript for migrations)
};

// You might need to load `dotenv` differently if your .env file is not in the root
// or if you are using ESM modules. For ESM, you might use:
// import dotenv from 'dotenv';
// dotenv.config();
//
// And then export default { ... } instead of module.exports = { ... }
// Ensure your package.json has "type": "module" if using ESM.
