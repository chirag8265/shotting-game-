import React from 'react';
import { Play, RotateCcw, Settings, Home } from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onHome: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRestart,
  onOpenSettings,
  onHome,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F1A]/85 backdrop-blur-2xl flex items-center justify-center p-4 select-none">
      {/* Ambient background glow */}
      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-red-600 rounded-full blur-[100px]" />
      </div>

      <div className="relative bg-white/5 border border-white/15 max-w-sm w-full p-6 md:p-8 rounded-3xl shadow-2xl shadow-black/80 backdrop-blur-2xl flex flex-col items-center text-center">
        <h3 className="text-2xl font-heading font-black text-white tracking-wider mb-1 uppercase">
          TACTICAL PAUSE
        </h3>
        <p className="text-xs font-mono-tech text-white/40 mb-6 uppercase">
          COMBAT ZONE SIMULATION SUSPENDED
        </p>

        <div className="w-full space-y-3">
          <button
            onClick={onResume}
            className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-heading font-black text-sm tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 cursor-pointer border-t border-white/30"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>RESUME COMBAT</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-heading font-bold text-sm tracking-wider uppercase backdrop-blur-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>RESTART MATCH</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-heading font-bold text-sm tracking-wider uppercase backdrop-blur-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-blue-400" />
            <span>SETTINGS</span>
          </button>

          <button
            onClick={onHome}
            className="w-full py-3.5 px-4 rounded-2xl bg-red-950/30 hover:bg-red-950/60 border border-red-500/20 text-red-300 font-heading font-bold text-sm tracking-wider uppercase backdrop-blur-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>QUIT TO MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
