import { Character, GameObject } from './types';

export class GameRenderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public W = 0;
  public H = 0;
  public hz = 0;
  public base = 0;
  public LW = 0;
  public F = 14;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.resize();
  }

  resize() {
    const r = window.devicePixelRatio || 1;
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = this.W * r;
    this.canvas.height = this.H * r;
    this.ctx.setTransform(r, 0, 0, r, 0, 0);
    this.hz = this.H * 0.36;
    this.base = this.H * 0.86;
    this.LW = Math.min(this.W * 0.32, this.H * 0.27);
  }

  S(z: number): number {
    return this.F / (this.F + z);
  }

  Y(z: number): number {
    return this.hz + (this.base - this.hz) * this.S(z);
  }

  X(lane: number, z: number): number {
    return this.W / 2 + lane * this.LW * this.S(z);
  }

  poly(...coords: number[]) {
    this.ctx.beginPath();
    this.ctx.moveTo(coords[0], coords[1]);
    for (let i = 2; i < coords.length; i += 2) {
      this.ctx.lineTo(coords[i], coords[i + 1]);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  circle(x: number, y: number, r: number) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, Math.max(r, 0), 0, Math.PI * 2);
    this.ctx.fill();
  }

  renderScene(dist: number, t: number) {
    const ctx = this.ctx;
    const W = this.W, H = this.H, hz = this.hz, LW = this.LW;

    // Sunset Sky (Desi Sunset: Deep Twilight Purple -> Saffron Orange -> Golden Glow)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, hz);
    skyGrad.addColorStop(0, '#260a45');
    skyGrad.addColorStop(0.45, '#b92b53');
    skyGrad.addColorStop(0.8, '#f57c32');
    skyGrad.addColorStop(1, '#ffc04d');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-40, -40, W + 80, hz + 50);

    // Glowing Indian Sun
    const sunX = W * 0.5 + Math.sin(t * 0.1) * 30;
    const sunY = hz * 0.85;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, LW * 1.4);
    sunGlow.addColorStop(0, '#fff4cc');
    sunGlow.addColorStop(0.3, '#ffcc44');
    sunGlow.addColorStop(0.7, 'rgba(255, 120, 40, 0.4)');
    sunGlow.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = sunGlow;
    this.circle(sunX, sunY, LW * 1.4);

    // Flying Indian Kites (Patang in the sunset sky)
    const kiteColors = ['#138808', '#ffffff', '#ff9933', '#e11d48'];
    for (let i = 0; i < 4; i++) {
      const kx = W * (0.15 + 0.24 * i) + Math.sin(t * 0.7 + i * 2) * 22;
      const ky = hz * (0.18 + 0.22 * ((i * 2) % 3)) + Math.sin(t * 1.1 + i) * 10;
      ctx.fillStyle = kiteColors[i % kiteColors.length];
      this.poly(kx, ky - 13, kx + 9, ky, kx, ky + 13, kx - 9, ky);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(kx, ky + 13);
      ctx.quadraticCurveTo(kx + 6, ky + 25, kx - 4, ky + 36);
      ctx.stroke();
    }

    // Ground / Railway Yard
    const groundGrad = ctx.createLinearGradient(0, hz, 0, H);
    groundGrad.addColorStop(0, '#352140');
    groundGrad.addColorStop(0.3, '#21162d');
    groundGrad.addColorStop(1, '#110a1b');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(-40, hz, W + 80, H - hz + 50);

    this.renderSideStructures(dist);

    // Track Ballast Bed (Gravel)
    const ballastGrad = ctx.createLinearGradient(0, hz, 0, H);
    ballastGrad.addColorStop(0, '#5f5564');
    ballastGrad.addColorStop(0.4, '#3e3743');
    ballastGrad.addColorStop(1, '#201d24');
    ctx.fillStyle = ballastGrad;
    this.poly(
      this.X(-2.2, 320), this.Y(320),
      this.X(2.2, 320), this.Y(320),
      this.X(2.2, -6), this.Y(-6),
      this.X(-2.2, -6), this.Y(-6)
    );

    // Concrete Sleepers (Track Ties)
    for (let k = 0; k < 48; k++) {
      const zz = k * 2.5 - (dist % 2.5);
      if (zz < -5) continue;
      const s = this.S(zz);
      const sx = this.X(-1.75, zz);
      const sy = this.Y(zz) - 0.1 * LW * s;
      const sw = 3.5 * LW * s;
      const sh = 0.12 * LW * s;

      ctx.fillStyle = '#7a7079';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(sx, sy + sh * 0.75, sw, sh * 0.25);
    }

    // 3 Railway Lanes with Shiny Steel Rails
    const lanes = [-1, 0, 1];
    for (const lane of lanes) {
      for (const railOffset of [-0.24, 0.24]) {
        // Base rail shadow
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#1b1920';
        ctx.beginPath();
        ctx.moveTo(this.X(lane + railOffset, 300), this.Y(300));
        ctx.lineTo(this.X(lane + railOffset, -6), this.Y(-6));
        ctx.stroke();

        // Top shiny rail highlight
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(this.X(lane + railOffset, 300), this.Y(300) - 1.5);
        ctx.lineTo(this.X(lane + railOffset, -6), this.Y(-6) - 2);
        ctx.stroke();
      }
    }

    // Overhead Electric Traction Masts (OHE Masts with Yellow Lanterns)
    for (let k = 12; k >= 0; k--) {
      const zz = k * 14 - (dist % 14);
      if (zz < -5) continue;
      const s = this.S(zz);
      const y = this.Y(zz);
      const mastTop = y - 2.8 * LW * s;
      const pWidth = 0.08 * LW * s;

      ctx.fillStyle = '#2d2538';
      for (const side of [-1, 1]) {
        ctx.fillRect(this.X(side * 2.05, zz) - pWidth / 2, mastTop, pWidth, y - mastTop);
      }

      ctx.strokeStyle = '#2d2538';
      ctx.lineWidth = Math.max(1.5, 0.07 * LW * s);
      ctx.beginPath();
      ctx.moveTo(this.X(-2.05, zz), mastTop + 0.15 * LW * s);
      ctx.lineTo(this.X(2.05, zz), mastTop + 0.15 * LW * s);
      ctx.stroke();

      ctx.fillStyle = '#ffd15c';
      for (const lane of lanes) {
        this.circle(this.X(lane, zz), mastTop + 0.22 * LW * s, 0.045 * LW * s);
      }
    }
  }

  renderSideStructures(dist: number) {
    const ctx = this.ctx;
    const LW = this.LW;
    const pal = ['#e8a33d', '#d9527a', '#2fa4a1', '#e67e5a', '#8a63d2', '#f2c14e'];

    for (let k = 22; k >= 0; k--) {
      const zz = k * 8 - (dist % 8);
      if (zz < -5) continue;
      const idx = Math.floor(dist / 8) + k;

      for (const sd of [-1, 1]) {
        const hash = Math.imul(idx * 2 + (sd > 0 ? 1 : 0), 2654435761) >>> 0;
        const s = this.S(zz);
        const bw = (1.4 + ((hash >> 3) & 3) * 0.3) * LW * s;
        const bh = (1.8 + ((hash >> 5) & 7) * 0.35) * LW * s;
        const x = this.X(sd * 2.85, zz);
        const y = this.Y(zz);

        ctx.fillStyle = pal[(hash >> 8) % pal.length];
        ctx.fillRect(x - bw / 2, y - bh, bw, bh);

        // Indian arch dome roof
        if (hash & 1) {
          ctx.beginPath();
          ctx.arc(x, y - bh, bw / 2, Math.PI, 0);
          ctx.fill();
        }

        // Windows
        ctx.fillStyle = 'rgba(20, 10, 40, 0.6)';
        const winW = bw * 0.18;
        const winH = bh * 0.22;
        ctx.fillRect(x - bw * 0.32, y - bh * 0.72, winW, winH);
        ctx.fillRect(x + bw * 0.14, y - bh * 0.72, winW, winH);
      }
    }
  }

  renderTrain(o: GameObject) {
    const ctx = this.ctx;
    const LW = this.LW;
    const z = Math.max(o.z, 0.2);
    const s = this.S(z);
    const x = this.X(o.l, z);
    const y = this.Y(z);
    const w = LW * 0.88 * s;
    const h = LW * 1.62 * s;
    const z2 = z + o.len;
    const s2 = this.S(z2);
    const y2 = this.Y(z2);
    const h2 = LW * 1.62 * s2;

    const isVandeBharat = o.trainType === 'vande_bharat';
    const bodyColor = isVandeBharat ? '#f3f4f6' : (o.c ? '#a3342f' : '#1f5fa8');
    const sideColor = isVandeBharat ? '#e5e7eb' : (o.c ? '#7d2622' : '#174a84');
    const roofColor = isVandeBharat ? '#cbd5e1' : (o.c ? '#c9c2d6' : '#b9d0e8');
    const stripeColor = isVandeBharat ? '#2563eb' : '#ff9933';

    // 3D Side Perspective
    if (o.l !== 0) {
      const e = o.l < 0 ? 1 : -1;
      const xe = x + e * w / 2;
      const xf = this.X(o.l + e * 0.44, z2);
      ctx.fillStyle = sideColor;
      this.poly(xe, y, xe, y - h, xf, y2 - h2, xf, y2);
    }

    // 3D Roof
    ctx.fillStyle = roofColor;
    this.poly(
      x - w / 2, y - h,
      x + w / 2, y - h,
      this.X(o.l + 0.44, z2), y2 - h2,
      this.X(o.l - 0.44, z2), y2 - h2
    );

    // Front Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.65, w * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Front Carriage Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x - w / 2, y - h, w, h);

    // Saffron or Blue Train Stripe
    ctx.fillStyle = stripeColor;
    ctx.fillRect(x - w / 2, y - h * 0.36, w, h * 0.1);

    // Front Windshield
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - w * 0.4, y - h * 0.92, w * 0.8, h * 0.36);

    // Train Nameplate
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(6, 9 * s)}px "Titan One", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(isVandeBharat ? 'VANDE BHARAT' : 'INDIAN RAILWAYS', x, y - h * 0.42);

    // Dual High-beam Lights
    const lightY = y - h * 0.18;
    const lx1 = x - w * 0.28;
    const lx2 = x + w * 0.28;

    ctx.fillStyle = '#fffae0';
    this.circle(lx1, lightY, w * 0.08);
    this.circle(lx2, lightY, w * 0.08);
  }

  renderObject(o: GameObject, t: number) {
    const ctx = this.ctx;
    const LW = this.LW;
    ctx.globalAlpha = o.z > 58 ? Math.max(0, (72 - o.z) / 14) : 1;
    const s = this.S(o.z);
    const x = this.X(o.l, o.z);
    const y = this.Y(o.z);

    if (o.t === 'train') {
      this.renderTrain(o);
    } else if (o.t === 'low') {
      // Low barrier: Jump over!
      const w = LW * 0.88 * s;
      const h = LW * 0.52 * s;
      ctx.fillStyle = '#374151';
      ctx.fillRect(x - w * 0.46, y - h, w * 0.09, h);
      ctx.fillRect(x + w * 0.37, y - h, w * 0.09, h);

      const n = 6;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i % 2 ? '#ef4444' : '#ffffff';
        ctx.fillRect(x - w / 2 + (i * w) / n, y - h, w / n, h * 0.55);
      }
    } else if (o.t === 'high') {
      // High overhead barrier: Slide under!
      const w = LW * 0.88 * s;
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - w * 0.5, y - LW * 1.35 * s, w * 0.08, LW * 1.35 * s);
      ctx.fillRect(x + w * 0.42, y - LW * 1.35 * s, w * 0.08, LW * 1.35 * s);

      const n = 6;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i % 2 ? '#0f172a' : '#f59e0b';
        ctx.fillRect(x - w / 2 + (i * w) / n, y - LW * 1.25 * s, w / n, LW * 0.38 * s);
      }
    } else if (o.t === 'powerup') {
      // Power-up orb
      const r = 0.28 * LW * s;
      const cy = y - 0.7 * LW * s + Math.sin(t * 5 + o.z) * 4;
      ctx.fillStyle = o.color || '#ff9933';
      this.circle(x, cy, r * 1.15);
      ctx.fillStyle = '#1e1138';
      this.circle(x, cy, r * 0.9);
      ctx.font = `${Math.max(12, r * 1.15)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.icon || '⭐', x, cy);
    } else {
      // Gold Rupee Coin (₹) with 3D Spin
      const r = 0.19 * LW * s;
      const cy = y - 0.58 * LW * s;
      const spinScale = 0.5 + 0.5 * Math.abs(Math.cos(t * 5 + o.z));

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.8, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      const coinGrad = ctx.createLinearGradient(x - r, cy, x + r, cy);
      coinGrad.addColorStop(0, '#ffd700');
      coinGrad.addColorStop(0.5, '#fff07a');
      coinGrad.addColorStop(1, '#e5a50a');
      ctx.fillStyle = coinGrad;
      ctx.beginPath();
      ctx.ellipse(x, cy, r * spinScale, r, 0, 0, Math.PI * 2);
      ctx.fill();

      if (spinScale > 0.4) {
        ctx.fillStyle = '#6b4700';
        ctx.font = `800 ${Math.max(8, r * 1.25)}px "Baloo 2", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₹', x, cy + r * 0.05);
      }
    }
    ctx.globalAlpha = 1;
  }

  renderPlayer(
    px: number,
    jy: number,
    sl: number,
    run: number,
    charConfig: Character,
    hasShield: boolean,
    hasBoots: boolean
  ) {
    const ctx = this.ctx;
    const u = this.LW;
    const x = this.W / 2 + px * u;
    const y = this.base - jy * u;
    const sw = jy > 0 ? 0.28 : Math.sin(run * 6) * 0.32;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, this.base, 0.32 * u * (1 - Math.min(0.7, jy * 0.35)), 0.08 * u, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tejas Hoverboard Shield Platform
    if (hasShield) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.ellipse(x, y + 0.02 * u, 0.35 * u, 0.09 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(x, y);

    // Slide rotation
    if (sl > 0) {
      ctx.rotate(-1.2);
      ctx.translate(0.12 * u, 0);
    }

    // Legs
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.14 * u;
    ctx.strokeStyle = charConfig.pantColor || '#f3efe4';

    this.drawLeg(-0.09, sw, u, hasBoots);
    this.drawLeg(0.09, -sw, u, hasBoots);

    // Arms
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 0.1 * u;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * 0.22 * u, -0.95 * u);
      ctx.lineTo(sd * 0.24 * u + sd * sw * 0.38 * u, -0.62 * u);
      ctx.stroke();
    }

    // Shirt / Kurta
    ctx.fillStyle = charConfig.shirtColor || '#ff9933';
    ctx.beginPath();
    ctx.roundRect(-0.21 * u, -1.04 * u, 0.42 * u, 0.58 * u, 0.1 * u);
    ctx.fill();

    // Head
    ctx.fillStyle = '#c98d5a';
    this.circle(0, -1.2 * u, 0.16 * u);

    // Cap / Turban
    ctx.fillStyle = charConfig.capColor || '#138808';
    ctx.beginPath();
    ctx.ellipse(0, -1.31 * u, 0.19 * u, 0.11 * u, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cap Visor
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-0.19 * u, -1.33 * u, 0.38 * u, 0.035 * u);

    ctx.restore();
  }

  drawLeg(cx: number, d: number, u: number, hasBoots: boolean) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(cx * u, -0.5 * u);
    ctx.lineTo((cx + d) * u, -0.06 * u);
    ctx.stroke();

    ctx.fillStyle = hasBoots ? '#22c55e' : '#2a1a10';
    this.circle((cx + d) * u, -0.05 * u, hasBoots ? 0.095 * u : 0.08 * u);
  }
}
