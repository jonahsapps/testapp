const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

const rooms = new Map();

function json(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function createRoomCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function getRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, {
      players: { white: null, black: null },
      spectators: new Set(),
      moves: [],
      fen: 'start',
      turn: 'white',
      streamClients: new Set()
    });
  }
  return rooms.get(code);
}

function publish(code, event) {
  const room = rooms.get(code);
  if (!room) return;

  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of room.streamClients) {
    client.write(data);
  }
}

function broadcastState(code) {
  const room = rooms.get(code);
  if (!room) return;
  publish(code, {
    type: 'state',
    roomCode: code,
    hasWhite: Boolean(room.players.white),
    hasBlack: Boolean(room.players.black),
    moves: room.moves,
    fen: room.fen,
    turn: room.turn
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
  const filePath = path.join(publicDir, pathname);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const typeMap = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript'
    };
    res.writeHead(200, { 'Content-Type': typeMap[ext] || 'text/plain' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && parsed.pathname === '/api/create-room') {
    let code = createRoomCode();
    while (rooms.has(code)) code = createRoomCode();
    const room = getRoom(code);
    const playerId = crypto.randomUUID();
    room.players.white = playerId;
    broadcastState(code);
    json(res, 200, { roomCode: code, role: 'white', playerId });
    return;
  }

  if (req.method === 'POST' && parsed.pathname === '/api/join-room') {
    try {
      const body = await readBody(req);
      const code = String(body.roomCode || '').trim().toUpperCase();
      if (!code) return json(res, 400, { error: 'Room code required.' });
      const room = getRoom(code);
      const playerId = crypto.randomUUID();
      let role = 'spectator';
      if (!room.players.white) {
        room.players.white = playerId;
        role = 'white';
      } else if (!room.players.black) {
        room.players.black = playerId;
        role = 'black';
      } else {
        room.spectators.add(playerId);
      }
      broadcastState(code);
      json(res, 200, { roomCode: code, role, playerId });
    } catch (error) {
      json(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === 'GET' && parsed.pathname === '/api/events') {
    const code = String(parsed.searchParams.get('roomCode') || '').trim().toUpperCase();
    if (!rooms.has(code)) return json(res, 404, { error: 'Room not found.' });
    const room = rooms.get(code);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    room.streamClients.add(res);
    broadcastState(code);

    req.on('close', () => {
      room.streamClients.delete(res);
    });
    return;
  }

  if (req.method === 'POST' && parsed.pathname === '/api/move') {
    try {
      const body = await readBody(req);
      const code = String(body.roomCode || '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) return json(res, 404, { error: 'Room not found.' });

      const { playerId, move, fen } = body;
      const expectedPlayer = room.turn === 'white' ? room.players.white : room.players.black;
      if (playerId !== expectedPlayer) {
        return json(res, 403, { error: `It is ${room.turn}'s turn.` });
      }

      room.moves.push(String(move));
      room.fen = String(fen);
      room.turn = room.turn === 'white' ? 'black' : 'white';

      publish(code, {
        type: 'move',
        moves: room.moves,
        fen: room.fen,
        turn: room.turn
      });
      json(res, 200, { ok: true });
    } catch (error) {
      json(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === 'POST' && parsed.pathname === '/api/reset') {
    try {
      const body = await readBody(req);
      const code = String(body.roomCode || '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) return json(res, 404, { error: 'Room not found.' });

      room.moves = [];
      room.fen = 'start';
      room.turn = 'white';
      publish(code, { type: 'reset' });
      broadcastState(code);
      json(res, 200, { ok: true });
    } catch (error) {
      json(res, 400, { error: error.message });
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Online chess server running on http://localhost:${PORT}`);
});
