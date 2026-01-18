const boardElement = document.getElementById("board");
const turnElement = document.getElementById("current-turn");
const messageElement = document.getElementById("message");
const resetButton = document.getElementById("reset");

const BOARD_SIZE = 8;
const PLAYER_RED = "r";
const PLAYER_BLACK = "b";

let board = [];
let currentPlayer = PLAYER_RED;
let selected = null;
let availableMoves = [];
let forcedPiece = null;

const directions = {
  r: [
    [-1, -1],
    [-1, 1],
  ],
  b: [
    [1, -1],
    [1, 1],
  ],
};

const isKing = (piece) => piece === "R" || piece === "B";
const isRed = (piece) => piece?.toLowerCase() === PLAYER_RED;
const isBlack = (piece) => piece?.toLowerCase() === PLAYER_BLACK;
const isCurrentPlayerPiece = (piece) =>
  (currentPlayer === PLAYER_RED && isRed(piece)) ||
  (currentPlayer === PLAYER_BLACK && isBlack(piece));

const cloneBoard = () => board.map((row) => [...row]);

const getPieceMoves = (row, col, onlyCaptures = false) => {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const pieceDirections = isKing(piece)
    ? [...directions.r, ...directions.b]
    : directions[piece.toLowerCase()];

  for (const [dr, dc] of pieceDirections) {
    const nextRow = row + dr;
    const nextCol = col + dc;
    const jumpRow = row + dr * 2;
    const jumpCol = col + dc * 2;

    if (
      jumpRow >= 0 &&
      jumpRow < BOARD_SIZE &&
      jumpCol >= 0 &&
      jumpCol < BOARD_SIZE
    ) {
      const jumpedPiece = board[nextRow]?.[nextCol];
      if (
        jumpedPiece &&
        !isCurrentPlayerPiece(jumpedPiece) &&
        !board[jumpRow][jumpCol]
      ) {
        moves.push({
          from: [row, col],
          to: [jumpRow, jumpCol],
          capture: [nextRow, nextCol],
        });
      }
    }

    if (onlyCaptures) continue;

    if (
      nextRow >= 0 &&
      nextRow < BOARD_SIZE &&
      nextCol >= 0 &&
      nextCol < BOARD_SIZE &&
      !board[nextRow][nextCol]
    ) {
      moves.push({ from: [row, col], to: [nextRow, nextCol], capture: null });
    }
  }

  return moves;
};

const getAllMoves = (onlyCaptures = false) => {
  const moves = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (piece && isCurrentPlayerPiece(piece)) {
        moves.push(...getPieceMoves(row, col, onlyCaptures));
      }
    }
  }
  return moves;
};

const hasCaptureMoves = () => getAllMoves(true).length > 0;

const setupBoard = () => {
  board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if ((row + col) % 2 === 1) board[row][col] = PLAYER_BLACK;
    }
  }

  for (let row = BOARD_SIZE - 3; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if ((row + col) % 2 === 1) board[row][col] = PLAYER_RED;
    }
  }

  currentPlayer = PLAYER_RED;
  selected = null;
  forcedPiece = null;
  availableMoves = [];
  updateStatus("Select a piece to begin.");
  renderBoard();
};

const updateStatus = (message) => {
  turnElement.textContent = currentPlayer === PLAYER_RED ? "Red" : "Black";
  turnElement.classList.toggle("black", currentPlayer === PLAYER_BLACK);
  messageElement.textContent = message;
};

const renderBoard = () => {
  boardElement.innerHTML = "";
  const captureMoves = getAllMoves(true);

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const square = document.createElement("button");
      square.type = "button";
      square.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
      square.dataset.row = row;
      square.dataset.col = col;

      const isSelected = selected && selected[0] === row && selected[1] === col;
      if (isSelected) {
        square.classList.add("selected");
      }

      if (availableMoves.some((move) => move.to[0] === row && move.to[1] === col)) {
        const isCapture = availableMoves.some(
          (move) =>
            move.to[0] === row && move.to[1] === col && move.capture !== null
        );
        square.classList.add("highlight");
        if (isCapture) square.classList.add("capture");
      }

      const piece = board[row][col];
      if (piece) {
        const pieceElement = document.createElement("span");
        pieceElement.className = `piece ${
          isRed(piece) ? "red" : "black"
        } ${isKing(piece) ? "king" : ""}`;
        square.appendChild(pieceElement);
      }

      if (
        piece &&
        isCurrentPlayerPiece(piece) &&
        captureMoves.length > 0 &&
        getPieceMoves(row, col, true).length === 0
      ) {
        square.setAttribute("disabled", "disabled");
      }

      boardElement.appendChild(square);
    }
  }
};

const selectPiece = (row, col) => {
  const piece = board[row][col];
  if (!piece || !isCurrentPlayerPiece(piece)) {
    updateStatus("Select one of your pieces.");
    return;
  }

  if (forcedPiece && (forcedPiece[0] !== row || forcedPiece[1] !== col)) {
    updateStatus("You must continue capturing with the same piece.");
    return;
  }

  selected = [row, col];
  const mustCapture = hasCaptureMoves();
  availableMoves = getPieceMoves(row, col, mustCapture);
  if (availableMoves.length === 0) {
    updateStatus("That piece has no legal moves.");
  } else if (mustCapture) {
    updateStatus("Capture available! Choose a highlighted jump.");
  } else {
    updateStatus("Choose a highlighted square to move.");
  }
  renderBoard();
};

const movePiece = (move) => {
  const [[fromRow, fromCol], [toRow, toCol]] = [move.from, move.to];
  const movingPiece = board[fromRow][fromCol];
  const nextBoard = cloneBoard();

  nextBoard[fromRow][fromCol] = null;
  nextBoard[toRow][toCol] = movingPiece;

  if (move.capture) {
    const [capRow, capCol] = move.capture;
    nextBoard[capRow][capCol] = null;
  }

  const shouldKing =
    (movingPiece === PLAYER_RED && toRow === 0) ||
    (movingPiece === PLAYER_BLACK && toRow === BOARD_SIZE - 1);
  if (shouldKing) {
    nextBoard[toRow][toCol] = movingPiece.toUpperCase();
  }

  board = nextBoard;

  if (move.capture) {
    selected = [toRow, toCol];
    const followUpMoves = getPieceMoves(toRow, toCol, true);
    if (followUpMoves.length > 0) {
      forcedPiece = [toRow, toCol];
      availableMoves = followUpMoves;
      updateStatus("Chain capture! Select another jump.");
      renderBoard();
      return;
    }
  }

  forcedPiece = null;
  selected = null;
  availableMoves = [];
  currentPlayer = currentPlayer === PLAYER_RED ? PLAYER_BLACK : PLAYER_RED;

  const allMoves = getAllMoves();
  if (allMoves.length === 0) {
    updateStatus(
      `${currentPlayer === PLAYER_RED ? "Red" : "Black"} has no moves. Game over!`
    );
  } else if (hasCaptureMoves()) {
    updateStatus("Capture available! Select a piece to jump.");
  } else {
    updateStatus("Select a piece to move.");
  }

  renderBoard();
};

const handleBoardClick = (event) => {
  const square = event.target.closest(".square");
  if (!square || square.hasAttribute("disabled")) return;

  const row = Number.parseInt(square.dataset.row, 10);
  const col = Number.parseInt(square.dataset.col, 10);

  if (selected && availableMoves.length > 0) {
    const move = availableMoves.find(
      (candidate) => candidate.to[0] === row && candidate.to[1] === col
    );
    if (move) {
      movePiece(move);
      return;
    }
  }

  selectPiece(row, col);
};

boardElement.addEventListener("click", handleBoardClick);
resetButton.addEventListener("click", setupBoard);

setupBoard();
