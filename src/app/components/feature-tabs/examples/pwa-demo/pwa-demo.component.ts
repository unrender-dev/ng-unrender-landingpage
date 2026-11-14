import { Component } from '@angular/core';
import { OfflineSalesBase } from './offline-sales.base';
import { I18N } from './pwa-demo.i18n';

const STEPS = [
  { key: 'install', title: 's1Title', badge: 's1Badge', desc: 's1Desc' },
  { key: 'offline', title: 's2Title', badge: 's2Badge', desc: 's2Desc' },
  { key: 'local', title: 's3Title', badge: 's3Badge', desc: 's3Desc' },
  { key: 'sync', title: 's4Title', badge: 's4Badge', desc: 's4Desc' },
] as const;

/**
 * PWA no celular: instala sem loja, vende sem internet, sincroniza e avisa por push.
 * É uma demonstração interativa (não há captura real do PDV do SGA CTRLB); roda sozinha
 * em loop e cede o controle quando a pessoa toca em qualquer botão.
 */
@Component({
  selector: 'app-pwa-demo',
  standalone: true,
  template: `
  <div class="pwa">
    <figure class="phone" role="group" [attr.aria-label]="t('phoneLabel')">
      <div class="frame">
        <div class="screen" [class.is-offline]="offline">
          <div class="status-bar">
            <span>{{ time(now) }}</span>
            <span class="island" aria-hidden="true"></span>
            <span class="status-icons" aria-hidden="true">
              @if (offline) {
                <i class="fa-solid fa-plane"></i>
              } @else {
                <i class="fa-solid fa-signal"></i>
                <i class="fa-solid fa-wifi"></i>
              }
              <i class="fa-solid fa-battery-three-quarters"></i>
            </span>
          </div>

          <header class="app-header">
            <span class="app-logo"><img src="/ctrlb-logo.png" alt="" /></span>
            <div class="min-w-0 flex-1">
              <h5 class="app-name">SGA CTRLB</h5>
              <p class="app-sub">{{ t('appSub') }}</p>
            </div>
            <span class="conn" [class.conn-off]="offline" [class.conn-sync]="syncing">
              @if (syncing) {
                <i class="fa-solid fa-arrows-rotate fa-spin" aria-hidden="true"></i> {{ t('stSyncing') }}
              } @else if (offline) {
                <i class="fa-solid fa-plane" aria-hidden="true"></i> {{ t('stAirplane') }}
              } @else {
                <span class="dot" aria-hidden="true"></span> {{ t('stOnline') }}
              }
            </span>
          </header>

          <div class="banner" [class.banner-off]="offline" [class.banner-sync]="syncing">
            @if (offline) {
              <div class="banner-body">
                <i class="fa-solid fa-plane" aria-hidden="true"></i>
                <p><strong>{{ t('bOffTitle') }}</strong>{{ t('bOffText') }}</p>
              </div>
            } @else if (syncing) {
              <div class="banner-body">
                <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>
                <p><strong>{{ t('bSyncTitle') }}</strong>{{ t('bSyncText') }}</p>
              </div>
            } @else {
              <div class="banner-body">
                <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                <p><strong>{{ t('bOnTitle') }}</strong>{{ t('bOnText') }}</p>
              </div>
            }
            <span class="sync-bar" [class.run]="syncing" aria-hidden="true"></span>
          </div>

          <div class="summary">
            <div>
              <span class="label">{{ t('sumToday') }}</span>
              <strong>{{ t('sumCount', { n: saleCount }) }}</strong>
            </div>
            <div class="right">
              <span class="label">{{ t('sumDevice') }}</span>
              @if (pendingCount > 0) {
                <strong class="warn"><i class="fa-regular fa-clock" aria-hidden="true"></i>
                  {{ pendingCount === 1 ? t('sumPendingOne') : t('sumPendingMany', { n: pendingCount }) }}</strong>
              } @else {
                <strong class="ok"><i class="fa-solid fa-cloud" aria-hidden="true"></i> {{ t('sumAllCloud') }}</strong>
              }
            </div>
          </div>

          <div class="sales">
            @for (sale of sales; track sale.id) {
              <div class="sale" [class.seed]="sale.seed" [class.leaving]="sale.leaving">
                <div class="sale-card" [class.pending]="sale.state === 'pending'" [class.syncing]="sale.state === 'syncing'">
                  <span class="ico" aria-hidden="true"><i class="fa-solid fa-receipt"></i></span>
                  <div class="min-w-0 flex-1">
                    <div class="line">
                      <span class="who">{{ sale.client }}</span>
                      <span class="when">{{ time(sale.at) }}</span>
                    </div>
                    <div class="what">#{{ sale.id }} · {{ t(sale.product) }}</div>
                    <div class="line">
                      <span class="amount">{{ i18n.money(sale.amount) }}</span>
                      <span class="pill" [class.pill-pending]="sale.state === 'pending'" [class.pill-sync]="sale.state === 'syncing'">
                        @if (sale.state === 'pending') {
                          <i class="fa-regular fa-clock" aria-hidden="true"></i> {{ t('pillPending') }}
                        } @else if (sale.state === 'syncing') {
                          <i class="fa-solid fa-arrows-rotate fa-spin" aria-hidden="true"></i> {{ t('pillSyncing') }}
                        } @else {
                          <i class="fa-solid fa-check" aria-hidden="true"></i> {{ t('pillSynced') }}
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          <div class="app-footer">
            <button type="button" class="btn-sale" (click)="addSale()">
              <i class="fa-solid fa-plus" aria-hidden="true"></i>
              <span>{{ offline ? t('newSaleOffline') : t('newSale') }}</span>
            </button>
          </div>

          <div class="snack" [class.shown]="toastShown" [class.snack-warning]="toast?.type === 'warning'"
            [class.snack-success]="toast?.type === 'success'" role="status">
            @if (toast; as tt) {
              <i [class]="toastIcon" aria-hidden="true"></i>
              <span>{{ t(tt.key, tt.params) }}</span>
            }
          </div>

          <div class="push" [class.shown]="noticeShown" [attr.aria-hidden]="!noticeShown">
            <span class="push-ico"><img src="/ctrlb-logo.png" alt="" /></span>
            <div class="min-w-0 flex-1">
              <div class="push-head"><b>SGA CTRLB</b><span>{{ t('pushNow') }}</span></div>
              @if (notice; as n) {
                <p>{{ t(n.key, n.params) }}</p>
              }
            </div>
          </div>

          <div class="install" [class.shown]="!installed" [attr.inert]="installed ? '' : null">
            <div class="sheet">
              <span class="grabber" aria-hidden="true"></span>
              <div class="sheet-app">
                <span class="push-ico"><img src="/ctrlb-logo.png" alt="" /></span>
                <div class="min-w-0">
                  <b>SGA CTRLB</b>
                  <span>{{ t('installFrom') }}</span>
                </div>
              </div>
              <p>{{ t('installHint') }}</p>
              <button type="button" class="btn-install" [class.pressed]="installing" (click)="install()">
                <i class="fa-solid fa-arrow-down" aria-hidden="true"></i> {{ t('installCta') }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <figcaption>{{ t('demoTag') }}</figcaption>
    </figure>

    <div class="side">
      <p class="eyebrow"><i class="fa-solid fa-bolt" aria-hidden="true"></i> {{ t('eyebrow') }}</p>
      <h4 class="title">{{ t('title') }}</h4>
      <p class="intro">{{ t('lead') }}</p>

      <ol class="steps">
        @for (step of steps; track step.key; let i = $index) {
          <li>
            <button type="button" class="step" [class.on]="activeStep === i"
              [attr.aria-current]="activeStep === i ? 'step' : null" (click)="selectStep(i)">
              <span class="num" [class.done]="activeStep > i">
                @if (activeStep > i) { <i class="fa-solid fa-check" aria-hidden="true"></i> } @else { {{ i + 1 }} }
              </span>
              <span class="min-w-0 flex-1">
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
            <i [class]="offline ? 'fa-solid fa-wifi' : 'fa-solid fa-plane'" aria-hidden="true"></i>
            {{ offline ? t('btnReconnect') : t('btnDrop') }}
          </button>
          <button type="button" class="ctl ctl-alt" (click)="addSale()">
            <i class="fa-solid fa-cart-plus" aria-hidden="true"></i> {{ offline ? t('btnSaleOffline') : t('btnSale') }}
          </button>
          <button type="button" class="ctl ctl-alt" (click)="sendNotice()">
            <i class="fa-regular fa-bell" aria-hidden="true"></i> {{ t('btnPush') }}
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
    :host { display: block; min-width: 0; container: pwa / inline-size; }
    /* Duas colunas pela largura do contêiner da feature (não da janela): em tablets ele é estreito. */
    .pwa { display: grid; gap: 24px; align-items: center; }
    @container pwa (min-width: 640px) { .pwa { grid-template-columns: minmax(0, 300px) minmax(0, 1fr); gap: 32px; } }
    button { font: inherit; }
    button:focus-visible { outline: 2px solid #f99126; outline-offset: 2px; }

    /* Moldura genérica de celular, desenhada em CSS */
    .phone { width: min(100%, 290px); margin: 0 auto; }
    .phone figcaption { margin-top: 10px; text-align: center; font-size: 11px; font-weight: 600; color: #64748b; }
    .frame { background: #0b0b0f; border-radius: 40px; padding: 9px; box-shadow: 0 22px 44px -20px rgba(16, 5, 28, .5), inset 0 0 0 2px #2b2b33; }
    .screen { position: relative; aspect-ratio: 9 / 18.6; border-radius: 32px; overflow: hidden; background: #f8fafc; display: flex; flex-direction: column; color: #0f172a; }

    .status-bar { display: flex; justify-content: space-between; align-items: center; padding: 9px 16px 5px; font-size: 11px; font-weight: 700; background: #f8fafc; transition: background-color .35s, color .35s; }
    .is-offline .status-bar { background: #fef3c7; color: #92400e; }
    .island { width: 54px; height: 14px; border-radius: 999px; background: #0b0b0f; }
    .status-icons { display: flex; align-items: center; gap: 5px; font-size: 10px; }

    .app-header { display: flex; align-items: center; gap: 8px; padding: 9px 12px 10px; background: #10051c; color: #fff; }
    .app-logo { width: 30px; height: 30px; flex: none; border-radius: 8px; padding: 4px; background: rgba(255, 255, 255, .14); }
    .app-logo img, .push-ico img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .app-name { margin: 0; font-size: 13px; font-weight: 800; line-height: 1.15; color: #fff; }
    .app-sub { margin: 0; font-size: 9.5px; color: rgba(255, 255, 255, .7); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .conn { flex: none; display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; font-size: 9.5px; font-weight: 800; color: #6ee7b7; background: rgba(16, 185, 129, .2); border: 1px solid rgba(52, 211, 153, .4); transition: background-color .3s, color .3s, border-color .3s; }
    .conn-off { color: #fcd34d; background: rgba(245, 158, 11, .2); border-color: rgba(245, 158, 11, .5); }
    .conn-sync { color: #7dd3fc; background: rgba(56, 189, 248, .22); border-color: rgba(56, 189, 248, .5); }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; }

    .banner { position: relative; padding: 8px 12px; font-size: 10.5px; line-height: 1.35; background: #064e3b; color: #d1fae5; transition: background-color .4s ease; }
    .banner-off { background: #78350f; color: #fef3c7; }
    .banner-sync { background: #075985; color: #f0f9ff; }
    .banner-body { display: flex; gap: 8px; align-items: flex-start; animation: fadeUp .4s cubic-bezier(.16, 1, .3, 1) backwards; }
    .banner-body i { margin-top: 2px; font-size: 13px; flex: none; }
    .banner-body p { margin: 0; min-width: 0; }
    .banner-body strong { display: block; font-size: 11px; }
    .sync-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: #7dd3fc; transform: scaleX(0); transform-origin: left; opacity: 0; }
    .sync-bar.run { opacity: 1; transform: scaleX(1); transition: transform 1.7s cubic-bezier(.3, 0, .2, 1); }

    .summary .right { text-align: right; }
    .summary { display: flex; justify-content: space-between; gap: 8px; padding: 7px 12px; background: #fff; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    .summary .label { display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; color: #64748b; }
    .summary .warn { color: #b45309; }
    .summary .ok { color: #047857; }

    .sales { flex: 1; min-height: 0; overflow: hidden; padding: 8px 10px 0; -webkit-mask-image: linear-gradient(#000 82%, transparent); mask-image: linear-gradient(#000 82%, transparent); }
    /* A linha entra e sai recolhendo a própria altura, para a lista deslizar em vez de pular. */
    .sale { display: grid; grid-template-rows: 1fr; margin-bottom: 7px; transition: grid-template-rows .5s cubic-bezier(.4, 0, .2, 1), margin-bottom .5s cubic-bezier(.4, 0, .2, 1), opacity .35s ease; animation: saleIn .55s cubic-bezier(.16, 1, .3, 1) backwards; }
    .sale.seed { animation: none; }
    .sale.leaving { grid-template-rows: 0fr; margin-bottom: 0; opacity: 0; }
    .sale-card { min-height: 0; overflow: hidden; display: flex; align-items: center; gap: 9px; padding: 0 10px; border-radius: 12px; background: #fff; box-shadow: inset 0 0 0 1px #e2e8f0; transition: background-color .35s, box-shadow .35s; }
    .sale-card > * { padding-block: 8px; }
    .sale-card.pending { background: #fffbeb; box-shadow: inset 0 0 0 1px #f59e0b; }
    .sale-card.syncing { background: #f0f9ff; box-shadow: inset 0 0 0 1px #38bdf8; }
    .ico { flex: none; width: 28px; height: 28px; padding: 0 !important; border-radius: 8px; display: grid; place-items: center; font-size: 12px; color: #f99126; background: rgba(249, 145, 38, .14); }
    .line { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .who { font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .when { flex: none; font-size: 9.5px; color: #94a3b8; }
    .what { font-size: 10px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .amount { font-size: 11px; font-weight: 800; }
    .pill { display: inline-flex; align-items: center; gap: 3px; padding: 2px 6px; border-radius: 999px; font-size: 9px; font-weight: 800; white-space: nowrap; color: #15803d; background: #dcfce7; transition: background-color .3s, color .3s; }
    .pill-pending { color: #b45309; background: #fef3c7; }
    .pill-sync { color: #0369a1; background: #e0f2fe; }

    .app-footer { padding: 8px 10px 12px; background: #fff; border-top: 1px solid #e2e8f0; }
    .btn-sale, .btn-install { width: 100%; min-height: 44px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px; border: 0; border-radius: 12px; font-size: 12px; font-weight: 800; line-height: 1.2; color: #10051c; background: #f99126; cursor: pointer; transition: transform .18s cubic-bezier(.3, 1.4, .5, 1), background-color .2s; }
    .btn-sale:hover, .btn-install:hover { background: #ea7a10; }
    .btn-sale:active, .btn-install:active, .btn-install.pressed { transform: scale(.95); background: #ea7a10; }

    .snack { position: absolute; left: 10px; right: 10px; bottom: 72px; z-index: 3; display: flex; align-items: center; gap: 7px; padding: 8px 10px; border-radius: 10px; font-size: 10.5px; font-weight: 700; line-height: 1.3; color: #fff; background: #10051c; box-shadow: 0 8px 18px -8px rgba(0, 0, 0, .5); opacity: 0; transform: translateY(10px) scale(.97); pointer-events: none; transition: opacity .3s ease, transform .4s cubic-bezier(.16, 1, .3, 1); }
    .snack.shown { opacity: 1; transform: none; }
    .snack-warning { background: #78350f; color: #fef3c7; }
    .snack-success { background: #064e3b; color: #d1fae5; }

    .push { position: absolute; top: 8px; left: 8px; right: 8px; z-index: 5; display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 16px; background: #fff; box-shadow: 0 12px 28px -10px rgba(0, 0, 0, .45), 0 0 0 1px rgba(0, 0, 0, .06); transform: translateY(-135%); transition: transform .55s cubic-bezier(.3, 1.25, .4, 1); }
    .push.shown { transform: none; }
    .push-ico { flex: none; width: 32px; height: 32px; padding: 5px; border-radius: 9px; background: #10051c; }
    .push-head { display: flex; justify-content: space-between; gap: 6px; font-size: 11px; color: #10051c; }
    .push-head span { font-size: 9px; color: #94a3b8; }
    .push p { margin: 1px 0 0; font-size: 10.5px; line-height: 1.3; color: #334155; }

    .install { position: absolute; inset: 0; z-index: 4; display: flex; align-items: flex-end; background: rgba(16, 5, 28, .55); opacity: 0; pointer-events: none; transition: opacity .4s ease; }
    .install.shown { opacity: 1; pointer-events: auto; }
    .sheet { width: 100%; padding: 8px 14px 16px; border-radius: 22px 22px 0 0; background: #fff; transform: translateY(100%); transition: transform .5s cubic-bezier(.16, 1, .3, 1); }
    .install.shown .sheet { transform: none; }
    .grabber { display: block; width: 36px; height: 4px; margin: 0 auto 10px; border-radius: 999px; background: #cbd5e1; }
    .sheet-app { display: flex; align-items: center; gap: 10px; }
    .sheet-app b { display: block; font-size: 13px; color: #10051c; }
    .sheet-app span { display: block; font-size: 10px; color: #64748b; }
    .sheet p { margin: 10px 0 12px; font-size: 11px; line-height: 1.4; color: #475569; }

    /* Coluna de texto */
    .eyebrow { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 8px; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: #b45309; background: #ffedd5; }
    .title { margin: 0 0 8px; font-size: clamp(1.4rem, 1.1rem + 1.4vw, 1.875rem); font-weight: 800; line-height: 1.2; color: #10051c; }
    .intro { margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #4b5563; }
    .try { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    .side { min-width: 0; container: side / inline-size; }
    /* Grade fixa: o rótulo do botão muda de tamanho sem empurrar o que vem abaixo. */
    .ctls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .ctl-main, .ctl-go, .ctl-ghost { grid-column: 1 / -1; }
    @container side (min-width: 520px) {
      .ctls { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .ctl-ghost { grid-column: auto; }
    }
    .steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .step { width: 100%; min-height: 44px; display: flex; align-items: flex-start; gap: 12px; padding: 11px 14px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; text-align: left; color: #475569; cursor: pointer; transition: border-color .3s, box-shadow .3s, color .3s; }
    .step:hover { border-color: #fdba74; }
    .step.on { border-color: #f99126; color: #334155; box-shadow: 0 8px 22px -12px rgba(249, 145, 38, .6), inset 3px 0 0 #f99126; }
    .num { flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 800; color: #475569; background: #f1f5f9; transition: background-color .3s, color .3s, transform .35s cubic-bezier(.3, 1.5, .5, 1); }
    .step.on .num { color: #10051c; background: #f99126; transform: scale(1.08); }
    .num.done { color: #047857; background: #d1fae5; }
    .step-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 8px; }
    .step-head b { font-size: 14px; color: #0f172a; }
    .tag { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; color: #64748b; background: #f1f5f9; transition: background-color .3s, color .3s; }
    .step.on .tag { color: #b45309; background: #ffedd5; }
    .step-desc { display: block; margin-top: 3px; font-size: 13px; line-height: 1.45; }

    .try-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; margin-bottom: 10px; font-size: 12px; font-weight: 700; color: #64748b; }
    .try-head > span:first-child { text-transform: uppercase; letter-spacing: .05em; }
    .try-head > span:first-child i { color: #f99126; margin-right: 4px; }
    .mode { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: 11px; color: #047857; background: #ecfdf5; transition: background-color .3s, color .3s; }
    .mode.manual { color: #b45309; background: #fff7ed; }
    .ctl { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 14px; border: 1px solid transparent; border-radius: 999px; font-size: 13px; font-weight: 700; line-height: 1.2; cursor: pointer; transition: transform .18s cubic-bezier(.3, 1.4, .5, 1), background-color .2s, border-color .2s, color .2s; }
    .ctl:active { transform: scale(.96); }
    .ctl-main { color: #fff; background: #10051c; }
    .ctl-main:hover { background: #2a1245; }
    .ctl-go { color: #fff; background: #15803d; }
    .ctl-go:hover { background: #166534; }
    .ctl-alt { color: #10051c; background: #fff; border-color: #cbd5e1; }
    .ctl-alt:hover { border-color: #94a3b8; background: #f8fafc; }
    .ctl-ghost { color: #475569; background: transparent; }
    .ctl-ghost:hover { color: #10051c; background: #f1f5f9; }

    @keyframes saleIn { from { grid-template-rows: 0fr; margin-bottom: 0; opacity: 0; } to { grid-template-rows: 1fr; margin-bottom: 7px; opacity: 1; } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition: none !important; }
    }
  `],
})
export class PwaDemoComponent extends OfflineSalesBase {
  protected readonly seedSize = 3;
  protected readonly firstId = 1042;

  readonly t = this.i18n.scope(I18N);
  readonly steps = STEPS;

  constructor() {
    super();
    this.init();
  }
}
