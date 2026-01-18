const statusEl = document.getElementById("status");
const resetButton = document.getElementById("reset");
const cells = Array.from(document.querySelectorAll(".cell"));

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

let currentPlayer = "X";
let board = Array(9).fill("");
let gameOver = false;

function updateStatus(message) {
  statusEl.textContent = message;
}

function checkWinner() {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return [board[a], [a, b, c]];
    }
  }
  return [null, []];
}

function updateCells() {
  cells.forEach((cell, index) => {
    cell.textContent = board[index];
    cell.disabled = Boolean(board[index]) || gameOver;
  });
}

function handleMove(event) {
  if (gameOver) {
    return;
  }

  const index = Number(event.currentTarget.dataset.index);
  if (board[index]) {
    return;
  }

  board[index] = currentPlayer;
  const [winner, winningLine] = checkWinner();

  if (winner) {
    gameOver = true;
    updateStatus(`Player ${winner} wins!`);
    winningLine.forEach((lineIndex) => {
      cells[lineIndex].classList.add("win");
    });
  } else if (board.every((cell) => cell)) {
    gameOver = true;
    updateStatus("It's a draw!");
  } else {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    updateStatus(`Player ${currentPlayer}'s turn`);
  }

  updateCells();
}

function resetGame() {
  currentPlayer = "X";
  board = Array(9).fill("");
  gameOver = false;
  cells.forEach((cell) => cell.classList.remove("win"));
  updateCells();
  updateStatus("Player X's turn");
}

cells.forEach((cell) => cell.addEventListener("click", handleMove));
resetButton.addEventListener("click", resetGame);

resetGame();
