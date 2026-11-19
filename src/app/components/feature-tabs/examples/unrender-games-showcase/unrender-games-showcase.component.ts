import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition,
  faChartLine,
  faCircleCheck,
  faCircleQuestion,
  faCircleXmark,
  faClone,
  faCrown,
  faCube,
  faDharmachakra,
  faGamepad,
  faGift,
  faInfoCircle,
  faRankingStar,
  faRotateRight,
  faShoppingCart,
  faStar,
  faTicket,
  faTrophy,
  faTv,
  faUserPlus,
  faUsers,
  faVrCardboard,
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { ProdutosPosModalService } from '../../../../services/produtos-pos-modal.service';
import { I18nService } from '../../../../i18n/i18n.service';
import { I18N, UgsKey } from './unrender-games-showcase.i18n';

export type GameId = 'wheel' | 'quiz' | 'memory' | 'scratch';

interface GameDef { id: GameId; icon: IconDefinition; name: UgsKey; desc: UgsKey; }

interface WheelSlice { key: UgsKey; points: number; color: string; ink: string; path: string; tx: number; ty: number; rot: number; }

interface QuizQuestion { q: UgsKey; options: UgsKey[]; correct: number; }

interface MemoryCard { uid: number; face: number; open: boolean; matched: boolean; }

interface Player { name: string; score: number; you?: boolean; }

interface TotemHighlight {
  /** id do produto no catálogo da loja (sincronizado com o SGA). */
  id: string;
  name: UgsKey;
  specs: UgsKey;
  alt: UgsKey | null;
  /** Foto ilustrativa; `null` mostra um ícone. */
  image: string | null;
  focus?: string;
  /** Valores usados só quando o produto ainda não está no catálogo. */
  price: number;
  rentInstallments: number;
  rentValue: number;
}

type LeadState = 'idle' | 'form' | 'done';

const WHEEL_R = 100;
const WHEEL_C = 110;
const SPIN_MS = 4800;
const QUIZ_SECONDS = 15;
const SIM_EVERY_MS = 6500;

const WHEEL_POINTS = [300, 250, 0, 350, 400, 200, 300, 250];
const WHEEL_COLORS: [string, string][] = [
  ['#f99126', '#1c0f02'], ['#2a1146', '#ffffff'], ['#ffd3a1', '#1c0f02'], ['#3d1a66', '#ffffff'],
  ['#f99126', '#1c0f02'], ['#2a1146', '#ffffff'], ['#ffd3a1', '#1c0f02'], ['#3d1a66', '#ffffff'],
];
/** Prêmios possíveis na raspadinha (índices das casas da roleta) — sem "tente de novo". */
const SCRATCH_PRIZES = [0, 1, 3, 4, 6, 7];

const QUIZ: QuizQuestion[] = [
  { q: 'q0', options: ['q0a', 'q0b', 'q0c', 'q0d'], correct: 0 },
  { q: 'q1', options: ['q1a', 'q1b', 'q1c', 'q1d'], correct: 1 },
  { q: 'q2', options: ['q2a', 'q2b', 'q2c', 'q2d'], correct: 2 },
  { q: 'q3', options: ['q3a', 'q3b', 'q3c', 'q3d'], correct: 1 },
];

const MEMORY_ICONS: IconDefinition[] = [faGamepad, faVrCardboard, faCube, faTrophy, faGift, faStar];
const MEMORY_NAMES: UgsKey[] = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5'];

/** Jogadores simulados (primeiro nome + inicial, como num placar de evento). */
const NAME_POOL = [
  'Ana C.', 'Bruno M.', 'Carla S.', 'Diego R.', 'Eduarda L.', 'Felipe T.', 'Gabi N.', 'Henrique P.',
  'Isabela F.', 'João V.', 'Larissa A.', 'Marcos D.', 'Natália B.', 'Otávio G.', 'Paula H.', 'Rafael O.',
];

/**
 * Vitrine de gamificação que roda dentro da página: roleta, quiz, memória e
 * raspadinha, como num totem de evento. Cada jogada rende pontos, entra no
 * placar (com jogadores simulados) e abre a etapa de captação de lead — só
 * visual: nada do que se digita sai do navegador.
 */
@Component({
  selector: 'app-unrender-games-showcase',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './unrender-games-showcase.component.html',
  styleUrls: ['./unrender-games-showcase.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnrenderGamesShowcaseComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly posModal = inject(ProdutosPosModalService);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly el: ElementRef<HTMLElement> = inject(ElementRef);
  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly t = this.i18n.scope(I18N);

  readonly icons = {
    faChartLine, faCircleCheck, faCircleXmark, faCrown, faGamepad, faInfoCircle, faRankingStar,
    faRotateRight, faShoppingCart, faTv, faUserPlus, faUsers, faWhatsapp, faTicket,
  };

  readonly games: GameDef[] = [
    { id: 'wheel', icon: faDharmachakra, name: 'gWheel', desc: 'gWheelD' },
    { id: 'quiz', icon: faCircleQuestion, name: 'gQuiz', desc: 'gQuizD' },
    { id: 'memory', icon: faClone, name: 'gMemory', desc: 'gMemoryD' },
    { id: 'scratch', icon: faTicket, name: 'gScratch', desc: 'gScratchD' },
  ];
  readonly game = signal<GameId>('wheel');

  // ── Placar, KPIs e lead ─────────────────────────────────────────────
  readonly lastScore = signal<number | null>(null);
  readonly lastPrize = signal<UgsKey | null>(null);
  readonly players = signal<Player[]>([
    { name: 'Larissa A.', score: 960 }, { name: 'Diego R.', score: 910 }, { name: 'Carla S.', score: 845 },
    { name: 'João V.', score: 780 }, { name: 'Paula H.', score: 705 }, { name: 'Bruno M.', score: 640 },
    { name: 'Natália B.', score: 590 }, { name: 'Felipe T.', score: 520 },
  ]);
  readonly ranking = computed(() => {
    const sorted = [...this.players()].sort((a, b) => b.score - a.score);
    const rows = sorted.map((p, i) => ({ ...p, rank: i + 1 }));
    const top = rows.slice(0, 6);
    const you = rows.find((r) => r.you);
    return you && you.rank > 6 ? [...top.slice(0, 5), you] : top;
  });
  readonly ticker = signal<string | null>(null);
  readonly plays = signal(1284);
  readonly leads = signal(472);
  readonly conversion = computed(() => Math.round((this.leads() / this.plays()) * 100));

  readonly leadState = signal<LeadState>('idle');
  readonly leadName = signal('');
  readonly leadPhone = signal('');
  readonly leadConsent = signal(false);
  readonly leadError = signal(false);

  // ── Roleta ───────────────────────────────────────────────────────────
  readonly slices: WheelSlice[] = WHEEL_POINTS.map((points, i) => {
    const a0 = (i * 45 - 90) * (Math.PI / 180);
    const a1 = ((i + 1) * 45 - 90) * (Math.PI / 180);
    const p = (a: number) => `${(WHEEL_C + WHEEL_R * Math.cos(a)).toFixed(2)},${(WHEEL_C + WHEEL_R * Math.sin(a)).toFixed(2)}`;
    const mid = (i * 45 + 22.5 - 90) * (Math.PI / 180);
    return {
      key: `p${i}` as UgsKey,
      points,
      color: WHEEL_COLORS[i][0],
      ink: WHEEL_COLORS[i][1],
      path: `M${WHEEL_C},${WHEEL_C} L${p(a0)} A${WHEEL_R},${WHEEL_R} 0 0 1 ${p(a1)} Z`,
      tx: WHEEL_C + 62 * Math.cos(mid),
      ty: WHEEL_C + 62 * Math.sin(mid),
      // na metade esquerda o texto gira mais 180° para não ficar de cabeça para baixo
      rot: i * 45 + 22.5 - 90 + (i * 45 + 22.5 > 180 ? 180 : 0),
    };
  });
  /** Lâmpadas na borda da roleta (entre as casas). */
  readonly bulbs = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45 - 90) * (Math.PI / 180);
    return { x: +(WHEEL_C + 104 * Math.cos(a)).toFixed(2), y: +(WHEEL_C + 104 * Math.sin(a)).toFixed(2) };
  });
  readonly spinning = signal(false);
  readonly wheelResult = signal<number | null>(null);
  private wheelAngle = 0;
  private spinRaf = 0;
  @ViewChild('wheelRotor') wheelRotor?: ElementRef<SVGGElement>;
  @ViewChild('wheelPointer') wheelPointer?: ElementRef<HTMLElement>;

  // ── Quiz ─────────────────────────────────────────────────────────────
  readonly quiz = QUIZ;
  readonly qIndex = signal(0);
  readonly qAnswer = signal<number | null>(null);
  readonly qHits = signal(0);
  readonly qPoints = signal(0);
  readonly qTime = signal(QUIZ_SECONDS);
  readonly qDone = signal(false);
  readonly qSeconds = QUIZ_SECONDS;
  readonly qCurrent = computed(() => QUIZ[this.qIndex()]);

  // ── Memória ──────────────────────────────────────────────────────────
  readonly memIcons = MEMORY_ICONS;
  readonly memNames = MEMORY_NAMES;
  readonly cards = signal<MemoryCard[]>([]);
  readonly memMoves = signal(0);
  readonly memPairs = computed(() => this.cards().filter((c) => c.matched).length / 2);
  readonly memDone = computed(() => this.cards().length > 0 && this.cards().every((c) => c.matched));
  private memLock = false;

  // ── Raspadinha ───────────────────────────────────────────────────────
  readonly scratchPrize = signal(SCRATCH_PRIZES[0]);
  readonly scratchRevealed = signal(false);
  private scratchTouched = false;
  private scratchMoves = 0;
  private scratchCanvas?: HTMLCanvasElement;
  private scratching = false;
  private lastPt: { x: number; y: number } | null = null;

  @ViewChild('scratch') set scratchRef(ref: ElementRef<HTMLCanvasElement> | undefined) {
    const canvas = ref?.nativeElement;
    if (canvas === this.scratchCanvas) return;
    this.scratchCanvas = canvas;
    if (canvas) this.drawScratchCover();
  }

  private readonly reduced =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private visible = false;
  private io?: IntersectionObserver;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private quizTimer: ReturnType<typeof setInterval> | null = null;
  private simTimer: ReturnType<typeof setInterval> | null = null;
  private tickerTimer: ReturnType<typeof setTimeout> | null = null;

  readonly totemHighlights: TotemHighlight[] = [
    {
      id: 'totem-interativo-55', name: 'totem55Name', specs: 'totem55Specs', alt: 'totem55Alt',
      image: '/features/totem1.png', focus: '20% 60%', price: 3199, rentInstallments: 12, rentValue: 299,
    },
    {
      id: 'totem-foto-polaroid', name: 'totemFotoName', specs: 'totemFotoSpecs', alt: 'totemFotoAlt',
      image: '/features/unrender-games/totem-virtual-tryon.jpg', focus: '50% 35%', price: 3199, rentInstallments: 12, rentValue: 299,
    },
    {
      id: 'totem-arcade-retro', name: 'totemArcadeName', specs: 'totemArcadeSpecs', alt: null,
      image: null, price: 2899, rentInstallments: 12, rentValue: 269,
    },
  ];

  constructor() {
    this.shuffleMemory();
    this.newScratch(false);
    // A capa da raspadinha é desenhada no canvas: redesenha no idioma novo se ainda não foi raspada.
    effect(() => {
      this.i18n.lang();
      untracked(() => {
        if (!this.scratchTouched && !this.scratchRevealed()) this.drawScratchCover();
      });
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    if (typeof IntersectionObserver === 'undefined') {
      this.setVisible(true);
      return;
    }
    this.io = new IntersectionObserver((es) => this.zone.run(() => this.setVisible(es.some((e) => e.isIntersecting))), {
      threshold: 0.15,
    });
    this.io.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
    this.stopQuizTimer();
    this.stopSim();
    cancelAnimationFrame(this.spinRaf);
    this.timers.forEach(clearTimeout);
    if (this.tickerTimer) clearTimeout(this.tickerTimer);
  }

  // ── Navegação entre jogos ────────────────────────────────────────────
  selectGame(id: GameId): void {
    if (id === this.game()) return;
    this.game.set(id);
    this.leadState.set('idle');
    this.lastScore.set(null);
    this.lastPrize.set(null);
    if (id === 'quiz') this.restartQuiz();
    if (id === 'memory' && this.memDone()) this.shuffleMemory();
    if (id === 'scratch' && this.scratchRevealed()) this.newScratch();
    this.syncQuizTimer();
  }

  onTabKey(event: KeyboardEvent, index: number): void {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next: number | null = null;
    if (event.key in keys) next = (index + keys[event.key] + this.games.length) % this.games.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = this.games.length - 1;
    if (next === null) return;
    event.preventDefault();
    this.selectGame(this.games[next].id);
    const tabs = this.el.nativeElement.querySelectorAll<HTMLButtonElement>('.ugs-game-tab');
    tabs[next]?.focus();
  }

  // ── Roleta ───────────────────────────────────────────────────────────
  spin(): void {
    if (this.spinning()) return;
    this.leadState.set('idle');
    this.wheelResult.set(null);
    this.lastScore.set(null);
    const idx = Math.floor(Math.random() * this.slices.length);
    const center = idx * 45 + 22.5;
    const jitter = (Math.random() - 0.5) * 30; // cai em qualquer ponto da casa, não sempre no meio
    const current = ((this.wheelAngle % 360) + 360) % 360;
    const delta = 360 * 5 + ((360 - center - current + 360 * 2) % 360) + jitter;
    const from = this.wheelAngle;
    const to = from + delta;
    this.spinning.set(true);

    const finish = () => {
      this.wheelAngle = to;
      this.applyWheel(to);
      this.spinning.set(false);
      this.wheelResult.set(idx);
      const slice = this.slices[idx];
      if (slice.points > 0) this.finishGame(slice.points, slice.key);
      else this.countPlay();
      this.cdr.markForCheck();
    };

    if (this.reduced) {
      finish();
      return;
    }
    this.zone.runOutsideAngular(() => {
      const start = performance.now();
      let lastSlot = -1;
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / SPIN_MS);
        // desaceleração forte no fim, como uma roleta de verdade perdendo força
        const eased = 1 - Math.pow(1 - k, 4);
        const angle = from + delta * eased;
        this.applyWheel(angle);
        const slot = Math.floor((((360 - (angle % 360)) % 360) + 360) % 360 / 45);
        if (slot !== lastSlot) {
          lastSlot = slot;
          this.tickPointer();
        }
        if (k < 1) this.spinRaf = requestAnimationFrame(step);
        else this.zone.run(finish);
      };
      this.spinRaf = requestAnimationFrame(step);
    });
  }

  private applyWheel(angle: number): void {
    this.wheelRotor?.nativeElement.setAttribute('transform', `rotate(${angle.toFixed(2)} ${WHEEL_C} ${WHEEL_C})`);
  }

  private tickPointer(): void {
    const p = this.wheelPointer?.nativeElement;
    if (!p) return;
    p.classList.remove('is-tick');
    void p.offsetWidth; // reinicia a animação do "clique" do ponteiro
    p.classList.add('is-tick');
  }

  // ── Quiz ─────────────────────────────────────────────────────────────
  answer(option: number): void {
    if (this.qAnswer() !== null || this.qDone()) return;
    this.qAnswer.set(option);
    if (option === this.qCurrent().correct) {
      this.qHits.update((n) => n + 1);
      this.qPoints.update((p) => p + 150 + Math.round(this.qTime()) * 10);
    }
    this.syncQuizTimer();
  }

  nextQuestion(): void {
    if (this.qAnswer() === null) return;
    if (this.qIndex() >= QUIZ.length - 1) {
      this.qDone.set(true);
      this.syncQuizTimer();
      const pts = this.qPoints();
      if (pts > 0) this.finishGame(pts, null);
      else this.countPlay();
      return;
    }
    this.qIndex.update((i) => i + 1);
    this.qAnswer.set(null);
    this.qTime.set(QUIZ_SECONDS);
    this.syncQuizTimer();
  }

  restartQuiz(): void {
    this.qIndex.set(0);
    this.qAnswer.set(null);
    this.qHits.set(0);
    this.qPoints.set(0);
    this.qTime.set(QUIZ_SECONDS);
    this.qDone.set(false);
    this.leadState.set('idle');
    this.lastScore.set(null);
    this.syncQuizTimer();
  }

  ceil(n: number): number {
    return Math.ceil(n);
  }

  correctLabel(): string {
    const q = this.qCurrent();
    return this.t(q.options[q.correct]);
  }

  /** O relógio do quiz só anda com o quiz aberto, a vitrine na tela e a pergunta sem resposta. */
  private syncQuizTimer(): void {
    const run = this.visible && this.game() === 'quiz' && this.qAnswer() === null && !this.qDone();
    if (!run) {
      this.stopQuizTimer();
      return;
    }
    if (this.quizTimer) return;
    this.quizTimer = setInterval(() => {
      const left = Math.max(0, +(this.qTime() - 0.1).toFixed(1));
      this.qTime.set(left);
      if (left <= 0) {
        this.qAnswer.set(-1);
        this.stopQuizTimer();
      }
      this.cdr.markForCheck();
    }, 100);
  }

  private stopQuizTimer(): void {
    if (this.quizTimer) clearInterval(this.quizTimer);
    this.quizTimer = null;
  }

  // ── Memória ──────────────────────────────────────────────────────────
  shuffleMemory(): void {
    const faces = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5];
    for (let i = faces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [faces[i], faces[j]] = [faces[j], faces[i]];
    }
    this.cards.set(faces.map((face, uid) => ({ uid, face, open: false, matched: false })));
    this.memMoves.set(0);
    this.memLock = false;
    this.leadState.set('idle');
    this.lastScore.set(null);
  }

  flip(index: number): void {
    if (this.memLock) return;
    const cards = this.cards();
    const card = cards[index];
    if (!card || card.open || card.matched) return;
    const opened = cards.filter((c) => c.open && !c.matched);
    const next = cards.map((c, i) => (i === index ? { ...c, open: true } : c));
    this.cards.set(next);
    if (opened.length !== 1) return;

    this.memMoves.update((m) => m + 1);
    const other = opened[0];
    if (other.face === card.face) {
      this.cards.set(next.map((c) => (c.face === card.face ? { ...c, matched: true } : c)));
      if (this.memDone()) {
        const score = Math.max(200, 1000 - (this.memMoves() - 6) * 55);
        this.later(() => this.finishGame(score, null), 450);
      }
      return;
    }
    this.memLock = true;
    this.later(() => {
      this.cards.update((list) => list.map((c) => (c.matched ? c : { ...c, open: false })));
      this.memLock = false;
    }, this.reduced ? 650 : 850);
  }

  cardLabel(card: MemoryCard, index: number): string {
    return card.open || card.matched
      ? this.t('memShown', { n: index + 1, nome: this.t(MEMORY_NAMES[card.face]) })
      : this.t('memHidden', { n: index + 1 });
  }

  // ── Raspadinha ───────────────────────────────────────────────────────
  newScratch(redraw = true): void {
    const prize = SCRATCH_PRIZES[Math.floor(Math.random() * SCRATCH_PRIZES.length)];
    this.scratchPrize.set(prize);
    this.scratchRevealed.set(false);
    this.scratchTouched = false;
    this.scratchMoves = 0;
    this.leadState.set('idle');
    this.lastScore.set(null);
    if (redraw) this.drawScratchCover();
  }

  revealScratch(): void {
    if (this.scratchRevealed()) return;
    this.scratchRevealed.set(true);
    const slice = this.slices[this.scratchPrize()];
    this.finishGame(slice.points, slice.key);
  }

  onScratchDown(event: PointerEvent): void {
    if (this.scratchRevealed() || !this.scratchCanvas) return;
    this.scratching = true;
    this.scratchTouched = true;
    this.scratchCanvas.setPointerCapture?.(event.pointerId);
    this.lastPt = this.canvasPoint(event);
    this.scratchAt(this.lastPt, this.lastPt);
    event.preventDefault();
  }

  onScratchMove(event: PointerEvent): void {
    if (!this.scratching || this.scratchRevealed()) return;
    const pt = this.canvasPoint(event);
    this.scratchAt(this.lastPt ?? pt, pt);
    this.lastPt = pt;
    if (++this.scratchMoves % 6 === 0 && this.scratchedRatio() > 0.45) this.revealScratch();
  }

  onScratchUp(): void {
    if (!this.scratching) return;
    this.scratching = false;
    this.lastPt = null;
    if (!this.scratchRevealed() && this.scratchedRatio() > 0.45) this.revealScratch();
  }

  private canvasPoint(event: PointerEvent): { x: number; y: number } {
    const canvas = this.scratchCanvas!;
    const r = canvas.getBoundingClientRect();
    return { x: ((event.clientX - r.left) / r.width) * canvas.width, y: ((event.clientY - r.top) / r.height) * canvas.height };
  }

  private scratchAt(a: { x: number; y: number }, b: { x: number; y: number }): void {
    const ctx = this.scratchCanvas?.getContext('2d');
    if (!ctx || !this.scratchCanvas) return;
    const radius = this.scratchCanvas.width * 0.07;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = radius * 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x + 0.01, b.y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  private scratchedRatio(): number {
    const canvas = this.scratchCanvas;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true } as CanvasRenderingContext2DSettings);
    if (!canvas || !ctx) return 0;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * 16) {
      total++;
      if (data[i] < 32) clear++;
    }
    return total ? clear / total : 0;
  }

  private drawScratchCover(): void {
    const canvas = this.scratchCanvas;
    if (!canvas || !this.isBrowser) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 280;
    const h = canvas.clientHeight || 160;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d', { willReadFrequently: true } as CanvasRenderingContext2DSettings);
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, '#c9c3d4');
    g.addColorStop(0.45, '#ece8f2');
    g.addColorStop(0.55, '#d7d1e0');
    g.addColorStop(1, '#a9a1b7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // textura metálica
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 260; i++) {
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2 * dpr, 2 * dpr);
    }
    ctx.fillStyle = '#4b3a63';
    ctx.font = `800 ${Math.round(18 * dpr)}px Montserrat, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.t('scratchCover'), canvas.width / 2, canvas.height / 2 - 8 * dpr);
    ctx.font = `600 ${Math.round(11 * dpr)}px Montserrat, system-ui, sans-serif`;
    ctx.fillStyle = '#5d4d75';
    ctx.fillText('★ ★ ★', canvas.width / 2, canvas.height / 2 + 16 * dpr);
  }

  // ── Fim de jogada, placar e lead ─────────────────────────────────────
  private finishGame(score: number, prize: UgsKey | null): void {
    this.lastScore.set(score);
    this.lastPrize.set(prize);
    this.countPlay();
    this.players.update((list) => {
      const you = list.find((p) => p.you);
      if (!you) return [...list, { name: this.t('lbYou'), score, you: true }];
      return list.map((p) => (p.you ? { ...p, score: Math.max(p.score, score) } : p));
    });
    this.leadName.set('');
    this.leadPhone.set('');
    this.leadConsent.set(false);
    this.leadError.set(false);
    this.leadState.set('form');
    this.cdr.markForCheck();
  }

  private countPlay(): void {
    this.plays.update((n) => n + 1);
  }

  /** Formulário só visual: valida e mostra a confirmação, sem enviar nada a lugar nenhum. */
  submitLead(event: Event): void {
    event.preventDefault();
    if (!this.leadName().trim() || !this.leadConsent()) {
      this.leadError.set(true);
      return;
    }
    this.leadError.set(false);
    this.leads.update((n) => n + 1);
    this.leadState.set('done');
  }

  skipLead(): void {
    this.leadState.set('idle');
  }

  onInput(target: 'name' | 'phone', event: Event): void {
    const value = (event.target as HTMLInputElement).value.slice(0, 60);
    if (target === 'name') this.leadName.set(value);
    else this.leadPhone.set(value.replace(/[^\d()+\s-]/g, ''));
  }

  onConsent(event: Event): void {
    this.leadConsent.set((event.target as HTMLInputElement).checked);
  }

  playerName(p: Player): string {
    return p.you ? this.t('lbYou') : p.name;
  }

  /** Outros visitantes jogando no mesmo evento (simulado) enquanto a vitrine está na tela. */
  private simulateVisitor(): void {
    const name = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
    const score = 300 + Math.round(Math.random() * 13) * 50;
    this.players.update((list) => {
      const found = list.find((p) => !p.you && p.name === name);
      if (found) return list.map((p) => (p === found ? { ...p, score: Math.max(p.score, score) } : p));
      return [...list, { name, score }];
    });
    this.plays.update((n) => n + 1);
    if (Math.random() < 0.4) this.leads.update((n) => n + 1);
    this.ticker.set(this.t('lbJustPlayed', { nome: name }));
    if (this.tickerTimer) clearTimeout(this.tickerTimer);
    this.tickerTimer = setTimeout(() => {
      this.ticker.set(null);
      this.cdr.markForCheck();
    }, 3500);
    this.cdr.markForCheck();
  }

  private setVisible(v: boolean): void {
    if (v === this.visible) return;
    this.visible = v;
    this.syncQuizTimer();
    if (v && !this.reduced) {
      this.simTimer ??= setInterval(() => this.simulateVisitor(), SIM_EVERY_MS);
    } else {
      this.stopSim();
    }
    // o canvas pode ter sido criado com largura 0 antes de aparecer
    if (v && !this.scratchTouched && !this.scratchRevealed()) this.drawScratchCover();
  }

  private stopSim(): void {
    if (this.simTimer) clearInterval(this.simTimer);
    this.simTimer = null;
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(
      setTimeout(() => {
        fn();
        this.cdr.markForCheck();
      }, ms),
    );
  }

  // ── Totens (preço do catálogo da loja, sincronizado com o SGA) ──────
  money(value: number): string {
    return this.i18n.money(value, 0);
  }

  product(item: TotemHighlight) {
    return this.posModal.produtoPorId(item.id);
  }

  totemImage(item: TotemHighlight): string | null {
    const p = this.product(item);
    const img = p?.image;
    // a imagem do catálogo só substitui a foto quando é uma foto de verdade (não o desenho genérico)
    return img && !img.endsWith('.svg') ? img : item.image;
  }

  saleLabel(item: TotemHighlight): string {
    return this.product(item)?.priceSale ?? this.money(item.price);
  }

  rentLabel(item: TotemHighlight): string {
    const p = this.product(item);
    if (p) return p.priceRent;
    return this.t('installments', { n: item.rentInstallments, valor: this.money(item.rentValue) });
  }

  quoteLink(item: TotemHighlight): string {
    const base = this.posModal.whatsappBase();
    const text = encodeURIComponent(this.t('quoteMsg', { nome: this.t(item.name) }));
    return `${base}${base.includes('?') ? '&' : '?'}text=${text}`;
  }

  colon(): string {
    return this.i18n.lang() === 'fr' ? ' :' : ':';
  }
}
