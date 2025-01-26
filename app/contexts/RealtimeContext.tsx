import React, { createContext, useRef } from 'react';
import { RealtimeClient } from '~/lib/services/realtime/RealtimeClient';

export const RealtimeContext = createContext<RealtimeClient | null>(null);

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const clientRef = useRef<RealtimeClient>();

  if (!clientRef.current) {
    clientRef.current = new RealtimeClient();
  }

  return (
    <RealtimeContext.Provider value={clientRef.current}>
      {children}
    </RealtimeContext.Provider>
  );
} 