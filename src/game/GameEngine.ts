import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { BotEntity, GameSettings, KillFeedItem, LootItem, PlayerStats, Weapon, WeaponType } from '../types/game';
import { audio } from '../utils/audio';
import { BOT_NAMES, MAP_CONFIG, WEAPON_DEFINITIONS } from './weapons';

export class GameEngine {
  public canvasContainer: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: PointerLockControls;
  
  // Game state
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public settings: GameSettings;
  
  // Player state
  public player: PlayerStats;
  private playerVelocity = new THREE.Vector3();
  private canJump = true;
  private isSprinting = false;
  private isCrouching = false;
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private isFiring = false;
  private lastShotTime = 0;
  private weaponBobTimer = 0;
  private gunMesh: THREE.Group | null = null;
  private muzzleFlashMesh: THREE.Mesh | null = null;
  private muzzleFlashLight: THREE.PointLight | null = null;

  // Environment & Zone
  public zoneRadius = MAP_CONFIG.INITIAL_ZONE_RADIUS;
  public zoneCenter = new THREE.Vector2(0, 0);
  private targetZoneCenter = new THREE.Vector2(0, 0);
  private zoneMesh: THREE.Mesh | null = null;
  private environmentObjects: THREE.Object3D[] = [];
  private colliders: THREE.Box3[] = [];

  // Entities
  public bots: BotEntity[] = [];
  private botMeshes = new Map<string, THREE.Group>();
  public lootItems: LootItem[] = [];
  private lootMeshes = new Map<string, THREE.Group>();
  
  // Visual effects
  private bulletTracers: { mesh: THREE.Line; age: number; maxAge: number }[] = [];
  private particles: { mesh: THREE.Points; velocities: Float32Array; age: number; maxAge: number }[] = [];
  private damageNumbers: { text: string; pos: THREE.Vector3; age: number; isCrit: boolean }[] = [];

  // Callbacks to UI
  public onStatsUpdate?: (stats: PlayerStats) => void;
  public onKillFeed?: (item: KillFeedItem) => void;
  public onHitmarker?: (headshot: boolean) => void;
  public onDamageTaken?: (amount: number, fromAngle: number) => void;
  public onGameOver?: (victory: boolean, stats: PlayerStats, botsRemaining: number) => void;
  public onZoneWarning?: (secondsLeft: number, isShrinking: boolean) => void;
  public onPrompt?: (text: string | null) => void;
  public onMinimapUpdate?: (data: {
    playerPos: { x: number; z: number };
    playerAngle: number;
    zoneRadius: number;
    zoneCenter: { x: number; z: number };
    bots: { x: number; z: number; isAlive: boolean }[];
    loots: { x: number; z: number; type: string }[];
  }) => void;

  private clock = new THREE.Clock();
  private animationFrameId: number | null = null;
  private zoneTimer = 120; // seconds before shrink
  private zonePhase = 1;
  private isZoneShrinking = false;
  private zoneWarningPlayed = false;

  constructor(container: HTMLElement, settings: GameSettings) {
    this.canvasContainer = container;
    this.settings = settings;

    // Initialize player default stats
    const initialWeapons = [
      JSON.parse(JSON.stringify(WEAPON_DEFINITIONS.RIFLE)),
      JSON.parse(JSON.stringify(WEAPON_DEFINITIONS.SHOTGUN)),
      JSON.parse(JSON.stringify(WEAPON_DEFINITIONS.SNIPER)),
    ];

    this.player = {
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
      weapons: initialWeapons,
      isReloading: false,
      reloadProgress: 0,
      isAiming: false,
      isOutsideZone: false,
      speed: 0.22,
      position: { x: 0, y: 1.8, z: 0 },
      rotationY: 0,
    };

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Atmospheric dark blue sky
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.0035);

    this.camera = new THREE.PerspectiveCamera(
      settings.fov || 75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.8, 100);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: settings.graphicsQuality !== 'LOW', powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.graphicsQuality === 'HIGH' ? 2 : 1.5));
    this.renderer.shadowMap.enabled = settings.graphicsQuality !== 'LOW';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 3. PointerLockControls
    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);

    // Setup world
    this.setupLighting();
    this.buildTerrain();
    this.createZone();
    this.createViewmodelGun();
    this.spawnLoot();
    this.spawnBots(settings.botCount || MAP_CONFIG.BOT_COUNT_DEFAULT);

    // Event listeners
    this.bindEvents();
  }

  // --- LIGHTING ---
  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x64748b, 1.2);
    this.scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xffedd5, 1.8);
    sun.position.set(120, 200, 80);
    sun.castShadow = this.settings.graphicsQuality !== 'LOW';
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 500;
    const d = 250;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Hemisphere light for natural ambient bounce
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 0.6);
    this.scene.add(hemiLight);
  }

  // --- TERRAIN & STRUCTURES ---
  private buildTerrain() {
    const size = MAP_CONFIG.SIZE;

    // Ground Plane with textured grid shader
    const groundGeo = new THREE.PlaneGeometry(size, size, 64, 64);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      // subtle hill elevation
      const elevation = Math.sin(vx * 0.02) * Math.cos(vy * 0.02) * 2.5 + Math.sin(vx * 0.05 + vy * 0.03) * 1.2;
      pos.setZ(i, elevation);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.15,
      wireframe: false,
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Grid markings on ground
    const gridHelper = new THREE.GridHelper(size, 50, 0x0284c7, 0x334155);
    gridHelper.position.y = 0.05;
    this.scene.add(gridHelper);

    // Boundary Mountain Walls
    const wallHeight = 40;
    const wallGeo = new THREE.BoxGeometry(size, wallHeight, 10);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    
    // 4 Border walls
    const northWall = new THREE.Mesh(wallGeo, wallMat);
    northWall.position.set(0, wallHeight / 2, -size / 2);
    const southWall = new THREE.Mesh(wallGeo, wallMat);
    southWall.position.set(0, wallHeight / 2, size / 2);
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(10, wallHeight, size), wallMat);
    eastWall.position.set(size / 2, wallHeight / 2, 0);
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(10, wallHeight, size), wallMat);
    westWall.position.set(-size / 2, wallHeight / 2, 0);
    
    [northWall, southWall, eastWall, westWall].forEach(w => {
      this.scene.add(w);
      this.environmentObjects.push(w);
      this.colliders.push(new THREE.Box3().setFromObject(w));
    });

    // Military Base Buildings, Watchtowers, and Obstacles
    const buildingColors = [0x334155, 0x475569, 0x1e293b, 0x52525b];
    for (let i = 0; i < MAP_CONFIG.OBSTACLE_COUNT; i++) {
      const isLargeWarehouse = Math.random() < 0.25;
      const isWatchtower = Math.random() < 0.2;

      const x = (Math.random() - 0.5) * (size * 0.85);
      const z = (Math.random() - 0.5) * (size * 0.85);

      // Keep center spawn clear
      if (Math.hypot(x, z) < 25) continue;

      if (isWatchtower) {
        // Multi-level watchtower
        const towerGroup = new THREE.Group();
        const legMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.8 });
        const platformMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.7 });

        // Legs
        for (let lx of [-3, 3]) {
          for (let lz of [-3, 3]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 14), legMat);
            leg.position.set(lx, 7, lz);
            leg.castShadow = true;
            towerGroup.add(leg);
          }
        }
        // Top deck
        const deck = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 8), platformMat);
        deck.position.set(0, 14, 0);
        deck.castShadow = true;
        deck.receiveShadow = true;
        towerGroup.add(deck);

        // Roof
        const roof = new THREE.Mesh(new THREE.ConeGeometry(6, 3, 4), platformMat);
        roof.position.set(0, 18, 0);
        roof.rotation.y = Math.PI / 4;
        towerGroup.add(roof);

        towerGroup.position.set(x, 0, z);
        this.scene.add(towerGroup);
        this.environmentObjects.push(towerGroup);
        this.colliders.push(new THREE.Box3().setFromObject(towerGroup));

      } else if (isLargeWarehouse) {
        // Big tactical bunker / warehouse
        const w = 18 + Math.random() * 12;
        const d = 16 + Math.random() * 10;
        const h = 8 + Math.random() * 6;

        const bGroup = new THREE.Group();
        const mainBldg = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshStandardMaterial({
            color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
            roughness: 0.7,
            metalness: 0.2
          })
        );
        mainBldg.position.set(0, h / 2, 0);
        mainBldg.castShadow = true;
        mainBldg.receiveShadow = true;
        bGroup.add(mainBldg);

        // Rooftop AC unit or antenna
        const acUnit = new THREE.Mesh(
          new THREE.BoxGeometry(3, 2, 3),
          new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.9 })
        );
        acUnit.position.set((Math.random() - 0.5) * (w * 0.5), h + 1, (Math.random() - 0.5) * (d * 0.5));
        acUnit.castShadow = true;
        bGroup.add(acUnit);

        bGroup.position.set(x, 0, z);
        this.scene.add(bGroup);
        this.environmentObjects.push(bGroup);
        this.colliders.push(new THREE.Box3().setFromObject(bGroup));

      } else {
        // Shipping Cargo Containers & Blast Barriers
        const w = 6 + Math.random() * 4;
        const h = 3.5 + Math.random() * 2;
        const d = 4 + Math.random() * 4;

        const colors = [0xd97706, 0x2563eb, 0xdc2626, 0x4b5563, 0x15803d];
        const container = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshStandardMaterial({
            color: colors[Math.floor(Math.random() * colors.length)],
            metalness: 0.7,
            roughness: 0.5
          })
        );
        container.position.set(x, h / 2, z);
        container.rotation.y = (Math.floor(Math.random() * 4) * Math.PI) / 2;
        container.castShadow = true;
        container.receiveShadow = true;
        this.scene.add(container);
        this.environmentObjects.push(container);
        this.colliders.push(new THREE.Box3().setFromObject(container));
      }
    }

    // Pine / Cyber Trees
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.6 });
    for (let i = 0; i < MAP_CONFIG.TREE_COUNT; i++) {
      const tx = (Math.random() - 0.5) * (size * 0.88);
      const tz = (Math.random() - 0.5) * (size * 0.88);
      if (Math.hypot(tx, tz) < 20) continue;

      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 4), trunkMat);
      trunk.position.y = 2;
      trunk.castShadow = true;
      tree.add(trunk);

      const f1 = new THREE.Mesh(new THREE.ConeGeometry(2.5, 4, 6), leafMat);
      f1.position.y = 5;
      f1.castShadow = true;
      tree.add(f1);

      const f2 = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.5, 6), leafMat);
      f2.position.y = 7.5;
      f2.castShadow = true;
      tree.add(f2);

      tree.position.set(tx, 0, tz);
      this.scene.add(tree);
      this.environmentObjects.push(tree);
      this.colliders.push(new THREE.Box3().setFromObject(trunk));
    }
  }

  // --- SAFE ZONE SHIELD ---
  private createZone() {
    const zoneGeo = new THREE.CylinderGeometry(1, 1, 150, 64, 1, true);
    const zoneMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      wireframe: false,
    });
    this.zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
    this.zoneMesh.position.set(this.zoneCenter.x, 75, this.zoneCenter.y);
    this.zoneMesh.scale.set(this.zoneRadius, 1, this.zoneRadius);
    this.scene.add(this.zoneMesh);
  }

  // --- FIRST-PERSON GUN VIEWMODEL ---
  private createViewmodelGun() {
    this.gunMesh = new THREE.Group();

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.5, roughness: 0.3, emissive: 0x1d4ed8, emissiveIntensity: 0.4 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

    // Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.45), bodyMat);
    receiver.position.set(0, 0, 0);
    this.gunMesh.add(receiver);

    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), bodyMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.4);
    this.gunMesh.add(barrel);

    // Scope / Optic
    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.14), accentMat);
    optic.position.set(0, 0.09, -0.05);
    this.gunMesh.add(optic);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.1), gripMat);
    grip.position.set(0, -0.12, 0.1);
    grip.rotation.x = -0.3;
    this.gunMesh.add(grip);

    // Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.1), gripMat);
    mag.position.set(0, -0.14, -0.05);
    mag.rotation.x = 0.15;
    this.gunMesh.add(mag);

    // Muzzle Flash Sprite
    const flashGeo = new THREE.ConeGeometry(0.08, 0.25, 6);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0 });
    this.muzzleFlashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlashMesh.rotation.x = -Math.PI / 2;
    this.muzzleFlashMesh.position.set(0, 0.02, -0.65);
    this.gunMesh.add(this.muzzleFlashMesh);

    // Muzzle Flash Light
    this.muzzleFlashLight = new THREE.PointLight(0xffaa22, 0, 10);
    this.muzzleFlashLight.position.set(0, 0.02, -0.65);
    this.gunMesh.add(this.muzzleFlashLight);

    // Position gun relative to camera
    this.gunMesh.position.set(0.24, -0.22, -0.45);
    this.camera.add(this.gunMesh);
    this.scene.add(this.camera);
  }

  // --- LOOT SPAWNING ---
  private spawnLoot() {
    const types: ('HEALTH' | 'SHIELD' | 'AMMO' | 'WEAPON')[] = ['HEALTH', 'SHIELD', 'AMMO', 'WEAPON'];
    const weaponTypes: WeaponType[] = ['SNIPER', 'SHOTGUN', 'PLASMA', 'SMG'];

    for (let i = 0; i < MAP_CONFIG.LOOT_CRATE_COUNT; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const wType = type === 'WEAPON' ? weaponTypes[Math.floor(Math.random() * weaponTypes.length)] : undefined;
      const x = (Math.random() - 0.5) * (MAP_CONFIG.SIZE * 0.7);
      const z = (Math.random() - 0.5) * (MAP_CONFIG.SIZE * 0.7);

      const id = `loot_${i}`;
      const color = type === 'HEALTH' ? '#22c55e' :
                    type === 'SHIELD' ? '#3b82f6' :
                    type === 'AMMO' ? '#eab308' : '#a855f7';

      const lootData: LootItem = {
        id,
        type,
        weaponType: wType,
        name: type === 'WEAPON' ? (WEAPON_DEFINITIONS[wType!]?.name || 'WEAPON') :
              type === 'HEALTH' ? 'MEDKIT (+50 HP)' :
              type === 'SHIELD' ? 'SHIELD BATTERY (+50 SHIELD)' : 'AMMO SUPPLY PACK',
        position: { x, y: 0.8, z },
        color,
        collected: false,
      };

      this.lootItems.push(lootData);

      // Create 3D Floating Crate Mesh
      const group = new THREE.Group();
      const crateMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.4,
        metalness: 0.8,
        roughness: 0.2
      });

      const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), crateMat);
      box.castShadow = true;
      group.add(box);

      // Beacon beam
      const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.25 });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.3, 12, 8), beamMat);
      beam.position.y = 6;
      group.add(beam);

      group.position.set(x, 0.6, z);
      this.scene.add(group);
      this.lootMeshes.set(id, group);
    }
  }

  // --- BOT SPAWNING ---
  private spawnBots(count: number) {
    const weaponPool: WeaponType[] = ['RIFLE', 'SHOTGUN', 'SMG', 'SNIPER'];

    for (let i = 0; i < count; i++) {
      const name = BOT_NAMES[i % BOT_NAMES.length] || `Agent_${i + 1}`;
      const wType = weaponPool[Math.floor(Math.random() * weaponPool.length)];
      const botWeapon = JSON.parse(JSON.stringify(WEAPON_DEFINITIONS[wType]));

      // Spawn bots away from player
      let x = (Math.random() - 0.5) * (MAP_CONFIG.SIZE * 0.65);
      let z = (Math.random() - 0.5) * (MAP_CONFIG.SIZE * 0.65);
      if (Math.hypot(x, z) < 30) {
        x += (x > 0 ? 30 : -30);
        z += (z > 0 ? 30 : -30);
      }

      const botColor = '#ef4444'; // Red enemy indicator

      const bot: BotEntity = {
        id: `bot_${i}`,
        name,
        health: 100,
        maxHealth: 100,
        shield: 50,
        maxShield: 100,
        kills: 0,
        position: { x, y: 0, z },
        rotation: Math.random() * Math.PI * 2,
        weapon: botWeapon,
        state: 'PATROL',
        targetPos: { x: (Math.random() - 0.5) * 100, y: 0, z: (Math.random() - 0.5) * 100 },
        targetEntityId: null,
        lastShotTime: 0,
        isDead: false,
        color: botColor,
      };

      this.bots.push(bot);

      // Create 3D Character Mesh
      const botGroup = new THREE.Group();
      
      // Body (Torso)
      const armorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.4 });
      const accentMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.5 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.45), armorMat);
      torso.position.y = 1.3;
      torso.castShadow = true;
      botGroup.add(torso);

      // Head (with headshot hitbox)
      const headMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), headMat);
      head.position.y = 2.05;
      head.castShadow = true;
      head.name = 'bot_head';
      botGroup.add(head);

      // Glowing Visor
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.2), accentMat);
      visor.position.set(0, 2.05, 0.26);
      botGroup.add(visor);

      // Legs
      const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.35), armorMat);
      leftLeg.position.set(-0.25, 0.45, 0);
      leftLeg.castShadow = true;
      botGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.35), armorMat);
      rightLeg.position.set(0.25, 0.45, 0);
      rightLeg.castShadow = true;
      botGroup.add(rightLeg);

      // Held Gun
      const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.65), new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.9 }));
      gunMesh.position.set(0.4, 1.2, 0.4);
      botGroup.add(gunMesh);

      botGroup.position.set(x, 0, z);
      this.scene.add(botGroup);
      this.botMeshes.set(bot.id, botGroup);
    }
  }

  // --- CONTROLS & EVENT BINDINGS ---
  private bindEvents() {
    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('wheel', this.onWheel);
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private unbindEvents() {
    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('wheel', this.onWheel);
  }

  private onWindowResize = () => {
    if (!this.canvasContainer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.isRunning || this.isPaused) return;

    switch (e.code) {
      case 'KeyW': this.moveForward = true; break;
      case 'KeyS': this.moveBackward = true; break;
      case 'KeyA': this.moveLeft = true; break;
      case 'KeyD': this.moveRight = true; break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.isSprinting = true;
        this.player.speed = 0.35;
        break;
      case 'Space':
        if (this.canJump) {
          this.playerVelocity.y = 0.18;
          this.canJump = false;
        }
        break;
      case 'KeyR':
        this.reloadWeapon();
        break;
      case 'KeyE':
        this.tryInteractLoot();
        break;
      case 'Digit1': this.selectWeapon(0); break;
      case 'Digit2': this.selectWeapon(1); break;
      case 'Digit3': this.selectWeapon(2); break;
      case 'Digit4': this.selectWeapon(3); break;
      case 'Digit5': this.selectWeapon(4); break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW': this.moveForward = false; break;
      case 'KeyS': this.moveBackward = false; break;
      case 'KeyA': this.moveLeft = false; break;
      case 'KeyD': this.moveRight = false; break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.isSprinting = false;
        this.player.speed = 0.22;
        break;
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    if (!this.isRunning || this.isPaused) return;
    if (!this.controls.isLocked) return;

    if (e.button === 0) {
      // Left click fire
      this.isFiring = true;
      this.handleShoot();
    } else if (e.button === 2) {
      // Right click ADS zoom
      this.player.isAiming = true;
      const currentWeapon = this.player.weapons[this.player.currentWeaponIndex];
      this.camera.fov = currentWeapon?.zoomFov || 50;
      this.camera.updateProjectionMatrix();
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isFiring = false;
    } else if (e.button === 2) {
      this.player.isAiming = false;
      this.camera.fov = this.settings.fov || 75;
      this.camera.updateProjectionMatrix();
    }
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.isRunning || this.isPaused) return;
    const count = this.player.weapons.length;
    if (count <= 1) return;

    if (e.deltaY > 0) {
      this.selectWeapon((this.player.currentWeaponIndex + 1) % count);
    } else {
      this.selectWeapon((this.player.currentWeaponIndex - 1 + count) % count);
    }
  };

  public selectWeapon(index: number) {
    if (index >= 0 && index < this.player.weapons.length && index !== this.player.currentWeaponIndex) {
      this.player.currentWeaponIndex = index;
      this.player.isReloading = false;
      this.player.reloadProgress = 0;
      audio.playPickup('AMMO');
      this.updateGunAppearance();
      if (this.onStatsUpdate) this.onStatsUpdate(this.player);
    }
  }

  private updateGunAppearance() {
    if (!this.gunMesh) return;
    const weapon = this.player.weapons[this.player.currentWeaponIndex];
    if (!weapon) return;

    // Adjust gun scale and optic based on weapon
    if (weapon.id === 'SNIPER') {
      this.gunMesh.scale.set(1.1, 1.1, 1.4);
    } else if (weapon.id === 'SHOTGUN') {
      this.gunMesh.scale.set(1.2, 1.2, 0.9);
    } else if (weapon.id === 'SMG') {
      this.gunMesh.scale.set(0.85, 0.85, 0.75);
    } else {
      this.gunMesh.scale.set(1, 1, 1);
    }
  }

  public reloadWeapon() {
    const weapon = this.player.weapons[this.player.currentWeaponIndex];
    if (!weapon || this.player.isReloading) return;
    if (weapon.currentAmmo === weapon.magazineSize || weapon.reserveAmmo <= 0) return;

    this.player.isReloading = true;
    this.player.reloadProgress = 0;
    audio.playReload();

    const reloadStartTime = Date.now();
    const interval = setInterval(() => {
      if (!this.isRunning || !this.player.isReloading) {
        clearInterval(interval);
        return;
      }
      const elapsed = Date.now() - reloadStartTime;
      this.player.reloadProgress = Math.min(1, elapsed / weapon.reloadTime);
      if (this.onStatsUpdate) this.onStatsUpdate(this.player);

      if (elapsed >= weapon.reloadTime) {
        clearInterval(interval);
        const needed = weapon.magazineSize - weapon.currentAmmo;
        const available = Math.min(needed, weapon.reserveAmmo);
        weapon.currentAmmo += available;
        weapon.reserveAmmo -= available;
        this.player.isReloading = false;
        this.player.reloadProgress = 0;
        if (this.onStatsUpdate) this.onStatsUpdate(this.player);
      }
    }, 50);
  }

  // --- SHOOTING MECHANICS ---
  private handleShoot() {
    const weapon = this.player.weapons[this.player.currentWeaponIndex];
    if (!weapon || this.player.isReloading) return;

    const now = Date.now();
    if (now - this.lastShotTime < weapon.fireRate) return;

    if (weapon.currentAmmo <= 0) {
      audio.playEmptyClick();
      this.reloadWeapon();
      return;
    }

    this.lastShotTime = now;
    weapon.currentAmmo--;
    this.player.shotsFired++;

    // Play weapon sound
    audio.playShoot(weapon.id);

    // Muzzle Flash
    this.triggerMuzzleFlash();

    // Recoil Camera Kick
    const recoilAmount = this.player.isAiming ? weapon.recoil * 0.4 : weapon.recoil;
    this.camera.rotation.x += recoilAmount * (Math.random() * 0.5 + 0.5);

    // Bullets raycast
    const pellets = weapon.bulletsPerShot || 1;
    let hitAny = false;

    for (let p = 0; p < pellets; p++) {
      const spreadFactor = this.player.isAiming ? weapon.spread * 0.3 : weapon.spread;
      const spreadX = (Math.random() - 0.5) * spreadFactor;
      const spreadY = (Math.random() - 0.5) * spreadFactor;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), this.camera);
      raycaster.far = weapon.range;

      // Target meshes
      const targetObjects: THREE.Object3D[] = [];
      this.botMeshes.forEach(mesh => targetObjects.push(mesh));
      targetObjects.push(...this.environmentObjects);

      const intersects = raycaster.intersectObjects(targetObjects, true);

      let targetEndPos = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(weapon.range));

      if (intersects.length > 0) {
        const hit = intersects[0];
        targetEndPos = hit.point;

        // Check if bot was hit
        let hitBot: BotEntity | null = null;
        let isHeadshot = false;

        let currObj: THREE.Object3D | null = hit.object;
        while (currObj && currObj !== this.scene) {
          if (currObj.name === 'bot_head') {
            isHeadshot = true;
          }
          // Find bot ID
          for (const [id, mesh] of this.botMeshes.entries()) {
            if (mesh === currObj) {
              hitBot = this.bots.find(b => b.id === id) || null;
              break;
            }
          }
          if (hitBot) break;
          currObj = currObj.parent;
        }

        if (hitBot && !hitBot.isDead) {
          hitAny = true;
          this.player.shotsHit++;
          if (isHeadshot) this.player.headshots++;

          const rawDamage = weapon.damage * (isHeadshot ? weapon.headshotMultiplier : 1.0);
          const finalDamage = Math.round(rawDamage * (1.0 + (Math.random() * 0.1 - 0.05)));

          // Apply damage to shield first then health
          let dmgToApply = finalDamage;
          if (hitBot.shield > 0) {
            if (hitBot.shield >= dmgToApply) {
              hitBot.shield -= dmgToApply;
              dmgToApply = 0;
            } else {
              dmgToApply -= hitBot.shield;
              hitBot.shield = 0;
            }
          }
          hitBot.health = Math.max(0, hitBot.health - dmgToApply);
          this.player.damageDealt += finalDamage;

          // Aggro bot onto player
          hitBot.targetEntityId = 'player';
          hitBot.state = 'COMBAT';

          // Hitmarker & audio
          audio.playHitmarker(isHeadshot);
          if (this.onHitmarker) this.onHitmarker(isHeadshot);

          // Spawn blood / spark particles
          this.spawnImpactParticles(hit.point, isHeadshot ? 0xff0000 : 0xf59e0b);

          if (hitBot.health <= 0) {
            this.eliminateBot(hitBot, true, isHeadshot);
          }
        } else {
          // Hit environment wall/ground
          this.spawnImpactParticles(hit.point, 0x94a3b8);
        }
      }

      // Draw Tracer Line
      this.createBulletTracer(this.camera.position, targetEndPos, weapon.color);
    }

    if (this.onStatsUpdate) this.onStatsUpdate(this.player);
  }

  private triggerMuzzleFlash() {
    if (this.muzzleFlashMesh && this.muzzleFlashLight) {
      (this.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
      this.muzzleFlashLight.intensity = 3.0;
      setTimeout(() => {
        if (this.muzzleFlashMesh && this.muzzleFlashLight) {
          (this.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = 0;
          this.muzzleFlashLight.intensity = 0;
        }
      }, 50);
    }
  }

  private createBulletTracer(start: THREE.Vector3, end: THREE.Vector3, color: string) {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.8 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.bulletTracers.push({ mesh: line, age: 0, maxAge: 0.08 });
  }

  private spawnImpactParticles(pos: THREE.Vector3, color: number) {
    const count = 12;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      velocities[i * 3] = (Math.random() - 0.5) * 4;
      velocities[i * 3 + 1] = Math.random() * 4;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color, size: 0.15, transparent: true, opacity: 1 });
    const particleSystem = new THREE.Points(geometry, material);
    this.scene.add(particleSystem);

    this.particles.push({ mesh: particleSystem, velocities, age: 0, maxAge: 0.35 });
  }

  // --- BOT ELIMINATION & LOOT DROP ---
  public eliminateBot(bot: BotEntity, killedByPlayer: boolean, isHeadshot: boolean = false, killerName?: string) {
    if (bot.isDead) return;
    bot.isDead = true;

    // Drop loot at bot position
    const lootId = `bot_loot_${bot.id}`;
    const botLoot: LootItem = {
      id: lootId,
      type: Math.random() < 0.5 ? 'HEALTH' : 'AMMO',
      name: 'MEDKIT & AMMO CACHE',
      position: { ...bot.position, y: 0.8 },
      color: '#22c55e',
      collected: false,
    };
    this.lootItems.push(botLoot);

    // Create 3D Drop Box
    const group = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.6, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x15803d, emissiveIntensity: 0.4 })
    );
    group.add(box);
    group.position.set(bot.position.x, 0.6, bot.position.z);
    this.scene.add(group);
    this.lootMeshes.set(lootId, group);

    // Remove bot mesh with disintegration explosion
    const mesh = this.botMeshes.get(bot.id);
    if (mesh) {
      this.spawnImpactParticles(new THREE.Vector3(bot.position.x, 1.5, bot.position.z), 0xef4444);
      this.scene.remove(mesh);
    }

    if (killedByPlayer) {
      this.player.kills++;
    }

    // Kill feed update
    const activeWeapon = this.player.weapons[this.player.currentWeaponIndex];
    const feedItem: KillFeedItem = {
      id: `kill_${Date.now()}_${Math.random()}`,
      killer: killedByPlayer ? 'YOU' : (killerName || 'STORM'),
      victim: bot.name,
      weapon: killedByPlayer ? activeWeapon.name : 'VORTEX',
      isHeadshot,
      isPlayerKiller: killedByPlayer,
      isPlayerVictim: false,
      timestamp: Date.now(),
    };
    if (this.onKillFeed) this.onKillFeed(feedItem);

    // Check Victory
    const aliveBots = this.bots.filter(b => !b.isDead).length;
    if (aliveBots === 0) {
      this.endGame(true);
    }
  }

  // --- LOOT PICKUP LOGIC ---
  private tryInteractLoot() {
    const pPos = this.camera.position;
    for (const loot of this.lootItems) {
      if (loot.collected) continue;
      const dist = Math.hypot(pPos.x - loot.position.x, pPos.z - loot.position.z);

      if (dist < 4.0) {
        loot.collected = true;
        const mesh = this.lootMeshes.get(loot.id);
        if (mesh) this.scene.remove(mesh);

        // Apply item effect
        if (loot.type === 'HEALTH') {
          this.player.health = Math.min(this.player.maxHealth, this.player.health + 50);
          audio.playPickup('HEALTH');
        } else if (loot.type === 'SHIELD') {
          this.player.shield = Math.min(this.player.maxShield, this.player.shield + 50);
          audio.playPickup('SHIELD');
        } else if (loot.type === 'AMMO') {
          this.player.weapons.forEach(w => {
            w.reserveAmmo = Math.min(w.maxReserveAmmo, w.reserveAmmo + w.magazineSize * 2);
          });
          audio.playPickup('AMMO');
        } else if (loot.type === 'WEAPON' && loot.weaponType) {
          const newWep = JSON.parse(JSON.stringify(WEAPON_DEFINITIONS[loot.weaponType]));
          const existingIdx = this.player.weapons.findIndex(w => w.id === loot.weaponType);
          if (existingIdx >= 0) {
            this.player.weapons[existingIdx].reserveAmmo = this.player.weapons[existingIdx].maxReserveAmmo;
          } else if (this.player.weapons.length < 5) {
            this.player.weapons.push(newWep);
            this.selectWeapon(this.player.weapons.length - 1);
          }
          audio.playPickup('WEAPON');
        }

        if (this.onStatsUpdate) this.onStatsUpdate(this.player);
        break;
      }
    }
  }

  // --- GAME TICK & BOT AI LOOP ---
  private update(delta: number) {
    if (!this.isRunning || this.isPaused) return;

    // 1. Safe Zone Shrink Logic
    this.updateSafeZone(delta);

    // 2. Player Movement & Physics
    this.updatePlayerMovement(delta);

    // 3. Gun Bobbing & Auto-Fire
    this.updateGunViewmodel(delta);

    // 4. Bot AI & Combat
    this.updateBotAI(delta);

    // 5. Visual Particles & Tracers
    this.updateParticles(delta);

    // 6. Proximity Prompt for Loot
    this.checkLootProximity();

    // 7. Radar Minimap Update
    this.sendMinimapData();
  }

  private updateSafeZone(delta: number) {
    this.zoneTimer -= delta;

    if (this.zoneTimer <= 15 && !this.zoneWarningPlayed) {
      audio.playZoneWarning();
      this.zoneWarningPlayed = true;
    }

    if (this.zoneTimer <= 0) {
      this.isZoneShrinking = true;
      this.zoneRadius = Math.max(MAP_CONFIG.MIN_ZONE_RADIUS, this.zoneRadius - MAP_CONFIG.ZONE_SHRINK_SPEED * 60 * delta);

      if (this.zoneMesh) {
        this.zoneMesh.scale.set(this.zoneRadius, 1, this.zoneRadius);
      }

      if (this.zoneRadius <= MAP_CONFIG.MIN_ZONE_RADIUS * this.zonePhase) {
        // Reset timer for next phase
        this.zonePhase++;
        this.zoneTimer = 60;
        this.isZoneShrinking = false;
        this.zoneWarningPlayed = false;
      }
    }

    if (this.onZoneWarning) {
      this.onZoneWarning(Math.max(0, Math.ceil(this.zoneTimer)), this.isZoneShrinking);
    }

    // Check if player is outside safe zone
    const pDist = Math.hypot(this.camera.position.x - this.zoneCenter.x, this.camera.position.z - this.zoneCenter.y);
    if (pDist > this.zoneRadius) {
      this.player.isOutsideZone = true;
      const stormDmg = delta * 12; // 12 DPS outside storm
      this.takePlayerDamage(stormDmg, 0);
    } else {
      this.player.isOutsideZone = false;
    }
  }

  private updatePlayerMovement(delta: number) {
    if (this.controls.isLocked) {
      const moveSpeed = this.player.speed * (this.player.isAiming ? 0.6 : 1.0);
      
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const moveVec = new THREE.Vector3();
      if (this.moveForward) moveVec.add(forward);
      if (this.moveBackward) moveVec.sub(forward);
      if (this.moveRight) moveVec.add(right);
      if (this.moveLeft) moveVec.sub(right);

      if (moveVec.lengthSq() > 0) {
        moveVec.normalize().multiplyScalar(moveSpeed);
        this.camera.position.add(moveVec);
      }

      // Gravity & Jumping
      this.playerVelocity.y -= 0.009 * 60 * delta;
      this.camera.position.y += this.playerVelocity.y;

      if (this.camera.position.y <= 1.8) {
        this.camera.position.y = 1.8;
        this.playerVelocity.y = 0;
        this.canJump = true;
      }

      // Keep player in bounds
      const halfSize = MAP_CONFIG.SIZE / 2 - 5;
      this.camera.position.x = Math.max(-halfSize, Math.min(halfSize, this.camera.position.x));
      this.camera.position.z = Math.max(-halfSize, Math.min(halfSize, this.camera.position.z));

      this.player.position = { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z };
    }
  }

  private updateGunViewmodel(delta: number) {
    if (!this.gunMesh) return;

    // Auto-fire check
    const currentWeapon = this.player.weapons[this.player.currentWeaponIndex];
    if (this.isFiring && currentWeapon?.autoFire) {
      this.handleShoot();
    }

    // Weapon sway / bobbing while moving
    const isMoving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
    if (isMoving) {
      this.weaponBobTimer += delta * (this.isSprinting ? 14 : 9);
      const bobX = Math.sin(this.weaponBobTimer) * 0.015;
      const bobY = Math.cos(this.weaponBobTimer * 2) * 0.01;

      if (this.player.isAiming) {
        this.gunMesh.position.set(0 + bobX * 0.2, -0.15 + bobY * 0.2, -0.3);
      } else {
        this.gunMesh.position.set(0.24 + bobX, -0.22 + bobY, -0.45);
      }
    } else {
      if (this.player.isAiming) {
        this.gunMesh.position.set(0, -0.15, -0.3);
      } else {
        this.gunMesh.position.set(0.24, -0.22, -0.45);
      }
    }
  }

  // --- BOT AI BEHAVIOR ---
  private updateBotAI(delta: number) {
    const now = Date.now();
    const pPos = this.camera.position;

    this.bots.forEach(bot => {
      if (bot.isDead) return;

      const botMesh = this.botMeshes.get(bot.id);
      if (!botMesh) return;

      // 1. Check distance to safe zone center
      const distToZone = Math.hypot(bot.position.x - this.zoneCenter.x, bot.position.z - this.zoneCenter.y);
      if (distToZone > this.zoneRadius * 0.85) {
        // Outside safe zone -> Bot runs directly towards zone center
        bot.state = 'FLEEING_ZONE';
        bot.targetPos = { x: this.zoneCenter.x + (Math.random() - 0.5) * 20, y: 0, z: this.zoneCenter.y + (Math.random() - 0.5) * 20 };
      }

      // 2. Check distance to player
      const distToPlayer = Math.hypot(pPos.x - bot.position.x, pPos.z - bot.position.z);

      if (distToPlayer < 90 && bot.state !== 'FLEEING_ZONE') {
        bot.state = 'COMBAT';
        bot.targetEntityId = 'player';
      }

      // 3. Movement execution
      let moveDir = new THREE.Vector3();

      if (bot.state === 'COMBAT' && bot.targetEntityId === 'player') {
        // Face player
        const targetAngle = Math.atan2(pPos.x - bot.position.x, pPos.z - bot.position.z);
        botMesh.rotation.y = targetAngle;

        // Strafe or close in
        if (distToPlayer > 25) {
          // Approach
          moveDir.set(Math.sin(targetAngle), 0, Math.cos(targetAngle)).multiplyScalar(0.12);
        } else if (distToPlayer < 12) {
          // Back up
          moveDir.set(-Math.sin(targetAngle), 0, -Math.cos(targetAngle)).multiplyScalar(0.1);
        } else {
          // Circle strafe
          moveDir.set(Math.cos(targetAngle), 0, -Math.sin(targetAngle)).multiplyScalar(0.08 * (Math.sin(now * 0.002) > 0 ? 1 : -1));
        }

        // Firing at player
        const botFireRate = this.settings.difficulty === 'NIGHTMARE' ? 400 :
                            this.settings.difficulty === 'VETERAN' ? 700 :
                            this.settings.difficulty === 'SOLDIER' ? 1100 : 1600;

        if (now - bot.lastShotTime > botFireRate) {
          bot.lastShotTime = now;
          this.botFireAtPlayer(bot);
        }

      } else {
        // Patrol or flee
        if (!bot.targetPos || Math.hypot(bot.position.x - bot.targetPos.x, bot.position.z - bot.targetPos.z) < 5) {
          // Pick new patrol destination
          bot.targetPos = {
            x: (Math.random() - 0.5) * (this.zoneRadius * 1.2) + this.zoneCenter.x,
            y: 0,
            z: (Math.random() - 0.5) * (this.zoneRadius * 1.2) + this.zoneCenter.y,
          };
        }

        const angle = Math.atan2(bot.targetPos.x - bot.position.x, bot.targetPos.z - bot.position.z);
        botMesh.rotation.y = angle;
        moveDir.set(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(0.1);
      }

      // Apply bot movement
      bot.position.x += moveDir.x;
      bot.position.z += moveDir.z;
      botMesh.position.set(bot.position.x, 0, bot.position.z);

      // Bot zone damage if in storm
      if (distToZone > this.zoneRadius) {
        bot.health -= delta * 15;
        if (bot.health <= 0) {
          this.eliminateBot(bot, false, false, 'STORM');
        }
      }
    });

    // Random inter-bot duels
    if (Math.random() < 0.008) {
      const alive = this.bots.filter(b => !b.isDead);
      if (alive.length >= 2) {
        const victim = alive[Math.floor(Math.random() * alive.length)];
        const killer = alive.find(b => b.id !== victim.id);
        if (victim && killer) {
          victim.health -= 45;
          if (victim.health <= 0) {
            this.eliminateBot(victim, false, Math.random() < 0.2, killer.name);
          }
        }
      }
    }
  }

  private botFireAtPlayer(bot: BotEntity) {
    const accuracy = this.settings.difficulty === 'NIGHTMARE' ? 0.75 :
                     this.settings.difficulty === 'VETERAN' ? 0.55 :
                     this.settings.difficulty === 'SOLDIER' ? 0.35 : 0.2;

    const hit = Math.random() < accuracy;
    const start = new THREE.Vector3(bot.position.x, 1.3, bot.position.z);

    if (hit) {
      const damage = Math.round(10 + Math.random() * 12);
      this.takePlayerDamage(damage, Math.atan2(bot.position.x - this.camera.position.x, bot.position.z - this.camera.position.z));
      this.createBulletTracer(start, this.camera.position, '#ef4444');
    } else {
      // Miss nearby
      const missPos = this.camera.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 6));
      this.createBulletTracer(start, missPos, '#ef4444');
    }
  }

  public takePlayerDamage(amount: number, fromAngle: number) {
    if (this.player.health <= 0) return;

    let dmg = amount;
    if (this.player.shield > 0) {
      if (this.player.shield >= dmg) {
        this.player.shield -= dmg;
        dmg = 0;
      } else {
        dmg -= this.player.shield;
        this.player.shield = 0;
        audio.playShieldBreak();
      }
    }

    this.player.health = Math.max(0, this.player.health - dmg);
    audio.playDamage();

    if (this.onDamageTaken) {
      this.onDamageTaken(amount, fromAngle);
    }
    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.player);
    }

    if (this.player.health <= 0) {
      this.endGame(false);
    }
  }

  // --- PARTICLES & TRACERS UPDATE ---
  private updateParticles(delta: number) {
    // Tracers
    for (let i = this.bulletTracers.length - 1; i >= 0; i--) {
      const tracer = this.bulletTracers[i];
      tracer.age += delta;
      if (tracer.age >= tracer.maxAge) {
        this.scene.remove(tracer.mesh);
        this.bulletTracers.splice(i, 1);
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += delta;
      const positions = p.mesh.geometry.attributes.position.array as Float32Array;
      for (let j = 0; j < positions.length / 3; j++) {
        positions[j * 3] += p.velocities[j * 3] * delta;
        positions[j * 3 + 1] += p.velocities[j * 3 + 1] * delta - 9.8 * delta * delta;
        positions[j * 3 + 2] += p.velocities[j * 3 + 2] * delta;
      }
      p.mesh.geometry.attributes.position.needsUpdate = true;

      if (p.age >= p.maxAge) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  // --- LOOT PROXIMITY CHECK ---
  private checkLootProximity() {
    const pPos = this.camera.position;
    let nearbyText: string | null = null;

    for (const loot of this.lootItems) {
      if (loot.collected) continue;
      const dist = Math.hypot(pPos.x - loot.position.x, pPos.z - loot.position.z);
      if (dist < 4.0) {
        nearbyText = `Press [E] or TAP to take ${loot.name}`;
        break;
      }
    }

    if (this.onPrompt) {
      this.onPrompt(nearbyText);
    }
  }

  // --- MINIMAP RADAR DATA ---
  private sendMinimapData() {
    if (!this.onMinimapUpdate) return;
    const pPos = this.camera.position;
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const angle = Math.atan2(forward.x, forward.z);

    this.onMinimapUpdate({
      playerPos: { x: pPos.x, z: pPos.z },
      playerAngle: angle,
      zoneRadius: this.zoneRadius,
      zoneCenter: { x: this.zoneCenter.x, z: this.zoneCenter.y },
      bots: this.bots.map(b => ({ x: b.position.x, z: b.position.z, isAlive: !b.isDead })),
      loots: this.lootItems.filter(l => !l.collected).map(l => ({ x: l.position.x, z: l.position.z, type: l.type }))
    });
  }

  // --- TOUCH CONTROLS HELPER (MOBILE) ---
  public handleTouchMove(forward: number, right: number) {
    this.moveForward = forward > 0.2;
    this.moveBackward = forward < -0.2;
    this.moveRight = right > 0.2;
    this.moveLeft = right < -0.2;
  }

  public handleTouchLook(deltaX: number, deltaY: number) {
    const sensitivity = this.settings.mouseSensitivity * 0.003;
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(this.camera.quaternion);

    euler.y -= deltaX * sensitivity;
    euler.x -= deltaY * sensitivity * (this.settings.invertY ? -1 : 1);
    euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.x));

    this.camera.quaternion.setFromEuler(euler);
  }

  public handleTouchJump() {
    if (this.canJump) {
      this.playerVelocity.y = 0.18;
      this.canJump = false;
    }
  }

  public handleTouchFire(isDown: boolean) {
    this.isFiring = isDown;
    if (isDown) this.handleShoot();
  }

  public handleTouchScopeToggle() {
    this.player.isAiming = !this.player.isAiming;
    const currentWeapon = this.player.weapons[this.player.currentWeaponIndex];
    this.camera.fov = this.player.isAiming ? (currentWeapon?.zoomFov || 50) : (this.settings.fov || 75);
    this.camera.updateProjectionMatrix();
  }

  // --- GAME LIFECYCLE ---
  public start() {
    this.isRunning = true;
    this.isPaused = false;
    this.clock.start();
    audio.startAmbient();

    const loop = () => {
      this.animationFrameId = requestAnimationFrame(loop);
      const delta = Math.min(0.1, this.clock.getDelta());
      this.update(delta);
      this.renderer.render(this.scene, this.camera);
    };

    loop();
  }

  public pause() {
    this.isPaused = true;
    if (this.controls.isLocked) {
      this.controls.unlock();
    }
  }

  public resume() {
    this.isPaused = false;
    this.controls.lock();
  }

  public endGame(victory: boolean) {
    this.isRunning = false;
    this.controls.unlock();
    audio.stopAmbient();

    if (victory) {
      audio.playVictory();
    } else {
      audio.playDefeat();
    }

    const aliveBots = this.bots.filter(b => !b.isDead).length;
    if (this.onGameOver) {
      this.onGameOver(victory, this.player, aliveBots);
    }
  }

  public destroy() {
    this.isRunning = false;
    audio.stopAmbient();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.unbindEvents();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
