const api = {
  health: "/health",
  start: "/api/games/start",
  move: "/api/games/move",
  end: "/api/games/end",
  stats: (uuid) => `/api/players/${encodeURIComponent(uuid)}/stats`,
  leaderboard: "/api/leaderboard/top-wins?limit=5",
  solitaireStart: "/api/solitaire/start",
  solitaireWin: "/api/solitaire/win",
  solitaireStats: (uuid) => `/api/solitaire/players/${encodeURIComponent(uuid)}/stats`
};

const ticTacToeWins = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const els = {
  title: document.getElementById("gameTitle"),
  tabs: Array.from(document.querySelectorAll(".tab")),
  tictactoeView: document.getElementById("tictactoeView"),
  solitaireView: document.getElementById("solitaireView"),
  board: document.getElementById("board"),
  cells: Array.from(document.querySelectorAll(".cell")),
  message: document.getElementById("gameMessage"),
  service: document.getElementById("serviceStatus"),
  newGame: document.getElementById("newGame"),
  refreshStats: document.getElementById("refreshStats"),
  playerName: document.getElementById("playerName"),
  statOneLabel: document.getElementById("statOneLabel"),
  statTwoLabel: document.getElementById("statTwoLabel"),
  statThreeLabel: document.getElementById("statThreeLabel"),
  statFourLabel: document.getElementById("statFourLabel"),
  statOne: document.getElementById("statOne"),
  statTwo: document.getElementById("statTwo"),
  statThree: document.getElementById("statThree"),
  statFour: document.getElementById("statFour"),
  leaderboardTitle: document.getElementById("leaderboardTitle"),
  leaderboard: document.getElementById("leaderboard"),
  stock: document.getElementById("stockPile"),
  waste: document.getElementById("wastePile"),
  foundations: Array.from(document.querySelectorAll(".foundation")),
  tableau: document.getElementById("tableau")
};

const playerUUID = getOrSet("gamingHudPlayerUUID", createUuid());
els.playerName.value = getOrSet("gamingHudPlayerName", "Player");

const state = {
  currentGame: "tictactoe",
  apiOnline: false,
  localStats: { total_games_played: 0, total_wins: 0, total_losses: 0, total_draws: 0 },
  localSolitaireStats: { games_started: 0, games_won: 0, best_completion_seconds: null },
  ttt: {
    board: Array(9).fill(null),
    sessionId: null,
    active: false
  },
  solitaire: null
};

els.playerName.addEventListener("change", () => {
  localStorage.setItem("gamingHudPlayerName", els.playerName.value.trim() || "Player");
});

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchGame(tab.dataset.game));
});

els.newGame.addEventListener("click", () => {
  if (state.currentGame === "solitaire") startSolitaire();
  else startTicTacToe();
});

els.refreshStats.addEventListener("click", refreshStats);
els.cells.forEach((cell) => {
  cell.addEventListener("click", () => makeTicTacToeMove(Number(cell.dataset.index)));
});
els.stock.addEventListener("click", drawStock);
els.waste.addEventListener("click", selectWaste);
els.foundations.forEach((pile) => {
  pile.addEventListener("click", () => handleFoundationClick(Number(pile.dataset.foundation)));
});

boot();

async function boot() {
  await checkHealth();
  await refreshStats();
  await loadLeaderboard();
  startTicTacToe();
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

async function switchGame(game) {
  state.currentGame = game;
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.game === game));
  els.tictactoeView.classList.toggle("active", game === "tictactoe");
  els.solitaireView.classList.toggle("active", game === "solitaire");
  els.title.textContent = game === "solitaire" ? "Solitaire" : "Tic Tac Toe";
  els.leaderboardTitle.textContent = game === "solitaire" ? "Solitaire Stats" : "Top Tic Tac Toe Wins";

  if (game === "solitaire" && !state.solitaire) {
    await startSolitaire();
  } else {
    renderCurrentStats();
    await loadLeaderboard();
    setMessage(game === "solitaire" ? solitaireStatus() : "Your move. You are X.");
  }
}

async function startTicTacToe() {
  resetTicTacToeBoard();
  setMessage("Your move. You are X.");

  if (!state.apiOnline) {
    state.ttt.active = true;
    renderTicTacToeBoard();
    renderCurrentStats();
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
    state.ttt.sessionId = data.sessionId;
    state.ttt.board = data.gameState.board;
    state.ttt.active = true;
    renderTicTacToeBoard();
    await refreshStats();
  } catch {
    state.apiOnline = false;
    els.service.textContent = "Offline mode";
    els.service.className = "service offline";
    state.ttt.active = true;
    setMessage("API unavailable. Playing local match.");
    renderTicTacToeBoard();
  }
}

async function makeTicTacToeMove(index) {
  if (state.currentGame !== "tictactoe" || !state.ttt.active || state.ttt.board[index]) return;

  if (state.apiOnline && state.ttt.sessionId) {
    await makeApiTicTacToeMove(index);
  } else {
    makeLocalTicTacToeMove(index);
  }
}

async function makeApiTicTacToeMove(index) {
  lockTicTacToeBoard(true);
  try {
    const res = await fetch(api.move, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: state.ttt.sessionId, position: index })
    });

    if (!res.ok) throw new Error("move failed");
    const data = await res.json();
    state.ttt.board = data.gameState.board;
    renderTicTacToeBoard();

    if (data.gameOver) {
      await finishTicTacToeGame(data.winner);
    } else {
      setMessage("Your move. The AI answered.");
    }
  } catch {
    setMessage("Move could not reach the API. Starting a local match.", "draw");
    state.apiOnline = false;
    els.service.textContent = "Offline mode";
    els.service.className = "service offline";
    makeLocalTicTacToeMove(index);
  } finally {
    lockTicTacToeBoard(false);
  }
}

function makeLocalTicTacToeMove(index) {
  state.ttt.board[index] = "X";
  let result = getTicTacToeResult(state.ttt.board);
  if (!result.done) {
    const aiMove = chooseTicTacToeMove();
    if (aiMove !== -1) state.ttt.board[aiMove] = "O";
    result = getTicTacToeResult(state.ttt.board);
  }
  renderTicTacToeBoard(result.line);

  if (result.done) {
    finishTicTacToeGame(result.winner);
  } else {
    setMessage("Your move. The AI answered.");
  }
}

async function finishTicTacToeGame(winner) {
  state.ttt.active = false;
  renderTicTacToeBoard(getTicTacToeResult(state.ttt.board).line);

  const result = winner === "X" ? "win" : winner === "O" ? "loss" : "draw";
  const message = result === "win" ? "You won." : result === "loss" ? "AI won." : "Draw.";
  setMessage(message, result);

  if (state.apiOnline && state.ttt.sessionId) {
    try {
      await fetch(api.end, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.ttt.sessionId, result })
      });
      await refreshStats();
      await loadLeaderboard();
      return;
    } catch {
      setMessage(`${message} Result saved locally.`, result);
    }
  }

  saveLocalTicTacToeResult(result);
  renderCurrentStats();
}

function resetTicTacToeBoard() {
  state.ttt.board = Array(9).fill(null);
  state.ttt.sessionId = null;
  state.ttt.active = false;
  els.message.className = "status";
}

function renderTicTacToeBoard(winLine = []) {
  els.cells.forEach((cell, index) => {
    const value = state.ttt.board[index];
    cell.textContent = value || "";
    cell.className = `cell ${value ? value.toLowerCase() : ""} ${winLine.includes(index) ? "win" : ""}`;
    cell.disabled = Boolean(value) || !state.ttt.active;
  });
}

function lockTicTacToeBoard(locked) {
  els.cells.forEach((cell, index) => {
    cell.disabled = locked || Boolean(state.ttt.board[index]) || !state.ttt.active;
  });
}

function getTicTacToeResult(board) {
  for (const line of ticTacToeWins) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { done: true, winner: board[a], line };
    }
  }
  return board.every(Boolean) ? { done: true, winner: "draw", line: [] } : { done: false, winner: null, line: [] };
}

function chooseTicTacToeMove() {
  const open = state.ttt.board.map((cell, index) => (cell ? -1 : index)).filter((index) => index !== -1);
  for (const mark of ["O", "X"]) {
    for (const index of open) {
      const test = [...state.ttt.board];
      test[index] = mark;
      const result = getTicTacToeResult(test);
      if (result.done && result.winner === mark) return index;
    }
  }
  if (open.includes(4)) return 4;
  return open[0] ?? -1;
}

async function startSolitaire() {
  const deck = shuffle(createDeck());
  const tableau = Array.from({ length: 7 }, () => []);

  for (let column = 0; column < 7; column += 1) {
    for (let row = 0; row <= column; row += 1) {
      const card = deck.pop();
      card.faceUp = row === column;
      tableau[column].push(card);
    }
  }

  state.solitaire = {
    stock: deck.map((card) => ({ ...card, faceUp: false })),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    selected: null,
    startedAt: Date.now(),
    sessionId: null,
    won: false
  };

  noteLocalSolitaireStart();
  setMessage("Solitaire started.");
  renderSolitaire();
  renderCurrentStats();

  if (state.apiOnline) {
    try {
      const res = await fetch(api.solitaireStart, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerUUID,
          playerName: els.playerName.value.trim() || "Player"
        })
      });
      if (res.ok) {
        const data = await res.json();
        state.solitaire.sessionId = data.sessionId;
        await refreshStats();
      }
    } catch {
      setMessage("Solitaire started. Score tracking is local for this round.");
    }
  }
}

function drawStock() {
  const game = state.solitaire;
  if (!game || game.won) return;
  clearSolitaireSelection();

  if (game.stock.length > 0) {
    const card = game.stock.pop();
    card.faceUp = true;
    game.waste.push(card);
  } else if (game.waste.length > 0) {
    game.stock = game.waste.reverse().map((card) => ({ ...card, faceUp: false }));
    game.waste = [];
  }

  renderSolitaire();
  setMessage(solitaireStatus());
}

function selectWaste() {
  const game = state.solitaire;
  if (!game || !game.waste.length || game.won) return;
  game.selected = { source: "waste", cards: [topCard(game.waste)] };
  renderSolitaire();
  setMessage("Choose a tableau column or foundation.");
}

function handleFoundationClick(index) {
  const game = state.solitaire;
  if (!game || game.won) return;

  if (!game.selected) {
    const card = topCard(game.foundations[index]);
    if (card) {
      game.selected = { source: "foundation", foundation: index, cards: [card] };
      renderSolitaire();
    }
    return;
  }

  if (game.selected.cards.length !== 1) {
    setMessage("Only one card can move to a foundation.", "draw");
    return;
  }

  const card = game.selected.cards[0];
  if (!canPlaceOnFoundation(card, game.foundations[index])) {
    setMessage("Foundation cards stack by suit from Ace to King.", "draw");
    return;
  }

  removeSelectedCards();
  game.foundations[index].push(card);
  clearSolitaireSelection();
  afterSolitaireMove();
}

function handleTableauClick(columnIndex, cardIndex) {
  const game = state.solitaire;
  if (!game || game.won) return;
  const column = game.tableau[columnIndex];
  const card = column[cardIndex];

  if (!game.selected) {
    if (!card) {
      setMessage("Only a King can move into an empty column.");
      return;
    }

    if (!card.faceUp && cardIndex === column.length - 1) {
      card.faceUp = true;
      renderSolitaire();
      checkSolitaireWin();
      return;
    }

    if (!card.faceUp) return;
    game.selected = {
      source: "tableau",
      column: columnIndex,
      index: cardIndex,
      cards: column.slice(cardIndex)
    };
    renderSolitaire();
    setMessage("Choose a destination.");
    return;
  }

  const moving = game.selected.cards;
  if (!canPlaceOnTableau(moving[0], column)) {
    setMessage("Tableau cards stack by alternating color in descending order.", "draw");
    return;
  }

  removeSelectedCards();
  game.tableau[columnIndex].push(...moving);
  clearSolitaireSelection();
  afterSolitaireMove();
}

function afterSolitaireMove() {
  flipExposedTableauCards();
  renderSolitaire();
  checkSolitaireWin();
  if (!state.solitaire.won) setMessage(solitaireStatus());
}

async function checkSolitaireWin() {
  const game = state.solitaire;
  if (!game || game.won) return;
  const won = game.foundations.every((pile) => pile.length === 13);
  if (!won) return;

  game.won = true;
  const seconds = Math.max(1, Math.floor((Date.now() - game.startedAt) / 1000));
  noteLocalSolitaireWin(seconds);
  renderSolitaire();
  renderCurrentStats();
  setMessage(`Solitaire won in ${formatTime(seconds)}.`, "win");

  if (state.apiOnline && game.sessionId) {
    try {
      await fetch(api.solitaireWin, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: game.sessionId, completionSeconds: seconds })
      });
      await refreshStats();
    } catch {
      setMessage(`Solitaire won in ${formatTime(seconds)}. Score saved locally.`, "win");
    }
  }
}

function renderSolitaire() {
  const game = state.solitaire;
  if (!game) return;

  renderPileButton(els.stock, topCard(game.stock), game.stock.length, false);
  renderPileButton(els.waste, topCard(game.waste), game.waste.length, true);
  els.waste.classList.toggle("selected", isSelected("waste"));

  els.foundations.forEach((pile, index) => {
    renderPileButton(pile, topCard(game.foundations[index]), game.foundations[index].length, true);
    pile.classList.toggle("selected", isSelected("foundation", index));
  });

  els.tableau.innerHTML = "";
  game.tableau.forEach((column, columnIndex) => {
    const columnEl = document.createElement("div");
    columnEl.className = "tableau-column";
    columnEl.addEventListener("click", (event) => {
      if (event.target === columnEl) handleTableauClick(columnIndex, column.length);
    });

    if (!column.length) {
      const empty = document.createElement("button");
      empty.type = "button";
      empty.className = "pile empty-column";
      empty.setAttribute("aria-label", `Empty tableau column ${columnIndex + 1}`);
      empty.addEventListener("click", () => handleTableauClick(columnIndex, column.length));
      columnEl.appendChild(empty);
    }

    column.forEach((card, cardIndex) => {
      const cardEl = createCardButton(card);
      cardEl.style.top = `${cardIndex * 26}px`;
      cardEl.classList.toggle("selected", isSelected("tableau", columnIndex, cardIndex));
      cardEl.addEventListener("click", (event) => {
        event.stopPropagation();
        handleTableauClick(columnIndex, cardIndex);
      });
      columnEl.appendChild(cardEl);
    });

    els.tableau.appendChild(columnEl);
  });
}

function renderPileButton(button, card, count, faceUp) {
  button.innerHTML = "";
  button.classList.toggle("empty", count === 0);
  if (!card) {
    button.textContent = "";
    return;
  }

  if (!faceUp) {
    button.textContent = count;
    button.className = `${button.className.replace(/\bred\b|\bblack\b|\bface-down\b/g, "")} face-down`;
    return;
  }

  button.classList.remove("face-down");
  button.classList.toggle("red", card.color === "red");
  button.classList.toggle("black", card.color === "black");
  button.innerHTML = cardMarkup(card);
}

function createCardButton(card) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `card ${card.faceUp ? card.color : "face-down"}`;
  button.setAttribute("aria-label", card.faceUp ? cardName(card) : "Face down card");
  button.innerHTML = card.faceUp ? cardMarkup(card) : "";
  return button;
}

function cardMarkup(card) {
  return `<span>${card.label}${card.suit}</span><span>${card.suit}</span>`;
}

function createDeck() {
  const suits = [
    { symbol: "♥", color: "red" },
    { symbol: "♦", color: "red" },
    { symbol: "♣", color: "black" },
    { symbol: "♠", color: "black" }
  ];
  const labels = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  return suits.flatMap((suit) => labels.map((label, index) => ({
    id: `${label}${suit.symbol}`,
    label,
    rank: index + 1,
    suit: suit.symbol,
    color: suit.color,
    faceUp: false
  })));
}

function shuffle(cards) {
  const deck = [...cards];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

function canPlaceOnFoundation(card, pile) {
  const top = topCard(pile);
  if (!top) return card.rank === 1;
  return card.suit === top.suit && card.rank === top.rank + 1;
}

function canPlaceOnTableau(card, column) {
  const top = topCard(column);
  if (!top) return card.rank === 13;
  return top.faceUp && card.color !== top.color && card.rank === top.rank - 1;
}

function removeSelectedCards() {
  const game = state.solitaire;
  const selected = game.selected;
  if (!selected) return;

  if (selected.source === "waste") {
    game.waste.pop();
  } else if (selected.source === "foundation") {
    game.foundations[selected.foundation].pop();
  } else if (selected.source === "tableau") {
    game.tableau[selected.column].splice(selected.index);
  }
}

function flipExposedTableauCards() {
  state.solitaire.tableau.forEach((column) => {
    const card = topCard(column);
    if (card && !card.faceUp) card.faceUp = true;
  });
}

function clearSolitaireSelection() {
  if (state.solitaire) state.solitaire.selected = null;
}

function topCard(pile) {
  return pile[pile.length - 1] || null;
}

function isSelected(source, index, cardIndex) {
  const selected = state.solitaire?.selected;
  if (!selected || selected.source !== source) return false;
  if (source === "waste") return true;
  if (source === "foundation") return selected.foundation === index;
  return selected.column === index && cardIndex >= selected.index;
}

function cardName(card) {
  return `${card.label} of ${card.suit}`;
}

function solitaireStatus() {
  const game = state.solitaire;
  if (!game) return "Ready.";
  return `${game.stock.length} in stock. ${game.waste.length} in waste.`;
}

async function refreshStats() {
  const saved = localStorage.getItem("gamingHudLocalStats");
  if (saved) state.localStats = JSON.parse(saved);
  const savedSolitaire = localStorage.getItem("gamingHudLocalSolitaireStats");
  if (savedSolitaire) state.localSolitaireStats = JSON.parse(savedSolitaire);

  if (!state.apiOnline) {
    renderCurrentStats();
    return;
  }

  try {
    const [tttRes, solitaireRes] = await Promise.all([
      fetch(api.stats(playerUUID)),
      fetch(api.solitaireStats(playerUUID))
    ]);

    if (tttRes.ok) {
      const data = await tttRes.json();
      state.remoteStats = data.stats;
    }

    if (solitaireRes.ok) {
      const data = await solitaireRes.json();
      state.remoteSolitaireStats = data.stats;
    }

    renderCurrentStats();
  } catch {
    renderCurrentStats();
  }
}

async function loadLeaderboard() {
  if (state.currentGame === "solitaire") {
    els.leaderboard.innerHTML = solitaireLeaderboardMarkup();
    return;
  }

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

function renderCurrentStats() {
  if (state.currentGame === "solitaire") {
    const stats = state.remoteSolitaireStats || state.localSolitaireStats;
    els.statOneLabel.textContent = "Started";
    els.statTwoLabel.textContent = "Wins";
    els.statThreeLabel.textContent = "Best";
    els.statFourLabel.textContent = "Win Rate";
    els.statOne.textContent = stats.games_started || 0;
    els.statTwo.textContent = stats.games_won || 0;
    els.statThree.textContent = stats.best_completion_seconds ? formatTime(stats.best_completion_seconds) : "--";
    els.statFour.textContent = stats.games_started ? `${Math.round((stats.games_won / stats.games_started) * 100)}%` : "0%";
    return;
  }

  const stats = state.remoteStats || state.localStats;
  els.statOneLabel.textContent = "Total";
  els.statTwoLabel.textContent = "Wins";
  els.statThreeLabel.textContent = "Losses";
  els.statFourLabel.textContent = "Draws";
  els.statOne.textContent = stats.total_games_played || 0;
  els.statTwo.textContent = stats.total_wins || 0;
  els.statThree.textContent = stats.total_losses || 0;
  els.statFour.textContent = stats.total_draws || 0;
}

function solitaireLeaderboardMarkup() {
  const stats = state.remoteSolitaireStats || state.localSolitaireStats;
  const best = stats.best_completion_seconds ? formatTime(stats.best_completion_seconds) : "--";
  return `<li>Started: ${stats.games_started || 0}</li><li>Wins: ${stats.games_won || 0}</li><li>Best: ${best}</li>`;
}

function saveLocalTicTacToeResult(result) {
  state.localStats.total_games_played += 1;
  if (result === "win") state.localStats.total_wins += 1;
  if (result === "loss") state.localStats.total_losses += 1;
  if (result === "draw") state.localStats.total_draws += 1;
  localStorage.setItem("gamingHudLocalStats", JSON.stringify(state.localStats));
}

function noteLocalSolitaireStart() {
  state.localSolitaireStats.games_started += 1;
  localStorage.setItem("gamingHudLocalSolitaireStats", JSON.stringify(state.localSolitaireStats));
}

function noteLocalSolitaireWin(seconds) {
  state.localSolitaireStats.games_won += 1;
  if (!state.localSolitaireStats.best_completion_seconds || seconds < state.localSolitaireStats.best_completion_seconds) {
    state.localSolitaireStats.best_completion_seconds = seconds;
  }
  localStorage.setItem("gamingHudLocalSolitaireStats", JSON.stringify(state.localSolitaireStats));
}

function setMessage(message, type = "") {
  els.message.textContent = message;
  els.message.className = `status ${type}`;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
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
