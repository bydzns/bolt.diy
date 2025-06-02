import type { Message } from 'ai';
import { Fragment } from 'react';
import { classNames } from '~/utils/classNames';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';
import { useLocation, useFetcher } from '@remix-run/react'; // Added useFetcher
// Removed db, chatId, and forkChat from old persistence
import { toast } from 'react-toastify';
import { forwardRef, useEffect, useCallback } from 'react'; // Added useCallback
import type { ForwardedRef } from 'react';
import type { ProviderInfo } from '~/types/model';

interface MessagesProps {
  id?: string;
  className?: string;
  isStreaming?: boolean;
  messages?: Message[];
  append?: (message: Message) => void;
  chatMode?: 'discuss' | 'build';
  setChatMode?: (mode: 'discuss' | 'build') => void;
  model?: string;
  provider?: ProviderInfo;
}

export const Messages = forwardRef<HTMLDivElement, MessagesProps>(
  (props: MessagesProps, ref: ForwardedRef<HTMLDivElement> | undefined) => {
    const { id: currentChatDisplayId, isStreaming = false, messages = [] } = props; // Renamed id to currentChatDisplayId for clarity
    const location = useLocation();
    const fetcher = useFetcher();
    // The actual current chat ID for operations should ideally come from a reliable source,
    // perhaps passed as a prop if `props.id` is just for the DOM element.
    // Assuming `props.id` is the actual current chat ID for now for fork operation.
    const currentChatIdForOps = props.id; 

    const handleRewind = useCallback((messageId: string) => {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('rewindTo', messageId);
      // Consider using Remix's navigate for search param changes to integrate better with its lifecycle
      window.location.search = searchParams.toString(); 
    }, [location.search]); // location.search might be too broad, consider specific needs

    const handleFork = useCallback((messageIdToForkAt: string) => {
      if (!currentChatIdForOps) {
        toast.error('Current Chat ID is not available to perform fork.');
        return;
      }
      fetcher.submit(
        { intent: "forkChat", originalChatId: currentChatIdForOps, messageIdToForkAt },
        { method: "POST", action: `/chat/${currentChatIdForOps}` } // Action route for existing chat
      );
      toast.info("Forking chat...");
    }, [currentChatIdForOps, fetcher]);
    
    // Effect to handle navigation after successful fork
    useEffect(() => {
      if (fetcher.data && fetcher.state === 'idle') {
        const actionData = fetcher.data as any; // Define type for action response
        if (actionData.newChatId && actionData.redirectTo) {
          toast.success('Chat forked successfully!');
          window.location.href = actionData.redirectTo; // Or use Remix navigate
        } else if (actionData.error) {
          toast.error(`Failed to fork chat: ${actionData.error}`);
        }
      }
    }, [fetcher.data, fetcher.state]); // Removed navigate from deps as it's not used directly in this effect

    return (
      <div id={currentChatDisplayId} className={props.className} ref={ref}>
        {messages.length > 0
          ? messages.map((message, index) => {
              const { role, content, id: messageId, annotations } = message;
              const isUserMessage = role === 'user';
              const isFirst = index === 0;
              const isHidden = annotations?.includes('hidden');

              if (isHidden) {
                return <Fragment key={index} />;
              }

              return (
                <div
                  key={index}
                  className={classNames('flex gap-4 py-3 w-full rounded-lg', {
                    'mt-4': !isFirst,
                  })}
                >
                  <div className="grid grid-col-1 w-full">
                    {isUserMessage ? (
                      <UserMessage content={content} />
                    ) : (
                      <AssistantMessage
                        content={content}
                        annotations={message.annotations}
                        messageId={messageId}
                        onRewind={handleRewind}
                        onFork={handleFork}
                        append={props.append}
                        chatMode={props.chatMode}
                        setChatMode={props.setChatMode}
                        model={props.model}
                        provider={props.provider}
                      />
                    )}
                  </div>
                </div>
              );
            })
          : null}
        {isStreaming && (
          <div className="text-center w-full  text-bolt-elements-item-contentAccent i-svg-spinners:3-dots-fade text-4xl mt-4"></div>
        )}
      </div>
    );
  },
);
