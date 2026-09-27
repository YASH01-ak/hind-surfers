import { sounds } from './audio';
import { ParticleSystem } from './particles';
import { CHARACTERS, DIFFICULTIES, UPGRADES } from './constants';
import { Character, Difficulty, GameObject, PowerupState, Upgrade } from './types';
import { GameRenderer } from './renderer';

export class GameEngine {
  public r: GameRenderer;
  public onGameOver: (score: number, coins: number, bestScore: number, isNewBest: boolean) => void;
  public onScoreUpdate: (score: number, coins: number) => void;
  public onPowerupChange: (powerups: PowerupState) => void;

  public particles: ParticleSystem;
  public state: 'ready' | 'play' | 'pause' | 'over' = 'ready';
  public dist = 0;
  public coins = 0;
  public score = 0;
  public speed = 18;
  public lane = 0;
  public px = 0;
  public jy = 0;
  public vy = 0;
  public sl = 0;
  public objs: GameObject[] = [];
  public spawnTimer = 5;
  public shake = 0;
  public t = 0;
  public run = 0;

  public difficulty: Difficulty = DIFFICULTIES.normal;
  public character: Character = CHARACTERS[0];
  public upgrades: Upgrade[] = JSON.parse(JSON.stringify(UPGRADES));

  public activePowerups: PowerupState = {
    magnet: 0,
    multiplier: 0,
    boots: 0,
    hoverboard: false
  };

  public highScore = 0;
  public totalRupees = 0;

  constructor(
    renderer: GameRenderer,
    onGameOver: (score: number, coins: number, bestScore: number, isNewBest: boolean) => void,
    onScoreUpdate: (score: number, coins: number) => void,
    onPowerupChange: (powerups: PowerupState) => void
  ) {
    this.r = renderer;
    this.onGameOver = onGameOver;
    this.onScoreUpdate = onScoreUpdate;
    this.onPowerupChange = onPowerupChange;
    this.particles = new ParticleSystem();
    this.loadSaveData();
  }

  loadSaveData() {
    try {
      this.highScore = +(localStorage.getItem('hs_highscore') || 0);
      this.totalRupees = +(localStorage.getItem('hs_rupees') || 0);
      const savedChar = localStorage.getItem('hs_character');
      if (savedChar) {
        const found = CHARACTERS.find((c) => c.id === savedChar);
        if (found) this.character = found;
      }
      const savedDiff = localStorage.getItem('hs_difficulty');
      if (savedDiff && DIFFICULTIES[savedDiff]) {
        this.difficulty = DIFFICULTIES[savedDiff];
      }
      const savedUpgrades = localStorage.getItem('hs_upgrades');
      if (savedUpgrades) {
        const parsed = JSON.parse(savedUpgrades);
        if (Array.isArray(parsed)) {
          parsed.forEach((u: Upgrade) => {
            const match = this.upgrades.find((orig) => orig.id === u.id);
            if (match) {
              if (u.level) match.level = u.level;
              if (u.count !== undefined) match.count = u.count;
            }
          });
        }
      }
    } catch {
      // LocalStorage access fallback
    }
  }

  saveData() {
    try {
      localStorage.setItem('hs_highscore', this.highScore.toString());
      localStorage.setItem('hs_rupees', this.totalRupees.toString());
      localStorage.setItem('hs_character', this.character.id);
      localStorage.setItem('hs_difficulty', this.difficulty.id);
      localStorage.setItem('hs_upgrades', JSON.stringify(this.upgrades));
    } catch {
      // LocalStorage access fallback
    }
  }

  setDifficulty(diffKey: string) {
    if (DIFFICULTIES[diffKey]) {
      this.difficulty = DIFFICULTIES[diffKey];
      this.saveData();
    }
  }

  setCharacter(charId: string) {
    const found = CHARACTERS.find((c) => c.id === charId);
    if (found) {
      this.character = found;
      this.saveData();
    }
  }

  reset() {
    this.dist = 0;
    this.coins = 0;
    this.score = 0;
    this.speed = this.difficulty.speedBase;
    this.lane = 0;
    this.px = 0;
    this.jy = 0;
    this.vy = 0;
    this.sl = 0;
    this.objs = [];
    this.spawnTimer = 5;
    this.shake = 0;
    this.activePowerups = { magnet: 0, multiplier: 0, boots: 0, hoverboard: false };
    this.particles.reset();
  }

  start() {
    sounds.init();
    this.reset();
    this.state = 'play';
    sounds.startBackgroundMusic();
  }

  pause() {
    if (this.state === 'play') {
      this.state = 'pause';
      sounds.stopBackgroundMusic();
    } else if (this.state === 'pause') {
      this.state = 'play';
      sounds.startBackgroundMusic();
    }
  }

  activateHoverboard() {
    if (this.state !== 'play' || this.activePowerups.hoverboard) return;
    const item = this.upgrades.find((u) => u.id === 'hoverboard_item');
    if (item && (item.count || 0) > 0) {
      item.count = (item.count || 0) - 1;
      this.activePowerups.hoverboard = true;
      this.saveData();
      sounds.playHoverboard();
      this.particles.addFloatingText('🛹 HOVERBOARD ON!', this.r.W / 2, this.r.base - 80, '#10b981');
      if (this.onPowerupChange) this.onPowerupChange(this.activePowerups);
    }
  }

  spawn() {
    const L = [-1, 0, 1].sort(() => Math.random() - 0.5);
    const r = Math.random();
    const z = 74;
    let maxLen = 1;

    if (r < 0.42) {
      // Train obstacle: Vande Bharat or Rajdhani
      const trainCount = Math.random() < 0.38 ? 2 : 1;
      for (let i = 0; i < trainCount; i++) {
        const len = 8 + Math.random() * 9;
        maxLen = Math.max(maxLen, len);
        const isVande = Math.random() < 0.4;
        this.objs.push({
          t: 'train',
          l: L[i],
          z,
          len,
          c: Math.random() < 0.5 ? 0 : 1,
          trainType: isVande ? 'vande_bharat' : 'rajdhani',
          speedBonus: this.difficulty.trainSpeed * (Math.random() < 0.6 ? 1 : 0)
        });
        if (Math.random() < 0.3) sounds.playTrainHorn();
      }
      if (trainCount === 1 && Math.random() < 0.75) {
        this.spawnCoinLine(L[1], z, 6);
      }
    } else if (r < 0.67) {
      // Low barrier: Jump!
      const barrierCount = Math.random() < 0.45 ? 2 : 1;
      for (let i = 0; i < barrierCount; i++) {
        this.objs.push({ t: 'low', l: L[i], z, len: 0.8 });
      }
      this.spawnCoinLine(L[2], z, 5);
    } else if (r < 0.82) {
      // High overhead barrier: Slide!
      [-1, 0, 1].forEach((l) => {
        if (Math.random() < 0.85) this.objs.push({ t: 'high', l, z, len: 0.8 });
      });
    } else if (r < 0.92) {
      // Power-up
      const pTypes: Array<{ type: 'magnet' | 'multiplier' | 'boots'; icon: string; color: string }> = [
        { type: 'magnet', icon: '🧲', color: '#ff9933' },
        { type: 'multiplier', icon: '🪙', color: '#f59e0b' },
        { type: 'boots', icon: '👟', color: '#10b981' }
      ];
      const pChoice = pTypes[Math.floor(Math.random() * pTypes.length)];
      this.objs.push({
        t: 'powerup',
        pType: pChoice.type,
        icon: pChoice.icon,
        color: pChoice.color,
        l: L[0],
        z,
        len: 0.8
      });
      this.spawnCoinLine(L[0], z + 3, 5);
    } else {
      // Line of Rupee coins
      this.spawnCoinLine(L[0], z, 7);
    }

    this.spawnTimer = this.speed * 1.05 + 8 + Math.random() * 7 + maxLen;
  }

  spawnCoinLine(lane: number, startZ: number, count: number) {
    for (let i = 0; i < count; i++) {
      this.objs.push({ t: 'coin', l: lane, z: startZ + i * 2.4, len: 0 });
    }
  }

  moveLane(dir: number) {
    if (this.state !== 'play') return;
    const oldLane = this.lane;
    this.lane = Math.max(-1, Math.min(1, this.lane + dir));
    if (this.lane !== oldLane) {
      sounds.playLaneSwitch();
      this.particles.addDust(this.r.W / 2 + this.px * this.r.LW, this.r.base, 4);
    }
  }

  jump() {
    if (this.state !== 'play') return;
    if (this.jy === 0 && this.vy === 0) {
      const jumpPower = this.activePowerups.boots > 0 ? 5.3 : 4.1;
      this.vy = jumpPower;
      this.jy = 0.0001;
      this.sl = 0;
      sounds.playJump();
    }
  }

  slide() {
    if (this.state !== 'play') return;
    const slideDuration = this.character.id === 'sheru' ? 0.95 : 0.75;
    this.sl = slideDuration;
    if (this.jy > 0) this.vy = -8.5; // Fast dive downwards
    sounds.playSlide();
    this.particles.addDust(this.r.W / 2 + this.px * this.r.LW, this.r.base, 7, true);
  }

  crash() {
    if (this.activePowerups.hoverboard) {
      this.activePowerups.hoverboard = false;
      this.shake = 0.35;
      sounds.playCrash();
      this.particles.addCrashExplosion(this.r.W / 2 + this.px * this.r.LW, this.r.base - 60);
      this.particles.addFloatingText('SHIELD SAVED YOU!', this.r.W / 2, this.r.base - 100, '#10b981');
      if (this.onPowerupChange) this.onPowerupChange(this.activePowerups);
      // clear nearby obstacle
      this.objs = this.objs.filter((o) => o.z > 3 || o.z < -2);
      return;
    }

    this.state = 'over';
    this.shake = 0.55;
    sounds.playCrash();
    sounds.stopBackgroundMusic();
    this.particles.addCrashExplosion(this.r.W / 2 + this.px * this.r.LW, this.r.base - 60);

    const finalScore = this.calculateScore();
    let isNewBest = false;
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      isNewBest = true;
    }
    this.totalRupees += this.coins;
    this.saveData();

    if (this.onGameOver) {
      this.onGameOver(finalScore, this.coins, this.highScore, isNewBest);
    }
  }

  calculateScore(): number {
    const multi =
      (this.activePowerups.multiplier > 0 ? 2 : 1) *
      this.difficulty.multi *
      (this.character.id === 'babu' ? 1.2 : 1.0);
    return Math.floor((this.dist / 2 + this.coins * 10) * multi);
  }

  update(dt: number) {
    if (this.state === 'ready') {
      this.dist += 12 * dt;
      return;
    }
    if (this.state !== 'play') return;

    this.speed = Math.min(
      this.difficulty.speedMax,
      this.difficulty.speedBase + this.dist * this.difficulty.accel
    );
    this.dist += this.speed * dt;
    this.px += (this.lane - this.px) * Math.min(1, dt * 15);

    // Vertical Jump Physics
    if (this.jy > 0 || this.vy > 0) {
      this.vy -= 9.8 * dt;
      this.jy += this.vy * dt;
      if (this.jy <= 0) {
        this.jy = 0;
        this.vy = 0;
        this.particles.addDust(this.r.W / 2 + this.px * this.r.LW, this.r.base, 5);
      }
    }

    // Sliding timer
    if (this.sl > 0) {
      this.sl -= dt;
      if (Math.random() < 0.4) {
        this.particles.addDust(this.r.W / 2 + this.px * this.r.LW, this.r.base, 2, true);
      }
    } else {
      if (this.jy === 0 && Math.random() < 0.25) {
        this.particles.addDust(this.r.W / 2 + this.px * this.r.LW, this.r.base, 1);
      }
    }

    // Powerups Countdown
    let powerupChanged = false;
    for (const key of ['magnet', 'multiplier', 'boots'] as const) {
      if (this.activePowerups[key] > 0) {
        this.activePowerups[key] -= dt;
        if (this.activePowerups[key] <= 0) {
          this.activePowerups[key] = 0;
          powerupChanged = true;
        }
      }
    }
    if (powerupChanged && this.onPowerupChange) {
      this.onPowerupChange(this.activePowerups);
    }

    // Obstacle Spawning
    this.spawnTimer -= this.speed * dt;
    if (this.spawnTimer <= 0) this.spawn();

    // Magnet Attraction Distance
    const magnetActive = this.activePowerups.magnet > 0;
    const magnetReach = this.character.id === 'ananya' ? 34 : 28;

    // Update Obstacles and Collisions
    for (const o of this.objs) {
      const objSpeed = this.speed + (o.speedBonus || 0);
      o.z -= objSpeed * dt;

      // Magnet pull
      if (o.t === 'coin' && !o.d && magnetActive && o.z < magnetReach && o.z > 0) {
        o.l += (this.px - o.l) * Math.min(1, dt * 10);
      }

      // Hitbox
      const laneDist = Math.abs(this.px - o.l);
      if (laneDist < 0.58 && o.z < 0.65 && o.z + o.len > -0.65) {
        if (o.t === 'coin') {
          if (!o.d) {
            o.d = 1;
            const coinGain = this.activePowerups.multiplier > 0 ? 2 : 1;
            this.coins += coinGain;
            sounds.playCoin();
            const coinScreenX = this.r.W / 2 + this.px * this.r.LW;
            const coinScreenY = this.r.base - this.jy * this.r.LW - 40;
            this.particles.addCoinBurst(coinScreenX, coinScreenY);
            if (coinGain > 1) {
              this.particles.addFloatingText('+₹2', coinScreenX, coinScreenY - 20, '#ffd15c');
            }
          }
        } else if (o.t === 'powerup') {
          if (!o.d) {
            o.d = 1;
            sounds.playPowerup();
            if (o.pType) {
              this.activePowerups[o.pType] = 10;
            }
            const pX = this.r.W / 2 + this.px * this.r.LW;
            const pY = this.r.base - 80;
            this.particles.addCoinBurst(pX, pY);
            this.particles.addFloatingText(`${o.icon} POWER-UP!`, pX, pY - 30, o.color || '#ffd700');
            if (this.onPowerupChange) this.onPowerupChange(this.activePowerups);
          }
        } else if (
          o.t === 'train' ||
          (o.t === 'low' && this.jy < 0.48) ||
          (o.t === 'high' && this.sl <= 0)
        ) {
          this.crash();
        }
      }
    }

    this.objs = this.objs.filter((o) => !o.d && o.z + o.len > -4);
    this.particles.update(dt);
    this.score = this.calculateScore();
    if (this.onScoreUpdate) this.onScoreUpdate(this.score, this.coins);
  }

  draw() {
    const ctx = this.r.ctx;
    ctx.save();
    if (this.shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * 35 * this.shake,
        (Math.random() - 0.5) * 35 * this.shake
      );
    }
    this.r.renderScene(this.dist, this.t);
    this.objs.sort((a, b) => b.z - a.z);
    for (const o of this.objs) this.r.renderObject(o, this.t);
    this.r.renderPlayer(
      this.px,
      this.jy,
      this.sl,
      this.run,
      this.character,
      this.activePowerups.hoverboard,
      this.activePowerups.boots > 0
    );
    this.particles.draw(ctx);
    ctx.restore();
  }
}
