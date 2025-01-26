import React, { useEffect, useRef, useState } from 'react';
import { useRealtimeClient } from '~/hooks/useRealtimeClient';
import { PresenceIndicator } from './PresenceIndicator';
import { ConflictResolver } from './ConflictResolver';
import { ConnectionStatus } from './ConnectionStatus';
import type { 
  SyncOperation, 
  PresenceInfo,
  ConflictResolution 
} from '~/types/realtime';

interface CollaborativeEditorProps {
  path: string;
  initialContent: string;
  userId: string;
  onSave?: (content: string) => void;
}

export function CollaborativeEditor({
  path,
  initialContent,
  userId,
  onSave
}: CollaborativeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [presence, setPresence] = useState<PresenceInfo[]>([]);
  const [hasConflict, setHasConflict] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const realtimeClient = useRealtimeClient();

  useEffect(() => {
    const unsubscribeSync = realtimeClient.onSync(handleSync);
    const unsubscribePresence = realtimeClient.onPresence(handlePresence);
    const unsubscribeConflict = realtimeClient.onConflict(handleConflict);
    const unsubscribeConnection = realtimeClient.onConnectionState(setIsConnected);

    return () => {
      unsubscribeSync();
      unsubscribePresence();
      unsubscribeConflict();
      unsubscribeConnection();
    };
  }, []);

  const handleSync = (operations: SyncOperation[]) => {
    operations.forEach(op => {
      if (op.path !== path) return;

      switch (op.type) {
        case 'insert':
          setContent(prev => 
            prev.slice(0, op.position) + 
            op.content + 
            prev.slice(op.position)
          );
          break;

        case 'delete':
          setContent(prev => 
            prev.slice(0, op.position) + 
            prev.slice(op.position + (op.length || 0))
          );
          break;

        case 'update':
          if (op.content !== undefined) {
            setContent(op.content);
          }
          break;
      }
    });
  };

  const handlePresence = (updates: PresenceInfo[]) => {
    setPresence(prev => {
      const newPresence = new Map(prev.map(p => [p.userId, p]));
      updates.forEach(update => {
        newPresence.set(update.userId, update);
      });
      return Array.from(newPresence.values());
    });
  };

  const handleConflict = (resolution: ConflictResolution) => {
    setHasConflict(true);
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    const oldContent = content;
    
    // Generate diff operation
    const operation: SyncOperation = {
      type: 'update',
      path,
      content: newContent,
      version: Date.now(),
      baseVersion: Date.now() - 1,
      timestamp: Date.now()
    };

    setContent(newContent);
    realtimeClient.sendOperation(operation);
  };

  const handleCursorMove = (event: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!editorRef.current) return;

    const position = editorRef.current.selectionStart;
    realtimeClient.updatePresence({
      userId,
      cursor: {
        path,
        position
      }
    });
  };

  const handleSelection = () => {
    if (!editorRef.current) return;

    const { selectionStart, selectionEnd } = editorRef.current;
    if (selectionStart === selectionEnd) return;

    realtimeClient.updatePresence({
      userId,
      selection: {
        path,
        start: selectionStart,
        end: selectionEnd
      }
    });
  };

  const handleSave = () => {
    onSave?.(content);
  };

  return (
    <div className="collaborative-editor">
      <ConnectionStatus isConnected={isConnected} />
      
      <div className="editor-container">
        <textarea
          ref={editorRef}
          value={content}
          onChange={handleChange}
          onMouseUp={handleCursorMove}
          onKeyUp={handleCursorMove}
          onSelect={handleSelection}
          className="editor"
        />
        
        <div className="presence-indicators">
          {presence.map(p => (
            <PresenceIndicator
              key={p.userId}
              presence={p}
              content={content}
            />
          ))}
        </div>
      </div>

      {hasConflict && (
        <ConflictResolver
          path={path}
          content={content}
          onResolve={(resolution) => {
            realtimeClient.resolveConflict(resolution);
            setHasConflict(false);
          }}
        />
      )}

      <div className="editor-actions">
        <button 
          onClick={handleSave}
          disabled={!isConnected}
        >
          Save
        </button>
      </div>
    </div>
  );
} 