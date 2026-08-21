import React from 'react';
import { Trophy, Skull, Zap, Clock, Trash2 } from 'lucide-react';
import { LeaderboardEntry } from '../types/game';

interface LeaderboardModalProps {
  entries: LeaderboardEntry[];
  onClose: () => void;
  onClear: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  entries,
  onClose,
  onClear,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F1A]/85 backdrop-blur-2xl flex items-center justify-center p-4 select-none">
      {/* Ambient background glow */}
      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-red-600 rounded-full blur-[100px]" />
      </div>

      <div className="relative bg-white/5 border border-white/15 max-w-2xl w-full p-6 md:p-8 rounded-3xl shadow-2xl shadow-black/80 backdrop-blur-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-heading font-black text-white tracking-wider uppercase">
                COMBAT HALL OF FAME
              </h3>
              <p className="text-xs text-white/40 font-mono-tech">TOP RECENT COMBAT RECORDS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white font-bold text-xl px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/5"
          >
            ✕
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-2">
          {entries.length === 0 ? (
            <div className="py-16 text-center text-white/40 font-mono-tech">
              NO MATCH RECORDS FOUND YET.<br />DEPLOY INTO THE BATTLEZONE TO RECORD YOUR STATS!
            </div>
          ) : (
            entries.map((entry, index) => (
              <div
                key={entry.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition backdrop-blur-xl ${
                  entry.victory
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                    : 'bg-white/5 border-white/10 text-white/80'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-heading font-black text-xs ${
                      index === 0
                        ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30'
                        : index === 1
                        ? 'bg-white/80 text-black'
                        : index === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    #{index + 1}
                  </div>

                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{entry.playerName}</span>
                      {entry.victory && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          VICTORY
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-white/40 font-mono-tech">{entry.date}</span>
                  </div>
                </div>

                {/* Stats columns */}
                <div className="flex items-center gap-4 text-xs font-mono-tech">
                  <div className="flex items-center gap-1 text-red-400 font-bold">
                    <Skull className="w-3.5 h-3.5" />
                    <span>{entry.kills} K</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-400 font-bold">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{entry.damage} DMG</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/50 hidden sm:flex">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{entry.survivalTime}</span>
                  </div>
                  <div className="text-sm font-black font-mono text-amber-400 w-16 text-right">
                    {entry.score} PTS
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center pt-4 border-t border-white/10">
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-mono-tech px-4 py-2.5 rounded-2xl bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            CLEAR RECORDS
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm transition cursor-pointer backdrop-blur-md"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
