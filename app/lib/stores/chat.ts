import { map } from 'nanostores';
import { AIService } from '../services/ai/AIService';
import type { Message } from '~/types/chat';

const aiService = new AIService();

export const chatStore = map<{
  messages: Message[];
  context: any;
}>({
  messages: [],
  context: {}
});

export async function sendMessage(content: string) {
  const response = await aiService.processQuery(content, chatStore.get().context);
  
  chatStore.set({
    messages: [
      ...chatStore.get().messages,
      {
        role: 'user',
        content
      },
      {
        role: 'assistant',
        content: response.text,
        reasoning: response.reasoning
      }
    ],
    context: response.context
  });
}
