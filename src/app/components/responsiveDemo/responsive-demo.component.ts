import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';
import { I18N, RdKey } from './responsive-demo.i18n';

type DeviceType = 'phone' | 'tablet' | 'desktop';
type Step = 'all' | DeviceType;
type View = 'real' | 'demo';

/** Recorte de cada aparelho na composição real (frações da imagem 2181×924). */
const FOCUS: Record<Step, { x: number; y: number; w: number; h: number }> = {
  all: { x: 0.019, y: 0.03, w: 0.956, h: 0.9 },
  desktop: { x: 0.019, y: 0.063, w: 0.564, h: 0.817 },
  tablet: { x: 0.5, y: 0.03, w: 0.291, h: 0.575 },
  phone: { x: 0.789, y: 0.053, w: 0.186, h: 0.879 },
};
const IMG_RATIO = 2181 / 924;

const STEP_ICONS: Record<Step, string> = {
  all: 'fa-solid fa-layer-group',
  desktop: 'fa-solid fa-display',
  tablet: 'fa-solid fa-tablet-screen-button',
  phone: 'fa-solid fa-mobile-screen-button',
};

/**
 * Responsividade do SGA CTRLB.
 *
 * - "Capturas reais": a composição real (notebook + tablet + celular com o CTRLB aberto),
 *   com uma câmera que passeia de um aparelho ao outro em loop.
 * - "Demonstração interativa": uma sala de reunião desenhada em código, apresentada como
 *   ilustração (não existe captura real do módulo de reuniões), que se reorganiza
 *   conforme o aparelho escolhido.
 *
 * Tudo escala com o contêiner: o palco tem proporção fixa e as medidas saem de um ResizeObserver.
 */
@Component({
  selector: 'app-responsive-demo',
  standalone: true,
  imports: [],
  template: `
  <div class="rd rounded-2xl overflow-hidden shadow-2xl" #root
       (pointerenter)="onPointer($event, true)" (pointerleave)="onPointer($event, false)"
       (focusin)="onFocusIn($event)" (focusout)="onFocusOut($event)">

    <div class="rd-head flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-4">
      <div class="flex items-center gap-3 min-w-0">
        <div class="rd-logo shrink-0"><img src="ctrlb-logo.png" alt="CTRLB" /></div>
        <div class="min-w-0">
          <div class="rd-tag text-[10px] md:text-xs font-bold uppercase tracking-widest">{{ t('tag') }}</div>
          <div class="text-white font-bold text-sm md:text-lg leading-tight">{{ t('title') }}</div>
        </div>
      </div>
      @if (!reduced) {
      <button type="button" class="rd-round" (click)="togglePlay()" [attr.aria-label]="userPaused ? t('play') : t('pause')" [title]="userPaused ? t('play') : t('pause')">
        <i class="fa-solid" [class.fa-pause]="!userPaused" [class.fa-play]="userPaused" aria-hidden="true"></i>
      </button>
      }
    </div>

    <div class="rd-body flex flex-col gap-3 p-3 md:p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="rd-seg" role="group" [attr.aria-label]="t('viewGroup')">
          <button type="button" [class.on]="view === 'real'" [attr.aria-pressed]="view === 'real'" (click)="setView('real')">
            <i class="fa-solid fa-camera" aria-hidden="true"></i> {{ t('viewReal') }}
          </button>
          <button type="button" [class.on]="view === 'demo'" [attr.aria-pressed]="view === 'demo'" (click)="setView('demo')">
            <i class="fa-solid fa-hand-pointer" aria-hidden="true"></i> {{ t('viewDemo') }}
          </button>
        </div>
        <div class="rd-chips" role="group" [attr.aria-label]="t('devices')">
          @for (s of steps; track s) {
          <button type="button" class="rd-chip device-btn" [class.active]="s === step" [class.gone]="s === 'all' && view === 'demo'"
                  [attr.aria-pressed]="s === step" [disabled]="s === 'all' && view === 'demo'" (click)="pick(s)">
            <i [class]="icons[s]" aria-hidden="true"></i> <span>{{ label(s) }}</span>
          </button>
          }
          <button type="button" class="rd-chip rd-notes" [class.active]="notesOpen" [class.gone]="view !== 'demo'"
                  [attr.aria-pressed]="notesOpen" [disabled]="view !== 'demo'" (click)="toggleNotes()">
            <i class="fa-regular fa-file-lines" aria-hidden="true"></i> <span>{{ t('b_notes') }}</span>
          </button>
        </div>
      </div>

      <div class="rd-window rounded-xl overflow-hidden">
        <div class="rd-strip">
          <span class="rd-badge" [class.demo]="view === 'demo'">
            <i class="fa-solid" [class.fa-camera]="view === 'real'" [class.fa-pen-ruler]="view === 'demo'" aria-hidden="true"></i>
            {{ view === 'real' ? t('realBadge') : t('demoBadge') }}
          </span>
          <span class="rd-strip-name">{{ label(step) }}</span>
        </div>
        <div class="rd-stage" #stage>
          <!-- capturas reais: a câmera (transform) viaja de um aparelho ao outro -->
          <div class="rd-layer rd-real" [class.on]="view === 'real'" [attr.aria-hidden]="view === 'real' ? null : 'true'">
            <img class="rd-shot" [class.ready]="sw > 0" src="images/showcases/ctrlb-responsive-devices.webp"
                 [alt]="t('alt')" [style.transform]="camera" decoding="async" draggable="false" />
          </div>

          <!-- demonstração em código, apresentada como ilustração -->
          <div class="rd-layer rd-demo" [class.on]="view === 'demo'" [attr.aria-hidden]="view === 'demo' ? null : 'true'" [attr.inert]="view === 'demo' ? null : ''">
            <div [class]="'rd-device device-frame ' + currentDevice" [attr.data-device]="currentDevice"
                 [style.width.px]="dev.w" [style.height.px]="dev.h" [style.font-size.px]="dev.fs">
              <div class="mt" [class.notes]="notesOpen">
                <div class="mt-top">
                  <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                  <div class="mt-ttl"><b>{{ t('m_title') }}</b><small>{{ t('m_sub') }}</small></div>
                  <span class="mt-rec"><span class="mt-dot"></span><span class="mt-rec-txt">{{ t('m_rec') }}</span></span>
                </div>
                <div class="mt-body">
                  <div class="mt-grid">
                    <div class="mt-tile speaking" [class.cam]="cam">
                      <span class="mt-av">A</span>
                      <span class="mt-name"><i class="fa-solid" [class.fa-microphone]="mic" [class.fa-microphone-slash]="!mic" aria-hidden="true"></i> {{ t('m_you', { nome: 'Ana' }) }}</span>
                    </div>
                    <div class="mt-tile cam">
                      <span class="mt-av b">B</span>
                      <span class="mt-name"><i class="fa-solid fa-microphone-slash" aria-hidden="true"></i> Bruno</span>
                    </div>
                    <div class="mt-tile cam t3">
                      <span class="mt-av c">C</span>
                      <span class="mt-name"><i class="fa-solid fa-microphone" aria-hidden="true"></i> Carla</span>
                    </div>
                    <div class="mt-tile t4 mt-share">
                      <img src="images/real-screens/dashboard-live.png" [alt]="t('m_screenAlt')" loading="lazy" decoding="async" />
                      <span class="mt-name"><i class="fa-solid fa-display" aria-hidden="true"></i> {{ t('m_screen') }}</span>
                    </div>
                  </div>
                  <div class="mt-panel">
                    <div class="mt-ph">
                      <i class="fa-regular fa-file-lines" aria-hidden="true"></i><b>{{ t('m_notes') }}</b><small>{{ t('m_saved') }}</small>
                    </div>
                    <div class="mt-pc">
                      <p><span>12:30</span><b>Ana</b>{{ t('m_n1') }}</p>
                      <p><span>14:10</span><b>Carla</b>{{ t('m_n2') }}</p>
                      <div class="mt-ai"><b><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> {{ t('m_ai') }}</b>{{ t('m_ai_x') }}</div>
                    </div>
                  </div>
                </div>
                <div class="mt-bar">
                  <button type="button" class="mt-btn" [class.off]="!mic" [attr.aria-pressed]="mic" [attr.aria-label]="t('b_mic')" (click)="mic = !mic">
                    <i class="fa-solid" [class.fa-microphone]="mic" [class.fa-microphone-slash]="!mic" aria-hidden="true"></i><span>{{ t('b_mic') }}</span>
                  </button>
                  <button type="button" class="mt-btn" [class.off]="!cam" [attr.aria-pressed]="cam" [attr.aria-label]="t('b_cam')" (click)="cam = !cam">
                    <i class="fa-solid" [class.fa-video]="cam" [class.fa-video-slash]="!cam" aria-hidden="true"></i><span>{{ t('b_cam') }}</span>
                  </button>
                  <span class="mt-btn hide-phone" aria-hidden="true"><i class="fa-solid fa-arrow-up-from-bracket"></i><span>{{ t('b_share') }}</span></span>
                  <button type="button" class="mt-btn" [class.on]="notesOpen" [attr.aria-pressed]="notesOpen" [attr.aria-label]="t('b_notes')" (click)="toggleNotes()">
                    <i class="fa-regular fa-file-lines" aria-hidden="true"></i><span>{{ t('b_notes') }}</span>
                  </button>
                  <span class="mt-btn mt-leave" aria-hidden="true"><i class="fa-solid fa-phone-slash"></i><span>{{ t('b_leave') }}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- legendas empilhadas na mesma célula: a altura é a da maior, trocar não empurra a página -->
        <div class="rd-caption">
          @for (s of steps; track s) {
          <div class="rd-cap" [class.on]="view === 'real' && s === step" [attr.aria-hidden]="view === 'real' && s === step ? null : 'true'">
            <span class="rd-cap-ico"><i [class]="icons[s]" aria-hidden="true"></i></span>
            <div class="min-w-0"><strong>{{ capTitle(s) }}</strong><p>{{ capText(s) }}</p></div>
          </div>
          }
          <div class="rd-cap" [class.on]="view === 'demo'" [attr.aria-hidden]="view === 'demo' ? null : 'true'">
            <span class="rd-cap-ico"><i class="fa-solid fa-pen-ruler" aria-hidden="true"></i></span>
            <div class="min-w-0"><strong>{{ t('demo_t') }}</strong><p>{{ t('demo_x') }}</p></div>
          </div>
        </div>
      </div>
      <p class="rd-note" [class.off]="view !== 'real'" [attr.aria-hidden]="view === 'real' ? null : 'true'"><i class="fa-solid fa-camera" aria-hidden="true"></i> {{ t('note') }}</p>
    </div>
  </div>
  `,
  styles: [`
    :host { display: block; width: 100%; min-width: 0; }
    .rd { background: radial-gradient(120% 140% at 0% 0%, #2a1146 0%, #10051c 55%, #0a0311 100%); border: 1px solid rgba(249,145,38,.25); }
    .rd :focus-visible { outline: 2px solid #f99126; outline-offset: 2px; }
    .rd-tag { color: #f99126; }
    .rd-logo { width: 44px; height: 44px; border-radius: 12px; background: #fff; display:flex; align-items:center; justify-content:center; padding: 6px; box-shadow: 0 0 0 3px rgba(249,145,38,.25); }
    .rd-logo img { width: 100%; height: 100%; object-fit: contain; }
    .rd-round { width: 44px; height: 44px; border-radius: 50%; display:inline-flex; align-items:center; justify-content:center; background: rgba(255,255,255,.08); color: rgba(255,255,255,.75); font-size: 12px; transition: background-color .2s, color .2s, transform .15s; }
    .rd-round:hover { background: rgba(255,255,255,.16); color:#fff; }
    .rd-round:active { transform: scale(.92); }

    .rd-body { container-type: inline-size; }
    .rd-seg { display:inline-flex; flex-wrap: wrap; background: rgba(255,255,255,.07); border-radius: 14px; padding: 3px; gap: 2px; }
    .rd-seg button { display:inline-flex; align-items:center; gap:6px; min-height: 38px; padding: 6px 12px; border-radius: 11px; color: rgba(255,255,255,.7); font-size: 12.5px; font-weight: 600; transition: background-color .25s, color .25s, transform .15s; }
    .rd-seg button:hover { color:#fff; }
    .rd-seg button:active { transform: scale(.97); }
    .rd-seg button.on { background:#f99126; color:#10051c; }
    .rd-chips { display:flex; flex-wrap: wrap; gap: 6px; }
    .rd-chip { display:inline-flex; align-items:center; gap:7px; min-height: 38px; padding: 6px 12px; border-radius: 999px; white-space: nowrap; color: rgba(255,255,255,.75); background: rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); font-size: 12.5px; font-weight: 600; transition: color .25s, background-color .25s, border-color .25s, opacity .25s, transform .15s; }
    .rd-chip i { color: rgba(249,145,38,.9); transition: color .25s; }
    .rd-chip:hover { color:#fff; background: rgba(255,255,255,.1); }
    .rd-chip:active { transform: scale(.96); }
    .rd-chip.active { color:#10051c; background:#f99126; border-color:#f99126; }
    .rd-chip.active i { color:#10051c; }
    .rd-chip.gone { display: none; }
    @media (pointer: coarse) { .rd-seg button, .rd-chip { min-height: 44px; } }

    .rd-window { background:#fff; box-shadow: 0 25px 60px rgba(0,0,0,.45); }
    .rd-stage { position:relative; width:100%; aspect-ratio: 16 / 9; max-height: 62vh; overflow:hidden; background: radial-gradient(120% 100% at 50% 0%, #ffffff 0%, #e6e8ee 100%); }
    @container (max-width: 560px) { .rd-stage { aspect-ratio: 1 / 1.08; max-height: none; } }
    .rd-layer { position:absolute; inset:0; opacity:0; visibility:hidden; transition: opacity .5s ease, visibility 0s linear .5s; }
    .rd-layer.on { opacity:1; visibility:visible; transition: opacity .5s ease, visibility 0s; }
    .rd-shot { position:absolute; left:0; top:0; width:100%; height:auto; max-width:none; transform-origin: 0 0; opacity:0; will-change: transform; user-select:none; }
    /* só anima depois da primeira medida, para a imagem não "voar" do canto ao carregar */
    .rd-shot.ready { opacity:1; transition: transform 1.2s cubic-bezier(.5,0,.15,1), opacity .5s ease; }
    .rd-demo { display:flex; align-items:center; justify-content:center; }
    .rd-strip { display:flex; align-items:center; justify-content:space-between; gap:8px; padding: 7px 10px; background:#eef0f3; border-bottom:1px solid #e2e5ea; }
    .rd-strip-name { font-size: 11px; font-weight: 600; color:#6b7280; white-space: nowrap; overflow:hidden; text-overflow: ellipsis; }
    .rd-badge { display:inline-flex; white-space: nowrap; align-items:center; gap:6px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#15803d; background:#dcfce7; padding:4px 9px; border-radius:999px; transition: color .3s, background-color .3s; }
    .rd-badge.demo { color:#7a4a0c; background:#ffedd5; }

    .rd-caption { display:grid; background:#10051c; color:#fff; border-top: 2px solid #f99126; }
    .rd-cap { grid-area: 1 / 1; display:flex; align-items:flex-start; gap:10px; padding: 10px 14px; opacity:0; transform: translateY(6px); transition: opacity .3s ease, transform .3s ease; pointer-events:none; }
    .rd-cap.on { opacity:1; transform:none; transition: opacity .45s ease .3s, transform .45s ease .3s; pointer-events:auto; }
    .rd-cap strong { display:block; font-size: 14px; line-height: 1.25; }
    .rd-cap p { margin: 2px 0 0; font-size: 12.5px; line-height: 1.4; color: rgba(255,255,255,.75); overflow-wrap: anywhere; }
    .rd-cap-ico { width: 28px; height: 28px; border-radius: 8px; margin-top: 2px; background:#f99126; color:#10051c; display:inline-flex; align-items:center; justify-content:center; font-size: 11px; flex-shrink:0; }
    .rd-note { margin:0; font-size: 11px; color: rgba(255,255,255,.5); transition: opacity .3s; }
    .rd-note.off { opacity: 0; }
    .rd-note i { margin-right: 4px; color: rgba(249,145,38,.8); }
    @container (max-width: 560px) {
      .rd-seg { display:flex; width:100%; }
      .rd-seg button { flex: 1 1 auto; justify-content:center; padding: 6px 8px; font-size: 12px; }
      .rd-cap { padding: 8px 10px; }
      .rd-cap strong { font-size: 12.5px; }
      .rd-cap p { font-size: 11.5px; }
    }

    /* ---- aparelho da demonstração: todas as medidas em em, o font-size vem da largura do aparelho ---- */
    .rd-device { position:relative; flex-shrink:0; background:#0b0f14; border-radius: 1em; padding: .7em; box-shadow: 0 1.4em 3em rgba(16,5,28,.35), inset 0 0 0 1px rgba(255,255,255,.08);
      transition: width .7s cubic-bezier(.5,0,.15,1), height .7s cubic-bezier(.5,0,.15,1), font-size .7s cubic-bezier(.5,0,.15,1), border-radius .7s ease; }
    .rd-device[data-device="tablet"] { border-radius: 1.3em; }
    .rd-device[data-device="phone"] { border-radius: 2.4em; padding: .65em; }
    .mt { width:100%; height:100%; border-radius: .5em; overflow:hidden; background:#16121d; color:#fff; display:flex; flex-direction:column; transition: border-radius .7s ease; }
    [data-device="tablet"] .mt { border-radius: .8em; }
    [data-device="phone"] .mt { border-radius: 1.9em; }
    .mt-top { display:flex; align-items:center; gap:.7em; padding:.65em .9em; background:#1e1928; border-bottom:1px solid rgba(255,255,255,.08); flex-shrink:0; }
    [data-device="phone"] .mt-top { padding-top: 1.3em; }
    .mt-top > i { opacity:.7; font-size: .9em; }
    .mt-ttl { flex:1; min-width:0; }
    .mt-ttl b { display:block; font-size:1em; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .mt-ttl small { display:block; font-size:.8em; opacity:.55; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .mt-rec { display:inline-flex; align-items:center; gap:.45em; font-size:.75em; font-weight:700; background: rgba(220,38,38,.92); padding:.25em .7em; border-radius:99em; white-space:nowrap; flex-shrink:0; }
    .mt-dot { width:.55em; height:.55em; border-radius:50%; background:#fff; animation: rdRec 1s ease-in-out infinite alternate; }
    @keyframes rdRec { from { opacity:.35; } to { opacity:1; } }
    [data-device="phone"] .mt-rec-txt { display:none; }
    .mt-body { position:relative; flex:1; min-height:0; overflow:hidden; display:flex; }
    .mt-grid { flex:1; min-width:0; display:grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 1fr; gap:.5em; padding:.5em; transition: margin-right .5s cubic-bezier(.4,0,.2,1); }
    [data-device="desktop"] .mt.notes .mt-grid { margin-right: 17em; }
    [data-device="phone"] .mt-grid { grid-template-columns: 1fr; }
    [data-device="phone"] .t3, [data-device="phone"] .t4 { display:none; }
    .mt-tile { position:relative; min-height:0; border-radius:.6em; background:#1b1724; border:1px solid rgba(255,255,255,.08); display:flex; align-items:center; justify-content:center; overflow:hidden; transition: background-color .3s; }
    .mt-tile.cam { background: radial-gradient(90% 90% at 50% 35%, #3a2a55 0%, #1b1724 100%); }
    .mt-tile.speaking::after { content:''; position:absolute; inset:0; border-radius:inherit; box-shadow: inset 0 0 0 .16em #f99126; animation: rdSpeak 1.4s ease-in-out infinite alternate; pointer-events:none; }
    @keyframes rdSpeak { from { opacity:.35; } to { opacity:1; } }
    .mt-av { width:3em; height:3em; border-radius:50%; background:#f99126; color:#10051c; font-weight:800; font-size:1.15em; display:flex; align-items:center; justify-content:center; }
    .mt-av.b { background:#5b3b8c; color:#fff; }
    .mt-av.c { background:#6b7280; color:#fff; }
    .mt-name { position:absolute; left:.5em; bottom:.5em; max-width: calc(100% - 1em); font-size:.78em; background: rgba(0,0,0,.62); padding:.2em .6em; border-radius:.4em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .mt-name i { font-size:.9em; margin-right:.25em; color:#86efac; }
    .mt-name .fa-microphone-slash { color:#fca5a5; }
    .mt-share img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position: left top; }
    .mt-share .mt-name i { color:#f9b56a; }
    .mt-panel { position:absolute; top:0; right:0; bottom:0; width:17em; background:#1a1622; border-left:1px solid rgba(255,255,255,.1); display:flex; flex-direction:column; transform: translateX(101%); visibility:hidden; transition: transform .5s cubic-bezier(.4,0,.2,1), visibility 0s linear .5s, width .7s ease; }
    .mt.notes .mt-panel { transform:none; visibility:visible; transition: transform .5s cubic-bezier(.4,0,.2,1), visibility 0s, width .7s ease; }
    [data-device="tablet"] .mt-panel { width: 58%; box-shadow: -.5em 0 1.5em rgba(0,0,0,.4); }
    [data-device="phone"] .mt-panel { width: 100%; border-left: 0; }
    .mt-ph { display:flex; align-items:center; gap:.5em; padding:.65em .8em; border-bottom:1px solid rgba(255,255,255,.08); font-size:.9em; flex-shrink:0; }
    .mt-ph i { color:#f99126; }
    .mt-ph b { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .mt-ph small { font-size:.8em; opacity:.6; background: rgba(255,255,255,.08); padding:.1em .5em; border-radius:.3em; white-space:nowrap; }
    .mt-pc { flex:1; min-height:0; overflow:hidden; padding:.8em; display:flex; flex-direction:column; gap:.7em; font-size:.85em; line-height:1.4; }
    .mt-pc p { margin:0; color: rgba(255,255,255,.85); }
    .mt-pc p span { opacity:.45; font-variant-numeric: tabular-nums; margin-right:.4em; }
    .mt-pc p b { color:#f9b56a; margin-right:.35em; }
    .mt-ai { background: rgba(249,145,38,.1); border:1px solid rgba(249,145,38,.3); border-radius:.5em; padding:.6em .7em; color: rgba(255,255,255,.8); }
    .mt-ai b { display:block; color:#f99126; margin-bottom:.2em; }
    .mt-bar { display:flex; align-items:center; justify-content:center; gap:.5em; padding:.6em; background:#110e17; border-top:1px solid rgba(255,255,255,.08); flex-shrink:0; }
    .mt-btn { display:inline-flex; align-items:center; justify-content:center; gap:.5em; height:2.6em; min-width:2.6em; padding:0 .8em; border-radius:.55em; background: rgba(255,255,255,.08); color:#fff; font-size:.9em; font-weight:500; white-space:nowrap; transition: background-color .15s, color .15s, transform .15s; }
    button.mt-btn:hover { background: rgba(255,255,255,.16); }
    button.mt-btn:active { transform: scale(.93); }
    .mt-btn > span { display:none; }
    [data-device="desktop"] .mt-btn > span { display:inline; }
    .mt-btn.off { background: rgba(220,38,38,.28); color:#fca5a5; }
    .mt-btn.on { background: rgba(249,145,38,.28); box-shadow: inset 0 0 0 1px #f99126; }
    .mt-leave { background:transparent; border:1px solid #ef4444; color:#f87171; }
    [data-device="phone"] .hide-phone { display:none; }

    @media (prefers-reduced-motion: reduce) {
      .rd-shot.ready, .rd-layer, .rd-layer.on, .rd-cap, .rd-cap.on, .rd-device, .mt, .mt-grid, .mt-panel, .mt.notes .mt-panel { transition: none; }
      .mt-dot, .mt-tile.speaking::after { animation: none; }
    }
  `],
})
export class ResponsiveDemoComponent implements OnInit, AfterViewInit, OnDestroy {
  /** Mantido por compatibilidade: o tamanho agora acompanha o contêiner sozinho. */
  @Input() scale = 1;
  /** Tempo em cada aparelho no modo vitrine (ms). */
  @Input() intervalSpeed = 5000;

  @ViewChild('root') root?: ElementRef<HTMLElement>;
  @ViewChild('stage') stage?: ElementRef<HTMLElement>;

  private readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  readonly t = this.i18n.scope(I18N);

  readonly steps: Step[] = ['all', 'desktop', 'tablet', 'phone'];
  readonly icons = STEP_ICONS;
  view: View = 'real';
  step: Step = 'all';
  /** aparelho mostrado na demonstração (na visão geral vale o computador) */
  currentDevice: DeviceType = 'desktop';
  notesOpen = true;
  mic = true;
  cam = true;
  userPaused = false;
  reduced = false;
  /** tamanho do palco em px (ResizeObserver) */
  sw = 0;
  sh = 0;

  private timer: ReturnType<typeof setTimeout> | undefined;
  private measureRaf = 0;
  private manualSwitchDelay = 9000;
  private hovering = false;
  private focusHold = false;
  private visible = false;
  private io?: IntersectionObserver;
  private ro?: ResizeObserver;

  label(s: Step): string { return this.t(('d_' + s) as RdKey); }
  capTitle(s: Step): string { return this.t(('c_' + s + '_t') as RdKey); }
  capText(s: Step): string { return this.t(('c_' + s + '_x') as RdKey); }

  /** Enquadra o aparelho escolhido: translate + scale com origem fixa, para a câmera viajar suave. */
  get camera(): string {
    const W = this.sw, H = this.sh;
    if (!W || !H) return 'none';
    const f = FOCUS[this.step];
    const imgH = W / IMG_RATIO;
    const s = Math.min(1 / f.w, H / (f.h * imgH)) * 0.92;
    const tx = W / 2 - s * (f.x + f.w / 2) * W;
    const ty = H / 2 - s * (f.y + f.h / 2) * imgH;
    return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)})`;
  }

  /** Medidas do aparelho da demonstração, sempre dentro do palco. */
  get dev(): { w: number; h: number; fs: number } {
    const W = Math.max(0, this.sw - 28), H = Math.max(0, this.sh - 28);
    if (!W || !H) return { w: 0, h: 0, fs: 10 };
    if (this.currentDevice === 'desktop') { const w = Math.min(W, H * 1.6); return { w, h: w / 1.6, fs: w * 0.0155 }; }
    if (this.currentDevice === 'tablet') { const h = Math.min(H, W * 1.333); const w = h * 0.75; return { w, h, fs: w * 0.036 }; }
    const h = Math.min(H, W * 2.05);
    const w = h * 0.487;
    return { w, h, fs: w * 0.064 };
  }

  ngOnInit(): void {
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  ngAfterViewInit(): void {
    const stage = this.stage?.nativeElement;
    if (stage && typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(entries => {
        const r = entries[0].contentRect;
        if (Math.abs(r.width - this.sw) < 0.5 && Math.abs(r.height - this.sh) < 0.5) return;
        const w = r.width, h = r.height;
        cancelAnimationFrame(this.measureRaf);
        this.measureRaf = requestAnimationFrame(() => this.zone.run(() => { this.sw = w; this.sh = h; this.cdr.markForCheck(); }));
      });
      this.ro.observe(stage);
    } else if (stage) {
      this.measure();
    }
    if (this.reduced) return;
    if (typeof IntersectionObserver === 'undefined') { this.visible = true; this.schedule(); return; }
    this.io = new IntersectionObserver(es => {
      this.zone.run(() => {
        this.visible = es.some(e => e.isIntersecting);
        this.schedule();
      });
    }, { threshold: 0.25 });
    this.io.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    cancelAnimationFrame(this.measureRaf);
    this.io?.disconnect();
    this.ro?.disconnect();
  }

  /** Mantido por compatibilidade com a versão anterior (o ResizeObserver já cuida disso). */
  onResize(): void { this.measure(); }

  setView(v: View) {
    if (this.view === v) return;
    this.view = v;
    if (v === 'demo' && this.step === 'all') this.go('desktop');
    this.schedule(this.manualSwitchDelay);
  }

  /** Escolha manual de um aparelho: o modo vitrine espera mais antes de seguir. */
  pick(s: Step) {
    this.go(s);
    this.schedule(this.manualSwitchDelay);
  }

  switchToDevice(device: DeviceType): void { this.pick(device); }

  toggleNotes() {
    this.notesOpen = !this.notesOpen;
    this.schedule(this.manualSwitchDelay);
  }

  togglePlay() {
    this.userPaused = !this.userPaused;
    this.schedule();
  }

  onPointer(ev: PointerEvent, inside: boolean) {
    if (ev.pointerType !== 'mouse') return;
    this.hovering = inside;
    this.schedule();
  }

  onFocusIn(ev: FocusEvent) {
    const el = ev.target as HTMLElement | null;
    // só o foco de teclado segura; clicar com o mouse não pode travar o loop para sempre
    this.focusHold = !!el?.matches?.(':focus-visible');
    this.schedule();
  }

  onFocusOut(ev: FocusEvent) {
    const next = ev.relatedTarget as Node | null;
    if (!next || !this.root?.nativeElement.contains(next)) { this.focusHold = false; this.schedule(); }
  }

  private go(s: Step) {
    this.step = s;
    const device: DeviceType = s === 'all' ? 'desktop' : s;
    if (device !== this.currentDevice) {
      this.currentDevice = device;
      // no computador a ata fica ao lado dos vídeos; nos menores ela cobre a sala, então começa fechada
      this.notesOpen = device === 'desktop';
    }
  }

  private advance() {
    const order: Step[] = this.view === 'demo' ? ['desktop', 'tablet', 'phone'] : this.steps;
    const i = order.indexOf(this.step);
    this.go(order[(i + 1) % order.length]);
  }

  /** (Re)agenda o próximo passo; parado enquanto houver mouse em cima, foco, pausa ou fora da tela. */
  private schedule(delay = this.intervalSpeed) {
    clearTimeout(this.timer);
    if (this.reduced || !this.visible || this.hovering || this.focusHold || this.userPaused) return;
    this.timer = setTimeout(() => {
      this.advance();
      this.cdr.markForCheck();
      this.schedule();
    }, Math.max(1500, delay));
  }

  private measure() {
    const el = this.stage?.nativeElement;
    if (!el) return;
    this.sw = el.clientWidth;
    this.sh = el.clientHeight;
  }
}
