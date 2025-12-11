import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import RoomList from './components/RoomList';
import CreateRoom from './components/CreateRoom';
import RoomView from './components/RoomView';
import { socket } from './services/socket';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("loading"); // İlk başta 'loading' diyelim ki kontrol etsin
  const [activeRoom, setActiveRoom] = useState(null);
  const [realRooms, setRealRooms] = useState([]); 

  // 1. UYGULAMA BAŞLARKEN HAFIZAYI KONTROL ET
  useEffect(() => {
    const savedUser = localStorage.getItem('vortex_user');
    if (savedUser) {
      // Hafızada varsa direkt giriş yap
      setUser(JSON.parse(savedUser));
      setView("list");
    } else {
      // Yoksa giriş ekranına at
      setView("login");
    }
  }, []);

  // Socket Bağlantısı
  useEffect(() => {
    if (user) {
      socket.connect();
      socket.on('room_list_update', (rooms) => setRealRooms(rooms));
      return () => {
        socket.off('room_list_update');
        socket.disconnect();
      };
    }
  }, [user]);

  // 2. GİRİŞ YAPARKEN KAYDET
  const handleLogin = (username, gender) => {
    if (!username.trim()) return;
    const avatarUrl = `https://avatar.iran.liara.run/public/${gender}?username=${username}`;

    const userData = { username, avatar: avatarUrl };

    // Tarayıcı hafızasına yaz
    localStorage.setItem('vortex_user', JSON.stringify(userData));

    setUser(userData);
    setView("list");
  };

  // 3. ÇIKIŞ YAPMA (Hafızayı Temizle)
  const handleLogout = () => {
    localStorage.removeItem('vortex_user'); // Hafızayı sil
    setUser(null);
    setView("login"); // Giriş ekranına dön
  };

  const handleCreateRoom = (platform, initialUrl, initialVideoId, title, thumbnail) => {
    const roomId = `room_${Date.now()}`;
    const userAvatar = user.avatar; 

    socket.emit('join_room', {
        roomId,
        username: user.username,
        avatar: userAvatar,
        platform,
        initialVideo: initialUrl ? {
          url: initialUrl,
          videoId: initialVideoId,
          title: title || 'Başlatılıyor...',
          thumbnail: thumbnail || ''
        } : null
    });

    setActiveRoom({
      id: roomId,
      platform: platform,
      users: 1,
      avatars: [userAvatar],
      video: { url: initialUrl, videoId: initialVideoId }
    });

    setView("room");
  };

  const handleJoinExistingRoom = (room) => {
    const userAvatar = user.avatar;
    socket.emit('join_room', {
        roomId: room.id,
        username: user.username,
        avatar: userAvatar,
        platform: room.platform
    });
    setActiveRoom(room);
    setView("room");
  };

  // RENDER MANTIĞI
  if (view === "loading") return null; // Kontrol edilirken boş ekran (çok hızlı geçer)
  if (!user || view === "login") return <LoginScreen onJoin={handleLogin} />;

  if (view === "list") return (
    <RoomList 
      rooms={realRooms} 
      onNavigateCreate={() => setView("create")}
      onJoinRoom={handleJoinExistingRoom}
      onLogout={handleLogout} // Çıkış fonksiyonunu gönderdik
    />
  );

  if (view === "create") return (
    <CreateRoom 
      onBack={() => setView("list")}
      onCreate={handleCreateRoom}
    />
  );

  if (view === "room") return (
    <RoomView 
      room={activeRoom}
      username={user.username}
      onBack={() => {
        socket.emit('disconnect_room'); 
        setView("list");
      }}
    />
  );

  return null;
}
