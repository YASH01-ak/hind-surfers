export interface Particle {
  type: 'dust' | 'sparkle' | 'debris' | 'text';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius?: number;
  color?: string;
  alpha: number;
  life: number;
  maxLife: number;
  rot?: number;
  vrot?: number;
  text?: string;
}

export class ParticleSystem {
  public particles: Particle[] = [];

  reset() {
    this.particles = [];
  }

  addDust(x: number, y: number, count = 2, isSlide = false) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'dust',
        x: x + (Math.random() - 0.5) * 24,
        y: y - Math.random() * 4,
        vx: (Math.random() - 0.5) * (isSlide ? 80 : 30),
        vy: -Math.random() * (isSlide ? 50 : 30) - 10,
        radius: Math.random() * (isSlide ? 5 : 3.5) + 2,
        color: Math.random() < 0.5 ? 'rgba(215, 195, 175,' : 'rgba(180, 160, 150,',
        alpha: 0.6,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.35 + Math.random() * 0.2
      });
    }
  }

  addCoinBurst(x: number, y: number) {
    const colors = ['#ffd700', '#ff9933', '#ffffff', '#ffeb3b'];
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 140;
      this.particles.push({
        type: 'sparkle',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.45 + Math.random() * 0.25
      });
    }
  }

  addCrashExplosion(x: number, y: number) {
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 280;
      this.particles.push({
        type: 'debris',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        radius: 3 + Math.random() * 5,
        color: ['#ff9933', '#ffffff', '#1f5fa8', '#a3342f', '#f59e0b'][Math.floor(Math.random() * 5)],
        alpha: 1,
        life: 0.7 + Math.random() * 0.4,
        maxLife: 0.7 + Math.random() * 0.4,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 10
      });
    }
  }

  addFloatingText(text: string, x: number, y: number, color = '#ffd700') {
    this.particles.push({
      type: 'text',
      text,
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: -90,
      alpha: 1,
      color,
      life: 0.75,
      maxLife: 0.75
    });
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'debris') {
        p.vy += 380 * dt;
        if (p.rot !== undefined && p.vrot !== undefined) {
          p.rot += p.vrot * dt;
        }
      } else if (p.type === 'dust' && p.radius) {
        p.radius *= (1 + 0.6 * dt);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.particles) {
      if (p.type === 'dust') {
        ctx.fillStyle = (p.color || 'rgba(200,200,200,') + (p.alpha * 0.5) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius || 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sparkle') {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color || '#ffd700';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius || 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'debris') {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = p.color || '#ff9933';
        const r = p.radius || 4;
        ctx.fillRect(-r, -r, r * 2, r * 1.5);
        ctx.restore();
      } else if (p.type === 'text' && p.text) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color || '#ffd700';
        ctx.font = '800 22px "Titan One", "Baloo 2", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 8;
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      }
    }
    ctx.restore();
  }
}
