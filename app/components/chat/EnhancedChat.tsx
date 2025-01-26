import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { ConversationHistory } from './ConversationHistory';
import { GuidelinePanel } from './GuidelinePanel';
import { CodePreview } from '../editor/CodePreview';

export function EnhancedChat() {
  const [input, setInput] = useState('');
  const chatHistory = useStore(chatStore.history);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <ConversationHistory messages={chatHistory} />
        <div className="flex-shrink-0 p-4 border-t">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Ask me anything about your code..."
          />
          <button 
            onClick={() => chatStore.sendMessage(input)}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Send
          </button>
        </div>
      </div>
      <GuidelinePanel />
    </div>
  );
} 