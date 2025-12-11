import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Play,
  Globe,
  X,
  AlertTriangle,
  Loader2,
  Lock
} from 'lucide-react';
import { socket } from '../services/socket';

const SERVICES = [
  { name: 'YouTube', color: 'text-white', status: 'active', icon: <Play fill="currentColor" /> },
  { name: 'Web', color: 'text-slate-300', status: 'active', icon: <Globe /> },
  { name: 'Netflix', color: 'text-red-600', status: 'soon' },
  { name: 'Disney+', color: 'text-blue-300', status: 'soon' },
  { name: 'Prime', color: 'text-blue-400', status: 'soon' },
  { name: 'Spotify', color: 'text-green-500', status: 'soon' }
];

export default function CreateRoom({ onBack, onCreate }) {
  const [toast, setToast] = useState(null);
  const [setupModal, setSetupModal] = useState(null);
  const [initialInput, setInitialInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    const handleResults = (results) => {
      setSearchResults(results);
      setIsSearching(false);
    };
    socket.on('search_results', handleResults);
    return () => {
      socket.off('search_results', handleResults);
    };
  }, []);

  const handleServiceClick = (service) => {
    if (service.status === 'soon') {
      setToast({
        title: 'Yakında',
        message: `${service.name} entegrasyonu geliştirme aşamasında. Şimdilik YouTube veya Web kullanın!`
      });
      setTimeout(() => setToast(null), 3000);
    } else {
      setSetupModal(service.name);
      setInitialInput('');
      setSearchResults([]);
    }
  };

  const handleSearch = () => {
    if (!initialInput.trim()) return;
    setIsSearching(true);
    socket.emit('search_youtube', initialInput);
  };

  const handleSelectVideo = (video) => {
    onCreate('YouTube', video.url, video.videoId, video.title, video.thumbnail);
  };

  // WEB ODASI: URL’yi başlıkta gizle / sadeleştir
  const handleStartWeb = () => {
    if (!initialInput.trim()) return;
    let finalUrl = initialInput.trim();
    if (!finalUrl.startsWith('http')) finalUrl = `https://${finalUrl}`;

    let label = 'Web Odası';
    try {
      const u = new URL(finalUrl);
      const host = u.hostname.replace(/^www\./, '');
      label = `Web • ${host}`;
    } catch {
      // URL hatalıysa generic kalsın
    }

    onCreate('Web', finalUrl, null, label, '');
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-white relative overflow-hidden">
      <div className="p-6 pt-8 flex items-center relative shrink-0">
        <button
          onClick={onBack}
          className="absolute left-6 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="text-slate-300 w-6 h-6" />
        </button>
        <h1 className="w-full text-center text-2xl font-black tracking-widest text-slate-100">
          PLATFORM
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4 mt-2">
          {SERVICES.map((service) => (
            <div
              key={service.name}
              onClick={() => handleServiceClick(service)}
              className={`aspect-square bg-slate-900/50 border border-white/5 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all group relative overflow-hidden ${
                service.status === 'soon'
                  ? 'opacity-60 grayscale'
                  : 'hover:bg-slate-800 hover:border-cyan-500/30'
              }`}
            >
              {service.status === 'soon' && (
                <div className="absolute top-2 right-2">
                  <Lock size={14} className="text-yellow-500/50" />
                </div>
              )}
              <div className="transform group-hover:scale-105 transition-transform duration-300 flex flex-col items-center">
                <span className={`font-bold text-2xl ${service.color}`}>{service.name}</span>
              </div>
              {service.status === 'soon' && (
                <div className="absolute bottom-6 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                  <span className="text-[10px] font-bold text-yellow-500 tracking-widest uppercase">
                    YAKINDA
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div className="absolute top-24 left-6 right-6 z-50 animate-in slide-in-from-top-5 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-yellow-500/50 p-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <AlertTriangle className="text-yellow-500 shrink-0" />
            <div>
              <h4 className="font-bold text-white text-sm">{toast.title}</h4>
              <p className="text-slate-400 text-xs">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* SETUP MODALI – klavye için ortalanmış + scrollable */}
      {setupModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl border border-white/10 p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">{setupModal}</h3>
              <button onClick={() => setSetupModal(null)}>
                <X className="text-slate-500" />
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none"
                placeholder={
                  setupModal === 'YouTube' ? 'Video ara...' : 'https://...'
                }
                value={initialInput}
                onChange={(e) => setInitialInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  (setupModal === 'YouTube' ? handleSearch() : handleStartWeb())
                }
                autoFocus
              />
              <button
                onClick={setupModal === 'YouTube' ? handleSearch : handleStartWeb}
                className="bg-cyan-600 px-4 rounded-xl font-bold text-white text-sm flex items-center justify-center min-w-[64px]"
              >
                {isSearching && setupModal === 'YouTube' ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  'GİT'
                )}
              </button>
            </div>

            {/* YouTube sonuç listesi */}
            {setupModal === 'YouTube' && (
              <div className="flex-1 overflow-y-auto space-y-3 mt-1">
                {searchResults.map((video, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectVideo(video)}
                    className="flex gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg"
                  >
                    <img
                      src={video.thumbnail}
                      className="w-20 h-12 object-cover rounded"
                      alt="th"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">
                        {video.title}
                      </h4>
                      <p className="text-xs text-slate-500">{video.author}</p>
                    </div>
                  </div>
                ))}
                {isSearching && searchResults.length === 0 && (
                  <p className="text-center text-xs text-slate-500 py-4">
                    YouTube aranıyor...
                  </p>
                )}
              </div>
            )}

            {/* Web açıklaması */}
            {setupModal === 'Web' && (
              <p className="mt-3 text-slate-500 text-xs text-center border border-white/5 p-4 rounded-xl bg-white/5">
                Web sitesi adresini (örn: google.com) veya video linkini (.mp4) yapıştırın.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
