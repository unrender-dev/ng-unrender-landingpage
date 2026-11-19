import {
  AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, QueryList, ViewChild, ViewChildren, computed, inject,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { I18nService } from '../../../../i18n/i18n.service';
import { AfKey, I18N, RUN_TEXT, RunText } from './automation-flow.i18n';

type TriggerId = 'wa' | 'ig' | 'site' | 'link' | 'pay' | 'gate' | 'sched' | 'mail';
type ModuleId = 'crm' | 'agenda' | 'fin' | 'flows' | 'pdv' | 'stock' | 'ticket' | 'legal' | 'docs' | 'copilot';
type OutputId = 'client' | 'team' | 'dash';
type NodeId = TriggerId | 'ia' | ModuleId | OutputId;
type Kind = 'trigger' | 'ai' | 'module' | 'output';

interface FlowNode { id: NodeId; icon: string; color: string; kind: Kind; }
interface PlacedNode extends FlowNode { x: number; y: number; }
interface Edge { id: string; d: string; kind: 'in' | 'out' | 'end'; }
interface LogLine { id: number; at: Date; who: () => string; text: () => string; color: string; }
interface Lane { key: AfKey; x: number; y: number; }

/** Esqueleto de uma execução de exemplo; os textos vêm de RUN_TEXT, na mesma ordem. */
interface RunShape { icon: string; trigger: TriggerId; conf: number; modules: ModuleId[]; outputs: OutputId[]; }

const TRIGGERS: FlowNode[] = [
  { id: 'wa', icon: 'fa-brands fa-whatsapp', color: '#25d366', kind: 'trigger' },
  { id: 'ig', icon: 'fa-brands fa-instagram', color: '#e1306c', kind: 'trigger' },
  { id: 'site', icon: 'fa-solid fa-globe', color: '#0ea5e9', kind: 'trigger' },
  { id: 'link', icon: 'fa-solid fa-link', color: '#8b5cf6', kind: 'trigger' },
  { id: 'pay', icon: 'fa-brands fa-pix', color: '#32bcad', kind: 'trigger' },
  { id: 'gate', icon: 'fa-solid fa-face-smile', color: '#14b8a6', kind: 'trigger' },
  { id: 'sched', icon: 'fa-regular fa-clock', color: '#f59e0b', kind: 'trigger' },
  { id: 'mail', icon: 'fa-solid fa-envelope', color: '#64748b', kind: 'trigger' },
];
const AI: FlowNode = { id: 'ia', icon: 'fa-solid fa-brain', color: '#f99126', kind: 'ai' };
const MODULES: FlowNode[] = [
  { id: 'crm', icon: 'fa-solid fa-filter-circle-dollar', color: '#6366f1', kind: 'module' },
  { id: 'agenda', icon: 'fa-regular fa-calendar-check', color: '#a855f7', kind: 'module' },
  { id: 'fin', icon: 'fa-solid fa-sack-dollar', color: '#22c55e', kind: 'module' },
  { id: 'flows', icon: 'fa-solid fa-bullhorn', color: '#ec4899', kind: 'module' },
  { id: 'pdv', icon: 'fa-solid fa-cash-register', color: '#f97316', kind: 'module' },
  { id: 'stock', icon: 'fa-solid fa-boxes-stacked', color: '#eab308', kind: 'module' },
  { id: 'ticket', icon: 'fa-solid fa-headset', color: '#ef4444', kind: 'module' },
  { id: 'legal', icon: 'fa-solid fa-scale-balanced', color: '#0ea5e9', kind: 'module' },
  { id: 'docs', icon: 'fa-solid fa-file-signature', color: '#06b6d4', kind: 'module' },
  { id: 'copilot', icon: 'fa-solid fa-wand-magic-sparkles', color: '#f99126', kind: 'module' },
];
const OUTPUTS: FlowNode[] = [
  { id: 'client', icon: 'fa-solid fa-comment-dots', color: '#25d366', kind: 'output' },
  { id: 'team', icon: 'fa-solid fa-users', color: '#f99126', kind: 'output' },
  { id: 'dash', icon: 'fa-solid fa-chart-line', color: '#38bdf8', kind: 'output' },
];

const RUNS: RunShape[] = [
  { icon: 'fa-solid fa-dumbbell', trigger: 'wa', conf: 96, modules: ['crm', 'flows'], outputs: ['client', 'team'] },
  { icon: 'fa-solid fa-tooth', trigger: 'sched', conf: 99, modules: ['agenda', 'flows'], outputs: ['client', 'dash'] },
  { icon: 'fa-solid fa-pizza-slice', trigger: 'ig', conf: 98, modules: ['pdv', 'fin', 'stock'], outputs: ['client', 'team'] },
  { icon: 'fa-solid fa-scale-balanced', trigger: 'mail', conf: 97, modules: ['legal', 'docs', 'agenda'], outputs: ['team'] },
  { icon: 'fa-solid fa-bag-shopping', trigger: 'pay', conf: 100, modules: ['fin', 'stock'], outputs: ['client', 'dash'] },
  { icon: 'fa-solid fa-graduation-cap', trigger: 'site', conf: 95, modules: ['crm', 'agenda', 'docs'], outputs: ['client', 'team'] },
  { icon: 'fa-solid fa-person-running', trigger: 'gate', conf: 99, modules: ['fin', 'flows'], outputs: ['client', 'team'] },
  { icon: 'fa-solid fa-spa', trigger: 'link', conf: 94, modules: ['crm', 'flows', 'copilot'], outputs: ['dash'] },
  { icon: 'fa-solid fa-house', trigger: 'wa', conf: 97, modules: ['agenda', 'crm'], outputs: ['client', 'team'] },
  { icon: 'fa-solid fa-store', trigger: 'mail', conf: 96, modules: ['stock', 'copilot'], outputs: ['team', 'dash'] },
  { icon: 'fa-solid fa-laptop-code', trigger: 'wa', conf: 98, modules: ['ticket'], outputs: ['client', 'team'] },
  { icon: 'fa-solid fa-scissors', trigger: 'ig', conf: 97, modules: ['agenda', 'fin'], outputs: ['client', 'team'] },
];

/** Diagrama horizontal (colunas) e vertical (linhas, para telas estreitas). */
const WIDE = { w: 960, h: 560 };
const TALL = { w: 360, h: 580 };
const TALL_BELOW = 720;
const SVG_NS = 'http://www.w3.org/2000/svg';

function spread(n: number, from: number, to: number): number[] {
  if (n === 1) return [(from + to) / 2];
  return Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));
}

function place(tall: boolean): { nodes: PlacedNode[]; lanes: Lane[] } {
  const out: PlacedNode[] = [];
  if (!tall) {
    spread(TRIGGERS.length, 44, 516).forEach((y, i) => out.push({ ...TRIGGERS[i], x: 96, y }));
    out.push({ ...AI, x: 340, y: 280 });
    spread(MODULES.length, 32, 528).forEach((y, i) => out.push({ ...MODULES[i], x: 612, y }));
    spread(OUTPUTS.length, 160, 400).forEach((y, i) => out.push({ ...OUTPUTS[i], x: 870, y }));
    return {
      nodes: out,
      lanes: [
        { key: 'colTriggers', x: 96, y: 0 }, { key: 'colAi', x: 340, y: 0 },
        { key: 'colModules', x: 612, y: 0 }, { key: 'colOutputs', x: 870, y: 0 },
      ],
    };
  }
  const tx = spread(4, 45, 315);
  TRIGGERS.forEach((n, i) => out.push({ ...n, x: tx[i % 4], y: i < 4 ? 50 : 122 }));
  out.push({ ...AI, x: 180, y: 222 });
  const mx = spread(5, 36, 324);
  MODULES.forEach((n, i) => out.push({ ...n, x: mx[i % 5], y: i < 5 ? 336 : 418 }));
  spread(3, 62, 298).forEach((x, i) => out.push({ ...OUTPUTS[i], x, y: 534 }));
  return {
    nodes: out,
    lanes: [
      { key: 'colTriggers', x: 0, y: 6 }, { key: 'colModules', x: 0, y: 290 }, { key: 'colOutputs', x: 0, y: 486 },
    ],
  };
}

/**
 * Fluxo de automação do SGA CTRLB: gatilho → IA (entende, extrai, decide) → um ou
 * vários módulos em paralelo → respostas ao cliente, aviso à equipe e painel.
 * Cada "pacote" percorre a conexão de verdade (SVG) e o console registra a execução.
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
      <button type="button" class="fire" (click)="fire(nextIndex(), true)" [disabled]="running">
        <i class="fa-solid fa-bolt" [class.zap]="running" aria-hidden="true"></i> {{ t('fire') }}
      </button>
    </div>

    <div class="sectors" role="group" [attr.aria-label]="t('scenarios')">
      @for (r of runShapes; track $index; let i = $index) {
      <button type="button" class="sector" [class.on]="i === current" [attr.aria-pressed]="i === current" (click)="fire(i, true)">
        <i [class]="r.icon" aria-hidden="true"></i>{{ texts()[i].sector }}
      </button>
      }
    </div>

    <div class="now" aria-live="polite">
      @if (shown; as r) {
      <span class="now-tag"><i [class]="runShapes[current].icon" aria-hidden="true"></i>{{ r.sector }}</span>
      <span class="now-txt">{{ r.input }}</span>
      } @else {
      <span class="now-txt idle">{{ t('idle') }}</span>
      }
    </div>

    @if (!tall) {
    <div class="lanes-head" aria-hidden="true">
      @for (l of lanes; track l.key) {
      <span [style.left.%]="l.x / w * 100">{{ t(l.key) }}</span>
      }
    </div>
    }

    <div class="canvas" [style.aspect-ratio]="w + ' / ' + h" role="img" [attr.aria-label]="t('diagram')">
      @if (tall) {
      @for (l of lanes; track l.key) {
      <span class="lane-tag" [style.top.%]="l.y / h * 100" aria-hidden="true">{{ t(l.key) }}</span>
      }
      }
      <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" class="edges" aria-hidden="true">
        @for (e of edges; track e.id) {
        <path [attr.d]="e.d" class="edge" [ngClass]="e.kind" />
        <path [attr.d]="e.d" class="edge-hot" [class.on]="hot.has(e.id)" pathLength="1" #hotPath />
        }
        <g #packets></g>
      </svg>

      @for (n of placed; track n.id) {
      <div class="node" [ngClass]="n.kind" [class.lit]="lit.has(n.id)" [class.dim]="running && !lit.has(n.id) && !visited.has(n.id)"
           [style.left.%]="n.x / w * 100" [style.top.%]="n.y / h * 100" aria-hidden="true">
        @if (n.kind === 'ai') { <span class="ring" [class.on]="thinking"></span> }
        <span class="n-ico" [style.background]="n.color"><i [class]="n.icon"></i></span>
        <span class="n-txt">
          <b>{{ tall && n.kind !== 'ai' ? short(n.id) : label(n.id) }}</b><small>{{ sub(n.id) }}</small>
          @if (n.kind === 'ai') {
          <span class="stages">
            @for (s of stageKeys; track s; let si = $index) {
            <em [class.done]="stage > si + 1 || (stage === si + 1 && !thinking)" [class.cur]="stage === si + 1 && thinking">{{ t(s) }}</em>
            }
          </span>
          }
        </span>
      </div>
      }
    </div>

    <div class="grid md:grid-cols-[minmax(0,1fr)_210px] gap-3 mt-3">
      <div class="console min-w-0">
        <div class="c-head"><span class="cd r"></span><span class="cd y"></span><span class="cd g"></span><span class="ml-2">{{ t('logTitle') }}</span></div>
        <div class="c-body" role="log" aria-live="off">
          @for (l of log; track l.id) {
          <div class="c-line"><span class="t">{{ time(l.at) }}</span> <span [style.color]="l.color" class="font-bold">[{{ l.who() }}]</span> {{ l.text() }}</div>
          }
          <span class="c-caret" aria-hidden="true"></span>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 content-start">
        <div class="kpi"><strong>{{ i18n.number(runs) }}</strong><span>{{ t('kpiRuns') }}</span></div>
        <div class="kpi"><strong>{{ t('seconds', { n: i18n.number(avg, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }) }}</strong><span>{{ t('kpiAvg') }}</span></div>
        <div class="kpi"><strong>{{ t('hours', { n: i18n.number(hours) }) }}</strong><span>{{ t('kpiHours') }}</span></div>
        <div class="kpi"><strong>{{ i18n.number(acc / 100, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }) }}</strong><span>{{ t('kpiAcc') }}</span></div>
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
    .fire:focus-visible, .sector:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    .fire .zap { animation: afZap .7s ease-in-out infinite alternate; }
    @keyframes afZap { from { opacity: .45; transform: scale(.9); } to { opacity: 1; transform: scale(1.1); } }

    /* setores: uma linha que rola na horizontal, sem quebrar o layout */
    .sectors { display:flex; gap:6px; overflow-x:auto; padding-bottom: 4px; margin-bottom: 8px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.2) transparent; }
    .sector { flex: 0 0 auto; display:inline-flex; align-items:center; gap:6px; min-height: 32px; padding: 4px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 600; color: rgba(255,255,255,.72); background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.09); transition: background-color .2s, color .2s, border-color .2s, transform .15s; white-space: nowrap; }
    .sector i { font-size: 11px; opacity: .9; }
    .sector:hover { color:#fff; background: rgba(255,255,255,.12); }
    .sector:active { transform: scale(.96); }
    .sector.on { background: rgba(249,145,38,.18); border-color: #f99126; color: #fff; }
    @media (pointer: coarse) { .fire, .sector { min-height: 44px; } }

    .now { display:flex; align-items:center; gap:8px; min-height: 34px; padding: 6px 10px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px dashed rgba(255,255,255,.1); margin-bottom: 8px; min-width: 0; }
    .now-tag { flex-shrink:0; display:inline-flex; align-items:center; gap:6px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color:#10051c; background:#f99126; border-radius: 6px; padding: 3px 8px; }
    .now-txt { color: rgba(255,255,255,.88); font-size: 12.5px; white-space: nowrap; overflow:hidden; text-overflow: ellipsis; min-width: 0; animation: afLine .35s ease-out; }
    .now-txt.idle { color: rgba(255,255,255,.45); font-style: italic; }

    .lanes-head { position: relative; height: 18px; }
    .lanes-head span { position:absolute; top:0; transform: translateX(-50%); font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.38); white-space: nowrap; }
    .lane-tag { position:absolute; left: 4px; transform: translateY(-50%); font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.38); z-index: 1; }

    .canvas { position:relative; width:100%; container-type: inline-size;
      background-image: radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px); background-size: 18px 18px; border-radius: 14px; }
    .edges { position:absolute; inset:0; width:100%; height:100%; overflow: visible; }
    /* tracejado correndo em loop: o deslocamento é exatamente um período (5 + 6), então não há emenda */
    .edge { fill:none; stroke: rgba(255,255,255,.14); stroke-width: 1.6; stroke-dasharray: 5 6; animation: afFlow 1.3s linear infinite; }
    .edge.end { stroke: rgba(255,255,255,.05); stroke-dasharray: none; animation: none; }
    @keyframes afFlow { to { stroke-dashoffset: -11; } }
    .edge-hot { fill:none; stroke:#f99126; stroke-width: 2.4; stroke-linecap: round; stroke-dasharray: 1 1; stroke-dashoffset: 1; opacity: 0; transition: opacity .6s ease; filter: drop-shadow(0 0 4px rgba(249,145,38,.8)); }
    .edge-hot.on { opacity: 1; transition-duration: .15s; }
    .paused .edge, .paused .ring, .paused .c-caret { animation-play-state: paused; }

    .node { position:absolute; transform: translate(-50%, -50%); display:flex; align-items:center; gap:7px; padding: 5px 9px 5px 5px; border-radius: 11px; background: rgba(20,10,35,.95); border:1px solid rgba(255,255,255,.1); color:#fff; white-space:nowrap; z-index: 2;
      transition: border-color .35s, box-shadow .35s, opacity .35s, transform .45s cubic-bezier(.2,1.5,.4,1); box-shadow: 0 6px 18px rgba(0,0,0,.3); }
    .node.lit { border-color:#f99126; box-shadow: 0 0 0 3px rgba(249,145,38,.22), 0 0 22px rgba(249,145,38,.45); transform: translate(-50%, -50%) scale(1.06); z-index: 3; }
    .node.dim { opacity: .45; }
    .node.ai { padding: 10px 14px 10px 10px; border-color: rgba(249,145,38,.5); flex-direction: row; }
    .n-ico { width: 26px; height: 26px; border-radius: 8px; display:flex; align-items:center; justify-content:center; font-size: 12px; color:#fff; flex-shrink:0; }
    .node.ai .n-ico { width: 36px; height: 36px; font-size: 17px; border-radius: 10px; }
    .n-txt { min-width: 0; }
    .n-txt b { display:block; font-size: clamp(9.5px, 1.3cqw, 12px); line-height:1.15; }
    .n-txt small { display:block; font-size: clamp(8.5px, 1.05cqw, 10px); color: rgba(255,255,255,.55); line-height: 1.2; }
    .node.ai .n-txt b { font-size: clamp(11px, 1.6cqw, 14px); }
    .stages { display:flex; gap:4px; margin-top: 5px; }
    .stages em { font-style: normal; font-size: clamp(8.5px, 1cqw, 9.5px); font-weight: 700; padding: 2px 6px; border-radius: 999px; color: rgba(255,255,255,.5); background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08); transition: background-color .3s, color .3s, border-color .3s; }
    .stages em.cur { color:#10051c; background:#f99126; border-color:#f99126; }
    .stages em.done { color:#f99126; border-color: rgba(249,145,38,.5); }

    /* Anel de "pensando": a caixa fica parada; só o brilho percorre a borda
       (conic-gradient com o ângulo animado, recortado por máscara na espessura da borda). */
    @property --af-a { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
    .ring { position:absolute; inset: -4px; border-radius: 14px; padding: 2px; pointer-events: none; opacity: 0; transition: opacity .3s;
      background: conic-gradient(from var(--af-a), rgba(249,145,38,0) 0deg, rgba(249,145,38,0) 200deg, #f99126 300deg, #ffd8a8 340deg, rgba(249,145,38,0) 360deg);
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor;
      mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude;
      animation: afRing 1.2s linear infinite; }
    .ring.on { opacity: 1; }
    @keyframes afRing { to { --af-a: 360deg; } }

    /* layout vertical: ícone em cima, rótulo embaixo, sem subtítulo (exceto a IA) */
    .tall .node:not(.ai) { flex-direction: column; gap: 3px; padding: 5px 4px; text-align:center; white-space: normal; width: max-content; max-width: 23cqw; }
    .tall .node.module { max-width: 19.5cqw; padding: 5px 2px; }
    .tall .node:not(.ai) small { display:none; }
    .tall .node:not(.ai) .n-txt b { font-size: 9.5px; overflow-wrap: normal; word-break: normal; hyphens: manual; }
    .tall .node.ai small { font-size: 9px; }
    .tall .node.ai .n-txt b { font-size: 12px; }

    .console { background:#07020d; border:1px solid rgba(255,255,255,.08); border-radius: 12px; overflow:hidden; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .c-head { display:flex; align-items:center; gap:5px; padding: 6px 10px; font-size:10px; color: rgba(255,255,255,.4); background: rgba(255,255,255,.04); }
    .cd { width:8px; height:8px; border-radius:50%; } .cd.r { background:#ff5f57; } .cd.y { background:#febc2e; } .cd.g { background:#28c840; }
    .c-body { padding: 8px 10px; height: 196px; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-end; font-size: 11px; line-height: 1.45; color: rgba(255,255,255,.8);
      -webkit-mask-image: linear-gradient(transparent, #000 30px); mask-image: linear-gradient(transparent, #000 30px); }
    .c-line { animation: afLine .35s ease-out; overflow-wrap: anywhere; flex-shrink: 0; }
    .c-line .t { color: rgba(255,255,255,.35); }
    @keyframes afLine { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform:none; } }
    .c-caret { display:inline-block; width:7px; height:12px; background:#f99126; animation: afBlink 1s steps(1) infinite; margin-top:2px; flex-shrink: 0; }
    @keyframes afBlink { 50% { opacity:0; } }
    .kpi { background: rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.07); border-radius: 12px; padding: 8px 10px; min-width: 0; }
    .kpi strong { display:block; color:#f99126; font-size: 18px; line-height:1.1; font-variant-numeric: tabular-nums; }
    .kpi span { display:block; color: rgba(255,255,255,.6); font-size: 10px; line-height: 1.25; overflow-wrap: break-word; }
    .tall .c-body { height: 168px; font-size: 10.5px; }
    .tall .kpi strong { font-size: 16px; }
    .demo-note { margin: 10px 0 0; font-size: 11px; color: rgba(255,255,255,.45); }
    @media (prefers-reduced-motion: reduce) {
      .edge, .ring, .c-caret, .c-line, .now-txt, .fire .zap { animation: none; }
      .node, .edge-hot, .ring, .stages em { transition: none; }
    }
  `],
})
export class AutomationFlowComponent implements AfterViewInit, OnDestroy {
  @ViewChild('packets') packetLayer?: ElementRef<SVGGElement>;
  @ViewChildren('hotPath') hotPaths?: QueryList<ElementRef<SVGPathElement>>;

  readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  readonly t = this.i18n.scope(I18N);

  readonly runShapes = RUNS;
  readonly stageKeys: AfKey[] = ['st1', 'st2', 'st3'];
  readonly texts = computed<RunText[]>(() => this.i18n.pick(RUN_TEXT)((v) => this.i18n.money(v)));

  tall = false;
  w = WIDE.w;
  h = WIDE.h;
  placed: PlacedNode[] = [];
  lanes: Lane[] = [];
  edges: Edge[] = [];
  hot = new Set<string>();
  lit = new Set<NodeId>();
  /** Nós pelos quais a execução atual já passou (ficam acesos, sem esmaecer). */
  visited = new Set<NodeId>();
  log: LogLine[] = [];
  running = false;
  thinking = false;
  stage = 0;
  visible = false;
  current = -1;
  runs = 1284;
  avg = 1.6;
  hours = 212;
  acc = 97.8;

  private edgeIndex = new Map<string, number>();
  private logId = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private rafs = new Set<number>();
  private layoutRaf = 0;
  private reduced = false;
  private io?: IntersectionObserver;
  private ro?: ResizeObserver;

  constructor() {
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.layout(false);
    this.addLog(() => this.t('whoSystem'), () => this.t('ready'), '#94a3b8');
  }

  /** Textos da execução em curso, no idioma atual. */
  get shown(): RunText | null { return this.current >= 0 ? this.texts()[this.current] : null; }

  label(id: NodeId): string { return this.t(('n_' + id) as AfKey); }
  sub(id: NodeId): string { return this.t(('s_' + id) as AfKey); }
  /** Nome curto (antes do " · ") para o layout vertical, onde cada nó tem ~60 px. */
  short(id: NodeId): string { return this.label(id).split(' · ')[0]; }
  time(d: Date): string { return this.i18n.date(d, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }); }
  nextIndex(): number { return (this.current + 1) % RUNS.length; }

  ngAfterViewInit(): void {
    // primeira medida já no layout certo, para não piscar o diagrama horizontal no celular
    const width = this.host.nativeElement.clientWidth;
    if (width > 0 && width < TALL_BELOW) { this.layout(true); this.cdr.detectChanges(); }
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(entries => {
        const tall = entries[0].contentRect.width < TALL_BELOW;
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
    }, { threshold: 0.2 });
    this.io.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void { this.clear(); cancelAnimationFrame(this.layoutRaf); this.io?.disconnect(); this.ro?.disconnect(); }

  /** Executa um cenário. Clique do usuário interrompe o que estiver rodando e segura o autoplay. */
  fire(index: number, manual = false) {
    if (manual) this.reset();
    else if (this.running) return;
    this.running = true;
    this.current = index;
    const run = RUNS[index];
    const tx = () => this.texts()[index];
    const nodeColor = (id: NodeId) => this.placed.find(n => n.id === id)!.color;
    this.hot.clear(); this.lit.clear(); this.visited.clear();
    this.stage = 0;

    let t = 0;
    this.at(t, () => {
      this.light(run.trigger);
      this.addLog(() => this.t('whoTrigger'), () => `${this.label(run.trigger)}: ${tx().input}`, nodeColor(run.trigger));
    });
    t += 550;
    this.at(t, () => this.travel(`${run.trigger}-ia`, 700));
    t += 750;
    this.at(t, () => {
      this.light('ia'); this.thinking = true; this.stage = 1;
      this.addLog(() => this.t('whoAi'), () => this.t('reading', { h: tx().history }), '#f99126');
    });
    t += 1000;
    this.at(t, () => { this.stage = 2; this.addLog(() => this.t('whoAi'), () => this.t('extracted', { d: tx().data }), '#f99126'); });
    t += 900;
    this.at(t, () => {
      this.stage = 3;
      this.addLog(() => this.t('whoAi'), () => this.t('intent', {
        intent: tx().intent, conf: run.conf, list: run.modules.map(m => this.label(m)).join(' + '),
      }), '#f99126');
    });
    t += 650;
    // ramificação em paralelo: a IA aciona os módulos ao mesmo tempo (com leve escalonamento)
    this.at(t, () => { this.thinking = false; this.stage = 4; this.lit.delete('ia'); });
    run.modules.forEach((m, i) => this.at(t + i * 140, () => this.travel(`ia-${m}`, 750)));
    t += 820;
    run.modules.forEach((m, i) => this.at(t + i * 380, () => {
      this.light(m);
      this.addLog(() => this.label(m).toLocaleLowerCase(this.i18n.locale()), () => tx().mods[i] ?? '', nodeColor(m));
    }));
    t += run.modules.length * 380 + 300;
    run.outputs.forEach((o, i) => {
      const from = run.modules[i % run.modules.length];
      this.at(t + i * 160, () => this.travel(`${from}-${o}`, 650));
    });
    t += 720;
    run.outputs.forEach((o, i) => this.at(t + i * 360, () => {
      this.light(o);
      const text = tx();
      if (o === 'client') this.addLog(() => this.t('whoClient'), () => this.t('replied', { text: this.texts()[index].client ?? '' }), nodeColor(o));
      else if (o === 'team') this.addLog(() => this.t('whoTeam'), () => this.t('notified', { who: this.texts()[index].team ?? '' }), '#e2e8f0');
      else this.addLog(() => this.t('whoDash'), () => this.texts()[index].dash ?? text.intent, nodeColor(o));
    }));
    t += run.outputs.length * 360 + 200;
    this.at(t, () => {
      this.runs++;
      this.avg = 1.2 + Math.random() * 0.9;
      this.hours += Math.random() > 0.5 ? 1 : 0;
      this.acc = Math.min(99.4, Math.max(96.8, this.acc + (Math.random() - 0.45) * 0.3));
    });
    t += 1600;
    // fim da execução: destaques apagam com transição, sem zerar a cena de repente
    this.at(t, () => { this.running = false; this.hot.clear(); this.lit.clear(); this.visited.clear(); this.stage = 0; });
    if (manual && !this.reduced) this.at(t + 3500, () => this.loop());
  }

  private light(id: NodeId) { this.lit.add(id); this.visited.add(id); }

  private loop() {
    if (!this.visible || this.reduced) return;
    this.fire(this.nextIndex());
    this.at(this.runDuration(), () => this.loop());
  }

  /** Tempo total aproximado de uma execução + pausa, para encadear a próxima. */
  private runDuration(): number {
    const run = RUNS[this.current];
    return 8900 + run.modules.length * 380 + run.outputs.length * 360;
  }

  /** Troca entre o layout horizontal e o vertical e recalcula as conexões. */
  private layout(tall: boolean) {
    this.tall = tall;
    const size = tall ? TALL : WIDE;
    this.w = size.w;
    this.h = size.h;
    const { nodes, lanes } = place(tall);
    this.placed = nodes;
    this.lanes = lanes;
    const at = (id: NodeId) => nodes.find(n => n.id === id)!;
    const curve = (a: PlacedNode, b: PlacedNode) => tall
      ? `M${a.x},${a.y} C${a.x},${(a.y + b.y) / 2} ${b.x},${(a.y + b.y) / 2} ${b.x},${b.y}`
      : `M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`;
    const edges: Edge[] = [];
    for (const tr of TRIGGERS) edges.push({ id: `${tr.id}-ia`, kind: 'in', d: curve(at(tr.id), at('ia')) });
    for (const m of MODULES) edges.push({ id: `ia-${m.id}`, kind: 'out', d: curve(at('ia'), at(m.id)) });
    for (const m of MODULES) for (const o of OUTPUTS) edges.push({ id: `${m.id}-${o.id}`, kind: 'end', d: curve(at(m.id), at(o.id)) });
    this.edges = edges;
    this.edgeIndex = new Map(edges.map((e, i) => [e.id, i]));
  }

  /** Cria um pacote que percorre a conexão e "acende" o trecho já percorrido, no mesmo relógio. */
  private travel(edgeId: string, ms: number) {
    const idx = this.edgeIndex.get(edgeId);
    const path = idx === undefined ? undefined : this.hotPaths?.get(idx)?.nativeElement;
    const layer = this.packetLayer?.nativeElement;
    if (!path || !layer) return;
    path.style.strokeDashoffset = '1';
    this.hot.add(edgeId);
    const len = path.getTotalLength();
    if (this.reduced) { path.style.strokeDashoffset = '0'; return; }

    // Elementos criados à mão não recebem o atributo de encapsulamento: estilo inline.
    const g = document.createElementNS(SVG_NS, 'g');
    const halo = document.createElementNS(SVG_NS, 'circle');
    halo.setAttribute('r', '13'); halo.setAttribute('fill', 'rgba(249,145,38,0.25)');
    const core = document.createElementNS(SVG_NS, 'circle');
    core.setAttribute('r', '6'); core.setAttribute('fill', '#fff');
    core.setAttribute('style', 'filter: drop-shadow(0 0 6px #f99126)');
    g.append(halo, core);
    layer.appendChild(g);

    const move = (e: number) => {
      const pt = path.getPointAtLength(len * e);
      g.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      path.style.strokeDashoffset = (1 - e).toFixed(4);
      halo.setAttribute('r', (11 + Math.sin(e * Math.PI * 4) * 3).toFixed(1));
    };
    move(0);
    this.zone.runOutsideAngular(() => {
      const start = performance.now();
      let id = 0;
      const step = (now: number) => {
        this.rafs.delete(id);
        const k = Math.min(1, (now - start) / ms);
        move(k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
        if (k < 1) { id = requestAnimationFrame(step); this.rafs.add(id); }
        else g.remove();
      };
      id = requestAnimationFrame(step);
      this.rafs.add(id);
    });
  }

  private addLog(who: () => string, text: () => string, color: string) {
    this.log = [...this.log, { id: ++this.logId, at: new Date(), who, text, color }].slice(-12);
  }

  private at(ms: number, fn: () => void) {
    this.timers.push(setTimeout(() => { fn(); this.cdr.markForCheck(); }, ms));
  }

  /** Para tudo e deixa a cena em repouso para recomeçar limpa. */
  private reset() {
    this.clear();
    this.running = false;
    this.thinking = false;
    this.stage = 0;
    this.hot.clear();
    this.lit.clear();
    this.visited.clear();
  }

  private clear() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    this.rafs.forEach(id => cancelAnimationFrame(id));
    this.rafs.clear();
    const layer = this.packetLayer?.nativeElement;
    if (layer) while (layer.firstChild) layer.removeChild(layer.firstChild);
  }
}
