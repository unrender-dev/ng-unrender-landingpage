import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';

import { I18nService } from '../../i18n/i18n.service';
import { I18N, SobreKey } from './sobre.i18n';

/** Partícula da constelação de fundo. Velocidades em px/s. */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Empurrão do ponteiro, que decai sozinho (evita o "teleporte" de 5 px por quadro). */
  px: number;
  py: number;
  size: number;
  /** Instante de criação: a partícula nova entra com fade em vez de aparecer de uma vez. */
  born: number;
}

interface Valor {
  icon: string;
  title: SobreKey;
  itens: { icon: string; text: SobreKey }[];
}

interface Slide {
  id: string;
  src: string;
  caption: SobreKey;
  alt: SobreKey;
  /** Captura real do sistema ou ilustração de produto (deixa claro o que é cada imagem). */
  kind: 'real' | 'illustration';
}

/** Motivos independentes para a vitrine ficar parada; ela só anda quando nenhum está ativo. */
type Pausa = 'hover' | 'focus' | 'user' | 'offscreen';

const PARTICLE_RGB = '79, 96, 123'; // #4f607b, pontos da constelação do Hero Cube
const LINE_RGB = '42, 58, 82'; // #2a3a52, linhas da constelação do Hero Cube

@Component({
  selector: 'app-sobre',
  standalone: true,
  imports: [],
  templateUrl: './sobre.html',
  styleUrl: './sobre.scss',
})
export class Sobre implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly zone = inject(NgZone);

  @ViewChild('particleCanvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('hero', { static: true }) private heroRef!: ElementRef<HTMLElement>;
  @ViewChild('showcase', { static: true }) private showcaseRef!: ElementRef<HTMLElement>;

  readonly valores: readonly Valor[] = [
    {
      icon: 'fa-brain',
      title: 'v1Title',
      itens: [
        { icon: 'fa-people-carry-box', text: 'v1a' },
        { icon: 'fa-lightbulb', text: 'v1b' },
        { icon: 'fa-book', text: 'v1c' },
      ],
    },
    {
      icon: 'fa-rocket',
      title: 'v2Title',
      itens: [
        { icon: 'fa-screwdriver-wrench', text: 'v2a' },
        { icon: 'fa-code', text: 'v2b' },
        { icon: 'fa-chart-line', text: 'v2c' },
      ],
    },
  ];

  // --- Vitrine ---
  // Só capturas reais do SGA CTRLB; a frente de caixa ainda não tem captura, então entra
  // como ilustração de produto, rotulada como tal.
  readonly slides: readonly Slide[] = [
    { id: 'dashboard', src: '/images/real-screens/dashboard-live-dark.png', caption: 's1', alt: 's1Alt', kind: 'real' },
    { id: 'atendimento', src: '/images/real-screens/conversas-live-dark.png', caption: 's2', alt: 's2Alt', kind: 'real' },
    { id: 'crm', src: '/images/real-screens/crm-live-dark.png', caption: 's3', alt: 's3Alt', kind: 'real' },
    { id: 'documentos', src: '/images/real-screens/ia-documento-previa.png', caption: 's4', alt: 's4Alt', kind: 'real' },
    { id: 'infra', src: '/images/real-screens/metricas-sistema-live-dark.png', caption: 's5', alt: 's5Alt', kind: 'real' },
    { id: 'pdv', src: '/images/produtos/pos-kit-turnkey-completo.svg', caption: 's6', alt: 's6Alt', kind: 'illustration' },
  ];

  readonly currentSlide = signal(0);
  /** Slides cuja imagem já pode baixar: o atual e o seguinte, para o fade nunca mostrar quadro vazio. */
  private readonly armed = signal<ReadonlySet<number>>(new Set([0, 1]));
  private readonly pausas = signal<ReadonlySet<Pausa>>(new Set());
  readonly paused = computed(() => this.pausas().size > 0);
  readonly userPaused = computed(() => this.pausas().has('user'));
  readonly reducedMotion = signal(false);

  private swipeStartX: number | null = null;

  // --- Partículas ---
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private width = 0;
  private height = 0;
  private frameId = 0;
  private lastTime = 0;
  private heroVisible = true;
  private readonly pointer = { x: 0, y: 0, active: false };
  private resizeObserver?: ResizeObserver;
  private heroObserver?: IntersectionObserver;
  private showcaseObserver?: IntersectionObserver;
  private motionQuery?: MediaQueryList;

  private readonly onPointerMove = (event: PointerEvent) => {
    // Só mouse/caneta: no toque o dedo está rolando a página, não "empurrando" pontos.
    if (event.pointerType === 'touch') return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.pointer.x = event.clientX - rect.left;
    this.pointer.y = event.clientY - rect.top;
    this.pointer.active = true;
  };
  private readonly onPointerLeave = () => (this.pointer.active = false);
  private readonly onVisibility = () => this.syncLoop();
  private readonly onMotionChange = () => {
    this.zone.run(() => this.reducedMotion.set(!!this.motionQuery?.matches));
    this.syncLoop();
  };

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;

    this.motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.reducedMotion.set(!!this.motionQuery?.matches);
    this.motionQuery?.addEventListener?.('change', this.onMotionChange);

    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    const hero = this.heroRef.nativeElement;

    this.zone.runOutsideAngular(() => {
      hero.addEventListener('pointermove', this.onPointerMove, { passive: true });
      hero.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
      document.addEventListener('visibilitychange', this.onVisibility);

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
        this.resizeObserver.observe(hero);
      }
      if (typeof IntersectionObserver !== 'undefined') {
        this.heroObserver = new IntersectionObserver((entries) => {
          this.heroVisible = entries.some((e) => e.isIntersecting);
          this.syncLoop();
        });
        this.heroObserver.observe(hero);

        this.showcaseObserver = new IntersectionObserver(
          (entries) => {
            const visible = entries.some((e) => e.isIntersecting);
            this.zone.run(() => this.setPause('offscreen', !visible));
          },
          { threshold: 0.25 },
        );
        this.showcaseObserver.observe(this.showcaseRef.nativeElement);
      }

      this.resizeCanvas();
      this.syncLoop();
    });
  }

  // --- Vitrine: a troca automática é guiada pela animação CSS do indicador ativo ---
  // (o `animationend` da barra de progresso chama `onProgressEnd`). Assim a barra e a troca
  // nunca saem de sincronia e pausar é só `animation-play-state: paused`, sem timers.

  onProgressEnd(index: number): void {
    if (index === this.currentSlide()) this.goTo(index + 1);
  }

  goTo(index: number): void {
    const total = this.slides.length;
    const next = ((index % total) + total) % total;
    this.armed.update((set) => new Set(set).add(next).add((next + 1) % total));
    this.currentSlide.set(next);
  }

  isArmed(index: number): boolean {
    return this.armed().has(index);
  }

  setPause(reason: Pausa, on: boolean): void {
    if (this.pausas().has(reason) === on) return;
    this.pausas.update((set) => {
      const next = new Set(set);
      if (on) next.add(reason);
      else next.delete(reason);
      return next;
    });
  }

  toggleUserPause(): void {
    this.setPause('user', !this.userPaused());
  }

  onFocusOut(event: FocusEvent): void {
    const root = event.currentTarget as HTMLElement;
    if (!root.contains(event.relatedTarget as Node | null)) this.setPause('focus', false);
  }

  onDotsKeydown(event: KeyboardEvent): void {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    this.goTo(this.currentSlide() + delta);
    const dots = (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('.dot');
    dots[this.currentSlide()]?.focus();
  }

  onSwipeStart(event: PointerEvent): void {
    this.swipeStartX = event.pointerType === 'mouse' ? null : event.clientX;
  }

  onSwipeCancel(): void {
    this.swipeStartX = null;
  }

  onSwipeEnd(event: PointerEvent): void {
    if (this.swipeStartX === null) return;
    const dx = event.clientX - this.swipeStartX;
    this.swipeStartX = null;
    if (Math.abs(dx) > 40) this.goTo(this.currentSlide() + (dx < 0 ? 1 : -1));
  }

  // --- Partículas ---

  /** Ajusta o canvas ao tamanho real da seção (DPR ≤ 2) sem recriar a constelação. */
  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const hero = this.heroRef.nativeElement;
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    if (!this.ctx || !width || !height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Redimensionar (ex.: barra de endereço do celular aparecendo) reposiciona as partículas
    // em proporção em vez de sortear tudo de novo: nada "pisca" nem reinicia.
    if (this.width && this.height) {
      const sx = width / this.width;
      const sy = height / this.height;
      for (const p of this.particles) {
        p.x *= sx;
        p.y *= sy;
      }
    }
    this.width = width;
    this.height = height;

    const now = performance.now();
    const target = Math.max(24, Math.min(170, Math.round((width * height) / 9000)));
    const first = this.particles.length === 0;
    while (this.particles.length < target) this.particles.push(this.createParticle(first ? -Infinity : now));
    if (this.particles.length > target) this.particles.length = target;

    // Mudar o tamanho do canvas apaga o conteúdo: redesenha já, para não pintar um quadro em branco
    // (e para manter o quadro estático quando o loop está parado por movimento reduzido).
    this.draw(now);
  }

  private createParticle(born: number): Particle {
    const size = Math.random() * 3 + 2;
    return {
      x: size + Math.random() * Math.max(1, this.width - size * 2),
      y: size + Math.random() * Math.max(1, this.height - size * 2),
      vx: (Math.random() - 0.5) * 24,
      vy: (Math.random() - 0.5) * 24,
      px: 0,
      py: 0,
      size,
      born,
    };
  }

  /** Liga/desliga o loop conforme visibilidade, aba ativa e preferência de movimento. */
  private syncLoop(): void {
    const shouldRun = !!this.ctx && this.heroVisible && !document.hidden && !this.motionQuery?.matches;
    if (shouldRun && !this.frameId) {
      this.lastTime = performance.now();
      this.frameId = requestAnimationFrame(this.tick);
    } else if (!shouldRun && this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
    if (!shouldRun && this.ctx) this.draw(performance.now());
  }

  private readonly tick = (now: number) => {
    // dt limitado: ao voltar de uma pausa a constelação continua de onde parou, sem salto.
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.step(dt);
    this.draw(now);
    this.frameId = requestAnimationFrame(this.tick);
  };

  private step(dt: number): void {
    const { width, height, pointer } = this;
    const radius = Math.max(70, Math.min(150, Math.sqrt(width * height) / 9));
    const decay = Math.exp(-3 * dt);

    for (const p of this.particles) {
      if (pointer.active) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < radius * radius) {
          const dist = Math.sqrt(dist2) || 1;
          const force = (1 - dist / radius) * 900;
          p.px += (dx / dist) * force * dt;
          p.py += (dy / dist) * force * dt;
        }
      }
      p.px *= decay;
      p.py *= decay;
      p.x += (p.vx + p.px) * dt;
      p.y += (p.vy + p.py) * dt;

      if (p.x < 0) {
        p.x = 0;
        p.vx = Math.abs(p.vx);
        p.px = Math.abs(p.px);
      } else if (p.x > width) {
        p.x = width;
        p.vx = -Math.abs(p.vx);
        p.px = -Math.abs(p.px);
      }
      if (p.y < 0) {
        p.y = 0;
        p.vy = Math.abs(p.vy);
        p.py = Math.abs(p.py);
      } else if (p.y > height) {
        p.y = height;
        p.vy = -Math.abs(p.vy);
        p.py = -Math.abs(p.py);
      }
    }
  }

  private draw(now: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width, height, particles } = this;
    ctx.clearRect(0, 0, width, height);

    // A linha some aos poucos até a distância limite (opacidade 0 no limite): não "pipoca".
    const link = Math.max(80, Math.min(150, Math.sqrt(width * height) / 7));
    const link2 = link * link;
    const alphas = particles.map((p) => Math.min(1, (now - p.born) / 800));

    ctx.lineWidth = 1;
    for (let a = 0; a < particles.length; a++) {
      const pa = particles[a];
      for (let b = a + 1; b < particles.length; b++) {
        const pb = particles[b];
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 >= link2) continue;
        const opacity = (1 - dist2 / link2) * Math.min(alphas[a], alphas[b]);
        ctx.strokeStyle = `rgba(${LINE_RGB}, ${opacity.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.fillStyle = `rgba(${PARTICLE_RGB}, ${alphas[i].toFixed(3)})`;
      ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    }
  }

  ngOnDestroy(): void {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.resizeObserver?.disconnect();
    this.heroObserver?.disconnect();
    this.showcaseObserver?.disconnect();
    this.motionQuery?.removeEventListener?.('change', this.onMotionChange);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility);
    const hero = this.heroRef?.nativeElement;
    hero?.removeEventListener('pointermove', this.onPointerMove);
    hero?.removeEventListener('pointerleave', this.onPointerLeave);
    this.particles = [];
    this.ctx = null;
  }
}
