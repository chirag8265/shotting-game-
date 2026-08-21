import React, { useState } from 'react';
import { Settings, Volume2, Eye, Sliders, Smartphone, RotateCcw } from 'lucide-react';
import { GameSettings } from '../types/game';
import { audio } from '../utils/audio';

interface SettingsModalProps {
  settings: GameSettings;
  onSave: (newSettings: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSave,
  onClose,
}) => {
  const [localSettings, setLocalSettings] = useState<GameSettings>({ ...settings });

  const handleVolumeChange = (type: 'master' | 'sfx' | 'bgm', val: number) => {
    const updated = {
      ...localSettings,
      [type === 'master' ? 'masterVolume' : type === 'sfx' ? 'sfxVolume' : 'bgmVolume']: val,
    };
    setLocalSettings(updated);
    audio.setVolumes(updated.masterVolume, updated.sfxVolume, updated.bgmVolume);
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F1A]/85 backdrop-blur-2xl flex items-center justify-center p-4 select-none">
      {/* Ambient background glow */}
      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-red-600 rounded-full blur-[100px]" />
      </div>

      <div className="relative bg-white/5 border border-white/15 max-w-lg w-full p-6 md:p-8 rounded-3xl shadow-2xl shadow-black/80 backdrop-blur-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-heading font-black text-white tracking-wider uppercase">
                TACTICAL SETTINGS
              </h3>
              <p className="text-xs text-white/40 font-mono-tech">CONFIGURATION & PREFERENCES</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white font-bold text-xl px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/5"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto my-4 space-y-5 pr-1">
          {/* Mouse & Controls */}
          <div className="space-y-3 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-mono-tech text-blue-400 font-bold uppercase tracking-wider">
              <Sliders className="w-4 h-4" />
              Controls & Input
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/70">
                <span>Mouse Sensitivity:</span>
                <span className="font-mono-tech font-bold text-white">{localSettings.mouseSensitivity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={localSettings.mouseSensitivity}
                onChange={(e) => setLocalSettings({ ...localSettings, mouseSensitivity: parseFloat(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-white/70">Invert Y-Axis (Flight pitch)</span>
              <button
                onClick={() => setLocalSettings({ ...localSettings, invertY: !localSettings.invertY })}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono-tech transition cursor-pointer border ${
                  localSettings.invertY ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                }`}
              >
                {localSettings.invertY ? 'INVERTED' : 'STANDARD'}
              </button>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-white/70 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                Mobile Touch Controls Overlay
              </span>
              <button
                onClick={() => setLocalSettings({ ...localSettings, touchControls: !localSettings.touchControls })}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono-tech transition cursor-pointer border ${
                  localSettings.touchControls ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                }`}
              >
                {localSettings.touchControls ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>

          {/* Graphics & Display */}
          <div className="space-y-3 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-mono-tech text-amber-400 font-bold uppercase tracking-wider">
              <Eye className="w-4 h-4" />
              Graphics & Display
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/70">
                <span>Field of View (FOV):</span>
                <span className="font-mono-tech font-bold text-white">{localSettings.fov}°</span>
              </div>
              <input
                type="range"
                min="65"
                max="105"
                step="1"
                value={localSettings.fov}
                onChange={(e) => setLocalSettings({ ...localSettings, fov: parseInt(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-white/70">Graphics Quality Preset</span>
              <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setLocalSettings({ ...localSettings, graphicsQuality: q })}
                    className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition ${
                      localSettings.graphicsQuality === q
                        ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audio Channels */}
          <div className="space-y-3 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-mono-tech text-emerald-400 font-bold uppercase tracking-wider">
              <Volume2 className="w-4 h-4" />
              Audio Volumes
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/70">
                <span>Master Volume:</span>
                <span className="font-mono-tech font-bold text-white">{Math.round(localSettings.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localSettings.masterVolume}
                onChange={(e) => handleVolumeChange('master', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/70">
                <span>Sound FX (Weapons & Impacts):</span>
                <span className="font-mono-tech font-bold text-white">{Math.round(localSettings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localSettings.sfxVolume}
                onChange={(e) => handleVolumeChange('sfx', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/70">
                <span>Battlefield Ambient Drone:</span>
                <span className="font-mono-tech font-bold text-white">{Math.round(localSettings.bgmVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localSettings.bgmVolume}
                onChange={(e) => handleVolumeChange('bgm', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-sm font-bold transition cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-sm font-heading font-black tracking-wider uppercase transition shadow-xl shadow-red-600/30 cursor-pointer border-t border-white/30"
          >
            APPLY SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
};
