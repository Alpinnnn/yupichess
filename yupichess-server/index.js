const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const GameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);

// Setup CORS
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const gameManager = new GameManager();

// Basic route
app.get('/', (req, res) => {
  res.send('Chess Server Running!');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Player bergabung ke game
  socket.on('joinGame', () => {
    try {
      const gameInfo = gameManager.createOrJoinRoom(socket.id, socket);
      
      socket.emit('gameJoined', {
        success: true,
        room: gameInfo.room,
        color: gameInfo.color,
        gameState: gameInfo.gameState,
        playersCount: gameInfo.playersCount
      });

      console.log(`Player ${socket.id} joined room ${gameInfo.room} as ${gameInfo.color}`);
      
      // Notify room tentang jumlah pemain
      socket.to(gameInfo.room).emit('playerJoined', {
        playersCount: gameInfo.playersCount
      });
      
    } catch (error) {
      socket.emit('gameJoined', {
        success: false,
        error: error.message
      });
    }
  });

  // Handle move dari pemain
  socket.on('makeMove', (move) => {
    try {
      const result = gameManager.makeMove(socket.id, move);
      
      if (!result.success) {
        socket.emit('moveResult', result);
      }
      // Jika sukses, gameUpdate sudah di-broadcast dari gameManager
      
    } catch (error) {
      socket.emit('moveResult', {
        success: false,
        error: error.message
      });
    }
  });

  // Handle resignation
  socket.on('resign', () => {
    try {
      const result = gameManager.resignGame(socket.id);
      if (result.success) {
        console.log(`Player ${socket.id} resigned`);
      }
    } catch (error) {
      console.error('Resign error:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    gameManager.removePlayer(socket.id);
  });

  // Handle request game state
  socket.on('requestGameState', () => {
    const player = gameManager.players.get(socket.id);
    if (player) {
      const gameState = gameManager.getGameState(player.room);
      socket.emit('gameState', gameState);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Chess server running on port ${PORT}`);
});