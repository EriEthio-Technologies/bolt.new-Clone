import clsx from 'clsx';
import { useChat } from '~/lib/stores/chat';
import { useTheme } from '~/lib/stores/theme';

export default function HeaderActionButtons() {
  const chat = useChat();
  const theme = useTheme();

  return (
    <div className="flex items-center gap-2">
      <div className="flex border border-gobezeai-elements-borderColor rounded-md overflow-hidden">
        <button
          className={clsx('flex items-center gap-2 px-3 py-1.5 transition-colors', {
            'bg-gobezeai-elements-item-backgroundDefault hover:bg-gobezeai-elements-item-backgroundActive text-gobezeai-elements-textTertiary hover:text-gobezeai-elements-textPrimary':
              !chat.started,
            'bg-gobezeai-elements-item-backgroundAccent text-gobezeai-elements-item-contentAccent': chat.started,
          })}
          onClick={() => chat.toggle()}
        >
          <div className="i-gobezeai:chat text-sm" />
          <span>Chat</span>
        </button>
        <div className="w-[1px] bg-gobezeai-elements-borderColor" />
        <button
          className={clsx('flex items-center gap-2 px-3 py-1.5 transition-colors', {
            'bg-gobezeai-elements-item-backgroundDefault hover:bg-gobezeai-elements-item-backgroundActive text-gobezeai-elements-textTertiary hover:text-gobezeai-elements-textPrimary':
              theme.get() === 'light',
            'bg-gobezeai-elements-item-backgroundAccent text-gobezeai-elements-item-contentAccent':
              theme.get() === 'dark',
          })}
          onClick={() => theme.toggle()}
        >
          <div className={clsx('text-sm', theme.get() === 'light' ? 'i-gobezeai:sun' : 'i-gobezeai:moon')} />
        </button>
      </div>
    </div>
  );
}
