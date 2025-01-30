import React from 'react';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';

export const ConversationHistory: React.FC = () => {
  const chat = useStore(chatStore);

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg">
      <h2 className="text-lg font-semibold">Conversation History</h2>
      <div className="flex flex-col gap-2">
        {chat.messages.map((message, index) => (
          <div 
            key={index}
            className={`p-3 rounded-lg ${
              message.role === 'user' ? 'bg-blue-100' : 'bg-white'
            }`}
          >
            <div className="font-medium">{message.role === 'user' ? 'You' : 'Assistant'}</div>
            <div className="mt-1">{message.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}; 