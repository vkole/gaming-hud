# System Architecture & API Reference

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SECOND LIFE                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ MOAP Prim Display                                                   │    │
│  │  ┌─────────────────────────────────────────────────────────────┐   │    │
│  │  │ HTML Interface (hud.html)                                  │   │    │
│  │  │ - Game Board Display (3x3 Grid)                            │   │    │
│  │  │ - Player Stats Display                                     │   │    │
│  │  │ - Button Controls (New Game, Stats)                        │   │    │
│  │  │ - Real-time Updates                                        │   │    │
│  │  └───────────────┬──────────────────────────────────────────┘   │    │
│  │                  │ JavaScript HTTP Requests                      │    │
│  │                  ▼                                               │    │
│  │  ┌─────────────────────────────────────────────────────────────┐   │    │
│  │  │ LSL HUD Controller Script (hud_controller.lsl)              │   │    │
│  │  │ - HTTP Request Manager                                      │   │    │
│  │  │ - Local Game State Cache                                    │   │    │
│  │  │ - Event Handling                                            │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └────────────────────────┬─────────────────────────────────────────────┘    │
└─────────────────────────────┼──────────────────────────────────────────────────┘
                              │ HTTPS REST API
                              │ (Port 443)
                              ▼
         ┌────────────────────────────────────────┐
         │      RENDER.COM DEPLOYMENT             │
         │  ┌──────────────────────────────────┐  │
         │  │ Node.js/Express Backend          │  │
         │  │ (Port 3000)                      │  │
         │  ├──────────────────────────────────┤  │
         │  │ API Routes                       │  │
         │  │ - /api/games/*                   │  │
         │  │ - /api/players/*                 │  │
         │  │ - /api/leaderboard/*             │  │
         │  ├──────────────────────────────────┤  │
         │  │ Game Engine                      │  │
         │  │ - TicTacToe Class                │  │
         │  │ - Minimax AI Algorithm           │  │
         │  ├──────────────────────────────────┤  │
         │  │ Service Layer                    │  │
         │  │ - Player Management              │  │
         │  │ - Stats Tracking                 │  │
         │  └──────┬───────────────────────────┘  │
         └─────────┼────────────────────────────────┘
                   │ PostgreSQL Driver (Port 5432)
                   ▼
         ┌────────────────────────────────────────┐
         │     POSTGRESQL DATABASE                │
         │  ┌──────────────────────────────────┐  │
         │  │ players                          │  │
         │  │ - id, uuid, display_name         │  │
         │  ├──────────────────────────────────┤  │
         │  │ game_stats                       │  │
         │  │ - player_id, wins, losses, etc.  │  │
         │  ├──────────────────────────────────┤  │
         │  │ games                            │  │
         │  │ - game history & moves           │  │
         │  └──────────────────────────────────┘  │
         └────────────────────────────────────────┘
```

## Data Flow

### New Game Flow

```
1. Player clicks "New Game" in MOAP
2. JavaScript sends: POST /api/games/start
3. Backend creates TicTacToe instance
4. Backend creates player record if new
5. Backend stores session in memory
6. Response: sessionId + initial board state
7. JavaScript displays empty 3x3 board
8. Player ready to play
```

### Move Submission Flow

```
1. Player clicks board cell (position 0-8)
2. JavaScript sends: POST /api/games/move
3. Backend validates move
4. TicTacToe.makeMove(position) executes
5. Backend checks for win/draw
6. If game not over, getAIMove() called
7. Minimax algorithm finds best move
8. TicTacToe.makeMove(aiMove) executes
9. Backend checks for win/draw again
10. Response: updated board + game state
11. JavaScript updates display
12. Repeat from step 1 if game continues
```

### Game End Flow

```
1. Game reaches win/loss/draw condition
2. Player or system calls: POST /api/games/end
3. Backend calculates game duration
4. Backend extracts move history
5. Backend calls saveGameResult()
6. Database transaction:
   - INSERT game record
   - UPDATE game_stats for player
   - COMMIT
7. Session cleaned from memory
8. Response: success confirmation
9. JavaScript shows result message
10. Player can start new game
```

### Stats Display Flow

```
1. Player clicks "Stats" or game loads
2. JavaScript sends: GET /api/players/{uuid}/stats
3. Backend queries game_stats table
4. Database joins player + stats data
5. Response: all statistics
6. JavaScript displays:
   - Total Games
   - Win/Loss/Draw counts
   - Last played date
   - Win percentage
```

## API Reference

### Authentication
Currently uses Second Life UUID for identification. No token-based auth implemented.

### Base URL
```
https://your-render-backend.onrender.com
```

### Error Responses

All errors follow this format:

```json
{
  "error": "Error description"
}
```

HTTP Status Codes:
- `200`: Success
- `400`: Bad Request (invalid input)
- `404`: Not Found (session/player doesn't exist)
- `500`: Server Error

### Endpoint Specifications

#### 1. Start New Game

```http
POST /api/games/start
Content-Type: application/json

Request:
{
  "playerUUID": "UUID string (36 chars)",
  "playerName": "Player Display Name"
}

Response (200):
{
  "sessionId": "string",
  "gameState": {
    "board": [null, null, null, ...],
    "currentPlayer": "X" | "O",
    "gameOver": false,
    "winner": null | "X" | "O" | "draw",
    "moves": []
  },
  "player": {
    "id": number,
    "uuid": "string",
    "display_name": "string"
  }
}

Errors:
- 400: playerUUID or playerName missing
- 500: Database connection error
```

#### 2. Make a Move

```http
POST /api/games/move
Content-Type: application/json

Request:
{
  "sessionId": "string from /games/start",
  "position": 0-8  // 0=top-left, 8=bottom-right
}

Response (200):
{
  "gameState": {
    "board": [...],
    "currentPlayer": "X" | "O",
    "gameOver": boolean,
    "winner": null | "X" | "O" | "draw",
    "moves": [array of positions]
  },
  "gameOver": boolean,
  "winner": null | "X" | "O" | "draw"
}

Errors:
- 400: sessionId or position missing
- 400: Invalid position (not 0-8)
- 400: Position already taken
- 400: Invalid move (outside game constraints)
- 404: Session not found (expired)
- 500: Game logic error
```

#### 3. End Game

```http
POST /api/games/end
Content-Type: application/json

Request:
{
  "sessionId": "string from /games/start",
  "result": "win" | "loss" | "draw"
}

Response (200):
{
  "success": true,
  "message": "Game result saved"
}

Errors:
- 400: sessionId or result missing
- 404: Session not found
- 500: Database error
```

#### 4. Get Player Stats

```http
GET /api/players/{playerUUID}/stats

Response (200):
{
  "player": {
    "id": number,
    "uuid": "string",
    "display_name": "string",
    "created_at": "ISO-8601 date",
    "updated_at": "ISO-8601 date"
  },
  "stats": {
    "id": number,
    "player_id": number,
    "total_games_played": number,
    "total_wins": number,
    "total_losses": number,
    "total_draws": number,
    "last_played_date": "ISO-8601 date" | null,
    "created_at": "ISO-8601 date",
    "updated_at": "ISO-8601 date"
  }
}

Errors:
- 404: Player not found
- 500: Database error
```

#### 5. Get Top Players

```http
GET /api/leaderboard/top-wins?limit=10

Query Parameters:
- limit: number (1-100, default 10)

Response (200):
{
  "leaderboard": [
    {
      "player": {...},
      "stats": {...}
    },
    ...
  ],
  "limit": number
}

Errors:
- 500: Database error
```

#### 6. Get All Players

```http
GET /api/leaderboard/all

Response (200):
{
  "players": [
    {
      "player": {...},
      "stats": {...}
    },
    ...
  ],
  "total": number
}

Errors:
- 500: Database error
```

#### 7. Health Check

```http
GET /api/health

Response (200):
{
  "status": "ok",
  "timestamp": "ISO-8601 date"
}

Always returns 200 unless server is down
```

## Database Schema Details

### players Table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | Auto-increment |
| uuid | VARCHAR(36) | UNIQUE NOT NULL | Second Life UUID |
| display_name | VARCHAR(255) | NOT NULL | Player name |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

### game_stats Table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | Auto-increment |
| player_id | INTEGER | FK NOT NULL | References players |
| total_games_played | INTEGER | DEFAULT 0 | Cumulative games |
| total_wins | INTEGER | DEFAULT 0 | Cumulative wins |
| total_losses | INTEGER | DEFAULT 0 | Cumulative losses |
| total_draws | INTEGER | DEFAULT 0 | Cumulative draws |
| last_played_date | TIMESTAMP | NULLABLE | Last game timestamp |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

### games Table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | Auto-increment |
| player_id | INTEGER | FK NOT NULL | References players |
| game_type | VARCHAR(50) | DEFAULT 'tic_tac_toe' | Game name |
| result | VARCHAR(20) | NULLABLE | 'win', 'loss', 'draw' |
| moves_played | INTEGER | NULLABLE | Total moves in game |
| game_duration_seconds | INTEGER | NULLABLE | Game length in seconds |
| player_moves | TEXT | NULLABLE | JSON array of moves |
| ai_moves | TEXT | NULLABLE | JSON array of moves |
| final_board_state | TEXT | NULLABLE | JSON of final board |
| created_at | TIMESTAMP | DEFAULT NOW() | Game start |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

## Tic Tac Toe Game Logic

### Board Representation

Positions 0-8 mapped to grid:

```
0 | 1 | 2
---------
3 | 4 | 5
---------
6 | 7 | 8
```

Stored as: `[null|"X"|"O", null|"X"|"O", ...]`

### Win Conditions

Checked after each move:

```javascript
const winPatterns = [
  [0, 1, 2],  // Top row
  [3, 4, 5],  // Middle row
  [6, 7, 8],  // Bottom row
  [0, 3, 6],  // Left column
  [1, 4, 7],  // Middle column
  [2, 5, 8],  // Right column
  [0, 4, 8],  // Diagonal \
  [2, 4, 6]   // Diagonal /
];
```

### AI Algorithm

**Minimax with Alpha-Beta Pruning (Planned)**

Current implementation:
1. Evaluate current board state
2. Try all possible AI moves
3. For each move, recursively evaluate
4. Score: +10 (AI win) / -10 (player win) / 0 (draw)
5. Return move with highest score

Depth adjustment:
- Faster wins preferred: `10 - depth`
- Slower losses accepted: `depth - 10`

### Game States

1. **ACTIVE**: Game in progress, waiting for player move
2. **AI_TURN**: AI calculating move
3. **GAME_OVER_WIN**: Player won
4. **GAME_OVER_LOSS**: AI won
5. **GAME_OVER_DRAW**: Board full, no winner

## Session Management

### Session Storage (In-Memory)

```typescript
{
  sessionId: {
    game: TicTacToe,      // Game instance
    startTime: timestamp,  // When game started
    playerUUID: string,    // Player identifier
    playerId: number       // Database player ID
  }
}
```

### Session Lifecycle

1. Created when player starts game
2. Destroyed when game ends
3. Auto-cleanup after 1 hour idle

### Concurrency

- Each player can have 1 active session
- Multiple players simultaneous = multiple sessions
- Thread-safe: Node.js event loop handles concurrency

## Performance Considerations

### Database Optimization

- Connection pooling: 10 max connections
- Indices on: `uuid`, `player_id`, `created_at`
- Parameterized queries prevent SQL injection
- Connection reuse reduces overhead

### API Optimization

- Sessions in memory (fast lookup)
- Lazy loading of stats (only when requested)
- Caching of leaderboard (could implement)
- Efficient minimax (no unnecessary recursion)

### Scaling Strategy

- Horizontal: Add more backend instances
- Vertical: Increase database resources
- Caching: Implement Redis for sessions
- Async: Process game history asynchronously

## Error Handling

### Validation

```
1. Input type checking
2. Range validation (positions 0-8)
3. UUID format validation
4. SQL injection prevention
```

### Error Responses

```json
{
  "error": "Descriptive error message"
}
```

Never includes:
- Stack traces
- Database queries
- Internal paths
- Security details

## Testing

### Unit Tests

Test TicTacToe logic:

```typescript
const game = new TicTacToe();
game.makeMove(0); // Player X at top-left
const aiMove = game.getAIMove(); // AI calculates
game.makeMove(aiMove); // AI makes move
```

### Integration Tests

```bash
# Health check
curl http://localhost:3000/api/health

# Full game flow
# 1. POST /games/start
# 2. POST /games/move (multiple times)
# 3. POST /games/end
# 4. GET /players/:uuid/stats
```

### Load Testing

```bash
# Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/health

# Siege
siege -u http://localhost:3000/api/health -n 1000 -c 10
```

## Deployment Checklist

- [ ] Environment variables set in Render
- [ ] Database URL correct and tested
- [ ] Schema migrations run
- [ ] Backend builds successfully
- [ ] Health endpoint responds
- [ ] HTTPS certificate valid
- [ ] CORS configured properly
- [ ] Error handling working
- [ ] Database backups enabled
- [ ] Monitoring/logging configured

---

**Architecture Version**: 1.0  
**Last Updated**: 2024  
**Status**: Production Ready
