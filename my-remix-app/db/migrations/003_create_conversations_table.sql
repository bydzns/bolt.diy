-- AI Conversations with vector storage
-- IMPORTANT: This table requires the pgvector extension to be enabled in your PostgreSQL database.
-- You can typically enable it by running: CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  messages JSONB NOT NULL,
  embedding vector(1536), -- pgvector for similarity search
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for project_id in conversations table
CREATE INDEX idx_conversations_project_id ON conversations(project_id);

-- Index for vector embeddings in conversations table
-- Note: Using ivfflat with vector_cosine_ops. Ensure your pgvector version supports this.
-- You might need to adjust parameters like lists based on your dataset size.
CREATE INDEX idx_conversations_embedding ON conversations USING ivfflat (embedding vector_cosine_ops);
