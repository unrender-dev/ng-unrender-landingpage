import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, NgZone, OnDestroy, OnInit,
  computed, effect, inject, signal, viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faHeartbeat, faWalking, faFire, faClock, faWifi, faTerminal, faBolt,
  faHome, faThermometerHalf, faSun, faArrowLeft, faChartLine, faCog, faCloud, faCamera,
  faLightbulb, faLock, faLockOpen, faCar, faArrowUp, faMinus, faPlus, faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';
import { I18nService, Params } from '../../../../i18n/i18n.service';
import { SimLoop, clamp } from '../infra-shared/sim-loop';
import { I18N } from './custom-systems.i18n';
import { EDGE_SCENE_RATIO, EdgeAiScene, EdgeLabels } from './edge-ai-scene';

type Key = keyof (typeof I18N)['pt'];
type HubTab = 'ev' | 'home' | 'solar' | 'thermostat';

interface LogEntry {
  id: number;
  time: Date;
  /** `cmd` = eco do que o usuário digitou; os demais são traduzidos na hora de exibir. */
  kind: 'cmd' | 'sys' | 'sensor';
  key?: Key;
  raw?: string;
  temp?: number;
  hum?: number;
}

const TIME_HM: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
const TIME_HMS: Intl.DateTimeFormatOptions = { ...TIME_HM, second: '2-digit' };
const ONE_DECIMAL: Intl.NumberFormatOptions = { minimumFractionDigits: 1, maximumFractionDigits: 1 };

@Component({
  selector: 'app-custom-systems',
  standalone: true,
  imports: [FontAwesomeModule, FormsModule],
  templateUrl: './custom-systems.component.html',
  styleUrls: ['./custom-systems.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomSystemsComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() type: 'wearable' | 'embedded' | 'smart-hub' | 'edge-ai' = 'wearable';
  @Input() platform: 'android-wear' | 'apple-watch' = 'android-wear';

  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly zone = inject(NgZone);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly icons = {
    heart: faHeartbeat, walking: faWalking, fire: faFire, clock: faClock, wifi: faWifi,
    terminal: faTerminal, bolt: faBolt, home: faHome, thermo: faThermometerHalf, sun: faSun,
    back: faArrowLeft, chart: faChartLine, cog: faCog, cloud: faCloud, camera: faCamera,
    light: faLightbulb, lock: faLock, lockOpen: faLockOpen, car: faCar, up: faArrowUp,
    minus: faMinus, plus: faPlus, info: faCircleInfo,
  };

  // Relógio de parede (só muda quando vira o minuto).
  private readonly clock = signal(new Date());
  readonly currentTime = computed(() => this.i18n.date(this.clock(), TIME_HM));
  readonly currentDate = computed(() =>
    this.i18n.date(this.clock(), { weekday: 'long', day: 'numeric' }),
  );

  // --- Relógio inteligente ---
  readonly heartRate = signal(72);
  readonly steps = signal(3450);
  readonly calories = signal(120);
  readonly watchViewIndex = signal(0);
  readonly isDragging = signal(false);
  readonly dragOffset = signal(0);
  readonly watchViews: readonly Key[] = ['viewFace', 'viewApps', 'viewHealth'];
  readonly watchTransform = computed(
    () => `translateX(calc(${-this.watchViewIndex() * (100 / 3)}% + ${this.dragOffset()}px))`,
  );
  private touchStartX = 0;
  private stepsF = 3450;
  private caloriesF = 120;
  private autoDir = 1;
  private nextAuto = 4;
  private idleUntil = 0;

  // --- Sistema embarcado ---
  readonly logs = signal<LogEntry[]>([]);
  readonly temperature = signal(24.5);
  readonly humidity = signal(60);
  terminalInput = '';
  private logId = 0;
  private nextSensorLog = 3;
  private rebootTimer?: ReturnType<typeof setTimeout>;

  // --- Central residencial ---
  readonly hubTemp = 16;
  readonly hubHigh = 19;
  readonly hubLow = 10;
  readonly evBattery = 78;
  readonly activeHubTab = signal<HubTab>('ev');
  readonly thermostatTarget = signal(21);
  readonly smartLights = signal(true);
  readonly smartLock = signal(true);
  readonly solarGeneration = signal(4.2);
  readonly homeConsumption = signal(2.8);
  readonly hubTabs: readonly { id: HubTab; label: Key; icon: typeof faBolt }[] = [
    { id: 'ev', label: 'cardEv', icon: faBolt },
    { id: 'home', label: 'cardHome', icon: faHome },
    { id: 'solar', label: 'cardSolar', icon: faSun },
    { id: 'thermostat', label: 'cardThermo', icon: faThermometerHalf },
  ];

  // --- Edge AI ---
  readonly inferenceMs = signal(12.4);
  readonly inScene = signal(0);
  readonly counted = signal(1284);
  readonly rejected = signal(37);
  private readonly edgeCanvas = viewChild<ElementRef<HTMLCanvasElement>>('edgeCanvas');
  private readonly scene = new EdgeAiScene();
  private edgeLabels: EdgeLabels = this.buildLabels();
  private ctx: CanvasRenderingContext2D | null = null;
  private cssW = 0;
  private dpr = 1;
  private ro?: ResizeObserver;

  private loop?: SimLoop;
  private publishAcc = 0;
  private lastMinute = -1;

  constructor() {
    // Rótulos desenhados no canvas acompanham a troca de idioma.
    effect(() => {
      this.i18n.lang();
      this.edgeLabels = this.buildLabels();
      this.loop?.redraw();
    });
  }

  private buildLabels(): EdgeLabels {
    const percent = new Map<number, string>();
    return {
      box: this.t('clsBox'),
      envelope: this.t('clsEnvelope'),
      crate: this.t('clsCrate'),
      damaged: this.t('clsDamaged'),
      line: this.t('countLine'),
      percent: (v) => {
        let s = percent.get(v);
        if (!s) percent.set(v, (s = this.i18n.number(v, { style: 'percent' })));
        return s;
      },
    };
  }

  ngOnInit(): void {
    if (this.type === 'embedded') this.addLog({ kind: 'sys', key: 'logBoot' });
  }

  ngAfterViewInit(): void {
    if (this.type === 'edge-ai') this.setupCanvas();
    this.loop = new SimLoop(this.host.nativeElement, this.zone, (t, dt) => this.frame(t, dt), 6);
    this.loop.start();
  }

  ngOnDestroy(): void {
    this.loop?.destroy();
    this.ro?.disconnect();
    clearTimeout(this.rebootTimer);
  }

  // --- Formatação ---
  num(v: number): string {
    return this.i18n.number(v);
  }
  num1(v: number): string {
    return this.i18n.number(v, ONE_DECIMAL);
  }
  pct(v: number): string {
    return this.i18n.number(v, { style: 'percent', maximumFractionDigits: 0 });
  }
  logTime(e: LogEntry): string {
    return this.i18n.date(e.time, TIME_HMS);
  }
  logText(e: LogEntry): string {
    if (e.kind === 'cmd') return `> ${e.raw}`;
    if (e.kind === 'sensor') {
      return `[${this.t('sensorTag')}] ${this.t('logSensor', { temp: this.num1(e.temp ?? 0), hum: this.pct((e.hum ?? 0) / 100) })}`;
    }
    const params: Params =
      e.key === 'logStatus' ? { cpu: this.pct(0.12), mem: this.pct(0.45) } : { cmd: e.raw ?? '' };
    return `[${this.t('sysTag')}] ${this.t(e.key!, params)}`;
  }

  // --- Laço de simulação (fora da NgZone) ---
  private frame(t: number, dt: number): void {
    const minute = Math.floor(Date.now() / 60000);
    if (minute !== this.lastMinute) {
      this.lastMinute = minute;
      this.clock.set(new Date());
    }

    if (this.type === 'edge-ai') {
      const stats = this.ctx && this.cssW ? this.scene.draw(this.ctx, this.cssW, this.dpr, t, this.edgeLabels) : null;
      if (stats && this.due(dt, 0.25)) {
        this.inScene.set(stats.inScene);
        this.counted.set(stats.counted);
        this.rejected.set(stats.rejected);
        this.inferenceMs.set(12.4 + 1.5 * Math.sin(t * 0.9) + 0.8 * Math.sin(t * 2.3 + 1));
      }
      return;
    }

    if (this.type === 'wearable') {
      this.stepsF += dt * 1.6;
      this.caloriesF += dt * 0.07;
      if (!this.loop?.reduced && !this.isDragging() && t >= this.idleUntil && t >= this.nextAuto) {
        // Modo vitrine: percorre as telas em vai-e-vem até o usuário assumir.
        const i = this.watchViewIndex();
        if (i + this.autoDir < 0 || i + this.autoDir > 2) this.autoDir = -this.autoDir;
        this.watchViewIndex.set(i + this.autoDir);
        this.nextAuto = t + 4.5;
      }
      if (this.due(dt, 0.5)) {
        this.heartRate.set(Math.round(74 + 5 * Math.sin(t * 0.35) + 2 * Math.sin(t * 1.3)));
        this.steps.set(Math.floor(this.stepsF));
        this.calories.set(Math.floor(this.caloriesF));
      }
    } else if (this.type === 'embedded') {
      if (this.due(dt, 0.5)) {
        this.temperature.set(24.5 + 0.4 * Math.sin(t * 0.21) + 0.12 * Math.sin(t * 0.9));
        this.humidity.set(60 + 1.5 * Math.sin(t * 0.13 + 1));
      }
      if (t >= this.nextSensorLog) {
        this.nextSensorLog = t + 6;
        this.addLog({ kind: 'sensor', temp: this.temperature(), hum: this.humidity() });
      }
    } else if (this.due(dt, 0.5)) {
      this.solarGeneration.set(4.2 + 0.9 * Math.sin(t * 0.17) + 0.3 * Math.sin(t * 0.53 + 2));
      this.homeConsumption.set(2.8 + 0.5 * Math.sin(t * 0.11 + 1) + 0.15 * Math.sin(t * 0.71));
    }
  }

  /** Limita as atualizações de texto a uma cadência legível. */
  private due(dt: number, every: number): boolean {
    this.publishAcc += dt;
    if (this.publishAcc < every) return false;
    this.publishAcc = 0;
    return true;
  }

  private setupCanvas(): void {
    const canvas = this.edgeCanvas()?.nativeElement;
    if (!canvas) return;
    this.ctx = canvas.getContext('2d');
    const resize = () => {
      const w = canvas.clientWidth;
      if (!w) return;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cssW = w;
      canvas.width = Math.round(w * this.dpr);
      canvas.height = Math.round((w / EDGE_SCENE_RATIO) * this.dpr);
      this.loop?.redraw();
    };
    resize();
    if (typeof ResizeObserver !== 'undefined') {
      this.zone.runOutsideAngular(() => {
        this.ro = new ResizeObserver(resize);
        this.ro.observe(canvas);
      });
    }
  }

  // --- Relógio: arrastar para trocar de tela ---
  onPointerDown(e: PointerEvent): void {
    this.isDragging.set(true);
    this.touchStartX = e.clientX;
    this.dragOffset.set(0);
    this.holdAutoplay();
  }

  onPointerMove(e: PointerEvent): void {
    if (this.isDragging()) this.dragOffset.set(e.clientX - this.touchStartX);
  }

  onPointerUp(): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    const offset = this.dragOffset();
    const i = this.watchViewIndex();
    if (offset < -50 && i < 2) this.watchViewIndex.set(i + 1);
    else if (offset > 50 && i > 0) this.watchViewIndex.set(i - 1);
    this.dragOffset.set(0);
  }

  setWatchView(index: number): void {
    this.watchViewIndex.set(clamp(index, 0, 2));
    this.holdAutoplay();
  }

  toggleWatchView(): void {
    this.setWatchView(this.watchViewIndex() === 0 ? 1 : 0);
  }

  /** O usuário assumiu: a vitrine só volta depois de um tempo sem interação. */
  private holdAutoplay(): void {
    this.idleUntil = (this.loop?.now() ?? 0) + 10;
    this.nextAuto = this.idleUntil;
  }

  // --- Terminal ---
  handleTerminalInput(event: Event): void {
    event.preventDefault();
    const raw = this.terminalInput.trim();
    if (!raw) return;
    this.addLog({ kind: 'cmd', raw });
    const cmd = raw.toLowerCase();
    if (cmd === 'help') this.addLog({ kind: 'sys', key: 'logHelp' });
    else if (cmd === 'clear') this.logs.set([]);
    else if (cmd === 'status') this.addLog({ kind: 'sys', key: 'logStatus' });
    else if (cmd === 'reboot') {
      this.addLog({ kind: 'sys', key: 'logReboot' });
      clearTimeout(this.rebootTimer);
      this.rebootTimer = setTimeout(() => this.addLog({ kind: 'sys', key: 'logReady' }), 1200);
    } else this.addLog({ kind: 'sys', key: 'logUnknown', raw: cmd });
    this.terminalInput = '';
  }

  private addLog(entry: Omit<LogEntry, 'id' | 'time'>): void {
    const next = [...this.logs(), { ...entry, id: ++this.logId, time: new Date() }];
    this.logs.set(next.slice(-8));
  }

  // --- Central residencial ---
  setHubTab(tab: HubTab): void {
    this.activeHubTab.set(tab);
  }
  toggleLight(): void {
    this.smartLights.update((v) => !v);
  }
  toggleLock(): void {
    this.smartLock.update((v) => !v);
  }
  adjustTemp(delta: number): void {
    this.thermostatTarget.update((v) => clamp(v + delta, 16, 30));
  }
}
