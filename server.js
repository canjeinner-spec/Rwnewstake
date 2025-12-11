const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const cors = require('cors');
const ytSearch = require('yt-search');

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000
});

let rooms = {};

const broadcastRoomList = () => {
  const list = Object.values(rooms).map(r => ({
    id: r.id,
    title: r.video.title || "Yeni Oda",
    platform: r.video.platform,
    thumbnail: r.video.thumbnail || "https://picsum.photos/300/200",
    users: r.users.length,
    avatars: r.users.map(u => u.avatar)
  }));
  io.emit('room_list_update', list);
};

io.on('connection', (socket) => {

  broadcastRoomList();

  socket.on('search_youtube', async (query) => {
    if (!query) return;
    try {
      const r = await ytSearch(query);
      const videos = r.videos
        .filter(v => v.type === 'video' && v.seconds < 7200)
        .slice(0, 10)
        .map(v => ({
          title: v.title,
          timestamp: v.timestamp,
          thumbnail: v.thumbnail,
          url: v.url,
          videoId: v.videoId,
          author: v.author.name,
          views: v.views
        }));
      socket.emit('search_results', videos);
    } catch (e) {}
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
          time: 0
        }
      };
    }

    const room = rooms[roomId];

    const idx = room.users.findIndex(u => u.id === socket.id);
    if (idx !== -1) {
      room.users[idx] = { id: socket.id, username, avatar };
    } else {
      room.users.push({ id: socket.id, username, avatar });
    }

    io.to(roomId).emit('room_data', room);

    const isHost = room.hostId === socket.id;

    io.to(socket.id).emit('sync_video', {
      ...room.video,
      isPlaying: isHost ? room.video.isPlaying : false,
      action: 'load',
      time: room.video.time
    });

    broadcastRoomList();
  });

  socket.on('video_change', (data) => {
    const room = rooms[data.roomId];
    if (!room) return;

    if (data.action === 'time') {
      room.video.time = data.time;
      return;
    }

    if (data.action === 'load') {
      room.video.url = data.url;
      room.video.title = data.title || room.video.title;
      room.video.thumbnail = data.thumbnail || room.video.thumbnail;
      room.video.platform = data.platform || room.video.platform;
      room.video.time = 0;
      room.video.isPlaying = true;

      io.to(data.roomId).emit('sync_video', { ...room.video, action: 'load' });
      io.to(data.roomId).emit('room_data', room);
      broadcastRoomList();
      return;
    }

    room.video.time = data.time;
    room.video.isPlaying = data.action === 'play';

    socket.to(data.roomId).emit('sync_video', { ...room.video, action: data.action });
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
      const idx = room.users.findIndex(u => u.id === socket.id);
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