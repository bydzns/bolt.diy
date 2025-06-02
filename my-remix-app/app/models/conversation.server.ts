import { query } from "~/services/db.server";
import {VECTOR_DIMENSIONS, SIMILARITY_THRESHOLD} from "~/../constants"; // Assuming constants file

// Define the Conversation type
export interface Conversation {
  id: string; // UUID
  project_id: string; // UUID
  messages: any[]; // JSONB in database, define more strictly if possible
  embedding?: number[] | null; // vector(1536) in database
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Creates a new conversation in the database.
 * @param projectId The ID of the project this conversation belongs to.
 * @param messages The array of messages in the conversation.
 * @param embedding The vector embedding for the conversation.
 * @returns The newly created conversation object.
 */
export async function createConversation(
  projectId: string,
  messages: any[],
  embedding: number[]
): Promise<Conversation> {
  // pgvector expects a string representation of the vector like '[1,2,3]'
  const embeddingString = `[${embedding.join(",")}]`;
  const sql = `
    INSERT INTO conversations (project_id, messages, embedding)
    VALUES ($1, $2, $3)
    RETURNING id, project_id, messages, embedding, created_at, updated_at;
  `;
  try {
    const result = await query(sql, [projectId, messages, embeddingString]);
    // The embedding will be returned as a string from the DB, e.g., "[0.1,0.2,0.3]"
    // We might want to parse it back into an array of numbers if needed for immediate use,
    // or handle this transformation where the conversation data is consumed.
    // For now, returning as is from the DB.
    return result.rows[0] as Conversation;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw new Error("Failed to create conversation.");
  }
}

/**
 * Retrieves all conversations for a given project.
 * @param projectId The ID of the project.
 * @returns An array of conversation objects.
 */
export async function getConversationsByProjectId(projectId: string): Promise<Conversation[]> {
  const sql = `
    SELECT id, project_id, messages, embedding, created_at, updated_at 
    FROM conversations 
    WHERE project_id = $1 
    ORDER BY created_at DESC;
  `;
  try {
    const result = await query(sql, [projectId]);
    return result.rows as Conversation[];
  } catch (error) {
    console.error(`Error getting conversations for project ${projectId}:`, error);
    throw new Error("Failed to retrieve conversations.");
  }
}

/**
 * Finds similar conversations based on a query embedding.
 * @param projectId The ID of the project to search within.
 * @param queryEmbedding The vector embedding to search against.
 * @param limit The maximum number of similar conversations to return.
 * @param similarityThreshold The threshold for similarity (cosine similarity).
 * @returns An array of similar conversation objects.
 */
export async function findSimilarConversations(
  projectId: string,
  queryEmbedding: number[],
  limit: number = 5,
  // similarityThreshold from .env might be a string, ensure it's parsed
  similarityThreshold: number = parseFloat(process.env.SIMILARITY_THRESHOLD || SIMILARITY_THRESHOLD.toString())
): Promise<Conversation[]> {
  const embeddingString = `[${queryEmbedding.join(",")}]`;
  // Cosine distance is 1 - cosine similarity.
  // So, to find items with similarity > threshold, we search for distance < (1 - threshold).
  const distanceThreshold = 1 - similarityThreshold;

  const sql = `
    SELECT id, project_id, messages, embedding, created_at, updated_at, 
           1 - (embedding <=> $1) AS similarity_score 
    FROM conversations
    WHERE project_id = $2 AND (embedding <=> $1) < $3
    ORDER BY similarity_score DESC
    LIMIT $4;
  `;
  // Note: (embedding <=> $1) is cosine distance.
  // We select 1 - cosine_distance to get cosine similarity for ordering.
  // We filter by distance < $3 (which is 1 - similarityThreshold).

  try {
    const result = await query(sql, [embeddingString, projectId, distanceThreshold, limit]);
    return result.rows as Conversation[];
  } catch (error) {
    console.error("Error finding similar conversations:", error);
    throw new Error("Failed to find similar conversations.");
  }
}
