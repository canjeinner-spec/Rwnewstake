const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const ytSearch = require('yt-search');

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000
});

let rooms = {};

const broadcastRoomList = () => {
  const list = Object.values(rooms).map((r) => ({
    id: r.id,
    title: r.video.title || 'Yeni Oda',
    platform: r.video.platform,
    thumbnail: r.video.thumbnail || 'https://picsum.photos/300/200',
    users: r.users.length,
    avatars: r.users.map((u) => u.avatar)
  }));
  io.emit('room_list_update', list);
};

io.on('connection', (socket) => {
  broadcastRoomList();

  // YOUTUBE ARAMA - OPTİMİZE EDİLDİ
  socket.on('search_youtube', async (query) => {
    if (!query) return;
    try {
      // Arama işlemini hafifletmek için sadece gerekli alanları alıyoruz
      const r = await ytSearch(query);
      const videos = r.videos
        .slice(0, 10) // İlk 10 sonucu al, filtrelemeyi azalttık hız için
        .map((v) => ({
          title: v.title,
          timestamp: v.timestamp,
          thumbnail: v.thumbnail,
          url: v.url,
          videoId: v.videoId,
          author: v.author.name,
          views: v.views
        }));
      socket.emit('search_results', videos);
    } catch (e) {
      console.log("Arama Hatası:", e);
      socket.emit('search_results', []);
    }
  });

  socket.on('join_room', ({ roomId, username, avatar, platform, initialVideo }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        id: roomId,
        hostId: socket.id,
        users: [],
        video: {
          platform: platform || 'YouTube',
          url: initialVideo?.url || '',
          title: initialVideo?.title || 'Oda',
          thumbnail: initialVideo?.thumbnail || '',
          isPlaying: false,
          time: 0,
          lastUpdate: Date.now()
        }
      };
    }

    const room = rooms[roomId];

    const idx = room.users.findIndex((u) => u.id === socket.id);
    if (idx !== -1) {
      room.users[idx] = { id: socket.id, username, avatar };
    } else {
      room.users.push({ id: socket.id, username, avatar });
    }

    const now = Date.now();
    let currentTime = room.video.time || 0;
    if (room.video.isPlaying && room.video.lastUpdate) {
      const diff = (now - room.video.lastUpdate) / 1000;
      currentTime += diff;
    }

    const isHost = room.hostId === socket.id;

    io.to(roomId).emit('room_data', room);

    // Yeni girene güncel durumu zorla gönder
    io.to(socket.id).emit('sync_video', {
      ...room.video,
      time: currentTime,
      isPlaying: room.video.isPlaying, // Host olsun olmasın odanın durumu neyse o
      action: 'load' // Player'ı tetiklemesi için load gönderiyoruz
    });

    broadcastRoomList();
  });

  socket.on('video_change', (data) => {
    const room = rooms[data.roomId];
    if (!room) return;

    // Sadece host değiştirebilir (Güvenlik)
    if (socket.id !== room.hostId) return;

    const now = Date.now();

    if (data.action === 'load') {
      room.video.url = data.url;
      room.video.title = data.title || room.video.title;
      room.video.thumbnail = data.thumbnail || room.video.thumbnail;
      room.video.platform = data.platform || room.video.platform;
      room.video.time = 0;
      room.video.isPlaying = true;
      room.video.lastUpdate = now;

      // Herkese videoyu baştan yükle emri ver
      io.to(data.roomId).emit(
        'sync_video',
        { ...room.video, action: 'load', time: 0 }
      );
      io.to(data.roomId).emit('room_data', room);
      broadcastRoomList();
      return;
    }

    if (data.action === 'play') {
      room.video.time = typeof data.time === 'number' ? data.time : room.video.time;
      room.video.isPlaying = true;
      room.video.lastUpdate = now;
    } else if (data.action === 'pause') {
      room.video.time = typeof data.time === 'number' ? data.time : room.video.time;
      room.video.isPlaying = false;
      room.video.lastUpdate = now;
    } else if (data.action === 'seek') {
      room.video.time = typeof data.time === 'number' ? data.time : 0;
      room.video.lastUpdate = now;
    } else if (data.action === 'time') {
        // Time update sadece state günceller, herkese yaymaz (trafik tasarrufu)
        room.video.time = typeof data.time === 'number' ? data.time : room.video.time;
        room.video.lastUpdate = now;
        return; 
    }

    socket.to(data.roomId).emit(
      'sync_video',
      { ...room.video, action: data.action }
    );
  });

  socket.on('resync_video', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    const now = Date.now();
    let currentTime = room.video.time || 0;

    if (room.video.isPlaying && room.video.lastUpdate) {
      const diff = (now - room.video.lastUpdate) / 1000;
      currentTime += diff;
    }

    io.to(socket.id).emit('sync_video', {
      ...room.video,
      time: currentTime,
      isPlaying: room.video.isPlaying,
      action: 'sync' // Load yerine sync diyerek player'ı resetlemeden zamanı düzelt
    });
  });

  socket.on('send_message', ({ roomId, message, username, avatar }) => {
    io.to(roomId).emit('receive_message', {
      id: Date.now(),
      senderId: socket.id,
      user: username,
      text: message,
      avatar
    });
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const idx = room.users.findIndex((u) => u.id === socket.id);
      if (idx !== -1) {
        const left = room.users[idx];
        room.users.splice(idx, 1);

        if (room.users.length === 0) {
          delete rooms[roomId];
        } else {
          if (left.id === room.hostId) {
            room.hostId = room.users[0].id;
          }
          io.to(roomId).emit('room_data', room);
        }
        broadcastRoomList();
      }
    }
  });
});

app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'build', 'index.html'))
);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0');
