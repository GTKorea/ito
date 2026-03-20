import { io, Socket } from 'socket.io-client';
import { setupChatListeners } from '@/stores/chat-store';

const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011';

let socket: Socket | null = null;

export function connectWs(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    // Set up chat listeners when connected
    setupChatListeners();
  });

  socket.on('disconnect', () => {
    // connection lost
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectWs() {
  socket?.disconnect();
  socket = null;
}
