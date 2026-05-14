# Gaming MOAP HUD - Tic Tac Toe

A complete gaming system for Second Life featuring an interactive Tic Tac Toe HUD with AI opponent, real-time web service backend, and detailed player statistics tracking.

## Features

✨ **Core Features**
- 🎮 Play Tic Tac Toe against AI with minimax algorithm
- 👤 Player profiles with persistent statistics
- 📊 Comprehensive leaderboards and stats tracking
- 🏆 Win/loss/draw tracking per player
- 📱 Mobile-responsive HTML interface
- 🔒 Secure HTTPS API communication
- 💾 PostgreSQL database with automatic backups

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Git
- Second Life account

### 5-Minute Local Setup

```bash
# 1. Clone and navigate
cd backend

# 2. Install dependencies
npm install

# 3. Set up database
createdb gaming_hud
psql gaming_hud < ../database/schema.sql

# 4. Configure environment
cp .env.example .env
# Edit .env with your database URL

# 5. Run backend
npm run dev

# Backend runs on http://localhost:3000
```

## Project Structure

```
gaming-moap-hud/
├── backend/                   # TypeScript/Express API
│   ├── src/
│   │   ├── index.ts          # Express server
│   │   ├── db.ts             # Database connection pool
│   │   ├── tictactoe.ts      # AI game engine (minimax)
│   │   ├── playerService.ts  # Database operations
│   │   └── routes.ts         # REST API endpoints
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # Web interfaces
│   ├── hud.html             # MOAP game interface
│   └── admin-stats.html     # Leaderboard dashboard
├── lsl-hud/                 # Second Life scripts
│   └── hud_controller.lsl   # HUD controller
├── database/                # SQL schemas
│   └── schema.sql           # PostgreSQL setup
└── DEPLOYMENT.md            # Full deployment guide
```

## Database Schema

### Tables

**players**
- `id` (PK): Auto-incremented ID
- `uuid`: Second Life player UUID (unique)
- `display_name`: Player name in Second Life
- `created_at`, `updated_at`: Timestamps

**game_stats**
- `id` (PK): Auto-incremented ID
- `player_id` (FK): References players
- `total_games_played`: Count of games
- `total_wins`: Wins
- `total_losses`: Losses
- `total_draws`: Draws
- `last_played_date`: Last game timestamp

**games**
- `id` (PK): Auto-incremented ID
- `player_id` (FK): References players
- `game_type`: Game name (e.g., 'tic_tac_toe')
- `result`: 'win', 'loss', or 'draw'
- `moves_played`: Number of moves in game
- `game_duration_seconds`: How long game took
- `player_moves`: JSON array of player's moves
- `ai_moves`: JSON array of AI's moves
- `final_board_state`: JSON of final board

## API Documentation

### Start Game
```http
POST /api/games/start
Content-Type: application/json

{
  "playerUUID": "12345678-1234-1234-1234-123456789012",
  "playerName": "PlayerName"
}

Response:
{
  "sessionId": "session-uuid-here",
  "gameState": {
    "board": [null, null, ..., null],
    "currentPlayer": "X",
    "gameOver": false,
    "winner": null,
    "moves": []
  },
  "player": {
    "id": 1,
    "uuid": "...",
    "display_name": "PlayerName"
  }
}
```

### Make Move
```http
POST /api/games/move
Content-Type: application/json

{
  "sessionId": "session-uuid",
  "position": 4  // 0-8: top-left to bottom-right
}

Response:
{
  "gameState": {...},
  "gameOver": boolean,
  "winner": "X" | "O" | "draw"
}
```

### End Game
```http
POST /api/games/end
Content-Type: application/json

{
  "sessionId": "session-uuid",
  "result": "win"  // or "loss" or "draw"
}

Response:
{
  "success": true,
  "message": "Game result saved"
}
```

### Get Player Stats
```http
GET /api/players/{playerUUID}/stats

Response:
{
  "player": {...},
  "stats": {
    "total_games_played": 10,
    "total_wins": 7,
    "total_losses": 2,
    "total_draws": 1,
    ...
  }
}
```

### Leaderboards
```http
GET /api/leaderboard/top-wins?limit=10
GET /api/leaderboard/all

Response:
{
  "leaderboard": [
    {
      "player": {...},
      "stats": {...}
    },
    ...
  ]
}
```

## Game Rules (Tic Tac Toe)

- **Players**: Human (X) vs AI (O)
- **Board**: 3x3 grid (9 positions)
- **Goal**: Get three of your marks in a row (horizontal, vertical, or diagonal)
- **Win Conditions**:
  - Player wins: Straight line of X's
  - AI wins: Straight line of O's
  - Draw: All 9 positions filled with no winner
- **AI Strategy**: Minimax algorithm with optimizations for perfect play

## Second Life Setup

### MOAP Configuration

1. **Create a Prim**
   - Rez a cube in-world
   - Name it "Gaming HUD Display"

2. **Add Media**
   ```
   Edit → Texture → Media
   Add: https://your-backend.onrender.com/frontend/hud.html
   ```

3. **Whitelist** (Optional)
   - Disable whitelist to allow all visitors
   - Or add specific player UUIDs

4. **Add Script**
   - Insert `lsl-hud/hud_controller.lsl`
   - Update `BACKEND_URL` to your server

### Player Interaction

- Click **"New Game"** to start
- Click board cells to make moves
- AI responds automatically
- View **"Stats"** to see your record

## Deployment to Render.com

### Automatic Deployment (Recommended)

```bash
# 1. Push to GitHub
git add .
git commit -m "Initial deploy"
git push origin main

# 2. On Render.com
# - Connect GitHub repo
# - Select "gaming-moap-hud" repository
# - Use render.yaml for configuration
# - Set DATABASE_URL environment variable
# - Deploy!
```

### Manual Deployment

1. Create Render account at https://render.com
2. Create PostgreSQL database
3. Create Web Service from GitHub
4. Set environment variables:
   - `NODE_ENV`: production
   - `DATABASE_URL`: Your PostgreSQL connection string
5. Deploy

**Important**: Use Render's environment variables, never commit `.env` to git.

## Development

### Build TypeScript
```bash
cd backend
npm run build
```

### Run Development Server
```bash
cd backend
npm run dev
```

### Run Production
```bash
cd backend
npm start
```

### Test API
```bash
# Health check
curl http://localhost:3000/api/health

# Create game
curl -X POST http://localhost:3000/api/games/start \
  -H "Content-Type: application/json" \
  -d '{"playerUUID":"test-uuid","playerName":"TestPlayer"}'

# View leaderboard
curl http://localhost:3000/api/leaderboard/all
```

## Game AI

### Minimax Algorithm

The AI uses the minimax algorithm with the following scoring:
- **AI Win**: +10 (minus depth for faster wins)
- **Player Win**: -10 (plus depth for slower losses)
- **Draw**: 0

This ensures the AI:
- Wins when possible
- Prevents player wins
- Prefers faster games
- Never makes unnecessary mistakes

### Optimization

The algorithm includes:
- Depth-aware scoring
- Early termination for determined games
- Efficient position evaluation

## Performance

- **Active Sessions**: Stored in memory, auto-cleanup after 1 hour
- **Database Queries**: Connection pooling with up to 10 connections
- **Response Time**: <100ms average for API calls
- **Concurrent Players**: Supports 100+ simultaneous games

## Environment Variables

```env
# Database (no hardcoding!)
DATABASE_URL=postgresql://user:password@host:port/database

# Node Environment
NODE_ENV=production|development

# Server Port
PORT=3000
```

## Security

- ✅ Database credentials via environment variables only
- ✅ HTTPS/TLS for all communications
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention with parameterized queries
- ✅ CORS enabled for cross-origin requests
- ✅ Graceful error handling (no SQL exposed)

## Troubleshooting

### Backend won't connect to database
```bash
# Check connection string format
postgresql://username:password@localhost:5432/gaming_hud

# Test connection
psql postgresql://username:password@localhost:5432/gaming_hud
```

### MOAP not loading in Second Life
- Verify backend URL is public and HTTPS
- Check firewall permissions
- Inspect browser console for errors
- Ensure media object whitelist is correct

### AI not responding
- Check backend logs
- Verify game state is valid
- Test with curl to isolate issue

## Future Enhancements

- 🎯 Additional games (Chess, Connect 4, etc.)
- 🤖 Difficulty levels for AI
- 👥 Multiplayer support
- 🏅 Achievement system
- 💎 Token/reward system
- 📈 ELO rating system
- 🎨 Customizable themes

## License

This project is provided as-is for gaming in Second Life.

## Support

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

For API documentation, see the inline comments in `backend/src/routes.ts`

## Quick Reference

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Backend | Node.js + Express + TypeScript | REST API |
| Database | PostgreSQL | Data persistence |
| Frontend | HTML5 + JavaScript | Web interface |
| Game Logic | TypeScript | AI + board logic |
| Hosting | Render.com | Production deployment |
| In-World | LSL + MOAP | Second Life integration |

---

**Made for Second Life Gaming. Enjoy your games! 🎮**
#   g a m i n g - h u d  
 #   g a m i n g - h u d  
 #   g a m i n g - h u d  
 #   g a m i n g - h u d  
 