// Tic Tac Toe Game Logic
// Board positions: 0-8 (left to right, top to bottom)
// X = player, O = AI

export interface GameState {
  board: (string | null)[];
  currentPlayer: 'X' | 'O';
  gameOver: boolean;
  winner: string | null;
  moves: number[];
}

export class TicTacToe {
  private board: (string | null)[] = Array(9).fill(null);
  private currentPlayer: 'X' | 'O' = 'X';
  private gameOver = false;
  private winner: string | null = null;
  private moveHistory: number[] = [];

  /**
   * Initialize a new game
   */
  constructor() {
    this.reset();
  }

  /**
   * Reset the game
   */
  reset(): void {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.gameOver = false;
    this.winner = null;
    this.moveHistory = [];
  }

  /**
   * Make a move on the board
   */
  makeMove(position: number): boolean {
    if (position < 0 || position > 8 || this.board[position] !== null || this.gameOver) {
      return false;
    }

    this.board[position] = this.currentPlayer;
    this.moveHistory.push(position);

    // Check for win/draw
    this.checkGameState();

    // Switch player
    if (!this.gameOver) {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    return true;
  }

  /**
   * Get AI move using minimax algorithm
   */
  getAIMove(): number {
    const availableMoves = this.getAvailableMoves();
    if (availableMoves.length === 0) return -1;

    let bestScore = -Infinity;
    let bestMove = availableMoves[0];

    for (const move of availableMoves) {
      this.board[move] = 'O';
      const score = this.minimax(0, false);
      this.board[move] = null;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Minimax algorithm for AI decision making
   */
  private minimax(depth: number, isMaximizing: boolean): number {
    const winner = this.checkWinner();

    if (winner === 'O') return 10 - depth; // AI wins
    if (winner === 'X') return depth - 10; // Player wins
    if (this.getAvailableMoves().length === 0) return 0; // Draw

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (const move of this.getAvailableMoves()) {
        this.board[move] = 'O';
        const score = this.minimax(depth + 1, false);
        this.board[move] = null;
        bestScore = Math.max(score, bestScore);
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (const move of this.getAvailableMoves()) {
        this.board[move] = 'X';
        const score = this.minimax(depth + 1, true);
        this.board[move] = null;
        bestScore = Math.min(score, bestScore);
      }
      return bestScore;
    }
  }

  /**
   * Check if there's a winner
   */
  private checkWinner(): string | null {
    const winPatterns = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of winPatterns) {
      if (
        this.board[a] !== null &&
        this.board[a] === this.board[b] &&
        this.board[a] === this.board[c]
      ) {
        return this.board[a];
      }
    }

    return null;
  }

  /**
   * Check game state and update winner/gameOver
   */
  private checkGameState(): void {
    const winner = this.checkWinner();
    if (winner) {
      this.winner = winner;
      this.gameOver = true;
      return;
    }

    if (this.getAvailableMoves().length === 0) {
      this.gameOver = true;
      this.winner = 'draw';
    }
  }

  /**
   * Get available moves
   */
  getAvailableMoves(): number[] {
    return this.board
      .map((cell, index) => (cell === null ? index : -1))
      .filter((index) => index !== -1);
  }

  /**
   * Get current game state
   */
  getState(): GameState {
    return {
      board: [...this.board],
      currentPlayer: this.currentPlayer,
      gameOver: this.gameOver,
      winner: this.winner,
      moves: [...this.moveHistory],
    };
  }

  /**
   * Load a game state
   */
  loadState(state: GameState): void {
    this.board = [...state.board];
    this.currentPlayer = state.currentPlayer;
    this.gameOver = state.gameOver;
    this.winner = state.winner;
    this.moveHistory = [...state.moves];
  }
}
