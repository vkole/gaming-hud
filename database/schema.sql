-- Gaming HUD Database Schema
-- PostgreSQL Schema for MOAP Tic Tac Toe and Solitaire Games

-- Create players table
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create game_stats table
CREATE TABLE IF NOT EXISTS game_stats (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    total_games_played INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    total_draws INTEGER DEFAULT 0,
    last_played_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id)
);

-- Create games table to track individual games
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    game_type VARCHAR(50) DEFAULT 'tic_tac_toe',
    result VARCHAR(20), -- 'started', 'win', 'loss', 'draw'
    moves_played INTEGER,
    game_duration_seconds INTEGER,
    player_moves TEXT, -- JSON array of player moves
    ai_moves TEXT, -- JSON array of AI moves
    final_board_state TEXT, -- JSON representation of final board
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_players_uuid ON players(uuid);
CREATE INDEX IF NOT EXISTS idx_game_stats_player_id ON game_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_games_player_id ON games(player_id);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);

-- Trigger to update updated_at timestamp on players table
CREATE OR REPLACE FUNCTION update_players_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_players_updated_at_trigger
BEFORE UPDATE ON players
FOR EACH ROW
EXECUTE FUNCTION update_players_updated_at();

-- Trigger to update updated_at timestamp on game_stats table
CREATE OR REPLACE FUNCTION update_game_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_stats_updated_at_trigger
BEFORE UPDATE ON game_stats
FOR EACH ROW
EXECUTE FUNCTION update_game_stats_updated_at();

-- Trigger to update updated_at timestamp on games table
CREATE OR REPLACE FUNCTION update_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_games_updated_at_trigger
BEFORE UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION update_games_updated_at();
