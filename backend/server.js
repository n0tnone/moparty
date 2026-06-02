const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);



const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:3000'];

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Добавь ЭТО сразу после app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const { execFile } = require('child_process')

app.post('/api/resolve', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'no url' });

  execFile('yt-dlp', [
    '-f', 'best',
    '--get-url',
    '--no-playlist',
    url
  ], { timeout: 60000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('yt-dlp error:', stderr);
      return res.status(500).json({ error: stderr || err.message });
    }
    const urls = stdout.trim().split('\n').filter(Boolean);
    
    // Возвращаем ПРЯМУЮ ссылку на видео VK
    res.json({ 
      directUrl: urls[0], // Прямой URL VK CDN
      audioUrl: urls[1] || null
    });
  });
});

// In-memory rooms store
const rooms = {};

app.get('/health', (req, res) => res.json({ ok: true }));

// Create room
app.post('/api/rooms', (req, res) => {
  const roomId = uuidv4().slice(0, 8);
  rooms[roomId] = {
    id: roomId,
    videoSrc: null,
    videoType: null, // 'url' | 'local'
    state: { playing: false, currentTime: 0, updatedAt: Date.now() },
    members: {},
    messages: [],
  };
  res.json({ roomId });
});

const https = require('https')

app.get('/api/proxy', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: 'No URL provided' });
  
  console.log('Proxying URL:', videoUrl);
  
  // Парсим URL для правильной обработки
  let parsedUrl;
  try {
    parsedUrl = new URL(videoUrl);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  
  const client = parsedUrl.protocol === 'https:' ? https : http;
  
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'identity', // Не просим сжатие для видео
      'Referer': 'https://vk.com/',
      'Origin': 'https://vk.com',
      'Range': req.headers.range || '', // Поддержка частичных запросов
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'video',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site'
    },
    timeout: 30000
  };
  
  // Добавляем range если есть
  if (req.headers.range) {
    options.headers.Range = req.headers.range;
  }
  
  const proxyRequest = client.get(videoUrl, options, (proxyRes) => {
    // Логируем статус для отладки
    console.log('Proxy response status:', proxyRes.statusCode);
    
    // Если редирект - следуем за ним
    if (proxyRes.statusCode === 301 || proxyRes.statusCode === 302 || proxyRes.statusCode === 307) {
      const redirectUrl = proxyRes.headers.location;
      console.log('Redirecting to:', redirectUrl);
      if (redirectUrl) {
        // Делаем новый запрос на редирект
        const redirectClient = redirectUrl.startsWith('https') ? https : http;
        const redirectOptions = { ...options, headers: { ...options.headers } };
        
        redirectClient.get(redirectUrl, redirectOptions, (redirectRes) => {
          res.writeHead(redirectRes.statusCode, {
            'Content-Type': redirectRes.headers['content-type'] || 'video/mp4',
            'Content-Length': redirectRes.headers['content-length'] || '',
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600'
          });
          redirectRes.pipe(res);
        }).on('error', (e) => {
          console.error('Redirect error:', e.message);
          res.status(500).json({ error: 'Redirect failed' });
        });
        return;
      }
    }
    
    // Успешный ответ
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'video/mp4',
      'Content-Length': proxyRes.headers['content-length'] || '',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
      'Cache-Control': 'public, max-age=3600'
    });
    
    proxyRes.pipe(res);
  });
  
  proxyRequest.on('error', (e) => {
    console.error('Proxy error:', e.message);
    res.status(500).json({ error: 'Proxy failed: ' + e.message });
  });
  
  proxyRequest.on('timeout', () => {
    proxyRequest.destroy();
    res.status(504).json({ error: 'Request timeout' });
  });
});
// Get room info
app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms[req.params.roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({
    id: room.id,
    videoSrc: room.videoSrc,
    videoType: room.videoType,
    state: room.state,
    members: Object.values(room.members),
    messages: room.messages.slice(-100),
  });
});

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUser = null;

  socket.on('join_room', ({ roomId, nickname }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    currentRoom = roomId;
    currentUser = { id: socket.id, nickname: nickname || 'Гость', roomId };
    room.members[socket.id] = currentUser;

    socket.join(roomId);

    // Send current state to the new member
    socket.emit('room_state', {
      videoSrc: room.videoSrc,
      videoType: room.videoType,
      state: room.state,
      members: Object.values(room.members),
      messages: room.messages.slice(-100),
    });

    // Notify others
    socket.to(roomId).emit('member_joined', currentUser);
    io.to(roomId).emit('members_update', Object.values(room.members));

    // System message
    const sysMsg = {
      id: uuidv4(),
      type: 'system',
      text: `${currentUser.nickname} подключился`,
      ts: Date.now(),
    };
    room.messages.push(sysMsg);
    io.to(roomId).emit('chat_message', sysMsg);
  });

  // Video source set by host
  socket.on('set_video', ({ roomId, videoSrc, videoType }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.videoSrc = videoSrc;
    room.videoType = videoType;
    room.state = { playing: false, currentTime: 0, updatedAt: Date.now() };
    io.to(roomId).emit('video_changed', { videoSrc, videoType, state: room.state });
  });

  // Playback sync events
  socket.on('player_play', ({ roomId, currentTime }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.state = { playing: true, currentTime, updatedAt: Date.now() };
    socket.to(roomId).emit('player_play', { currentTime });
  });

  socket.on('player_pause', ({ roomId, currentTime }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.state = { playing: false, currentTime, updatedAt: Date.now() };
    socket.to(roomId).emit('player_pause', { currentTime });
  });

  socket.on('player_seek', ({ roomId, currentTime }) => {
    const room = rooms[roomId];
    if (!room) return;
    room.state = { ...room.state, currentTime, updatedAt: Date.now() };
    socket.to(roomId).emit('player_seek', { currentTime });
  });

  socket.on('member_time', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('member_time', { userId: socket.id, currentTime })
  })

  // Chat
  socket.on('chat_message', ({ roomId, text, emoji }) => {
    const room = rooms[roomId];
    if (!room || !currentUser) return;
    if (!text || text.trim().length === 0) return;

    const msg = {
      id: uuidv4(),
      type: 'message',
      userId: socket.id,
      nickname: currentUser.nickname,
      text: text.trim().slice(0, 500),
      emoji: emoji || null,
      ts: Date.now(),
    };
    room.messages.push(msg);
    if (room.messages.length > 200) room.messages.shift();
    io.to(roomId).emit('chat_message', msg);
  });

  socket.on('disconnect', () => {
    if (!currentRoom || !currentUser) return;
    const room = rooms[currentRoom];
    if (!room) return;

    delete room.members[socket.id];
    io.to(currentRoom).emit('members_update', Object.values(room.members));

    const sysMsg = {
      id: uuidv4(),
      type: 'system',
      text: `${currentUser.nickname} отключился`,
      ts: Date.now(),
    };
    room.messages.push(sysMsg);
    io.to(currentRoom).emit('chat_message', sysMsg);

    // Cleanup empty rooms after 1h
    if (Object.keys(room.members).length === 0) {
      setTimeout(() => {
        if (rooms[currentRoom] && Object.keys(rooms[currentRoom].members).length === 0) {
          delete rooms[currentRoom];
        }
      }, 3600000);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Moparty backend running on :${PORT}`));
