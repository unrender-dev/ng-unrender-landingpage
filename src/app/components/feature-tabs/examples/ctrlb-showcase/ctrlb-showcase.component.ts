import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
  inject,
} from '@angular/core';
import { I18nService } from '../../../../i18n/i18n.service';
import { FOCUS_TEXT, Focus, I18N, SCREEN_TEXT, ScreenId } from './ctrlb-showcase.i18n';

/**
 * Vitrine viva do SGA CTRLB com telas reais do sistema.
 * Mostra módulo a módulo (autoplay), com cursor animado indo até o recurso
 * em destaque, zoom suave na tela e uma legenda explicando o que aquela parte faz.
 *
 * Use [focus] para escolher o recorte de módulos mostrado em cada aba:
 *  - 'erp'    → gestão do dia a dia (dashboard, atendimento, CRM, agenda, compras...)
 *  - 'ai'     → recursos de IA integrados (copiloto, IA de documento, testes com IA...)
 *  - 'web'    → o que roda no navegador (editores de vídeo/imagem/documento, mapa mental...)
 *  - 'custom' → o que é feito sob medida (multiunidades, métricas, telemetria, testes)
 */
interface CtrlbScreen {
  id: ScreenId;
  icon: string;
  route: string;
  light: string;
  dark?: string;
  /** posição do recurso em destaque, em % da captura */
  hx: number;
  hy: number;
  /** tamanho original da captura (padrão 1440×900) */
  w?: number;
  h?: number;
}

/** Uma camada de imagem empilhada no palco (uma por módulo e tema). */
interface Layer { key: string; screen: number; dark: boolean; src: string; }

interface Point { x: number; y: number; }

const BASE = 'images/real-screens/';
const STAGE_RATIO = 1440 / 900;

const SCREENS: Record<ScreenId, CtrlbScreen> = {
  dashboard: { id: 'dashboard', icon: 'fa-solid fa-gauge-high', route: 'dashboard', light: 'dashboard-live.png', dark: 'dashboard-live-dark.png', hx: 46, hy: 60 },
  atendimento: { id: 'atendimento', icon: 'fa-brands fa-whatsapp', route: 'atendimento', light: 'conversas-live.png', dark: 'conversas-live-dark.png', hx: 28, hy: 19.5 },
  crm: { id: 'crm', icon: 'fa-solid fa-filter-circle-dollar', route: 'comercial/crm', light: 'crm-live.png', dark: 'crm-live-dark.png', hx: 63, hy: 41 },
  agenda: { id: 'agenda', icon: 'fa-regular fa-calendar-check', route: 'agenda', light: 'agenda-live.png', dark: 'agenda-live-dark.png', hx: 23, hy: 61 },
  comercial: { id: 'comercial', icon: 'fa-solid fa-handshake', route: 'comercial/agenda', light: 'comercial-live.png', hx: 23, hy: 61 },
  compras: { id: 'compras', icon: 'fa-solid fa-cart-flatbed', route: 'compras', light: 'compras-live.png', hx: 23, hy: 29 },
  marketing: { id: 'marketing', icon: 'fa-solid fa-bullhorn', route: 'marketing', light: 'marketing-live.png', dark: 'marketing-live-dark.png', hx: 30, hy: 29 },
  unidades: { id: 'unidades', icon: 'fa-solid fa-building', route: 'admin/unidades', light: 'admin-unidades-live.png', dark: 'admin-unidades-live-dark.png', hx: 50, hy: 32 },
  metricas: { id: 'metricas', icon: 'fa-solid fa-chart-line', route: 'metricas', light: 'metricas-live.png', hx: 36, hy: 47 },
  telemetria: { id: 'telemetria', icon: 'fa-solid fa-server', route: 'sistema/metricas', light: 'metricas-sistema-live.png', dark: 'metricas-sistema-live-dark.png', hx: 50, hy: 31 },
  testes: { id: 'testes', icon: 'fa-solid fa-vial-circle-check', route: 'sistema/testes', light: 'qualidade-ia-live.png', dark: 'qualidade-ia-live-dark.png', hx: 21, hy: 41 },
  iaDocumento: { id: 'iaDocumento', icon: 'fa-solid fa-wand-magic-sparkles', route: 'documentos/manual', light: 'ia-documento-previa.png', hx: 76, hy: 60, w: 1360, h: 900 },
  documento: { id: 'documento', icon: 'fa-regular fa-file-lines', route: 'documentos/manual', light: 'editor-documento-aberto.png', hx: 55, hy: 80, w: 1360, h: 860 },
  video: { id: 'video', icon: 'fa-solid fa-film', route: 'editor/video', light: 'editor-video-live.png', dark: 'editor-video-live-dark.png', hx: 44, hy: 42 },
  imagem: { id: 'imagem', icon: 'fa-regular fa-image', route: 'editor/imagem', light: 'editor-imagem-live.png', dark: 'editor-imagem-live-dark.png', hx: 39, hy: 46 },
  mapa: { id: 'mapa', icon: 'fa-solid fa-diagram-project', route: 'mapas/novo', light: 'mapa-mental-aberto.png', hx: 52, hy: 53, w: 1360, h: 900 },
};

const FOCUS_SETS: Record<Focus, ScreenId[]> = {
  erp: ['dashboard', 'atendimento', 'crm', 'agenda', 'compras', 'marketing', 'unidades'],
  ai: ['dashboard', 'iaDocumento', 'imagem', 'video', 'testes', 'atendimento'],
  web: ['video', 'imagem', 'documento', 'mapa', 'telemetria', 'dashboard'],
  custom: ['unidades', 'comercial', 'compras', 'metricas', 'telemetria', 'testes'],
  all: Object.keys(SCREENS) as ScreenId[],
};

const STAT_ICONS: Record<Focus, [string, string, string]> = {
  erp: ['fa-solid fa-layer-group', 'fa-brands fa-whatsapp', 'fa-solid fa-building'],
  ai: ['fa-solid fa-brain', 'fa-solid fa-wand-magic-sparkles', 'fa-solid fa-vial-circle-check'],
  web: ['fa-solid fa-film', 'fa-regular fa-image', 'fa-solid fa-plug-circle-xmark'],
  custom: ['fa-solid fa-building', 'fa-solid fa-server', 'fa-solid fa-vial-circle-check'],
  all: ['fa-solid fa-layer-group', 'fa-solid fa-brain', 'fa-solid fa-cloud'],
};

/**
 * Linha do tempo de cada módulo (ms). Um único relógio contínuo dirige barra de
 * progresso, digitação da rota e fases — por isso pausar e retomar não dá salto.
 */
const SLIDE_MS = 7600;
const T_MOVE = 450;      // cursor sai de onde estava e viaja até o recurso
const T_CLICK = 1650;    // clique, anel de destaque e zoom
const T_OUT = SLIDE_MS - 1150; // zoom volta antes de trocar de módulo
const TYPE_MS = 28;

@Component({
  selector: 'app-ctrlb-showcase',
  standalone: true,
  imports: [],
  template: `
  <div class="ctrlb-sc rounded-2xl overflow-hidden shadow-2xl" #root
       (pointerenter)="onPointer($event, true)" (pointerleave)="onPointer($event, false)"
       (focusin)="onFocusIn($event)" (focusout)="onFocusOut($event)">

    <!-- Cabeçalho -->
    <div class="sc-head flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-4">
      <div class="flex items-center gap-3 min-w-0">
        <div class="sc-logo shrink-0"><img src="ctrlb-logo.png" alt="CTRLB" /></div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest sc-tag">
            <span class="sc-live shrink-0"></span><span class="min-w-0">{{ copy().tag }}</span>
          </div>
          <div class="text-white font-bold text-sm md:text-lg leading-tight">{{ copy().headline }}</div>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        @if (!reduced) {
        <button type="button" class="sc-round" (click)="togglePlay()" [attr.aria-label]="userPaused ? t('play') : t('pause')" [title]="userPaused ? t('play') : t('pause')">
          <i class="fa-solid" [class.fa-pause]="!userPaused" [class.fa-play]="userPaused" aria-hidden="true"></i>
        </button>
        }
        @if (hasDark) {
        <div class="sc-theme" role="group" [attr.aria-label]="t('themeGroup')">
          <button type="button" [class.on]="!dark" [attr.aria-pressed]="!dark" (click)="setDark(false)" [title]="t('light')" [attr.aria-label]="t('light')"><i class="fa-solid fa-sun" aria-hidden="true"></i></button>
          <button type="button" [class.on]="dark" [attr.aria-pressed]="dark" (click)="setDark(true)" [title]="t('dark')" [attr.aria-label]="t('dark')"><i class="fa-solid fa-moon" aria-hidden="true"></i></button>
        </div>
        }
        <a href="https://ctrlb.com.br" target="_blank" rel="noopener" class="sc-cta">
          {{ t('cta') }} <i class="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden="true"></i>
        </a>
      </div>
    </div>

    <div class="sc-body flex flex-col gap-3 p-3 md:p-4">
      <!-- Módulos: lista horizontal (rolável no celular) -->
      <div class="sc-rail-wrap">
        <div class="sc-rail" #rail role="group" [attr.aria-label]="t('modules')">
          @for (s of screens; track s.id; let i = $index) {
          <button type="button" class="sc-chip" [class.active]="i === index" [attr.aria-current]="i === index ? 'true' : null" (click)="go(i)">
            <i [class]="s.icon" aria-hidden="true"></i>
            <span>{{ text()[s.id].label }}</span>
            <span class="sc-chip-bar" aria-hidden="true"><span class="sc-chip-fill" #fill></span></span>
          </button>
          }
        </div>
      </div>

      <!-- Janela do navegador -->
      <div class="sc-window rounded-xl overflow-hidden">
        <div class="sc-chrome flex items-center gap-2 px-3 py-2">
          <span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
          <div class="sc-url flex-1 min-w-0 truncate" aria-hidden="true">
            <i class="fa-solid fa-lock text-[9px] text-emerald-500 mr-1"></i>app.ctrlb.com.br/<span class="text-gray-800" #typed></span><span class="sc-caret"></span>
          </div>
          <span class="sc-badge hidden sm:inline-flex"><span class="sc-live"></span>{{ t('real') }}</span>
        </div>

        <div class="sc-view">
          <div class="sc-stage" #stage>
            <div class="sc-zoom" [style.transform]="zoomTransform">
              @for (l of layers; track l.key) {
              <img class="sc-shot" [class.on]="isOn(l)" [attr.src]="primed.has(l.key) ? l.src : null"
                   [alt]="isOn(l) ? t('alt', { modulo: text()[screens[l.screen].id].label }) : ''"
                   [attr.aria-hidden]="isOn(l) ? null : 'true'" decoding="async" draggable="false" />
              }
              <div class="sc-pin" [style.transform]="'translate(' + spot.x + '%,' + spot.y + '%)'">
                <div class="sc-unzoom" [style.transform]="unzoom"><div class="sc-spot" [class.show]="phase === 2"></div></div>
              </div>
              <div class="sc-pin sc-travel" [style.transform]="'translate(' + cursor.x + '%,' + cursor.y + '%)'">
                <div class="sc-unzoom" [style.transform]="unzoom">
                  <div class="sc-cursor" [class.click]="phase === 2">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 2l15 10-7 1.5L9 21z" fill="#10051c" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- legenda do recurso em destaque: todas empilhadas na mesma célula, só a ativa aparece
             (a altura é a da maior, então trocar de módulo não empurra a página) -->
        <div class="sc-caption" aria-live="off">
          @for (s of screens; track s.id; let i = $index) {
          <div class="sc-cap" [class.on]="i === index" [attr.aria-hidden]="i === index ? null : 'true'">
            <span class="sc-tip-ico"><i [class]="s.icon" aria-hidden="true"></i></span>
            <div class="min-w-0">
              <strong>{{ text()[s.id].title }}</strong>
              <p>{{ text()[s.id].text }}</p>
            </div>
          </div>
          }
        </div>
      </div>
      <p class="sc-note"><i class="fa-solid fa-camera" aria-hidden="true"></i> {{ t('note') }}</p>
    </div>

    <!-- Números -->
    <div class="sc-stats grid grid-cols-3 gap-2 px-3 md:px-4 pb-4">
      @for (st of copy().stats; track $index) {
      <div class="sc-stat">
        <i [class]="statIcons[$index]" aria-hidden="true"></i>
        <div class="min-w-0"><strong>{{ st.value }}</strong><span>{{ st.label }}</span></div>
      </div>
      }
    </div>
  </div>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .ctrlb-sc { background: radial-gradient(120% 140% at 0% 0%, #2a1146 0%, #10051c 55%, #0a0311 100%); border: 1px solid rgba(249,145,38,.25); }
    .sc-tag { color: #f99126; }
    .sc-logo { width: 44px; height: 44px; border-radius: 12px; background: #fff; display:flex; align-items:center; justify-content:center; padding: 6px; box-shadow: 0 0 0 3px rgba(249,145,38,.25); }
    .sc-logo img { width: 100%; height: 100%; object-fit: contain; }
    .sc-live { position: relative; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block; }
    .sc-live::after { content:''; position:absolute; inset:0; border-radius:50%; background:#22c55e; animation: scPing 1.8s ease-out infinite; }
    @keyframes scPing { 0% { transform: scale(1); opacity:.7; } 70%, 100% { transform: scale(2.6); opacity:0; } }

    .sc-round, .sc-theme button { display:inline-flex; align-items:center; justify-content:center; color: rgba(255,255,255,.7); font-size: 12px; transition: background-color .2s, color .2s, transform .15s; }
    .sc-round { width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,.08); }
    .sc-round:hover { background: rgba(255,255,255,.16); color:#fff; }
    .sc-round:active, .sc-theme button:active { transform: scale(.92); }
    .sc-theme { display:flex; background: rgba(255,255,255,.08); border-radius: 999px; padding: 3px; }
    .sc-theme button { width: 34px; height: 28px; border-radius: 999px; }
    .sc-theme button.on { background: #f99126; color: #10051c; }
    .sc-cta { display:inline-flex; align-items:center; gap:6px; background:#f99126; color:#10051c; font-weight:700; font-size:12px; padding:8px 14px; border-radius:999px; text-decoration:none; transition: transform .2s, box-shadow .2s; }
    .sc-cta:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(249,145,38,.4); color:#10051c; }
    .sc-cta:active { transform: translateY(0) scale(.97); }
    .ctrlb-sc :focus-visible { outline: 2px solid #f99126; outline-offset: 2px; }
    .sc-chip:focus-visible { outline-color: #fff; }

    .sc-rail-wrap { position: relative; min-width: 0; }
    .sc-rail { display:flex; flex-wrap: wrap; gap: 8px; }
    .sc-chip { position: relative; display:flex; align-items:center; gap:8px; white-space:nowrap; padding: 9px 14px 10px; border-radius: 999px; color: rgba(255,255,255,.7); background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); font-size: 13px; font-weight: 600; transition: color .3s, background-color .3s, border-color .3s, box-shadow .3s, transform .15s; overflow: hidden; flex-shrink: 0; scroll-snap-align: start; }
    .sc-chip i { width: 16px; text-align:center; color: rgba(249,145,38,.85); transition: color .3s; }
    .sc-chip:hover { color: #fff; background: rgba(255,255,255,.1); }
    .sc-chip:active { transform: scale(.96); }
    .sc-chip.active { color: #10051c; background: #f99126; border-color: #f99126; box-shadow: 0 6px 18px rgba(249,145,38,.35); }
    .sc-chip.active i { color: #10051c; }
    /* a barra fica sempre no DOM: só a opacidade troca, então não "pisca" ao reiniciar */
    .sc-chip-bar { position:absolute; left:14px; right:14px; bottom:4px; height: 2px; border-radius: 2px; background: rgba(16,5,28,.18); overflow:hidden; opacity: 0; transition: opacity .35s; }
    .sc-chip.active .sc-chip-bar { opacity: 1; }
    .sc-chip-fill { display:block; height:100%; width:100%; background:#10051c; transform: scaleX(0); transform-origin: left center; will-change: transform; }

    .sc-window { background: #fff; box-shadow: 0 25px 60px rgba(0,0,0,.45); }
    .sc-chrome { background: #eef0f3; border-bottom: 1px solid #e2e5ea; }
    .dot { width: 10px; height: 10px; border-radius: 50%; display:inline-block; flex-shrink:0; }
    .dot.r { background:#ff5f57; } .dot.y { background:#febc2e; } .dot.g { background:#28c840; }
    .sc-url { background:#fff; border-radius: 999px; padding: 4px 12px; font-size: 11px; color: #8a8f98; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .sc-caret { display:inline-block; width:1px; height: 11px; background:#10051c; margin-left:1px; vertical-align: -1px; animation: scBlink 1s steps(1) infinite; }
    @keyframes scBlink { 50% { opacity: 0; } }
    .sc-badge { align-items:center; gap:6px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#15803d; background:#dcfce7; padding:3px 8px; border-radius:999px; white-space: nowrap; }

    .sc-view { position: relative; width: 100%; aspect-ratio: 16 / 10; background: #e9ebef; display:flex; justify-content:center; overflow: hidden; }
    @media (min-width: 768px) { .sc-view { max-height: 56vh; } }
    .sc-stage { position: relative; height: 100%; aspect-ratio: 16 / 10; max-width: 100%; }
    .sc-zoom { position:absolute; inset:0; transform-origin: 0 0; transition: transform 1.15s cubic-bezier(.45,.05,.2,1); will-change: transform; }
    /* crossfade sem "buraco": a nova tela aparece por cima e a antiga só some depois, já coberta */
    .sc-shot { position:absolute; inset:0; width:100%; height:100%; object-fit: contain; display:block; opacity: 0; z-index: 1; transition: opacity 0s linear .75s; user-select: none; }
    .sc-shot.on { opacity: 1; z-index: 2; transition: opacity .75s ease; }

    .sc-pin { position:absolute; inset:0; z-index: 5; pointer-events:none; }
    .sc-travel { transition: transform 1.15s cubic-bezier(.5,0,.2,1); will-change: transform; }
    .sc-unzoom { position:absolute; left:0; top:0; width:0; height:0; transition: transform 1.15s cubic-bezier(.45,.05,.2,1); }
    .sc-spot { position:absolute; left:-23px; top:-23px; width: 46px; height: 46px; border-radius: 50%; border: 3px solid #f99126; opacity: 0; transform: scale(.4); transition: opacity .4s, transform .5s cubic-bezier(.2,1.4,.4,1); }
    .sc-spot::after { content:''; position:absolute; inset:-3px; border-radius:50%; border: 3px solid #f99126; opacity: 0; }
    .sc-spot.show { opacity: 1; transform: scale(1); }
    .sc-spot.show::after { animation: scRing 1.6s ease-out infinite; }
    @keyframes scRing { 0% { transform: scale(1); opacity:.7; } 100% { transform: scale(2); opacity:0; } }
    .sc-cursor { position:absolute; left:-3px; top:-2px; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
    .sc-cursor svg { display:block; transition: transform .18s ease-out; transform-origin: 4px 2px; }
    .sc-cursor.click svg { animation: scPress .45s ease-out; }
    @keyframes scPress { 35% { transform: scale(.82); } 100% { transform: scale(1); } }
    .sc-cursor.click::after { content:''; position:absolute; left:-8px; top:-8px; width: 22px; height: 22px; border-radius:50%; background: rgba(249,145,38,.55); animation: scClick .6s ease-out forwards; }
    @keyframes scClick { from { transform: scale(.2); opacity:1; } to { transform: scale(1.8); opacity:0; } }

    .sc-caption { display:grid; background: #10051c; color:#fff; border-top: 2px solid #f99126; }
    .sc-cap { grid-area: 1 / 1; display:flex; align-items:flex-start; gap: 10px; padding: 10px 14px; opacity: 0; transform: translateY(6px); transition: opacity .3s ease, transform .3s ease; pointer-events: none; }
    .sc-cap.on { opacity: 1; transform: none; transition: opacity .45s ease .3s, transform .45s ease .3s; pointer-events: auto; }
    .sc-cap strong { display:block; font-size: 14px; line-height: 1.25; }
    .sc-cap p { margin: 2px 0 0; font-size: 12.5px; line-height: 1.35; color: rgba(255,255,255,.75); overflow-wrap: anywhere; }
    .sc-tip-ico { width: 28px; height: 28px; border-radius: 8px; margin-top: 2px; background:#f99126; color:#10051c; display:inline-flex; align-items:center; justify-content:center; font-size: 11px; flex-shrink:0; }
    .sc-note { margin: 0; font-size: 11px; color: rgba(255,255,255,.5); }
    .sc-note i { margin-right: 4px; color: rgba(249,145,38,.8); }

    .sc-stat { display:flex; align-items:center; gap:10px; background: rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.07); border-radius: 12px; padding: 10px 12px; color:#fff; min-width: 0; }
    .sc-stat i { color:#f99126; font-size: 18px; }
    .sc-stat strong { display:block; font-size: 15px; line-height: 1.1; overflow-wrap: anywhere; }
    .sc-stat span { display:block; font-size: 10px; color: rgba(255,255,255,.6); line-height: 1.2; overflow-wrap: anywhere; }
    @media (max-width: 640px) {
      .sc-stat { flex-direction: column; align-items:flex-start; gap: 4px; padding: 8px; }
      .sc-stat strong { font-size: 13px; }
      .sc-rail { flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x proximity; margin: 0 -12px; padding: 0 28px 4px 12px; scrollbar-width: none; overscroll-behavior-x: contain; }
      .sc-rail::-webkit-scrollbar { display: none; }
      /* indica que a lista rola para o lado */
      .sc-rail-wrap::after { content:''; position:absolute; top:0; right:-12px; bottom:4px; width: 36px; background: linear-gradient(90deg, rgba(16,5,28,0), #10051c 85%); pointer-events:none; }
      .sc-chip { padding: 0 14px; min-height: 44px; font-size: 12.5px; }
      .sc-chip-bar { bottom: 6px; }
      .sc-round { width: 44px; height: 44px; }
      .sc-theme button { width: 44px; height: 38px; }
      .sc-cta { padding: 12px 16px; }
      .sc-cap { padding: 8px 10px; }
      .sc-cap strong { font-size: 12.5px; }
      .sc-cap p { font-size: 11.5px; }
      .sc-spot { left:-15px; top:-15px; width: 30px; height: 30px; border-width: 2px; }
      .sc-spot::after { inset:-2px; border-width: 2px; }
      .sc-cursor svg { width: 18px; height: 18px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .sc-zoom, .sc-travel, .sc-unzoom, .sc-shot, .sc-shot.on, .sc-cap, .sc-cap.on, .sc-spot, .sc-chip { transition: none; }
      .sc-live::after, .sc-spot.show::after, .sc-caret, .sc-cursor.click svg { animation: none; }
      .sc-cursor.click::after { display: none; }
      .sc-chip-bar { display: none; }
    }
  `],
})
export class CtrlbShowcaseComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() focus: Focus = 'erp';
  @ViewChild('root') root?: ElementRef<HTMLElement>;
  @ViewChild('rail') rail?: ElementRef<HTMLElement>;
  @ViewChild('stage') stage?: ElementRef<HTMLElement>;
  @ViewChild('typed') typed?: ElementRef<HTMLElement>;
  @ViewChildren('fill') fills?: QueryList<ElementRef<HTMLElement>>;

  private readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  readonly t = this.i18n.scope(I18N);

  screens: CtrlbScreen[] = [];
  layers: Layer[] = [];
  /** camadas cuja imagem já pode ser baixada (a atual e a próxima; as demais só quando chegarem) */
  primed = new Set<string>();
  statIcons: readonly string[] = STAT_ICONS.erp;
  index = 0;
  dark = false;
  hasDark = false;
  userPaused = false;
  /** 0 entrando · 1 cursor viajando · 2 clique + zoom + destaque · 3 zoom voltando */
  phase = 0;
  cursor: Point = { x: 92, y: 92 };
  spot: Point = { x: 50, y: 50 };
  reduced = false;

  private zoom = 1.45;
  private elapsed = 0;
  private last = 0;
  private raf = 0;
  private zoomRaf = 0;
  private typedCount = -1;
  private hovering = false;
  private focusHold = false;
  private visible = false;
  private io?: IntersectionObserver;
  private ro?: ResizeObserver;
  private revealTimer: ReturnType<typeof setTimeout> | undefined;

  text() { return this.i18n.pick(SCREEN_TEXT); }
  copy() { return this.i18n.pick(FOCUS_TEXT)[this.safeFocus]; }

  private get safeFocus(): Focus { return FOCUS_SETS[this.focus] ? this.focus : 'erp'; }
  private get current(): CtrlbScreen { return this.screens[this.index]; }
  private get zoomed(): boolean { return this.phase === 2 && !this.reduced; }

  /** translate + scale com origem fixa: interpola suave de qualquer estado para qualquer outro. */
  get zoomTransform(): string {
    if (!this.zoomed) return 'translate(0%, 0%) scale(1)';
    const z = this.zoom;
    return `translate(${-(z - 1) * this.spot.x}%, ${-(z - 1) * this.spot.y}%) scale(${z})`;
  }
  /** cursor e anel não crescem junto com o zoom */
  get unzoom(): string { return `scale(${this.zoomed ? 1 / this.zoom : 1})`; }

  ngOnInit(): void {
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.build();
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['focus'] && !ch['focus'].firstChange) {
      this.build();
      // os elementos das barras são recriados com a nova lista: espera o template atualizar
      setTimeout(() => this.go(0));
    }
  }

  ngAfterViewInit(): void {
    this.go(0);
    this.cdr.detectChanges();
    if (typeof ResizeObserver !== 'undefined' && this.stage) {
      this.ro = new ResizeObserver(entries => {
        const w = entries[0].contentRect.width;
        // no celular a captura de 1440 px fica minúscula: o zoom precisa ser maior para dar leitura
        const z = w < 420 ? 2.5 : w < 640 ? 1.9 : 1.45;
        if (z === this.zoom) return;
        cancelAnimationFrame(this.zoomRaf);
        this.zoomRaf = requestAnimationFrame(() => this.zone.run(() => { this.zoom = z; this.cdr.markForCheck(); }));
      });
      this.ro.observe(this.stage.nativeElement);
    }
    if (this.reduced) return;
    if (typeof IntersectionObserver === 'undefined') { this.visible = true; this.start(); return; }
    this.io = new IntersectionObserver(entries => {
      this.visible = entries.some(e => e.isIntersecting);
      if (this.visible) this.start(); else this.stop();
    }, { threshold: 0.25 });
    this.io.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.stop();
    cancelAnimationFrame(this.zoomRaf);
    clearTimeout(this.revealTimer);
    this.io?.disconnect();
    this.ro?.disconnect();
  }

  isOn(l: Layer): boolean {
    return l.screen === this.index && l.dark === (this.dark && !!this.current.dark);
  }

  setDark(v: boolean) {
    if (this.dark === v) return;
    this.dark = v;
    this.prime();
  }

  togglePlay() { this.userPaused = !this.userPaused; }

  onPointer(ev: PointerEvent, inside: boolean) {
    // no toque não existe "sair de cima": só o mouse segura a apresentação
    if (ev.pointerType === 'mouse') this.hovering = inside;
  }

  onFocusIn(ev: FocusEvent) {
    const el = ev.target as HTMLElement | null;
    // só o foco de teclado segura; clicar num botão com o mouse não pode travar o loop para sempre
    this.focusHold = !!el?.matches?.(':focus-visible');
  }

  onFocusOut(ev: FocusEvent) {
    const next = ev.relatedTarget as Node | null;
    if (!next || !this.root?.nativeElement.contains(next)) this.focusHold = false;
  }

  go(i: number) {
    const n = this.screens.length;
    this.index = ((i % n) + n) % n;
    this.elapsed = 0;
    this.typedCount = -1;
    this.prime();
    this.fills?.forEach(f => (f.nativeElement.style.transform = 'scaleX(0)'));
    if (this.reduced) {
      this.spot = this.cursor = this.point(this.current);
      this.phase = 2;
      this.writeTyped(this.current.route.length);
    } else {
      this.phase = 0;
      this.writeTyped(0);
    }
    clearTimeout(this.revealTimer);
    this.revealTimer = setTimeout(() => this.revealChip());
  }

  /** Posição do recurso em % do palco 16:10 (capturas de outra proporção ficam centralizadas, sem corte). */
  private point(s: CtrlbScreen): Point {
    const r = (s.w || 1440) / (s.h || 900);
    if (r < STAGE_RATIO) { const f = r / STAGE_RATIO; return { x: (1 - f) * 50 + s.hx * f, y: s.hy }; }
    const f = STAGE_RATIO / r;
    return { x: s.hx, y: (1 - f) * 50 + s.hy * f };
  }

  private start() {
    if (this.raf || this.reduced) return;
    this.zone.runOutsideAngular(() => {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    });
  }

  private stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = (now: number) => {
    // dt limitado: voltar de uma aba em segundo plano não pode "pular" a apresentação
    const dt = Math.min(100, now - this.last);
    this.last = now;
    const holding = this.hovering || this.focusHold || this.userPaused;
    // em pausa a cena segue até o ponto mais informativo (zoom + legenda) e espera ali
    if (holding && this.elapsed < T_OUT) this.elapsed = Math.min(this.elapsed + dt, T_OUT - 1);
    else this.elapsed += dt;
    const e = this.elapsed;

    const fill = this.fills?.get(this.index)?.nativeElement;
    if (fill) fill.style.transform = `scaleX(${Math.min(1, e / SLIDE_MS).toFixed(4)})`;
    this.writeTyped(Math.floor(e / TYPE_MS));

    const phase = e >= SLIDE_MS ? 4 : e >= T_OUT ? 3 : e >= T_CLICK ? 2 : e >= T_MOVE ? 1 : 0;
    if (phase !== this.phase) {
      this.zone.run(() => {
        if (phase === 4) { this.go(this.index + 1); }
        else {
          if (phase === 1) this.cursor = this.point(this.current);
          // o anel muda de lugar enquanto está invisível
          if (phase === 2) this.spot = this.cursor = this.point(this.current);
          this.phase = phase;
        }
        this.cdr.markForCheck();
      });
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private writeTyped(count: number) {
    const route = this.current?.route ?? '';
    const n = Math.max(0, Math.min(route.length, count));
    if (n === this.typedCount) return;
    this.typedCount = n;
    const el = this.typed?.nativeElement;
    if (el) el.textContent = route.slice(0, n);
  }

  /** Baixa a imagem atual e a próxima (no tema escolhido) antes de precisarem aparecer. */
  private prime() {
    const n = this.screens.length;
    for (const i of [this.index, (this.index + 1) % n]) {
      const wantDark = this.dark && !!this.screens[i].dark;
      const l = this.layers.find(x => x.screen === i && x.dark === wantDark);
      if (l) this.primed.add(l.key);
    }
  }

  private revealChip() {
    const rail = this.rail?.nativeElement;
    const chip = rail?.children[this.index] as HTMLElement | undefined;
    if (!rail || !chip || rail.scrollWidth <= rail.clientWidth) return;
    const left = chip.offsetLeft - rail.offsetLeft - 12;
    rail.scrollTo({ left, behavior: this.reduced ? 'auto' : 'smooth' });
  }

  private build() {
    const f = this.safeFocus;
    this.screens = FOCUS_SETS[f].map(id => SCREENS[id]);
    this.statIcons = STAT_ICONS[f];
    this.hasDark = this.screens.some(s => !!s.dark);
    this.layers = [];
    this.screens.forEach((s, i) => {
      this.layers.push({ key: s.id + '-l', screen: i, dark: false, src: BASE + s.light });
      if (s.dark) this.layers.push({ key: s.id + '-d', screen: i, dark: true, src: BASE + s.dark });
    });
    this.primed = new Set<string>();
    this.index = 0;
    this.prime();
  }
}
