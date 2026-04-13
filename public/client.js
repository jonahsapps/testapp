const game = new Chess();

let board;
let myRole = 'spectator';
let roomCode = null;
let playerId = null;
let events = null;

const statusEl = document.getElementById('status');
const roomCodeEl = document.getElementById('roomCode');
const roleEl = document.getElementById('role');
const turnEl = document.getElementById('turn');
const moveListEl = document.getElementById('moveList');

function setStatus(text) {
  statusEl.textContent = text;
}

function renderMoves(moves) {
  moveListEl.innerHTML = '';
  moves.forEach((move) => {
    const li = document.createElement('li');
    li.textContent = move;
    moveListEl.appendChild(li);
  });
}

function syncBoardToFen(fen) {
  if (fen === 'start') {
    game.reset();
    board.position('start');
    return;
  }

  game.load(fen);
  board.position(fen);
}

async function postJSON(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.json();
}

function connectEvents() {
  if (events) events.close();
  events = new EventSource(`/api/events?roomCode=${encodeURIComponent(roomCode)}`);

  events.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'state') {
      turnEl.textContent = data.turn;
      renderMoves(data.moves);
      syncBoardToFen(data.fen);
      const ready = data.hasWhite && data.hasBlack;
      setStatus(ready ? `Game active in room ${data.roomCode}.` : 'Waiting for opponent...');
      return;
    }

    if (data.type === 'move') {
      turnEl.textContent = data.turn;
      renderMoves(data.moves);
      syncBoardToFen(data.fen);
      return;
    }

    if (data.type === 'reset') {
      syncBoardToFen('start');
      renderMoves([]);
      turnEl.textContent = 'white';
      setStatus('Game reset.');
    }
  };

  events.onerror = () => {
    setStatus('Connection dropped. Trying to reconnect...');
  };
}

function onDrop(source, target) {
  const movingColor = game.turn() === 'w' ? 'white' : 'black';
  if (myRole !== movingColor) return 'snapback';

  const move = game.move({ from: source, to: target, promotion: 'q' });
  if (!move) return 'snapback';

  board.position(game.fen());
  postJSON('/api/move', {
    roomCode,
    playerId,
    move: move.san,
    fen: game.fen()
  }).then((result) => {
    if (result.error) {
      setStatus(result.error);
      syncBoardToFen('start');
    }
  });

  return undefined;
}

function initBoard() {
  board = Chessboard('board', {
    position: 'start',
    draggable: true,
    onDrop
  });
}

document.getElementById('createRoom').addEventListener('click', async () => {
  const result = await postJSON('/api/create-room', {});
  if (result.error) {
    setStatus(result.error);
    return;
  }

  roomCode = result.roomCode;
  playerId = result.playerId;
  myRole = result.role;

  roomCodeEl.textContent = roomCode;
  roleEl.textContent = myRole;
  setStatus(`Joined room ${roomCode} as ${myRole}.`);
  connectEvents();
});

document.getElementById('joinRoom').addEventListener('click', async () => {
  const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  const result = await postJSON('/api/join-room', { roomCode: code });
  if (result.error) {
    setStatus(result.error);
    return;
  }

  roomCode = result.roomCode;
  playerId = result.playerId;
  myRole = result.role;

  roomCodeEl.textContent = roomCode;
  roleEl.textContent = myRole;
  setStatus(`Joined room ${roomCode} as ${myRole}.`);
  connectEvents();
});

document.getElementById('reset').addEventListener('click', async () => {
  if (!roomCode) {
    setStatus('Join a room first.');
    return;
  }
  await postJSON('/api/reset', { roomCode });
});

window.addEventListener('resize', () => board.resize());

initBoard();
setStatus('Ready. Create or join a room.');
