import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

interface ClientPeer {
  id: string;
  ws: WebSocket;
  roomId: string;
  deviceType: 'pc' | 'phone' | 'browser';
  deviceName: string;
  joinedAt: number;
}

interface Room {
  id: string;
  createdAt: number;
  peers: Map<string, ClientPeer>;
  totalBytesRelayed: number;
}

const app = express();
const httpServer = createServer(app);
const PORT = 3000;

app.use(express.json());

// In-memory room management
const rooms = new Map<string, Room>();

// Cleanup stale rooms periodically (older than 2 hours with no peers)
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (room.peers.size === 0 && now - room.createdAt > 2 * 60 * 60 * 1000) {
      rooms.delete(roomId);
    }
  }
}, 15 * 60 * 1000);

// API Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

// Get room public summary (does NOT leak key or plain data)
app.get('/api/room/:id', (req, res) => {
  const roomId = req.params.id;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const peersList = Array.from(room.peers.values()).map(p => ({
    id: p.id,
    deviceType: p.deviceType,
    deviceName: p.deviceName,
    joinedAt: p.joinedAt
  }));

  res.json({
    roomId: room.id,
    peerCount: room.peers.size,
    peers: peersList,
    totalBytesRelayed: room.totalBytesRelayed
  });
});

// Setup WebSocket Server attached to HTTP server
const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket, request) => {
  const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  const roomId = (url.searchParams.get('room') || 'default').trim().toUpperCase();
  const deviceType = (url.searchParams.get('device') || 'browser') as 'pc' | 'phone' | 'browser';
  const deviceName = url.searchParams.get('name') || (deviceType === 'phone' ? 'Mobile Phone' : 'PC Desktop');
  const peerId = 'peer_' + Math.random().toString(36).substring(2, 9);

  // Get or create room
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      createdAt: Date.now(),
      peers: new Map(),
      totalBytesRelayed: 0
    };
    rooms.set(roomId, room);
  }

  const peer: ClientPeer = {
    id: peerId,
    ws,
    roomId,
    deviceType,
    deviceName,
    joinedAt: Date.now()
  };

  room.peers.set(peerId, peer);

  // Helper to send JSON to socket
  const send = (socket: WebSocket, data: any) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  };

  // Broadcast peer list update to all clients in the room
  const notifyRoomPeersChanged = () => {
    if (!room) return;
    const peerList = Array.from(room.peers.values()).map(p => ({
      id: p.id,
      deviceType: p.deviceType,
      deviceName: p.deviceName,
      joinedAt: p.joinedAt
    }));

    for (const p of room.peers.values()) {
      send(p.ws, {
        type: 'PEER_LIST_UPDATE',
        selfId: p.id,
        peers: peerList,
        roomId
      });
    }
  };

  // Send connection ack to the newly connected peer
  send(ws, {
    type: 'ROOM_JOINED',
    selfId: peerId,
    roomId,
    peerCount: room.peers.size
  });

  notifyRoomPeersChanged();

  // Listen for client messages
  ws.on('message', (messageRaw: Buffer) => {
    if (!room) return;
    try {
      const msgStr = messageRaw.toString('utf-8');
      const data = JSON.parse(msgStr);

      // Keep track of relayed bytes count for stats
      if (data.type === 'ENCRYPTED_CHUNK') {
        const payloadLength = data.chunk ? data.chunk.length : 0;
        room.totalBytesRelayed += payloadLength;
      }

      // Target-based signaling or broadcast to other peers in room
      if (data.targetPeerId) {
        const target = room.peers.get(data.targetPeerId);
        if (target && target.ws.readyState === WebSocket.OPEN) {
          send(target.ws, {
            ...data,
            senderPeerId: peerId
          });
        }
      } else {
        // Broadcast to all other peers in room
        for (const [otherId, otherPeer] of room.peers.entries()) {
          if (otherId !== peerId && otherPeer.ws.readyState === WebSocket.OPEN) {
            send(otherPeer.ws, {
              ...data,
              senderPeerId: peerId
            });
          }
        }
      }
    } catch (err) {
      console.error('Error processing WS message:', err);
    }
  });

  ws.on('close', () => {
    if (room) {
      room.peers.delete(peerId);
      if (room.peers.size === 0) {
        // Keep room in map for reconnects but reset peers
      } else {
        notifyRoomPeersChanged();
      }
    }
  });

  ws.on('error', (err) => {
    console.error(`WS peer error (${peerId}):`, err);
  });
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`CipherDrop E2EE Transfer Server running on http://localhost:${PORT}`);
  });
}

start();
