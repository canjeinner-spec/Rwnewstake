import { io } from 'socket.io-client';

export const socket = io("/", {
  autoConnect: false,
  // transports: ['websocket'] satırını sildik, artık otomatik seçecek
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});
