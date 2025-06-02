import { query } from '~/lib/db.server'; // Assuming this is the path to your db service
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('pg.data.server');
// Define basic types here, or import from a shared types file if available
// These should align with your database schema.

export interface User {
  id: string; // Or number, if using SERIAL
  email: string;
  // other user fields
}

export interface Message {
  id: string; // Or number
  chat_id: string; // Or number
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: Date;
  embedding?: number[]; // For pgvector, adjust type as needed (e.g., string for input)
}

export interface Chat {
  id: string; // Or number
  user_id: string; // Or number
  description: string | null;
  created_at?: Date;
  updated_at?: Date;
  messages?: Message[]; // Populated in getChatDetails
  metadata?: IChatMetadata | null; // Assuming IChatMetadata is defined elsewhere or basic here
}

export interface IChatMetadata {
  // Define structure based on actual metadata stored
  [key: string]: any; 
}

export interface Snapshot {
  id: string; // Or number
  chat_id: string; // Or number
  snapshot_data: any; // JSONB in PostgreSQL
  created_at?: Date;
}

/**
 * Fetches all chats for a given user.
 * Does not include messages by default for performance.
 * @param userId The ID of the user whose chats are to be fetched.
 * @returns A Promise resolving to an array of Chat objects.
 */
export async function getAllChats(userId: string): Promise<Chat[]> {
  try {
    // Ensure userId is not undefined or null to prevent querying for all users
    if (!userId) {
      throw new Error("User ID is required to fetch chats.");
    }
    const result = await query<Chat>(
      `SELECT id, user_id, description, created_at, updated_at 
       FROM chats 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    logger.error(`Error fetching all chats for user ${userId}:`, error);
    throw new Error(`Failed to fetch chats for user ${userId}.`);
  }
}

/**
 * Fetches a specific chat and its messages for a given user.
 * @param chatId The ID of the chat to be fetched.
 * @param userId The ID of the user who owns the chat.
 * @returns A Promise resolving to a Chat object with messages, or null if not found or not authorized.
 */
export async function getChatDetails(chatId: string, userId: string): Promise<Chat | null> {
  try {
    if (!userId || !chatId) {
      throw new Error("Chat ID and User ID are required.");
    }
    const chatResult = await query<Chat>(
      `SELECT id, user_id, description, created_at, updated_at 
       FROM chats 
       WHERE id = $1 AND user_id = $2`,
      [chatId, userId]
    );

    if (chatResult.rows.length === 0) {
      return null; // Chat not found or user not authorized
    }

    const chat = chatResult.rows[0];

    const messagesResult = await query<Message>(
      `SELECT id, chat_id, role, content, created_at 
       FROM messages 
       WHERE chat_id = $1 
       ORDER BY created_at ASC`,
      [chatId]
    );
    chat.messages = messagesResult.rows;
    
    // Placeholder for metadata if it's stored in a separate table or needs specific parsing
    // For now, let's assume it's a JSONB column in the chats table named 'metadata'
    // If your chats table has a metadata column:
    // const metadataResult = await query(`SELECT metadata FROM chats WHERE id = $1`, [chatId]);
    // if (metadataResult.rows.length > 0 && metadataResult.rows[0].metadata) {
    //   chat.metadata = metadataResult.rows[0].metadata;
    // }


    return chat;
  } catch (error) {
    logger.error(`Error fetching chat details for chat ${chatId} and user ${userId}:`, error);
    throw new Error(`Failed to fetch chat details for chat ${chatId}.`);
  }
}

/**
 * Saves chat messages. If chatId is new, creates a chat.
 * This is a simplified version. A more robust version would handle transactions.
 * @param chatId (Optional) The ID of the chat. If null/undefined, a new chat is created.
 * @param messages Array of Message objects to save.
 * @param userId The ID of the user.
 * @param description Optional description for the chat.
 * @param metadata Optional metadata for the chat.
 * @returns The ID of the chat (either existing or newly created).
 */
export async function saveChatMessages(
  userId: string,
  messages: Omit<Message, 'id' | 'chat_id' | 'created_at'>[],
  chatId?: string,
  description?: string,
  metadata?: IChatMetadata
): Promise<string> {
  try {
    if (!userId) throw new Error("User ID is required.");
    if (!messages || messages.length === 0) throw new Error("Messages are required.");

    let currentChatId = chatId;

    // Begin transaction
    await query('BEGIN');

    if (!currentChatId) {
      // Create a new chat
      const chatInsertResult = await query<{ id: string }>(
        `INSERT INTO chats (user_id, description ${metadata ? ', metadata' : ''}) 
         VALUES ($1, $2 ${metadata ? ', $3' : ''}) RETURNING id`,
        metadata ? [userId, description, metadata] : [userId, description]
      );
      if (chatInsertResult.rows.length === 0 || !chatInsertResult.rows[0].id) {
        throw new Error("Failed to create new chat.");
      }
      currentChatId = chatInsertResult.rows[0].id;
    } else {
      // Update existing chat's updated_at timestamp (and potentially description/metadata)
      // The trigger on the table should handle updated_at automatically if an UPDATE occurs.
      // If only messages are added, the chat itself might not be "updated" unless we explicitly do so.
      // For simplicity, we can issue an UPDATE to ensure the trigger fires.
      // Or, if description/metadata are provided, update them:
      if (description !== undefined || metadata !== undefined) {
         let setClauses = [];
         const values = [currentChatId, userId];
         if (description !== undefined) {
            setClauses.push(`description = $${values.length + 1}`);
            values.push(description);
         }
         if (metadata !== undefined) {
            setClauses.push(`metadata = $${values.length + 1}`);
            values.push(metadata);
         }
         // Ensure updated_at is modified
         setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

         if (setClauses.length > 0) {
            await query(
              `UPDATE chats SET ${setClauses.join(', ')} WHERE id = $1 AND user_id = $2`,
              values
            );
         }
      } else {
        // Touch updated_at if no other changes
        await query(`UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`, [currentChatId, userId]);
      }
    }

    // Insert messages
    // Note: pgvector embeddings are not handled here yet.
    // If 'embedding' is part of the Message input, it should be a string like '[0.1,0.2,...]' for pgvector
    for (const message of messages) {
      await query(
        `INSERT INTO messages (chat_id, role, content, embedding) 
         VALUES ($1, $2, $3, $4)`, // Assuming embedding is provided as a string '[...]' or null
        [currentChatId, message.role, message.content, message.embedding ? JSON.stringify(message.embedding) : null]
      );
    }
    
    // Commit transaction
    await query('COMMIT');

    if (!currentChatId) {
        // This should not happen if logic is correct
        throw new Error("Chat ID is still undefined after operations.");
    }
    return currentChatId;

  } catch (error) {
    // Rollback transaction on error
    await query('ROLLBACK');
    logger.error(`Error saving chat messages for user ${userId}:`, error);
    throw new Error(`Failed to save chat messages for user ${userId}.`);
  }
}

/**
 * Deletes a chat and its associated messages and snapshots for a user.
 * Relies on ON DELETE CASCADE constraints in the database schema.
 * @param chatId The ID of the chat to delete.
 * @param userId The ID of the user who owns the chat.
 * @returns A Promise that resolves when the operation is complete.
 */
export async function deleteChatById(chatId: string, userId: string): Promise<void> {
  try {
    if (!userId || !chatId) {
      throw new Error("Chat ID and User ID are required.");
    }
    // The schema should have ON DELETE CASCADE for messages and snapshots
    // linked to the chats table. So, deleting from 'chats' should cascade.
    const result = await query(
      `DELETE FROM chats WHERE id = $1 AND user_id = $2`,
      [chatId, userId]
    );

    if (result.rowCount === 0) {
      // This could mean the chat didn't exist or the user didn't own it.
      // Depending on requirements, you might throw an error or log a warning.
      // console.warn might be too noisy if not finding a chat to delete is common.
      // logger.warn(`Attempted to delete chat ${chatId} for user ${userId}, but chat was not found or not owned by user.`);
    }
  } catch (error) {
    logger.error(`Error deleting chat ${chatId} for user ${userId}:`, error);
    throw new Error(`Failed to delete chat ${chatId}.`);
  }
}

/**
 * Creates a new chat from a list of messages.
 * This is a convenience function that wraps saveChatMessages.
 */
export async function createChatFromMessages(
  userId: string,
  description: string,
  messages: Omit<Message, 'id' | 'chat_id' | 'created_at'>[],
  metadata?: IChatMetadata
): Promise<string> {
  if (!userId) throw new Error("User ID is required.");
  if (!description) throw new Error("Chat description is required."); // Or allow null if schema permits
  if (!messages || messages.length === 0) throw new Error("Initial messages are required.");

  // saveChatMessages handles creation if chatId is undefined
  return saveChatMessages(userId, messages, undefined, description, metadata);
}

// Placeholder for updateChatDescription for now
export async function updateChatDescription(chatId: string, description: string, userId: string): Promise<void> {
    if (!userId || !chatId) throw new Error("Chat ID and User ID are required.");
    try {
        const result = await query(
            `UPDATE chats SET description = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`,
            [description, chatId, userId]
        );
        if (result.rowCount === 0) {
            console.warn(`Attempted to update description for chat ${chatId}, user ${userId}, but chat was not found or not owned by user.`);
            // Optionally throw an error if the chat must exist
            // throw new Error(`Chat not found or user not authorized to update chat ${chatId}.`);
        }
    } catch (error) {
        logger.error(`Error updating chat description for chat ${chatId}, user ${userId}:`, error);
        throw new Error(`Failed to update chat description for chat ${chatId}.`);
    }
}

export async function updateChatMetadata(chatId: string, metadata: IChatMetadata | undefined, userId: string): Promise<void> {
    if (!userId || !chatId) throw new Error("Chat ID and User ID are required.");
    try {
        const result = await query(
            `UPDATE chats SET metadata = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`,
            [metadata, chatId, userId] // metadata can be null/undefined if schema allows
        );
        if (result.rowCount === 0) {
            console.warn(`Attempted to update metadata for chat ${chatId}, user ${userId}, but chat was not found or not owned by user.`);
            // throw new Error(`Chat not found or user not authorized to update chat ${chatId}.`);
        }
    } catch (error) {
        logger.error(`Error updating chat metadata for chat ${chatId}, user ${userId}:`, error);
        throw new Error(`Failed to update chat metadata for chat ${chatId}.`);
    }
}

export async function getSnapshot(chatId: string, userId: string): Promise<Snapshot | null> {
    if (!userId || !chatId) throw new Error("Chat ID and User ID are required.");
    try {
        // Ensure the user owns the chat before fetching the snapshot
        const chatCheck = await query(
            `SELECT id FROM chats WHERE id = $1 AND user_id = $2`,
            [chatId, userId]
        );
        if (chatCheck.rowCount === 0) {
            console.warn(`User ${userId} does not own chat ${chatId} or chat does not exist. Cannot get snapshot.`);
            return null; // Or throw an authorization error
        }

        const result = await query<Snapshot>(
            // Assuming one snapshot per chat for simplicity, or add ordering and LIMIT 1
            `SELECT id, chat_id, snapshot_data, created_at FROM snapshots WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [chatId]
        );
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        logger.error(`Error fetching snapshot for chat ${chatId}, user ${userId}:`, error);
        throw new Error(`Failed to fetch snapshot for chat ${chatId}.`);
    }
}

export async function setSnapshot(chatId: string, snapshotData: any, userId: string): Promise<void> {
    if (!userId || !chatId) throw new Error("Chat ID and User ID are required.");
    if (snapshotData === undefined) throw new Error("Snapshot data is required.");
    
    await query('BEGIN');
    try {
        // Ensure the user owns the chat
        const chatCheck = await query(
            `SELECT id FROM chats WHERE id = $1 AND user_id = $2`,
            [chatId, userId]
        );
        if (chatCheck.rowCount === 0) {
            throw new Error(`User ${userId} does not own chat ${chatId} or chat does not exist. Cannot set snapshot.`);
        }

        // Upsert snapshot: Update if exists (based on chat_id), else insert.
        // This simple example assumes one snapshot per chat, replacing the old one.
        // If multiple snapshots per chat are allowed, this logic would need to change (e.g., just INSERT).
        await query(
            `INSERT INTO snapshots (chat_id, snapshot_data)
             VALUES ($1, $2)
             ON CONFLICT (chat_id) DO UPDATE SET snapshot_data = EXCLUDED.snapshot_data, created_at = CURRENT_TIMESTAMP`,
            [chatId, snapshotData]
        );
        // Also update the chat's updated_at timestamp as a snapshot change can be considered an update to the chat.
        await query(
            `UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`,
            [chatId, userId]
        );
        await query('COMMIT');
    } catch (error) {
        await query('ROLLBACK');
        logger.error(`Error setting snapshot for chat ${chatId}, user ${userId}:`, error);
        throw new Error(`Failed to set snapshot for chat ${chatId}.`);
    }
}

export async function deleteSnapshot(chatId: string, userId: string): Promise<void> {
    if (!userId || !chatId) throw new Error("Chat ID and User ID are required.");
    await query('BEGIN');
    try {
        // Ensure the user owns the chat
        const chatCheck = await query(
            `SELECT id FROM chats WHERE id = $1 AND user_id = $2`,
            [chatId, userId]
        );
        if (chatCheck.rowCount === 0) {
            throw new Error(`User ${userId} does not own chat ${chatId} or chat does not exist. Cannot delete snapshot.`);
        }

        const result = await query(
            // Assuming deleting all snapshots for this chat_id if multiple were allowed
            `DELETE FROM snapshots WHERE chat_id = $1`,
            [chatId]
        );
        
        if (result.rowCount === 0) {
            // logger.warn(`No snapshot found to delete for chat ${chatId}, user ${userId}.`);
        }
        // Optionally update chat's updated_at timestamp
        await query(
            `UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`,
            [chatId, userId]
        );
        await query('COMMIT');
    } catch (error) {
        await query('ROLLBACK');
        logger.error(`Error deleting snapshot for chat ${chatId}, user ${userId}:`, error);
        throw new Error(`Failed to delete snapshot for chat ${chatId}.`);
    }
}


// `getNextId` and `getUrlId` are likely not needed with PostgreSQL's SERIAL/UUID and application logic.
// IDs are generated by the DB, and URLs can be derived from these IDs or other chat properties.

/**
 * Duplicates an entire chat for a user.
 * This includes the chat record, all its messages, and its latest snapshot (if any).
 * @param originalChatId The ID of the chat to duplicate.
 * @param userId The ID of the user performing the action.
 * @returns The ID of the newly created (duplicated) chat.
 */
export async function duplicateChat(originalChatId: string, userId: string): Promise<string> {
  if (!userId || !originalChatId) throw new Error("Original Chat ID and User ID are required.");

  await query('BEGIN');
  try {
    // 1. Fetch the original chat
    const originalChat = await getChatDetails(originalChatId, userId);
    if (!originalChat) {
      throw new Error("Original chat not found or user not authorized.");
    }

    // 2. Create the new chat record (without messages/snapshot yet)
    // New description could indicate it's a duplicate
    const newDescription = originalChat.description ? `Copy of ${originalChat.description}` : "Copied Chat";
    const chatInsertResult = await query<{ id: string }>(
      `INSERT INTO chats (user_id, description, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
      [userId, newDescription, originalChat.metadata] // Use original metadata
    );
    const newChatId = chatInsertResult.rows[0].id;
    if (!newChatId) throw new Error("Failed to create new chat entry for duplication.");

    // 3. Copy messages from the original chat to the new chat
    if (originalChat.messages && originalChat.messages.length > 0) {
      for (const message of originalChat.messages) {
        await query(
          `INSERT INTO messages (chat_id, role, content, embedding, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [newChatId, message.role, message.content, message.embedding ? JSON.stringify(message.embedding) : null, message.created_at || new Date()]
        );
      }
    }

    // 4. Copy the latest snapshot (if any)
    const originalSnapshot = await getSnapshot(originalChatId, userId);
    if (originalSnapshot) {
      await query(
        `INSERT INTO snapshots (chat_id, snapshot_data, created_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)`, // Use current time for new snapshot's creation
        [newChatId, originalSnapshot.snapshot_data]
      );
    }

    await query('COMMIT');
    return newChatId;
  } catch (error) {
    await query('ROLLBACK');
    logger.error(`Error duplicating chat ${originalChatId} for user ${userId}:`, error);
    throw new Error(`Failed to duplicate chat ${originalChatId}.`);
  }
}


/**
 * Forks a chat from a specific message onwards.
 * Creates a new chat for the user, containing messages from the original chat up to and including the specified message.
 * The new chat also gets a copy of the latest snapshot from the original chat, if any.
 * @param originalChatId The ID of the chat to fork.
 * @param messageIdToForkAt The ID of the message at which the fork should occur. Messages up to this one (inclusive) are copied.
 * @param userId The ID of the user performing the action.
 * @returns The ID of the newly created (forked) chat.
 */
export async function forkChat(originalChatId: string, messageIdToForkAt: string, userId: string): Promise<string> {
  if (!userId || !originalChatId || !messageIdToForkAt) {
    throw new Error("Original Chat ID, Message ID to fork at, and User ID are required.");
  }

  await query('BEGIN');
  try {
    // 1. Fetch the original chat details (including all messages)
    const originalChat = await getChatDetails(originalChatId, userId);
    if (!originalChat) {
      throw new Error("Original chat not found or user not authorized.");
    }
    if (!originalChat.messages || originalChat.messages.length === 0) {
      throw new Error("Original chat has no messages to fork.");
    }

    // 2. Find the index of the message to fork at
    const forkMessageIndex = originalChat.messages.findIndex(msg => msg.id === messageIdToForkAt);
    if (forkMessageIndex === -1) {
      throw new Error("Message ID to fork at not found in the original chat.");
    }

    // 3. Create the new chat record
    const newDescription = originalChat.description ? `Fork of ${originalChat.description} (up to message ${messageIdToForkAt})` : `Forked Chat (up to message ${messageIdToForkAt})`;
    const chatInsertResult = await query<{ id: string }>(
      `INSERT INTO chats (user_id, description, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
      [userId, newDescription, originalChat.metadata]
    );
    const newChatId = chatInsertResult.rows[0].id;
    if (!newChatId) throw new Error("Failed to create new chat entry for forking.");

    // 4. Copy messages up to and including the forkMessageIndex
    for (let i = 0; i <= forkMessageIndex; i++) {
      const message = originalChat.messages[i];
      await query(
        `INSERT INTO messages (chat_id, role, content, embedding, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [newChatId, message.role, message.content, message.embedding ? JSON.stringify(message.embedding) : null, message.created_at || new Date()]
      );
    }

    // 5. Copy the latest snapshot from the original chat (if any)
    // This snapshot might not perfectly match the state at forkMessageIndex, but it's a common approach.
    // Alternatively, a new snapshot could be generated based on the forked messages if logic for that exists.
    const originalSnapshot = await getSnapshot(originalChatId, userId);
    if (originalSnapshot) {
      await query(
        `INSERT INTO snapshots (chat_id, snapshot_data, created_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [newChatId, originalSnapshot.snapshot_data]
      );
    }

    await query('COMMIT');
    return newChatId;
  } catch (error) {
    await query('ROLLBACK');
    logger.error(`Error forking chat ${originalChatId} for user ${userId}:`, error);
    throw new Error(`Failed to fork chat ${originalChatId}.`);
  }
}

/**
 * Deletes all chats, associated messages, and snapshots for a specific user.
 * This is a highly destructive operation.
 * Assumes ON DELETE CASCADE is set up for foreign keys from messages and snapshots to chats.
 * @param userId The ID of the user whose chat-related data will be deleted.
 * @returns A Promise that resolves when the operation is complete.
 */
export async function deleteAllChatDataForUser(userId: string): Promise<void> {
  if (!userId) throw new Error("User ID is required to delete all user chat data.");

  await query('BEGIN');
  try {
    // First, retrieve all chat IDs for the user to ensure targeted deletion from related tables
    // if ON DELETE CASCADE is not fully relied upon or for logging purposes.
    // However, with ON DELETE CASCADE on `messages.chat_id` and `snapshots.chat_id` referencing `chats.id`,
    // deleting from `chats` table should suffice.

    const userChatsResult = await query<{ id: string }>(`SELECT id FROM chats WHERE user_id = $1`, [userId]);
    const chatIds = userChatsResult.rows.map(row => row.id);

    if (chatIds.length > 0) {
      // If ON DELETE CASCADE is working as expected on messages and snapshots,
      // just deleting the chats is enough.
      // For explicit deletion (if cascade is not trusted or for clarity):
      // await query(`DELETE FROM snapshots WHERE chat_id = ANY($1::uuid[])`, [chatIds]); // Adjust uuid[] if ID type is different
      // await query(`DELETE FROM messages WHERE chat_id = ANY($1::uuid[])`, [chatIds]); // Adjust uuid[] if ID type is different
    }

    // Delete the user's chats
    // This will trigger cascades for messages and snapshots if FKs are set up correctly.
    const deleteChatsResult = await query(
      `DELETE FROM chats WHERE user_id = $1`,
      [userId]
    );

    console.log(`Deleted ${deleteChatsResult.rowCount} chats and their associated data (messages, snapshots via cascade) for user ${userId}.`);

    await query('COMMIT');
  } catch (error) {
    await query('ROLLBACK');
    logger.error(`Error deleting all chat data for user ${userId}:`, error);
    throw new Error(`Failed to delete all chat data for user ${userId}.`);
  }
}
