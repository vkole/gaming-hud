# Local Development Setup

Quick guide to run the entire system locally for development and testing.

## Requirements

- **Node.js**: 18.x or higher ([Download](https://nodejs.org/))
- **PostgreSQL**: 12+ ([Download](https://www.postgresql.org/download/))
- **Git**: For version control ([Download](https://git-scm.com/))
- **Code Editor**: VS Code recommended ([Download](https://code.visualstudio.com/))

## Installation

### 1. Install PostgreSQL

**Windows:**
1. Download installer from https://www.postgresql.org/download/windows/
2. Run installer
3. Note the superuser password you set
4. Keep default port (5432)
5. Accept pgAdmin4 installation (helpful for management)

**macOS:**
```bash
brew install postgresql
```

**Linux (Ubuntu):**
```bash
sudo apt-get install postgresql postgresql-contrib
```

### 2. Create Local Database

**Windows (Command Prompt):**
```bash
# Open PostgreSQL command prompt
createdb gaming_hud

# Verify it was created
psql -l
```

**macOS/Linux (Terminal):**
```bash
createdb gaming_hud

# Verify
psql -l
```

### 3. Initialize Database Schema

**Windows:**
```bash
# From the project root directory
psql -U postgres -d gaming_hud -f database/schema.sql
```

**macOS/Linux:**
```bash
psql gaming_hud < database/schema.sql
```

**Or manually:**
```bash
# Start PostgreSQL client
psql -U postgres -d gaming_hud

# Paste contents of database/schema.sql
# Then: \q to exit
```

### 4. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env file
# Change DATABASE_URL to: postgresql://postgres:your_password@localhost:5432/gaming_hud
```

**Edit `.backend/.env`:**
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/gaming_hud
NODE_ENV=development
PORT=3000
```

### 5. Start Backend

**Option A: Development Mode (Auto-reload)**
```bash
cd backend
npm run dev
```

**Option B: Production Mode**
```bash
cd backend
npm run build
npm start
```

Expected output:
```
Gaming MOAP HUD Backend running on port 3000
Environment: development
```

### 6. Test Backend

Open a new terminal:

```bash
# Health check
curl http://localhost:3000/api/health

# Should return:
# {"status":"ok","timestamp":"2024-..."}
```

## Testing the Full System

### Test 1: Create Player

```bash
curl -X POST http://localhost:3000/api/games/start \
  -H "Content-Type: application/json" \
  -d '{
    "playerUUID": "12345678-1234-1234-1234-123456789012",
    "playerName": "TestPlayer"
  }'
```

Save the `sessionId` from response.

### Test 2: Make a Move

Replace `SESSION_ID_HERE` with the sessionId from Test 1:

```bash
curl -X POST http://localhost:3000/api/games/move \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID_HERE",
    "position": 4
  }'
```

Should return updated board with AI move.

### Test 3: Complete a Game

```bash
curl -X POST http://localhost:3000/api/games/end \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "SESSION_ID_HERE",
    "result": "draw"
  }'
```

### Test 4: Check Stats

```bash
curl http://localhost:3000/api/players/12345678-1234-1234-1234-123456789012/stats
```

### Test 5: View Leaderboard

```bash
curl http://localhost:3000/api/leaderboard/all
```

## Frontend Testing

### Open Web Interface Locally

Since the HTML files need to connect to the backend, you can:

**Option A: Use Python's built-in server (recommended)**

```bash
# From frontend directory
python -m http.server 8000

# Or Python 2:
python -m SimpleHTTPServer 8000

# Open browser: http://localhost:8000/hud.html
```

**Option B: Use Node's http-server**

```bash
npm install -g http-server

# From frontend directory
http-server

# Open browser: http://localhost:8080/hud.html
```

**Option C: Use VS Code Live Server**

1. Install "Live Server" extension in VS Code
2. Right-click hud.html → "Open with Live Server"
3. Browser opens automatically

### Update Frontend Configuration

Edit `frontend/hud.html` and `frontend/admin-stats.html`:

Change:
```javascript
const BACKEND_URL = 'https://your-render-app.onrender.com';
```

To:
```javascript
const BACKEND_URL = 'http://localhost:3000';
```

## Running Everything Together

### Terminal 1: Database (if needed)

```bash
# Usually runs as a service, but can start manually if needed
postgres -D /usr/local/var/postgres

# Or on Windows:
# PostgreSQL runs as Windows Service - manage via Services app
```

### Terminal 2: Backend

```bash
cd backend
npm run dev
```

### Terminal 3: Frontend

```bash
cd frontend
python -m http.server 8000
```

### Access Points

- **HUD Interface**: http://localhost:8000/hud.html
- **Admin Dashboard**: http://localhost:8000/admin-stats.html
- **API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health

## Development Workflow

### 1. Make Changes

Edit files in `backend/src/` or `frontend/`

### 2. Rebuild (if TypeScript)

```bash
# Backend auto-reloads in dev mode
# Or manually rebuild:
cd backend
npm run build
```

### 3. Test Changes

```bash
# Test affected endpoint
curl http://localhost:3000/api/endpoint

# Or reload frontend in browser
```

### 4. Check Logs

Backend console shows:
- Requests: `GET /api/endpoint`
- Errors: Stack traces
- Database queries: Connection info

## Debugging

### Enable Debug Output

**Backend Debug:**

Edit `backend/src/index.ts` and add:

```typescript
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, req.body);
  next();
});
```

**Frontend Debug:**

Open browser DevTools (F12):
- Console tab: See JavaScript errors
- Network tab: See API requests
- Application tab: See local storage

### Debug Database

```bash
# Connect to database
psql -U postgres -d gaming_hud

# List tables
\dt

# View all players
SELECT * FROM players;

# View game stats
SELECT p.display_name, gs.* FROM game_stats gs
JOIN players p ON gs.player_id = p.id;

# Exit
\q
```

### Stop Everything

```bash
# In backend terminal:
Ctrl+C

# In frontend terminal (if running):
Ctrl+C

# Database (usually automatic):
# PostgreSQL service continues in background
```

## Troubleshooting

### "Database does not exist"

```bash
# Recreate database
createdb gaming_hud

# Run schema
psql -U postgres -d gaming_hud -f database/schema.sql
```

### "Cannot find module..."

```bash
# In backend directory
npm install
```

### "Port 3000 already in use"

```bash
# Windows: Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Or use different port:
# Edit .env: PORT=3001
```

### Backend won't connect to database

Check `DATABASE_URL` format:
```
postgresql://username:password@localhost:5432/database_name
```

Examples:
- Windows superuser: `postgresql://postgres:password123@localhost:5432/gaming_hud`
- No password: `postgresql://user@localhost:5432/gaming_hud`

### Frontend can't connect to backend

1. Verify backend is running: `curl http://localhost:3000/api/health`
2. Check `BACKEND_URL` in frontend files
3. Ensure both are on localhost
4. Check browser console for CORS errors

## Performance Optimization

### Local Development

```bash
# Monitor CPU/Memory usage
# On Windows (PowerShell):
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Format-List

# On macOS/Linux:
top -p $(pgrep -f "node")
```

### Database Optimization

```bash
# Check query performance
EXPLAIN ANALYZE SELECT * FROM game_stats WHERE player_id = 1;

# Rebuild indices
REINDEX TABLE game_stats;
```

## Next Steps

1. ✅ Install prerequisites
2. ✅ Set up local database
3. ✅ Start backend server
4. ✅ Test API endpoints
5. ✅ Open frontend in browser
6. ✅ Play a test game
7. ✅ Check admin dashboard
8. Ready to deploy!

## Common Commands Reference

```bash
# Backend
npm install          # Install dependencies
npm run dev          # Start with auto-reload
npm run build        # Build TypeScript
npm start            # Run built version

# Database
psql                 # Connect to PostgreSQL
createdb NAME        # Create database
dropdb NAME          # Delete database
psql -l              # List all databases

# Git
git status           # Check current status
git add .            # Stage all changes
git commit -m "msg"  # Commit changes
git push             # Push to remote
```

## Resources

- **Node.js Docs**: https://nodejs.org/docs/
- **Express.js Docs**: https://expressjs.com/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **TypeScript Docs**: https://www.typescriptlang.org/docs/
- **Render Docs**: https://render.com/docs

---

**Happy Developing! 🚀**
