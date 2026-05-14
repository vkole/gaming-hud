const api = {
  health: "/health",
  start: "/api/games/start",
  move: "/api/games/move",
  end: "/api/games/end",
  stats: (uuid) => `/api/players/${encodeURIComponent(uuid)}/stats`,
  leaderboard: "/api/leaderboard/top-wins?limit=5"
};

const wins = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

const state = {
  board: Array(9).fill(null),
  sessionId: null,
  active: false,
  apiOnline: false,
  localStats: { total_games_played: 0, total_wins: 0, total_losses: 0, total_draws: 0 }
};

const els = {
  board: document.getElementById("board"),
  cells: Array.from(document.querySelectorAll(".cell")),
  message: document.getElementById("gameMessage"),
  service: document.getElementById("serviceStatus"),
  newGame: document.getElementById("newGame"),
  refreshStats: document.getElementById("refreshStats"),
  playerName: document.getElementById("playerName"),
  totalGames: document.getElementById("totalGames"),
  wins: document.getElementById("wins"),
  losses: document.getElementById("losses"),
  draws: document.getElementById("draws"),
  leaderboard: document.getElementById("leaderboard")
};

const playerUUID = getOrSet("gamingHudPlayerUUID", createUuid());
els.playerName.value = getOrSet("gamingHudPlayerName", "Player");

els.playerName.addEventListener("change", () => {
  localStorage.setItem("gamingHudPlayerName", els.playerName.value.trim() || "Player");
});

els.newGame.addEventListener("click", startGame);
els.refreshStats.addEventListener("click", refreshStats);
els.cells.forEach((cell) => {
  cell.addEventListener("click", () => makeMove(Number(cell.dataset.index)));
});

boot();

async function boot() {
  await checkHealth();
  await refreshStats();
  await loadLeaderboard();
  startGame();
}

async function checkHealth() {
  try {
    const res = await fetch(api.health);
    const data = await res.json();
    state.apiOnline = res.ok && data.status === "healthy";
  } catch {
    state.apiOnline = false;
  }

  els.service.textContent = state.apiOnline ? "API online" : "Offline mode";
  els.service.className = `service ${state.apiOnline ? "online" : "offline"}`;
}

async function startGame() {
  resetBoard();
  setMessage("Your move. You are X.");

  if (!state.apiOnline) {
    state.active = true;
    state.sessionId = null;
    renderBoard();
    return;
  }

  try {
    const res = await fetch(api.start, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerUUID,
        playerName: els.playerName.value.trim() || "Player"
      })
    });

    if (!res.ok) throw new Error("start failed");
    const data = await res.json();
    state.sessionId = data.sessionId;
    state.board = data.gameState.board;
    state.active = true;
    renderBoard();
  } catch {
    state.apiOnline = false;
    els.service.textContent = "Offline mode";
    els.service.className = "service offline";
    state.active = true;
    setMessage("API unavailable. Playing local match.");
    renderBoard();
  }
}

async function makeMove(index) {
  if (!state.active || state.board[index]) return;

  if (state.apiOnline && state.sessionId) {
    await makeApiMove(index);
  } else {
    makeLocalMove(index);
  }
}

async function makeApiMove(index) {
  lockBoard(true);
  try {
    const res = await fetch(api.move, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: state.sessionId, position: index })
    });

    if (!res.ok) throw new Error("move failed");
    const data = await res.json();
    state.board = data.gameState.board;
    renderBoard();

    if (data.gameOver) {
      await finishGame(data.winner);
    } else {
      setMessage("Your move. The AI answered.");
    }
  } catch {
    setMessage("Move could not reach the API. Starting a local match.", "draw");
    state.apiOnline = false;
    els.service.textContent = "Offline mode";
    els.service.className = "service offline";
    makeLocalMove(index);
  } finally {
    lockBoard(false);
  }
}

function makeLocalMove(index) {
  state.board[index] = "X";
  let result = getResult(state.board);
  if (!result.done) {
    const aiMove = chooseMove();
    if (aiMove !== -1) state.board[aiMove] = "O";
    result = getResult(state.board);
  }
  renderBoard(result.line);

  if (result.done) {
    finishGame(result.winner);
  } else {
    setMessage("Your move. The AI answered.");
  }
}

async function finishGame(winner) {
  state.active = false;
  renderBoard(getResult(state.board).line);

  const result = winner === "X" ? "win" : winner === "O" ? "loss" : "draw";
  const message = result === "win" ? "You won." : result === "loss" ? "AI won." : "Draw.";
  setMessage(message, result);

  if (state.apiOnline && state.sessionId) {
    try {
      await fetch(api.end, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.sessionId, result })
      });
      await refreshStats();
      await loadLeaderboard();
      return;
    } catch {
      setMessage(`${message} Result saved locally.`, result);
    }
  }

  saveLocalResult(result);
  renderStats(state.localStats);
}

async function refreshStats() {
  const saved = localStorage.getItem("gamingHudLocalStats");
  if (saved) state.localStats = JSON.parse(saved);

  if (!state.apiOnline) {
    renderStats(state.localStats);
    return;
  }

  try {
    const res = await fetch(api.stats(playerUUID));
    if (!res.ok) throw new Error("stats unavailable");
    const data = await res.json();
    renderStats(data.stats);
  } catch {
    renderStats(state.localStats);
  }
}

async function loadLeaderboard() {
  els.leaderboard.innerHTML = "<li>No scores yet</li>";
  if (!state.apiOnline) return;

  try {
    const res = await fetch(api.leaderboard);
    if (!res.ok) throw new Error("leaderboard unavailable");
    const data = await res.json();
    const rows = data.leaderboard || [];
    els.leaderboard.innerHTML = rows.length
      ? rows.map((row) => `<li>${escapeHtml(row.player.display_name)} - ${row.stats.total_wins}</li>`).join("")
      : "<li>No scores yet</li>";
  } catch {
    els.leaderboard.innerHTML = "<li>Scores unavailable</li>";
  }
}

function resetBoard() {
  state.board = Array(9).fill(null);
  state.sessionId = null;
  state.active = false;
  els.message.className = "status";
}

function renderBoard(winLine = []) {
  els.cells.forEach((cell, index) => {
    const value = state.board[index];
    cell.textContent = value || "";
    cell.className = `cell ${value ? value.toLowerCase() : ""} ${winLine.includes(index) ? "win" : ""}`;
    cell.disabled = Boolean(value) || !state.active;
  });
}

function lockBoard(locked) {
  els.cells.forEach((cell, index) => {
    cell.disabled = locked || Boolean(state.board[index]) || !state.active;
  });
}

function getResult(board) {
  for (const line of wins) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { done: true, winner: board[a], line };
    }
  }
  return board.every(Boolean) ? { done: true, winner: "draw", line: [] } : { done: false, winner: null, line: [] };
}

function chooseMove() {
  const open = state.board.map((cell, index) => (cell ? -1 : index)).filter((index) => index !== -1);
  for (const mark of ["O", "X"]) {
    for (const index of open) {
      const test = [...state.board];
      test[index] = mark;
      const result = getResult(test);
      if (result.done && result.winner === mark) return index;
    }
  }
  if (open.includes(4)) return 4;
  return open[0] ?? -1;
}

function saveLocalResult(result) {
  state.localStats.total_games_played += 1;
  if (result === "win") state.localStats.total_wins += 1;
  if (result === "loss") state.localStats.total_losses += 1;
  if (result === "draw") state.localStats.total_draws += 1;
  localStorage.setItem("gamingHudLocalStats", JSON.stringify(state.localStats));
}

function renderStats(stats) {
  els.totalGames.textContent = stats.total_games_played || 0;
  els.wins.textContent = stats.total_wins || 0;
  els.losses.textContent = stats.total_losses || 0;
  els.draws.textContent = stats.total_draws || 0;
}

function setMessage(message, type = "") {
  els.message.textContent = message;
  els.message.className = `status ${type}`;
}

function getOrSet(key, fallback) {
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  localStorage.setItem(key, fallback);
  return fallback;
}

function createUuid() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}
