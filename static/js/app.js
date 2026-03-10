const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 5;
const KEYBOARD_ROWS = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["Enter","z","x","c","v","b","n","m","⌫"],
];
let currentRow = 0, currentCol = 0, currentInput = [], gameOver = false, isAnimating = false;
const boardEl = document.getElementById("board");
const toastEl = document.getElementById("toast");
const modalEl = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalSub = document.getElementById("modal-subtitle");
const modalWord = document.getElementById("modal-word");
const modalEmoji = document.getElementById("modal-emoji");
const modalBtn = document.getElementById("modal-btn");
const newGameBtn = document.getElementById("btn-new-game");

function buildBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < MAX_ATTEMPTS; r++) {
    const row = document.createElement("div");
    row.className = "board-row"; row.id = `row-${r}`;
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = document.createElement("div");
      tile.className = "tile"; tile.id = `tile-${r}-${c}`;
      const inner = document.createElement("div");
      inner.className = "tile-inner";
      tile.appendChild(inner); row.appendChild(tile);
    }
    boardEl.appendChild(row);
  }
}

function buildKeyboard() {
  KEYBOARD_ROWS.forEach((keys, i) => {
    const rowEl = document.getElementById(`kb-row-${i + 1}`);
    rowEl.innerHTML = "";
    keys.forEach(k => {
      const btn = document.createElement("button");
      btn.className = "key" + (k.length > 1 ? " wide" : "");
      btn.textContent = k; btn.dataset.key = k;
      btn.addEventListener("click", () => handleKey(k));
      btn.addEventListener("touchend", e => { e.preventDefault(); handleKey(k); });
      rowEl.appendChild(btn);
    });
  });
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => toastEl.classList.add("hidden"), 2000);
}

function getTile(row, col) { return document.getElementById(`tile-${row}-${col}`); }

function setTileLetter(row, col, letter) {
  const tile = getTile(row, col);
  const inner = tile.querySelector(".tile-inner");
  inner.textContent = letter.toUpperCase();
  if (letter) { tile.classList.add("filled"); }
  else { tile.classList.remove("filled"); }
}

function revealRow(row, evaluation) {
  return new Promise(resolve => {
    evaluation.forEach(({ letter, status }, col) => {
      const tile = getTile(row, col);
      const delay = col * 300;
      setTimeout(() => {
        tile.classList.add("revealed");
        setTimeout(() => { tile.classList.add(status); updateKey(letter, status); }, 150);
        if (col === WORD_LENGTH - 1) { setTimeout(resolve, 150 + 300); }
      }, delay);
    });
  });
}

function shakeRow(row) {
  for (let c = 0; c < WORD_LENGTH; c++) {
    const tile = getTile(row, c);
    tile.classList.add("shake");
    tile.addEventListener("animationend", () => tile.classList.remove("shake"), { once: true });
  }
}

function bounceRow(row) {
  for (let c = 0; c < WORD_LENGTH; c++) {
    const tile = getTile(row, c);
    setTimeout(() => {
      tile.classList.add("bounce");
      tile.addEventListener("animationend", () => tile.classList.remove("bounce"), { once: true });
    }, c * 100);
  }
}

const keyColorPriority = { correct: 3, present: 2, absent: 1 };
function updateKey(letter, status) {
  const keyEl = document.querySelector(`.key[data-key="${letter}"]`);
  if (!keyEl) return;
  const current = keyEl.dataset.status || "";
  if ((keyColorPriority[status] || 0) > (keyColorPriority[current] || 0)) {
    if (current) keyEl.classList.remove(current);
    keyEl.classList.add(status); keyEl.dataset.status = status;
  }
}

function handleKey(key) {
  if (gameOver || isAnimating) return;
  if (key === "⌫" || key === "Backspace") {
    if (currentCol > 0) {
      currentCol--; currentInput.pop();
      setTileLetter(currentRow, currentCol, "");
      getTile(currentRow, currentCol).classList.remove("filled");
    }
    return;
  }
  if (key === "Enter") { submitGuess(); return; }
  if (/^[a-zA-Z]$/.test(key) && currentCol < WORD_LENGTH) {
    const letter = key.toLowerCase();
    currentInput.push(letter);
    setTileLetter(currentRow, currentCol, letter);
    currentCol++;
  }
}

async function submitGuess() {
  if (currentCol < WORD_LENGTH) { showToast("Not enough letters!"); shakeRow(currentRow); return; }
  const guess = currentInput.join("");
  isAnimating = true;
  let data;
  try {
    const res = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess }),
    });
    data = await res.json();
  } catch (err) { showToast("Network error 😢"); isAnimating = false; return; }
  if (data.error) { showToast(data.error); shakeRow(currentRow); isAnimating = false; return; }
  await revealRow(currentRow, data.evaluation);
  if (data.won) {
    bounceRow(currentRow); gameOver = true; isAnimating = false;
    const praise = ["Genius! 🧠","Magnificent! 🌟","Impressive! 💪","Splendid! ✨","Great! 👏","Phew! 😅"];
    setTimeout(() => showModal("🎉", praise[Math.min(currentRow, 5)], `Got it in ${data.attempts_used}/${data.max_attempts}!`, data.target), 600);
    return;
  }
  currentRow++; currentCol = 0; currentInput = [];
  if (data.game_over) {
    gameOver = true;
    setTimeout(() => showModal("😢", "So close!", "Better luck next time.", data.target), 400);
  }
  isAnimating = false;
}

function showModal(emoji, title, subtitle, word) {
  modalEmoji.textContent = emoji; modalTitle.textContent = title;
  modalSub.textContent = subtitle; modalWord.textContent = word ? word.toUpperCase() : "";
  modalEl.classList.remove("hidden");
}

async function startNewGame() {
  try { await fetch("/api/new-game", { method: "POST" }); }
  catch (e) { showToast("Could not start game 😢"); return; }
  currentRow = 0; currentCol = 0; currentInput = []; gameOver = false; isAnimating = false;
  buildBoard();
  document.querySelectorAll(".key").forEach(k => {
    k.className = "key" + (k.textContent.length > 1 ? " wide" : "");
    delete k.dataset.status;
  });
  modalEl.classList.add("hidden");
}

document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "Enter") handleKey("Enter");
  else if (e.key === "Backspace") handleKey("Backspace");
  else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key);
});

newGameBtn.addEventListener("click", startNewGame);
modalBtn.addEventListener("click", startNewGame);

(async function init() { buildBoard(); buildKeyboard(); await startNewGame(); })();
