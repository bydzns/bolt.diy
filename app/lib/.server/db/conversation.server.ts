import { Pool } from 'pg';

// TODO: Refactor getPool into a shared utility.
let pool: Pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set for conversation.server.ts.');
    }
    pool = new Pool({
      connectionString,
      min: process.env.DB_POOL_MIN ? parseInt(process.env.DB_POOL_MIN, 10) : 2,
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client in conversation.server.ts pool', err);
    });
  }
  return pool;
}

// Basic Message interface, assuming it's similar to what 'ai' package uses.
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'function' | 'tool';
  content: string;
  name?: string;
  function_call?: string | { name: string; arguments: string; };
  tool_calls?: any[]; // Can be more specific based on actual usage
  tool_call_id?: string;
}

export interface Conversation {
  id: string; // UUID
  project_id: string; // UUID, foreign key to projects.id
  messages: Message[]; // JSONB
  embedding?: number[] | null; // vector(1536)
  created_at: Date;
  updated_at: Date;
}

// Helper function to check project ownership
async function checkProjectOwnership(projectId: string, userId: string): Promise<boolean> {
  const db = getPool();
  const projectQuery = 'SELECT user_id FROM projects WHERE id = $1;';
  try {
    const projectRes = await db.query(projectQuery, [projectId]);
    if (projectRes.rows.length === 0) {
      return false; // Project not found
    }
    return projectRes.rows[0].user_id === userId;
  } catch (error) {
    console.error('Error checking project ownership:', error);
    return false; // Treat errors as ownership check failure
  }
}

export async function createConversation(
  userId: string,
  projectId: string,
  initialMessages: Message[],
): Promise<Conversation | null> {
  const isOwner = await checkProjectOwnership(projectId, userId);
  if (!isOwner) {
    console.warn(`User ${userId} attempted to create conversation for project ${projectId} without ownership.`);
    return null;
  }

  const db = getPool();
  const query = `
    INSERT INTO conversations (project_id, messages)
    VALUES ($1, $2)
    RETURNING id, project_id, messages, embedding, created_at, updated_at;
  `;
  try {
    const res = await db.query(query, [projectId, JSON.stringify(initialMessages)]);
    return res.rows[0] as Conversation;
  } catch (err) {
    console.error('Error creating conversation:', err);
    return null;
  }
}

export async function getConversationById(
  conversationId: string,
  userId: string, // Used to verify project ownership
): Promise<Conversation | null> {
  const db = getPool();
  // This query ensures ownership by joining with the projects table.
  const query = `
    SELECT c.id, c.project_id, c.messages, c.embedding, c.created_at, c.updated_at
    FROM conversations c
    JOIN projects p ON c.project_id = p.id
    WHERE c.id = $1 AND p.user_id = $2;
  `;
  try {
    const res = await db.query(query, [conversationId, userId]);
    return res.rows[0] || null;
  } catch (err) {
    console.error('Error getting conversation by ID:', err);
    return null;
  }
}

export async function getConversationsByProjectId(
  projectId: string,
  userId: string,
): Promise<Conversation[]> {
  const isOwner = await checkProjectOwnership(projectId, userId);
  if (!isOwner) {
    console.warn(`User ${userId} attempted to get conversations for project ${projectId} without ownership.`);
    return [];
  }

  const db = getPool();
  const query = `
    SELECT id, project_id, messages, embedding, created_at, updated_at
    FROM conversations
    WHERE project_id = $1
    ORDER BY updated_at DESC;
  `;
  try {
    const res = await db.query(query, [projectId]);
    return res.rows as Conversation[];
  } catch (err) {
    console.error('Error getting conversations by project ID:', err);
    return [];
  }
}

export async function updateConversationMessages(
  conversationId: string,
  userId: string, // For ownership check
  messages: Message[],
): Promise<Conversation | null> {
  const conversation = await getConversationById(conversationId, userId);
  if (!conversation) {
    // getConversationById already checks ownership and logs
    return null; 
  }

  const db = getPool();
  const query = `
    UPDATE conversations
    SET messages = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, project_id, messages, embedding, created_at, updated_at;
  `;
  try {
    const res = await db.query(query, [JSON.stringify(messages), conversationId]);
    return res.rows[0] as Conversation;
  } catch (err) {
    console.error('Error updating conversation messages:', err);
    return null;
  }
}

export async function updateConversationEmbedding(
  conversationId: string,
  userId: string, // For ownership check
  embedding: number[],
): Promise<Conversation | null> {
  const conversation = await getConversationById(conversationId, userId);
  if (!conversation) {
    return null;
  }

  const db = getPool();
  // pgvector expects embedding as a string like '[1,2,3]'
  const embeddingString = `[${embedding.join(',')}]`;
  const query = `
    UPDATE conversations
    SET embedding = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, project_id, messages, embedding, created_at, updated_at;
  `;
  try {
    const res = await db.query(query, [embeddingString, conversationId]);
    return res.rows[0] as Conversation;
  } catch (err) {
    console.error('Error updating conversation embedding:', err);
    return null;
  }
}

export async function deleteConversation(
  conversationId: string,
  userId: string, // For ownership check
): Promise<{ success: boolean; message?: string }> {
  const conversation = await getConversationById(conversationId, userId);
  if (!conversation) {
     return { success: false, message: 'Conversation not found or user does not have permission.' };
  }

  const db = getPool();
  const query = `DELETE FROM conversations WHERE id = $1;`;
  try {
    const res = await db.query(query, [conversationId]);
    if (res.rowCount > 0) {
      return { success: true };
    } else {
      // This case should ideally be caught by getConversationById, but as a fallback:
      return { success: false, message: 'Conversation not found.' };
    }
  } catch (err) {
    console.error('Error deleting conversation:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, message: `Error deleting conversation: ${errorMessage}` };
  }
}
