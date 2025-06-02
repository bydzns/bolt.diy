// Server-side chat management using PostgreSQL

import type { Message as AiMessage } from 'ai'; // Assuming this is used for message structure from AI lib
import {
  getAllChats as dbGetAllChats,
  getChatDetails as dbGetChatDetails,
  saveChatMessages as dbSaveChatMessages,
  deleteChatById as dbDeleteChatById,
  duplicateChat as dbDuplicateChat,
  forkChat as dbForkChat,
  updateChatDescription as dbUpdateChatDescription,
  updateChatMetadata as dbUpdateChatMetadata,
  createChatFromMessages as dbCreateChatFromMessages,
  // Import relevant types from pg.data.server.ts
  type Chat as PgChat,
  type Message as PgMessage,
  type IChatMetadata,
} from './pg.data.server';

// Define a server-side Chat type. It might be slightly different from the client-side or IndexedDB version.
// For now, let's align it closely with PgChat from pg.data.server.ts
export type Chat = PgChat; // Includes id, user_id, description, created_at, updated_at, messages?, metadata?
export type Message = PgMessage; // Includes id, chat_id, role, content, created_at, embedding?

/**
 * Get all chats for a specific user.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of chats (without messages).
 */
export async function getAllChats(userId: string): Promise<Chat[]> {
  if (!userId) {
    throw new Error("User ID is required to get all chats.");
  }
  // This directly calls the pg.data.server.ts function which handles DB interaction
  return dbGetAllChats(userId);
}

/**
 * Get a specific chat by its ID, ensuring it belongs to the user.
 * Includes chat messages.
 * @param chatId The ID of the chat to get.
 * @param userId The ID of the user.
 * @returns A promise that resolves to the chat or null if not found or not owned by the user.
 */
export async function getChatById(chatId: string, userId: string): Promise<Chat | null> {
  if (!chatId || !userId) {
    throw new Error("Chat ID and User ID are required to get a chat.");
  }
  // This directly calls the pg.data.server.ts function
  return dbGetChatDetails(chatId, userId);
}

/**
 * Save a chat. This can be a new chat or updating an existing one.
 * The distinction between create/update is handled by dbSaveChatMessages based on presence of chatId.
 * @param userId The ID of the user.
 * @param messages Array of messages to save. The role and content are essential.
 * @param chatId Optional. If provided, attempts to save messages to this existing chat.
 * @param description Optional. Description for the chat.
 * @param metadata Optional. Metadata for the chat.
 * @returns The ID of the saved/created chat.
 */
export async function saveChat(
  userId: string,
  messages: Omit<Message, 'id' | 'chat_id' | 'created_at'>[], // Messages without DB-generated fields
  chatId?: string,
  description?: string,
  metadata?: IChatMetadata
): Promise<string> {
  if (!userId) throw new Error("User ID is required to save a chat.");
  if (!messages) throw new Error("Messages are required to save a chat.");

  // dbSaveChatMessages handles both creation of new chat (if chatId is undefined)
  // and adding messages to an existing chat (if chatId is provided).
  return dbSaveChatMessages(userId, messages, chatId, description, metadata);
}

/**
 * Create a new chat from a list of messages.
 * @param userId The ID of the user.
 * @param description Description for the new chat.
 * @param messages Initial messages for the new chat.
 * @param metadata Optional metadata for the chat.
 * @returns The ID of the newly created chat.
 */
export async function createChat(
  userId: string,
  description: string,
  messages: Omit<Message, 'id' | 'chat_id' | 'created_at'>[],
  metadata?: IChatMetadata
): Promise<string> {
    if (!userId) throw new Error("User ID is required.");
    if (description === undefined || description === null) throw new Error("Description is required for a new chat.");
    if (!messages || messages.length === 0) throw new Error("Initial messages are required for a new chat.");

    return dbCreateChatFromMessages(userId, description, messages, metadata);
}


/**
 * Delete a chat by ID, ensuring it belongs to the user.
 * @param chatId The ID of the chat to delete.
 * @param userId The ID of the user.
 * @returns A promise that resolves when the chat is deleted.
 */
export async function deleteChat(chatId: string, userId: string): Promise<void> {
  if (!chatId || !userId) {
    throw new Error("Chat ID and User ID are required to delete a chat.");
  }
  return dbDeleteChatById(chatId, userId);
}

/**
 * Deletes all chats for a specific user.
 * IMPORTANT: This is a destructive operation.
 * @param userId The ID of the user whose chats are to be deleted.
 * @returns A promise that resolves when all chats for the user are deleted.
 */
export async function deleteAllUserChats(userId: string): Promise<void> {
  if (!userId) {
    throw new Error("User ID is required to delete all chats for a user.");
  }
  // This would require a new function in pg.data.server.ts, e.g., dbDeleteAllUserChats(userId)
  // Now implemented as deleteAllChatDataForUser in pg.data.server.ts
  return dbDeleteAllChatDataForUser(userId);
}

// --- Re-implementing other functions from original db.ts, now using pg.data.server.ts ---

export async function forkChatForUser(originalChatId: string, messageIdToForkAt: string, userId: string): Promise<string> {
    if (!originalChatId || !messageIdToForkAt || !userId) {
        throw new Error("Original Chat ID, Message ID, and User ID are required.");
    }
    return dbForkChat(originalChatId, messageIdToForkAt, userId);
}

export async function duplicateChatForUser(originalChatId: string, userId: string): Promise<string> {
    if (!originalChatId || !userId) {
        throw new Error("Original Chat ID and User ID are required.");
    }
    return dbDuplicateChat(originalChatId, userId);
}

export async function updateChatDescriptionForUser(chatId: string, description: string, userId: string): Promise<void> {
    if (!chatId || !userId) {
        throw new Error("Chat ID and User ID are required.");
    }
    if (description === undefined || description === null) throw new Error("Description is required.");
    return dbUpdateChatDescription(chatId, description, userId);
}

export async function updateChatMetadataForUser(chatId: string, metadata: IChatMetadata | undefined, userId: string): Promise<void> {
    if (!chatId || !userId) {
        throw new Error("Chat ID and User ID are required.");
    }
    return dbUpdateChatMetadata(chatId, metadata, userId);
}

// Snapshot functions might also be exposed here if needed by higher-level logic,
// or they could be called directly from pg.data.server.ts where appropriate.
// For consistency, let's expose them if they were part of the old `db.ts` API that `chats.ts` might have indirectly used.

// Assuming pg.data.server.ts also exports getSnapshot, setSnapshot, deleteSnapshot
export { getSnapshot, setSnapshot, deleteSnapshot } from './pg.data.server.ts';
// Note: These snapshot functions from pg.data.server.ts already require userId.
// Example: getSnapshot(chatId: string, userId: string)

// The functions `getNextId` and `getUrlId` from the original `db.ts` are specific to
// client-side IndexedDB behavior and ID generation. They are not directly applicable
// to a PostgreSQL backend where IDs are typically auto-generated (SERIAL, UUID).
// URL generation strategy would also change (e.g., using chat IDs directly).
// So, these are not reimplemented here.
