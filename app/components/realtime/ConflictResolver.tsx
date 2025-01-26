import React, { useState } from 'react';
import type { ConflictResolution, SyncOperation } from '~/types/realtime';

interface ConflictResolverProps {
  path: string;
  content: string;
  onResolve: (resolution: ConflictResolution) => void;
}

export function ConflictResolver({
  path,
  content,
  onResolve
}: ConflictResolverProps) {
  const [resolvedContent, setResolvedContent] = useState(content);

  const handleResolve = () => {
    const resolution: ConflictResolution = {
      operations: [
        {
          type: 'update',
          path,
          content: resolvedContent,
          version: Date.now(),
          baseVersion: Date.now() - 1,
          timestamp: Date.now()
        }
      ],
      newVersion: Date.now(),
      timestamp: Date.now()
    };

    onResolve(resolution);
  };

  const handleDiscard = () => {
    const resolution: ConflictResolution = {
      operations: [],
      newVersion: Date.now(),
      timestamp: Date.now()
    };

    onResolve(resolution);
  };

  return (
    <div className="conflict-resolver">
      <div className="conflict-header">
        <h3>Conflict Detected</h3>
        <p>Changes conflict with updates from another user. Please resolve the conflict:</p>
      </div>

      <div className="conflict-content">
        <textarea
          value={resolvedContent}
          onChange={(e) => setResolvedContent(e.target.value)}
          className="conflict-editor"
        />
      </div>

      <div className="conflict-actions">
        <button 
          onClick={handleDiscard}
          className="conflict-button discard"
        >
          Discard Changes
        </button>
        <button 
          onClick={handleResolve}
          className="conflict-button resolve"
        >
          Resolve Conflict
        </button>
      </div>
    </div>
  );
} 