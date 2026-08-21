import React, { useState } from 'react';
import { Play, Trophy, Settings, Crosshair, Shield, Users, HelpCircle, Zap, Volume2, VolumeX, Flame, Target, ChevronRight } from 'lucide-react';
import { GameSettings } from '../types/game';
import { audio } from '../utils/audio';

interface MainMenuProps {
  onStartGame: (customSettings?: Partial<GameSettings>) => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenLeaderboard,
  onOpenSettings,
  settings,
  onUpdateSettings,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameSettings['difficulty']>(settings.difficulty || 'SOLDIER');
  const [botCount, setBotCount] = useState<number>(settings.botCount || 15);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audio.setMuted(next);
  };

  const handleLaunch = () => {
    audio.playShoot('RIFLE');
    onUpdateSettings({ ...settings, difficulty: selectedDifficulty, botCount });
    onStartGame({ difficulty: selectedDifficulty, botCount });
  };

  return (
    <div className="relative w-full h-full bg-[#0B0F1A] text-white overflow-hidden flex flex-col p-4 md:p-6 select-none font-sans justify-between">
      {/* Ambient Frosted Glow Orbs */}
      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[140px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[45%] h-[45%] bg-red-600 rounded-full blur-[130px]" />
        <div className="absolute top-[40%] right-[30%] w-[30%] h-[30%] bg-indigo-600/30 rounded-full blur-[100px]" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 flex justify-between items-center border-b border-white/10 pb-4 mb-3">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="text-2xl md:text-3xl font-black tracking-tighter uppercase font-heading">
            Battlezone <span className="text-red-500">L.S.</span>
          </div>
          <div className="bg-white/5 border border-white/10 px-2.5 py-1 rounded text-[10px] font-mono text-white/70 tracking-widest hidden sm:inline-block">
            V. 4.0.2 - STABLE
          </div>
        </div>

        <div className="flex gap-3 md:gap-6 items-center text-xs md:text-sm font-medium tracking-wider">
          <div className="hidden sm:flex items-center gap-2 text-white/80 font-mono-tech text-xs">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>SECTOR 7 • ASIA-ONLINE</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMute}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 backdrop-blur-xl flex items-center justify-center transition text-white/80 hover:text-white"
              title="Toggle Audio"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-white/90" />}
            </button>

            <button
              onClick={() => setShowHowToPlay(true)}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 backdrop-blur-xl flex items-center gap-1.5 transition text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white"
            >
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">CONTROLS</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 backdrop-blur-xl flex items-center justify-center transition text-white/80 hover:text-white"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Body - 3 Column Layout */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 overflow-hidden min-h-0 py-1">
        {/* Left Column: Operator Profile & Tactical Statistics */}
        <div className="w-full lg:w-72 flex flex-col gap-3 md:gap-4 shrink-0 overflow-y-auto pr-1">
          {/* Operator Profile Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-5 flex flex-col gap-3 shadow-lg shadow-black/30">
            <div className="flex items-center gap-3.5">
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-600 border-2 border-white/20 shadow-lg shadow-red-500/20 flex items-center justify-center font-heading font-black text-xl text-white">
                01
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#0B0F1A] rounded-full" />
              </div>
              <div>
                <div className="font-heading font-bold text-base md:text-lg leading-tight uppercase tracking-wider text-white">
                  OPERATOR_01
                </div>
                <div className="text-[11px] text-white/50 font-mono-tech font-bold uppercase mt-0.5">
                  LEVEL 42 • VETERAN
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[10px] font-black text-white/40 tracking-widest uppercase font-mono-tech">
                <span>COMBAT RANK XP</span>
                <span className="text-red-400">75%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-[75%] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
              </div>
            </div>
          </div>

          {/* Tactical Stats Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-5 flex-1 flex flex-col justify-around shadow-lg shadow-black/30">
            <div className="text-[11px] font-black text-white/40 uppercase mb-3 tracking-widest font-mono-tech">
              TACTICAL PROFILE
            </div>

            <div className="space-y-4">
              <div className="border-l-2 border-red-500/40 pl-3.5">
                <div className="text-2xl md:text-3xl font-mono font-bold leading-none text-white">
                  1,240
                </div>
                <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider mt-1">
                  CONFIRMED ELIMINATIONS
                </div>
              </div>

              <div className="border-l-2 border-red-500/40 pl-3.5">
                <div className="text-2xl md:text-3xl font-mono font-bold leading-none text-white">
                  42
                </div>
                <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider mt-1">
                  VICTORIES WON
                </div>
              </div>

              <div className="border-l-2 border-red-500/40 pl-3.5">
                <div className="text-2xl md:text-3xl font-mono font-bold leading-none text-white">
                  2.45
                </div>
                <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider mt-1">
                  K/D COMBAT RATIO
                </div>
              </div>
            </div>

            <button
              onClick={onOpenLeaderboard}
              className="mt-4 w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-mono-tech font-bold uppercase text-amber-300 hover:text-white flex items-center justify-center gap-2 transition"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>VIEW HALL OF FAME</span>
            </button>
          </div>
        </div>

        {/* Center Showcase: Holographic Arena Target & Mode Preview */}
        <div className="flex-1 relative flex flex-col items-center justify-center py-2 px-2 overflow-hidden">
          {/* Subtle concentric frosted rings */}
          <div className="absolute w-[360px] md:w-[460px] h-[360px] md:h-[460px] border border-white/5 rounded-full opacity-30 pointer-events-none" />
          <div className="absolute w-[260px] md:w-[340px] h-[260px] md:h-[340px] border border-red-500/20 rounded-full opacity-40 pointer-events-none" />

          <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
            {/* Center Capsule */}
            <div className="w-48 md:w-56 h-64 md:h-80 bg-gradient-to-t from-red-600/20 via-white/5 to-transparent rounded-full border border-white/15 backdrop-blur-md flex items-center justify-center relative shadow-2xl shadow-red-950/40">
              <div className="w-32 md:w-40 h-56 md:h-72 bg-red-500/10 rounded-full blur-2xl" />
              <div className="relative flex flex-col items-center gap-2 text-center p-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center text-red-400 shadow-lg shadow-red-500/20">
                  <Crosshair className="w-8 h-8" />
                </div>
                <div className="text-[10px] font-mono-tech font-bold text-white/60 uppercase tracking-widest mt-2">
                  TACTICAL SURVIVOR
                </div>
                <div className="text-xs text-white/40 max-w-[140px] leading-tight">
                  Sector 7 Combat Zone Infiltration
                </div>
              </div>
            </div>

            <div className="mt-4 md:mt-6 text-center">
              <div className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase font-heading text-white">
                BATTLEZONE <span className="text-red-500">L.S.</span>
              </div>
              <div className="text-[10px] md:text-[11px] font-black text-red-400 tracking-[0.5em] uppercase font-mono-tech mt-1">
                FIRST-PERSON BATTLE ROYALE
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Match Customization & Loadout Info */}
        <div className="w-full lg:w-72 flex flex-col gap-3 md:gap-4 shrink-0 overflow-y-auto pl-1">
          {/* Match Settings Panel */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-5 flex flex-col gap-4 shadow-lg shadow-black/30 flex-1">
            <div className="flex justify-between items-center">
              <div className="text-[11px] font-black text-white/40 uppercase tracking-widest font-mono-tech">
                MATCH PARAMETERS
              </div>
              <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded font-mono-tech font-bold uppercase">
                SOLO BR
              </span>
            </div>

            {/* Difficulty selector */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest font-mono-tech">
                BOT COMBAT DIFFICULTY
              </div>
              <div className="grid grid-cols-2 gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                {(['RECRUIT', 'SOLDIER', 'VETERAN', 'NIGHTMARE'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`py-1.5 px-2 text-[10px] font-bold rounded-lg transition font-mono-tech ${
                      selectedDifficulty === diff
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Combatants slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-black text-white/40 uppercase tracking-widest font-mono-tech">
                <span>COMBATANTS COUNT</span>
                <span className="text-white font-bold">{botCount + 1} ({botCount} BOTS)</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="5"
                value={botCount}
                onChange={(e) => setBotCount(parseInt(e.target.value))}
                className="w-full accent-red-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />
            </div>

            {/* Features in this match */}
            <div className="space-y-2 mt-auto pt-3 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-white/70">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span>5 Tactical Weapon Classes</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Dynamic Electric Storm Zone</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Airdrop & Supply Cache Crates</span>
              </div>
            </div>

            <div className="mt-auto pt-2 border-t border-white/5">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-widest font-mono-tech mb-1">
                COMBAT ZONE
              </div>
              <div className="text-xl font-mono font-bold text-red-500 flex items-center justify-between">
                <span>SECTOR 7 RUINS</span>
                <span className="text-xs text-white/40">1.2 KM²</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Frosted Glass Navigation & DEPLOY Action Bar */}
      <div className="relative z-10 h-24 md:h-28 mt-3 flex items-center justify-between px-4 md:px-8 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-2xl md:rounded-[32px] shadow-2xl shadow-black/50">
        <div className="flex gap-4 md:gap-8 overflow-x-auto">
          <button className="text-xs md:text-sm font-black tracking-[0.25em] uppercase text-red-500 border-b-2 border-red-500 pb-1 font-mono-tech whitespace-nowrap">
            BATTLE ROYALE
          </button>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="text-xs md:text-sm font-black tracking-[0.25em] uppercase text-white/40 hover:text-white transition-colors pb-1 font-mono-tech whitespace-nowrap"
          >
            BRIEFING
          </button>
          <button
            onClick={onOpenLeaderboard}
            className="text-xs md:text-sm font-black tracking-[0.25em] uppercase text-white/40 hover:text-white transition-colors pb-1 font-mono-tech whitespace-nowrap"
          >
            STANDINGS
          </button>
          <button
            onClick={onOpenSettings}
            className="text-xs md:text-sm font-black tracking-[0.25em] uppercase text-white/40 hover:text-white transition-colors pb-1 font-mono-tech whitespace-nowrap hidden sm:block"
          >
            OPTIONS
          </button>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest font-mono-tech">
              DEPLOYMENT SECTOR
            </div>
            <div className="text-base md:text-lg font-black italic uppercase font-heading text-white">
              URBAN COMPLEX 7
            </div>
          </div>

          <button
            onClick={handleLaunch}
            className="h-14 md:h-18 w-48 md:w-60 bg-red-600 hover:bg-red-500 shadow-xl shadow-red-600/30 rounded-2xl flex flex-col items-center justify-center border-t-2 border-white/30 relative overflow-hidden group transition-all duration-300 active:scale-95 cursor-pointer"
          >
            <div className="text-[9px] md:text-[10px] font-black tracking-[0.4em] uppercase text-white/80 font-mono-tech">
              BATTLE ROYALE
            </div>
            <div className="text-2xl md:text-3xl font-black italic tracking-tight uppercase font-heading text-white flex items-center gap-2">
              <Play className="w-5 h-5 fill-white" />
              <span>DEPLOY</span>
            </div>
            {/* Frosted Shimmer Sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
          </button>
        </div>
      </div>

      {/* How To Play & Controls Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 bg-[#0B0F1A]/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#0B0F1A]/95 border border-white/15 max-w-lg w-full p-6 rounded-2xl shadow-2xl backdrop-blur-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <h3 className="text-lg font-heading font-black text-white flex items-center gap-2 uppercase tracking-wider">
                <HelpCircle className="w-5 h-5 text-red-500" />
                OPERATOR COMBAT BRIEFING
              </h3>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-2.5 text-xs text-white/80 max-h-[60vh] overflow-y-auto">
              <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-mono-tech text-red-400 font-bold">W, A, S, D</span>
                <span className="text-white/70">Move Operator Direction</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-mono-tech text-red-400 font-bold">MOUSE</span>
                <span className="text-white/70">Look & Aim Reticle</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-mono-tech text-red-400 font-bold">LEFT CLICK</span>
                <span className="text-white/70">Fire Active Weapon</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-mono-tech text-red-400 font-bold">RIGHT CLICK</span>
                <span className="text-white/70">Aim Down Sights / Sniper Zoom</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-mono-tech text-red-400 font-bold">SPACE</span>
                <span className="text-white/70">Jump</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-mono-tech text-red-400 font-bold">SHIFT</span>
                <span className="text-white/70">Tactical Sprint</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-mono-tech text-red-400 font-bold">R</span>
                <span className="text-white/70">Reload Magazine</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-mono-tech text-red-400 font-bold">1 - 5 / SCROLL</span>
                <span className="text-white/70">Switch Tactical Weapons</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-mono-tech text-red-400 font-bold">E</span>
                <span className="text-white/70">Interact / Open Supply Crates</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-mono-tech text-red-400 font-bold">ESC</span>
                <span className="text-white/70">Pause Simulation / Unlock Cursor</span>
              </div>
            </div>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="w-full mt-2 py-3 bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30 text-white font-heading font-black text-sm uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              ACKNOWLEDGE & DEPLOY
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

