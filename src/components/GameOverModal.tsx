import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Skull, Crosshair, Zap, RotateCcw, Home, Clock, Award } from 'lucide-react';
import { MatchSummary } from '../types/game';

interface GameOverModalProps {
  summary: MatchSummary;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  onRestart,
  onHome,
}) => {
  useEffect(() => {
    if (summary.victory) {
      // Trigger festive confetti cannons
      const end = Date.now() + 3 * 1000;
      const colors = ['#00ffff', '#eab308', '#22c55e', '#ef4444'];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [summary.victory]);

  const formatSurvivalTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' + s : s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F1A]/85 backdrop-blur-2xl flex items-center justify-center p-4 select-none animate-fadeIn">
      {/* Ambient background glow */}
      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-red-600 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-xl w-full bg-white/5 border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/80 backdrop-blur-2xl overflow-hidden flex flex-col items-center text-center">
        {/* Glow effect */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-40 ${
            summary.victory ? 'bg-amber-400' : 'bg-red-600'
          }`}
        />

        {/* Result Header */}
        <div className="relative z-10 flex flex-col items-center">
          {summary.victory ? (
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 backdrop-blur-xl flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
              <Trophy className="w-9 h-9" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 backdrop-blur-xl flex items-center justify-center text-red-400 mb-3 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
              <Skull className="w-9 h-9" />
            </div>
          )}

          <h1
            className={`text-4xl md:text-5xl font-black font-heading tracking-wider uppercase drop-shadow-md ${
              summary.victory
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500'
                : 'text-red-500'
            }`}
          >
            {summary.victory ? 'VICTORY ROYALE' : 'ELIMINATED'}
          </h1>

          <div className="inline-flex items-center gap-2 mt-2 px-4 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-sm font-mono-tech backdrop-blur-md">
            <span>FINAL STANDING:</span>
            <span className={`font-bold ${summary.victory ? 'text-amber-400' : 'text-red-400'}`}>
              #{summary.rank} / {summary.totalPlayers}
            </span>
          </div>
        </div>

        {/* Match Statistics Grid */}
        <div className="relative z-10 w-full grid grid-cols-2 sm:grid-cols-3 gap-3 my-6">
          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-xl flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono-tech mb-1 uppercase font-bold">
              <Skull className="w-3.5 h-3.5 text-red-400" />
              ELIMINATIONS
            </div>
            <span className="text-2xl font-bold font-mono text-white">{summary.kills}</span>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-xl flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono-tech mb-1 uppercase font-bold">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              DAMAGE DEALT
            </div>
            <span className="text-2xl font-bold font-mono text-white">{summary.damageDealt}</span>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-xl flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono-tech mb-1 uppercase font-bold">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              ACCURACY
            </div>
            <span className="text-2xl font-bold font-mono text-white">{summary.accuracy}%</span>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-xl flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono-tech mb-1 uppercase font-bold">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              SURVIVAL TIME
            </div>
            <span className="text-xl font-bold font-mono text-white">
              {formatSurvivalTime(summary.survivalTimeSeconds)}
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-xl flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono-tech mb-1 uppercase font-bold">
              <Crosshair className="w-3.5 h-3.5 text-purple-400" />
              HEADSHOTS
            </div>
            <span className="text-2xl font-bold font-mono text-white">{summary.headshots}</span>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-xl flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono-tech mb-1 uppercase font-bold">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              COMBAT SCORE
            </div>
            <span className="text-2xl font-bold font-mono text-amber-400">{summary.score}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onRestart}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-heading font-black text-sm tracking-wider uppercase shadow-xl shadow-red-600/30 border-t border-white/30 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
          </button>

          <button
            onClick={onHome}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/15 text-white/80 hover:text-white font-heading font-bold text-sm tracking-wider uppercase backdrop-blur-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
