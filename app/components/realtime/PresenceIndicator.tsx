import React from 'react';
import type { PresenceInfo } from '~/types/realtime';

interface PresenceIndicatorProps {
  presence: PresenceInfo;
  content: string;
}

export function PresenceIndicator({ presence, content }: PresenceIndicatorProps) {
  const { userId, cursor, selection } = presence;

  const getPositionStyle = (position: number) => {
    // Calculate position based on content layout
    const lines = content.slice(0, position).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length;

    return {
      top: `${(line - 1) * 20}px`, // Assuming line height of 20px
      left: `${column * 8}px` // Assuming monospace font of 8px width
    };
  };

  return (
    <>
      {cursor && (
        <div 
          className="cursor-indicator"
          style={{
            ...getPositionStyle(cursor.position),
            backgroundColor: `hsl(${hashCode(userId) % 360}, 70%, 50%)`
          }}
        >
          <div className="cursor-label">{userId}</div>
        </div>
      )}

      {selection && (
        <div 
          className="selection-indicator"
          style={{
            ...getPositionStyle(selection.start),
            width: `${(selection.end - selection.start) * 8}px`,
            backgroundColor: `hsla(${hashCode(userId) % 360}, 70%, 50%, 0.2)`
          }}
        />
      )}
    </>
  );
}

// Simple hash function for consistent colors
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
} 