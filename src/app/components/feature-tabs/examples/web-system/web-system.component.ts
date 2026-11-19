import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { I18nService } from '../../../../i18n/i18n.service';
import { I18N } from './web-system.i18n';
import { FeedKind, SECTORS, SECTOR_TEXT, SectorShape, SectorText } from './web-system.sectors';

type Key = keyof (typeof I18N)['pt'];

/** Um evento do feed. O texto é resolvido no idioma atual a partir do índice. */
interface FeedItem {
  id: number;
  sector: number;
  index: number;
  kind: FeedKind;
  value?: number;
  at: Date;
}

interface Kpi {
  label: string;
  value: string;
  delta: string;
  good: boolean;
  up: boolean;
  icon: string;
}

/** Quanto tempo cada setor fica na tela antes de trocar sozinho. */
const SECTOR_MS = 16000;
/** Relógio único do painel: telemetria, feed e rotação andam nele. */
const TICK_MS = 1000;
const TWEEN_MS = 900;
const TYPE_MS = 18;
/** Pausa depois de terminar de escrever uma dica, antes da próxima. */
const TIP_HOLD_MS = 5200;
const DAYS = 30;
const HIST = 28;
/** Geometria do gráfico (o SVG estica na largura; textos ficam no HTML). */
const CW = 600;
const CH = 200;

const FEED_ICON: Record<FeedKind, string> = {
  sale: 'fa-solid fa-sack-dollar',
  booking: 'fa-regular fa-calendar-check',
  ai: 'fa-solid fa-robot',
  pay: 'fa-solid fa-money-bill-transfer',
  alert: 'fa-solid fa-bell',
};
const FEED_LABEL: Record<FeedKind, Key> = { sale: 'kSale', booking: 'kBooking', ai: 'kAi', pay: 'kPay', alert: 'kAlert' };

/** Iniciais e cores dos avatares de quem está online (fictícios). */
const PEOPLE: { i: string; c: string }[] = [
  { i: 'MS', c: '#f99126' },
  { i: 'RT', c: '#a78bfa' },
  { i: 'AL', c: '#38bdf8' },
  { i: 'JP', c: '#34d399' },
  { i: 'CF', c: '#f472b6' },
  { i: 'BN', c: '#facc15' },
];

/** Gerador determinístico: a mesma curva do mesmo setor a cada visita. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Receita diária com ritmo semanal e ruído, acumulada e normalizada para fechar em `total`. */
function revenueSeries(sector: SectorShape): number[] {
  const rnd = prng(sector.seed);
  const daily: number[] = [];
  for (let d = 0; d < DAYS; d++) {
    const weekly = 1 + 0.28 * Math.sin(((d % 7) / 7) * Math.PI * 2 + sector.seed);
    const trend = 0.86 + (d / DAYS) * 0.28;
    daily.push(Math.max(0.15, weekly * trend + (rnd() - 0.5) * 0.5));
  }
  const sum = daily.reduce((a, b) => a + b, 0);
  let acc = 0;
  return daily.map((v) => (acc += (v / sum) * sector.revenue));
}

const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);

/**
 * Painel ao vivo do SGA CTRLB, com dados simulados de vários setores.
 * Troca de setor sozinho; dentro de cada setor os números, o feed, a telemetria
 * e as dicas do copiloto continuam andando enquanto o painel está na tela.
 */
@Component({
  selector: 'app-web-system',
  standalone: true,
  imports: [],
  templateUrl: './web-system.component.html',
  styleUrls: ['./web-system.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebSystemComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);

  readonly sectors = SECTORS;
  readonly people = PEOPLE;
  readonly feedIcon = FEED_ICON;
  readonly feedLabel = FEED_LABEL;
  readonly sectorMs = SECTOR_MS;
  readonly cw = CW;
  readonly ch = CH;

  /** Textos de todos os setores no idioma atual. */
  readonly texts = computed<SectorText[]>(() =>
    this.i18n.pick(SECTOR_TEXT)((v) => this.i18n.money(v, 0)),
  );

  readonly idx = signal(0);
  readonly sector = computed(() => SECTORS[this.idx()]);
  readonly text = computed(() => this.texts()[this.idx()]);
  /** Troca de setor em andamento: o conteúdo some e volta (só opacidade). */
  readonly swapping = signal(false);
  /** Muda a cada setor para reiniciar a barra de progresso do chip. */
  readonly cycle = signal(0);

  // ── estado de reprodução ──
  readonly userPaused = signal(false);
  private readonly hoverPaused = signal(false);
  private readonly visible = signal(false);
  readonly running = computed(() => this.visible() && !this.userPaused());
  readonly rotating = computed(() => this.running() && !this.hoverPaused());

  // ── dados vivos ──
  readonly series = signal<number[]>([]);
  /** KPIs exibidos (interpolados) e os valores de destino. */
  private readonly shown = signal<number[]>([0, 0, 0, 0, 0, 0]);
  private target: number[] = [0, 0, 0, 0, 0, 0];
  readonly feed = signal<FeedItem[]>([]);
  readonly online = signal(0);
  readonly rpm = signal(0);
  readonly rpmHist = signal<number[]>([]);
  readonly p95 = signal(0);
  readonly queue = signal(0);
  readonly clock = signal(new Date());

  // ── copiloto ──
  readonly tipIdx = signal(0);
  readonly typed = signal(0);
  readonly applied = signal<ReadonlySet<number>>(new Set());

  // ── gráfico ──
  readonly hover = signal<number | null>(null);

  private readonly reduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private feedId = 0;
  private feedCursor = 0;
  private tick = 0;
  private sectorElapsed = 0;
  private tickTimer: ReturnType<typeof setInterval> | undefined;
  private typeTimer: ReturnType<typeof setTimeout> | undefined;
  private swapTimer: ReturnType<typeof setTimeout> | undefined;
  private raf = 0;
  private io: IntersectionObserver | null = null;
  private readonly onVisibility = () => this.syncVisible();
  private inView = false;

  constructor() {
    // Quem pede menos movimento vê o painel parado (pode dar play quando quiser).
    if (this.reduced) this.userPaused.set(true);
    this.load(0, false);
  }

  // ── derivados para o template ──

  readonly kpis = computed<Kpi[]>(() => {
    const s = this.sector();
    const tx = this.text();
    const v = this.shown();
    const pct = (n: number) => this.i18n.number(n / 100, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const labels = [this.t('kRevenue'), this.t('kTicket'), tx.newClients, this.t('kConv'), tx.risk, this.t('kNps')];
    const icons = [
      'fa-solid fa-sack-dollar',
      'fa-solid fa-receipt',
      'fa-solid fa-user-plus',
      'fa-solid fa-filter',
      'fa-solid fa-triangle-exclamation',
      'fa-solid fa-face-smile',
    ];
    const values = [
      this.i18n.money(v[0], 0),
      this.i18n.money(v[1], s.ticket < 100 ? 2 : 0),
      this.i18n.number(Math.round(v[2])),
      pct(v[3]),
      pct(v[4]),
      this.i18n.number(Math.round(v[5])),
    ];
    return labels.map((label, i) => {
      const d = s.deltas[i];
      const delta =
        i === 5
          ? this.t('pts', { n: this.i18n.number(d, { signDisplay: 'always' }) })
          : this.i18n.number(d / 100, { style: 'percent', signDisplay: 'always', maximumFractionDigits: 1 });
      return { label, value: values[i], delta, up: d >= 0, good: i === 4 ? d <= 0 : d >= 0, icon: icons[i] };
    });
  });

  /** Escala vertical do gráfico: o maior entre meta e receita, com folga. */
  private readonly yMax = computed(() => {
    const s = this.series();
    return Math.max(this.sector().target, s[s.length - 1] ?? 0) * 1.1;
  });

  private y(v: number): number {
    return CH - (v / this.yMax()) * CH;
  }

  private x(i: number): number {
    return (i / (DAYS - 1)) * CW;
  }

  readonly linePath = computed(() =>
    this.series()
      .map((v, i) => `${i ? 'L' : 'M'}${this.x(i).toFixed(1)},${this.y(v).toFixed(1)}`)
      .join(' '),
  );

  readonly areaPath = computed(() => (this.series().length ? `${this.linePath()} L${CW},${CH} L0,${CH} Z` : ''));

  /** Ritmo da meta: linear do primeiro ao último dia. */
  readonly targetAt = (i: number) => (this.sector().target * (i + 1)) / DAYS;
  readonly targetPath = computed(() => {
    this.yMax();
    return `M0,${this.y(this.targetAt(0)).toFixed(1)} L${CW},${this.y(this.targetAt(DAYS - 1)).toFixed(1)}`;
  });

  /** Linhas de grade em passos "redondos" (1, 2, 2,5 ou 5 × 10ⁿ), com rótulo em moeda compacta. */
  readonly grid = computed(() => {
    const max = this.yMax();
    const raw = max / 4;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = ([1, 2, 2.5, 5, 10].find((m) => m * pow >= raw) ?? 10) * pow;
    const lines: { top: number; label: string }[] = [];
    for (let v = step; v < max; v += step) {
      lines.push({ top: (1 - v / max) * 100, label: this.compactMoney(v) });
    }
    return lines;
  });

  readonly lastPoint = computed(() => {
    const s = this.series();
    const v = s[s.length - 1] ?? 0;
    return { top: (this.y(v) / CH) * 100, pct: this.i18n.number(v / this.sector().target, { style: 'percent', maximumFractionDigits: 0 }) };
  });

  readonly xLabels = computed(() => {
    this.i18n.lang();
    const today = this.clock();
    return [DAYS - 1, 15, 0].map((back) => this.day(today, back));
  });

  readonly hoverInfo = computed(() => {
    const i = this.hover();
    const s = this.series();
    if (i === null || !s.length) return null;
    return {
      left: (i / (DAYS - 1)) * 100,
      top: (this.y(s[i]) / CH) * 100,
      date: this.day(this.clock(), DAYS - 1 - i),
      value: this.i18n.money(s[i], 0),
      target: this.i18n.money(this.targetAt(i), 0),
      /** Tooltip troca de lado na metade direita para não sair do gráfico. */
      flip: i > DAYS / 2,
    };
  });

  /** Tabela acessível: um ponto por dia. */
  readonly tableRows = computed(() => {
    const today = this.clock();
    return this.series().map((v, i) => ({
      day: this.day(today, DAYS - 1 - i),
      value: this.i18n.money(v, 0),
      target: this.i18n.money(this.targetAt(i), 0),
    }));
  });

  readonly funnel = computed(() => {
    const s = this.sector();
    const names = this.text().funnel;
    const first = s.funnel[0];
    return s.funnel.map((n, i) => ({
      name: names[i],
      count: this.i18n.number(n),
      scale: Math.max(0.04, n / first),
      step: i ? this.t('funnelStep', { n: this.i18n.number(n / s.funnel[i - 1], { style: 'percent', maximumFractionDigits: 0 }) }) : '',
    }));
  });

  readonly onlineSplit = computed(() => {
    const team = Math.min(this.sector().team, this.online());
    return this.t('onlineSplit', { team: this.i18n.number(team), clients: this.i18n.number(this.online() - team) });
  });

  readonly extraPeople = computed(() => Math.max(0, this.online() - PEOPLE.length));

  readonly feedView = computed(() => {
    const texts = this.texts();
    this.clock();
    return this.feed().map((f, i) => {
      const raw = texts[f.sector].feed[f.index];
      const value = f.value !== undefined ? this.i18n.money(f.value, f.value % 1 ? 2 : 0) : '';
      return {
        id: f.id,
        kind: f.kind,
        text: raw.replace('{v}', value),
        time: i === 0 ? this.t('now') : this.i18n.date(f.at, { hour: '2-digit', minute: '2-digit' }),
      };
    });
  });

  readonly rpmSpark = computed(() => {
    const h = this.rpmHist();
    if (h.length < 2) return '';
    const min = Math.min(...h) * 0.96;
    const max = Math.max(...h) * 1.02;
    return h
      .map((v, i) => `${i ? 'L' : 'M'}${((i / (HIST - 1)) * 120).toFixed(1)},${(28 - ((v - min) / (max - min || 1)) * 26).toFixed(1)}`)
      .join(' ');
  });

  readonly tips = computed(() => this.text().tips);
  readonly tipText = computed(() => {
    const full = this.tips()[this.tipIdx()] ?? '';
    return this.reduced ? full : full.slice(0, this.typed());
  });
  readonly tipDone = computed(() => this.reduced || this.typed() >= (this.tips()[this.tipIdx()]?.length ?? 0));

  readonly clockLabel = computed(() =>
    this.i18n.date(this.clock(), { weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  );

  // ── ciclo de vida ──

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;
    if (typeof IntersectionObserver === 'undefined') {
      this.inView = true;
      this.syncVisible();
    } else {
      this.io = new IntersectionObserver(
        (entries) => {
          this.inView = entries.some((e) => e.isIntersecting);
          this.syncVisible();
        },
        { threshold: 0.15 },
      );
      this.io.observe(el);
    }
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.stopLive();
    clearTimeout(this.swapTimer);
    cancelAnimationFrame(this.raf);
  }

  // ── ações do usuário ──

  select(i: number): void {
    if (i === this.idx()) return;
    this.swapTo(i);
  }

  onSectorKey(event: KeyboardEvent, i: number): void {
    const last = SECTORS.length - 1;
    let next = i;
    if (event.key === 'ArrowRight') next = i === last ? 0 : i + 1;
    else if (event.key === 'ArrowLeft') next = i === 0 ? last : i - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    this.swapTo(next);
    this.host.nativeElement.querySelectorAll<HTMLElement>('.ld-chip')[next]?.focus();
  }

  togglePlay(): void {
    this.userPaused.update((p) => !p);
    this.syncLive();
  }

  setHoverPause(on: boolean): void {
    this.hoverPaused.set(on);
  }

  onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.host.nativeElement.contains(next)) this.hoverPaused.set(false);
  }

  apply(): void {
    const i = this.tipIdx();
    this.applied.update((s) => new Set(s).add(i));
  }

  nextTip(): void {
    this.showTip((this.tipIdx() + 1) % this.tips().length);
  }

  isApplied(i: number): boolean {
    return this.applied().has(i);
  }

  // ── gráfico: crosshair ──

  onChartMove(event: PointerEvent): void {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    this.hover.set(Math.round(k * (DAYS - 1)));
  }

  onChartKey(event: KeyboardEvent): void {
    const cur = this.hover() ?? DAYS - 1;
    let next = cur;
    if (event.key === 'ArrowRight') next = Math.min(DAYS - 1, cur + 1);
    else if (event.key === 'ArrowLeft') next = Math.max(0, cur - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = DAYS - 1;
    else if (event.key === 'Escape') { this.hover.set(null); return; }
    else return;
    event.preventDefault();
    this.hover.set(next);
  }

  clearHover(): void {
    this.hover.set(null);
  }

  // ── internos ──

  private syncVisible(): void {
    this.visible.set(this.inView && !document.hidden);
    this.syncLive();
  }

  /** Liga ou desliga o relógio e a digitação conforme `running`. */
  private syncLive(): void {
    if (this.running()) {
      if (this.tickTimer === undefined) {
        this.zone.runOutsideAngular(() => {
          this.tickTimer = setInterval(() => this.onTick(), TICK_MS);
        });
      }
      this.scheduleTyping();
    } else {
      this.stopLive();
    }
  }

  private stopLive(): void {
    if (this.tickTimer !== undefined) clearInterval(this.tickTimer);
    this.tickTimer = undefined;
    clearTimeout(this.typeTimer);
    this.typeTimer = undefined;
  }

  private onTick(): void {
    this.tick++;
    this.clock.set(new Date());
    const s = this.sector();

    // telemetria e gente online: a cada 2 s, oscilando em torno da base do setor
    if (this.tick % 2 === 0) {
      const wobble = (base: number, spread: number) => Math.round(base * (1 + (Math.random() - 0.5) * spread));
      this.online.update((n) => Math.max(Math.round(s.online * 0.8), Math.min(Math.round(s.online * 1.2), n + Math.round((Math.random() - 0.45) * 4))));
      const rpm = Math.round(this.rpm() * 0.6 + wobble(s.rpm, 0.22) * 0.4);
      this.rpm.set(rpm);
      this.rpmHist.update((h) => [...h.slice(-(HIST - 1)), rpm]);
      this.p95.set(wobble(s.p95, 0.18));
      this.queue.set(Math.floor(Math.random() * 6));
    }

    // um evento novo no feed a cada 3 s
    if (this.tick % 3 === 0) this.pushFeed();

    // rotação de setor
    if (this.rotating()) {
      this.sectorElapsed += TICK_MS;
      if (this.sectorElapsed >= SECTOR_MS) this.swapTo((this.idx() + 1) % SECTORS.length);
    }
  }

  private pushFeed(): void {
    const s = this.sector();
    const index = this.feedCursor++ % s.feed.length;
    const ev = s.feed[index];
    // pequenas variações para não repetir o mesmo valor exato
    const value = ev.v !== undefined ? Math.round(ev.v * (0.85 + Math.random() * 0.3) * 100) / 100 : undefined;
    this.feed.update((f) => [{ id: ++this.feedId, sector: this.idx(), index, kind: ev.k, value, at: new Date() }, ...f].slice(0, 5));
    if (ev.k === 'sale' && value) {
      // a venda entra na receita: ponta do gráfico sobe e o KPI acompanha
      this.series.update((arr) => {
        const next = arr.slice();
        next[next.length - 1] += value;
        return next;
      });
      const t = this.target.slice();
      t[0] += value;
      this.tweenTo(t);
    }
  }

  /** Troca de setor com um fade curto do conteúdo. */
  private swapTo(i: number): void {
    clearTimeout(this.swapTimer);
    this.sectorElapsed = 0;
    if (this.reduced) {
      this.load(i, false);
      return;
    }
    this.swapping.set(true);
    this.swapTimer = setTimeout(() => {
      this.load(i, true);
      this.swapping.set(false);
    }, 220);
  }

  /** Monta o estado de um setor: série, KPIs, feed inicial, telemetria e dicas. */
  private load(i: number, animate: boolean): void {
    const s = SECTORS[i];
    this.idx.set(i);
    this.cycle.update((n) => n + 1);
    this.hover.set(null);
    this.sectorElapsed = 0;

    const series = revenueSeries(s);
    this.series.set(series);
    const target = [series[series.length - 1], s.ticket, s.newClients, s.conversion, s.risk, s.nps];
    if (animate && !this.reduced) {
      // começa de ~70% para o ticker ter o que contar
      this.shown.set(target.map((v) => v * 0.7));
      this.target = target;
      this.tweenTo(target);
    } else {
      cancelAnimationFrame(this.raf);
      this.target = target;
      this.shown.set(target);
    }

    // feed inicial: os eventos do setor espalhados nos últimos minutos
    const now = Date.now();
    this.feedCursor = 4;
    this.feed.set(
      [0, 1, 2, 3].map((k) => ({
        id: ++this.feedId,
        sector: i,
        index: 3 - k,
        kind: s.feed[3 - k].k,
        value: s.feed[3 - k].v,
        at: new Date(now - k * 4 * 60000),
      })),
    );
    this.online.set(s.online);
    this.rpm.set(s.rpm);
    const rnd = prng(s.seed + 7);
    this.rpmHist.set(Array.from({ length: HIST }, () => Math.round(s.rpm * (0.85 + rnd() * 0.3))));
    this.p95.set(s.p95);
    this.queue.set(2);
    this.applied.set(new Set());
    this.showTip(0);
  }

  private tweenTo(target: number[]): void {
    this.target = target;
    cancelAnimationFrame(this.raf);
    if (this.reduced) {
      this.shown.set(target);
      return;
    }
    const from = this.shown();
    const start = performance.now();
    this.zone.runOutsideAngular(() => {
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / TWEEN_MS);
        const e = easeOut(k);
        this.shown.set(target.map((v, j) => from[j] + (v - from[j]) * e));
        if (k < 1) this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    });
  }

  private showTip(i: number): void {
    clearTimeout(this.typeTimer);
    this.typeTimer = undefined;
    this.tipIdx.set(i);
    this.typed.set(0);
    this.scheduleTyping();
  }

  /** Escreve a dica letra a letra; terminada, espera e passa para a próxima. */
  private scheduleTyping(): void {
    if (this.reduced || !this.running() || this.typeTimer !== undefined) return;
    this.zone.runOutsideAngular(() => {
      const step = () => {
        this.typeTimer = undefined;
        if (!this.running()) return;
        const len = this.tips()[this.tipIdx()]?.length ?? 0;
        if (this.typed() < len) {
          this.typed.update((n) => Math.min(len, n + 2));
          this.typeTimer = setTimeout(step, TYPE_MS);
        } else {
          this.typeTimer = setTimeout(() => {
            this.typeTimer = undefined;
            if (this.running()) this.nextTip();
          }, TIP_HOLD_MS);
        }
      };
      this.typeTimer = setTimeout(step, 400);
    });
  }

  private day(today: Date, back: number): string {
    const d = new Date(today);
    d.setDate(d.getDate() - back);
    return this.i18n.date(d, { day: '2-digit', month: 'short' });
  }

  private compactMoney(v: number): string {
    return this.i18n.number(v, {
      style: 'currency',
      currency: 'BRL',
      currencyDisplay: 'narrowSymbol',
      notation: 'compact',
      maximumFractionDigits: 0,
    });
  }
}
