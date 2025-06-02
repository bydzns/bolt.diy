import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getAuthenticatedUser } from '~/lib/.server/request-auth.server';
import {
  getConversationById,
  updateConversationMessages,
  updateConversationEmbedding,
  deleteConversation,
  type Message,
} from '~/lib/.server/db/conversation.server.ts';

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, conversationId } = params; // projectId is available if needed for extra checks
  if (!conversationId) {
    return json({ error: 'Conversation ID is required' }, { status: 400 });
  }
  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    // getConversationById checks ownership via joining with projects table using userId
    const conversation = await getConversationById(conversationId, user.id);
    if (!conversation) {
      return json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }
    // Optionally, verify conversation.project_id matches params.projectId if strict routing is desired
    if (conversation.project_id !== projectId) {
        return json({ error: 'Conversation does not belong to the specified project' }, { status: 400 });
    }
    return json({ conversation });
  } catch (error) {
    console.error(`Error fetching conversation ${conversationId}:`, error);
    return json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId, conversationId } = params;
  if (!conversationId) {
    return json({ error: 'Conversation ID is required' }, { status: 400 });
  }
  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  // Pre-check: Ensure the conversation belongs to the user and project before any action.
  // This is implicitly handled by getConversationById in most DB functions, but an explicit early check can be good.
  const initialConversation = await getConversationById(conversationId, user.id);
  if (!initialConversation || initialConversation.project_id !== projectId) {
      return json({ error: 'Conversation not found, access denied, or does not belong to project.' }, { status: 404 });
  }

  try {
    if (request.method === 'PATCH' || request.method === 'PUT') {
      const formData = await request.formData();
      const messagesString = formData.get('messages') as string | undefined;
      const embeddingString = formData.get('embedding') as string | undefined;

      if (messagesString) {
        let messages: Message[];
        try {
          messages = JSON.parse(messagesString);
          if (!Array.isArray(messages)) throw new Error('Messages must be an array.');
        } catch (e) {
          return json({ error: 'Invalid JSON format for messages' }, { status: 400 });
        }
        const updatedConv = await updateConversationMessages(conversationId, user.id, messages);
        if (!updatedConv) return json({ error: 'Failed to update conversation messages' }, { status: 500 });
        return json({ conversation: updatedConv });
      } else if (embeddingString) {
        let embedding: number[];
        try {
          embedding = JSON.parse(embeddingString);
          if (!Array.isArray(embedding) || !embedding.every(num => typeof num === 'number')) {
            throw new Error('Embedding must be an array of numbers.');
          }
        } catch (e) {
          return json({ error: 'Invalid JSON format for embedding' }, { status: 400 });
        }
        const updatedConv = await updateConversationEmbedding(conversationId, user.id, embedding);
        if (!updatedConv) return json({ error: 'Failed to update conversation embedding' }, { status: 500 });
        return json({ conversation: updatedConv });
      } else {
        return json({ error: 'No update data (messages or embedding) provided' }, { status: 400 });
      }
    } else if (request.method === 'DELETE') {
      // Ownership is already checked by getConversationById inside deleteConversation
      const result = await deleteConversation(conversationId, user.id);
      if (!result.success) {
        const status = result.message?.includes('not found') ? 404 : 500;
        return json({ error: result.message || 'Failed to delete conversation' }, { status });
      }
      return json({ message: 'Conversation deleted successfully' });
    } else {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }
  } catch (error) {
    console.error(`Error processing request for conversation ${conversationId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return json({ error: errorMessage }, { status: 500 });
  }
}
