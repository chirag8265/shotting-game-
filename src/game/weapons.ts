import { Weapon, WeaponType } from '../types/game';

export const WEAPON_DEFINITIONS: Record<WeaponType, Weapon> = {
  RIFLE: {
    id: 'RIFLE',
    name: 'AR-57 VULCAN',
    category: 'Assault Rifle',
    damage: 32,
    headshotMultiplier: 1.8,
    fireRate: 110, // ms between shots (~9 shots/sec)
    reloadTime: 1800,
    magazineSize: 30,
    currentAmmo: 30,
    reserveAmmo: 120,
    maxReserveAmmo: 240,
    range: 220,
    spread: 0.02,
    bulletsPerShot: 1,
    recoil: 0.04,
    zoomFov: 55,
    color: '#3b82f6',
    icon: 'Crosshair',
    autoFire: true
  },
  SNIPER: {
    id: 'SNIPER',
    name: 'AWM REAPER-50',
    category: 'Sniper Rifle',
    damage: 115,
    headshotMultiplier: 2.5,
    fireRate: 1200, // ms between shots
    reloadTime: 2500,
    magazineSize: 5,
    currentAmmo: 5,
    reserveAmmo: 25,
    maxReserveAmmo: 50,
    range: 450,
    spread: 0.002,
    bulletsPerShot: 1,
    recoil: 0.15,
    zoomFov: 20, // High magnification
    color: '#a855f7',
    icon: 'Target',
    autoFire: false
  },
  SHOTGUN: {
    id: 'SHOTGUN',
    name: 'SPAS CYCLONE',
    category: 'Shotgun',
    damage: 16, // per pellet (x8 = 128 total)
    headshotMultiplier: 1.5,
    fireRate: 650,
    reloadTime: 2000,
    magazineSize: 8,
    currentAmmo: 8,
    reserveAmmo: 40,
    maxReserveAmmo: 80,
    range: 65,
    spread: 0.085,
    bulletsPerShot: 8,
    recoil: 0.12,
    zoomFov: 65,
    color: '#f97316',
    icon: 'Zap',
    autoFire: false
  },
  SMG: {
    id: 'SMG',
    name: 'VECTOR-9 APEX',
    category: 'Submachine Gun',
    damage: 20,
    headshotMultiplier: 1.6,
    fireRate: 65, // very fast
    reloadTime: 1400,
    magazineSize: 35,
    currentAmmo: 35,
    reserveAmmo: 140,
    maxReserveAmmo: 280,
    range: 120,
    spread: 0.038,
    bulletsPerShot: 1,
    recoil: 0.025,
    zoomFov: 60,
    color: '#10b981',
    icon: 'Flame',
    autoFire: true
  },
  PLASMA: {
    id: 'PLASMA',
    name: 'ION TITAN-X',
    category: 'Heavy Plasma',
    damage: 75,
    headshotMultiplier: 1.5,
    fireRate: 400,
    reloadTime: 2200,
    magazineSize: 12,
    currentAmmo: 12,
    reserveAmmo: 48,
    maxReserveAmmo: 96,
    range: 200,
    spread: 0.015,
    bulletsPerShot: 1,
    recoil: 0.08,
    zoomFov: 50,
    color: '#06b6d4',
    icon: 'Radio',
    autoFire: true
  }
};

export const BOT_NAMES = [
  'Viper_99', 'GhostSniper', 'ShadowRecon', 'TitanX', 'Maverick',
  'Raven_404', 'ApexPredator', 'CyberWolf', 'ReaperZero', 'Spectre_7',
  'BlazeKing', 'VoidWalker', 'NeonStorm', 'BulletEcho', 'PhantomStrike',
  'IronClaw', 'DeathBringer', 'ZeroCold', 'WarMachine', 'AlphaStrike'
];

export const MAP_CONFIG = {
  SIZE: 500, // 500x500 world
  INITIAL_ZONE_RADIUS: 240,
  MIN_ZONE_RADIUS: 15,
  ZONE_SHRINK_SPEED: 0.045, // radius decrease per frame
  OBSTACLE_COUNT: 75,
  TREE_COUNT: 120,
  LOOT_CRATE_COUNT: 30,
  BOT_COUNT_DEFAULT: 15,
};
