import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as THREE from 'three';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faHeart,
  faPlay,
  faArrowLeft,
  faArrowRight,
  faCrosshairs,
  faVolumeHigh,
  faVolumeXmark,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { I18nService } from '../../i18n/i18n.service';
import { I18N } from './galaga-game.i18n';
import { ACCENT_ROW, LETTER_GAP, WORD_SPACE, glyph, lineUnits, wrapPhrase } from './voxel-font';

type State = 'attract' | 'playing' | 'over';
type SoundName = 'hit' | 'shoot' | 'start' | 'win';

interface Block {
  mesh: THREE.Mesh;
  gx: number;
  gy: number;
  /** Posição de onde o bloco "voa" ao montar a frase e atraso da sua entrada. */
  fromX: number;
  fromY: number;
  delay: number;
}

interface TextLine {
  group: THREE.Group;
  text: string;
  units: number;
  blocks: Map<number, Block>;
  phase: number;
  baseX: number;
  baseY: number;
  scale: number;
  sway: number;
}

interface Shot {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
}

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface Layout {
  lines: string[];
  scale: number;
  pitch: number;
  textTop: number;
  key: string;
}

// Cores: laranja e roxo da marca; o resto são tons de apoio do próprio jogo.
const COLOR_BLOCK = 0xf99126;
const COLOR_SHIP = 0xf6f2fa;
const COLOR_BULLET = 0xffe08a;
const COLOR_BOLT = 0xff6b8b;

const SCALES = [0.13, 0.115, 0.1, 0.09, 0.08, 0.07, 0.06, 0.052, 0.045];
const ASSEMBLE_SECONDS = 0.7;
const RETIRE_SECONDS = 0.3;
const BULLET_SPEED = 10;
const FIRE_INTERVAL = 0.2;
const ATTRACT_FIRE_INTERVAL = 0.5;
const MAX_LIVES = 3;
const STAR_COUNT = 70;

const blockKey = (gx: number, gy: number) => (gx + 2) * 16 + (gy + 2);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const easeOutBack = (p: number) => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2);

/**
 * Unrender Arcade — jogo próprio da Unrender: a nave destrói, bloco a bloco, uma frase feita de voxels.
 * Fora de uma partida roda em "modo vitrine" (a nave joga sozinha, sem som).
 * (O nome da classe e o seletor são mantidos por compatibilidade com quem já os importa.)
 */
@Component({
  selector: 'app-galaga-arcade',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  template: `
    <div
      #gameContainer
      id="game-container"
      class="arcade"
      [class.is-playing]="state() === 'playing'"
      tabindex="-1"
      role="group"
      [attr.aria-label]="t('gameLabel')">
      <canvas #canvas aria-hidden="true"></canvas>

      <!-- Placar -->
      <div class="hud" [class.is-visible]="state() === 'playing'" [attr.aria-hidden]="state() !== 'playing'">
        <span class="hud-item">
          <span class="hud-label">{{ t('score') }}</span>
          <span class="hud-value">{{ scoreText() }}</span>
        </span>
        <span class="hud-item">
          <span class="hud-label">{{ t('wave') }}</span>
          <span class="hud-value">{{ wave() }}</span>
        </span>
        <span class="hud-item hud-lives" role="img" [attr.aria-label]="t('lives', { n: lives() })">
          @for (slot of lifeSlots; track slot) {
            <fa-icon [icon]="faHeart" [class.is-lost]="slot >= lives()"></fa-icon>
          }
        </span>
      </div>

      <div class="hud-actions" [class.is-visible]="state() === 'playing'">
        <button
          type="button"
          class="icon-btn"
          [disabled]="state() !== 'playing'"
          (click)="toggleSound()"
          [attr.aria-label]="t(muted() ? 'soundOn' : 'soundOff')"
          [title]="t(muted() ? 'soundOn' : 'soundOff')">
          <fa-icon [icon]="muted() ? faVolumeXmark : faVolumeHigh"></fa-icon>
        </button>
        <button
          type="button"
          class="icon-btn"
          [disabled]="state() !== 'playing'"
          (click)="quitGame()"
          [attr.aria-label]="t('quit')"
          [title]="t('quit')">
          <fa-icon [icon]="faXmark"></fa-icon>
        </button>
      </div>

      <!-- Aviso de onda -->
      <div class="banner" [class.is-visible]="bannerVisible()" aria-hidden="true">{{ t('waveN', { n: wave() }) }}</div>
      <span class="sr-only" aria-live="polite">{{ state() === 'playing' ? t('waveN', { n: wave() }) : '' }}</span>

      <!-- Tela de início / fim de jogo -->
      <div class="screen" [class.is-visible]="state() !== 'playing'">
        <div #card class="card">
          <div class="card-text">
            @if (state() === 'over') {
              <p class="card-eyebrow card-eyebrow-over">{{ t('gameOver') }} · {{ t('finalScore', { pontos: scoreText() }) }}</p>
            } @else {
              <p class="card-eyebrow">{{ t('demo') }}</p>
            }
            <h3 class="card-title">Unrender Arcade</h3>
            <p class="card-desc">{{ failed() ? t('noWebgl') : t('description') }}</p>
          </div>
          <div class="card-action">
            <button type="button" class="play-btn" [disabled]="state() === 'playing' || failed()" (click)="startGame()">
              <fa-icon [icon]="faPlay"></fa-icon>
              {{ t(state() === 'over' ? 'playAgain' : 'play') }}
            </button>
            <p class="card-controls">
              <span class="for-pointer">{{ t('controlsPointer') }}</span>
              <span class="for-touch">{{ t('controlsTouch') }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Controles de toque -->
      <div class="touch" [class.is-visible]="state() === 'playing'">
        <div class="touch-move">
          <button
            type="button"
            class="touch-btn"
            [disabled]="state() !== 'playing'"
            [attr.aria-label]="t('left')"
            (pointerdown)="hold('left', true, $event)"
            (pointerup)="hold('left', false)"
            (pointercancel)="hold('left', false)"
            (pointerleave)="hold('left', false)"
            (contextmenu)="$event.preventDefault()">
            <fa-icon [icon]="faArrowLeft"></fa-icon>
          </button>
          <button
            type="button"
            class="touch-btn"
            [disabled]="state() !== 'playing'"
            [attr.aria-label]="t('right')"
            (pointerdown)="hold('right', true, $event)"
            (pointerup)="hold('right', false)"
            (pointercancel)="hold('right', false)"
            (pointerleave)="hold('right', false)"
            (contextmenu)="$event.preventDefault()">
            <fa-icon [icon]="faArrowRight"></fa-icon>
          </button>
        </div>
        <button
          type="button"
          class="touch-btn touch-fire"
          [disabled]="state() !== 'playing'"
          [attr.aria-label]="t('fire')"
          (pointerdown)="hold('fire', true, $event)"
          (pointerup)="hold('fire', false)"
          (pointercancel)="hold('fire', false)"
          (pointerleave)="hold('fire', false)"
          (contextmenu)="$event.preventDefault()">
          <fa-icon [icon]="faCrosshairs"></fa-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --ink: var(--unrender-purple, #10051c);
      --accent: var(--unrender-accent, #f99126);
      display: block;
      width: 100%;
      min-width: 0;
    }

    .arcade {
      position: relative;
      container-type: inline-size;
      width: 100%;
      height: clamp(380px, 66vh, 600px);
      border-radius: 16px;
      overflow: hidden;
      background: var(--ink);
      color: #ffffff;
      /* Fora da partida a página rola normalmente; jogando, o arrasto move a nave. */
      touch-action: pan-y;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .arcade:focus { outline: none; }

    /* Rota própria (/galaga): o jogo ocupa a tela e o placar desce para não ficar sob a barra do site. */
    :host(.is-page) .arcade {
      height: 100dvh;
      min-height: 480px;
      border-radius: 0;
    }

    :host(.is-page) .hud,
    :host(.is-page) .hud-actions {
      top: 84px;
    }

    .arcade.is-playing {
      touch-action: none;
      cursor: crosshair;
    }

    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }

    button { font: inherit; }

    button:focus-visible {
      outline: 2px solid #ffffff;
      outline-offset: 2px;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    /* Placar */
    .hud,
    .hud-actions {
      position: absolute;
      top: 10px;
      z-index: 3;
      display: flex;
      align-items: center;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 0.35s;
    }

    .hud.is-visible,
    .hud-actions.is-visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
      transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s;
    }

    .hud {
      left: 12px;
      gap: 14px;
      min-height: 44px;
      pointer-events: none;
    }

    .hud-item {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .hud-label {
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.7);
    }

    .hud-value {
      font-size: 1.125rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }

    .hud-lives {
      flex-direction: row;
      gap: 4px;
      color: var(--accent);
      font-size: 0.9375rem;
    }

    .hud-lives fa-icon {
      transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .hud-lives fa-icon.is-lost {
      opacity: 0.22;
      transform: scale(0.8);
    }

    .hud-actions {
      right: 8px;
      gap: 4px;
    }

    .icon-btn {
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.2s ease, transform 0.15s ease;
    }

    .icon-btn:hover { background: rgba(255, 255, 255, 0.2); }
    .icon-btn:active { transform: scale(0.92); }

    /* Aviso de onda */
    .banner {
      position: absolute;
      left: 50%;
      top: 64%;
      z-index: 2;
      padding: 6px 18px;
      border-radius: 999px;
      background: rgba(16, 5, 28, 0.85);
      border: 1px solid rgba(249, 145, 38, 0.6);
      color: var(--accent);
      font-size: 1.125rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.85);
      transition: opacity 0.35s ease, transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .banner.is-visible {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }

    /* Tela de início / fim */
    .screen {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 4;
      padding: 16px;
      display: flex;
      justify-content: center;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transform: translateY(16px);
      transition: opacity 0.35s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 0.4s;
    }

    .screen.is-visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
      transition: opacity 0.35s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s;
    }

    .card {
      pointer-events: auto;
      width: min(100%, 44rem);
      padding: 14px 16px;
      border-radius: 14px;
      background: rgba(16, 5, 28, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.16);
      display: flex;
      flex-direction: column;
      gap: 12px;
      text-align: center;
    }

    .card-text { min-width: 0; }

    .card-eyebrow {
      margin: 0 0 2px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.7);
    }

    .card-eyebrow-over { color: var(--accent); }

    .card-title {
      margin: 0;
      font-size: clamp(1.25rem, 5cqw, 1.625rem);
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      line-height: 1.15;
      color: #ffffff;
    }

    .card-desc {
      margin: 4px 0 0;
      font-size: 0.875rem;
      line-height: 1.4;
      color: rgba(255, 255, 255, 0.85);
    }

    .card-action {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .play-btn {
      min-height: 48px;
      padding: 10px 28px;
      border: none;
      border-radius: 999px;
      background: var(--accent);
      color: #1c0f02;
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      transition: background-color 0.2s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .play-btn:hover:not(:disabled) { background: #ffa544; transform: translateY(-2px); }
    .play-btn:active:not(:disabled) { transform: scale(0.95); }
    .play-btn:disabled { opacity: 0.5; cursor: default; }

    .card-controls {
      margin: 0;
      font-size: 0.75rem;
      line-height: 1.4;
      color: rgba(255, 255, 255, 0.7);
    }

    .for-touch { display: none; }

    @container (min-width: 640px) {
      .card {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        text-align: left;
        padding: 16px 20px;
      }

      .card-action {
        flex: none;
        max-width: 17rem;
        text-align: center;
      }
    }

    /* Controles de toque: só em telas de toque e durante a partida */
    .touch {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 12px;
      z-index: 3;
      display: none;
      justify-content: space-between;
      align-items: flex-end;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0s linear 0.3s;
    }

    .touch.is-visible {
      opacity: 1;
      visibility: visible;
      transition: opacity 0.3s ease, visibility 0s;
    }

    .touch-move {
      display: flex;
      gap: 10px;
    }

    .touch-btn {
      pointer-events: auto;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.4);
      background: rgba(16, 5, 28, 0.7);
      color: #ffffff;
      font-size: 1.25rem;
      touch-action: none;
      cursor: pointer;
      transition: transform 0.1s ease, background-color 0.15s ease;
    }

    .touch-btn:active {
      transform: scale(0.92);
      background: rgba(255, 255, 255, 0.25);
    }

    .touch-fire {
      width: 68px;
      height: 68px;
      border-color: var(--accent);
      background: var(--accent);
      color: #1c0f02;
    }

    .touch-fire:active { background: #ffa544; }

    @media (pointer: coarse) {
      .touch { display: flex; }
      .for-pointer { display: none; }
      .for-touch { display: inline; }
    }

    @media (prefers-reduced-motion: reduce) {
      .hud, .hud-actions, .banner, .screen, .touch, .hud-lives fa-icon { transition: none; }
    }
  `],
  host: { '[class.is-page]': 'isPage' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalagaArcadeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameContainer') private gameContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('card') private cardRef!: ElementRef<HTMLDivElement>;

  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly ngZone = inject(NgZone);
  /** Verdadeiro quando o componente é a própria página da rota (e não uma demonstração dentro de outra). */
  readonly isPage = inject(ActivatedRoute, { optional: true })?.component === GalagaArcadeComponent;

  // Ícones
  readonly faHeart = faHeart;
  readonly faPlay = faPlay;
  readonly faArrowLeft = faArrowLeft;
  readonly faArrowRight = faArrowRight;
  readonly faCrosshairs = faCrosshairs;
  readonly faVolumeHigh = faVolumeHigh;
  readonly faVolumeXmark = faVolumeXmark;
  readonly faXmark = faXmark;

  // Estado exibido na interface
  readonly state = signal<State>('attract');
  readonly score = signal(0);
  readonly lives = signal(MAX_LIVES);
  readonly wave = signal(1);
  readonly muted = signal(false);
  readonly bannerVisible = signal(false);
  readonly failed = signal(false);
  readonly scoreText = computed(() => this.i18n.number(this.score()));
  readonly lifeSlots = Array.from({ length: MAX_LIVES }, (_, i) => i);

  // Three.js
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private cube!: THREE.BoxGeometry;
  private materials: Record<'block' | 'ship' | 'bullet' | 'bolt', THREE.MeshBasicMaterial> | null = null;
  private stars: Array<{ points: THREE.Points; seeds: Float32Array; speed: number }> = [];

  // Mundo: largura/altura visíveis e quantas unidades vale 1 px.
  private world = { w: 8, h: 6, px: 6 / 400 };

  // Objetos do jogo
  private ship!: THREE.Group;
  private lines: TextLine[] = [];
  private retiring: Array<{ group: THREE.Group; scale: number; t: number }> = [];
  private bullets: Shot[] = [];
  private bolts: Shot[] = [];
  private particles: Particle[] = [];
  private layoutKey = '';

  // Relógio e temporizadores do jogo (em segundos de jogo, não de parede)
  private time = 0;
  private lastFrame = 0;
  private assembling = false;
  private assembleT = 0;
  private rebuildAt = 0;
  private fireCooldown = 0;
  private enemyFireTimer = 1.5;
  private invulnerable = 0;
  private shake = 0;
  private recoil = 0;
  private shipY = -2;
  private targetX = 0;
  private aiTarget: { line: TextLine; block: Block } | null = null;

  // Entrada
  private keys = { left: false, right: false, fire: false };
  private touchKeys = { left: false, right: false, fire: false };
  private pointerFiring = false;

  // Ciclo de vida
  private animationFrameId = 0;
  private inView = false;
  private ready = false;
  private relayoutFrame = 0;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;
  private io: IntersectionObserver | null = null;
  private ro: ResizeObserver | null = null;
  private removeListeners: Array<() => void> = [];
  private sounds: Record<SoundName, HTMLAudioElement> | null = null;
  private readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  constructor() {
    // A frase é desenhada em voxels: ao trocar o idioma, ela é remontada.
    effect(() => {
      this.t('phrase');
      untracked(() => {
        if (this.ready) this.scheduleRelayout();
      });
    });
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      try {
        this.initScene();
      } catch (error) {
        console.error('Unrender Arcade: WebGL indisponível', error);
        this.ngZone.run(() => this.failed.set(true));
        return;
      }
      this.fitCamera();
      this.buildFormation(!this.reducedMotion);
      this.shipY = this.shipTargetY();
      this.ship.position.set(0, this.shipY, 0);
      this.ready = true;
      this.bindInput();
      this.bindObservers();
      this.renderOnce();
    });
  }

  ngOnDestroy(): void {
    this.stopLoop();
    if (this.relayoutFrame) cancelAnimationFrame(this.relayoutFrame);
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.io?.disconnect();
    this.ro?.disconnect();
    this.removeListeners.forEach((remove) => remove());
    this.removeListeners = [];
    if (this.sounds) {
      Object.values(this.sounds).forEach((audio) => audio.pause());
      this.sounds = null;
    }
    try {
      this.stars.forEach((s) => {
        s.points.geometry.dispose();
        (s.points.material as THREE.Material).dispose();
      });
      this.cube?.dispose();
      if (this.materials) Object.values(this.materials).forEach((m) => m.dispose());
      this.scene?.clear();
      this.renderer?.dispose();
      this.renderer?.forceContextLoss();
    } catch (e) {
      console.warn('Unrender Arcade: erro ao liberar recursos', e);
    }
    this.renderer = null;
  }

  // --- Ações da interface ---

  /** Começa uma partida. Vem sempre de um gesto do usuário, então o áudio pode ser criado aqui. */
  startGame(): void {
    if (!this.ready || this.state() === 'playing') return;
    this.initAudio();
    this.score.set(0);
    this.lives.set(MAX_LIVES);
    this.wave.set(1);
    this.state.set('playing');
    this.clearShots();
    this.invulnerable = 1;
    this.enemyFireTimer = 2;
    this.rebuildAt = 0;
    this.resetInput();
    this.targetX = this.ship.position.x;
    this.buildFormation(!this.reducedMotion);
    this.showBanner();
    this.play('start');
    this.gameContainer.nativeElement.focus({ preventScroll: true });
    this.syncLoop();
  }

  /** Mantido para quem chamava o reinício direto: equivale a começar de novo. */
  restartGame(): void {
    this.state.set('attract');
    this.startGame();
  }

  quitGame(): void {
    if (this.state() !== 'playing') return;
    this.endGame('attract');
  }

  toggleSound(): void {
    this.muted.update((m) => !m);
  }

  /** Botões de toque: segurar move/atira continuamente. */
  hold(control: 'left' | 'right' | 'fire', down: boolean, event?: Event): void {
    event?.preventDefault();
    this.touchKeys[control] = down;
  }

  // --- Cena ---

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 100);
    this.camera.position.set(0, 0, 10);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvasRef.nativeElement, antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);

    this.cube = new THREE.BoxGeometry(1, 1, 1);
    this.materials = {
      block: new THREE.MeshBasicMaterial({ color: COLOR_BLOCK }),
      ship: new THREE.MeshBasicMaterial({ color: COLOR_SHIP }),
      bullet: new THREE.MeshBasicMaterial({ color: COLOR_BULLET }),
      bolt: new THREE.MeshBasicMaterial({ color: COLOR_BOLT }),
    };

    this.createStars();
    this.createShip();
  }

  private createStars(): void {
    // Duas camadas (longe/perto) em velocidades diferentes dão profundidade ao fundo.
    const layers = [
      { size: 1.5, opacity: 0.5, speed: 0.25 },
      { size: 2.5, opacity: 0.85, speed: 0.6 },
    ];
    for (const layer of layers) {
      const seeds = new Float32Array(STAR_COUNT * 2);
      for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STAR_COUNT * 3), 3));
      const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: layer.size,
        sizeAttenuation: false,
        transparent: true,
        opacity: layer.opacity,
      });
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      points.position.z = -1;
      this.scene.add(points);
      this.stars.push({ points, seeds, speed: layer.speed });
    }
  }

  private createShip(): void {
    const rows = ['..#..', '..#..', '.###.', '#####', '#.#.#'];
    const size = 0.09;
    const ship = new THREE.Group();
    rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        if (row[c] !== '#') continue;
        const cockpit = r === 2 && c === 2;
        const cell = new THREE.Mesh(this.cube, cockpit ? this.materials!.block : this.materials!.ship);
        cell.scale.setScalar(size);
        cell.position.set((c - 2) * size, (2 - r) * size, 0);
        ship.add(cell);
      }
    });
    this.ship = ship;
    this.scene.add(ship);
  }

  /** Ajusta câmera e renderizador ao contêiner: o mundo tem no mínimo 8 × 6 unidades. */
  private fitCamera(): void {
    const el = this.gameContainer.nativeElement;
    const width = Math.max(1, el.clientWidth);
    const height = Math.max(1, el.clientHeight);
    const aspect = width / height;
    const h = aspect >= 4 / 3 ? 6 : 8 / aspect;
    const w = aspect >= 4 / 3 ? 6 * aspect : 8;

    this.camera.left = -w / 2;
    this.camera.right = w / 2;
    this.camera.top = h / 2;
    this.camera.bottom = -h / 2;
    this.camera.updateProjectionMatrix();
    this.renderer!.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer!.setSize(width, height, false);
    this.world = { w, h, px: h / height };
  }

  /** Altura da nave: acima do cartão no modo vitrine; perto da base (ou dos botões de toque) jogando. */
  private shipTargetY(): number {
    const bottom = -this.world.h / 2;
    if (this.state() === 'playing') return bottom + (this.coarsePointer ? 112 : 52) * this.world.px;
    return this.attractShipY();
  }

  private attractShipY(): number {
    const cardHeight = this.cardRef?.nativeElement.offsetHeight || 180;
    return -this.world.h / 2 + (cardHeight + 16 + 40) * this.world.px;
  }

  // --- Frase em voxels ---

  private computeLayout(): Layout {
    const phrase = this.t('phrase');
    const hasMarks = /[^A-Z '!-]/.test(phrase);
    // Passo entre linhas, em blocos: 5 da letra + respiro; com acentos/cedilha sobra uma faixa a mais.
    const pitch = hasMarks ? 9 : 7.5;
    const { w, h, px } = this.world;
    const textTop = h / 2 - (this.isPage ? 136 : 62) * px;
    // A frase usa sempre a faixa acima da nave do modo vitrine, para não mudar de lugar ao começar a partida.
    const available = textTop - (this.attractShipY() + 0.7);
    const maxWidth = w * 0.9;

    let chosen: { lines: string[]; scale: number } | null = null;
    for (const scale of SCALES) {
      const lines = wrapPhrase(phrase, maxWidth / scale);
      if (!lines) continue;
      chosen = { lines, scale };
      if (lines.length * pitch * scale <= available) break;
    }
    if (!chosen) {
      const scale = SCALES[SCALES.length - 1];
      chosen = { lines: phrase.split(' '), scale };
    }
    return { ...chosen, pitch, textTop, key: `${chosen.lines.join('|')}` };
  }

  private applyLayout(layout: Layout): void {
    const { w } = this.world;
    this.lines.forEach((line, index) => {
      line.scale = layout.scale;
      line.baseX = (-(line.units - 1) * layout.scale) / 2;
      line.baseY = layout.textTop - layout.scale * (ACCENT_ROW + 1 + index * layout.pitch);
      line.sway = clamp((w - line.units * layout.scale) / 2 - 0.15, 0, 0.3);
      line.group.scale.setScalar(layout.scale);
    });
  }

  /** Monta a frase do idioma atual; a anterior (se houver) encolhe e sai antes de ser removida. */
  private buildFormation(animate: boolean): void {
    for (const line of this.lines) {
      if (animate) this.retiring.push({ group: line.group, scale: line.scale, t: 0 });
      else this.scene.remove(line.group);
    }
    this.lines = [];
    this.aiTarget = null;

    const layout = this.computeLayout();
    for (const text of layout.lines) {
      const units = lineUnits(text);
      const group = new THREE.Group();
      const blocks = new Map<number, Block>();
      let x = 0;
      for (const char of text) {
        if (char === ' ') {
          x += WORD_SPACE + LETTER_GAP;
          continue;
        }
        const g = glyph(char);
        for (const [cx, cy] of g.cells) {
          const gx = x + cx;
          const mesh = new THREE.Mesh(this.cube, this.materials!.block);
          const block: Block = {
            mesh,
            gx,
            gy: cy,
            fromX: gx + (Math.random() - 0.5) * 16,
            fromY: cy + 8 + Math.random() * 10,
            // Entrada em varredura da esquerda para a direita.
            delay: (gx / Math.max(1, units)) * 0.45 + Math.random() * 0.2,
          };
          if (animate) {
            mesh.position.set(block.fromX, block.fromY, 0);
            mesh.scale.setScalar(0.001);
          } else {
            mesh.position.set(gx, cy, 0);
          }
          group.add(mesh);
          blocks.set(blockKey(gx, cy), block);
        }
        x += g.width + LETTER_GAP;
      }
      this.scene.add(group);
      this.lines.push({ group, text, units, blocks, phase: Math.random() * Math.PI * 2, baseX: 0, baseY: 0, scale: 1, sway: 0 });
    }
    this.applyLayout(layout);
    this.layoutKey = layout.key;
    this.assembling = animate;
    this.assembleT = 0;
    this.positionLines();
  }

  private positionLines(): void {
    for (const line of this.lines) {
      line.group.position.set(
        line.baseX + Math.sin(this.time * 0.9 + line.phase) * line.sway,
        line.baseY + Math.cos(this.time * 0.63 + line.phase) * 0.1,
        0,
      );
    }
  }

  private updateFormation(dt: number): void {
    this.positionLines();

    if (this.assembling) {
      this.assembleT += dt;
      let done = true;
      for (const line of this.lines) {
        for (const block of line.blocks.values()) {
          const p = clamp((this.assembleT - block.delay) / ASSEMBLE_SECONDS, 0, 1);
          if (p < 1) done = false;
          const e = easeOutCubic(p);
          block.mesh.position.set(
            block.fromX + (block.gx - block.fromX) * e,
            block.fromY + (block.gy - block.fromY) * e,
            0,
          );
          block.mesh.scale.setScalar(Math.max(0.001, easeOutBack(p)));
        }
      }
      if (done) this.assembling = false;
    }

    for (let i = this.retiring.length - 1; i >= 0; i--) {
      const item = this.retiring[i];
      item.t += dt;
      const p = clamp(item.t / RETIRE_SECONDS, 0, 1);
      item.group.scale.setScalar(Math.max(0.0001, item.scale * (1 - p * p)));
      if (p >= 1) {
        this.scene.remove(item.group);
        this.retiring.splice(i, 1);
      }
    }

    if (this.rebuildAt && this.time >= this.rebuildAt) {
      this.rebuildAt = 0;
      this.buildFormation(!this.reducedMotion);
      if (this.state() === 'playing') this.showBanner();
    }
  }

  private remainingBlocks(): number {
    let total = 0;
    for (const line of this.lines) total += line.blocks.size;
    return total;
  }

  /** Testa o tiro contra a grade de cada linha (coordenadas locais): custo fixo por tiro. */
  private hitBlock(x: number, y: number, radius: number): boolean {
    for (const line of this.lines) {
      const lx = (x - line.group.position.x) / line.scale;
      const ly = (y - line.group.position.y) / line.scale;
      if (ly < -2.5 || ly > ACCENT_ROW + 1.5 || lx < -1.5 || lx > line.units + 0.5) continue;
      const reach = 0.5 + radius / line.scale;
      const cx = Math.round(lx);
      const cy = Math.round(ly);
      let best: Block | null = null;
      let bestDistance = Infinity;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const block = line.blocks.get(blockKey(cx + dx, cy + dy));
          if (!block) continue;
          const distance = Math.max(Math.abs(lx - block.gx), Math.abs(ly - block.gy));
          if (distance < reach && distance < bestDistance) {
            best = block;
            bestDistance = distance;
          }
        }
      }
      if (best) {
        this.destroyBlock(line, best);
        return true;
      }
    }
    return false;
  }

  private destroyBlock(line: TextLine, block: Block): void {
    const wx = line.group.position.x + block.gx * line.scale;
    const wy = line.group.position.y + block.gy * line.scale;
    line.group.remove(block.mesh);
    line.blocks.delete(blockKey(block.gx, block.gy));
    this.burst(wx, wy, 'block', 5, 2.2, line.scale * 0.7);

    if (this.state() === 'playing') {
      this.play('hit');
      const gained = 10 * this.wave();
      this.ngZone.run(() => this.score.update((s) => s + gained));
    }

    if (this.remainingBlocks() === 0 && !this.rebuildAt) {
      if (this.state() === 'playing') {
        this.play('win');
        this.ngZone.run(() => {
          this.score.update((s) => s + 100 * this.wave());
          this.wave.update((n) => n + 1);
        });
        this.rebuildAt = this.time + 1.1;
      } else {
        this.rebuildAt = this.time + 1.6;
      }
    }
  }

  // --- Nave, tiros e partículas ---

  private shoot(): void {
    this.fireCooldown = this.state() === 'playing' ? FIRE_INTERVAL : ATTRACT_FIRE_INTERVAL;
    const mesh = new THREE.Mesh(this.cube, this.materials!.bullet);
    mesh.scale.set(0.07, 0.16, 0.07);
    mesh.position.set(this.ship.position.x, this.ship.position.y + 0.26, 0);
    this.scene.add(mesh);
    this.bullets.push({ mesh, vx: 0, vy: BULLET_SPEED });
    this.recoil = 0.07;
    if (this.state() === 'playing') this.play('shoot');
  }

  private updateShip(dt: number): void {
    const half = this.world.w / 2 - 0.35;
    const playing = this.state() === 'playing';

    if (playing) {
      const direction =
        (this.keys.right || this.touchKeys.right ? 1 : 0) - (this.keys.left || this.touchKeys.left ? 1 : 0);
      if (direction) this.targetX += direction * 7.5 * dt;
    } else {
      this.updateAutopilot();
    }
    this.targetX = clamp(this.targetX, -half, half);

    const follow = 1 - Math.exp(-dt * (playing ? 16 : 5));
    const dx = (this.targetX - this.ship.position.x) * follow;
    this.ship.position.x += dx;
    // A nave inclina de leve na direção do movimento.
    const tilt = clamp(-(this.targetX - this.ship.position.x) * 0.5, -0.18, 0.18);
    this.ship.rotation.z += (tilt - this.ship.rotation.z) * (1 - Math.exp(-dt * 10));

    this.shipY += (this.shipTargetY() - this.shipY) * (1 - Math.exp(-dt * 5));
    this.recoil *= Math.exp(-dt * 14);
    this.ship.position.y = this.shipY - this.recoil;

    this.fireCooldown -= dt;
    const firing = playing && (this.keys.fire || this.touchKeys.fire || this.pointerFiring);
    if (firing && this.fireCooldown <= 0) this.shoot();

    if (this.invulnerable > 0) {
      this.invulnerable -= dt;
      this.ship.visible = playing ? Math.floor(this.time * 14) % 2 === 0 : true;
      if (this.invulnerable <= 0) this.ship.visible = true;
    }
  }

  /** Modo vitrine: a nave escolhe um bloco, alinha e atira. */
  private updateAutopilot(): void {
    if (this.assembling || this.lines.length === 0) return;
    const target = this.aiTarget;
    if (!target || !target.line.blocks.has(blockKey(target.block.gx, target.block.gy))) {
      this.aiTarget = this.pickBlock();
      return;
    }
    const x = target.line.group.position.x + target.block.gx * target.line.scale;
    this.targetX = x;
    if (Math.abs(this.ship.position.x - x) < 0.06 && this.fireCooldown <= 0) {
      this.shoot();
      this.aiTarget = this.pickBlock();
    }
  }

  private pickBlock(): { line: TextLine; block: Block } | null {
    const candidates = this.lines.filter((line) => line.blocks.size > 0);
    if (!candidates.length) return null;
    const line = candidates[Math.floor(Math.random() * candidates.length)];
    const blocks = [...line.blocks.values()];
    return { line, block: blocks[Math.floor(Math.random() * blocks.length)] };
  }

  private updateEnemyFire(dt: number): void {
    if (this.state() !== 'playing' || this.assembling) return;
    this.enemyFireTimer -= dt;
    if (this.enemyFireTimer > 0) return;
    const source = this.pickBlock();
    if (!source) return;
    const wave = this.wave();
    this.enemyFireTimer = Math.max(0.45, 1.5 - wave * 0.14) * (0.7 + Math.random() * 0.6);

    const x = source.line.group.position.x + source.block.gx * source.line.scale;
    const y = source.line.group.position.y + source.block.gy * source.line.scale;
    const mesh = new THREE.Mesh(this.cube, this.materials!.bolt);
    mesh.scale.set(0.09, 0.16, 0.09);
    mesh.position.set(x, y, 0.1);
    this.scene.add(mesh);
    // Leve mira na nave, sem ser teleguiado.
    this.bolts.push({ mesh, vx: clamp((this.ship.position.x - x) * 0.35, -1.2, 1.2), vy: -(2.6 + wave * 0.3) });
  }

  private updateShots(dt: number): void {
    const top = this.world.h / 2 + 0.5;
    const bottom = -this.world.h / 2 - 0.5;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      // Passos menores que um bloco: o tiro não atravessa uma fileira fina.
      const smallest = this.lines.length ? this.lines[0].scale : 0.1;
      const steps = Math.max(1, Math.ceil((bullet.vy * dt) / (smallest * 0.8)));
      let hit = false;
      for (let s = 0; s < steps && !hit; s++) {
        bullet.mesh.position.y += (bullet.vy * dt) / steps;
        hit = !this.assembling && this.hitBlock(bullet.mesh.position.x, bullet.mesh.position.y, 0.05);
      }
      if (hit || bullet.mesh.position.y > top) {
        this.scene.remove(bullet.mesh);
        this.bullets.splice(i, 1);
      }
    }

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      bolt.mesh.position.x += bolt.vx * dt;
      bolt.mesh.position.y += bolt.vy * dt;
      const dx = Math.abs(bolt.mesh.position.x - this.ship.position.x);
      const dy = Math.abs(bolt.mesh.position.y - this.ship.position.y);
      const struck = this.state() === 'playing' && this.invulnerable <= 0 && dx < 0.26 && dy < 0.24;
      if (struck) this.playerHit();
      if (struck || bolt.mesh.position.y < bottom) {
        this.scene.remove(bolt.mesh);
        this.bolts.splice(i, 1);
      }
    }
  }

  private playerHit(): void {
    this.burst(this.ship.position.x, this.ship.position.y, 'ship', 14, 3.2, 0.07);
    this.shake = 0.14;
    this.invulnerable = 1.6;
    this.play('hit');
    const remaining = this.lives() - 1;
    this.ngZone.run(() => this.lives.set(Math.max(0, remaining)));
    if (remaining <= 0) this.endGame('over');
  }

  private endGame(next: 'over' | 'attract'): void {
    this.clearShots();
    this.resetInput();
    this.invulnerable = 0;
    this.ship.visible = true;
    this.rebuildAt = 0;
    this.ngZone.run(() => {
      this.state.set(next);
      this.bannerVisible.set(false);
    });
    // A frase volta inteira para o modo vitrine continuar atrás da tela de início/fim.
    this.buildFormation(!this.reducedMotion);
    this.syncLoop();
    if (!this.animationFrameId) this.renderOnce();
  }

  private clearShots(): void {
    [...this.bullets, ...this.bolts].forEach((shot) => this.scene.remove(shot.mesh));
    this.bullets = [];
    this.bolts = [];
  }

  private burst(x: number, y: number, material: 'block' | 'ship', count: number, speed: number, size: number): void {
    if (this.particles.length > 220) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.4 + Math.random() * 0.6);
      const mesh = new THREE.Mesh(this.cube, this.materials![material]);
      mesh.position.set(x, y, 0.2);
      mesh.scale.setScalar(size);
      this.scene.add(mesh);
      const maxLife = 0.45 + Math.random() * 0.35;
      this.particles.push({ mesh, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: maxLife, maxLife, size });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 4 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.rotation.z += dt * 6;
      // Some encolhendo (material compartilhado, sem transparência por partícula).
      p.mesh.scale.setScalar(Math.max(0.001, p.size * (p.life / p.maxLife)));
    }
  }

  /** Estrelas descem em função do relógio; a volta ao topo acontece fora da área visível. */
  private updateStars(): void {
    const { w, h } = this.world;
    const span = h + 0.6;
    for (const layer of this.stars) {
      const attribute = layer.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = attribute.array as Float32Array;
      for (let i = 0; i < STAR_COUNT; i++) {
        const fall = (layer.seeds[i * 2 + 1] * span + this.time * layer.speed) % span;
        array[i * 3] = (layer.seeds[i * 2] - 0.5) * w;
        array[i * 3 + 1] = h / 2 + 0.3 - fall;
      }
      attribute.needsUpdate = true;
    }
  }

  // --- Laço principal ---

  private animate = (now: number): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    // Passo limitado: depois de uma pausa (aba oculta), o jogo retoma de onde parou, sem saltos.
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    this.time += dt;

    this.updateStars();
    this.updateFormation(dt);
    this.updateShip(dt);
    this.updateEnemyFire(dt);
    this.updateShots(dt);
    this.updateParticles(dt);

    this.shake *= Math.exp(-dt * 9);
    this.camera.position.x = Math.sin(this.time * 71) * this.shake;
    this.camera.position.y = Math.cos(this.time * 83) * this.shake;

    this.renderer!.render(this.scene, this.camera);
  };

  private renderOnce(): void {
    if (!this.renderer) return;
    this.updateStars();
    this.positionLines();
    this.ship.position.y = this.shipY = this.shipTargetY();
    this.renderer.render(this.scene, this.camera);
  }

  private syncLoop(): void {
    // Com movimento reduzido não há modo vitrine: o laço só roda durante uma partida.
    const shouldRun =
      this.ready && this.inView && !document.hidden && (!this.reducedMotion || this.state() === 'playing');
    if (shouldRun && !this.animationFrameId) {
      this.lastFrame = performance.now();
      // Fora da zona do Angular: o laço não dispara detecção de mudanças a cada quadro.
      this.ngZone.runOutsideAngular(() => {
        this.animationFrameId = requestAnimationFrame(this.animate);
      });
    } else if (!shouldRun) {
      this.stopLoop();
    }
  }

  private stopLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  // --- Redimensionamento e idioma ---

  private scheduleRelayout(): void {
    if (this.relayoutFrame) return;
    // Um quadro depois: o cartão já foi medido com o texto/tamanho novos.
    this.ngZone.runOutsideAngular(() => {
      this.relayoutFrame = requestAnimationFrame(() => {
        this.relayoutFrame = 0;
        this.relayout();
      });
    });
  }

  private relayout(): void {
    if (!this.renderer) return;
    this.fitCamera();
    const layout = this.computeLayout();
    if (layout.key !== this.layoutKey) {
      // Mudou a frase ou a quebra de linhas: remonta.
      this.buildFormation(!this.reducedMotion);
    } else {
      // Só o tamanho mudou: reposiciona sem perder os blocos já destruídos.
      this.applyLayout(layout);
    }
    if (!this.animationFrameId) this.renderOnce();
  }

  private bindObservers(): void {
    const el = this.gameContainer.nativeElement;

    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.scheduleRelayout());
      this.ro.observe(el);
      this.ro.observe(this.cardRef.nativeElement);
    }

    if (typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver((entries) => {
        this.inView = entries.some((e) => e.isIntersecting);
        if (!this.inView) this.resetInput();
        this.syncLoop();
      });
      this.io.observe(el);
    } else {
      this.inView = true;
      this.syncLoop();
    }

    const onVisibility = () => {
      this.resetInput();
      this.syncLoop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.removeListeners.push(() => document.removeEventListener('visibilitychange', onVisibility));
  }

  // --- Entrada: tudo restrito à área do jogo (e ao teclado só durante a partida) ---

  private bindInput(): void {
    const el = this.gameContainer.nativeElement;
    const listen = <K extends keyof HTMLElementEventMap>(
      type: K,
      handler: (event: HTMLElementEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ) => {
      el.addEventListener(type, handler, options);
      this.removeListeners.push(() => el.removeEventListener(type, handler, options));
    };
    const worldX = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      return ((event.clientX - rect.left) / rect.width - 0.5) * this.world.w;
    };
    const onControl = (event: Event) => !!(event.target as HTMLElement | null)?.closest?.('button');

    listen('pointermove', (event) => {
      if (this.state() !== 'playing' || onControl(event)) return;
      if (event.pointerType === 'mouse' || this.pointerFiring) this.targetX = worldX(event);
    }, { passive: true });

    listen('pointerdown', (event) => {
      if (this.state() !== 'playing' || onControl(event)) return;
      this.targetX = worldX(event);
      this.pointerFiring = true;
    }, { passive: true });

    const release = () => (this.pointerFiring = false);
    listen('pointerup', release, { passive: true });
    listen('pointercancel', release, { passive: true });
    listen('pointerleave', release, { passive: true });

    const onKey = (event: KeyboardEvent, down: boolean) => {
      if (this.state() !== 'playing' || !this.inView) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      switch (event.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.keys.left = down;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.keys.right = down;
          break;
        case 'Space':
        case 'ArrowUp':
        case 'KeyW':
          // Espaço sobre um botão focado deve acionar o botão, não atirar.
          if (event.code === 'Space' && target?.tagName === 'BUTTON') return;
          this.keys.fire = down;
          break;
        case 'Escape':
          if (down) this.ngZone.run(() => this.quitGame());
          return;
        default:
          return;
      }
      // Durante a partida, setas e espaço controlam a nave em vez de rolar a página.
      event.preventDefault();
    };
    const keydown = (event: KeyboardEvent) => onKey(event, true);
    const keyup = (event: KeyboardEvent) => onKey(event, false);
    document.addEventListener('keydown', keydown);
    document.addEventListener('keyup', keyup);
    this.removeListeners.push(() => {
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('keyup', keyup);
    });
  }

  private resetInput(): void {
    this.keys = { left: false, right: false, fire: false };
    this.touchKeys = { left: false, right: false, fire: false };
    this.pointerFiring = false;
  }

  // --- Interface e som ---

  private showBanner(): void {
    this.ngZone.run(() => this.bannerVisible.set(true));
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.ngZone.run(() => this.bannerVisible.set(false)), 1400);
  }

  /** Os áudios só são criados depois do primeiro "Jogar" (gesto do usuário). */
  private initAudio(): void {
    if (this.sounds || typeof Audio === 'undefined') return;
    const make = (src: string, volume: number) => {
      const audio = new Audio(src);
      audio.volume = volume;
      audio.preload = 'auto';
      return audio;
    };
    this.sounds = {
      hit: make('/hit.m4a', 0.2),
      shoot: make('/shoot.m4a', 0.05),
      start: make('/game%20start.m4a', 0.1),
      win: make('/game%20win.m4a', 0.1),
    };
  }

  private play(name: SoundName): void {
    if (this.muted() || !this.sounds) return;
    const audio = this.sounds[name];
    audio.currentTime = 0;
    audio.play().catch(() => undefined);
  }
}
