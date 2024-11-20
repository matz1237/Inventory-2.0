import { Server } from 'socket.io';
import { createServer } from 'http';
import { app } from '../app';

const server = createServer(app);
export const io = new Server(server);

export const setupSocketIO = () => {
  io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('joinRoom', (room) => {
      socket.join(room);
      console.log(`User joined room: ${room}`);
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });


  });
};