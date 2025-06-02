import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { default as IndexRoute } from './_index'; // This will render the chat UI
import { getCurrentUser } from '~/lib/user.server';
import { 
  getChatById, 
  saveChat, 
  getSnapshot,
  forkChatForUser, // Import the forkChat function
  setSnapshot as setSnapshotPg, // aliasing to avoid conflict if any client-side snapshot name
  updateChatMetadataForUser,
  duplicateChatForUser,
  createChat, 
} from '~/lib/persistence/pg.chats.server.ts';
import type { ChatLoaderData, IChatMetadata } from '~/lib/persistence/useChatHistory';
import type { Message } from 'ai';
import type { Snapshot as SnapshotData } from '~/lib/persistence/types';


export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await getCurrentUser(request);
  if (!user) {
    return redirect('/auth');
  }

  const chatId = params.id;
  if (!chatId) {
    // This case should ideally not happen if the route is matched correctly
    return redirect('/'); // Or throw a 404
  }

  try {
    const chatDetails = await getChatById(chatId, user.id);
    if (!chatDetails) {
      // TODO: Differentiate between "not found" and "not authorized" if needed
      // For now, redirecting to home if chat isn't found for the user.
      // Consider throwing a 404 response: throw new Response("Chat not found", { status: 404 });
      console.warn(`Chat ${chatId} not found for user ${user.id}. Redirecting.`);
      return redirect('/');
    }

    const snapshot = await getSnapshot(chatId, user.id);

    const loaderData: ChatLoaderData = {
      chatId: chatDetails.id,
      description: chatDetails.description || undefined,
      messages: chatDetails.messages || [],
      // archivedMessages: [], // This needs to be determined by snapshot logic in useChatHistory or refined here
      urlId: chatDetails.id, // Assuming chat.id can serve as urlId for now
      metadata: chatDetails.metadata || undefined,
      snapshot: snapshot || undefined,
    };
    return json(loaderData);
  } catch (error) {
    console.error(`Error loading chat ${chatId} for user ${user.id}:`, error);
    // Handle specific errors or throw a generic error response
    // throw new Response("Error loading chat data", { status: 500 });
    return redirect('/'); // Fallback redirect
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await getCurrentUser(request);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent') as string;
  const currentChatId = params.id; // Chat ID from the route params

  try {
    switch (intent) {
      case 'takeSnapshot': {
        const chatIdFromForm = formData.get('chatId') as string;
        const snapshotDataString = formData.get('snapshotData') as string;
        if (!chatIdFromForm || !snapshotDataString) {
          return json({ error: 'Missing chatId or snapshot data' }, { status: 400 });
        }
        if (chatIdFromForm !== currentChatId) {
             return json({ error: 'Chat ID mismatch' }, { status: 400 });
        }
        const snapshotToSave: SnapshotData = JSON.parse(snapshotDataString);
        await setSnapshotPg(chatIdFromForm, snapshotToSave.snapshot_data, user.id); // Assuming snapshot_data is the correct field
        return json({ successMessage: 'Snapshot saved.' });
      }
      
      case 'updateMetadata': {
        const chatIdFromForm = formData.get('chatId') as string;
        const metadataString = formData.get('metadata') as string;
        if (!chatIdFromForm || !metadataString) {
          return json({ error: 'Missing chatId or metadata' }, { status: 400 });
        }
         if (chatIdFromForm !== currentChatId) {
             return json({ error: 'Chat ID mismatch' }, { status: 400 });
        }
        const metadata: IChatMetadata = JSON.parse(metadataString);
        await updateChatMetadataForUser(chatIdFromForm, metadata, user.id);
        return json({ successMessage: 'Metadata updated.' });
      }

      case 'storeMessages': {
        // This action handles updating messages for an EXISTING chat
        const chatIdForStorage = formData.get('chatId') as string | undefined;
        const messagesString = formData.get('messages') as string;
        const description = formData.get('description') as string | undefined;
        const metadataString = formData.get('metadata') as string | undefined;

        if (!messagesString) {
          return json({ error: 'Messages data is missing.' }, { status: 400 });
        }
        const messages: Message[] = JSON.parse(messagesString);
        const metadata = metadataString ? JSON.parse(metadataString) : undefined;

        if (!chatIdForStorage || chatIdForStorage !== currentChatId) {
             return json({ error: 'Chat ID mismatch or missing for storing messages to existing chat.' }, { status: 400 });
        }
        // For existing chats, description and metadata updates should ideally be separate intents
        // or handled carefully. Here, we primarily save messages.
        // If description/metadata are also sent, saveChat can update them.
        const savedChatId = await saveChat(user.id, messages, chatIdForStorage, description, metadata);
        
        return json({ successMessage: 'Messages saved.', updatedChatId: savedChatId });
      }

      case 'duplicateChat': {
        const chatIdToDuplicate = formData.get('chatId') as string;
        if (!chatIdToDuplicate) {
          return json({ error: 'Missing chatId to duplicate.' }, { status: 400 });
        }
        const newChatId = await duplicateChatForUser(chatIdToDuplicate, user.id);
        return json({ successMessage: 'Chat duplicated.', newChatId: newChatId, redirectTo: `/chat/${newChatId}` });
      }

      case 'importChat': {
        const description = formData.get('description') as string;
        const messagesString = formData.get('messages') as string;
        const metadataString = formData.get('metadata') as string | undefined;

        if (!description || !messagesString) {
          return json({ error: 'Missing description or messages for import.' }, { status: 400 });
        }
        const messages: Message[] = JSON.parse(messagesString);
        const metadata = metadataString ? JSON.parse(metadataString) : undefined;
        
        const newChatId = await createChat(user.id, description, messages, metadata);
        return json({ successMessage: 'Chat imported.', newChatId: newChatId, redirectTo: `/chat/${newChatId}` });
      }

      case 'forkChat': {
        const originalChatId = formData.get('originalChatId') as string;
        const messageIdToForkAt = formData.get('messageIdToForkAt') as string;

        if (!originalChatId || !messageIdToForkAt) {
          return json({ error: 'Missing originalChatId or messageIdToForkAt for fork.' }, { status: 400 });
        }
        if (originalChatId !== currentChatId) {
            return json({ error: 'Forking from a chat ID that does not match current route ID.' }, { status: 400 });
        }
        
        const newChatId = await forkChatForUser(originalChatId, messageIdToForkAt, user.id);
        return json({ successMessage: 'Chat forked.', newChatId: newChatId, redirectTo: `/chat/${newChatId}` });
      }

      default:
        return json({ error: `Unknown intent: ${intent}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`Action failed for intent "${intent}" on chat ${currentChatId}:`, error);
    return json({ error: error.message || 'Action failed due to an unexpected error.' }, { status: 500 });
  }
}

export default IndexRoute;
