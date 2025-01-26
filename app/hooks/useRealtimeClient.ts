import { useContext, useEffect } from 'react';
import { RealtimeContext } from '~/contexts/RealtimeContext';

export function useRealtimeClient() {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error('useRealtimeClient must be used within a RealtimeProvider');
  }

  return context;
} 