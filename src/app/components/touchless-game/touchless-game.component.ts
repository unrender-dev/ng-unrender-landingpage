import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CameraService } from '../../services/camera.service';
import { CAMERA_I18N, CameraTextKey, cameraErrorKey } from '../../services/camera.i18n';
import { I18nService } from '../../i18n/i18n.service';
import { I18N } from './touchless-game.i18n';

/**
 * Caça-Bolhas sem toque: o jogador estoura bolhas acenando para a câmera.
 *
 * Não usa modelo de IA: compara cada quadro da câmera com o anterior numa grade
 * de baixa resolução (detecção de movimento). Funciona em qualquer webcam ou
 * celular, sem download, e é a mesma técnica dos nossos games de ativação em
 * totens. Sem câmera, dá para jogar com o mouse ou o dedo.
 */

type Phase = 'idle' | 'starting' | 'ready' | 'playing' | 'over' | 'error';
type Mode = 'camera' | 'pointer';
type Kind = 'orb' | 'star' | 'bomb';

interface Target {
  kind: Kind;
  /** Centro, normalizado (0–1) na largura/altura do palco. */
  x: number;
  y: number;
  /** Raio, proporcional ao menor lado do palco. */
  r: number;
  born: number;
  life: number;
  /** Movimento acumulado sobre o alvo; estoura em 1. */
  charge: number;
  wobble: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

const ROUND_MS = 30_000;
const COUNTDOWN_MS = 3_000;
const BEST_KEY = 'unrender.touchless.best';
/** Largura da grade de análise de movimento (a altura segue a proporção do palco). */
const GRID_W = 96;
/** Diferença de brilho (0–255) para um ponto contar como movimento. */
const DIFF_THRESHOLD = 30;
/** Acima desta fração de pontos em movimento o quadro é ignorado (câmera ajustando exposição ou balançando). */
const GLOBAL_NOISE = 0.45;
const ORANGE = '#f99126';

const KIND_SPEC: Record<Kind, { r: number; life: number; points: number }> = {
  orb: { r: 0.11, life: 2800, points: 10 },
  star: { r: 0.085, life: 1700, points: 25 },
  bomb: { r: 0.1, life: 3200, points: -15 },
};

type ErrorRef = { key: CameraTextKey };

type WebkitDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };

/** Elemento em tela cheia, com o prefixo do Safari antigo (iPad/macOS). */
function fullscreenElement(): Element | null {
  const doc = document as WebkitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function exitFullscreen(): void {
  const doc = document as WebkitDocument;
  if (doc.exitFullscreen) void doc.exitFullscreen().catch(() => undefined);
  else doc.webkitExitFullscreen?.();
}

/** Teto de pixels do canvas: em telas 4K com DPR alto o desenho por quadro pesaria sem ganho visível. */
const MAX_CANVAS_PIXELS = 2_400_000;

@Component({
  selector: 'app-touchless-game',
  standalone: true,
  templateUrl: './touchless-game.component.html',
  styleUrls: ['./touchless-game.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TouchlessGameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('stage', { static: true }) stageRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('video', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;

  private readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  readonly ct = this.i18n.scope(CAMERA_I18N);
  private readonly zone = inject(NgZone);
  private readonly camera = inject(CameraService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly phase = signal<Phase>('idle');
  readonly mode = signal<Mode>('camera');
  readonly error = signal<ErrorRef | null>(null);
  readonly errorText = computed(() => (this.error() ? this.ct(this.error()!.key) : ''));
  readonly score = signal(0);
  readonly secondsLeft = signal(ROUND_MS / 1000);
  readonly countdown = signal(3);
  readonly multiplier = signal(1);
  readonly best = signal(0);
  readonly isNewBest = signal(false);
  readonly stats = signal({ orbs: 0, stars: 0, bombs: 0 });
  readonly muted = signal(false);
  /** Tela cheia nativa (Fullscreen API). */
  readonly isFullscreen = signal(false);
  /** Tela cheia por CSS, para onde a API não existe (Safari do iPhone). */
  readonly pseudoFull = signal(false);
  readonly fullscreenOn = computed(() => this.isFullscreen() || this.pseudoFull());
  readonly bombFlash = signal(false);

  /** Celular/tablet: a instrução de posicionamento fala em apoiar o aparelho. */
  readonly isTouchDevice = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  readonly roundSeconds = ROUND_MS / 1000;
  readonly inGame = computed(() => this.phase() === 'ready' || this.phase() === 'playing');

  private readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Estado do loop (fora do Angular) ──
  private raf = 0;
  private ctx: CanvasRenderingContext2D | null = null;
  private grid: CanvasRenderingContext2D | null = null;
  private gridW = GRID_W;
  private gridH = 60;
  private prevGray: Uint8ClampedArray | null = null;
  private motion: Uint8Array = new Uint8Array(0);
  private width = 0;
  private height = 0;
  private dpr = 1;
  private targets: Target[] = [];
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private phaseStart = 0;
  private nextSpawn = 0;
  private lastPop = 0;
  private combo = 0;
  private runId = 0;
  private cameraHeld = false;
  private pointer = { x: -1, y: -1, moved: false };
  private audio: AudioContext | null = null;
  private shake = 0;

  private io: IntersectionObserver | null = null;
  private ro: ResizeObserver | null = null;
  private readonly onVisibility = () => {
    if (document.hidden && this.phase() !== 'idle') this.zone.run(() => this.stop());
  };
  private readonly onFullscreen = () => this.isFullscreen.set(fullscreenElement() === this.stageRef.nativeElement);
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.pseudoFull()) this.zone.run(() => this.setPseudoFull(false));
  };

  ngAfterViewInit(): void {
    this.best.set(this.readBest());
    if (typeof IntersectionObserver !== 'undefined') {
      // Fora da tela, câmera e loop são desligados.
      this.io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting) && this.phase() !== 'idle' && !this.fullscreenOn()) {
          this.zone.run(() => this.stop());
        }
      });
      this.io.observe(this.host.nativeElement);
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.stageRef.nativeElement);
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    document.addEventListener('fullscreenchange', this.onFullscreen);
    document.addEventListener('webkitfullscreenchange', this.onFullscreen);
    document.addEventListener('keydown', this.onKey);
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
    this.ro?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.removeEventListener('fullscreenchange', this.onFullscreen);
    document.removeEventListener('webkitfullscreenchange', this.onFullscreen);
    document.removeEventListener('keydown', this.onKey);
    this.stop();
    void this.audio?.close().catch(() => undefined);
    this.audio = null;
  }

  // ───────────────────────── Controles ─────────────────────────

  async start(mode: Mode): Promise<void> {
    const run = ++this.runId;
    this.mode.set(mode);
    this.error.set(null);
    this.unlockAudio();

    if (mode === 'camera') {
      this.phase.set('starting');
      try {
        if (!this.cameraHeld) {
          const stream = await this.camera.startCamera();
          this.cameraHeld = true;
          const video = this.videoRef.nativeElement;
          // iOS só reproduz sem gesto extra se o vídeo estiver mudo e inline (propriedades, não só atributos).
          video.muted = true;
          video.playsInline = true;
          video.srcObject = stream;
          if (video.readyState < 1) {
            await new Promise<void>((resolve) => video.addEventListener('loadedmetadata', () => resolve(), { once: true }));
          }
          await video.play().catch(() => undefined);
        }
      } catch (err) {
        if (run !== this.runId) return;
        this.releaseCamera();
        this.error.set({ key: cameraErrorKey(CameraService.errorKind(err)) });
        this.phase.set('error');
        return;
      }
      if (run !== this.runId) return;
    } else {
      this.releaseCamera();
    }

    this.resetRound();
    this.phase.set('ready');
    this.phaseStart = performance.now();
    this.resize();
    this.startLoop();
    // Depois que o palco assume o tamanho de jogo, enquadra-o inteiro na tela.
    setTimeout(() => this.revealStage(), 60);
  }

  /**
   * Cabeçalhos fixos da página (navbar, abas no celular) ficam no topo: alinha o
   * palco ao pé da janela para o placar não ficar escondido atrás deles.
   */
  private revealStage(): void {
    if (this.fullscreenOn() || typeof window === 'undefined') return;
    const rect = this.stageRef.nativeElement.getBoundingClientRect();
    const margin = 12;
    const behavior: ScrollBehavior = this.reducedMotion ? 'auto' : 'smooth';
    if (rect.height + margin * 2 <= window.innerHeight) {
      // Cabe: pé do palco no pé da janela (positivo desce, negativo sobe e tira o topo de baixo do cabeçalho).
      const delta = rect.bottom - (window.innerHeight - margin);
      const covered = rect.top < window.innerHeight * 0.3;
      if (delta > 4 || (delta < -4 && covered)) window.scrollBy({ top: delta, behavior });
    } else if (rect.top < 0 || rect.top > window.innerHeight * 0.3) {
      window.scrollBy({ top: rect.top - 80, behavior });
    }
  }

  playAgain(): void {
    void this.start(this.mode());
  }

  stop(): void {
    this.runId++;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.releaseCamera();
    if (this.isFullscreen()) exitFullscreen();
    this.setPseudoFull(false);
    this.targets = [];
    this.particles = [];
    this.floaters = [];
    this.error.set(null);
    this.phase.set('idle');
  }

  toggleMute(): void {
    this.muted.update((m) => !m);
  }

  toggleFullscreen(): void {
    if (this.pseudoFull()) return this.setPseudoFull(false);
    if (fullscreenElement()) return exitFullscreen();
    const stage = this.stageRef.nativeElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    if (document.fullscreenEnabled && stage.requestFullscreen) {
      stage.requestFullscreen().catch(() => this.setPseudoFull(true));
    } else if (stage.webkitRequestFullscreen) {
      stage.webkitRequestFullscreen();
      // A versão prefixada não avisa quando falha: confere e cai na tela cheia por CSS.
      setTimeout(() => {
        if (!fullscreenElement()) this.zone.run(() => this.setPseudoFull(true));
      }, 300);
    } else {
      this.setPseudoFull(true);
    }
  }

  /** Tela cheia por CSS: o palco cobre a janela e a página para de rolar por trás. */
  private setPseudoFull(on: boolean): void {
    if (this.pseudoFull() === on) return;
    const stage = this.stageRef.nativeElement;
    if (on) {
      // Ancestrais com contexto de empilhamento prenderiam o z-index abaixo da navbar:
      // o palco vai para o <body> enquanto durar a tela cheia e depois volta ao lugar.
      this.placeholder = document.createComment('tg-stage');
      stage.parentNode?.insertBefore(this.placeholder, stage);
      document.body.appendChild(stage);
    } else {
      if (this.placeholder?.parentNode) this.placeholder.parentNode.insertBefore(stage, this.placeholder);
      else if (stage.parentNode === document.body) stage.remove(); // o host já saiu da página
      this.placeholder?.remove();
      this.placeholder = null;
    }
    this.pseudoFull.set(on);
    document.body.style.overflow = on ? 'hidden' : '';
  }

  private placeholder: Comment | null = null;

  onPointerMove(event: PointerEvent): void {
    if (this.mode() !== 'pointer') return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.pointer = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      moved: true,
    };
  }

  // ───────────────────────── Loop ─────────────────────────

  private startLoop(): void {
    cancelAnimationFrame(this.raf);
    const run = this.runId;
    this.zone.runOutsideAngular(() => {
      const tick = (now: number) => {
        if (run !== this.runId) return;
        this.frame(now);
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    });
  }

  private frame(now: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.width) return;
    const phase = this.phase();
    // O carimbo do rAF pode ser um pouco anterior ao início da fase.
    const elapsed = Math.max(0, now - this.phaseStart);

    if (phase === 'ready') {
      const left = Math.min(COUNTDOWN_MS / 1000, Math.max(1, Math.ceil((COUNTDOWN_MS - elapsed) / 1000)));
      if (left !== this.countdown()) this.countdown.set(left);
      if (elapsed >= COUNTDOWN_MS) {
        this.phase.set('playing');
        this.phaseStart = now;
        this.nextSpawn = now + 200;
        this.beep(660, 0.12, 'triangle');
      }
    } else if (phase === 'playing') {
      const left = Math.max(0, Math.ceil((ROUND_MS - elapsed) / 1000));
      if (left !== this.secondsLeft()) this.secondsLeft.set(left);
      if (elapsed >= ROUND_MS) {
        this.finish();
        return;
      }
      this.spawn(now, elapsed);
    }

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const W = this.width;
    const H = this.height;
    ctx.save();
    if (this.shake > 0 && !this.reducedMotion) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      this.shake *= 0.85;
      if (this.shake < 0.5) this.shake = 0;
    }

    this.drawBackground(ctx, W, H);
    if (this.mode() === 'camera') {
      this.analyseMotion(W, H);
      this.drawMotion(ctx, W, H);
    } else {
      this.drawPointer(ctx, W, H);
    }

    if (phase === 'playing') this.updateTargets(now);
    this.drawTargets(ctx, W, H, now);
    this.drawEffects(ctx, W, H);
    ctx.restore();
    this.pointer.moved = false;
  }

  private spawn(now: number, elapsed: number): void {
    if (now < this.nextSpawn) return;
    const progress = elapsed / ROUND_MS;
    const maxAlive = 3 + Math.round(progress * 3);
    // O ritmo acelera ao longo da partida.
    this.nextSpawn = now + 900 - progress * 450 + Math.random() * 250;
    if (this.targets.length >= maxAlive) return;

    const roll = Math.random();
    const kind: Kind = roll < 0.14 + progress * 0.08 ? 'bomb' : roll > 0.86 ? 'star' : 'orb';
    const spec = KIND_SPEC[kind];
    const minSide = Math.min(this.width, this.height);
    const rx = (spec.r * minSide) / this.width;
    const ry = (spec.r * minSide) / this.height;
    // Faixa de cima fica livre para o placar (a altura real dele varia com a tela).
    const hud = this.stageRef.nativeElement.querySelector<HTMLElement>('.tg-hud');
    const top = Math.max(0.12, ((hud?.offsetHeight ?? 0) + 8) / this.height) + ry;

    for (let attempt = 0; attempt < 12; attempt++) {
      const x = rx + 0.02 + Math.random() * (1 - 2 * rx - 0.04);
      const y = top + Math.random() * Math.max(0, 1 - top - ry - 0.03);
      const clear = this.targets.every((t) => {
        const dx = (t.x - x) * this.width;
        const dy = (t.y - y) * this.height;
        return Math.hypot(dx, dy) > (t.r + spec.r) * minSide * 1.15;
      });
      if (clear) {
        this.targets.push({ kind, x, y, r: spec.r, born: now, life: spec.life, charge: 0, wobble: Math.random() * Math.PI * 2 });
        return;
      }
    }
  }

  private updateTargets(now: number): void {
    const minSide = Math.min(this.width, this.height);
    const survivors: Target[] = [];
    for (const t of this.targets) {
      const age = now - t.born;
      if (age > t.life) continue; // some sem penalidade
      if (age < 220) {
        survivors.push(t); // ainda surgindo: não estoura no primeiro quadro
        continue;
      }
      const hit = this.mode() === 'camera' ? this.motionIn(t, minSide) : this.pointerIn(t, minSide);
      if (hit > 0) t.charge += hit;
      else t.charge = Math.max(0, t.charge - 0.04);
      if (t.charge >= 1) this.pop(t, now);
      else survivors.push(t);
    }
    this.targets = survivors;
  }

  /** Quanto de movimento há sobre o alvo neste quadro (0 = nada). */
  private motionIn(t: Target, minSide: number): number {
    const gw = this.gridW;
    const gh = this.gridH;
    const cx = t.x * gw;
    const cy = t.y * gh;
    const rr = ((t.r * minSide) / this.width) * gw;
    let inside = 0;
    let moving = 0;
    const x0 = Math.max(0, Math.floor(cx - rr));
    const x1 = Math.min(gw - 1, Math.ceil(cx + rr));
    const y0 = Math.max(0, Math.floor(cy - rr));
    const y1 = Math.min(gh - 1, Math.ceil(cy + rr));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        if (dx * dx + dy * dy > rr * rr) continue;
        inside++;
        moving += this.motion[y * gw + x];
      }
    }
    if (!inside) return 0;
    const ratio = moving / inside;
    // Abaixo de 10% é ruído; um aceno claro estoura em 2–3 quadros.
    return ratio < 0.1 ? 0 : Math.min(0.6, ratio * 1.6);
  }

  private pointerIn(t: Target, minSide: number): number {
    if (!this.pointer.moved || this.pointer.x < 0) return 0;
    const dx = (this.pointer.x - t.x) * this.width;
    const dy = (this.pointer.y - t.y) * this.height;
    return Math.hypot(dx, dy) <= t.r * minSide * 1.1 ? 1 : 0;
  }

  private pop(t: Target, now: number): void {
    const spec = KIND_SPEC[t.kind];
    const px = t.x * this.width;
    const py = t.y * this.height;
    if (t.kind === 'bomb') {
      this.combo = 0;
      this.multiplier.set(1);
      this.score.update((s) => Math.max(0, s + spec.points));
      this.stats.update((s) => ({ ...s, bombs: s.bombs + 1 }));
      this.floaters.push({ x: px, y: py, text: `${spec.points}`, color: '#ff6b6b', life: 1 });
      this.burst(px, py, ['#ff4d4d', '#ffb3b3', '#3a0d12'], 26);
      this.shake = 14;
      this.bombFlash.set(true);
      setTimeout(() => this.bombFlash.set(false), 260);
      this.beep(120, 0.25, 'sawtooth');
      return;
    }

    this.combo = now - this.lastPop < 1500 ? this.combo + 1 : 1;
    this.lastPop = now;
    const mult = Math.min(4, 1 + Math.floor(this.combo / 4));
    if (mult !== this.multiplier()) this.multiplier.set(mult);
    const points = spec.points * mult;
    this.score.update((s) => s + points);
    this.stats.update((s) => (t.kind === 'star' ? { ...s, stars: s.stars + 1 } : { ...s, orbs: s.orbs + 1 }));
    this.floaters.push({ x: px, y: py, text: mult > 1 ? `+${points} ×${mult}` : `+${points}`, color: t.kind === 'star' ? '#ffd166' : '#ffffff', life: 1 });
    this.burst(px, py, t.kind === 'star' ? ['#ffd166', '#fff3c4', ORANGE] : [ORANGE, '#ffd0a1', '#ffffff'], t.kind === 'star' ? 30 : 20);
    this.beep(t.kind === 'star' ? 1046 : 520 + Math.min(this.combo, 10) * 40, 0.09, 'sine');
  }

  private finish(): void {
    this.targets = [];
    const score = this.score();
    const best = this.best();
    const newBest = score > best;
    this.isNewBest.set(newBest && score > 0);
    if (newBest) {
      this.best.set(score);
      this.writeBest(score);
    }
    this.secondsLeft.set(0);
    this.phase.set('over');
    this.beep(784, 0.18, 'triangle');
    setTimeout(() => this.beep(1046, 0.25, 'triangle'), 160);
    // Mantém o loop rodando por um instante para as partículas terminarem; depois desenha só o fundo.
  }

  private resetRound(): void {
    this.targets = [];
    this.particles = [];
    this.floaters = [];
    this.combo = 0;
    this.lastPop = 0;
    this.prevGray = null;
    this.score.set(0);
    this.secondsLeft.set(ROUND_MS / 1000);
    this.countdown.set(3);
    this.multiplier.set(1);
    this.isNewBest.set(false);
    this.stats.set({ orbs: 0, stars: 0, bombs: 0 });
  }

  // ───────────────────────── Câmera e movimento ─────────────────────────

  /** Recorte "cover" do vídeo para a proporção do palco. */
  private coverCrop(W: number, H: number): [number, number, number, number] | null {
    const video = this.videoRef.nativeElement;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh || video.readyState < 2) return null;
    if (vw / vh > W / H) {
      const sw = vh * (W / H);
      return [(vw - sw) / 2, 0, sw, vh];
    }
    const sh = vw * (H / W);
    return [0, (vh - sh) / 2, vw, sh];
  }

  private drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const crop = this.mode() === 'camera' ? this.coverCrop(W, H) : null;
    if (crop) {
      ctx.save();
      // Espelhado: o jogador se vê como num espelho e a mão vai para o lado certo.
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.videoRef.nativeElement, crop[0], crop[1], crop[2], crop[3], 0, 0, W, H);
      ctx.restore();
      ctx.fillStyle = 'rgba(16, 5, 28, 0.32)';
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#1b0b2e');
    g.addColorStop(1, '#10051c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const step = Math.max(32, Math.min(W, H) / 10);
    ctx.beginPath();
    for (let x = step; x < W; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = step; y < H; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
  }

  private analyseMotion(W: number, H: number): void {
    const grid = this.grid;
    const crop = this.coverCrop(W, H);
    if (!grid || !crop) return;
    const gw = this.gridW;
    const gh = this.gridH;
    grid.save();
    grid.translate(gw, 0);
    grid.scale(-1, 1);
    grid.drawImage(this.videoRef.nativeElement, crop[0], crop[1], crop[2], crop[3], 0, 0, gw, gh);
    grid.restore();
    const data = grid.getImageData(0, 0, gw, gh).data;
    const n = gw * gh;
    const gray = new Uint8ClampedArray(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      gray[i] = (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) >> 8;
    }
    const prev = this.prevGray;
    this.prevGray = gray;
    if (!prev || prev.length !== n) {
      this.motion.fill(0);
      return;
    }
    let count = 0;
    for (let i = 0; i < n; i++) {
      const m = Math.abs(gray[i] - prev[i]) > DIFF_THRESHOLD ? 1 : 0;
      this.motion[i] = m;
      count += m;
    }
    if (count / n > GLOBAL_NOISE) this.motion.fill(0);
  }

  private drawMotion(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const gw = this.gridW;
    const gh = this.gridH;
    const cw = W / gw;
    const ch = H / gh;
    const size = Math.max(2, Math.min(cw, ch) * 0.55);
    ctx.fillStyle = 'rgba(249, 145, 38, 0.55)';
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        if (this.motion[y * gw + x]) ctx.fillRect(x * cw + (cw - size) / 2, y * ch + (ch - size) / 2, size, size);
      }
    }
  }

  private drawPointer(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (this.pointer.x < 0) return;
    const r = Math.min(W, H) * 0.035;
    ctx.beginPath();
    ctx.arc(this.pointer.x * W, this.pointer.y * H, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(249, 145, 38, 0.35)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ORANGE;
    ctx.stroke();
  }

  // ───────────────────────── Desenho ─────────────────────────

  private drawTargets(ctx: CanvasRenderingContext2D, W: number, H: number, now: number): void {
    const minSide = Math.min(W, H);
    for (const t of this.targets) {
      const age = now - t.born;
      const appear = Math.min(1, age / 220);
      const fade = Math.min(1, (t.life - age) / 350);
      const scale = this.reducedMotion ? 1 : 0.6 + 0.4 * (1 - Math.pow(1 - appear, 3));
      const bob = this.reducedMotion ? 0 : Math.sin(now / 420 + t.wobble) * minSide * 0.006;
      const x = t.x * W;
      const y = t.y * H + bob;
      const r = t.r * minSide * scale;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(appear, fade));

      if (t.kind === 'orb') this.drawOrb(ctx, x, y, r);
      else if (t.kind === 'star') this.drawStar(ctx, x, y, r, now);
      else this.drawBomb(ctx, x, y, r, now);

      // Anel do tempo restante.
      const remaining = Math.max(0, 1 - age / t.life);
      ctx.beginPath();
      ctx.arc(x, y, r + 6, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = t.kind === 'bomb' ? 'rgba(255, 120, 120, 0.8)' : 'rgba(255, 255, 255, 0.75)';
      ctx.stroke();

      // Carga do aceno: preenche por dentro.
      if (t.charge > 0 && t.kind !== 'bomb') {
        ctx.beginPath();
        ctx.arc(x, y, r * Math.min(1, t.charge), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawOrb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffe2bf');
    g.addColorStop(0.35, ORANGE);
    g.addColorStop(1, '#b4540a');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(249, 145, 38, 0.7)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(x - r * 0.35, y - r * 0.42, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();
  }

  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, now: number): void {
    const rot = this.reducedMotion ? 0 : now / 900;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? r : r * 0.48;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#fff6d6');
    g.addColorStop(0.5, '#ffd166');
    g.addColorStop(1, '#e09b00');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(255, 209, 102, 0.9)';
    ctx.shadowBlur = 22;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawBomb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, now: number): void {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#ff8a8a');
    g.addColorStop(0.45, '#d62828');
    g.addColorStop(1, '#5c0a0a');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(214, 40, 40, 0.7)';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
    // "X" de perigo.
    const k = r * 0.38;
    ctx.beginPath();
    ctx.moveTo(x - k, y - k);
    ctx.lineTo(x + k, y + k);
    ctx.moveTo(x + k, y - k);
    ctx.lineTo(x - k, y + k);
    ctx.lineWidth = Math.max(3, r * 0.16);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    // Pavio com faísca.
    ctx.beginPath();
    ctx.moveTo(x + r * 0.5, y - r * 0.85);
    ctx.quadraticCurveTo(x + r * 0.8, y - r * 1.25, x + r * 1.05, y - r * 1.1);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#3b2a1a';
    ctx.stroke();
    const flicker = this.reducedMotion ? 1 : 0.6 + Math.random() * 0.6;
    ctx.beginPath();
    ctx.arc(x + r * 1.05, y - r * 1.1, r * 0.13 * flicker, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd166';
    ctx.fill();
  }

  private burst(x: number, y: number, colors: string[], count: number): void {
    if (this.reducedMotion) count = Math.round(count / 3);
    const speed = Math.min(this.width, this.height) * 0.012;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random());
      const max = 28 + Math.random() * 22;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: max,
        max,
        color: colors[i % colors.length],
        size: 2 + Math.random() * 4,
      });
    }
  }

  private drawEffects(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const alive: Particle[] = [];
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.vx *= 0.97;
      p.life -= 1;
      if (p.life <= 0) continue;
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      alive.push(p);
    }
    this.particles = alive;

    const fontSize = Math.max(18, Math.min(W, H) * 0.06);
    ctx.font = `800 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const floats: Floater[] = [];
    for (const f of this.floaters) {
      f.life -= 0.022;
      if (f.life <= 0) continue;
      f.y -= this.reducedMotion ? 0 : 1.2;
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(16, 5, 28, 0.85)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      floats.push(f);
    }
    this.floaters = floats;
    ctx.globalAlpha = 1;
  }

  // ───────────────────────── Infra ─────────────────────────

  private resize(): void {
    const stage = this.stageRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!stage || !canvas) return;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const area = rect.width * rect.height;
    this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_CANVAS_PIXELS / area)));
    this.width = rect.width;
    this.height = rect.height;
    canvas.width = Math.round(rect.width * this.dpr);
    canvas.height = Math.round(rect.height * this.dpr);
    this.ctx = canvas.getContext('2d');

    this.gridW = GRID_W;
    this.gridH = Math.max(32, Math.round(GRID_W * (rect.height / rect.width)));
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = this.gridW;
    gridCanvas.height = this.gridH;
    this.grid = gridCanvas.getContext('2d', { willReadFrequently: true });
    this.motion = new Uint8Array(this.gridW * this.gridH);
    this.prevGray = null;
  }

  private releaseCamera(): void {
    if (!this.cameraHeld) return;
    this.cameraHeld = false;
    const video = this.videoRef?.nativeElement;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    this.camera.stopCamera();
  }

  private unlockAudio(): void {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!this.audio && Ctor) this.audio = new Ctor();
      void this.audio?.resume();
    } catch {
      this.audio = null;
    }
  }

  /** Efeito sonoro sintetizado: nada para baixar. */
  private beep(freq: number, duration: number, type: OscillatorType): void {
    const ac = this.audio;
    if (!ac || this.muted() || ac.state !== 'running') return;
    try {
      const t0 = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * (type === 'sawtooth' ? 0.5 : 1.6), t0 + duration);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch {
      // som é opcional
    }
  }

  private readBest(): number {
    try {
      return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  private writeBest(score: number): void {
    try {
      localStorage.setItem(BEST_KEY, String(score));
    } catch {
      // sem armazenamento: o recorde vale só nesta visita
    }
  }
}
