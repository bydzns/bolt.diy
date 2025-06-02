import { json, redirect, type ActionFunctionArgs } from '@remix-run/cloudflare'; // Or your preferred runtime
import { getCurrentUser } from '~/lib/user.server';
import { 
  saveChat, 
  createChat,
} from '~/lib/persistence/pg.chats.server.ts'; 
import type { Message } from 'ai';
import type { IChatMetadata } from '~/lib/persistence/useChatHistory';

// This route could also have a loader if needed to prepare anything for a "new chat" page,
// but for now, it's primarily for actions.
// export async function loader({ request }: LoaderFunctionArgs) { ... }

export async function action({ request }: ActionFunctionArgs) {
  const user = await getCurrentUser(request);
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  try {
    switch (intent) {
      case 'storeMessages': { // For creating a new chat
        const messagesString = formData.get('messages') as string;
        const description = formData.get('description') as string | undefined;
        const metadataString = formData.get('metadata') as string | undefined;

        if (!messagesString) {
          return json({ error: 'Messages data is missing.' }, { status: 400 });
        }
        const messages: Message[] = JSON.parse(messagesString);
        const metadata = metadataString ? JSON.parse(metadataString) : undefined;

        // `saveChat` from `pg.chats.server.ts` handles new chat creation if chatId is undefined.
        const newChatId = await saveChat(user.id, messages, undefined /* no chatId */, description, metadata);
        
        return json({ successMessage: 'Chat created and messages saved.', newChatId: newChatId, redirectTo: `/chat/${newChatId}` });
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
      
      default:
        return json({ error: `Unknown intent for new chat: ${intent}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`Action failed for new chat intent "${intent}":`, error);
    return json({ error: error.message || 'Action failed due to an unexpected error.' }, { status: 500 });
  }
}

// If this route also had a UI (e.g. to redirect if someone lands here via GET)
// export default function NewChatRoute() {
//   useEffect(() => {
//      // Redirect to home or a new chat page if accessed via GET,
//      // as this route is primarily for actions.
//      // navigate('/'); // Or to a specific "start new chat" UI
//   }, [navigate]);
//   return null; 
// }
