import { Router, Request, Response } from 'express';
import { TicTacToe } from './tictactoe';
import {
  getOrCreatePlayer,
  getPlayerByUUID,
  getPlayerStats,
  getPlayerWithStats,
  saveGameResult,
  saveSolitaireStart,
  saveSolitaireWin,
  getSolitaireStats,
  getTopPlayersByWins,
  getAllPlayersWithStats,
} from './playerService';

const router = Router();

// Store active games in memory (in production, use Redis or similar)
interface GameSession {
  game: TicTacToe;
  startTime: number;
  playerUUID: string;
  playerId: number;
}

const activeSessions = new Map<string, GameSession>();

/**
 * POST /api/games/start
 * Start a new game
 */
router.post('/games/start', async (req: Request, res: Response) => {
  try {
    const { playerUUID, playerName } = req.body;

    if (!playerUUID || !playerName) {
      return res.status(400).json({ error: 'playerUUID and playerName are required' });
    }

    // Get or create player
    const player = await getOrCreatePlayer(playerUUID, playerName);

    // Create new game
    const game = new TicTacToe();
    const sessionId = `${playerUUID}-${Date.now()}`;

    activeSessions.set(sessionId, {
      game,
      startTime: Date.now(),
      playerUUID,
      playerId: player.id,
    });

    // Auto-cleanup old sessions after 1 hour
    setTimeout(() => activeSessions.delete(sessionId), 3600000);

    res.json({
      sessionId,
      gameState: game.getState(),
      player: {
        id: player.id,
        uuid: player.uuid,
        display_name: player.display_name,
      },
    });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

/**
 * POST /api/games/move
 * Submit a player move and get AI response
 */
router.post('/games/move', async (req: Request, res: Response) => {
  try {
    const { sessionId, position } = req.body;

    if (!sessionId || position === undefined) {
      return res.status(400).json({ error: 'sessionId and position are required' });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    const { game } = session;

    // Player makes move
    const playerMoveValid = game.makeMove(position);
    if (!playerMoveValid) {
      return res.status(400).json({ error: 'Invalid move' });
    }

    let gameState = game.getState();

    // If game is not over, AI makes move
    if (!gameState.gameOver) {
      const aiMove = game.getAIMove();
      if (aiMove !== -1) {
        game.makeMove(aiMove);
        gameState = game.getState();
      }
    }

    res.json({
      gameState,
      gameOver: gameState.gameOver,
      winner: gameState.winner,
    });
  } catch (error) {
    console.error('Error making move:', error);
    res.status(500).json({ error: 'Failed to process move' });
  }
});

/**
 * POST /api/games/end
 * End a game and save results
 */
router.post('/games/end', async (req: Request, res: Response) => {
  try {
    const { sessionId, result } = req.body;

    if (!sessionId || !result) {
      return res.status(400).json({ error: 'sessionId and result are required' });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Game session not found' });
    }

    const { game, startTime, playerId } = session;
    const gameState = game.getState();
    const gameDuration = Math.floor((Date.now() - startTime) / 1000);

    // Extract player and AI moves
    const playerMoves: number[] = [];
    const aiMoves: number[] = [];

    for (let i = 0; i < gameState.moves.length; i++) {
      if (i % 2 === 0) {
        playerMoves.push(gameState.moves[i]);
      } else {
        aiMoves.push(gameState.moves[i]);
      }
    }

    // Save game result
    await saveGameResult(
      playerId,
      result as 'win' | 'loss' | 'draw',
      gameState.moves.length,
      gameDuration,
      playerMoves,
      aiMoves,
      gameState.board
    );

    // Clean up session
    activeSessions.delete(sessionId);

    res.json({
      success: true,
      message: 'Game result saved',
    });
  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({ error: 'Failed to save game result' });
  }
});

/**
 * POST /api/solitaire/start
 * Record a Solitaire game start
 */
router.post('/solitaire/start', async (req: Request, res: Response) => {
  try {
    const { playerUUID, playerName } = req.body;

    if (!playerUUID || !playerName) {
      return res.status(400).json({ error: 'playerUUID and playerName are required' });
    }

    const player = await getOrCreatePlayer(playerUUID, playerName);
    const sessionId = await saveSolitaireStart(player.id);

    res.json({
      sessionId,
      player: {
        id: player.id,
        uuid: player.uuid,
        display_name: player.display_name,
      },
    });
  } catch (error) {
    console.error('Error starting Solitaire:', error);
    res.status(500).json({ error: 'Failed to start Solitaire' });
  }
});

/**
 * POST /api/solitaire/win
 * Record a Solitaire win and completion time
 */
router.post('/solitaire/win', async (req: Request, res: Response) => {
  try {
    const { sessionId, completionSeconds } = req.body;

    if (!sessionId || !completionSeconds) {
      return res.status(400).json({ error: 'sessionId and completionSeconds are required' });
    }

    await saveSolitaireWin(Number(sessionId), Number(completionSeconds));

    res.json({
      success: true,
      message: 'Solitaire win saved',
    });
  } catch (error) {
    console.error('Error saving Solitaire win:', error);
    res.status(500).json({ error: 'Failed to save Solitaire win' });
  }
});

/**
 * GET /api/solitaire/players/:playerUUID/stats
 * Get Solitaire stats for a player
 */
router.get('/solitaire/players/:playerUUID/stats', async (req: Request, res: Response) => {
  try {
    const { playerUUID } = req.params;
    const stats = await getSolitaireStats(playerUUID);

    if (!stats) {
      return res.json({
        stats: {
          games_started: 0,
          games_won: 0,
          best_completion_seconds: null,
        },
      });
    }

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching Solitaire stats:', error);
    res.status(500).json({ error: 'Failed to fetch Solitaire stats' });
  }
});

/**
 * GET /api/players/:playerUUID/stats
 * Get player stats
 */
router.get('/players/:playerUUID/stats', async (req: Request, res: Response) => {
  try {
    const { playerUUID } = req.params;

    const playerWithStats = await getPlayerWithStats(playerUUID);
    if (!playerWithStats) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(playerWithStats);
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

/**
 * GET /api/leaderboard/top-wins
 * Get top players by wins
 */
router.get('/leaderboard/top-wins', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const topPlayers = await getTopPlayersByWins(limit);

    res.json({
      leaderboard: topPlayers,
      limit,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboard/all
 * Get all players with stats
 */
router.get('/leaderboard/all', async (req: Request, res: Response) => {
  try {
    const players = await getAllPlayersWithStats();

    res.json({
      players,
      total: players.length,
    });
  } catch (error) {
    console.error('Error fetching all players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

export default router;
