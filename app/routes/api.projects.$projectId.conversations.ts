import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { getAuthenticatedUser } from '~/lib/.server/request-auth.server';
import {
  createConversation,
  getConversationsByProjectId,
  type Message,
} from '~/lib/.server/db/conversation.server.ts';
// We might need getProjectById to ensure the project exists and user owns it before creating a conversation under it,
// although createConversation in conversation.server.ts already performs an ownership check.
// For listing, getConversationsByProjectId also checks ownership.

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;
  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    // getConversationsByProjectId already checks if the user owns the project.
    const conversations = await getConversationsByProjectId(projectId, user.id);
    return json({ conversations });
  } catch (error) {
    console.error(`Error fetching conversations for project ${projectId}:`, error);
    return json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;
  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const messagesString = formData.get('initialMessages') as string;

    if (!messagesString) {
      return json({ error: 'initialMessages are required' }, { status: 400 });
    }

    let initialMessages: Message[];
    try {
      initialMessages = JSON.parse(messagesString);
      if (!Array.isArray(initialMessages)) { // Basic validation
        throw new Error('initialMessages must be an array.');
      }
    } catch (e) {
      return json({ error: 'Invalid JSON format for initialMessages' }, { status: 400 });
    }
    
    // createConversation in conversation.server.ts checks project ownership.
    const newConversation = await createConversation(user.id, projectId, initialMessages);

    if (!newConversation) {
      // This could be due to ownership failure or database error.
      // The server log in conversation.server.ts will have more details.
      return json({ error: 'Failed to create conversation. Ensure project exists and you have ownership.' }, { status: 500 });
    }

    return json({ conversation: newConversation }, { status: 201 });
  } catch (error) {
    console.error(`Error creating conversation for project ${projectId}:`, error);
    return json({ error: 'An unexpected error occurred while creating the conversation' }, { status: 500 });
  }
}
