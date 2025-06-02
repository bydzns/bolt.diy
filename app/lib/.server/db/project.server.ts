import { Pool } from 'pg'; // Assuming Pool is exported from pg, or adjust if using a custom getPool
import { getUserByEmail } from './user.server'; // Placeholder, ideally getPool is separate

// TODO: Refactor getPool into a shared utility to avoid direct import from user.server.ts
// For now, let's define a local getPool or assume one is available globally/contextually.
// This is a simplified version. In a real app, getPool from user.server.ts should be made sharable.
let pool: Pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set for project.server.ts.');
    }
    pool = new Pool({
      connectionString,
      min: process.env.DB_POOL_MIN ? parseInt(process.env.DB_POOL_MIN, 10) : 2,
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client in project.server.ts pool', err);
    });
  }
  return pool;
}

export interface Project {
  id: string; // UUID
  user_id: string; // UUID, foreign key to users.id
  name: string;
  description?: string | null;
  code_content?: object | null; // JSONB
  preview_url?: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createProject(
  userId: string,
  name: string,
  description?: string,
  codeContent?: object,
  previewUrl?: string,
): Promise<Project | null> {
  const db = getPool();
  const query = `
    INSERT INTO projects (user_id, name, description, code_content, preview_url)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, name, description, code_content, preview_url, created_at, updated_at;
  `;
  try {
    const res = await db.query(query, [
      userId,
      name,
      description || null,
      codeContent || null,
      previewUrl || null,
    ]);
    return res.rows[0] as Project;
  } catch (err) {
    console.error('Error creating project:', err);
    return null;
  }
}

export async function getProjectById(projectId: string, userId: string): Promise<Project | null> {
  const db = getPool();
  const query = `
    SELECT id, user_id, name, description, code_content, preview_url, created_at, updated_at
    FROM projects
    WHERE id = $1 AND user_id = $2;
  `;
  try {
    const res = await db.query(query, [projectId, userId]);
    return res.rows[0] || null;
  } catch (err) {
    console.error('Error getting project by ID:', err);
    return null;
  }
}

export async function getProjectsByUserId(userId: string): Promise<Project[]> {
  const db = getPool();
  const query = `
    SELECT id, user_id, name, description, code_content, preview_url, created_at, updated_at
    FROM projects
    WHERE user_id = $1
    ORDER BY updated_at DESC;
  `;
  try {
    const res = await db.query(query, [userId]);
    return res.rows as Project[];
  } catch (err) {
    console.error('Error getting projects by user ID:', err);
    return [];
  }
}

export async function updateProject(
  projectId: string,
  userId: string,
  updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<Project | null> {
  const db = getPool();
  
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let valueCount = 1;

  // Dynamically build SET clauses
  if (updates.name !== undefined) {
    setClauses.push(`name = $${valueCount++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    setClauses.push(`description = $${valueCount++}`);
    values.push(updates.description);
  }
  if (updates.code_content !== undefined) {
    setClauses.push(`code_content = $${valueCount++}`);
    values.push(updates.code_content);
  }
  if (updates.preview_url !== undefined) {
    setClauses.push(`preview_url = $${valueCount++}`);
    values.push(updates.preview_url);
  }

  if (setClauses.length === 0) {
    // No fields to update, just fetch the current project
    return getProjectById(projectId, userId);
  }

  setClauses.push(`updated_at = NOW()`);

  values.push(projectId);
  values.push(userId);

  const query = `
    UPDATE projects
    SET ${setClauses.join(', ')}
    WHERE id = $${valueCount++} AND user_id = $${valueCount++}
    RETURNING id, user_id, name, description, code_content, preview_url, created_at, updated_at;
  `;

  try {
    const res = await db.query(query, values);
    return res.rows[0] || null; // Return null if rowCount is 0 (project not found or not owned)
  } catch (err) {
    console.error('Error updating project:', err);
    return null;
  }
}

export async function deleteProject(projectId: string, userId: string): Promise<{ success: boolean; message?: string }> {
  const db = getPool();
  const query = `
    DELETE FROM projects
    WHERE id = $1 AND user_id = $2;
  `;
  try {
    const res = await db.query(query, [projectId, userId]);
    if (res.rowCount > 0) {
      return { success: true };
    } else {
      return { success: false, message: 'Project not found or user does not have permission to delete.' };
    }
  } catch (err) {
    console.error('Error deleting project:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, message: `Error deleting project: ${errorMessage}` };
  }
}
