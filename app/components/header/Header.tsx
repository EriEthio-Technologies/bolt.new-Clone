import { Link } from '@remix-run/react';
import clsx from 'clsx';
import { useChat } from '~/lib/stores/chat';
import HeaderActionButtons from './HeaderActionButtons.client';

export default function Header() {
  const chat = useChat();

  return (
    <header
      className={clsx(
        'flex items-center bg-gobezeai-elements-background-depth-1 p-5 border-b h-[var(--header-height)]',
        'border-transparent transition-[border-color]',
        {
          'border-gobezeai-elements-borderColor': chat.started,
        },
      )}
    >
      <Link to="/">
        <div className="flex items-center gap-2 z-logo text-gobezeai-elements-textPrimary cursor-pointer">
          <span className="i-gobezeai:logo w-[24px] inline-block" />
          <span className="i-gobezeai:logo-text?mask w-[46px] inline-block" />
        </div>
      </Link>

      <span className="flex-1 px-4 truncate text-center text-gobezeai-elements-textPrimary">
        {chat.title}
      </span>

      <HeaderActionButtons />
    </header>
  );
}
