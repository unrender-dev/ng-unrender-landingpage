import { Component, Input } from '@angular/core';
import { DemoSale, OfflineSalesBase, SaleCategory } from '../pwa-demo/offline-sales.base';
import { I18N } from './desktop-pwa-demo.i18n';

export type DesktopOs = 'windows' | 'macos' | 'linux';
export type CategoryFilter = 'todos' | SaleCategory;

const STEPS = [
  { key: 'install', title: 's1Title', badge: 's1Badge', desc: 's1Desc' },
  { key: 'offline', title: 's2Title', badge: 's2Badge', desc: 's2Desc' },
  { key: 'local', title: 's3Title', badge: 's3Badge', desc: 's3Desc' },
  { key: 'sync', title: 's4Title', badge: 's4Badge', desc: 's4Desc' },
] as const;

const CATEGORIES = [
  { id: 'todos', label: 'catAll' },
  { id: 'planos', label: 'catPlans' },
  { id: 'produtos', label: 'catProducts' },
  { id: 'servicos', label: 'catServices' },
] as const;

/** Só o nome do sistema, sem logotipo: a moldura da janela é genérica, desenhada em CSS. */
const OS_LIST: ReadonlyArray<{ id: DesktopOs; label: string }> = [
  { id: 'windows', label: 'Windows' },
  { id: 'macos', label: 'macOS' },
  { id: 'linux', label: 'Linux' },
];

/**
 * PWA no computador (frente de caixa): instala pelo navegador, vende sem rede e sincroniza.
 * Demonstração interativa com dados fictícios — não existe captura real do PDV do SGA CTRLB.
 */
@Component({
  selector: 'app-desktop-pwa-demo',
  standalone: true,
  template: `
  <div class="dpwa">
    <div class="win-col">
      <div class="frame-pick" role="group" [attr.aria-label]="t('frameLabel')">
        <span class="frame-pick-label">{{ t('frameLabel') }}</span>
        @for (o of osList; track o.id) {
          <button type="button" [class.on]="selectedOs === o.id" [attr.aria-pressed]="selectedOs === o.id" (click)="setOs(o.id)">{{ o.label }}</button>
        }
      </div>

      <div class="window" role="group" [attr.aria-label]="t('windowLabel')"
        [class.os-macos]="selectedOs === 'macos'" [class.os-linux]="selectedOs === 'linux'">
        <div class="titlebar">
          <span class="lights" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="app-ico"><img src="/ctrlb-logo.png" alt="" /></span>
          <span class="app-title">{{ t('appTitle') }}</span>
          <span class="pwa-pill">PWA</span>
          <span class="win-btns" aria-hidden="true">
            <i class="fa-solid fa-minus"></i><i class="fa-regular fa-square"></i><i class="fa-solid fa-xmark"></i>
          </span>
        </div>

        <div class="strip">
          <div class="strip-face" [class.shown]="!installed" [attr.inert]="installed ? '' : null">
            <span class="strip-text"><i class="fa-solid fa-globe" aria-hidden="true"></i> {{ t('inBrowser') }}</span>
            <button type="button" class="btn-install" [class.pressed]="installing" (click)="install()">
              <i class="fa-solid fa-download" aria-hidden="true"></i> <span>{{ t('installCta') }}</span>
            </button>
          </div>
          <div class="strip-face" [class.shown]="installed" [attr.aria-hidden]="!installed">
            <span class="strip-text"><i class="fa-solid fa-circle-check ok" aria-hidden="true"></i> {{ t('installedAs') }}</span>
            <span class="conn" [class.conn-off]="offline" [class.conn-sync]="syncing">
              @if (syncing) {
                <i class="fa-solid fa-arrows-rotate fa-spin" aria-hidden="true"></i> {{ t('stSyncing') }}
              } @else if (offline) {
                <i class="fa-solid fa-plug-circle-xmark" aria-hidden="true"></i> {{ t('stOffline') }}
              } @else {
                <span class="dot" aria-hidden="true"></span> {{ t('stOnline') }}
              }
            </span>
          </div>
        </div>

        <!-- Os três estados ficam empilhados na mesma célula: troca com fade e sem mudar a altura. -->
        <div class="banner" [class.banner-off]="offline" [class.banner-sync]="syncing">
          <div class="banner-face" [class.shown]="!offline && !syncing">
            <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
            <p><strong>{{ t('bOnTitle') }}</strong>{{ t('bOnText') }}</p>
          </div>
          <div class="banner-face" [class.shown]="offline">
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            <p><strong>{{ t('bOffTitle') }}</strong>{{ t('bOffText') }}</p>
          </div>
          <div class="banner-face" [class.shown]="syncing">
            <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>
            <p><strong>{{ t('bSyncTitle') }}</strong>{{ t('bSyncText') }}</p>
          </div>
          <span class="sync-bar" [class.run]="syncing" aria-hidden="true"></span>
        </div>

        <div class="pos-head">
          <span class="till" aria-hidden="true"><i class="fa-solid fa-cash-register"></i></span>
          <div class="pos-name">
            <b>{{ t('counter') }}</b>
            <span>{{ t('shift') }}</span>
          </div>
          <div class="sum">
            <span>{{ t('sumTotal') }}</span>
            <b class="ok">{{ i18n.money(displayTotal) }}</b>
          </div>
          <div class="sum">
            <span>{{ t('sumLocal') }}</span>
            @if (pendingCount > 0) {
              <b class="warn"><i class="fa-regular fa-clock" aria-hidden="true"></i>
                {{ pendingCount === 1 ? t('sumPendingOne') : t('sumPendingMany', { n: pendingCount }) }}</b>
            } @else if (syncingCount > 0) {
              <b class="info"><i class="fa-solid fa-arrows-rotate fa-spin" aria-hidden="true"></i> {{ t('sumSending', { n: syncingCount }) }}</b>
            } @else {
              <b class="ok"><i class="fa-solid fa-check-double" aria-hidden="true"></i> {{ t('sumAllCloud') }}</b>
            }
          </div>
        </div>

        <div class="pos-bar">
          <div class="cats" role="group" [attr.aria-label]="t('catLabel')">
            @for (c of categories; track c.id) {
              <button type="button" class="cat" [class.on]="activeCategory === c.id"
                [attr.aria-pressed]="activeCategory === c.id" (click)="setCategory(c.id)">{{ t(c.label) }}</button>
            }
          </div>
          <button type="button" class="btn-fast" (click)="addSale()">
            <i class="fa-solid fa-cart-plus" aria-hidden="true"></i>
            <span>{{ offline ? t('newSaleOffline') : t('newSale') }}</span>
          </button>
        </div>

        <div class="rows-head" aria-hidden="true">
          <span>{{ t('colOrder') }}</span><span>{{ t('colClient') }}</span><span>{{ t('colItem') }}</span>
          <span>{{ t('colPay') }}</span><span class="c-amount">{{ t('colAmount') }}</span><span>{{ t('colStatus') }}</span>
        </div>
        <div class="rows-wrap">
          <ul class="rows">
            @for (sale of sales; track sale.id) {
              <li class="sale" [class.seed]="sale.seed" [class.leaving]="sale.leaving || !matches(sale)">
                <div class="sale-clip">
                  <div class="sale-in" [class.pending]="sale.state === 'pending'" [class.syncing]="sale.state === 'syncing'">
                    <span class="c-id">#{{ sale.id }}</span>
                    <span class="c-client">{{ sale.client }}</span>
                    <span class="c-item" [attr.data-id]="'#' + sale.id + ' · '">{{ t(sale.product) }}</span>
                    <span class="c-pay">{{ t(sale.payment) }}</span>
                    <span class="c-amount">{{ i18n.money(sale.amount) }}</span>
                    <span class="c-status">
                      <span class="pill" [class.pill-pending]="sale.state === 'pending'" [class.pill-sync]="sale.state === 'syncing'">
                        @if (sale.state === 'pending') {
                          <i class="fa-regular fa-clock" aria-hidden="true"></i> {{ t('pillPending') }}
                        } @else if (sale.state === 'syncing') {
                          <i class="fa-solid fa-arrows-rotate fa-spin" aria-hidden="true"></i> {{ t('pillSyncing') }}
                        } @else {
                          <i class="fa-solid fa-check" aria-hidden="true"></i> {{ t('pillSynced') }}
                        }
                      </span>
                    </span>
                  </div>
                </div>
              </li>
            }
          </ul>
          <p class="empty" [class.shown]="filteredSales.length === 0">{{ t('empty') }}</p>

          <div class="snack" [class.shown]="toastShown" [class.snack-warning]="toast?.type === 'warning'"
            [class.snack-success]="toast?.type === 'success'" role="status">
            @if (toast; as tt) {
              <i [class]="toastIcon" aria-hidden="true"></i>
              <span>{{ t(tt.key, tt.params) }}</span>
            }
          </div>
        </div>

        <div class="notice" [class.shown]="noticeShown" [attr.aria-hidden]="!noticeShown">
          <span class="app-ico"><img src="/ctrlb-logo.png" alt="" /></span>
          <div class="notice-body">
            <div class="notice-head"><b>SGA CTRLB</b><span>{{ t('noticeNow') }}</span></div>
            @if (notice; as n) {
              <p>{{ t(n.key, n.params) }}</p>
            }
          </div>
        </div>

        <div class="win-foot">
          <span><i class="fa-solid fa-flask" aria-hidden="true"></i> {{ t('demoTag') }}</span>
          <span>{{ t('lastSync', { hora: time(lastSync) }) }}</span>
        </div>
      </div>
    </div>

    <div class="side">
      <p class="eyebrow"><i class="fa-solid fa-desktop" aria-hidden="true"></i> {{ context === 'web' ? t('eyebrowWeb') : t('eyebrowDesktop') }}</p>
      <h4 class="title">{{ context === 'web' ? t('titleWeb') : t('titleDesktop') }}</h4>
      <p class="intro">{{ context === 'web' ? t('leadWeb') : t('leadDesktop') }}</p>

      <ol class="steps">
        @for (step of steps; track step.key; let i = $index) {
          <li>
            <button type="button" class="step" [class.on]="activeStep === i"
              [attr.aria-current]="activeStep === i ? 'step' : null" (click)="selectStep(i)">
              <span class="num" [class.done]="activeStep > i">
                @if (activeStep > i) { <i class="fa-solid fa-check" aria-hidden="true"></i> } @else { {{ i + 1 }} }
              </span>
              <span class="step-body">
                <span class="step-head">
                  <b>{{ t(step.title) }}</b>
                  <span class="tag">{{ t(step.badge) }}</span>
                </span>
                <span class="step-desc">{{ t(step.desc) }}</span>
              </span>
            </button>
          </li>
        }
      </ol>

      <div class="try">
        <div class="try-head">
          <span><i class="fa-solid fa-hand-pointer" aria-hidden="true"></i> {{ t('tryLabel') }}</span>
          <span class="mode" [class.manual]="!autoplay">
            <i [class]="autoplay ? 'fa-solid fa-circle-play' : 'fa-solid fa-hand'" aria-hidden="true"></i>
            {{ autoplay ? t('modeAuto') : t('modeManual') }}
          </span>
        </div>
        <div class="ctls">
          <button type="button" class="ctl" [class.ctl-go]="offline" [class.ctl-main]="!offline" (click)="toggleOffline()">
            <i [class]="offline ? 'fa-solid fa-wifi' : 'fa-solid fa-plug-circle-xmark'" aria-hidden="true"></i>
            {{ offline ? t('btnReconnect') : t('btnDrop') }}
          </button>
          <button type="button" class="ctl ctl-alt" (click)="addSale()">
            <i class="fa-solid fa-cash-register" aria-hidden="true"></i> {{ offline ? t('btnSaleOffline') : t('btnSale') }}
          </button>
          <button type="button" class="ctl ctl-alt" (click)="sendNotice()">
            <i class="fa-regular fa-bell" aria-hidden="true"></i> {{ t('btnNotify') }}
          </button>
          <button type="button" class="ctl ctl-ghost" (click)="restart()">
            <i class="fa-solid fa-rotate-left" aria-hidden="true"></i> {{ t('btnRestart') }}
          </button>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    :host { display: block; width: 100%; min-width: 0; container: dpwa / inline-size; }
    button { font: inherit; }
    button:focus-visible { outline: 2px solid #f99126; outline-offset: 2px; }
    p { margin: 0; }

    .dpwa { display: grid; gap: 28px; align-items: start; }
    /* Duas colunas pela largura do contêiner da feature (não da janela): em tablets ele é estreito. */
    @container dpwa (min-width: 880px) { .dpwa { grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 32px; } }
    .win-col, .side { min-width: 0; }

    .frame-pick { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 4px; margin-bottom: 8px; font-size: 11px; font-weight: 700; color: #64748b; }
    .frame-pick-label { margin-right: 6px; }
    .frame-pick button { min-height: 32px; padding: 4px 12px; border: 1px solid #e2e8f0; border-radius: 999px; background: #fff; color: #475569; cursor: pointer; transition: background-color .2s, color .2s, border-color .2s; }
    .frame-pick button:hover { border-color: #fdba74; }
    .frame-pick button.on { color: #10051c; background: #f99126; border-color: #f99126; }
    @media (pointer: coarse) { .frame-pick button { min-height: 44px; padding-inline: 14px; } }

    /* Janela genérica desenhada em CSS (sem marcas de sistema operacional). */
    .window { position: relative; container: win / inline-size; overflow: hidden; border-radius: 14px; background: #0b0d14; color: #e2e8f0; box-shadow: 0 24px 50px -24px rgba(16, 5, 28, .6), 0 0 0 1px rgba(16, 5, 28, .2); font-size: 12px; }
    .titlebar { display: flex; align-items: center; gap: 8px; min-height: 38px; padding: 6px 12px; background: #151824; border-bottom: 1px solid rgba(255, 255, 255, .06); }
    .lights { display: none; gap: 6px; }
    .lights i { width: 11px; height: 11px; border-radius: 50%; background: #f87171; }
    .lights i:nth-child(2) { background: #fbbf24; }
    .lights i:nth-child(3) { background: #34d399; }
    .os-macos .lights { display: inline-flex; }
    .os-macos .win-btns { display: none; }
    .os-macos .titlebar { justify-content: flex-start; }
    .app-ico { flex: none; width: 22px; height: 22px; padding: 3px; border-radius: 6px; background: rgba(255, 255, 255, .12); }
    .app-ico img { display: block; width: 100%; height: 100%; object-fit: contain; }
    .app-title { min-width: 0; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #f1f5f9; }
    .pwa-pill { flex: none; padding: 1px 7px; border-radius: 999px; font-size: 9.5px; font-weight: 800; color: #fdba74; background: rgba(249, 145, 38, .16); box-shadow: inset 0 0 0 1px rgba(249, 145, 38, .4); }
    .win-btns { margin-left: auto; display: inline-flex; gap: 14px; padding-left: 8px; font-size: 10px; color: #94a3b8; }
    .os-linux .win-btns { gap: 6px; }
    .os-linux .win-btns i { width: 18px; height: 18px; display: grid; place-items: center; border-radius: 50%; background: rgba(255, 255, 255, .1); font-size: 8px; }

    .strip, .banner { display: grid; }
    .strip > *, .banner-face { grid-area: 1 / 1; min-width: 0; }
    .strip { background: #0f121d; border-bottom: 1px solid rgba(255, 255, 255, .06); }
    .strip-face { min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 52px; padding: 4px 12px; opacity: 0; transform: translateY(6px); pointer-events: none; transition: opacity .35s ease, transform .45s cubic-bezier(.16, 1, .3, 1); }
    .strip-face.shown { opacity: 1; transform: none; pointer-events: auto; }
    .strip-text { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #cbd5e1; }
    .strip-text i { margin-right: 4px; color: #94a3b8; }
    .strip-text i.ok { color: #34d399; }
    .btn-install, .btn-fast { flex: none; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 6px 14px; border: 0; border-radius: 10px; font-size: 12px; font-weight: 800; line-height: 1.2; color: #10051c; background: #f99126; cursor: pointer; transition: transform .18s cubic-bezier(.3, 1.4, .5, 1), background-color .2s; }
    .btn-install:hover, .btn-fast:hover { background: #ea7a10; }
    .btn-install:active, .btn-install.pressed, .btn-fast:active { transform: scale(.95); background: #ea7a10; }
    .conn { flex: none; display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 700; color: #6ee7b7; background: rgba(16, 185, 129, .16); box-shadow: inset 0 0 0 1px rgba(52, 211, 153, .35); transition: background-color .3s, color .3s, box-shadow .3s; }
    .conn-off { color: #fcd34d; background: rgba(245, 158, 11, .2); box-shadow: inset 0 0 0 1px rgba(245, 158, 11, .45); }
    .conn-sync { color: #7dd3fc; background: rgba(56, 189, 248, .2); box-shadow: inset 0 0 0 1px rgba(56, 189, 248, .45); }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; }

    .banner { position: relative; background: #064e3b; color: #d1fae5; transition: background-color .45s ease; }
    .banner-off { background: #78350f; color: #fef3c7; }
    .banner-sync { background: #075985; color: #f0f9ff; }
    .banner-face { display: flex; align-items: center; gap: 10px; padding: 9px 14px; line-height: 1.35; opacity: 0; transform: translateY(-4px); transition: opacity .3s ease, transform .4s cubic-bezier(.16, 1, .3, 1); }
    .banner-face.shown { opacity: 1; transform: none; }
    .banner-face i { flex: none; font-size: 15px; }
    .banner-face strong { display: block; }
    .sync-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: #7dd3fc; transform: scaleX(0); transform-origin: left; opacity: 0; }
    .sync-bar.run { opacity: 1; transform: scaleX(1); transition: transform 1.7s cubic-bezier(.3, 0, .2, 1); }

    .pos-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 10px; padding: 12px 14px 0; }
    .till { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 11px; color: #fb923c; background: rgba(249, 145, 38, .14); box-shadow: inset 0 0 0 1px rgba(249, 145, 38, .3); }
    .pos-name { min-width: 0; }
    .pos-name b { display: block; font-size: 14px; color: #fff; }
    .pos-name span { display: block; font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sum { min-width: 0; padding: 6px 10px; border-radius: 10px; text-align: right; background: rgba(255, 255, 255, .05); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .08); }
    .sum span { display: block; font-size: 9.5px; font-weight: 700; line-height: 1.25; text-transform: uppercase; letter-spacing: .03em; color: #94a3b8; }
    .sum b { display: block; font-size: 12.5px; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ok { color: #34d399; }
    .warn { color: #fbbf24; }
    .info { color: #7dd3fc; }

    .pos-bar { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 12px 14px; }
    .cats { display: flex; flex-wrap: wrap; gap: 6px; }
    .cat { min-height: 32px; padding: 4px 11px; border: 0; border-radius: 8px; font-size: 11px; font-weight: 700; color: #94a3b8; background: #1e2230; cursor: pointer; transition: background-color .2s, color .2s; }
    .cat:hover { color: #fff; background: #2a3044; }
    .cat.on { color: #10051c; background: #f99126; }
    @media (pointer: coarse) { .cat { min-height: 44px; } }

    .rows-head, .sale-in { display: grid; grid-template-columns: 3.4em minmax(0, 1.2fr) minmax(0, 1.5fr) minmax(0, .9fr) minmax(5.6em, .8fr) minmax(0, 1.2fr); gap: 0 10px; align-items: center; padding-inline: 14px; }
    .rows-head { padding-block: 8px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; background: rgba(0, 0, 0, .35); border-block: 1px solid rgba(255, 255, 255, .06); }
    .rows-head span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rows-wrap { position: relative; height: 236px; overflow: hidden; }
    .rows { list-style: none; margin: 0; padding: 0; -webkit-mask-image: linear-gradient(#000 80%, transparent); mask-image: linear-gradient(#000 80%, transparent); height: 100%; overflow: hidden; }
    /* Entrada, saída e filtro recolhem a altura da linha: a lista desliza, não pula. */
    .sale { display: grid; grid-template-rows: 1fr; transition: grid-template-rows .5s cubic-bezier(.4, 0, .2, 1), opacity .35s ease; animation: saleIn .55s cubic-bezier(.16, 1, .3, 1) backwards; }
    .sale.seed { animation: none; }
    .sale.leaving { grid-template-rows: 0fr; opacity: 0; }
    .sale-clip { min-height: 0; overflow: hidden; }
    .sale-in { padding-block: 9px; border-bottom: 1px solid rgba(255, 255, 255, .05); transition: background-color .35s; }
    .sale-in.pending { background: rgba(245, 158, 11, .09); }
    .sale-in.syncing { background: rgba(56, 189, 248, .09); }
    .sale-in > span { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .c-id { font-weight: 700; font-variant-numeric: tabular-nums; color: #cbd5e1; }
    .c-client { font-weight: 600; color: #fff; }
    .c-item { color: #cbd5e1; }
    .c-pay { color: #94a3b8; }
    .c-amount { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
    .pill { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 800; color: #6ee7b7; background: rgba(16, 185, 129, .15); transition: background-color .3s, color .3s; }
    .pill-pending { color: #fcd34d; background: rgba(245, 158, 11, .2); }
    .pill-sync { color: #7dd3fc; background: rgba(56, 189, 248, .2); }
    .empty { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; text-align: center; color: #94a3b8; opacity: 0; pointer-events: none; transition: opacity .35s ease .15s; }
    .empty.shown { opacity: 1; }

    .snack { position: absolute; left: 12px; right: 12px; bottom: 10px; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 10px; font-size: 11.5px; font-weight: 700; line-height: 1.3; color: #e0e7ff; background: #1f1533; box-shadow: 0 10px 22px -10px rgba(0, 0, 0, .7), inset 0 0 0 1px rgba(255, 255, 255, .12); opacity: 0; transform: translateY(10px) scale(.98); pointer-events: none; transition: opacity .3s ease, transform .4s cubic-bezier(.16, 1, .3, 1); }
    .snack.shown { opacity: 1; transform: none; }
    .snack-warning { color: #fef3c7; background: #78350f; }
    .snack-success { color: #d1fae5; background: #064e3b; }

    .notice { position: absolute; top: 46px; right: 10px; z-index: 3; width: min(280px, calc(100% - 20px)); display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 12px; color: #0f172a; background: #fff; box-shadow: 0 16px 30px -12px rgba(0, 0, 0, .6); transform: translateX(calc(100% + 16px)); transition: transform .55s cubic-bezier(.3, 1.2, .4, 1); }
    .notice.shown { transform: none; }
    .notice .app-ico { width: 28px; height: 28px; padding: 4px; background: #10051c; }
    .notice-body { min-width: 0; flex: 1; }
    .notice-head { display: flex; justify-content: space-between; gap: 8px; font-size: 11.5px; }
    .notice-head span { font-size: 10px; color: #94a3b8; }
    .notice p { margin-top: 1px; font-size: 11.5px; line-height: 1.35; color: #334155; }

    .win-foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; padding: 8px 14px; font-size: 10.5px; color: #94a3b8; background: #07080d; border-top: 1px solid rgba(255, 255, 255, .06); }
    .win-foot i { margin-right: 4px; color: #fb923c; }

    @container win (max-width: 579px) {
      .pos-head { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
      .till { display: none; }
      .pos-name { grid-column: 1 / -1; }
      .pos-head .sum { text-align: left; }
      .pos-bar { grid-template-columns: minmax(0, 1fr); }
      .rows-head { display: none; }
      .rows-wrap { height: 268px; border-top: 1px solid rgba(255, 255, 255, .06); }
      .sale-in { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "client amount" "item status"; row-gap: 3px; padding-block: 8px; }
      .c-id, .c-pay { display: none; }
      .c-client { grid-area: client; }
      .c-item { grid-area: item; }
      .c-item::before { content: attr(data-id); color: #94a3b8; }
      .c-amount { grid-area: amount; }
      .c-status { grid-area: status; justify-self: end; }
    }

    /* Coluna de texto */
    .side { container: side / inline-size; }
    .eyebrow { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: #b45309; background: #ffedd5; }
    .title { margin: 0 0 8px; font-size: clamp(1.35rem, 1.1rem + 1.2vw, 1.75rem); font-weight: 800; line-height: 1.2; color: #10051c; }
    .intro { margin-bottom: 20px; font-size: 15px; line-height: 1.6; color: #4b5563; }
    .steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .step { width: 100%; min-height: 44px; display: flex; align-items: flex-start; gap: 12px; padding: 11px 14px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; text-align: left; color: #475569; cursor: pointer; transition: border-color .3s, box-shadow .3s, color .3s; }
    .step:hover { border-color: #fdba74; }
    .step.on { border-color: #f99126; color: #334155; box-shadow: 0 8px 22px -12px rgba(249, 145, 38, .6), inset 3px 0 0 #f99126; }
    .num { flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 800; color: #475569; background: #f1f5f9; transition: background-color .3s, color .3s, transform .35s cubic-bezier(.3, 1.5, .5, 1); }
    .step.on .num { color: #10051c; background: #f99126; transform: scale(1.08); }
    .num.done { color: #047857; background: #d1fae5; }
    .step-body { min-width: 0; flex: 1; }
    .step-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 8px; }
    .step-head b { font-size: 14px; color: #0f172a; }
    .tag { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; color: #64748b; background: #f1f5f9; transition: background-color .3s, color .3s; }
    .step.on .tag { color: #b45309; background: #ffedd5; }
    .step-desc { display: block; margin-top: 3px; font-size: 13px; line-height: 1.45; }

    .try { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    .try-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; margin-bottom: 10px; font-size: 12px; font-weight: 700; color: #64748b; }
    .try-head > span:first-child { text-transform: uppercase; letter-spacing: .05em; }
    .try-head > span:first-child i { color: #f99126; margin-right: 4px; }
    .mode { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: 11px; color: #047857; background: #ecfdf5; transition: background-color .3s, color .3s; }
    .mode.manual { color: #b45309; background: #fff7ed; }
    /* Grade fixa: o rótulo do botão muda de tamanho sem empurrar o que vem abaixo. */
    .ctls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .ctl { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 14px; border: 1px solid transparent; border-radius: 999px; font-size: 13px; font-weight: 700; line-height: 1.2; cursor: pointer; transition: transform .18s cubic-bezier(.3, 1.4, .5, 1), background-color .2s, border-color .2s, color .2s; }
    .ctl:active { transform: scale(.96); }
    .ctl-main, .ctl-go, .ctl-ghost { grid-column: 1 / -1; }
    .ctl-main { color: #fff; background: #10051c; }
    .ctl-main:hover { background: #2a1245; }
    .ctl-go { color: #fff; background: #15803d; }
    .ctl-go:hover { background: #166534; }
    .ctl-alt { color: #10051c; background: #fff; border-color: #cbd5e1; }
    .ctl-alt:hover { border-color: #94a3b8; background: #f8fafc; }
    .ctl-ghost { color: #475569; background: transparent; }
    .ctl-ghost:hover { color: #10051c; background: #f1f5f9; }
    @container side (min-width: 520px) {
      .ctls { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .ctl-ghost { grid-column: auto; }
    }

    @keyframes saleIn { from { grid-template-rows: 0fr; opacity: 0; } to { grid-template-rows: 1fr; opacity: 1; } }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition: none !important; }
    }
  `],
})
export class DesktopPwaDemoComponent extends OfflineSalesBase {
  @Input() context: 'web' | 'desktop' = 'web';

  protected readonly seedSize = 4;
  protected readonly firstId = 3048;

  readonly t = this.i18n.scope(I18N);
  readonly steps = STEPS;
  readonly categories = CATEGORIES;
  readonly osList = OS_LIST;

  selectedOs: DesktopOs = 'windows';
  activeCategory: CategoryFilter = 'todos';

  constructor() {
    super();
    this.init();
  }

  get filteredSales(): DemoSale[] {
    return this.sales.filter((s) => !s.leaving && this.matches(s));
  }

  matches(sale: DemoSale): boolean {
    return this.activeCategory === 'todos' || sale.category === this.activeCategory;
  }

  setOs(os: DesktopOs): void {
    this.selectedOs = os;
  }

  setCategory(category: CategoryFilter): void {
    this.showcase.interact();
    this.activeCategory = category;
  }

  /** O ciclo recomeça sempre mostrando todas as vendas. */
  protected override onRewind(): void {
    this.activeCategory = 'todos';
  }
}
