/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameSettings, GameState, KillFeedItem, LeaderboardEntry, MatchSummary, PlayerStats } from './types/game';
import { WEAPON_DEFINITIONS } from './game/weapons';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { GameOverModal } from './components/GameOverModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { SettingsModal } from './components/SettingsModal';
import { PauseMenu } from './components/PauseMenu';
import { Shield, Users, Radio } from 'lucide-react';
import { audio } from './utils/audio';

const STORAGE_KEY_SETTINGS = 'battlezone_settings';
const STORAGE_KEY_LEADERBOARD = 'battlezone_leaderboard';

const DEFAULT_SETTINGS: GameSettings = {
  mouseSensitivity: 2.0,
  masterVolume: 0.8,
  sfxVolume: 0.9,
  bgmVolume: 0.4,
  invertY: false,
  fov: 75,
  graphicsQuality: 'HIGH',
  botCount: 15,
  difficulty: 'SOLDIER',
  touchControls: false,
  crosshairStyle: 'CROSS',
};

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('MENU');
  const [matchmakingCountdown, setMatchmakingCountdown] = useState<number>(3);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Settings & Leaderboard Persistence
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dynamic In-Game Stats
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    shield: 50,
    maxShield: 100,
    kills: 0,
    damageDealt: 0,
    shotsFired: 0,
    shotsHit: 0,
    headshots: 0,
    currentWeaponIndex: 0,
    weapons: [
      JSON.parse(JSON.stringify(WEAPON_DEFINITIONS.RIFLE)),
      JSON.parse(JSON.stringify(WEAPON_DEFINITIONS.SHOTGUN)),
      JSON.parse(JSON.stringify(WEAPON_DEFINITIONS.SNIPER)),
    ],
    isReloading: false,
    reloadProgress: 0,
    isAiming: false,
    isOutsideZone: false,
    speed: 0.22,
    position: { x: 0, y: 1.8, z: 0 },
    rotationY: 0,
  });

  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [hitmarker, setHitmarker] = useState<{ show: boolean; headshot: boolean }>({ show: false, headshot: false });
  const [damageFlash, setDamageFlash] = useState(false);
  const [zoneTime, setZoneTime] = useState(120);
  const [isZoneShrinking, setIsZoneShrinking] = useState(false);
  const [promptText, setPromptText] = useState<string | null>(null);
  const [matchSummary, setMatchSummary] = useState<MatchSummary | null>(null);

  const matchStartTimeRef = useRef<number>(0);

  // Initialize audio volumes from settings
  useEffect(() => {
    audio.setVolumes(settings.masterVolume, settings.sfxVolume, settings.bgmVolume);
  }, [settings]);

  // Clean up engine on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []);

  // Pointer lock change detection (pause on unlock if playing)
  useEffect(() => {
    const handleLockChange = () => {
      if (!document.pointerLockElement && gameState === 'PLAYING') {
        setGameState('PAUSED');
        engineRef.current?.pause();
      }
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, [gameState]);

  // Start matchmaking sequence
  const startMatchmaking = (customSettings?: Partial<GameSettings>) => {
    const activeSettings = { ...settings, ...(customSettings || {}) };
    setGameState('MATCHMAKING');
    setMatchmakingCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      setMatchmakingCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        launchGame(activeSettings);
      }
    }, 800);
  };

  // Launch Three.js Game World
  const launchGame = (gameSettings: GameSettings) => {
    if (!containerRef.current) return;

    // Destroy existing engine if any
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }

    matchStartTimeRef.current = Date.now();
    setKillFeed([]);

    const engine = new GameEngine(containerRef.current, gameSettings);
    engineRef.current = engine;

    // Attach callbacks
    engine.onStatsUpdate = (stats) => {
      setPlayerStats({ ...stats, weapons: [...stats.weapons] });
    };

    engine.onKillFeed = (item) => {
      setKillFeed((prev) => [...prev.slice(-10), item]);
    };

    engine.onHitmarker = (headshot) => {
      setHitmarker({ show: true, headshot });
      setTimeout(() => setHitmarker({ show: false, headshot: false }), 120);
    };

    engine.onDamageTaken = () => {
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 200);
    };

    engine.onZoneWarning = (seconds, isShrinking) => {
      setZoneTime(seconds);
      setIsZoneShrinking(isShrinking);
    };

    engine.onPrompt = (text) => {
      setPromptText(text);
    };

    engine.onGameOver = (victory, stats, botsRemaining) => {
      const survivalTimeSeconds = Math.max(1, Math.round((Date.now() - matchStartTimeRef.current) / 1000));
      const totalPlayers = (gameSettings.botCount || 15) + 1;
      const rank = victory ? 1 : botsRemaining + 1;
      const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
      const score = (stats.kills * 250) + (stats.damageDealt * 2) + (survivalTimeSeconds * 5) + (victory ? 2000 : 0);

      const summary: MatchSummary = {
        victory,
        kills: stats.kills,
        rank,
        totalPlayers,
        damageDealt: stats.damageDealt,
        accuracy,
        headshots: stats.headshots,
        survivalTimeSeconds,
        score,
      };

      setMatchSummary(summary);
      setGameState('GAMEOVER');

      // Save to Leaderboard
      const m = Math.floor(survivalTimeSeconds / 60);
      const s = survivalTimeSeconds % 60;
      const timeStr = `${m}m ${s < 10 ? '0' + s : s}s`;

      const newEntry: LeaderboardEntry = {
        id: `match_${Date.now()}`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        playerName: 'OPERATOR_01',
        rank,
        kills: stats.kills,
        damage: stats.damageDealt,
        survivalTime: timeStr,
        score,
        victory,
      };

      setLeaderboard((prev) => {
        const updated = [newEntry, ...prev].slice(0, 30);
        try {
          localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    };

    setGameState('PLAYING');
    engine.start();

    // Request pointer lock
    setTimeout(() => {
      engine.controls.lock();
    }, 100);
  };

  const handleResumeGame = () => {
    setGameState('PLAYING');
    engineRef.current?.resume();
  };

  const handleRestartGame = () => {
    launchGame(settings);
  };

  const handleReturnToMenu = () => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    setGameState('MENU');
  };

  const handleSaveSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    } catch {
      // ignore
    }
    if (engineRef.current) {
      engineRef.current.settings = newSettings;
      engineRef.current.camera.fov = newSettings.fov;
      engineRef.current.camera.updateProjectionMatrix();
    }
  };

  const handleClearLeaderboard = () => {
    setLeaderboard([]);
    try {
      localStorage.removeItem(STORAGE_KEY_LEADERBOARD);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none font-sans">
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={containerRef}
        className={`absolute inset-0 w-full h-full ${
          gameState === 'PLAYING' || gameState === 'PAUSED' ? 'block' : 'hidden'
        }`}
      />

      {/* In-Game Heads-Up Display (HUD) */}
      {gameState === 'PLAYING' && (
        <HUD
          engine={engineRef.current}
          stats={playerStats}
          killFeed={killFeed}
          zoneTime={zoneTime}
          isZoneShrinking={isZoneShrinking}
          promptText={promptText}
          hitmarker={hitmarker}
          damageFlash={damageFlash}
          onPause={() => {
            setGameState('PAUSED');
            engineRef.current?.pause();
          }}
          showTouchControls={settings.touchControls}
        />
      )}

      {/* Main Menu Screen */}
      {gameState === 'MENU' && (
        <MainMenu
          onStartGame={startMatchmaking}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenSettings={() => setShowSettings(true)}
          settings={settings}
          onUpdateSettings={handleSaveSettings}
        />
      )}

      {/* Matchmaking / Drop In Sequence Screen */}
      {gameState === 'MATCHMAKING' && (
        <div className="absolute inset-0 z-40 bg-[#0B0F1A]/85 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
          {/* Ambient background glow */}
          <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-red-600 rounded-full blur-[100px]" />
          </div>

          <div className="relative bg-white/5 border border-white/15 max-w-md w-full p-8 rounded-3xl shadow-2xl shadow-black/80 backdrop-blur-2xl flex flex-col items-center">
            <div className="relative w-28 h-28 flex items-center justify-center mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin" />
              <div className="absolute inset-2 rounded-full border-4 border-blue-500/20 border-b-blue-400 animate-spin [animation-direction:reverse]" />
              <Radio className="w-10 h-10 text-red-500 animate-pulse" />
            </div>

            <h2 className="text-2xl md:text-3xl font-heading font-black text-white tracking-widest uppercase">
              MATCH FOUND // INFILTRATING
            </h2>
            <div className="text-sm font-mono-tech text-blue-400 font-bold mt-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>CONNECTING COMBATANTS TO SECTOR 7...</span>
            </div>

            <div className="text-6xl font-heading font-black text-red-500 mt-6 tracking-tighter animate-bounce">
              0{matchmakingCountdown}
            </div>

            <div className="mt-8 flex items-center gap-3 text-xs font-mono-tech text-white/60 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-md">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>OBJECTIVE: SECURE WEAPONS, REMAIN INSIDE SAFE ZONE, SURVIVE.</span>
            </div>
          </div>
        </div>
      )}

      {/* Pause Menu */}
      {gameState === 'PAUSED' && (
        <PauseMenu
          onResume={handleResumeGame}
          onRestart={handleRestartGame}
          onOpenSettings={() => setShowSettings(true)}
          onHome={handleReturnToMenu}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'GAMEOVER' && matchSummary && (
        <GameOverModal
          summary={matchSummary}
          onRestart={handleRestartGame}
          onHome={handleReturnToMenu}
        />
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <LeaderboardModal
          entries={leaderboard}
          onClose={() => setShowLeaderboard(false)}
          onClear={handleClearLeaderboard}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
