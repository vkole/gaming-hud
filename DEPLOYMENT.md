# Gaming MOAP HUD - Complete Deployment Guide

## Overview
This system creates a Tic Tac Toe gaming HUD for Second Life that communicates with a secure backend API running on Render with a PostgreSQL database.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Second Life                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  MOAP HUD (HTML Interface)                              │    │
│  │  - Displays 3x3 Tic Tac Toe board                       │    │
│  │  - Shows player stats                                   │    │
│  └──────────────────┬──────────────────────────────────────┘    │
│                     │ HTTP REST API                             │
│  ┌──────────────────▼──────────────────────────────────────┐    │
│  │  LSL HUD Controller Script                              │    │
│  │  - Handles HTTP requests                                │    │
│  │  - Manages game state locally                           │    │
│  └──────────────────┬──────────────────────────────────────┘    │
└─────────────────────┼──────────────────────────────────────────┘
                      │
                      │ HTTPS
                      ▼
          ┌─────────────────────────┐
          │   Render.com            │
          │   Node.js/Express API   │
          │   - Game Logic          │
          │   - Player Management   │
          └────────────┬────────────┘
                       │
                       ▼
          ┌─────────────────────────┐
          │  PostgreSQL Database    │
          │  - Player Stats         │
          │  - Game History         │
          └─────────────────────────┘
```

## Prerequisites

### Local Development
- Node.js 18+ and npm
- PostgreSQL 12+
- Git
- Code editor (VS Code recommended)

### Deployment
- Render.com account (free tier available)
- GitHub account (to connect repository)

## Installation Steps

### 1. Local Database Setup

#### Windows (PostgreSQL Installation)
```bash
# Install PostgreSQL from https://www.postgresql.org/download/windows/
# During installation:
# - Set superuser password
# - Keep default port (5432)
# - Install pgAdmin4 for management (optional)

# After installation, open PostgreSQL command prompt and create database:
createdb gaming_hud
```

#### Alternative: Use Supabase (Cloud PostgreSQL)
```
1. Go to https://supabase.com
2. Click "Start your project"
3. Create a new project
4. Wait for provisioning
5. Go to Project Settings > Database > Connection String
6. Copy the connection string (this is your DATABASE_URL)
```

### 2. Initialize Database Schema

```bash
# Connect to your database and run the schema
psql -U postgres -d gaming_hud -f database/schema.sql

# Or if using Supabase, run the SQL queries in the Supabase SQL editor
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and set your DATABASE_URL
# For local PostgreSQL:
# DATABASE_URL=postgresql://postgres:your_password@localhost:5432/gaming_hud
# For Supabase:
# DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]

# Build TypeScript
npm run build

# Run locally
npm start

# Or run in development mode with auto-reload
npm run dev
```

The backend should start on http://localhost:3000

### 4. Test the API

```bash
# Start a new game
curl -X POST http://localhost:3000/api/games/start \
  -H "Content-Type: application/json" \
  -d '{
    "playerUUID": "12345678-1234-1234-1234-123456789012",
    "playerName": "TestPlayer"
  }'

# Check health
curl http://localhost:3000/api/health

# View stats
curl http://localhost:3000/api/leaderboard/all
```

### 5. Deploy to Render

#### Option A: Using render.yaml (Recommended)

```bash
# 1. Push your code to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/gaming-moap-hud.git
git branch -M main
git push -u origin main

# 2. Go to https://render.com and sign up/log in

# 3. Click "New +" button > "Web Service"

# 4. Connect your GitHub repository

# 5. Select the repository you just created

# 6. Fill in the settings:
#    - Name: gaming-hud-backend
#    - Environment: Node
#    - Build Command: npm install && npm run build
#    - Start Command: npm start

# 7. Under "Advanced", add environment variables:
#    - NODE_ENV: production
#    - DATABASE_URL: your_supabase_connection_string

# 8. Click "Create Web Service"
```

#### Option B: Manual Render Setup

```bash
# 1. Go to https://render.com/dashboard

# 2. Create PostgreSQL Database:
#    - Click "New +" > "PostgreSQL"
#    - Name: gaming_hud_db
#    - Location: Oregon (closest to you)
#    - Click "Create Database"
#    - Wait for provisioning
#    - Copy the "Internal Database URL"

# 3. Create Web Service:
#    - Click "New +" > "Web Service"
#    - Paste your GitHub repository URL
#    - Set name: gaming-hud-backend
#    - Environment: Node
#    - Build Command: npm install && npm run build
#    - Start Command: npm start
#    - Region: Oregon (or closest to your database)

# 4. Environment Variables:
#    - NODE_ENV: production
#    - DATABASE_URL: paste the Internal Database URL from step 2

# 5. Click "Create Web Service"
```

#### Run Database Migrations on Render

```bash
# 1. Get the External Database URL from your Render PostgreSQL instance

# 2. Connect and run schema:
psql <External_Database_URL> -f database/schema.sql

# Or manually copy-paste the SQL into Render's database browser
```

### 6. Second Life HUD Setup

#### Create the MOAP Prim

```
1. In Second Life, create a cube prim
2. Resize it to your preferred HUD size (128x128m recommended)
3. Name it "Gaming HUD Display"
4. Add to a linkset if desired
```

#### Set Up MOAP (Media on a Prim)

```
1. Right-click the prim > Edit
2. Go to Texture tab
3. Click "Media" button on bottom right
4. Click "Add"
5. In the media details:
   - Home URL: https://your-render-app.onrender.com/api/hud
   - Width: 1024
   - Height: 1024
   - Click OK
6. Uncheck "Whitelist" to allow all visitors
```

#### Add the LSL Script

```
1. Right-click the prim > Edit
2. Go to Content tab
3. Click "New Script"
4. Replace default code with: lsl-hud/hud_controller.lsl
5. Update BACKEND_URL in the script to your Render URL
6. Save
```

#### Load the HTML Interface

The MOAP will automatically load the HTML interface. Players can interact with:
- **New Game** button to start playing
- **Stats** button to view their statistics
- Click board cells to make moves
- AI automatically responds

## Environment Variables for Production

### Render Environment Variables

```
NODE_ENV              = production
PORT                  = 3000 (automatically set by Render)
DATABASE_URL          = postgresql://user:pass@host:port/database
```

**Important**: Never hardcode the DATABASE_URL in code. Always use environment variables.

## API Endpoints

### Games

#### Start a Game
```
POST /api/games/start
Body: {
  "playerUUID": "uuid-string",
  "playerName": "Player Name"
}
Response: {
  "sessionId": "session-uuid",
  "gameState": { board, currentPlayer, gameOver, winner, moves },
  "player": { id, uuid, display_name }
}
```

#### Make a Move
```
POST /api/games/move
Body: {
  "sessionId": "session-uuid",
  "position": 0-8
}
Response: {
  "gameState": { board, currentPlayer, gameOver, winner, moves },
  "gameOver": boolean,
  "winner": "X" | "O" | "draw"
}
```

#### End a Game
```
POST /api/games/end
Body: {
  "sessionId": "session-uuid",
  "result": "win" | "loss" | "draw"
}
Response: {
  "success": true,
  "message": "Game result saved"
}
```

### Player Stats

#### Get Player Stats
```
GET /api/players/{playerUUID}/stats
Response: {
  "player": { id, uuid, display_name, created_at, updated_at },
  "stats": {
    id, player_id, total_games_played, total_wins, total_losses,
    total_draws, last_played_date, created_at, updated_at
  }
}
```

### Leaderboards

#### Top Players by Wins
```
GET /api/leaderboard/top-wins?limit=10
Response: {
  "leaderboard": [ { player, stats }, ... ],
  "limit": 10
}
```

#### All Players
```
GET /api/leaderboard/all
Response: {
  "players": [ { player, stats }, ... ],
  "total": number
}
```

### Health

#### Health Check
```
GET /api/health
Response: {
  "status": "ok",
  "timestamp": "ISO-8601-date"
}
```

## Monitoring & Maintenance

### View Logs on Render

1. Go to your service dashboard on Render
2. Click on "Logs" tab
3. Scroll to view real-time logs

### Database Backups

On Render, daily automated backups are created. To restore:

1. Go to your PostgreSQL instance
2. Click "Backups"
3. Select backup date
4. Click "Restore"

### Performance Tips

- Session cleanup: Sessions auto-expire after 1 hour
- Use connection pooling (already configured)
- Monitor database query performance
- Consider Redis for scaling active sessions

## Troubleshooting

### Backend not connecting to database
- Verify DATABASE_URL is correct
- Check firewall/IP whitelist on PostgreSQL
- Ensure all migrations have run
- Check Render logs for specific error

### MOAP not displaying
- Verify backend URL is correct and public
- Check browser console for errors (use web inspector)
- Ensure MOAP URL is in "Whitelist" or "Whitelist is disabled"
- Restart Second Life if needed

### AI not responding
- Check backend logs for errors
- Verify game state is correct
- Test minimax algorithm with curl

### Database connection issues
- Connection string format: `postgresql://user:password@host:port/database`
- Ensure password is URL-encoded
- Check Render PostgreSQL status page

## Security Considerations

1. **Database Credentials**: Never commit .env to git
2. **HTTPS**: Always use HTTPS URLs in production
3. **CORS**: Currently allows all origins - restrict as needed
4. **Input Validation**: All inputs are validated
5. **Rate Limiting**: Consider adding rate limiting for production
6. **Player UUIDs**: Use only official Second Life UUIDs

## File Structure

```
gaming-moap-hud/
├── backend/                    # Node.js Express backend
│   ├── src/
│   │   ├── index.ts           # Main server
│   │   ├── db.ts              # Database connection
│   │   ├── tictactoe.ts       # Game logic
│   │   ├── playerService.ts   # Database operations
│   │   └── routes.ts          # API routes
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── dist/                  # Compiled output
├── frontend/                  # HTML/JavaScript interfaces
│   ├── hud.html              # MOAP HUD interface
│   └── admin-stats.html      # Admin dashboard
├── lsl-hud/                  # Second Life scripts
│   └── hud_controller.lsl    # Main HUD script
├── database/                 # Database setup
│   └── schema.sql            # PostgreSQL schema
├── render.yaml              # Render deployment config
└── DEPLOYMENT.md            # This file
```

## Support & Next Steps

1. **Testing**: Thoroughly test in-world before production
2. **Scaling**: For more games, consider load balancing on Render
3. **Additional Games**: The system is designed for expansion
4. **Analytics**: Add more detailed stats tracking as needed
5. **Monetization**: Consider token rewards or premium features

## License

This project is provided as-is for gaming purposes in Second Life.

## Contact

For issues, questions, or contributions, refer to your documentation or support channels.
