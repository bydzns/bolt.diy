import { useLoaderData, useNavigate, useSearchParams, useFetcher, Form } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import { atom, useStore as useNanostore } from 'nanostores'; // Import useStore for nanostores
import { generateId, type JSONValue, type Message } from 'ai';
import { toast } from 'react-toastify';

import { workbenchStore } from '~/lib/stores/workbench';
import { logStore } from '~/lib/stores/logs';
import type { FileMap } from '~/lib/stores/files';
import type { Snapshot as SnapshotData } from './types'; // Renamed to avoid conflict with React.Snapshot
import { webcontainer } from '~/lib/webcontainer';
import { detectProjectCommands, createCommandActionsString } from '~/utils/projectCommands';
import type { ContextAnnotation } from '~/types/context';

// Assuming IChatMetadata is defined in a shared types file or within the loader's data type
// For now, let's define a placeholder if not available from loader data.
export interface IChatMetadata {
  [key: string]: any;
}

// This type should match the data structure returned by the loader in app/routes/chat.$id.tsx
export interface ChatLoaderData {
  chatId: string;
  description?: string;
  messages: Message[];
  archivedMessages?: Message[]; // If server sends pre-archived messages based on snapshot
  urlId?: string; // Or derive this client-side if needed
  metadata?: IChatMetadata;
  snapshot?: SnapshotData; // The current snapshot for this chat
  // Add user information if needed by the hook directly, though typically actions are user-scoped on server
}


// Nanostores for UI state that might be shared or persisted locally (not chat data itself)
export const currentChatIdStore = atom<string | undefined>(undefined);
export const currentDescriptionStore = atom<string | undefined>(undefined);
export const currentChatMetadataStore = atom<IChatMetadata | undefined>(undefined);

// The action route for chat operations
// Will be dynamic based on the current chat ID from loaderData
// const CHAT_ACTION_ROUTE = "/api/chat-actions"; 

export function useChatHistory() {
  const navigate = useNavigate();
  // Loader data will provide initial chat state (messages, description, metadata, snapshot)
  const loaderData = useLoaderData<ChatLoaderData>();
  const [searchParams] = useSearchParams();

  const fetcher = useFetcher();

  // Local React state, initialized from loader data
  const [messages, setMessages] = useState<Message[]>(loaderData?.messages || []);
  // Archived messages might be determined by snapshot logic on client or pre-calculated by server
  const [archivedMessages, setArchivedMessages] = useState<Message[]>(loaderData?.archivedMessages || []);
  const [isReady, setIsReady] = useState<boolean>(false); // Indicates if initial data processing is done

  // Update nanostores and local state when loaderData changes (e.g., navigating between chats)
  useEffect(() => {
    if (loaderData) {
      currentChatIdStore.set(loaderData.chatId);
      currentDescriptionStore.set(loaderData.description);
      currentChatMetadataStore.set(loaderData.metadata);
      setMessages(loaderData.messages || []);
      setArchivedMessages(loaderData.archivedMessages || []); // Adjust based on snapshot logic

      // Complex snapshot application logic from original useEffect
      // This needs to be carefully adapted. The server loader should provide messages
      // already processed based on snapshot and rewindTo if possible.
      // If client-side processing is still needed:
      const currentSnapshot = loaderData.snapshot;
      const rewindId = searchParams.get('rewindTo');
      
      let effectiveMessages = loaderData.messages || [];
      let effectiveArchivedMessages: Message[] = loaderData.archivedMessages || [];

      if (currentSnapshot && currentSnapshot.chatIndex) {
        const snapshotIndexInLoadedMessages = effectiveMessages.findIndex(m => m.id === currentSnapshot.chatIndex);

        if (snapshotIndexInLoadedMessages !== -1) {
          // This logic implies the server sends all messages, and client trims/archives
          // Alternatively, server sends trimmed messages and archived messages separately
          
          // Example: if server sends all messages and client needs to apply snapshot view
          let startingIdx = -1;
          const endingIdx = rewindId
            ? effectiveMessages.findIndex((m) => m.id === rewindId) + 1
            : effectiveMessages.length;

          if (snapshotIndexInLoadedMessages < endingIdx) {
            startingIdx = snapshotIndexInLoadedMessages;
          }
          if (snapshotIndexInLoadedMessages > 0 && effectiveMessages[snapshotIndexInLoadedMessages].id === rewindId) {
             startingIdx = -1; // Don't archive if rewinding to the snapshot point itself
          }

          if (startingIdx >= 0) {
            effectiveArchivedMessages = effectiveMessages.slice(0, startingIdx + 1);
            effectiveMessages = effectiveMessages.slice(startingIdx + 1, endingIdx);
            
            // If snapshot restoration implies specific UI elements (like the "Bolt Restored" message)
            // that logic would need to be here, using `currentSnapshot.files`, etc.
            // This part is highly dependent on how `restoreSnapshot` was meant to affect the message list.
            // For now, focusing on data flow. The actual message transformation for UI can be complex.
            // restoreSnapshotUI(currentSnapshot); // Placeholder for UI part of snapshot restoration
          }
        }
      }
      setMessages(effectiveMessages);
      setArchivedMessages(effectiveArchivedMessages);
      setIsReady(true);
    } else {
      // No loader data, maybe a new chat or error state
      setIsReady(true); // Or handle as an error/redirect
    }
  }, [loaderData, searchParams]);


  // Example of how restoreSnapshot's UI interaction part might look (very simplified)
  // const restoreSnapshotUI = useCallback(async (snapshotToRestore: SnapshotData) => {
  //   if (!snapshotToRestore?.files) return;
  //   const container = await webcontainer;
  //   // ... (file writing logic from original restoreSnapshot) ...
  //   toast.info("Snapshot files are being restored in the background.");
  // }, []);


  const takeSnapshot = useCallback(async (messageIdForIndex: string, files: FileMap, summary?: string) => {
    const currentChatId = currentChatIdStore.get();
    if (!currentChatId) {
      toast.error("Chat ID is missing, cannot take snapshot.");
      return;
    }

    const snapshotPayload: SnapshotData = {
      chatIndex: messageIdForIndex,
      files,
      summary,
    };

    fetcher.submit(
      { 
        intent: "takeSnapshot",
        chatId: currentChatId,
        snapshotData: JSON.stringify(snapshotPayload) 
      },
      // Action route is the current chat page itself
      { method: "POST", action: `/chat/${currentChatId}` } 
    );
    // Handle fetcher.state (loading) and fetcher.data (response) for UI feedback
    toast.info("Snapshotting..."); // Optimistic UI
  }, [fetcher]);

  
  const updateChatMetadata = useCallback(async (metadata: IChatMetadata) => {
    const currentChatId = currentChatIdStore.get();
    if (!currentChatId) {
      toast.error("Chat ID is missing, cannot update metadata.");
      return;
    }
    fetcher.submit(
      { intent: "updateMetadata", chatId: currentChatId, metadata: JSON.stringify(metadata) },
      { method: "POST", action: `/chat/${currentChatId}` }
    );
    // Optimistically update nanostore, or wait for action response
    currentChatMetadataStore.set(metadata); 
    toast.info("Updating metadata...");
  }, [fetcher]);


  const storeMessageHistory = useCallback(async (newMessages: Message[]) => {
    const currentChatId = currentChatIdStore.get();
    const currentDesc = currentDescriptionStore.get();
    const currentMeta = currentChatMetadataStore.get();

    if (!currentChatId && newMessages.length === 0) return; // Nothing to save for a new chat yet

    const messagesToSave = newMessages.filter((m) => !m.annotations?.includes('no-store'));
    if (messagesToSave.length === 0) return;

    // Snapshot logic: find last assistant message for summary, take snapshot
    const lastMessage = messagesToSave[messagesToSave.length - 1];
    let chatSummary: string | undefined = undefined;
    if (lastMessage.role === 'assistant') {
      const annotations = lastMessage.annotations as JSONValue[];
      const chatSummaryAnnotation = (annotations?.find(
        (ann: any) => ann && ann.type === 'chatSummary'
      ) as ContextAnnotation & { summary?: string });
      if (chatSummaryAnnotation) chatSummary = chatSummaryAnnotation.summary;
    }
    
    // Auto-snapshotting on new message history
    // Consider if this should always happen or be more conditional
    if (workbenchStore.files.get() && lastMessage.id) {
       takeSnapshot(lastMessage.id, workbenchStore.files.get(), chatSummary);
    }


    const payload: any = {
      intent: "storeMessages",
      messages: JSON.stringify([...archivedMessages, ...messagesToSave]), // Send full history for simplicity server-side
                                                                        // Or, server can append if it knows the existing state.
    };
    if (currentChatId) {
      payload.chatId = currentChatId;
    }
    if (currentDesc) {
      payload.description = currentDesc;
    }
    if (currentMeta) {
      payload.metadata = JSON.stringify(currentMeta);
    }
    
    fetcher.submit(payload, { method: "POST", action: currentChatId ? `/chat/${currentChatId}` : `/chat/new` }); // Or a dedicated new chat route
    
    // Optimistic UI update for messages
    setMessages(prev => [...prev, ...messagesToSave]); 

    // If it was a new chat, the action response should include the new chat ID.
    // This needs to be handled in a useEffect looking at fetcher.data to update currentChatIdStore
    // and potentially navigate.
    if (!currentChatId) {
      toast.info("Creating new chat...");
    }

  }, [fetcher, archivedMessages, takeSnapshot]);


  const duplicateCurrentChat = useCallback(async (chatToDuplicateId?: string) => {
    const id = chatToDuplicateId || currentChatIdStore.get();
    if (!id) {
      toast.error("No chat selected to duplicate.");
      return;
    }
    // Duplicating an existing chat, action points to its route.
    fetcher.submit({ intent: "duplicateChat", chatId: id }, { method: "POST", action: `/chat/${id}` }); 
    toast.info("Duplicating chat...");
    // Navigation to new chat will be handled based on action response (e.g., in useEffect on fetcher.data)
  }, [fetcher]);

  const importChat = useCallback(async (newDescription: string, newMessages: Message[], newMetadata?: IChatMetadata) => {
    fetcher.submit(
      {
        intent: "importChat",
        description: newDescription,
        messages: JSON.stringify(newMessages),
        metadata: newMetadata ? JSON.stringify(newMetadata) : undefined,
      },
      // Import creates a new chat, could point to a generic new chat action or specific import route
      // For now, let's assume it can be handled by a route like /chat/new or the main chat action endpoint if it handles no-ID cases
      { method: "POST", action: `/chat/new` } // Or CHAT_ACTION_ROUTE if it's a general API endpoint
    );
    toast.info("Importing chat...");
    // Navigation to new chat will be handled based on action response
  }, [fetcher]);
  
  // exportChat can remain largely client-side if all data is available
  const exportChat = useCallback(async () => {
    const currentChat = {
      id: currentChatIdStore.get(),
      description: currentDescriptionStore.get(),
      messages: [...archivedMessages, ...messages], // Full message history
      metadata: currentChatMetadataStore.get(),
      exportDate: new Date().toISOString(),
    };

    if (!currentChat.id) {
      toast.error("No chat loaded to export.");
      return;
    }

    const blob = new Blob([JSON.stringify(currentChat, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${currentChat.id}-${currentChat.exportDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Chat exported.");
  }, [messages, archivedMessages]);


  // Effect to handle navigation and state updates after fetcher actions (e.g., new chat created)
  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const actionData = fetcher.data as any; // Define a type for action responses
      if (actionData.newChatId) {
        currentChatIdStore.set(actionData.newChatId);
        // If the action implies a navigation (e.g. after import/duplicate)
        if (actionData.redirectTo) {
          navigate(actionData.redirectTo);
        } else {
          // Or just update URL if staying on the same page but with new ID
          navigate(`/chat/${actionData.newChatId}`, { replace: true });
        }
      }
      if (actionData.updatedMessages) {
        // If server sends back the canonical messages list
        setMessages(actionData.updatedMessages);
      }
      if (actionData.error) {
        toast.error(actionData.error);
      }
      if (actionData.successMessage) {
        toast.success(actionData.successMessage);
      }
      // Potentially revalidate loader data if needed:
      // if (actionData.needsRevalidation) { navigate('.', { replace: true }); }
    }
  }, [fetcher.data, fetcher.state, navigate]);


  return {
    ready: isReady,
    // Provide current messages (combined archived and active for display if needed, or keep separate)
    // For simplicity, the main 'messages' state now holds the active, visible messages.
    // Archived messages are primarily for `storeMessageHistory` context.
    initialMessages: messages, 
    archivedMessages: archivedMessages, // if UI needs to distinguish
    
    // Nanostore values (can be subscribed to directly or read via useNanostore)
    // Exposing them directly from the hook can be an option too.
    // currentChatId: useNanostore(currentChatIdStore), 
    // currentDescription: useNanostore(currentDescriptionStore),
    // currentChatMetadata: useNanostore(currentChatMetadataStore),

    // Actions
    updateChatMetadata, // Renamed from updateChatMestaData
    storeMessageHistory,
    duplicateCurrentChat,
    importChat,
    exportChat,
    takeSnapshot,
    // restoreSnapshot: restoreSnapshotUI, // Expose the UI part of snapshot restoration
  };
}

// Original navigateChat function - may need adjustment if used, or rely on Remix navigate
// function navigateChat(nextId: string) {
//   const url = new URL(window.location.href);
//   url.pathname = `/chat/${nextId}`;
//   window.history.replaceState({}, '', url);
// }
