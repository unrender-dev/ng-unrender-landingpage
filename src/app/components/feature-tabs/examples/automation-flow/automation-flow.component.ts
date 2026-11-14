import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, QueryList, ViewChild, ViewChildren, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { I18nService } from '../../../../i18n/i18n.service';
import { AfKey, I18N } from './automation-flow.i18n';

type NodeId = 'wa' | 'site' | 'pay' | 'ia' | 'crm' | 'agenda' | 'fin' | 'sup' | 'team';
type Kind = 'trigger' | 'ai' | 'action' | 'end';

interface FlowNode {
  id: NodeId; icon: string; color: string; kind: Kind;
  /** posição no layout horizontal (820×380) e no vertical (340×500), usado em telas estreitas */
  wide: [number, number];
  tall: [number, number];
}
interface Edge { id: string; from: NodeId; to: NodeId; d: string; }
interface LogLine { id: number; at: Date; who: () => string; text: () => string; color: string; }
interface Run { n: 1 | 2 | 3 | 4; trigger: NodeId; branch: NodeId; conf: number; value?: number; }

const WIDE = { w: 820, h: 380 };
const TALL = { w: 340, h: 500 };

const NODES: FlowNode[] = [
  { id: 'wa', icon: 'fa-brands fa-whatsapp', color: '#25d366', kind: 'trigger', wide: [100, 70], tall: [58, 44] },
  { id: 'site', icon: 'fa-solid fa-globe', color: '#0ea5e9', kind: 'trigger', wide: [100, 190], tall: [170, 44] },
  { id: 'pay', icon: 'fa-brands fa-pix', color: '#32bcad', kind: 'trigger', wide: [100, 310], tall: [282, 44] },
  { id: 'ia', icon: 'fa-solid fa-brain', color: '#f99126', kind: 'ai', wide: [325, 190], tall: [170, 180] },
  { id: 'crm', icon: 'fa-solid fa-filter-circle-dollar', color: '#6366f1', kind: 'action', wide: [550, 52], tall: [44, 326] },
  { id: 'agenda', icon: 'fa-regular fa-calendar-check', color: '#a855f7', kind: 'action', wide: [550, 145], tall: [128, 326] },
  { id: 'fin', icon: 'fa-solid fa-file-invoice-dollar', color: '#22c55e', kind: 'action', wide: [550, 238], tall: [212, 326] },
  { id: 'sup', icon: 'fa-solid fa-headset', color: '#ef4444', kind: 'action', wide: [550, 330], tall: [296, 326] },
  { id: 'team', icon: 'fa-solid fa-users', color: '#f99126', kind: 'end', wide: [735, 190], tall: [170, 456] },
];

const LINKS: [NodeId, NodeId][] = [
  ['wa', 'ia'], ['site', 'ia'], ['pay', 'ia'],
  ['ia', 'crm'], ['crm', 'team'], ['ia', 'agenda'], ['agenda', 'team'],
  ['ia', 'fin'], ['fin', 'team'], ['ia', 'sup'], ['sup', 'team'],
];

const RUNS: Run[] = [
  { n: 1, trigger: 'wa', branch: 'crm', conf: 97, value: 2450 },
  { n: 2, trigger: 'site', branch: 'agenda', conf: 95 },
  { n: 3, trigger: 'pay', branch: 'fin', conf: 100, value: 389 },
  { n: 4, trigger: 'wa', branch: 'sup', conf: 93 },
];

/**
 * Fluxo de automação inteligente: gatilho → IA → ação no módulo certo → equipe avisada.
 * O "pacote" percorre as conexões de verdade (SVG) e o console mostra o log da execução.
 */
@Component({
  selector: 'app-automation-flow',
  standalone: true,
  imports: [NgClass],
  template: `
  <div class="af rounded-2xl p-3 md:p-5" [class.tall]="tall" [class.paused]="!visible">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
      <div class="min-w-0">
        <div class="text-[10px] uppercase tracking-widest text-unrender-accent font-bold">{{ t('tag') }}</div>
        <div class="text-white font-bold md:text-lg leading-tight">{{ t('title') }}</div>
      </div>
      <button type="button" class="fire" (click)="fire(true)" [disabled]="running">
        <i class="fa-solid fa-bolt" [class.zap]="running" aria-hidden="true"></i> {{ t('fire') }}
      </button>
    </div>

    <div class="canvas" [style.aspect-ratio]="w + ' / ' + h" role="img" [attr.aria-label]="t('diagram')">
      <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" class="edges" aria-hidden="true">
        @for (e of edges; track e.id) {
        <path [attr.d]="e.d" class="edge" />
        <path [attr.d]="e.d" class="edge-hot" [class.on]="hot.has(e.id)" pathLength="1" #hotPath />
        }
        <g #packet class="packet-g" [class.show]="packetOn">
          <circle r="15" class="packet-halo" /><circle r="7" class="packet" />
        </g>
      </svg>

      @for (n of nodes; track n.id) {
      <div class="node" [ngClass]="n.kind" [class.lit]="lit.has(n.id)"
           [style.left.%]="pos(n)[0] / w * 100" [style.top.%]="pos(n)[1] / h * 100" aria-hidden="true">
        <span class="n-ico" [style.background]="n.color"><i [class]="n.icon"></i></span>
        <span class="n-txt"><b>{{ label(n.id) }}</b><small>{{ sub(n.id) }}</small></span>
        @if (n.kind === 'ai') { <span class="thinking" [class.on]="lit.has('ia')"></span> }
      </div>
      }
    </div>

    <div class="grid md:grid-cols-[minmax(0,1fr)_200px] gap-3 mt-3">
      <div class="console min-w-0">
        <div class="c-head"><span class="cd r"></span><span class="cd y"></span><span class="cd g"></span><span class="ml-2">{{ t('logTitle') }}</span></div>
        <div class="c-body" role="log" aria-live="off">
          @for (l of log; track l.id) {
          <div class="c-line"><span class="t">{{ time(l.at) }}</span> <span [style.color]="l.color" class="font-bold">[{{ l.who() }}]</span> {{ l.text() }}</div>
          }
          <span class="c-caret" aria-hidden="true"></span>
        </div>
      </div>
      <div class="grid grid-cols-3 md:grid-cols-1 gap-2">
        <div class="kpi"><strong>{{ i18n.number(runs) }}</strong><span>{{ t('kpiRuns') }}</span></div>
        <div class="kpi"><strong>{{ t('seconds', { n: i18n.number(avg, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }) }}</strong><span>{{ t('kpiAvg') }}</span></div>
        <div class="kpi"><strong>{{ t('hours', { n: hours }) }}</strong><span>{{ t('kpiHours') }}</span></div>
      </div>
    </div>
    <p class="demo-note"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> {{ t('demoNote') }}</p>
  </div>
  `,
  styles: [`
    :host { display:block; min-width: 0; }
    .af { background: radial-gradient(120% 140% at 0% 0%, #2a1146 0%, #10051c 55%, #0a0311 100%); border:1px solid rgba(249,145,38,.25); }
    .fire { display:inline-flex; align-items:center; gap:8px; min-height: 40px; padding:8px 16px; border-radius:999px; background:#f99126; color:#10051c; font-weight:800; font-size:12px; transition: transform .15s, opacity .25s, box-shadow .2s; }
    .fire:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(249,145,38,.4); }
    .fire:active:not(:disabled) { transform: scale(.96); }
    .fire:disabled { opacity: .55; cursor: progress; }
    .fire:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    .fire .zap { animation: afZap .7s ease-in-out infinite alternate; }
    @keyframes afZap { from { opacity: .45; transform: scale(.9); } to { opacity: 1; transform: scale(1.1); } }
    @media (pointer: coarse) { .fire { min-height: 44px; } }

    .canvas { position:relative; width:100%; container-type: inline-size;
      background-image: radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px); background-size: 18px 18px; border-radius: 14px; }
    .edges { position:absolute; inset:0; width:100%; height:100%; overflow: visible; }
    /* tracejado correndo em loop: o deslocamento é exatamente um período (5 + 6), então não há emenda */
    .edge { fill:none; stroke: rgba(255,255,255,.16); stroke-width: 2; stroke-dasharray: 5 6; animation: afFlow 1.3s linear infinite; }
    @keyframes afFlow { to { stroke-dashoffset: -11; } }
    .edge-hot { fill:none; stroke:#f99126; stroke-width: 2.6; stroke-linecap: round; stroke-dasharray: 1 1; stroke-dashoffset: 1; opacity: 0; transition: opacity .6s ease; filter: drop-shadow(0 0 4px rgba(249,145,38,.8)); }
    .edge-hot.on { opacity: 1; transition-duration: .15s; }
    .packet-g { opacity: 0; transition: opacity .35s ease; }
    .packet-g.show { opacity: 1; }
    .packet { fill:#fff; filter: drop-shadow(0 0 6px #f99126); }
    .packet-halo { fill: rgba(249,145,38,.25); transform-box: fill-box; transform-origin: center; animation: afHalo 1s ease-in-out infinite alternate; }
    @keyframes afHalo { from { transform: scale(.75); } to { transform: scale(1.1); } }
    .paused .edge, .paused .packet-halo, .paused .thinking, .paused .c-caret { animation-play-state: paused; }

    .node { position:absolute; transform: translate(-50%, -50%); display:flex; align-items:center; gap:8px; padding: 7px 10px 7px 7px; border-radius: 12px; background: rgba(20,10,35,.94); border:1px solid rgba(255,255,255,.1); color:#fff; white-space:nowrap; transition: border-color .35s, box-shadow .35s, transform .45s cubic-bezier(.2,1.5,.4,1); box-shadow: 0 6px 18px rgba(0,0,0,.3); }
    .node.lit { border-color:#f99126; box-shadow: 0 0 0 3px rgba(249,145,38,.25), 0 0 24px rgba(249,145,38,.45); transform: translate(-50%, -50%) scale(1.06); }
    .node.ai { padding: 10px 14px 10px 10px; border-color: rgba(249,145,38,.5); }
    .n-ico { width: 28px; height: 28px; border-radius: 8px; display:flex; align-items:center; justify-content:center; font-size: 13px; color:#fff; flex-shrink:0; }
    .n-txt b { display:block; font-size: clamp(10.5px, 1.5cqw, 12px); line-height:1.1; }
    .n-txt small { display:block; font-size: clamp(9px, 1.25cqw, 10px); color: rgba(255,255,255,.55); }
    .thinking { position:absolute; inset:-6px; border-radius: 16px; border: 2px solid transparent; border-top-color:#f99126; border-right-color:#f99126; opacity: 0; transition: opacity .3s; animation: afSpin 1s linear infinite; }
    .thinking.on { opacity: 1; }
    @keyframes afSpin { to { transform: rotate(360deg); } }

    /* layout vertical (telas estreitas): nós empilham ícone + rótulo e cabem em 328 px */
    .tall .node { flex-direction: column; gap: 4px; padding: 6px 7px; text-align:center; white-space: normal; width: max-content; max-width: 32cqw; }
    .tall .node.action { max-width: 24.5cqw; padding: 6px 4px; }
    .tall .node.action small { display:none; }
    .tall .node.ai { padding: 8px 12px; }
    .tall .n-txt b { font-size: 10.5px; overflow-wrap: break-word; }
    .tall .node.action .n-txt b { font-size: 10px; }
    .tall .n-txt small { font-size: 9px; line-height: 1.15; }

    .console { background:#07020d; border:1px solid rgba(255,255,255,.08); border-radius: 12px; overflow:hidden; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .c-head { display:flex; align-items:center; gap:5px; padding: 6px 10px; font-size:10px; color: rgba(255,255,255,.4); background: rgba(255,255,255,.04); }
    .cd { width:8px; height:8px; border-radius:50%; } .cd.r { background:#ff5f57; } .cd.y { background:#febc2e; } .cd.g { background:#28c840; }
    .c-body { padding: 8px 10px; height: 148px; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-end; font-size: 11px; line-height: 1.45; color: rgba(255,255,255,.8);
      -webkit-mask-image: linear-gradient(transparent, #000 26px); mask-image: linear-gradient(transparent, #000 26px); }
    .c-line { animation: afLine .35s ease-out; overflow-wrap: anywhere; flex-shrink: 0; }
    .c-line .t { color: rgba(255,255,255,.35); }
    @keyframes afLine { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform:none; } }
    .c-caret { display:inline-block; width:7px; height:12px; background:#f99126; animation: afBlink 1s steps(1) infinite; margin-top:2px; flex-shrink: 0; }
    @keyframes afBlink { 50% { opacity:0; } }
    .kpi { background: rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.07); border-radius: 12px; padding: 8px 10px; min-width: 0; }
    .kpi strong { display:block; color:#f99126; font-size: 18px; line-height:1.1; }
    .kpi span { display:block; color: rgba(255,255,255,.6); font-size: 10px; line-height: 1.25; overflow-wrap: break-word; }
    .tall .kpi { padding: 8px; }
    .tall .kpi strong { font-size: 16px; }
    .tall .kpi span { font-size: 9.5px; }
    .demo-note { margin: 10px 0 0; font-size: 11px; color: rgba(255,255,255,.45); }
    @media (prefers-reduced-motion: reduce) {
      .edge, .packet-halo, .thinking, .c-caret, .c-line, .fire .zap { animation: none; }
      .node, .edge-hot, .packet-g { transition: none; }
    }
  `],
})
export class AutomationFlowComponent implements AfterViewInit, OnDestroy {
  @ViewChild('packet') packet?: ElementRef<SVGGElement>;
  @ViewChildren('hotPath') hotPaths?: QueryList<ElementRef<SVGPathElement>>;

  readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  readonly t = this.i18n.scope(I18N);

  readonly nodes = NODES;
  tall = false;
  w = WIDE.w;
  h = WIDE.h;
  edges: Edge[] = [];
  hot = new Set<string>();
  lit = new Set<NodeId>();
  log: LogLine[] = [];
  running = false;
  packetOn = false;
  visible = false;
  runs = 1284;
  avg = 1.4;
  hours = 212;

  private runIndex = 0;
  private logId = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private raf = 0;
  private layoutRaf = 0;
  private reduced = false;
  private io?: IntersectionObserver;
  private ro?: ResizeObserver;

  constructor() {
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.layout(false);
    this.addLog(() => this.t('whoSystem'), () => this.t('ready'), '#94a3b8');
  }

  label(id: NodeId): string { return this.t(('n_' + id) as AfKey); }
  sub(id: NodeId): string { return this.t(('s_' + id) as AfKey); }
  pos(n: FlowNode): [number, number] { return this.tall ? n.tall : n.wide; }
  time(d: Date): string { return this.i18n.date(d, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }); }

  ngAfterViewInit(): void {
    // primeira medida já no layout certo, para não piscar o diagrama horizontal no celular
    const width = this.host.nativeElement.clientWidth;
    if (width > 0 && width < 680) { this.layout(true); this.cdr.detectChanges(); }
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(entries => {
        const tall = entries[0].contentRect.width < 680;
        if (tall === this.tall) return;
        // troca no quadro seguinte: mudar a altura dentro do callback gera "ResizeObserver loop" no console
        cancelAnimationFrame(this.layoutRaf);
        this.layoutRaf = requestAnimationFrame(() => this.zone.run(() => {
          if (tall === this.tall) return;
          this.reset();
          this.layout(tall);
          this.cdr.detectChanges();
          this.loop();
        }));
      });
      this.ro.observe(this.host.nativeElement);
    }
    if (typeof IntersectionObserver === 'undefined') { this.visible = true; this.loop(); return; }
    this.io = new IntersectionObserver(es => {
      const v = es.some(e => e.isIntersecting);
      if (v === this.visible) return;
      this.zone.run(() => {
        this.visible = v;
        if (v) this.loop(); else this.reset();
        this.cdr.markForCheck();
      });
    }, { threshold: 0.3 });
    this.io.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void { this.clear(); cancelAnimationFrame(this.layoutRaf); this.io?.disconnect(); this.ro?.disconnect(); }

  fire(manual = false) {
    if (this.running) return;
    if (manual) this.clear();
    this.running = true;
    const run = RUNS[this.runIndex++ % RUNS.length];
    const trig = NODES.find(n => n.id === run.trigger)!;
    const branch = NODES.find(n => n.id === run.branch)!;
    const params = () => (run.value ? { valor: this.i18n.money(run.value) } : undefined);
    const key = (suffix: string) => (`r${run.n}_${suffix}`) as AfKey;
    this.hot.clear(); this.lit.clear();

    let t = 0;
    this.at(t, () => {
      this.lit.add(trig.id);
      this.placePacket(trig);
      this.addLog(() => this.t('whoTrigger'), () => `${this.label(trig.id)}: ${this.t(key('input'), params())}`, trig.color);
    });
    t += 600;
    this.at(t, () => { this.packetOn = true; this.travel(`${trig.id}-ia`, 750); });
    t += 800;
    this.at(t, () => { this.lit.add('ia'); this.addLog(() => this.t('whoAi'), () => this.t('reading'), '#f99126'); });
    t += 1100;
    this.at(t, () => this.addLog(() => this.t('whoAi'), () => this.t('intent', { intent: this.t(key('intent')), conf: run.conf }), '#f99126'));
    t += 500;
    this.at(t, () => { this.lit.delete('ia'); this.travel(`ia-${branch.id}`, 750); });
    t += 800;
    this.at(t, () => {
      this.lit.add(branch.id);
      this.addLog(() => this.label(branch.id).toLocaleLowerCase(this.i18n.locale()), () => this.t(key('result'), params()), branch.color);
    });
    t += 900;
    this.at(t, () => this.travel(`${branch.id}-team`, 650));
    t += 700;
    this.at(t, () => {
      this.lit.add('team');
      this.packetOn = false;
      this.addLog(() => this.t('whoTeam'), () => this.t('notified', { who: this.t(key('notify')) }), '#e2e8f0');
      this.runs++;
      this.avg = 1 + Math.random() * 0.8;
      this.hours = this.hours + (Math.random() > 0.5 ? 1 : 0);
    });
    t += 1300;
    // fim da execução: destaques apagam com transição, sem zerar a cena de repente
    this.at(t, () => { this.running = false; this.hot.clear(); this.lit.clear(); });
    if (manual && !this.reduced) this.at(t + 4000, () => this.loop());
  }

  private loop() {
    if (!this.visible || this.reduced) return;
    this.fire();
    this.at(9500, () => this.loop());
  }

  /** Troca entre o layout horizontal e o vertical e recalcula as conexões. */
  private layout(tall: boolean) {
    this.tall = tall;
    const size = tall ? TALL : WIDE;
    this.w = size.w;
    this.h = size.h;
    const at = (id: NodeId) => { const n = NODES.find(x => x.id === id)!; return tall ? n.tall : n.wide; };
    this.edges = LINKS.map(([a, b]) => {
      const [x1, y1] = at(a), [x2, y2] = at(b);
      const d = tall
        ? `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`
        : `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`;
      return { id: `${a}-${b}`, from: a, to: b, d };
    });
  }

  private placePacket(n: FlowNode) {
    const [x, y] = this.pos(n);
    this.packet?.nativeElement.setAttribute('transform', `translate(${x} ${y})`);
  }

  /** Leva o pacote ao longo da conexão e "acende" o trecho já percorrido, no mesmo relógio. */
  private travel(edgeId: string, ms: number) {
    const idx = this.edges.findIndex(e => e.id === edgeId);
    const path = this.hotPaths?.get(idx)?.nativeElement;
    const g = this.packet?.nativeElement;
    if (!path || !g) return;
    cancelAnimationFrame(this.raf);
    path.style.strokeDashoffset = '1';
    this.hot.add(edgeId);
    const len = path.getTotalLength();
    const move = (e: number) => {
      const pt = path.getPointAtLength(len * e);
      g.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      path.style.strokeDashoffset = (1 - e).toFixed(4);
    };
    if (this.reduced) { move(1); return; }
    this.zone.runOutsideAngular(() => {
      const start = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / ms);
        move(k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
        if (k < 1) this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    });
  }

  private addLog(who: () => string, text: () => string, color: string) {
    this.log = [...this.log, { id: ++this.logId, at: new Date(), who, text, color }].slice(-8);
  }

  private at(ms: number, fn: () => void) {
    this.timers.push(setTimeout(() => { fn(); this.cdr.markForCheck(); }, ms));
  }

  /** Saiu da tela: para tudo e deixa a cena em repouso para recomeçar limpa ao voltar. */
  private reset() {
    this.clear();
    this.running = false;
    this.packetOn = false;
    this.hot.clear();
    this.lit.clear();
  }

  private clear() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    cancelAnimationFrame(this.raf);
  }
}
