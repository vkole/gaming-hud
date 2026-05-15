import pool from './db';

export interface Player {
  id: number;
  uuid: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface GameStats {
  id: number;
  player_id: number;
  total_games_played: number;
  total_wins: number;
  total_losses: number;
  total_draws: number;
  last_played_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerWithStats {
  player: Player;
  stats: GameStats;
}

export interface SolitaireStats {
  games_started: number;
  games_won: number;
  best_completion_seconds: number | null;
}

/**
 * Get or create a player
 */
export async function getOrCreatePlayer(uuid: string, displayName: string): Promise<Player> {
  const client = await pool.connect();
  try {
    // Check if player exists
    const existing = await client.query('SELECT * FROM players WHERE uuid = $1', [uuid]);

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new player
    const result = await client.query(
      'INSERT INTO players (uuid, display_name) VALUES ($1, $2) RETURNING *',
      [uuid, displayName]
    );

    const player = result.rows[0];

    // Create stats record for the player
    await client.query(
      'INSERT INTO game_stats (player_id) VALUES ($1)',
      [player.id]
    );

    return player;
  } finally {
    client.release();
  }
}

/**
 * Get player by UUID
 */
export async function getPlayerByUUID(uuid: string): Promise<Player | null> {
  const result = await pool.query('SELECT * FROM players WHERE uuid = $1', [uuid]);
  return result.rows[0] || null;
}

/**
 * Get player stats
 */
export async function getPlayerStats(playerId: number): Promise<GameStats | null> {
  const result = await pool.query('SELECT * FROM game_stats WHERE player_id = $1', [playerId]);
  return result.rows[0] || null;
}

/**
 * Get player with stats
 */
export async function getPlayerWithStats(uuid: string): Promise<PlayerWithStats | null> {
  const client = await pool.connect();
  try {
    const playerResult = await client.query('SELECT * FROM players WHERE uuid = $1', [uuid]);

    if (playerResult.rows.length === 0) {
      return null;
    }

    const player = playerResult.rows[0];
    const statsResult = await client.query(
      'SELECT * FROM game_stats WHERE player_id = $1',
      [player.id]
    );

    return {
      player,
      stats: statsResult.rows[0],
    };
  } finally {
    client.release();
  }
}

/**
 * Save game result
 */
export async function saveGameResult(
  playerId: number,
  result: 'win' | 'loss' | 'draw',
  movesPlayed: number,
  gameDuration: number,
  playerMoves: number[],
  aiMoves: number[],
  finalBoardState: any
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert game record
    await client.query(
      `INSERT INTO games (player_id, result, moves_played, game_duration_seconds, player_moves, ai_moves, final_board_state)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        playerId,
        result,
        movesPlayed,
        gameDuration,
        JSON.stringify(playerMoves),
        JSON.stringify(aiMoves),
        JSON.stringify(finalBoardState),
      ]
    );

    // Update player stats
    const statsResult = await client.query(
      'SELECT * FROM game_stats WHERE player_id = $1',
      [playerId]
    );

    const stats = statsResult.rows[0];
    const newStats = {
      total_games_played: stats.total_games_played + 1,
      total_wins: stats.total_wins + (result === 'win' ? 1 : 0),
      total_losses: stats.total_losses + (result === 'loss' ? 1 : 0),
      total_draws: stats.total_draws + (result === 'draw' ? 1 : 0),
      last_played_date: new Date(),
    };

    await client.query(
      `UPDATE game_stats
       SET total_games_played = $1, total_wins = $2, total_losses = $3, total_draws = $4, last_played_date = $5
       WHERE player_id = $6`,
      [
        newStats.total_games_played,
        newStats.total_wins,
        newStats.total_losses,
        newStats.total_draws,
        newStats.last_played_date,
        playerId,
      ]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Record a Solitaire game start.
 */
export async function saveSolitaireStart(playerId: number): Promise<number> {
  const result = await pool.query(
    `INSERT INTO games (player_id, game_type, result, moves_played, game_duration_seconds, player_moves, ai_moves, final_board_state)
     VALUES ($1, 'solitaire', 'started', 0, NULL, '[]', '[]', '{}')
     RETURNING id`,
    [playerId]
  );

  return result.rows[0].id;
}

/**
 * Mark a Solitaire game as won.
 */
export async function saveSolitaireWin(sessionId: number, completionSeconds: number): Promise<void> {
  await pool.query(
    `UPDATE games
     SET result = 'win', game_duration_seconds = $1
     WHERE id = $2 AND game_type = 'solitaire'`,
    [completionSeconds, sessionId]
  );
}

/**
 * Get Solitaire stats from the game history table.
 */
export async function getSolitaireStats(playerUUID: string): Promise<SolitaireStats | null> {
  const result = await pool.query(
    `SELECT
       COUNT(g.id)::int AS games_started,
       (COUNT(g.id) FILTER (WHERE g.result = 'win'))::int AS games_won,
       (MIN(g.game_duration_seconds) FILTER (WHERE g.result = 'win'))::int AS best_completion_seconds
     FROM players p
     LEFT JOIN games g ON g.player_id = p.id AND g.game_type = 'solitaire'
     WHERE p.uuid = $1
     GROUP BY p.id`,
    [playerUUID]
  );

  return result.rows[0] || null;
}

/**
 * Get top players by wins
 */
export async function getTopPlayersByWins(limit: number = 10): Promise<(PlayerWithStats)[]> {
  const result = await pool.query(
    `SELECT p.*, gs.* FROM players p
     JOIN game_stats gs ON p.id = gs.player_id
     ORDER BY gs.total_wins DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows.map((row) => ({
    player: {
      id: row.id,
      uuid: row.uuid,
      display_name: row.display_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    stats: {
      id: row.id,
      player_id: row.player_id,
      total_games_played: row.total_games_played,
      total_wins: row.total_wins,
      total_losses: row.total_losses,
      total_draws: row.total_draws,
      last_played_date: row.last_played_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  }));
}

/**
 * Get all players with stats
 */
export async function getAllPlayersWithStats(): Promise<PlayerWithStats[]> {
  const result = await pool.query(
    `SELECT p.*, gs.* FROM players p
     JOIN game_stats gs ON p.id = gs.player_id
     ORDER BY p.created_at DESC`
  );

  return result.rows.map((row) => ({
    player: {
      id: row.id,
      uuid: row.uuid,
      display_name: row.display_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    stats: {
      id: row.id,
      player_id: row.player_id,
      total_games_played: row.total_games_played,
      total_wins: row.total_wins,
      total_losses: row.total_losses,
      total_draws: row.total_draws,
      last_played_date: row.last_played_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  }));
}
