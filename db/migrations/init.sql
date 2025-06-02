-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code_content JSONB,
  preview_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Conversations with vector storage
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  messages JSONB NOT NULL,
  embedding vector(1536), -- pgvector for similarity search
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_conversations_project_id ON conversations(project_id);
-- Note: The example 'idx_conversations_embedding' uses ivfflat. 
-- For simplicity in this initial setup, a GIN or HNSW index might be more common for pgvector if ivfflat requires extra setup (like training).
-- Let's use a GIN index for now if ivfflat is complex to set up without data, or proceed with ivfflat if it's straightforward.
-- For now, stick to the issue's specified index:
CREATE INDEX idx_conversations_embedding ON conversations USING ivfflat (embedding vector_cosine_ops);
