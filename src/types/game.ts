export type GameState = 'MENU' | 'MATCHMAKING' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type WeaponType = 'RIFLE' | 'SNIPER' | 'SHOTGUN' | 'SMG' | 'PLASMA';

export interface Weapon {
  id: WeaponType;
  name: string;
  category: string;
  damage: number;
  headshotMultiplier: number;
  fireRate: number; // shots per second or ms between shots
  reloadTime: number; // ms
  magazineSize: number;
  currentAmmo: number;
  reserveAmmo: number;
  maxReserveAmmo: number;
  range: number;
  spread: number; // bullet spread
  bulletsPerShot: number; // 1 for rifle/sniper, 8 for shotgun
  recoil: number;
  zoomFov: number; // FOV when ADS (e.g. 30 for sniper, 60 for rifle)
  color: string;
  icon: string;
  autoFire: boolean;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  kills: number;
  damageDealt: number;
  shotsFired: number;
  shotsHit: number;
  headshots: number;
  currentWeaponIndex: number;
  weapons: Weapon[];
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
  isAiming: boolean;
  isOutsideZone: boolean;
  speed: number;
  position: { x: number; y: number; z: number };
  rotationY: number;
}

export interface BotEntity {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  kills: number;
  position: { x: number; y: number; z: number };
  rotation: number;
  weapon: Weapon;
  state: 'PATROL' | 'COMBAT' | 'FLEEING_ZONE' | 'SEARCHING_LOOT';
  targetPos: { x: number; y: number; z: number } | null;
  targetEntityId: string | null; // bot or player
  lastShotTime: number;
  isDead: boolean;
  color: string;
}

export interface LootItem {
  id: string;
  type: 'HEALTH' | 'SHIELD' | 'AMMO' | 'WEAPON';
  weaponType?: WeaponType;
  amount?: number;
  name: string;
  position: { x: number; y: number; z: number };
  color: string;
  collected: boolean;
}

export interface KillFeedItem {
  id: string;
  killer: string;
  victim: string;
  weapon: string;
  isHeadshot: boolean;
  isPlayerKiller: boolean;
  isPlayerVictim: boolean;
  timestamp: number;
}

export interface GameSettings {
  mouseSensitivity: number;
  masterVolume: number;
  sfxVolume: number;
  bgmVolume: number;
  invertY: boolean;
  fov: number;
  graphicsQuality: 'LOW' | 'MEDIUM' | 'HIGH';
  botCount: number;
  difficulty: 'RECRUIT' | 'SOLDIER' | 'VETERAN' | 'NIGHTMARE';
  touchControls: boolean;
  crosshairStyle: 'DOT' | 'CROSS' | 'CIRCLE';
}

export interface MatchSummary {
  victory: boolean;
  kills: number;
  rank: number;
  totalPlayers: number;
  damageDealt: number;
  accuracy: number;
  headshots: number;
  survivalTimeSeconds: number;
  score: number;
  eliminatedBy?: string;
}

export interface LeaderboardEntry {
  id: string;
  date: string;
  playerName: string;
  rank: number;
  kills: number;
  damage: number;
  survivalTime: string;
  score: number;
  victory: boolean;
}
