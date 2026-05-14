# Second Life MOAP HUD Setup Guide

## What is a MOAP?

MOAP stands for **Media on a Prim**. It allows you to display web content (HTML/JavaScript) on Second Life prims, making interactive web-based experiences in-world.

## Prerequisites

- **Second Life Account**: Active account with building permissions
- **Land**: You need a prim to attach the media to (can be owned or group-owned)
- **Backend URL**: Your deployed Render backend (e.g., https://gaming-hud-backend.onrender.com)

## Step-by-Step Setup

### Step 1: Create a Display Prim

```
1. Open Second Life
2. Find your land or a sandbox
3. Right-click ground → Create → Object
4. A cube will appear
5. Rename it: Right-click → Rename → "Gaming HUD Display"
6. Resize if needed: Edit → Scale to desired size
```

### Step 2: Add Media to the Prim

```
1. Right-click the prim → Edit (or press E while pointing)
2. Click "Texture" tab in Build dialog
3. Scroll down and click "Media" button
4. Click "Add" to add new media layer
```

### Step 3: Configure Media Properties

In the Media popup, set:

```
Home Page URL: https://your-render-backend.onrender.com/frontend/hud.html
Width (px): 1024
Height (px): 1024
Allow Navigation: CHECKED
Allow Others to Control: UNCHECKED
Auto-Play Media: CHECKED
Whitelist Enable: UNCHECKED (or add specific UUIDs)
```

Click "Apply" and close the dialog.

### Step 4: Add the LSL Script

```
1. Right-click the prim → Edit
2. Click "Content" tab
3. Click "New Script"
4. Delete the default code
5. Copy entire contents of: lsl-hud/hud_controller.lsl
6. Paste into the script editor
```

### Step 5: Update Script Configuration

In the script, find these lines and update them:

```lsl
// Configuration
string BACKEND_URL = "https://your-render-app.onrender.com";
```

Replace with your actual Render backend URL.

### Step 6: Save and Test

```
1. Save the script (Ctrl+S or File → Save)
2. Check console for errors (Ctrl+Shift+D for debug console)
3. Navigate to the HUD prim
4. You should see the Tic Tac Toe interface on the prim
5. Test by clicking "New Game"
```

## Troubleshooting

### MOAP Not Loading / Shows Blank

**Problem**: Prim shows white/blank instead of game

**Solutions**:
1. Check your internet connection
2. Verify backend URL is public and accessible
3. Try typing backend URL in web browser first
4. Check Second Life viewer version (update if needed)
5. Disable and re-enable media:
   ```
   Edit → Media → Remove → Add again
   ```

### Getting "Error starting game"

**Problem**: Click "New Game" shows error

**Solutions**:
1. Verify backend is running: Visit `https://your-backend-url/api/health`
2. Check browser console in Second Life:
   - Press Ctrl+Alt+Shift+D (Debug Console)
   - Look for network errors
3. Verify DATABASE_URL is set correctly
4. Check Render logs for backend errors

### Script Errors in Console

**Problem**: LSL script showing errors

**Solutions**:
1. Check BACKEND_URL is spelled correctly
2. Ensure it includes `https://`
3. Check for extra spaces or quotes
4. Restart Second Life
5. Re-save the script

### Performance Issues

**Problem**: Lag, slow response, freezing

**Solutions**:
1. Check your internet speed
2. Reduce prim size or texture resolution
3. Close other applications
4. Check if backend is overloaded (visit `/api/health`)
5. Restart Second Life viewer

## Usage

### Playing a Game

```
1. Click the prim to view the interface
2. Click "New Game" button
3. Click any cell to make your move (X)
4. AI automatically responds (O)
5. Continue until game ends
6. Click "New Game" to play again
```

### Viewing Stats

```
1. In the game HUD, click "Stats" button
2. Your statistics are displayed at bottom:
   - Total Games
   - Wins
   - Losses
   - Draws
3. Stats update after each game
```

## Advanced Configuration

### Hosting on Multiple Prims

You can link multiple prims to create a larger HUD:

```
1. Create all prims and add the same media URL
2. Select all prims: Shift+Click each one
3. Right-click → Link → Link
4. Adjust sizes/positions as needed
```

### Custom Branding

Edit `frontend/hud.html` to customize:
- Colors
- Font sizes
- Button labels
- Theme

Then upload your modified version or host it yourself.

### Adding to a NPC (Advanced)

If you have NPC support:

```
1. Create the HUD display normally
2. In NPC's Lua script, add touch event to activate
3. Script opens the media page for the toucher
```

## Security Considerations

### For Landowners

- **Whitelist Usage**: Consider adding specific UUIDs if concerned about abuse
- **Content Filter**: Some viewers have content filters
- **Performance**: Media uses bandwidth; monitor usage

### For Developers

- **API Key**: Consider adding secret keys for sensitive operations
- **Rate Limiting**: Implemented on backend
- **CORS**: Currently open; restrict if needed

## Performance Tips

1. **Minimize Image Sizes**: Keep graphics <500KB each
2. **Cache**: Browsers cache resources; updates may take time to appear
3. **CDN**: Consider using CDN for faster loading
4. **Database Queries**: Limit to necessary data only

## Known Limitations

| Limitation | Notes |
|-----------|-------|
| WebGL | Not supported in MOAP |
| Audio | Can play but not recommended |
| Popups | Blocked by Second Life |
| File Upload | Not available in MOAP |
| Cookies | Limited storage capacity |
| Geolocation | Not supported |

## Advanced: Custom HTML Interface

To create your own interface:

1. Create HTML file with JavaScript
2. Ensure it calls the API at `https://your-backend-url/api/*`
3. Test locally first
4. Upload to server
5. Set MOAP URL to your hosted HTML file

Example communication:

```javascript
// Start game
const response = await fetch('https://your-backend/api/games/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    playerUUID: 'player-uuid',
    playerName: 'Player Name'
  })
});
```

## Debugging

### Enable Debug Console

```
Second Life → Preferences → Debug Tab (if not visible, see below)
Ctrl + Alt + Shift + D = Debug Console
Ctrl + Shift + D = General Debug Console
Ctrl + Alt + D = Fast Timers
```

### Check MOAP Errors

In the debug console, filter for "Media" errors:

```
[Network] GET https://your-backend-url/frontend/hud.html
[Media] Media load complete
[JavaScript] console.log messages appear here
```

## Testing Checklist

- [ ] Backend is running and accessible
- [ ] Database is connected
- [ ] MOAP displays without blank screen
- [ ] "New Game" button works
- [ ] Can make moves on board
- [ ] AI responds with valid move
- [ ] Game ends correctly
- [ ] Stats display and update
- [ ] Can play multiple games
- [ ] Leaderboard page loads (admin-stats.html)

## Support & Resources

- **Second Life Official**: https://secondlife.com
- **MOAP Documentation**: In-world Build menu Help
- **Render Support**: https://render.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

## Quick Commands

```lsl
// In chat to test LSL:
/10 chat "test"

// Check owner only in script:
if(llDetectedKey(0) != llGetOwner()) return;

// Force media refresh:
Edit → Media → Remove → Add
```

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Test API with curl or Postman
3. ✅ Create MOAP prim
4. ✅ Add media with backend URL
5. ✅ Install LSL script
6. ✅ Test in-world
7. ✅ Invite friends to play
8. ✅ Check leaderboards at `https://your-backend-url/frontend/admin-stats.html`

---

**Enjoy your gaming experience in Second Life! 🎮**
