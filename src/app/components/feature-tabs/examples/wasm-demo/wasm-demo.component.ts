import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { I18nService } from '../../../../i18n/i18n.service';
import { Showcase } from '../pwa-demo/showcase';
import { I18N } from './wasm-demo.i18n';

export type Engine = 'wasm' | 'js';
export type MediaProfile = 'heavy' | 'light';
export type FilterId = 'teal' | 'rec709' | 'cyber' | 'noir';
export type Aspect = '16:9' | '9:16' | '1:1';

export interface FilterPreset {
  id: FilterId;
  /** Nome próprio do LUT (não se traduz). */
  name: string;
  icon: string;
  desc: 'lutTeal' | 'lutRec' | 'lutCyber' | 'lutNoir';
}

export interface BenchmarkMetric {
  id: 'scrub' | 'grade' | 'memory' | 'export';
  title: 'm1Title' | 'm2Title' | 'm3Title' | 'm4Title';
  sub: 'm1Sub' | 'm2Sub' | 'm3Sub' | 'm4Sub';
  note: 'm1Note' | 'm2Note' | 'm3Note' | 'm4Note';
  /** Unidade do valor; vazio quando a métrica é qualitativa (estabilidade). */
  unit: string;
  wasmValue: number;
  jsValue: number;
  /** Largura da barra do JavaScript (a do WebAssembly é sempre 100%). */
  jsBar: number;
  /** Quantas vezes o WebAssembly é mais rápido; ausente na métrica qualitativa. */
  gain?: number;
}

interface Palette {
  bg: [string, string, string];
  grid: string;
  cube: [string, string, string];
  accent: string;
}

const PALETTES: Record<FilterId, Palette> = {
  teal: { bg: ['#041d24', '#0b0f19', '#3a1308'], grid: 'rgba(249,145,38,0.2)', cube: ['#f99126', '#0d9488', '#042f2e'], accent: '#f99126' },
  rec709: { bg: ['#0f172a', '#1c1830', '#1e293b'], grid: 'rgba(249,145,38,0.16)', cube: ['#e2e8f0', '#94a3b8', '#475569'], accent: '#f99126' },
  cyber: { bg: ['#2e0238', '#0a0319', '#023838'], grid: 'rgba(236,72,153,0.22)', cube: ['#f43f5e', '#8b5cf6', '#4c1d95'], accent: '#38bdf8' },
  noir: { bg: ['#0a0a0a', '#1e1e1e', '#050505'], grid: 'rgba(255,255,255,0.14)', cube: ['#e5e5e5', '#8a8a8a', '#3d3d3d'], accent: '#e5e5e5' },
};

const CUBE: ReadonlyArray<readonly [number, number, number]> = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
];
/** Faces do cubo e o índice da cor: topo/base, laterais em X, laterais em Z. */
const FACES: ReadonlyArray<readonly [number, number, number, number, 0 | 1 | 2]> = [
  [0, 1, 5, 4, 0], [3, 7, 6, 2, 0],
  [0, 4, 7, 3, 1], [1, 2, 6, 5, 1],
  [0, 3, 2, 1, 2], [4, 5, 6, 7, 2],
];

const BENCH_MS = 3600;
const BENCH_STEPS = ['benchStep1', 'benchStep2', 'benchStep3', 'benchStep4'] as const;
const FRAME_BUDGET_MS = 16.6;

/**
 * WebAssembly × JavaScript: uma prévia de vídeo sintética (desenhada em canvas) renderizada
 * por um "motor" simulado. É uma simulação didática, apresentada como tal; a tela real do
 * editor de vídeo do SGA CTRLB aparece ao lado, como captura. Os números do comparativo
 * são ilustrativos e o texto diz isso.
 */
@Component({
  selector: 'app-wasm-demo',
  standalone: true,
  template: `
    <section class="wasm" role="region" [attr.aria-label]="t('region')">
      <header class="top">
        <span class="top-ico" aria-hidden="true"><i class="fa-solid fa-film"></i></span>
        <div class="top-text">
          <div class="top-line">
            <b>{{ t('title') }}</b>
            <span class="sim-tag"><i class="fa-solid fa-flask" aria-hidden="true"></i> {{ t('simTag') }}</span>
          </div>
          <p>{{ t('sub') }}</p>
        </div>
        <div class="switches">
          <div class="seg" role="group" [attr.aria-label]="t('fileLabel')">
            <button type="button" [class.on]="activeProfile === 'heavy'" [attr.aria-pressed]="activeProfile === 'heavy'"
              [title]="t('profHeavyHint')" (click)="pickProfile('heavy')">
              <i class="fa-solid fa-database" aria-hidden="true"></i> {{ t('profHeavy') }}
            </button>
            <button type="button" [class.on]="activeProfile === 'light'" [attr.aria-pressed]="activeProfile === 'light'"
              [title]="t('profLightHint')" (click)="pickProfile('light')">
              <i class="fa-solid fa-file-video" aria-hidden="true"></i> {{ t('profLight') }}
            </button>
          </div>
          <div class="seg" role="group" [attr.aria-label]="t('engineLabel')">
            <button type="button" class="eng-wasm" [class.on]="activeEngine === 'wasm'" [attr.aria-pressed]="activeEngine === 'wasm'"
              (click)="pickEngine('wasm')">
              <i class="fa-solid fa-bolt" aria-hidden="true"></i> WebAssembly
            </button>
            <button type="button" class="eng-js" [class.on]="activeEngine === 'js'" [attr.aria-pressed]="activeEngine === 'js'"
              (click)="pickEngine('js')">
              <i class="fa-solid fa-code" aria-hidden="true"></i> JavaScript
            </button>
          </div>
        </div>
      </header>

      <div class="cols">
        <div class="left">
          <div class="tel" [class.bad]="activeEngine === 'js'">
            <div class="tel-card">
              <span class="tel-label">{{ t('telFps') }}</span>
              <span class="tel-value"><b>{{ fmt1(shown.fps) }}</b> fps</span>
              <span class="tel-sub">
                <i [class]="activeEngine === 'wasm' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'" aria-hidden="true"></i>
                {{ activeEngine === 'wasm' ? t('telFpsOk') : (activeProfile === 'heavy' ? t('telFpsBadHeavy') : t('telFpsBadLight')) }}
              </span>
            </div>
            <div class="tel-card">
              <span class="tel-label">{{ t('telFrame') }}</span>
              <span class="tel-value"><b>{{ fmt1(shown.frame) }}</b> ms</span>
              <span class="tel-sub">
                {{ shown.frame > budget ? t('telOver', { p: overBudget() }) : t('telBudget', { v: fmt1(budget) }) }}
              </span>
            </div>
            <div class="tel-card">
              <span class="tel-label">{{ t('telDropped') }}</span>
              <span class="tel-value"><b>{{ i18n.number(round(shown.dropped)) }}</b></span>
              <span class="tel-sub">{{ activeEngine === 'wasm' ? t('telDropOk') : t('telDropBad') }}</span>
            </div>
            <div class="tel-card">
              <span class="tel-label">{{ t('telMem') }}</span>
              <span class="tel-value"><b>{{ memValue() }}</b> {{ shown.mem >= 1000 ? 'GB' : 'MB' }}</span>
              <span class="tel-sub">{{ activeEngine === 'wasm' ? t('telMemOk') : t('telMemBad') }}</span>
            </div>
          </div>

          <div class="stage">
            <canvas #videoCanvas (click)="togglePlay()"></canvas>
            <div class="hud hud-left">
              <span class="chip" [class.chip-wasm]="activeEngine === 'wasm'" [class.chip-js]="activeEngine === 'js'">
                <i [class]="activeEngine === 'wasm' ? 'fa-solid fa-microchip' : 'fa-solid fa-triangle-exclamation'" aria-hidden="true"></i>
                {{ activeEngine === 'wasm' ? t('hudWasm') : t('hudJs') }}
              </span>
              <span class="chip mono">{{ formatTimecode(currentTime) }}</span>
            </div>
            <div class="hud hud-right">
              <span class="chip">{{ currentFilterName }}</span>
              <span class="chip">{{ currentAspectLabel }}</span>
            </div>
            <button type="button" class="big-play" [class.shown]="!isPlaying" [attr.inert]="isPlaying ? '' : null"
              (click)="togglePlay()" [attr.aria-label]="t('play')">
              <span><i class="fa-solid fa-play" aria-hidden="true"></i></span>
            </button>
          </div>

          <!-- Estado do motor: as duas mensagens ocupam a mesma célula e trocam com fade (altura fixa). -->
          <div class="status" [class.is-bad]="showJsWarning">
            <p class="status-face" [class.shown]="!showJsWarning" [attr.aria-hidden]="showJsWarning">
              <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
              <span>{{ t('okText', { ms: fmt1(frameTimeMs), v: fmt1(budget) }) }}</span>
            </p>
            <p class="status-face" [class.shown]="showJsWarning" [attr.aria-hidden]="!showJsWarning">
              <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
              <span>
                {{ activeProfile === 'heavy'
                    ? t('warnHeavy', { ms: round(frameTimeMs * 1.5) })
                    : t('warnLight', { ms: round(frameTimeMs * 1.2), fps: fmt1(currentFps) }) }}
              </span>
            </p>
          </div>

          <div class="controls">
            <div class="transport">
              <button type="button" class="ctrl" (click)="togglePlay()" [attr.aria-label]="isPlaying ? t('pause') : t('play')">
                <i [class]="isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play'" aria-hidden="true"></i>
              </button>
              <button type="button" class="ctrl" (click)="seekRelative(-2)" [attr.aria-label]="t('back')">
                <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
              </button>
              <button type="button" class="ctrl" (click)="seekRelative(2)" [attr.aria-label]="t('forward')">
                <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
              </button>
              <span class="time mono">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
            </div>
            <div class="picks" role="group" [attr.aria-label]="t('aspectLabel')">
              @for (a of aspects; track a.id) {
                <button type="button" class="pick mono" [class.on]="selectedAspect === a.id" [attr.aria-pressed]="selectedAspect === a.id"
                  [title]="t(a.title)" [attr.aria-label]="t(a.title)" (click)="setAspect(a.id)">{{ a.id }}</button>
              }
            </div>
            <div class="picks" role="group" [attr.aria-label]="t('lutLabel')">
              <span class="picks-label">{{ t('lutLabel') }}</span>
              @for (filter of filterPresets; track filter.id) {
                <button type="button" class="pick" [class.on]="selectedFilter === filter.id" [attr.aria-pressed]="selectedFilter === filter.id"
                  [title]="t(filter.desc)" (click)="setFilter(filter.id)">
                  <i [class]="filter.icon" aria-hidden="true"></i> {{ filter.name }}
                </button>
              }
            </div>
          </div>

          <div class="timeline">
            <div class="timeline-head">
              <span><i class="fa-solid fa-layer-group" aria-hidden="true"></i> {{ t('timeline') }}</span>
              <span class="hint">{{ t('timelineHint') }}</span>
            </div>
            <div #scrubberBar class="scrubber" role="slider" tabindex="0" [attr.aria-label]="t('scrubber')"
              aria-valuemin="0" [attr.aria-valuemax]="duration" [attr.aria-valuenow]="round(currentTime)"
              [attr.aria-valuetext]="formatTime(currentTime)"
              (pointerdown)="startScrubbing($event)" (keydown)="onScrubKey($event)">
              <div class="ticks mono" aria-hidden="true">
                @for (tick of ticks; track tick) { <span>{{ formatTime(tick) }}</span> }
              </div>
              <div #progressFill class="fill"></div>
              <div #playhead class="head"><span></span></div>
            </div>
            <div class="tracks" aria-hidden="true">
              <div class="track">
                <span class="track-name mono"><i class="fa-solid fa-video"></i> V1</span>
                <div class="track-lane">
                  <span class="clip clip-a" style="flex: 48"><i class="fa-solid fa-clapperboard"></i> {{ activeProfile === 'heavy' ? 'drone_prores_4k.mov' : 'drone_1080p.mp4' }}</span>
                  <span class="clip clip-b" style="flex: 52"><i class="fa-solid fa-camera"></i> studio_60fps.mov</span>
                </div>
              </div>
              <div class="track">
                <span class="track-name mono"><i class="fa-solid fa-wand-magic-sparkles"></i> V2</span>
                <div class="track-lane">
                  <span class="clip clip-fx"><i class="fa-solid fa-palette"></i> {{ t('trackGrade', { lut: currentFilterName }) }}</span>
                </div>
              </div>
              <div class="track">
                <span class="track-name mono"><i class="fa-solid fa-wave-square"></i> A1</span>
                <div class="track-lane">
                  <span class="clip clip-audio">
                    <span class="wave">@for (h of waveBars; track $index) { <i [style.height.%]="h"></i> }</span>
                    <span class="clip-text"><i class="fa-solid fa-music"></i> {{ t('trackAudio') }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <figure class="real">
            <div class="real-shot">
              <img src="/images/real-screens/editor-video-live-dark.png" [alt]="t('realAlt')" width="1440" height="900" loading="lazy" decoding="async" />
            </div>
            <figcaption>
              <span class="bench-tag">{{ t('realTag') }}</span>
              <b>{{ t('realTitle') }}</b>
              <span>{{ t('realText') }}</span>
              <small><i class="fa-solid fa-camera" aria-hidden="true"></i> {{ t('realCaption') }}</small>
            </figcaption>
          </figure>
        </div>

        <div class="right">
          <div>
            <span class="bench-tag">{{ t('benchTag') }}</span>
            <h4>{{ t('benchTitle') }}</h4>
            <p class="bench-lead">{{ t('benchLead') }}</p>
          </div>

          <button type="button" class="run" (click)="runStressBenchmark()" [disabled]="isBenchmarking">
            <span class="run-fill" [style.transform]="'scaleX(' + (isBenchmarking ? benchmarkProgress / 100 : 0) + ')'" aria-hidden="true"></span>
            <span class="run-text">
              <i [class]="isBenchmarking ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-chart-simple'" aria-hidden="true"></i>
              <span>{{ isBenchmarking ? benchLabel() : t('benchRun') }}</span>
              @if (isBenchmarking) { <b class="mono">{{ round(benchmarkProgress) }}%</b> }
            </span>
          </button>

          <ul class="metrics">
            @for (metric of benchmarkMetrics; track metric.id; let i = $index) {
              <li class="metric" [class.live]="i < revealed">
                <div class="metric-head">
                  <div>
                    <b>{{ t(metric.title) }}</b>
                    <span>{{ t(metric.sub) }}</span>
                  </div>
                  <span class="gain">{{ gainLabel(metric) }}</span>
                </div>
                <div class="bar-row">
                  <span class="bar-name bar-wasm"><i class="fa-solid fa-bolt" aria-hidden="true"></i> WASM</span>
                  <span class="bar"><span class="bar-fill fill-wasm"></span></span>
                  <span class="bar-value mono">{{ metricValue(metric, 'wasm') }}</span>
                </div>
                <div class="bar-row">
                  <span class="bar-name bar-js"><i class="fa-solid fa-code" aria-hidden="true"></i> JS</span>
                  <span class="bar"><span class="bar-fill fill-js" [style.--w]="metric.jsBar / 100"></span></span>
                  <span class="bar-value mono">{{ metricValue(metric, 'js') }}</span>
                </div>
                <p>{{ t(metric.note, { v: fmt1(budget) }) }}</p>
              </li>
            }
          </ul>
          <p class="bench-note"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> {{ t('benchNote') }}</p>

          <ul class="pillars">
            @for (p of pillars; track p.title) {
              <li>
                <i [class]="p.icon" aria-hidden="true"></i>
                <span><b>{{ t(p.title) }}</b><span>{{ t(p.text) }}</span></span>
              </li>
            }
          </ul>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; container: wasm / inline-size; }
    button { font: inherit; color: inherit; border: 0; background: none; cursor: pointer; }
    button:focus-visible, .scrubber:focus-visible { outline: 2px solid #f99126; outline-offset: 2px; }
    p, h4, figure { margin: 0; }
    ul { list-style: none; margin: 0; padding: 0; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }

    .wasm { overflow: hidden; border-radius: 16px; color: #fff; background: #10051c; box-shadow: 0 0 0 1px rgba(249, 145, 38, .28), 0 22px 44px -24px rgba(0, 0, 0, .7); font-size: 12px; }

    .top { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px 16px; background: #150927; border-bottom: 1px solid rgba(255, 255, 255, .1); }
    .top-ico { flex: none; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 11px; color: #f99126; background: rgba(249, 145, 38, .16); box-shadow: inset 0 0 0 1px rgba(249, 145, 38, .4); }
    .top-text { flex: 1 1 220px; min-width: 0; }
    .top-line { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 14px; }
    .top-text p { margin-top: 2px; font-size: 11.5px; line-height: 1.4; color: rgba(255, 255, 255, .68); }
    .sim-tag { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; color: #fdba74; background: rgba(249, 145, 38, .14); box-shadow: inset 0 0 0 1px rgba(249, 145, 38, .35); }
    .switches { display: flex; flex-wrap: wrap; gap: 8px; }
    .seg { display: flex; padding: 3px; border-radius: 12px; background: rgba(0, 0, 0, .4); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .1); }
    .seg button { min-height: 36px; display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 9px; font-size: 11.5px; font-weight: 700; color: rgba(255, 255, 255, .7); transition: background-color .25s, color .25s, box-shadow .25s; }
    .seg button:hover { color: #fff; background: rgba(255, 255, 255, .07); }
    .seg button.on { color: #10051c; background: #f99126; }
    .seg .eng-wasm.on { color: #052e16; background: #34d399; }
    .seg .eng-js.on { color: #422006; background: #fbbf24; }

    .cols { display: grid; }
    .left, .right { min-width: 0; display: grid; gap: 12px; align-content: start; padding: 14px; }
    .left { background: rgba(0, 0, 0, .25); }
    .right { background: #170a2b; border-top: 1px solid rgba(255, 255, 255, .1); }
    @container wasm (min-width: 880px) {
      .cols { grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); }
      .left, .right { padding: 18px; }
      .right { border-top: 0; border-left: 1px solid rgba(255, 255, 255, .1); }
    }

    .tel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    @container wasm (min-width: 560px) { .tel { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    .tel-card { min-width: 0; display: grid; gap: 1px; padding: 8px 10px; border-radius: 10px; background: rgba(255, 255, 255, .05); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .09); transition: background-color .4s, box-shadow .4s; }
    .bad .tel-card { background: rgba(239, 68, 68, .1); box-shadow: inset 0 0 0 1px rgba(239, 68, 68, .4); }
    .tel-label { font-size: 9.5px; font-weight: 600; line-height: 1.25; letter-spacing: .03em; text-transform: uppercase; color: rgba(255, 255, 255, .6); }
    .tel-value { font-size: 10.5px; color: rgba(255, 255, 255, .6); }
    .tel-value b { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; font-size: 17px; color: #fff; }
    .tel-sub { font-size: 10px; font-weight: 600; line-height: 1.25; color: #6ee7b7; transition: color .4s; }
    .bad .tel-sub { color: #fca5a5; }

    .stage { position: relative; overflow: hidden; border-radius: 12px; background: #000; box-shadow: 0 0 0 1px rgba(255, 255, 255, .12); }
    canvas { display: block; width: 100%; aspect-ratio: 16 / 9; cursor: pointer; }
    .hud { position: absolute; top: 10px; display: flex; gap: 6px; pointer-events: none; }
    .hud-left { left: 10px; }
    .hud-right { right: 10px; display: none; }
    @container wasm (min-width: 560px) { .hud-right { display: flex; } }
    .chip { padding: 3px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; white-space: nowrap; background: rgba(0, 0, 0, .72); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .16); transition: background-color .35s; }
    .chip-wasm { color: #052e16; background: #34d399; }
    .chip-js { background: #dc2626; }
    .status { display: grid; border-radius: 10px; background: rgba(16, 185, 129, .1); box-shadow: inset 0 0 0 1px rgba(52, 211, 153, .35); transition: background-color .45s, box-shadow .45s; }
    .status.is-bad { background: rgba(127, 29, 29, .5); box-shadow: inset 0 0 0 1px rgba(239, 68, 68, .6); }
    .status-face { grid-area: 1 / 1; display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; font-size: 11px; line-height: 1.4; color: #d1fae5; opacity: 0; transform: translateY(4px); transition: opacity .35s ease, transform .45s cubic-bezier(.16, 1, .3, 1); }
    .status-face.shown { opacity: 1; transform: none; }
    .status-face i { margin-top: 2px; color: #34d399; }
    .is-bad .status-face { color: #fee2e2; }
    .is-bad .status-face i { color: #f87171; }
    .big-play { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0, 0, 0, .45); opacity: 0; pointer-events: none; transition: opacity .3s ease; }
    .big-play.shown { opacity: 1; pointer-events: auto; }
    .big-play span { width: 56px; height: 56px; display: grid; place-items: center; padding-left: 4px; border-radius: 50%; font-size: 20px; color: #10051c; background: #f99126; transform: scale(.7); transition: transform .4s cubic-bezier(.3, 1.5, .5, 1); }
    .big-play.shown span { transform: none; }
    .big-play:hover span { transform: scale(1.08); }

    .controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; }
    .transport, .picks { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .ctrl { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 9px; background: rgba(255, 255, 255, .09); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .13); transition: background-color .2s, color .2s, transform .18s cubic-bezier(.3, 1.4, .5, 1); }
    .ctrl:hover { color: #f99126; background: rgba(249, 145, 38, .22); }
    .ctrl:active, .pick:active { transform: scale(.92); }
    .time { margin-left: 4px; color: rgba(255, 255, 255, .82); }
    .picks-label { margin-right: 2px; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: rgba(255, 255, 255, .6); }
    .pick { min-height: 32px; display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 8px; font-size: 10.5px; font-weight: 600; color: rgba(255, 255, 255, .74); background: rgba(255, 255, 255, .07); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .11); transition: background-color .2s, color .2s, box-shadow .2s, transform .18s cubic-bezier(.3, 1.4, .5, 1); }
    .pick:hover { color: #fff; background: rgba(255, 255, 255, .13); }
    .pick.on { color: #fff; background: rgba(249, 145, 38, .26); box-shadow: inset 0 0 0 1px #f99126; }
    @media (pointer: coarse) {
      .seg button, .ctrl, .pick { min-height: 44px; }
      .ctrl { width: 44px; height: 44px; }
    }

    .timeline { padding: 10px; border-radius: 12px; background: rgba(0, 0, 0, .4); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .1); user-select: none; }
    .timeline-head { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 8px; font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, .85); }
    .timeline-head i { margin-right: 4px; color: #f99126; }
    .hint { font-weight: 400; color: rgba(255, 255, 255, .55); }
    .scrubber { position: relative; height: 32px; margin-bottom: 9px; overflow: hidden; border-radius: 7px; background: rgba(255, 255, 255, .06); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .15); cursor: pointer; touch-action: none; }
    @media (pointer: coarse) { .scrubber { height: 44px; } }
    .ticks { position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; font-size: 9px; color: rgba(255, 255, 255, .4); pointer-events: none; }
    .fill { position: absolute; inset: 0; background: rgba(249, 145, 38, .38); transform: scaleX(0); transform-origin: left; pointer-events: none; }
    .head { position: absolute; inset: 0; pointer-events: none; }
    .head span { position: absolute; left: -1px; top: 0; bottom: 0; width: 2px; background: #f99126; }
    .head span::before { content: ''; position: absolute; left: -4px; top: 0; width: 10px; height: 6px; border-radius: 0 0 4px 4px; background: #f99126; }
    .tracks { display: grid; gap: 6px; }
    .track { display: grid; grid-template-columns: 46px minmax(0, 1fr); align-items: center; gap: 6px; }
    .track-name { padding: 4px; border-radius: 5px; font-size: 10px; font-weight: 700; text-align: center; color: rgba(255, 255, 255, .65); background: rgba(255, 255, 255, .06); }
    .track-lane { display: flex; height: 24px; overflow: hidden; border-radius: 6px; background: rgba(255, 255, 255, .04); }
    .clip { position: relative; flex: 1 1 0; min-width: 0; display: flex; align-items: center; gap: 5px; padding: 0 8px; font-size: 9.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: inset -1px 0 0 rgba(0, 0, 0, .35); }
    .clip-a { color: #f3e8ff; background: #5b21b6; }
    .clip-b { color: #f3e8ff; background: #6d28d9; }
    .clip-fx { color: #fff7ed; background: #9a4a0b; }
    .clip-audio { color: #ecfeff; background: #0f6b70; }
    .clip-text { position: relative; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    .wave { position: absolute; inset: 3px 4px; display: flex; align-items: center; gap: 2px; opacity: .35; }
    .wave i { flex: 1; border-radius: 1px; background: #fff; }

    .bench-tag { display: inline-block; padding: 2px 8px; border-radius: 5px; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #f99126; background: rgba(249, 145, 38, .12); box-shadow: inset 0 0 0 1px rgba(249, 145, 38, .25); }
    h4 { margin-top: 6px; font-size: 18px; font-weight: 800; line-height: 1.2; color: #fff; }
    .bench-lead { margin-top: 4px; font-size: 12.5px; line-height: 1.5; color: rgba(255, 255, 255, .7); }

    .run { position: relative; overflow: hidden; min-height: 44px; padding: 8px 14px; border-radius: 11px; font-size: 13px; font-weight: 800; color: #10051c; background: #f99126; transition: transform .18s cubic-bezier(.3, 1.4, .5, 1), background-color .2s; }
    .run:hover:not(:disabled) { background: #ffa646; }
    .run:active:not(:disabled) { transform: scale(.98); }
    .run:disabled { cursor: progress; background: #7a4513; color: #fff; }
    /* O progresso preenche o próprio botão: nada aparece nem some empurrando o resto. */
    .run-fill { position: absolute; inset: 0; background: #f99126; transform: scaleX(0); transform-origin: left; }
    .run-text { position: relative; display: flex; align-items: center; justify-content: center; gap: 8px; line-height: 1.25; }
    .run:disabled .run-text { color: #fff; text-shadow: 0 1px 2px rgba(0, 0, 0, .45); }

    .metrics { display: grid; gap: 9px; }
    .metric { padding: 9px 11px; border-radius: 11px; background: rgba(255, 255, 255, .04); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .09); }
    .metric-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
    .metric-head b { display: block; font-size: 12.5px; }
    .metric-head span { font-size: 10.5px; color: rgba(255, 255, 255, .6); }
    .gain { flex: none; padding: 2px 7px; border-radius: 6px; font-size: 10px !important; font-weight: 800; white-space: nowrap; color: #6ee7b7 !important; background: rgba(16, 185, 129, .15); box-shadow: inset 0 0 0 1px rgba(16, 185, 129, .3); }
    .bar-row { display: grid; grid-template-columns: 54px minmax(0, 1fr) minmax(64px, auto); align-items: center; gap: 8px; margin: 4px 0; font-size: 10.5px; }
    .bar-name { font-weight: 700; }
    .bar-wasm, .metric .bar-row:nth-of-type(2) .bar-value { color: #6ee7b7; }
    .bar-js, .metric .bar-row:nth-of-type(3) .bar-value { color: #fcd34d; }
    .bar { height: 7px; overflow: hidden; border-radius: 999px; background: rgba(255, 255, 255, .08); }
    /* As barras crescem/encolhem por transform: no início de um novo teste elas recolhem animadas. */
    .bar-fill { display: block; height: 100%; border-radius: inherit; transform: scaleX(0); transform-origin: left; transition: transform .8s cubic-bezier(.2, .9, .3, 1); }
    .fill-wasm { background: #34d399; }
    .fill-js { background: #f59e0b; }
    .live .fill-wasm { transform: scaleX(1); }
    .live .fill-js { transform: scaleX(var(--w, .2)); transition-delay: .12s; }
    .bar-value { font-weight: 700; text-align: right; opacity: .25; transition: opacity .5s ease; }
    .live .bar-value { opacity: 1; }
    .metric p { margin-top: 4px; font-size: 10.5px; line-height: 1.4; color: rgba(255, 255, 255, .62); }
    .bench-note { font-size: 10.5px; line-height: 1.45; color: rgba(255, 255, 255, .62); }
    .bench-note i { margin-right: 4px; color: #f99126; }

    .pillars { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap: 8px; }
    .pillars li { display: flex; align-items: center; gap: 9px; padding: 7px 9px; border-radius: 9px; background: rgba(255, 255, 255, .04); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .09); }
    .pillars i { color: #f99126; }
    .pillars b { display: block; font-size: 11.5px; }
    .pillars span span { display: block; font-size: 10.5px; line-height: 1.3; color: rgba(255, 255, 255, .62); }

    .real { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; padding: 10px; border-radius: 12px; background: rgba(255, 255, 255, .05); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .1); }
    @container wasm (min-width: 420px) { .real { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); align-items: center; } }
    .real-shot { overflow: hidden; border-radius: 8px; box-shadow: 0 0 0 1px rgba(255, 255, 255, .14); }
    .real-shot img { display: block; width: 100%; height: auto; transition: transform .6s cubic-bezier(.16, 1, .3, 1); }
    .real:hover .real-shot img { transform: scale(1.04); }
    .real figcaption { display: grid; gap: 4px; justify-items: start; }
    .real figcaption b { font-size: 13.5px; }
    .real figcaption > span:not(.bench-tag) { font-size: 11.5px; line-height: 1.4; color: rgba(255, 255, 255, .72); }
    .real small { font-size: 10.5px; color: rgba(255, 255, 255, .6); }
    .real small i { margin-right: 3px; color: #f99126; }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition: none !important; }
    }
  `],
})
export class WasmDemoComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoCanvas') private canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('progressFill') private fillRef?: ElementRef<HTMLElement>;
  @ViewChild('playhead') private headRef?: ElementRef<HTMLElement>;

  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly showcase = new Showcase(inject(ElementRef).nativeElement, this.zone, {
    play: () => this.play(),
    rewind: () => this.rewind(),
    active: (on) => (on ? this.startLoop() : this.stopLoop()),
  }, 10000);

  readonly duration = 30;
  readonly budget = FRAME_BUDGET_MS;
  readonly ticks = [0, 6, 12, 18, 24, 30];
  readonly waveBars = [
    25, 45, 75, 90, 60, 35, 80, 100, 70, 50, 65, 85, 40, 95, 60, 75,
    30, 65, 90, 45, 70, 80, 55, 90, 100, 65, 40, 85, 70, 45, 30, 60,
  ];

  readonly filterPresets: FilterPreset[] = [
    { id: 'teal', name: 'Teal & Orange', icon: 'fa-solid fa-film', desc: 'lutTeal' },
    { id: 'rec709', name: 'Rec.709', icon: 'fa-solid fa-eye', desc: 'lutRec' },
    { id: 'cyber', name: 'Cyberpunk', icon: 'fa-solid fa-bolt', desc: 'lutCyber' },
    { id: 'noir', name: '35 mm Noir', icon: 'fa-solid fa-camera-retro', desc: 'lutNoir' },
  ];

  readonly aspects = [
    { id: '16:9', title: 'aspectWide' },
    { id: '9:16', title: 'aspectTall' },
    { id: '1:1', title: 'aspectSquare' },
  ] as const;

  /** Valores ilustrativos de um cenário típico (a interface avisa que não são medições). */
  readonly benchmarkMetrics: BenchmarkMetric[] = [
    { id: 'scrub', title: 'm1Title', sub: 'm1Sub', note: 'm1Note', unit: 'fps', wasmValue: 60, jsValue: 14.2, jsBar: 24, gain: 4.2 },
    { id: 'grade', title: 'm2Title', sub: 'm2Sub', note: 'm2Note', unit: 'ms', wasmValue: 3.8, jsValue: 44.5, jsBar: 16, gain: 11.7 },
    { id: 'memory', title: 'm3Title', sub: 'm3Sub', note: 'm3Note', unit: '', wasmValue: 100, jsValue: 25, jsBar: 25 },
    { id: 'export', title: 'm4Title', sub: 'm4Sub', note: 'm4Note', unit: 's', wasmValue: 7.8, jsValue: 54.6, jsBar: 14, gain: 7 },
  ];

  readonly pillars = [
    { icon: 'fa-solid fa-microchip', title: 'p1Title', text: 'p1Text' },
    { icon: 'fa-solid fa-server', title: 'p2Title', text: 'p2Text' },
    { icon: 'fa-solid fa-shield-halved', title: 'p3Title', text: 'p3Text' },
    { icon: 'fa-solid fa-gears', title: 'p4Title', text: 'p4Text' },
  ] as const;

  activeEngine: Engine = 'wasm';
  activeProfile: MediaProfile = 'heavy';
  isPlaying = !this.showcase.reduced;
  currentTime = 4.2;
  selectedFilter: FilterId = 'teal';
  selectedAspect: Aspect = '16:9';

  /** Alvos da telemetria do motor ativo (os valores exibidos seguem em `shown`). */
  currentFps = 60;
  frameTimeMs = 3.8;
  droppedFrames = 0;
  showJsWarning = false;

  /** Valores exibidos: perseguem os alvos aos poucos, então nenhum contador "pula". */
  shown = { fps: 60, frame: 3.8, dropped: 0, mem: 64 };

  isBenchmarking = false;
  benchmarkProgress = 0;
  /** Quantos cartões do comparativo já mostram resultado. */
  revealed = 4;

  private raf = 0;
  private lastFrame = 0;
  private lastPaint = 0;
  private clock = 0;
  /** Deslocamento da cena: mantém a animação contínua quando o cursor volta ao início. */
  private sceneBase = 0;
  private rewindFrom = -1;
  private rewindStart = 0;
  private jsTick = 0;
  private benchStart = 0;
  private benchHold = 0;
  private dirty = true;
  private destroyed = false;
  private ctx: CanvasRenderingContext2D | null = null;
  private resizeObs?: ResizeObserver;
  private stopScrub: (() => void) | null = null;

  constructor() {
    // O texto dentro do canvas é redesenhado quando o idioma muda, mesmo com o vídeo pausado.
    effect(() => {
      this.i18n.lang();
      this.dirty = true;
    });
  }

  get currentFilterName(): string {
    return this.filterPresets.find((f) => f.id === this.selectedFilter)?.name ?? '';
  }

  get currentAspectLabel(): string {
    if (this.selectedAspect === '9:16') return this.t('aspectTagTall');
    if (this.selectedAspect === '1:1') return this.t('aspectTagSquare');
    return this.t('aspectTagWide');
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas && typeof ResizeObserver !== 'undefined') {
      this.resizeObs = new ResizeObserver(() => this.fitCanvas());
      this.resizeObs.observe(canvas);
    }
    this.fitCanvas();
    this.showcase.attach();
    if (!this.showcase.isActive) this.paint();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.showcase.destroy();
    this.stopLoop();
    this.resizeObs?.disconnect();
    this.stopScrub?.();
  }

  // ---------- ações da pessoa ----------

  pickEngine(engine: Engine): void {
    this.showcase.interact();
    this.setEngine(engine);
  }

  pickProfile(profile: MediaProfile): void {
    this.showcase.interact();
    this.setProfile(profile);
  }

  setEngine(engine: Engine): void {
    if (this.activeEngine === engine) return;
    this.activeEngine = engine;
    this.applyTelemetry();
  }

  setProfile(profile: MediaProfile): void {
    if (this.activeProfile === profile) return;
    this.activeProfile = profile;
    this.applyTelemetry();
  }

  setFilter(id: FilterId): void {
    this.showcase.interact();
    this.selectedFilter = id;
    this.dirty = true;
  }

  setAspect(aspect: Aspect): void {
    this.showcase.interact();
    this.selectedAspect = aspect;
    this.dirty = true;
  }

  togglePlay(): void {
    this.showcase.interact();
    this.isPlaying = !this.isPlaying;
  }

  seekRelative(seconds: number): void {
    this.showcase.interact();
    this.seek(this.currentTime + seconds, this.activeProfile === 'heavy' ? 5 : 2);
  }

  onScrubClick(clientX: number, target: HTMLElement): void {
    const rect = target.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    this.seek(ratio * this.duration, this.activeProfile === 'heavy' ? 4 : 2);
  }

  startScrubbing(ev: PointerEvent): void {
    const el = ev.currentTarget as HTMLElement;
    ev.preventDefault();
    el.focus({ preventScroll: true });
    this.showcase.interact();
    this.stopScrub?.();
    this.onScrubClick(ev.clientX, el);
    const move = (e: PointerEvent) => this.onScrubClick(e.clientX, el);
    const end = () => this.stopScrub?.();
    this.stopScrub = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      this.stopScrub = null;
    };
    this.zone.runOutsideAngular(() => {
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    });
  }

  onScrubKey(ev: KeyboardEvent): void {
    const step = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
    if (!step && ev.key !== 'Home' && ev.key !== 'End') return;
    ev.preventDefault();
    this.showcase.interact();
    this.seek(ev.key === 'Home' ? 0 : ev.key === 'End' ? this.duration : this.currentTime + step, 0);
  }

  runStressBenchmark(): void {
    if (this.isBenchmarking) return;
    this.showcase.interact();
    this.startBench();
  }

  // ---------- textos calculados ----------

  fmt1(value: number): string {
    return this.i18n.number(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  round(value: number): number {
    return Math.round(value);
  }

  overBudget(): string {
    return this.i18n.number(Math.round(((this.shown.frame - FRAME_BUDGET_MS) / FRAME_BUDGET_MS) * 100));
  }

  memValue(): string {
    const mb = this.shown.mem;
    return mb >= 1000 ? this.fmt1(mb / 1000) : this.i18n.number(Math.round(mb));
  }

  benchLabel(): string {
    if (this.benchmarkProgress >= 100) return this.t('benchDone');
    const step = BENCH_STEPS[Math.min(BENCH_STEPS.length - 1, Math.floor(this.benchmarkProgress / 25))];
    return this.t(step, { n: this.i18n.number(1800) });
  }

  metricValue(metric: BenchmarkMetric, engine: Engine): string {
    if (!metric.unit) return this.t(engine === 'wasm' ? 'm3Wasm' : 'm3Js');
    return `${this.fmt1(engine === 'wasm' ? metric.wasmValue : metric.jsValue)} ${metric.unit}`;
  }

  gainLabel(metric: BenchmarkMetric): string {
    if (metric.gain === undefined) return this.t('gainStable');
    return this.t('gainFaster', { x: this.i18n.number(metric.gain, { maximumFractionDigits: 1 }) });
  }

  formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  formatTimecode(sec: number): string {
    const f = Math.floor((sec % 1) * 60);
    return `00:${this.formatTime(sec)}:${String(f).padStart(2, '0')}`;
  }

  // ---------- roteiro do modo vitrine ----------

  private play(): void {
    this.showcase.seq([
      [3800, () => this.setEngine('js')],
      [5200, () => this.setEngine('wasm')],
      [2200, () => this.startBench()],
      [BENCH_MS + 3600, () => this.showcase.loop()],
    ]);
  }

  /** Volta ao ponto de partida sem cortes: motor rápido de novo e contadores descendo aos poucos. */
  private rewind(): number {
    this.setEngine('wasm');
    this.isPlaying = true;
    this.droppedFrames = 0;
    if (this.isBenchmarking) {
      this.isBenchmarking = false;
      this.revealed = this.benchmarkMetrics.length;
    }
    return 900;
  }

  private startBench(): void {
    this.isBenchmarking = true;
    this.benchmarkProgress = 0;
    this.revealed = 0;
    this.benchStart = 0;
    this.benchHold = 0;
    if (!this.raf) this.finishBench();
  }

  private finishBench(): void {
    this.isBenchmarking = false;
    this.benchmarkProgress = 100;
    this.revealed = this.benchmarkMetrics.length;
  }

  private seek(time: number, droppedInJs: number): void {
    this.currentTime = Math.max(0, Math.min(this.duration, time));
    this.rewindFrom = -1;
    if (this.activeEngine === 'js') this.droppedFrames += droppedInJs;
    this.dirty = true;
    if (!this.raf) this.paint();
  }

  private applyTelemetry(): void {
    if (this.activeEngine === 'wasm') {
      this.currentFps = 60;
      this.frameTimeMs = 3.8;
      this.showJsWarning = false;
      // Cada motor começa uma medição nova: o contador desce (animado) em vez de ficar parado.
      this.droppedFrames = 0;
    } else {
      const heavy = this.activeProfile === 'heavy';
      this.currentFps = heavy ? 7.4 : 14.2;
      this.frameTimeMs = heavy ? 135 : 44.5;
      this.droppedFrames += heavy ? 12 : 4;
      this.showJsWarning = true;
    }
    this.dirty = true;
  }

  private memTarget(): number {
    if (this.activeEngine === 'wasm') return 64;
    return this.activeProfile === 'heavy' ? 1400 : 380;
  }

  // ---------- laço de animação (fora da NgZone) ----------

  private startLoop(): void {
    if (this.raf || this.destroyed || typeof requestAnimationFrame === 'undefined') return;
    this.lastFrame = 0;
    this.zone.runOutsideAngular(() => {
      const frame = (now: number) => {
        if (this.destroyed) return;
        this.raf = requestAnimationFrame(frame);
        this.step(now);
      };
      this.raf = requestAnimationFrame(frame);
    });
  }

  private stopLoop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private step(now: number): void {
    const dt = this.lastFrame ? Math.min(0.1, (now - this.lastFrame) / 1000) : 0;
    this.lastFrame = now;
    this.clock += dt;

    // No modo JavaScript só um a cada N quadros é entregue: é o "engasgo" da simulação.
    const skip = this.activeEngine === 'js' ? (this.activeProfile === 'heavy' ? 8 : 4) : 1;
    this.jsTick = (this.jsTick + 1) % skip;
    const delivers = this.jsTick === 0;

    if (this.rewindFrom >= 0) {
      // Fim do clipe: o cursor volta ao início com easing; a cena continua de onde estava.
      const k = Math.min(1, (now - this.rewindStart) / 650);
      const eased = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const next = this.rewindFrom * (1 - eased);
      this.sceneBase += this.currentTime - next + dt;
      this.currentTime = next;
      if (k >= 1) this.rewindFrom = -1;
      this.dirty = true;
    } else if (this.isPlaying) {
      this.currentTime += dt;
      if (this.currentTime >= this.duration) {
        this.currentTime = this.duration;
        this.rewindFrom = this.duration;
        this.rewindStart = now;
      }
      if (this.activeEngine === 'js') this.droppedFrames += dt * (60 - this.currentFps) * 0.22;
      this.dirty = true;
    }

    // Telemetria exibida persegue o alvo (com uma leve oscilação quando o motor é o JavaScript).
    const ease = 1 - Math.exp(-dt * 5);
    const wobble = this.activeEngine === 'js' ? Math.sin(this.clock * 3.1) * 0.6 + Math.sin(this.clock * 7.3) * 0.3 : 0;
    const s = this.shown;
    s.fps += (this.currentFps + wobble - s.fps) * ease;
    s.frame += (this.frameTimeMs - wobble * 4 - s.frame) * ease;
    s.mem += (this.memTarget() - s.mem) * ease;
    s.dropped += (this.droppedFrames - s.dropped) * (1 - Math.exp(-dt * 7));

    if (this.isBenchmarking) {
      if (!this.benchStart) this.benchStart = now;
      const k = Math.min(1, (now - this.benchStart) / BENCH_MS);
      this.benchmarkProgress = (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2) * 100;
      this.revealed = Math.min(this.benchmarkMetrics.length, Math.floor(this.benchmarkProgress / 25));
      if (k >= 1) {
        if (!this.benchHold) this.benchHold = now;
        if (now - this.benchHold > 800) this.finishBench();
      }
    }

    if (this.dirty && delivers) {
      this.dirty = false;
      this.paint();
    }

    // O template é atualizado ~8 vezes por segundo: suficiente para números, leve para o Angular.
    if (now - this.lastPaint > 120) {
      this.lastPaint = now;
      this.cdr.detectChanges();
    }
  }

  private fitCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round((canvas.clientWidth || 640) * dpr));
    const h = Math.round((w * 9) / 16);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    this.dirty = true;
    if (!this.raf) this.paint();
  }

  private paint(): void {
    const ratio = this.currentTime / this.duration;
    const fill = this.fillRef?.nativeElement;
    const head = this.headRef?.nativeElement;
    if (fill) fill.style.transform = `scaleX(${ratio})`;
    if (head) head.style.transform = `translateX(${ratio * 100}%)`;
    this.drawScene();
  }

  private drawScene(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = (this.ctx ??= canvas.getContext('2d'));
    if (!ctx) return;

    const W = 640;
    const H = 360;
    const k = canvas.width / W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const t = this.sceneBase + this.currentTime;
    const pal = PALETTES[this.selectedFilter];

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, pal.bg[0]);
    bg.addColorStop(0.5, pal.bg[1]);
    bg.addColorStop(1, pal.bg[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Piso em perspectiva. As linhas horizontais avançam de forma periódica: quando a fase
    // completa um ciclo, cada linha ocupa exatamente o lugar da seguinte (sem salto).
    const horizon = H * 0.6;
    ctx.strokeStyle = pal.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -9; i <= 9; i++) {
      ctx.moveTo(W / 2 + i * 12, horizon);
      ctx.lineTo(W / 2 + i * 96, H);
    }
    const rows = 9;
    const phase = (t * 0.55) % 1;
    for (let j = 0; j < rows; j++) {
      const z = (j + phase) / rows;
      const y = horizon + (H - horizon) * z * z;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    // Cubo girando (projeção ortográfica, faces pintadas de trás para a frente).
    const angle = t * 0.9;
    const tilt = 0.55;
    const size = 50 + Math.sin(t * 2) * 3;
    const cx = W / 2;
    const cy = H * 0.4;
    const pts = CUBE.map(([x, y, z]) => {
      const x1 = x * Math.cos(angle) + z * Math.sin(angle);
      const z1 = -x * Math.sin(angle) + z * Math.cos(angle);
      const y1 = y * Math.cos(tilt) - z1 * Math.sin(tilt);
      const z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt);
      return [cx + x1 * size, cy + y1 * size, z2] as const;
    });
    const faces = FACES.map((f) => ({ f, depth: pts[f[0]][2] + pts[f[1]][2] + pts[f[2]][2] + pts[f[3]][2] })).sort(
      (a, b) => a.depth - b.depth,
    );
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    for (const { f } of faces) {
      ctx.beginPath();
      ctx.moveTo(pts[f[0]][0], pts[f[0]][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(pts[f[i]][0], pts[f[i]][1]);
      ctx.closePath();
      ctx.fillStyle = pal.cube[f[4]];
      ctx.fill();
      ctx.stroke();
    }

    // Enquadramento escolhido.
    if (this.selectedAspect === '16:9') {
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.strokeRect(W * 0.06, H * 0.08, W * 0.88, H * 0.84);
      ctx.setLineDash([]);
    } else {
      const fw = this.selectedAspect === '9:16' ? H * (9 / 16) : H * 0.9;
      const fh = this.selectedAspect === '9:16' ? H : H * 0.9;
      const fx = (W - fw) / 2;
      const fy = (H - fh) / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, fx, H);
      ctx.fillRect(fx + fw, 0, fx, H);
      ctx.fillRect(fx, 0, fw, fy);
      ctx.fillRect(fx, fy + fh, fw, fy);
      ctx.strokeStyle = '#f99126';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(fx, fy, fw, fh);
    }

    // Legenda inferior (texto traduzido: redesenhado a cada quadro e na troca de idioma).
    const lx = W * 0.06;
    const ly = H * 0.75;
    ctx.fillStyle = 'rgba(0,0,0,0.66)';
    ctx.fillRect(lx, ly, W * 0.46, 36);
    ctx.fillStyle = '#f99126';
    ctx.fillRect(lx, ly, 4, 36);
    ctx.textBaseline = 'alphabetic';
    ctx.font = '700 11px Montserrat, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('UNRENDER · DEMO', lx + 13, ly + 15);
    ctx.font = '9px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const profile = this.activeProfile === 'heavy' ? 'PRORES 4K' : 'H.264 1080P';
    ctx.fillText(`${this.t('sceneTag')} · ${this.currentFilterName.toUpperCase()} · ${profile}`, lx + 13, ly + 28);

    // Medidor de áudio.
    ctx.fillStyle = pal.accent;
    for (let i = 0; i < 14; i++) {
      const level = Math.sin(t * 8 + i * 0.6) * 0.5 + 0.5;
      const barH = 4 + level * 18;
      ctx.fillRect(W * 0.82 + i * 5, H * 0.85 - barH, 3, barH);
    }
  }
}
