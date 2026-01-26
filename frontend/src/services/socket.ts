import { io, Socket } from 'socket.io-client';

const URL = 'http://localhost:8000'; // Backend URL

let socket: Socket;

export const connectSocket = (token: string) => {
  if (!socket) {
    socket = io(URL, {
      auth: {
        token: token
      },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error("Socket not initialized. Call connectSocket first.");
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    // socket = null; // TypeScript might complain about assigning to const or global var issue, keeping simple
  }
};
