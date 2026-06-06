const { Server } = require('socket.io');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('join:police', (policeId) => {
      socket.join(`police:${policeId}`);
      console.log(`👮 Police ${policeId} joined room`);
    });

    socket.on('join:ambulance', (ambulanceId) => {
      socket.join(`ambulance:${ambulanceId}`);
      console.log(`🚑 Ambulance ${ambulanceId} joined room`);
    });

    // Live ambulance location updates → broadcast to ALL police rooms
    socket.on('ambulanceLocation', (data) => {
      console.log(`🚑 Location: ${data.latitude}, ${data.longitude}`);

      // Broadcast to every connected police room (police:PI-GNT-01, etc.)
      // Also emit globally so any police dashboard receives it
      socket.broadcast.emit('ambulanceLocationUpdate', data);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

module.exports = { initSocket, getIO };