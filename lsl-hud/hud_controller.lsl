// Gaming MOAP HUD - Tic Tac Toe HUD Script
// For Second Life MOAP (Media-on-a-Prim) HUD
// 
// This script communicates with the backend web service to play Tic Tac Toe
// Install on a prim and link with an HTML-serving prim for the UI

// Configuration
string BACKEND_URL = "https://your-render-app.onrender.com";
string PLAYER_NAME = "";
key PLAYER_UUID;
string SESSION_ID = "";
integer HTTP_TIMEOUT = 30;

// Game state
list BOARD_STATE = [];
integer GAME_ACTIVE = FALSE;
integer CURRENT_PLAYER = 0; // 0 = player (X), 1 = AI (O)

// Initialize HUD
default
{
    state_entry()
    {
        PLAYER_UUID = llGetOwner();
        PLAYER_NAME = llGetDisplayName(PLAYER_UUID);
        
        // Set up listener for prim touch events
        llSetTouchText("Click to Play");
        llSetCullFace(PRIM_FACE_ALL);
        
        // Initialize board (9 positions: 0-8)
        BOARD_STATE = [0,0,0,0,0,0,0,0,0];
        
        llOwnerSay("Gaming HUD loaded. Use ~startgame to begin.");
    }

    listen(integer channel, string name, key id, string message)
    {
        if (id != PLAYER_UUID)
            return;

        if (message == "~startgame")
        {
            StartNewGame();
        }
        else if (message == "~endgame")
        {
            EndGame();
        }
    }

    touch_start(integer total_number)
    {
        key toucher = llDetectedKey(0);
        
        if (toucher != PLAYER_UUID)
            return;

        // This would be handled via the HTML interface in MOAP
        // For now, chat commands work
    }

    http_response(key request_id, integer status, list metadata, string body)
    {
        // Handle responses from backend
        HandleHTTPResponse(status, body);
    }

    timer()
    {
        // Periodic status check or auto-refresh
    }
}

// Start a new game
StartNewGame()
{
    if (GAME_ACTIVE)
    {
        llOwnerSay("Game already in progress.");
        return;
    }

    GAME_ACTIVE = TRUE;
    BOARD_STATE = [0,0,0,0,0,0,0,0,0];
    CURRENT_PLAYER = 0;

    string json_data = "{"
        + "\"playerUUID\": \"" + (string)PLAYER_UUID + "\","
        + "\"playerName\": \"" + PLAYER_NAME + "\""
        + "}";

    llHTTPRequest(BACKEND_URL + "/api/games/start", 
        [HTTP_METHOD, "POST", HTTP_MIMETYPE, "application/json"],
        json_data);

    llOwnerSay("Starting new game...");
}

// Make a move in the game
MakeMove(integer position)
{
    if (!GAME_ACTIVE)
    {
        llOwnerSay("No active game.");
        return;
    }

    if (position < 0 || position > 8)
    {
        llOwnerSay("Invalid board position.");
        return;
    }

    if (llList2Integer(BOARD_STATE, position) != 0)
    {
        llOwnerSay("Position already taken.");
        return;
    }

    string json_data = "{"
        + "\"sessionId\": \"" + SESSION_ID + "\","
        + "\"position\": " + (string)position
        + "}";

    llHTTPRequest(BACKEND_URL + "/api/games/move",
        [HTTP_METHOD, "POST", HTTP_MIMETYPE, "application/json"],
        json_data);
}

// End the game and save results
EndGame()
{
    if (!GAME_ACTIVE)
    {
        llOwnerSay("No active game to end.");
        return;
    }

    // Determine result - this would be based on game state
    string result = "draw"; // Would be updated based on actual game state

    string json_data = "{"
        + "\"sessionId\": \"" + SESSION_ID + "\","
        + "\"result\": \"" + result + "\""
        + "}";

    llHTTPRequest(BACKEND_URL + "/api/games/end",
        [HTTP_METHOD, "POST", HTTP_MIMETYPE, "application/json"],
        json_data);

    GAME_ACTIVE = FALSE;
    llOwnerSay("Game ended.");
}

// Fetch player stats
GetPlayerStats()
{
    llHTTPRequest(BACKEND_URL + "/api/players/" + (string)PLAYER_UUID + "/stats",
        [HTTP_METHOD, "GET"],
        "");
}

// Handle HTTP responses from backend
HandleHTTPResponse(integer status, string body)
{
    if (status != 200)
    {
        llOwnerSay("HTTP Error: " + (string)status);
        llOwnerSay("Response: " + body);
        return;
    }

    // Parse JSON response - LSL doesn't have built-in JSON parsing
    // You would parse the response here and update game state
    
    // For now, just display the response
    llOwnerSay("Server response: " + body);

    // If this was a game/start response, extract sessionId
    if (llSubStringIndex(body, "sessionId") != -1)
    {
        // Extract sessionId from JSON - simple example
        integer start = llSubStringIndex(body, "sessionId\":\"") + 12;
        integer end = llSubStringIndex(llGetSubString(body, start, -1), "\"");
        SESSION_ID = llGetSubString(body, start, start + end - 1);
        llOwnerSay("Session started: " + SESSION_ID);
    }
}

// Utility to get position number from grid click
// This would be called from the HTML interface
GetPositionFromClick(integer x, integer y)
{
    // x, y are normalized coordinates on the prim (0-1)
    // Convert to tic tac toe grid (0-8)
    if (x < 0.33)
    {
        if (y > 0.66) return 0;
        if (y > 0.33) return 3;
        return 6;
    }
    else if (x < 0.66)
    {
        if (y > 0.66) return 1;
        if (y > 0.33) return 4;
        return 7;
    }
    else
    {
        if (y > 0.66) return 2;
        if (y > 0.33) return 5;
        return 8;
    }
}
