// App-wide constants

// Default Vector Dimensions if not set in .env
// Used for pgvector, e.g., vector(1536)
export const VECTOR_DIMENSIONS = 1536;

// Default Similarity Threshold for vector search if not set in .env
// This represents cosine similarity. A lower distance means higher similarity.
// The <=> operator in pgvector calculates distance.
// similarity = 1 - distance.
// So, if you want items with similarity > 0.8, you search for distance < 0.2.
export const SIMILARITY_THRESHOLD = 0.8;

// Default number of rounds for bcrypt hashing if not set in .env
export const BCRYPT_ROUNDS = 12;

// Default JWT expiration if not set in .env
export const JWT_EXPIRES_IN = '7d';

// Default session timeout in milliseconds if not set in .env (e.g., 1 hour)
export const SESSION_TIMEOUT = 3600000;

// Database Pool Defaults (if not set in .env)
export const DB_POOL_MIN = 2;
export const DB_POOL_MAX = 10;
export const DB_SSL = false; // Default to false for local dev, override in .env for prod
my-remix-app/app/utils/embeddings.server.ts
import { VECTOR_DIMENSIONS } from "~/../constants"; // Adjust path as needed

/**
 * Generates a dummy embedding vector with random numbers.
 * Useful for testing similarity search without a real AI model.
 * @param dimensions Optional number of dimensions for the embedding.
 *                   Defaults to VECTOR_DIMENSIONS from constants or .env.
 * @returns An array of random numbers representing the dummy embedding.
 */
export function generateDummyEmbedding(
  dimensions?: number
): number[] {
  const DIMS = dimensions || (process.env.VECTOR_DIMENSIONS 
    ? parseInt(process.env.VECTOR_DIMENSIONS, 10) 
    : VECTOR_DIMENSIONS);

  if (isNaN(DIMS) || DIMS <= 0) {
    throw new Error(`Invalid dimensions for dummy embedding: ${DIMS}. Must be a positive number.`);
  }

  const embedding: number[] = [];
  for (let i = 0; i < DIMS; i++) {
    embedding.push(Math.random()); // Generates a float between 0 (inclusive) and 1 (exclusive)
  }
  return embedding;
}

/**
 * Generates multiple dummy embeddings.
 * @param count Number of dummy embeddings to generate.
 * @param dimensions Optional number of dimensions for each embedding.
 * @returns An array of dummy embedding arrays.
 */
export function generateMultipleDummyEmbeddings(
  count: number,
  dimensions?: number
): number[][] {
  const embeddings: number[][] = [];
  for (let i = 0; i < count; i++) {
    embeddings.push(generateDummyEmbedding(dimensions));
  }
  return embeddings;
}
