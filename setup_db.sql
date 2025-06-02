-- Create the database
CREATE DATABASE boltdiy;

-- Connect to the newly created database
-- Note: \c is a psql meta-command. If running this script through other tools,
-- you might need to connect to 'boltdiy' database manually after it's created.
\c boltdiy;

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create chats table
CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- Assuming OpenAI's text-embedding-ada-002 dimension, adjust if different
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create snapshots table
CREATE TABLE snapshots (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    snapshot_data JSONB, -- Using JSONB for better performance and flexibility
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Create indexes for foreign keys for better performance
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_snapshots_chat_id ON snapshots(chat_id);

-- Optional: Create a GIN index for JSONB data in snapshots if you query it frequently
-- CREATE INDEX idx_snapshots_snapshot_data ON snapshots USING GIN (snapshot_data);

-- Optional: Create an IVFFlat index for pgvector for faster similarity search
-- This needs to be tuned based on the number of rows you expect in 'messages'
-- For example, if you expect up to 1 million rows:
-- CREATE INDEX idx_messages_embedding ON messages USING ivfflat (embedding vector_l2_ops) WITH (lists = 1000);
-- If you have more data, 'lists' value might need to be sqrt(number_of_rows)
-- For HNSW index (often better for recall and speed, available in newer pgvector versions):
-- CREATE INDEX idx_messages_embedding ON messages USING hnsw (embedding vector_l2_ops);

-- Trigger function to update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to users table
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply the trigger to chats table
CREATE TRIGGER set_timestamp_chats
BEFORE UPDATE ON chats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Note: Messages and Snapshots are typically immutable once created,
-- so 'updated_at' might not be strictly necessary or could be handled differently.
-- If 'messages.content' can be edited, then a trigger on 'messages' would be useful.

COMMENT ON COLUMN messages.embedding IS 'Embedding vector for similarity search, e.g., from OpenAI ada-002';
COMMENT ON COLUMN snapshots.snapshot_data IS 'JSON or TEXT data representing the state of the chat or application at a point in time';

-- Grant privileges if necessary (adjust username and database name as needed)
-- GRANT ALL PRIVILEGES ON DATABASE boltdiy TO your_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;

\echo "Database 'boltdiy' and schema created successfully."
\echo "Make sure to run 'CREATE INDEX idx_messages_embedding ON messages USING ivfflat (embedding vector_l2_ops) WITH (lists = N);' or HNSW equivalent after inserting some data for vector search optimization."
