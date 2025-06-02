import { useFetcher, useParams, useNavigate, useLoaderData } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import { atom, useStore } from '@nanostores/react';
import { type Message } from 'ai'; // Assuming Message type is compatible
import { toast } from 'react-toastify';
// import { workbenchStore } from '~/lib/stores/workbench'; // Snapshot related, comment out for now
import { logStore } from '~/lib/stores/logs';

// Removed IndexedDB specific imports:
// getMessages, getNextId, getUrlId, openDatabase, setMessages,
// duplicateChat, createChatFromMessages, getSnapshot, setSnapshot,
// type IChatMetadata (will handle metadata differently or defer)
// type FileMap, type Snapshot (snapshot related)
// webcontainer, detectProjectCommands, createCommandActionsString (snapshot/artifact related)
// type ContextAnnotation (snapshot related)


// The concept of a client-side ChatHistoryItem might change.
// The server will be the source of truth for conversation messages.
// Description and metadata might be handled at the project level or differently.
/*
export interface ChatHistoryItem {
  id: string; // This will be conversationId from server
  urlId?: string; // May become redundant if using conversationId directly
  description?: string; // Project might have a description, conversation itself might not
  messages: Message[];
  timestamp: string; // Provided by server (created_at, updated_at)
  metadata?: IChatMetadata; // Project-level metadata
}
*/

// Nanostores - their roles might change
export const currentConversationId = atom<string | undefined>(undefined); // Renamed from chatId for clarity
// export const description = atom<string | undefined>(undefined); // Conversation description might be removed/handled differently
// export const chatMetadata = atom<IChatMetadata | undefined>(undefined); // Likely project-level

interface UseChatHistoryProps {
  projectId?: string; // Current project ID, crucial for API calls
  // conversationId is now primarily taken from useLoaderData or route params
}

export function useChatHistory(props?: UseChatHistoryProps) {
  const { projectId: propProjectId } = props || {};
  const navigate = useNavigate();
  const params = useParams(); // To get projectId and conversationId from route if not passed
  
  // conversationId from loader (e.g., when navigating directly to a chat)
  const loaderData = useLoaderData() as { conversation?: { id: string, messages: Message[] }, project?: { id: string } };
  const loaderConversation = loaderData?.conversation;

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  
  // Determine current project and conversation IDs
  // Prop projectId takes precedence, then param, then loader project context
  const currentProjectId = propProjectId || params.projectId || loaderData?.project?.id;
  // Loader conversationId takes precedence, then param
  const activeConversationId = loaderConversation?.id || params.conversationId;

  const fetcher = useFetcher();


  // Effect for loading initial messages
  useEffect(() => {
    if (currentProjectId && activeConversationId) {
      // If loader already provided messages for the current active conversation, use them.
      if (loaderConversation && loaderConversation.id === activeConversationId) {
        setInitialMessages(loaderConversation.messages || []);
        currentConversationId.set(activeConversationId);
        setReady(true);
      } else {
        // Fetch conversation details if not available from loader or if IDs mismatch
        setReady(false);
        const targetUrl = `/api/projects/${currentProjectId}/conversations/${activeConversationId}`;
        fetcher.load(targetUrl);
      }
    } else {
      // No specific conversation to load (e.g., new chat screen for a project)
      setInitialMessages([]);
      currentConversationId.set(undefined);
      setReady(true);
    }
  }, [currentProjectId, activeConversationId, loaderConversation]); // React to changes in these IDs

  // Handle fetcher data for loading messages
  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle' && !fetcher.submission) {
      const { conversation, error } = fetcher.data as any; // Type assertion
      if (error) {
        toast.error(`Failed to load chat: ${error}`);
        logStore.logError('Failed to load chat messages via API', error);
        setReady(true); // Mark as ready even on error to not block UI
      } else if (conversation) {
        setInitialMessages(conversation.messages || []);
        currentConversationId.set(conversation.id);
        // Potentially set description or metadata if they come from conversation endpoint
        // description.set(conversation.description); 
        setReady(true);
      }
    }
  }, [fetcher.data, fetcher.state, fetcher.submission]);


  // --- Snapshot related functions commented out ---
  /*
  const takeSnapshot = useCallback(
    async (chatIdx: string, files: FileMap, _chatId?: string | undefined, chatSummary?: string) => {
      // ... existing snapshot logic using IndexedDB ...
      // This needs to be re-imagined. Project files could be part of project.code_content.
      // UI state snapshots are harder.
      console.warn("takeSnapshot: Snapshot functionality needs reimplementation with server backend.");
    },
    [], // Removed db dependency
  );

  const restoreSnapshot = useCallback(async (id: string, snapshot?: Snapshot) => {
    // ... existing snapshot logic ...
    console.warn("restoreSnapshot: Snapshot functionality needs reimplementation.");
  }, []);
  */

  const storeMessageHistory = useCallback(async (messages: Message[]) => {
    if (!currentProjectId) {
      toast.error('Project ID is missing, cannot save messages.');
      console.error('Project ID is missing in storeMessageHistory');
      return;
    }

    const conversationIdVal = currentConversationId.get();
    const messagesToSave = messages.filter((m) => !m.annotations?.includes('no-store'));

    if (messagesToSave.length === 0) return;

    const formData = new FormData();
    formData.append('messages', JSON.stringify(messagesToSave));

    if (conversationIdVal) {
      // Update existing conversation
      fetcher.submit(formData, {
        method: 'PATCH',
        action: `/api/projects/${currentProjectId}/conversations/${conversationIdVal}`,
      });
    } else {
      // Create new conversation
      // The `initialMessages` for creation should probably be the full list.
      formData.set('initialMessages', JSON.stringify(messagesToSave)); // Use 'initialMessages' as expected by API
      fetcher.submit(formData, {
        method: 'POST',
        action: `/api/projects/${currentProjectId}/conversations`,
      });
    }
    // TODO: Handle fetcher.data in an effect to update currentConversationId if new one created
    // and potentially navigate or update UI.
  }, [currentProjectId, fetcher]);
  
  // Effect to handle new conversation creation response
  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle' && fetcher.submission?.method === 'POST') {
        const { conversation, error } = fetcher.data as any;
        if (error) {
            toast.error(`Failed to create new chat: ${error}`);
        } else if (conversation && conversation.id) {
            currentConversationId.set(conversation.id);
            // Navigate to the new chat URL.
            // The project ID should be available from currentProjectId.
            if (currentProjectId) {
                 navigate(`/projects/${currentProjectId}/chat/${conversation.id}`, { replace: true });
            } else {
                // Fallback or error if projectId is not available for navigation
                console.warn("New conversation created, but projectId not available for navigation.");
                // Potentially navigate to a generic chat URL if applicable
                 navigate(`/chat/${conversation.id}`, { replace: true }); 
            }
            setInitialMessages(conversation.messages || []); // Update messages for the new chat
        }
    } else if (fetcher.data && fetcher.state === 'idle' && fetcher.submission?.method === 'PATCH') {
        const { conversation, error } = fetcher.data as any;
        if (error) {
            toast.error(`Failed to save messages: ${error}`);
        } else if (conversation) {
            // Messages successfully saved, potentially update local state if needed,
            // though `useChat` hook from `ai/react` might handle this optimistically.
            // For now, we assume the server response is the source of truth if we re-fetch or if `useChat` updates.
            setInitialMessages(conversation.messages || []); // Refresh messages from server response
        }
    }
  }, [fetcher.data, fetcher.state, fetcher.submission, navigate, currentProjectId]);


  // --- Auxiliary functions to be refactored or commented out ---
  const updateChatMestaData = async (/* metadata: IChatMetadata */) => {
    // This was updating IndexedDB based `ChatHistoryItem.metadata`.
    // Project metadata (gitUrl, etc.) should be updated via project API.
    // For now, this functionality is effectively removed for conversations.
    console.warn("updateChatMestaData: Needs reimplementation for project-level metadata if applicable.");
    toast.info("Updating chat-specific metadata is not currently supported via this function.");
  };

  const duplicateCurrentChat = async (/* listItemId: string */) => {
    // Needs a server endpoint. E.g., POST /api/projects/:projectId/conversations/:conversationId/duplicate
    console.warn("duplicateCurrentChat: Needs server-side implementation.");
    toast.error("Duplicating chat is not yet implemented with the new backend.");
  };

  const importChat = async (/* description: string, messages: Message[], metadata?: IChatMetadata */) => {
    // Needs a server endpoint. E.g., POST /api/projects/:projectId/conversations/import
    console.warn("importChat: Needs server-side implementation.");
    toast.error("Importing chat is not yet implemented with the new backend.");
  };

  const exportChat = async (/* id = currentConversationId.get() */) => {
    // This can largely remain client-side, using `initialMessages`.
    // Description might need to be fetched from project or handled differently.
    const convId = currentConversationId.get(); // Use the store value
    if (!convId || !currentProjectId) {
        toast.error("Cannot export: Project or Conversation ID is missing.");
        return;
    }
    // Fetch the latest messages for export to ensure consistency
    const response = await fetch(`/api/projects/${currentProjectId}/conversations/${convId}`);
    if (!response.ok) {
        toast.error("Failed to fetch latest chat data for export.");
        return;
    }
    const data = await response.json();
    if (data.error || !data.conversation) {
        toast.error(`Failed to fetch chat: ${data.error || 'Unknown error'}`);
        return;
    }

    const chatToExport = data.conversation;
    const exportData = {
      // description: description.get(), // Get current description from store, or fetch project description
      messages: chatToExport.messages,
      exportDate: new Date().toISOString(),
      originalConversationId: chatToExport.id,
      projectId: currentProjectId,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Potentially use project name and conversation title if available for filename
    a.download = `chat-export-${chatToExport.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Chat exported successfully.");
  };

  return {
    ready,
    initialMessages, // These are now server-sourced for the current conversation
    currentConversationId: useStore(currentConversationId), // Expose the store value
    // `description` and `chatMetadata` atoms are still exported but their updates are not handled here for conversations
    
    // Core message persistence
    storeMessageHistory, // Saves messages to current/new conversation on server

    // Auxiliary functions (mostly placeholders or need server implementation)
    updateChatMestaData,
    duplicateCurrentChat,
    importChat,
    exportChat,

    // Snapshot functions are removed for now
    // takeSnapshot: () => console.warn("Snapshots not implemented with server backend."),
    // restoreSnapshot: () => console.warn("Snapshots not implemented with server backend."),
  };
}

// This function might be removed or adapted if navigation changes based on project context
/*
function navigateChat(nextId: string) {
  // This function was navigating client-side with IndexedDB IDs.
  // Navigation should now use Remix's navigate with server-side IDs and project context.
  // Example: navigate(`/project/${projectId}/chat/${conversationId}`)
  // This specific implementation is commented out as direct history manipulation is tricky.
  // const url = new URL(window.location.href);
  // url.pathname = `/chat/${nextId}`; // This path structure might change
  // window.history.replaceState({}, '', url);
}
*/
