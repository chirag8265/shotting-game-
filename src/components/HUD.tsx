import React, { useEffect, useRef, useState } from 'react';
import { Shield, Heart, Crosshair, Target, Zap, Flame, Radio, AlertTriangle, Skull, Award, Navigation } from 'lucide-react';
import { GameEngine } from '../game/GameEngine';
import { KillFeedItem, PlayerStats, Weapon } from '../types/game';

interface HUDProps {
  engine: GameEngine | null;
  stats: PlayerStats;
  killFeed: KillFeedItem[];
  zoneTime: number;
  isZoneShrinking: boolean;
  promptText: string | null;
  hitmarker: { show: boolean; headshot: boolean };
  damageFlash: boolean;
  onPause: () => void;
  showTouchControls: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  stats,
  killFeed,
  zoneTime,
  isZoneShrinking,
  promptText,
  hitmarker,
  damageFlash,
  onPause,
  showTouchControls,
}) => {
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);
  const lookTouchRef = useRef<{ id: number; lastX: number; lastY: number } | null>(null);

  const currentWeapon: Weapon | undefined = stats.weapons[stats.currentWeaponIndex];
  const isSniperADS = stats.isAiming && currentWeapon?.id === 'SNIPER';

  // Format Zone timer MM:SS
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Minimap Canvas Drawer
  useEffect(() => {
    if (!engine) return;

    engine.onMinimapUpdate = (data) => {
      const canvas = minimapCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const center = size / 2;
      const scale = size / 400; // Map scale

      // Clear
      ctx.clearRect(0, 0, size, size);

      // Radar background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.arc(center, center, center - 2, 0, Math.PI * 2);
      ctx.fill();

      // Radar rings
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1;
      [center * 0.35, center * 0.7, center * 0.95].forEach((r) => {
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Cross grid
      ctx.beginPath();
      ctx.moveTo(center, 0);
      ctx.lineTo(center, size);
      ctx.moveTo(0, center);
      ctx.lineTo(size, center);
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);

      // Rotate whole map opposite to player angle for forward-facing radar
      ctx.rotate(-data.playerAngle);

      // Draw Safe Zone Circle
      const zx = (data.zoneCenter.x - data.playerPos.x) * scale;
      const zz = (data.zoneCenter.z - data.playerPos.z) * scale;
      const zr = data.zoneRadius * scale;

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(zx, zz, zr, 0, Math.PI * 2);
      ctx.stroke();

      // Safe zone fill
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.fill();

      // Loot drops
      data.loots.forEach((loot) => {
        const lx = (loot.x - data.playerPos.x) * scale;
        const lz = (loot.z - data.playerPos.z) * scale;
        if (Math.hypot(lx, lz) < center - 4) {
          ctx.fillStyle = loot.type === 'WEAPON' ? '#c084fc' : '#4ade80';
          ctx.beginPath();
          ctx.arc(lx, lz, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Bots
      data.bots.forEach((bot) => {
        if (!bot.isAlive) return;
        const bx = (bot.x - data.playerPos.x) * scale;
        const bz = (bot.z - data.playerPos.z) * scale;
        if (Math.hypot(bx, bz) < center - 4) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(bx, bz, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();

      // Player Arrow at center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(center, center - 7);
      ctx.lineTo(center - 5, center + 6);
      ctx.lineTo(center, center + 3);
      ctx.lineTo(center + 5, center + 6);
      ctx.closePath();
      ctx.fill();
    };
  }, [engine]);

  // Touch joystick handlers
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    joystickCenterRef.current = { x: centerX, y: centerY };
    setIsJoystickActive(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    if (!isJoystickActive || !joystickCenterRef.current) return;
    const touch = e.touches[0];
    updateJoystick(touch.clientX, touch.clientY);
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickCenterRef.current || !engine) return;
    const maxRadius = 40;
    let dx = clientX - joystickCenterRef.current.x;
    let dy = clientY - joystickCenterRef.current.y;
    const distance = Math.hypot(dx, dy);

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setJoystickPos({ x: dx, y: dy });
    // Normalize to -1 to 1
    const normX = dx / maxRadius;
    const normY = -dy / maxRadius;
    engine.handleTouchMove(normY, normX);
  };

  const handleJoystickTouchEnd = () => {
    setIsJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    if (engine) engine.handleTouchMove(0, 0);
  };

  // Right touch pad for camera look
  const handleLookTouchStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    lookTouchRef.current = { id: touch.identifier, lastX: touch.clientX, lastY: touch.clientY };
  };

  const handleLookTouchMove = (e: React.TouchEvent) => {
    if (!lookTouchRef.current || !engine) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchRef.current.id) {
        const deltaX = touch.clientX - lookTouchRef.current.lastX;
        const deltaY = touch.clientY - lookTouchRef.current.lastY;
        lookTouchRef.current.lastX = touch.clientX;
        lookTouchRef.current.lastY = touch.clientY;
        engine.handleTouchLook(deltaX, deltaY);
        break;
      }
    }
  };

  const handleLookTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (lookTouchRef.current && e.changedTouches[i].identifier === lookTouchRef.current.id) {
        lookTouchRef.current = null;
        break;
      }
    }
  };

  const getWeaponIcon = (id: string) => {
    switch (id) {
      case 'SNIPER': return <Target className="w-4 h-4" />;
      case 'SHOTGUN': return <Zap className="w-4 h-4" />;
      case 'SMG': return <Flame className="w-4 h-4" />;
      case 'PLASMA': return <Radio className="w-4 h-4" />;
      default: return <Crosshair className="w-4 h-4" />;
    }
  };

  return (
    <div id="hud-container" className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between overflow-hidden">
      {/* Damage Flash Vignette */}
      {damageFlash && (
        <div className="absolute inset-0 damage-vignette pointer-events-none transition-opacity duration-150 animate-pulse" />
      )}

      {/* Storm Outside Vignette */}
      {stats.isOutsideZone && (
        <div className="absolute inset-0 storm-vignette pointer-events-none animate-pulse" />
      )}

      {/* Sniper ADS Scope Overlay */}
      {isSniperADS && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/40">
          <div className="relative w-[340px] h-[340px] md:w-[500px] md:h-[500px] rounded-full border-4 border-emerald-500/80 shadow-[0_0_50px_rgba(16,185,129,0.3)] bg-black/30 overflow-hidden flex items-center justify-center">
            {/* Scope Lines */}
            <div className="absolute w-full h-[1px] bg-emerald-400/70" />
            <div className="absolute h-full w-[1px] bg-emerald-400/70" />
            <div className="absolute w-6 h-6 rounded-full border border-emerald-400/60" />
            <div className="absolute w-2 h-2 rounded-full bg-emerald-400" />
            {/* Mil dots */}
            <div className="absolute top-1/4 h-2 w-[1px] bg-emerald-400" />
            <div className="absolute bottom-1/4 h-2 w-[1px] bg-emerald-400" />
            <div className="absolute left-1/4 w-2 h-[1px] bg-emerald-400" />
            <div className="absolute right-1/4 w-2 h-[1px] bg-emerald-400" />
            {/* Range Text */}
            <div className="absolute top-4 left-6 text-xs text-emerald-400 font-mono-tech">MAG: 4.0x</div>
            <div className="absolute bottom-4 right-6 text-xs text-emerald-400 font-mono-tech">RANGE: CALIBRATED</div>
          </div>
        </div>
      )}

      {/* Top Bar: Compass & Zone status */}
      <div className="w-full pt-3 px-4 flex items-start justify-between">
        {/* Left: Minimap Radar */}
        <div className="flex flex-col items-start gap-2">
          <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full border border-white/20 shadow-[0_0_25px_rgba(0,0,0,0.6)] overflow-hidden bg-[#0B0F1A]/85 backdrop-blur-xl">
            <canvas ref={minimapCanvasRef} width={176} height={176} className="w-full h-full" />
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-red-400 tracking-wider font-mono-tech">N</div>
          </div>
          <div className="text-[11px] font-mono-tech text-white/60 bg-white/5 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
            LOC: X: {Math.round(stats.position.x)} | Z: {Math.round(stats.position.z)}
          </div>
        </div>

        {/* Center: Zone Timer & Storm Alert */}
        <div className="flex flex-col items-center">
          <div className="bg-white/5 backdrop-blur-xl border border-white/15 px-6 py-2.5 rounded-2xl shadow-xl shadow-black/40 flex items-center gap-3">
            <AlertTriangle className={`w-5 h-5 ${isZoneShrinking ? 'text-red-500 animate-bounce' : 'text-blue-400'}`} />
            <div className="text-center">
              <div className="text-[10px] uppercase font-black tracking-widest text-white/40 font-mono-tech">
                {isZoneShrinking ? 'ZONE RESTRICTING' : 'SAFE ZONE ACTIVE'}
              </div>
              <div className={`text-2xl font-black font-mono ${isZoneShrinking ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {formatTimer(zoneTime)}
              </div>
            </div>
          </div>

          {stats.isOutsideZone && (
            <div className="mt-2 bg-red-600/90 text-white font-bold text-xs uppercase tracking-wider px-4 py-1 rounded-xl animate-pulse border border-red-300 shadow-lg shadow-red-600/50">
              WARNING: TAKE COVER INSIDE SAFE ZONE!
            </div>
          )}
        </div>

        {/* Right: Kill Feed & Match Stats */}
        <div className="flex flex-col items-end gap-2 w-64">
          {/* Top Score summary */}
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/15 px-3.5 py-1.5 rounded-xl text-xs font-mono-tech shadow-lg shadow-black/30">
            <div className="flex items-center gap-1 text-red-400">
              <Skull className="w-3.5 h-3.5" />
              <span className="font-bold">{stats.kills}</span> KILLS
            </div>
            <div className="h-3 w-[1px] bg-white/20" />
            <div className="flex items-center gap-1 text-amber-400">
              <Award className="w-3.5 h-3.5" />
              <span className="font-bold">{stats.damageDealt}</span> DMG
            </div>
            <button
              onClick={onPause}
              className="pointer-events-auto ml-1.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold transition"
            >
              PAUSE
            </button>
          </div>

          {/* Kill Feed Logs */}
          <div className="flex flex-col gap-1 w-full max-h-40 overflow-hidden">
            {killFeed.slice(-4).map((feed) => (
              <div
                key={feed.id}
                className={`text-xs px-2.5 py-1 rounded-xl flex items-center justify-between border backdrop-blur-md transition ${
                  feed.isPlayerKiller
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    : 'bg-white/5 border-white/10 text-white/80'
                }`}
              >
                <span className="font-bold text-white">{feed.killer}</span>
                <span className="text-[10px] text-white/40 flex items-center gap-1 mx-1 font-mono-tech">
                  [{feed.weapon}]
                  {feed.isHeadshot && <span className="text-red-400 font-bold">💥 HEADSHOT</span>}
                </span>
                <span className="text-red-400">{feed.victim}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center Screen: Dynamic Crosshair & Hitmarker */}
      {!isSniperADS && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* Center dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />

            {/* Dynamic Reticle Lines */}
            <div className="absolute top-0 w-0.5 h-2.5 bg-white/80" />
            <div className="absolute bottom-0 w-0.5 h-2.5 bg-white/80" />
            <div className="absolute left-0 h-0.5 w-2.5 bg-white/80" />
            <div className="absolute right-0 h-0.5 w-2.5 bg-white/80" />

            {/* Hitmarker Popup */}
            {hitmarker.show && (
              <div className="absolute inset-0 flex items-center justify-center animate-ping pointer-events-none">
                <div
                  className={`w-6 h-6 border-2 transform rotate-45 ${
                    hitmarker.headshot ? 'border-red-500 scale-125' : 'border-red-400'
                  }`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Center Interaction Prompt */}
      {promptText && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-[#0B0F1A]/90 border border-white/20 text-white px-6 py-2.5 rounded-2xl font-mono-tech text-sm shadow-[0_0_25px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-pulse pointer-events-auto cursor-pointer flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{promptText}</span>
        </div>
      )}

      {/* Bottom Bar: Health, Shields, Weapons & Ammo */}
      <div className="w-full pb-4 px-4 flex items-end justify-between">
        {/* Player Vitality Bars */}
        <div className="flex flex-col gap-2 w-64 md:w-80 bg-white/5 border border-white/10 p-3.5 rounded-2xl backdrop-blur-2xl shadow-xl shadow-black/40">
          {/* Player Tag */}
          <div className="flex justify-between items-center text-xs font-mono-tech">
            <span className="text-white font-bold tracking-wider uppercase">OPERATOR_01</span>
            <span className="text-white/50">{Math.round(stats.health)} HP / {Math.round(stats.shield)} AP</span>
          </div>

          {/* Shield Bar */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-200 shadow-[0_0_8px_rgba(59,130,246,0.6)] rounded-full"
                style={{ width: `${(stats.shield / stats.maxShield) * 100}%` }}
              />
            </div>
          </div>

          {/* Health Bar */}
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400 shrink-0" />
            <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 rounded-full ${
                  stats.health < 30
                    ? 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]'
                    : 'bg-gradient-to-r from-red-500 to-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                }`}
                style={{ width: `${(stats.health / stats.maxHealth) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Weapons Loadout Dock */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-2xl backdrop-blur-2xl shadow-xl shadow-black/40 pointer-events-auto">
          {stats.weapons.map((w, index) => {
            const isSelected = index === stats.currentWeaponIndex;
            return (
              <button
                key={w.id}
                onClick={() => engine?.selectWeapon(index)}
                className={`px-3.5 py-2 rounded-xl flex flex-col items-center gap-1 transition-all border ${
                  isSelected
                    ? 'bg-red-600/20 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] scale-105'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1">
                  {getWeaponIcon(w.id)}
                  <span className="text-xs font-bold font-mono-tech">{index + 1}</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-tight">{w.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Active Weapon Ammo Counter */}
        <div className="flex flex-col items-end bg-white/5 border border-white/10 p-3.5 rounded-2xl w-48 md:w-56 backdrop-blur-2xl shadow-xl shadow-black/40">
          <div className="text-[11px] font-mono-tech text-red-400 font-bold uppercase tracking-wider">
            {currentWeapon?.name || 'WEAPON'}
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-heading font-black text-white tracking-tighter">
              {currentWeapon?.currentAmmo ?? 0}
            </span>
            <span className="text-lg font-mono-tech text-white/40 font-bold">
              / {currentWeapon?.reserveAmmo ?? 0}
            </span>
          </div>

          {/* Reload indicator */}
          {stats.isReloading && (
            <div className="w-full mt-2">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest text-right mb-0.5 animate-pulse font-mono-tech">
                RELOADING...
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-75 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                  style={{ width: `${stats.reloadProgress * 100}%` }}
                />
              </div>
            </div>
          )}

          {!stats.isReloading && (
            <div className="text-[10px] text-white/40 font-mono-tech mt-1">
              [R] RELOAD | [R-CLICK] ADS
            </div>
          )}
        </div>
      </div>

      {/* Mobile Touch Controls Layer */}
      {showTouchControls && (
        <div className="absolute inset-0 pointer-events-auto z-30 flex justify-between p-4 touch-none">
          {/* Left Joystick Area */}
          <div
            className="relative w-36 h-36 rounded-full bg-white/5 border border-white/20 backdrop-blur-xl flex items-center justify-center self-end mb-16 ml-2"
            onTouchStart={handleJoystickTouchStart}
            onTouchMove={handleJoystickTouchMove}
            onTouchEnd={handleJoystickTouchEnd}
          >
            <div
              className="w-12 h-12 rounded-full bg-red-500/70 border border-white shadow-lg pointer-events-none transition-transform duration-75"
              style={{
                transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
              }}
            />
          </div>

          {/* Right Touch Look & Action Buttons */}
          <div
            className="relative flex-1 h-full flex flex-col justify-end items-end gap-3 pb-16 pr-2"
            onTouchStart={handleLookTouchStart}
            onTouchMove={handleLookTouchMove}
            onTouchEnd={handleLookTouchEnd}
          >
            <div className="flex items-center gap-3">
              {/* Scope Button */}
              <button
                onTouchStart={(e) => { e.stopPropagation(); engine?.handleTouchScopeToggle(); }}
                className="w-14 h-14 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center text-white font-bold active:scale-95 shadow-md"
              >
                <Target className="w-6 h-6" />
              </button>

              {/* Jump Button */}
              <button
                onTouchStart={(e) => { e.stopPropagation(); engine?.handleTouchJump(); }}
                className="w-14 h-14 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center text-white font-bold active:scale-95 shadow-md text-xs font-mono-tech"
              >
                JUMP
              </button>

              {/* Reload Button */}
              <button
                onTouchStart={(e) => { e.stopPropagation(); engine?.reloadWeapon(); }}
                className="w-14 h-14 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center text-amber-400 font-bold active:scale-95 shadow-md text-xs font-mono-tech"
              >
                RELOAD
              </button>

              {/* Primary Fire Button */}
              <button
                onTouchStart={(e) => { e.stopPropagation(); engine?.handleTouchFire(true); }}
                onTouchEnd={(e) => { e.stopPropagation(); engine?.handleTouchFire(false); }}
                className="w-20 h-20 rounded-full bg-red-600 border-2 border-white/40 flex items-center justify-center text-white font-black text-sm active:scale-90 shadow-xl shadow-red-600/40"
              >
                FIRE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
