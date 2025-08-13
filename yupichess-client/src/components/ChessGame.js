import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js'
import io from 'socket.io-client';
import GameInfo from './GameInfo';

// Chess pieces unicode symbols
const PIECES = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

const ChessGame = () => {
  const [socket, setSocket] = useState(null);
  const [game, setGame] = useState(new Chess());
  const [gameState, setGameState] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [currentTurn, setCurrentTurn] = useState('white');
  const [playersCount, setPlayersCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);

  const addMessage = (message, type = 'info') => {
    setMessages(prev => [...prev.slice(-4), { message, type, timestamp: Date.now() }]);
  };

  // Socket connection logic (sama seperti sebelumnya)
  useEffect(() => {
    const newSocket = io('http://localhost:4000');
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      setSocket(newSocket);
      newSocket.emit('joinGame');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
      addMessage('Disconnected from server', 'error');
    });

    newSocket.on('gameJoined', (data) => {
      if (data.success) {
        setPlayerColor(data.color);
        setGameState(data.gameState);
        setPlayersCount(data.playersCount);
        setCurrentTurn(data.gameState.currentTurn);
        
        const newGame = new Chess(data.gameState.fen);
        setGame(newGame);
        
        addMessage(`Joined as ${data.color.toUpperCase()}`, 'success');
      } else {
        addMessage(`Failed to join game: ${data.error}`, 'error');
      }
    });

    newSocket.on('playerJoined', (data) => {
      setPlayersCount(data.playersCount);
      if (data.playersCount === 2) {
        addMessage('Opponent joined! Game can start', 'success');
      }
    });

    newSocket.on('gameUpdate', (data) => {
      setGameState(data.gameState);
      setCurrentTurn(data.currentTurn);
      
      const newGame = new Chess(data.gameState.fen);
      setGame(newGame);
      setSelectedSquare(null);
      setPossibleMoves([]);
      
      if (data.lastMove) {
        addMessage(`Move: ${data.lastMove.san}`, 'move');
      }
    });

    newSocket.on('moveResult', (result) => {
      if (!result.success) {
        addMessage(`Invalid move: ${result.error}`, 'error');
      }
    });

    newSocket.on('opponentDisconnected', () => {
      addMessage('Opponent disconnected', 'error');
      setPlayersCount(1);
    });

    newSocket.on('gameEnded', (data) => {
      if (data.result === 'resignation') {
        const winner = data.winner === playerColor ? 'You' : 'Opponent';
        addMessage(`Game ended: ${data.resignedPlayer.toUpperCase()} resigned. ${winner} won!`, 'success');
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const makeMove = (from, to) => {
    if (currentTurn !== playerColor || playersCount < 2) {
      return false;
    }

    const move = { from, to, promotion: 'q' };
    
    if (socket) {
      socket.emit('makeMove', move);
    }
    
    return true;
  };

  const handleSquareClick = (square) => {
    if (!selectedSquare) {
      // Select piece
      const piece = game.get(square);
      if (piece && 
          ((piece.color === 'w' && playerColor === 'white') || 
           (piece.color === 'b' && playerColor === 'black')) &&
          currentTurn === playerColor) {
        
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true });
        setPossibleMoves(moves.map(move => move.to));
      }
    } else {
      // Make move
      if (selectedSquare === square) {
        // Deselect
        setSelectedSquare(null);
        setPossibleMoves([]);
      } else {
        makeMove(selectedSquare, square);
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    }
  };

  const handleResign = () => {
    if (socket && window.confirm('Are you sure you want to resign?')) {
      socket.emit('resign');
    }
  };

  const renderBoard = () => {
    const board = game.board();
    const squares = [];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = String.fromCharCode(97 + col) + (8 - row);
        const piece = board[row][col];
        const isLight = (row + col) % 2 === 0;
        const isSelected = selectedSquare === square;
        const isPossibleMove = possibleMoves.includes(square);
        
        // Flip board for black player
        const displayRow = playerColor === 'black' ? 7 - row : row;
        const displayCol = playerColor === 'black' ? 7 - col : col;
        
        squares.push(
          <div
            key={square}
            className="chess-square"
            style={{
              position: 'absolute',
              left: `${displayCol * 60}px`,
              top: `${displayRow * 60}px`,
              width: '60px',
              height: '60px',
              backgroundColor: isSelected ? '#ffeb3b' : 
                             isPossibleMove ? '#4caf50' :
                             isLight ? '#f0d9b5' : '#b58863',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '36px',
              border: isSelected ? '3px solid #ff9800' : 
                     isPossibleMove ? '3px solid #2e7d32' : 'none',
              boxSizing: 'border-box'
            }}
            onClick={() => handleSquareClick(square)}
          >
            {piece && PIECES[piece.type + (piece.color === 'w' ? '' : piece.color)]}
            
            {/* Square notation */}
            {(playerColor === 'white' && row === 7) || (playerColor === 'black' && row === 0) ? (
              <div style={{
                position: 'absolute',
                bottom: '2px',
                right: '4px',
                fontSize: '10px',
                color: isLight ? '#b58863' : '#f0d9b5',
                fontWeight: 'bold'
              }}>
                {square}
              </div>
            ) : null}
          </div>
        );
      }
    }
    
    return squares;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <GameInfo 
        playerColor={playerColor}
        currentTurn={currentTurn}
        gameState={gameState}
        playersCount={playersCount}
        onResign={handleResign}
        connected={connected}
      />
      
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          position: 'relative',
          width: '480px',
          height: '480px',
          border: '2px solid #333',
          margin: '0 auto'
        }}>
          {renderBoard()}
        </div>
      </div>

      {messages.length > 0 && (
        <div style={{
          marginTop: '20px',
          background: 'white',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          minWidth: '300px',
          maxWidth: '600px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Game Log:</h4>
          {messages.map((msg, index) => (
            <div 
              key={index}
              style={{
                padding: '5px 10px',
                margin: '5px 0',
                borderRadius: '5px',
                fontSize: '14px',
                background: msg.type === 'error' ? '#ffebee' : 
                           msg.type === 'success' ? '#e8f5e8' :
                           msg.type === 'move' ? '#e3f2fd' : '#f5f5f5',
                color: msg.type === 'error' ? '#c62828' :
                       msg.type === 'success' ? '#2e7d32' :
                       msg.type === 'move' ? '#1976d2' : '#666',
                border: `1px solid ${
                  msg.type === 'error' ? '#ffcdd2' :
                  msg.type === 'success' ? '#c8e6c9' :
                  msg.type === 'move' ? '#bbdefb' : '#e0e0e0'
                }`
              }}
            >
              {msg.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChessGame;