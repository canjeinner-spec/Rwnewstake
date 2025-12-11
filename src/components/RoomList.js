import React, { useState } from 'react';
import { Plus, Globe, Info, X, Instagram, LogOut } from 'lucide-react';

// onLogout prop'unu ekledik
export default function RoomList({ rooms, onNavigateCreate, onJoinRoom, onLogout }) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 relative">
      {/* Header */}
      <div className="flex justify-between items-center p-6 pt-8 bg-gradient-to-b from-cyan-950/20 to-transparent">
        <button onClick={() => setShowInfo(true)} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors group">
           <Info className="text-slate-400 w-7 h-7 group-hover:text-cyan-400 transition-colors" />
        </button>
        <h1 className="text-3xl font-black tracking-tighter text-white select-none">VORTEX</h1>
        <div className="w-6" /> 
      </div>

      <div className="px-6 pb-4 flex items-center gap-2 border-b border-white/5 mx-4 mb-4">
        <Globe className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span className="text-lg font-bold text-slate-200">Canlı Odalar</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4 scrollbar-hide">
        {rooms.length === 0 && (
            <div className="text-center text-slate-600 mt-20 flex flex-col items-center">
                <Globe size={48} className="opacity-20 mb-4"/>
                <p className="text-sm">Henüz aktif oda yok.<br/>Yayını sen başlat!</p>
            </div>
        )}
        {rooms.map((room) => (
          <div 
            key={room.id} 
            onClick={() => onJoinRoom(room)}
            className="group relative bg-slate-900/60 backdrop-blur-sm rounded-3xl overflow-hidden flex h-32 cursor-pointer border border-white/5 hover:border-cyan-500/30 transition-all shadow-lg active:scale-[0.98]"
          >
            <div className="w-[40%] h-full relative">
              <img src={room.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="thumb" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
              <div className="absolute top-2 left-2 bg-red-600/90 text-[10px] px-2 py-0.5 rounded-full font-bold text-white shadow-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> CANLI
              </div>
            </div>

            <div className="flex-1 p-4 flex flex-col justify-between relative z-10">
              <div>
                <h3 className="text-slate-100 font-bold text-sm leading-snug line-clamp-2 mb-1">{room.title}</h3>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-950/30 px-2 py-1 rounded-md inline-block">
                  {room.platform}
                </span>
              </div>
              <div className="flex items-center justify-end">
                 <div className="flex -space-x-3 mr-3">
                    {room.avatars.slice(0, 3).map((av, i) => (
                      <img key={i} src={av} className="w-7 h-7 rounded-full border-2 border-slate-900" alt="u" />
                    ))}
                 </div>
                 <div className="bg-slate-800 text-cyan-400 text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center border border-white/10">
                   +{room.users}
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={onNavigateCreate}
        className="absolute bottom-8 right-6 w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_-5px_rgba(6,182,212,0.5)] hover:scale-110 active:scale-95 transition-all z-40"
      >
        <Plus size={36} strokeWidth={3} />
      </button>

      {/* --- INFO MODAL --- */}
      {showInfo && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-start">
           <div className="bg-slate-950 w-[85%] sm:w-[60%] h-full border-r border-white/10 p-6 animate-in slide-in-from-left duration-300 relative shadow-2xl flex flex-col justify-between">

              <div>
                <button onClick={() => setShowInfo(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X /></button>
                <h2 className="text-4xl font-black text-white mb-1 tracking-tighter mt-4">VORTEX</h2>
                <span className="text-[10px] text-cyan-500 font-mono tracking-widest bg-cyan-900/20 px-2 py-1 rounded">VERSION 1.6</span>
              </div>

              <div className="mb-auto mt-12">
                 <div className="p-6 bg-gradient-to-br from-purple-900/20 to-pink-900/10 rounded-3xl border border-white/5">
                    <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-xs uppercase tracking-wider opacity-70">Development</h3>
                    <div className="flex items-center gap-4">
                       <div className="relative group cursor-pointer">
                           <div className="w-14 h-14 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full p-[2px] shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
                              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
                                <Instagram size={28} className="text-white"/>
                              </div>
                           </div>
                       </div>
                       <div>
                          <p className="text-white font-bold text-lg tracking-tight">@ardaowski</p>
                          <p className="text-slate-400 text-xs font-mono">Full Stack Developer</p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* ALT KISIM: ÇIKIŞ YAP BUTONU */}
              <div className="pb-4">
                 <button 
                    onClick={() => {
                        onLogout(); // Çıkış yap
                        setShowInfo(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all font-bold text-xs tracking-wider"
                 >
                    <LogOut size={16} />
                    ÇIKIŞ YAP
                 </button>
              </div>

           </div>
        </div>
      )}
    </div>
  );
}
