import { NgZone } from '@angular/core';

/**
 * Laço de simulação das demos de infraestrutura.
 *
 * - Roda fora da NgZone, com `requestAnimationFrame`.
 * - O tempo `t` é contínuo e só avança enquanto a demo está visível: pausar
 *   (fora da viewport ou aba oculta) não provoca salto quando ela volta.
 * - Com `prefers-reduced-motion`, não há laço: a simulação é adiantada alguns
 *   segundos de uma vez e fica parada em um estado representativo.
 */
export class SimLoop {
  readonly reduced: boolean;
  private raf = 0;
  private last = 0;
  private t = 0;
  private visible = true;
  private destroyed = false;
  private io?: IntersectionObserver;
  private readonly onVisibility = () => this.sync();

  constructor(
    private readonly host: HTMLElement,
    private readonly zone: NgZone,
    private readonly frame: (t: number, dt: number) => void,
    /** Segundos simulados de uma vez quando o movimento está reduzido. */
    private readonly warmup = 8,
  ) {
    this.reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  start(): void {
    if (typeof window === 'undefined' || this.destroyed) return;
    if (this.reduced) {
      // Fora do ciclo de detecção de mudanças em curso (start() costuma vir de ngAfterViewInit).
      this.zone.runOutsideAngular(() => {
        this.raf = requestAnimationFrame(() => {
          this.raf = 0;
          const step = 0.1;
          for (let i = 0; i < this.warmup / step && !this.destroyed; i++) {
            this.t += step;
            this.frame(this.t, step);
          }
        });
      });
      return;
    }
    this.zone.runOutsideAngular(() => {
      if ('IntersectionObserver' in window) {
        this.visible = false;
        this.io = new IntersectionObserver(
          (entries) => {
            this.visible = entries[entries.length - 1].isIntersecting;
            this.sync();
          },
          { rootMargin: '150px' },
        );
        this.io.observe(this.host);
      }
      document.addEventListener('visibilitychange', this.onVisibility);
      this.sync();
    });
  }

  /** Tempo de simulação atual, em segundos. */
  now(): number {
    return this.t;
  }

  /** Redesenha o quadro atual sem avançar o tempo (ex.: troca de idioma ou de tamanho). */
  redraw(): void {
    if (!this.destroyed) this.frame(this.t, 0);
  }

  destroy(): void {
    this.destroyed = true;
    this.io?.disconnect();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibility);
    }
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private sync(): void {
    const run = this.visible && !document.hidden && !this.destroyed;
    if (run && !this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    } else if (!run && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private readonly tick = (now: number) => {
    // Limita o passo: depois de um engasgo o estado avança devagar em vez de saltar.
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.t += dt;
    this.frame(this.t, dt);
    this.raf = requestAnimationFrame(this.tick);
  };
}

/** Aproxima `current` de `target` com suavização exponencial (constante de tempo `tau`, em s). */
export function ease(current: number, target: number, dt: number, tau: number): number {
  return current + (target - current) * (1 - Math.exp(-dt / tau));
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Rampa suave 0→1 entre `a` e `b`. */
export function smoothstep(a: number, b: number, x: number): number {
  const k = clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
}

/** Valor pseudoaleatório determinístico em [0, 1) para o par (n, salt). */
export function hash01(n: number, salt = 0): number {
  let x = Math.imul((n | 0) ^ Math.imul(salt + 1, 0x9e3779b1), 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** Gerador pseudoaleatório com semente (sequência reproduzível, sem repetir padrão visível). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Pt {
  x: number;
  y: number;
}

/** Caminho em segmentos de reta, amostrado por fração do comprimento total. */
export class Polyline {
  readonly length: number;
  private readonly acc: number[] = [0];

  constructor(readonly pts: readonly Pt[]) {
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      this.acc.push(total);
    }
    this.length = total || 1;
  }

  at(fraction: number, out: Pt): Pt {
    const d = clamp(fraction, 0, 1) * this.length;
    let i = 1;
    while (i < this.acc.length - 1 && this.acc[i] < d) i++;
    const a = this.pts[i - 1];
    const b = this.pts[i] ?? a;
    const seg = this.acc[i] - this.acc[i - 1] || 1;
    const k = clamp((d - this.acc[i - 1]) / seg, 0, 1);
    out.x = a.x + (b.x - a.x) * k;
    out.y = a.y + (b.y - a.y) * k;
    return out;
  }

  /** Atributo `points` de um `<polyline>` SVG. */
  toPoints(): string {
    return this.pts.map((p) => `${p.x},${p.y}`).join(' ');
  }
}
