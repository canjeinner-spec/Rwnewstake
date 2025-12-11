import React, { useState } from 'react';
import { User, UserCircle2 } from 'lucide-react';

export default function LoginScreen({ onJoin }) {
  const [input, setInput] = useState("");
  const [gender, setGender] = useState("boy"); // Varsayılan Erkek

  return (
    <div className="w-full h-[100dvh] bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative z-10">

        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-white tracking-tighter select-none mb-1">
            VORTEX
          </h1>
          <div className="h-1 w-20 bg-gradient-to-r from-cyan-500 to-purple-500 mx-auto rounded-full"></div>
        </div>

        <div className="space-y-6">

          {/* AVATAR SEÇİMİ */}
          <div className="flex justify-center gap-4 mb-6">
            <button 
              onClick={() => setGender('boy')}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${gender === 'boy' ? 'bg-cyan-500/20 border-cyan-500 scale-110' : 'bg-slate-800 border-white/5 opacity-60'}`}
            >
              <img src="https://avatar.iran.liara.run/public/boy" className="w-12 h-12" alt="Boy"/>
              <span className="text-[10px] font-bold text-white">ERKEK</span>
            </button>

            <button 
              onClick={() => setGender('girl')}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${gender === 'girl' ? 'bg-pink-500/20 border-pink-500 scale-110' : 'bg-slate-800 border-white/5 opacity-60'}`}
            >
              <img src="https://avatar.iran.liara.run/public/girl" className="w-12 h-12" alt="Girl"/>
              <span className="text-[10px] font-bold text-white">KADIN</span>
            </button>
          </div>

          <div className="group">
            <input 
              type="text" 
              className="w-full bg-black/50 text-white p-4 rounded-xl outline-none border border-white/10 focus:border-cyan-500 transition-all text-center font-bold text-lg placeholder:text-slate-600"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && input.trim() && onJoin(input, gender)}
              placeholder="Kullanıcı Adı"
              autoFocus
            />
          </div>

          <button 
            onClick={() => onJoin(input, gender)}
            disabled={!input.trim()}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 rounded-xl font-bold tracking-wide shadow-lg shadow-cyan-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            GİRİŞ YAP
          </button>
        </div>
      </div>
    </div>
  );
}
