import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
      {isConnected ? (
        <>
          <span className="status-dot" />
          Connected
        </>
      ) : (
        <>
          <span className="status-dot" />
          Disconnected - Attempting to reconnect...
        </>
      )}
    </div>
  );
} 