const { Chess } = require('chess.js');

class GameManager {
  constructor() {
    this.rooms = new Map();
    this.players = new Map();
  }

  createOrJoinRoom(socketId, socket) {
    // Cari room yang belum penuh
    let targetRoom = null;
    for (let [roomId, room] of this.rooms) {
      if (room.players.length < 2) {
        targetRoom = roomId;
        break;
      }
    }

    // Jika tidak ada room kosong, buat room baru
    if (!targetRoom) {
      targetRoom = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.rooms.set(targetRoom, {
        id: targetRoom,
        players: [],
        game: new Chess(),
        currentTurn: 'white'
      });
    }

    const room = this.rooms.get(targetRoom);
    
    // Tentukan warna pemain
    const playerColor = room.players.length === 0 ? 'white' : 'black';
    
    const player = {
      id: socketId,
      socket: socket,
      color: playerColor,
      room: targetRoom
    };

    room.players.push(player);
    this.players.set(socketId, player);
    
    socket.join(targetRoom);
    
    return {
      room: targetRoom,
      color: playerColor,
      gameState: this.getGameState(targetRoom),
      playersCount: room.players.length
    };
  }

  makeMove(socketId, move) {
    const player = this.players.get(socketId);
    if (!player) return { success: false, error: 'Player not found' };

    const room = this.rooms.get(player.room);
    if (!room) return { success: false, error: 'Room not found' };

    // Cek apakah giliran pemain ini
    if (room.currentTurn !== player.color) {
      return { success: false, error: 'Not your turn' };
    }

    // Cek apakah game sudah selesai
    if (room.game.isGameOver()) {
      return { success: false, error: 'Game is over' };
    }

    try {
      // Validasi dan eksekusi move
      const moveResult = room.game.move(move);
      if (!moveResult) {
        return { success: false, error: 'Invalid move' };
      }

      // Ganti giliran
      room.currentTurn = room.currentTurn === 'white' ? 'black' : 'white';

      const gameState = this.getGameState(player.room);
      
      // Broadcast ke semua pemain di room
      room.players.forEach(p => {
        p.socket.emit('gameUpdate', {
          gameState,
          lastMove: moveResult,
          currentTurn: room.currentTurn
        });
      });

      return { success: true, gameState, lastMove: moveResult };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getGameState(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      fen: room.game.fen(),
      turn: room.game.turn(),
      isGameOver: room.game.isGameOver(),
      isCheck: room.game.inCheck(),
      isCheckmate: room.game.isCheckmate(),
      isDraw: room.game.isDraw(),
      isStalemate: room.game.isStalemate(),
      currentTurn: room.currentTurn,
      history: room.game.history()
    };
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return;

    const room = this.rooms.get(player.room);
    if (room) {
      // Remove player dari room
      room.players = room.players.filter(p => p.id !== socketId);
      
      // Notify pemain lain bahwa opponent disconnect
      room.players.forEach(p => {
        p.socket.emit('opponentDisconnected');
      });

      // Hapus room jika kosong
      if (room.players.length === 0) {
        this.rooms.delete(player.room);
      }
    }

    this.players.delete(socketId);
  }

  resignGame(socketId) {
    const player = this.players.get(socketId);
    if (!player) return { success: false, error: 'Player not found' };

    const room = this.rooms.get(player.room);
    if (!room) return { success: false, error: 'Room not found' };

    // Broadcast resignation ke semua pemain
    room.players.forEach(p => {
      p.socket.emit('gameEnded', {
        result: 'resignation',
        winner: p.id === socketId ? null : p.color,
        resignedPlayer: player.color
      });
    });

    return { success: true };
  }
}

module.exports = GameManager;