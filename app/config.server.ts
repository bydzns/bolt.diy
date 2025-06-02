// app/config.server.ts
import { z } from 'zod';

// Define the schema for environment variables
const schema = z.object({
  // Database Configuration
  DATABASE_URL: z.string().url({ message: "DATABASE_URL must be a valid URL." }),
  DB_HOST: z.string().min(1, { message: "DB_HOST is required." }),
  DB_PORT: z.coerce.number().int().positive({ message: "DB_PORT must be a positive integer." }),
  DB_NAME: z.string().min(1, { message: "DB_NAME is required." }),
  DB_USER: z.string().min(1, { message: "DB_USER is required." }),
  DB_PASSWORD: z.string().min(1, { message: "DB_PASSWORD is required." }),

  // Authentication Configuration
  AUTH_SECRET: z.string().min(32, { message: "AUTH_SECRET must be at least 32 characters long." }),
  AUTH_PROVIDER: z.enum(['jwt'], { message: "AUTH_PROVIDER must be 'jwt'." }), // Currently only 'jwt' is supported
  JWT_EXPIRES_IN: z.string().min(1, { message: "JWT_EXPIRES_IN is required (e.g., '7d', '24h')." }),

  // Application Settings
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional: Include other critical existing server-side env vars if they need validation
  // Example: OPENAI_API_KEY: z.string().optional(), // If it's used server-side and critical
});

let config: z.infer<typeof schema>;

try {
  // Attempt to parse process.env
  // Make sure your .env file is loaded correctly in your development environment
  // Remix typically handles this, but double-check if issues arise.
  config = schema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Failed to parse environment variables:');
    error.errors.forEach(err => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    console.error('An unexpected error occurred while parsing environment variables:', error);
  }
  // For critical configurations, it's best to prevent the application from starting
  // with invalid or missing environment variables.
  throw new Error('Invalid or missing environment configuration. Please check your .env file and console logs.');
}

// Export the validated and typed configuration object
export default config;

// Log a message to confirm config is loaded (optional, for debugging)
// console.log('Server config loaded:', {
//   NODE_ENV: config.NODE_ENV,
//   PORT: config.PORT,
//   DB_NAME: config.DB_NAME, // Avoid logging sensitive info like passwords or full URLs
//   AUTH_PROVIDER: config.AUTH_PROVIDER,
// });
