import React from 'react';

const GameInfo = ({ 
  playerColor, 
  currentTurn, 
  gameState, 
  playersCount, 
  onResign,
  connected 
}) => {
  const isMyTurn = currentTurn === playerColor;
  
  const getGameStatus = () => {
    if (!connected) {
      return 'Connecting...';
    }
    
    if (playersCount < 2) {
      return 'Waiting for opponent...';
    }
    
    if (gameState?.isCheckmate) {
      return `Checkmate! ${gameState.turn === 'w' ? 'Black' : 'White'} wins!`;
    }
    
    if (gameState?.isDraw) {
      return 'Game ended in a draw!';
    }
    
    if (gameState?.isStalemate) {
      return 'Stalemate! Game is a draw!';
    }
    
    if (gameState?.isCheck) {
      return `Check! ${currentTurn === 'white' ? 'White' : 'Black'} to move`;
    }
    
    return `${isMyTurn ? 'Your' : "Opponent's"} turn (${currentTurn === 'white' ? 'White' : 'Black'})`;
  };

  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      marginBottom: '20px',
      textAlign: 'center'
    }}>
      <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>
        Multiplayer Chess
      </h2>
      
      <div style={{ marginBottom: '15px' }}>
        <span style={{ 
          fontSize: '18px', 
          fontWeight: 'bold',
          color: playerColor === 'white' ? '#f0f0f0' : '#333',
          background: playerColor === 'white' ? '#333' : '#f0f0f0',
          padding: '5px 15px',
          borderRadius: '20px',
          border: '2px solid #333'
        }}>
          You are playing as {playerColor?.toUpperCase()}
        </span>
      </div>
      
      <div style={{ 
        fontSize: '16px', 
        marginBottom: '15px',
        color: isMyTurn ? '#2e7d32' : '#1976d2',
        fontWeight: 'bold'
      }}>
        {getGameStatus()}
      </div>
      
      <div style={{ marginBottom: '15px', color: '#666' }}>
        Players connected: {playersCount}/2
      </div>
      
      {playersCount === 2 && !gameState?.isGameOver && (
        <button
          onClick={onResign}
          style={{
            background: '#f44336',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          onMouseOver={(e) => e.target.style.background = '#d32f2f'}
          onMouseOut={(e) => e.target.style.background = '#f44336'}
        >
          Resign Game
        </button>
      )}
    </div>
  );
};

export default GameInfo;