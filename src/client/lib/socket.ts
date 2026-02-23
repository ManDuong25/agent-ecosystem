/**
 * WebSocket hook – connects to backend Socket.io for real-time events.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { WSEvent } from '../../shared/types.js';

type EventHandler = (event: WSEvent) => void;

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function useSocket(onEvent?: EventHandler) {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef<EventHandler | undefined>(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const s = getSocket();

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleWSEvent = (event: WSEvent) => {
      handlerRef.current?.(event);
    };

    s.on('connect', handleConnect);
    s.on('disconnect', handleDisconnect);
    s.on('ws-event', handleWSEvent);

    if (s.connected) setConnected(true);

    return () => {
      s.off('connect', handleConnect);
      s.off('disconnect', handleDisconnect);
      s.off('ws-event', handleWSEvent);
    };
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    getSocket().emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    getSocket().on(event, handler);
  }, []);

  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    getSocket().off(event, handler);
  }, []);

  return { connected, emit, on, off };
}
