import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import {
  Mic,
  MicOff,
  ArrowLeft,
  Search,
  Send,
  Play,
  X,
  Settings,
  Users,
  Volume2,
  Globe,
  Sparkles,
  Lock
} from 'lucide-react';
import { socket } from '../services/socket';

const PLATFORMS = [
  { name: 'YouTube', color: 'text-white', icon: <Play fill="currentColor" /> },
  { name: 'Web', color: 'text-slate-300', icon: <Globe /> },
  { name: 'Netflix', color: 'text-red-600', status: 'soon' },
  { name: 'Disney+', color: 'text-blue-300', status: 'soon' }
];

export default function RoomView({ room, username, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [videoUrl, setVideoUrl] = useState(room.video?.url || '');
  const [isPlaying, setIsPlaying] = useState(room.video?.isPlaying || false);
  const [volumeBalance, setVolumeBalance] = useState(0.2);
  const [currentRoom, setCurrentRoom] = useState(room);
  const [isCinemaMode, setIsCinemaMode] = useState(true);

  const [showUserList, setShowUserList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [activeSearchPlatform, setActiveSearchPlatform] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isMicVisualOn, setIsMicVisualOn] = useState(false);

  const [pendingSeek, setPendingSeek] = useState(null);

  const chatEndRef = useRef(null);
  const playerRef = useRef(null);

  const isDirectVideoFile = (url) => {
    if (!url) return false;
    const extension = url.split('.').pop().split('?')[0].toLowerCase();
    return ['mp4', 'm3u8', 'mov', 'webm', 'ogv'].includes(extension);
  };

  const shouldUseReactPlayer =
    currentRoom.video?.platform === 'YouTube' || isDirectVideoFile(videoUrl);
  const isHost = currentRoom?.hostId === socket.id;

  useEffect(() => {
    socket.emit('join_room', {
      roomId: room.id,
      username,
      avatar: `https://ui-avatars.com/api/?name=${username}&background=random`,
      platform: room.platform
    });

    socket.on('room_data', (updatedRoom) => setCurrentRoom(updatedRoom));

    socket.on('sync_video', (data) => {
      if (data.url && data.url !== videoUrl) {
        setVideoUrl(data.url);
      }

      if (data.platform) {
        setCurrentRoom((prev) => ({
          ...prev,
          video: {
            ...(prev.video || {}),
            platform: data.platform,
            thumbnail: data.thumbnail || prev.video?.thumbnail || ''
          }
        }));
      }

      setIsPlaying(data.isPlaying);

      const targetTime = typeof data.time === 'number' ? data.time : 0;
      const useRP =
        data.platform === 'YouTube' || isDirectVideoFile(data.url || videoUrl);

      if (useRP) {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const current = playerRef.current.getCurrentTime();
          if (Number.isFinite(current)) {
            const diff = Math.abs(current - targetTime);
            if (diff > 0.3) {
              playerRef.current.seekTo(targetTime, 'seconds');
            }
          } else {
            setPendingSeek(targetTime);
          }
        } else {
          setPendingSeek(targetTime);
        }
      }
    });

    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, { ...msg, isMe: msg.senderId === socket.id }]);
    });

    socket.on('search_results', (results) => setSearchResults(results));

    return () => {
      socket.off('room_data');
      socket.off('sync_video');
      socket.off('receive_message');
      socket.off('search_results');
    };
  }, [username, room.id, videoUrl]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Host periyodik time ping (delay'i daha da azaltmak için)
  useEffect(() => {
    if (!shouldUseReactPlayer) return;
    if (!isPlaying) return;
    if (!isHost) return;
    if (!playerRef.current) return;

    const interval = setInterval(() => {
      const t = playerRef.current?.getCurrentTime?.();
      if (typeof t === 'number') {
        socket.emit('video_change', {
          roomId: room.id,
          action: 'time',
          time: t,
          url: videoUrl
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, isHost, shouldUseReactPlayer, videoUrl, room.id]);

  const handlePlatformClick = (p) => {
    if (p.status === 'soon') return;
    if (!isHost) return;
    setActiveSearchPlatform(p.name);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    if (activeSearchPlatform === 'Web') {
      let url = searchQuery;
      if (!url.startsWith('http')) url = `https://${url}`;
      const isVideo = isDirectVideoFile(url);
      selectVideo({ url, title: 'Web', platform: isVideo ? 'RawVideo' : 'Web' });
    } else {
      socket.emit('search_youtube', searchQuery);
    }
  };

  const selectVideo = (vid) => {
    if (!isHost) return;

    socket.emit('video_change', {
      roomId: room.id,
      action: 'load',
      url: vid.url,
      title: vid.title,
      thumbnail: vid.thumbnail,
      platform: vid.platform || 'YouTube',
      time: 0
    });

    setSearchResults([]);
    setSearchQuery('');
    setActiveSearchPlatform(null);
    setShowPlatformModal(false);
  };

  const sendMessage = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    socket.emit('send_message', {
      roomId: room.id,
      message: inputText,
      username,
      avatar: `https://ui-avatars.com/api/?name=${username}&background=random`
    });
    setInputText('');
  };

  const handlePlay = () => {
    if (!isHost) return;
    setIsPlaying(true);
    socket.emit('video_change', {
      roomId: room.id,
      action: 'play',
      time: playerRef.current?.getCurrentTime() || 0,
      url: videoUrl
    });
  };

  const handlePause = () => {
    if (!isHost) return;
    setIsPlaying(false);
    socket.emit('video_change', {
      roomId: room.id,
      action: 'pause',
      time: playerRef.current?.getCurrentTime() || 0,
      url: videoUrl
    });
  };

  const handleSeek = (newTime) => {
    if (!isHost) return;
    socket.emit('video_change', {
      roomId: room.id,
      action: 'seek',
      time: newTime,
      url: videoUrl
    });
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 relative overflow-hidden">
      {isCinemaMode && currentRoom.video?.thumbnail && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center opacity-40 scale-150 blur-[80px]"
            style={{ backgroundImage: `url(${currentRoom.video.thumbnail})` }}
          />
          <div className="absolute inset-0 bg-slate-950/60" />
        </div>
      )}

      <div className="shrink-0 z-30 bg-gradient-to-b from-black/80 to-transparent pb-2 pt-4 px-4 flex items-center justify-between h-16 relative">
        <button
          onClick={onBack}
          className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center">
          <h1 className="text-3xl font-black text-white">VORTEX</h1>
        </div>

        <div className="flex gap-2 z-20">
          <button
            onClick={() => isHost && setShowPlatformModal(true)}
            disabled={!isHost}
            className={`p-2 bg-white/10 backdrop-blur-md rounded-full text-white transition ${
              !isHost ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/20'
            }`}
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => setShowUserList(true)}
            className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white relative"
          >
            <Users size={20} />
            <span className="absolute -top-1 -right-1 bg-cyan-500 text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
              {currentRoom?.users?.length || 1}
            </span>
          </button>
        </div>
      </div>

      <div className="w-full aspect-video bg-black relative shrink-0 z-10 border-b border-white/5">
        {shouldUseReactPlayer ? (
          videoUrl ? (
            <ReactPlayer
              key={videoUrl}
              ref={playerRef}
              url={videoUrl}
              width="100%"
              height="100%"
              playing={isPlaying}
              controls={isHost}
              onPlay={isHost ? handlePlay : undefined}
              onPause={isHost ? handlePause : undefined}
              onSeek={isHost ? handleSeek : undefined}
              onReady={() => {
                if (pendingSeek != null && playerRef.current) {
                  playerRef.current.seekTo(pendingSeek, 'seconds');
                  setPendingSeek(null);
                }
              }}
              volume={Math.max(0, 1 - volumeBalance)}
              style={{ backgroundColor: '#000' }}
              config={{
                youtube: {
                  playerVars: {
                    origin: window.location.origin,
                    playsinline: 1,
                    showinfo: 0,
                    rel: 0,
                    modestbranding: 1
                  }
                },
                file: {
                  attributes: { controlsList: 'nodownload' }
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600">
              <Play size={48} className="text-slate-800 mb-2" />
            </div>
          )
        ) : videoUrl ? (
          <iframe
            src={videoUrl}
            className="w-full h-full border-none bg-white"
            title="Web"
            sandbox="allow-forms allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600">
            <Globe size={48} className="text-slate-800 mb-2" />
          </div>
        )}
      </div>

      <div className="flex-1 relative flex flex-col min-h-0 z-10">
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 flex flex-col justify-end">
          {messages.map((msg, i) => {
            const isHostMsg = currentRoom?.hostId === msg.senderId;
            return (
              <div
                key={i}
                className={`flex gap-3 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}
              >
                <div className="relative shrink-0 mb-1">
                  <img
                    src={msg.avatar}
                    className={`w-9 h-9 rounded-full object-cover ${
                      isHostMsg ? 'ring-2 ring-yellow-500/80' : ''
                    }`}
                    alt=""
                  />
                </div>
                <div
                  className={`flex flex-col max-w-[70%] ${
                    msg.isMe ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 ml-1 mb-1">
                    <span
                      className={`text-[10px] font-bold ${
                        isHostMsg ? 'text-yellow-500' : 'text-slate-400'
                      }`}
                    >
                      {msg.user}
                    </span>
                    {isHostMsg && (
                      <span className="text-[8px] bg-yellow-500 text-black px-1 rounded font-bold">
                        ODA SAHİBİ
                      </span>
                    )}
                  </div>
                  <div
                    className={`px-4 py-2 text-sm break-words leading-relaxed rounded-2xl ${
                      msg.isMe
                        ? 'bg-cyan-600/90 text-white rounded-br-sm'
                        : 'bg-slate-800/80 text-slate-200 rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="shrink-0 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 p-3 flex items-center gap-3 pb-safe-area">
        <button
          onClick={() => setIsMicVisualOn(!isMicVisualOn)}
          className={`p-3 rounded-full ${
            isMicVisualOn ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {isMicVisualOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <form
          onSubmit={sendMessage}
          className="flex-1 bg-slate-950/50 rounded-full h-11 flex items-center px-4 border border-white/5"
        >
          <input
            className="bg-transparent outline-none text-white text-sm w-full"
            placeholder="Mesaj yaz..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </form>
        <button onClick={() => setIsCinemaMode(!isCinemaMode)} className="p-3 text-yellow-400">
          <Sparkles size={20} />
        </button>
        <button onClick={() => setShowSettings(true)} className="p-3 text-slate-400">
          <Settings size={20} />
        </button>
      </div>

      {showPlatformModal && (
        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6">
          <button
            onClick={() => {
              setShowPlatformModal(false);
              setActiveSearchPlatform(null);
            }}
            className="absolute top-6 right-6 text-slate-400"
          >
            <X size={24} />
          </button>

          {!activeSearchPlatform ? (
            <div className="w-full max-w-sm">
              <h2 className="text-white text-xl font-bold text-center mb-6">
                Ne izlemek istersin?
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {PLATFORMS.map((p) => (
                  <div
                    key={p.name}
                    onClick={() => handlePlatformClick(p)}
                    className={`aspect-square bg-slate-800/50 border border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700 ${
                      p.status === 'soon' ? 'opacity-50' : ''
                    }`}
                  >
                    {p.status === 'soon' && (
                      <Lock size={16} className="text-yellow-500/50 mb-2" />
                    )}
                    <div className={`transform scale-150 mb-2 ${p.color}`}>{p.icon}</div>
                    <span className="text-white font-bold">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full max-w-sm">
              <div className="flex items-center gap-2 mb-4 text-white">
                <button onClick={() => setActiveSearchPlatform(null)}>
                  <ArrowLeft />
                </button>
                <h2 className="text-xl font-bold">{activeSearchPlatform}</h2>
              </div>
              <div className="flex gap-2 mb-4">
                <input
                  className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                  placeholder={
                    activeSearchPlatform === 'YouTube' ? 'Video ara...' : 'https://...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  className="bg-cyan-600 px-4 rounded-xl font-bold text-white"
                >
                  ARA
                </button>
              </div>
              {activeSearchPlatform === 'YouTube' && (
                <div className="max-h-[50vh] overflow-y-auto space-y-2">
                  {searchResults.map((vid, i) => (
                    <div
                      key={i}
                      onClick={() => selectVideo(vid)}
                      className="flex gap-3 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10"
                    >
                      <img src={vid.thumbnail} className="w-24 h-16 object-cover rounded" alt="" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-sm font-bold truncate">{vid.title}</h4>
                        <p className="text-xs text-slate-400">{vid.author}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showSettings && (
        <div className="absolute inset-0 z-[60] bg-black/80 flex items-center justify-center">
          <div className="bg-slate-900 w-80 p-6 rounded-3xl border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-bold">Ses Dengesi</h3>
              <button onClick={() => setShowSettings(false)}>
                <X className="text-slate-400" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <Volume2 className="text-cyan-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volumeBalance}
                onChange={(e) => setVolumeBalance(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {showUserList && (
        <div className="absolute inset-y-0 right-0 z-[60] w-64 bg-slate-900 border-l border-white/10 shadow-2xl">
          <div className="flex justify-between items-center p-4 border-b border-white/10">
            <h3 className="text-white font-bold">
              Kullanıcılar ({currentRoom?.users?.length || 0})
            </h3>
            <button onClick={() => setShowUserList(false)}>
              <X className="text-slate-400" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            {currentRoom?.users?.map((u, i) => (
              <div key={i} className="flex items-center gap-3">
                <img
                  src={u.avatar}
                  className={`w-8 h-8 rounded-full ${
                    u.id === currentRoom.hostId ? 'ring-2 ring-yellow-500' : ''
                  }`}
                  alt=""
                />
                <div>
                  <p
                    className={`text-sm ${
                      u.id === currentRoom.hostId ? 'text-yellow-500 font-bold' : 'text-white'
                    }`}
                  >
                    {u.username}
                  </p>
                  {u.id === currentRoom.hostId && (
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1 rounded">
                      HOST
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
