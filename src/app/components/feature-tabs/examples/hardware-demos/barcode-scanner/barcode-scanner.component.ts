import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faAppleWhole,
  faBarcode,
  faBottleWater,
  faBreadSlice,
  faCheese,
  faCircleCheck,
  faCookieBite,
  faMugHot,
  faReceipt,
  faSoap,
  faVolumeHigh,
} from '@fortawesome/free-solid-svg-icons';
import { I18nService } from '../../../../../i18n/i18n.service';
import { Showcase, tween } from '../showcase';
import { I18N } from './barcode-scanner.i18n';

type Key = keyof (typeof I18N)['pt'];

interface Product {
  name: Key;
  code: string;
  price: number;
  icon: IconDefinition;
}

interface Row {
  uid: number;
  product: Product;
  leaving: boolean;
}

/** enter → scan → read → exit; `done` fecha a venda antes de recomeçar. */
type Phase = 'enter' | 'scan' | 'read' | 'exit' | 'done';

const PRODUCTS: Product[] = [
  { name: 'pCoffee', code: '7891000315507', price: 18.9, icon: faMugHot },
  { name: 'pWater', code: '7896004400174', price: 3.49, icon: faBottleWater },
  { name: 'pCookie', code: '7622300862367', price: 6.75, icon: faCookieBite },
  { name: 'pSoap', code: '7891150047259', price: 9.9, icon: faSoap },
  { name: 'pBread', code: '7896002301428', price: 8.2, icon: faBreadSlice },
  { name: 'pApple', code: '2000345001275', price: 11.4, icon: faAppleWhole },
  { name: 'pCheese', code: '7898039250113', price: 24.5, icon: faCheese },
];

/** Itens por venda: ao chegar aqui o cupom fecha e a lista sai com animação. */
const SALE_SIZE = 5;

@Component({
  selector: 'app-barcode-scanner',
  standalone: true,
  imports: [FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bs" (pointerdown)="onTouch()">
      <header class="bs-head">
        <div class="bs-title">
          <fa-icon [icon]="faBarcode"></fa-icon>
          <span>{{ t('title') }}</span>
        </div>
        <span class="bs-mode" [class.is-auto]="auto()">
          <i></i>{{ auto() ? t('modeAuto') : t('modeManual') }}
        </span>
      </header>

      <div class="bs-body">
        <section class="bs-stage" [attr.aria-label]="t('stage')">
          <div class="bs-reader" [class.is-beep]="phase() === 'read'" aria-hidden="true">
            <span class="bs-window"></span>
            <span class="bs-led"></span>
            <fa-icon class="bs-sound" [icon]="faVolumeHigh"></fa-icon>
          </div>
          <div class="bs-cone" [class.is-on]="phase() === 'scan' || phase() === 'read'" aria-hidden="true"></div>

          <div class="bs-card" [attr.data-phase]="phase()">
            <div class="bs-prod">
              <span class="bs-prod-icon"><fa-icon [icon]="current().icon"></fa-icon></span>
              <span class="bs-prod-name">{{ t(current().name) }}</span>
            </div>
            <div class="bs-code">
              <div class="bs-bars" aria-hidden="true">
                @for (w of bars(); track $index) {
                  <i [style.flex-grow]="w"></i>
                }
              </div>
              <div class="bs-beam" aria-hidden="true"></div>
              <div class="bs-digits">{{ current().code }}</div>
            </div>
          </div>

          <div class="bs-done" [class.is-on]="phase() === 'done'" aria-hidden="true">
            <fa-icon [icon]="faCircleCheck"></fa-icon>
            <span>{{ t('saleDone') }}</span>
          </div>

          <p class="bs-status" aria-live="polite">{{ status() }}</p>

          <button type="button" class="bs-btn" (click)="scanNow()">
            <fa-icon [icon]="faBarcode"></fa-icon>
            {{ t('scanNext') }}
          </button>
        </section>

        <section class="bs-list">
          <div class="bs-list-head">
            <span><fa-icon [icon]="faReceipt"></fa-icon> {{ t('receipt') }}</span>
            <span class="bs-count">{{ countLabel() }}</span>
          </div>
          <div class="bs-rows">
            <p class="bs-empty" [class.is-on]="rows().length === 0">{{ t('empty') }}</p>
            @for (row of rows(); track row.uid) {
              <div class="bs-row" [class.is-leaving]="row.leaving">
                <div class="bs-row-in">
                  <span class="bs-row-icon"><fa-icon [icon]="row.product.icon"></fa-icon></span>
                  <span class="bs-row-name">
                    {{ t(row.product.name) }}
                    <small>{{ row.product.code }}</small>
                  </span>
                  <span class="bs-row-price">{{ i18n.money(row.product.price) }}</span>
                </div>
              </div>
            }
          </div>
          <div class="bs-total">
            <span>{{ t('total') }}</span>
            <strong>{{ i18n.money(shownTotal()) }}</strong>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .bs {
      container-type: inline-size;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      overflow: hidden;
      color: #0f172a;
    }
    .bs-head {
      display: flex; flex-wrap: wrap; gap: .5rem .75rem;
      align-items: center; justify-content: space-between;
      padding: .75rem 1rem;
      border-bottom: 1px solid #eef2f6;
    }
    .bs-title { display: flex; align-items: center; gap: .5rem; font-weight: 700; min-width: 0; }
    .bs-title fa-icon { color: var(--unrender-accent, #f99126); }
    .bs-mode {
      display: inline-flex; align-items: center; gap: .4rem;
      font-size: .75rem; font-weight: 600; color: #475569;
      background: #f1f5f9; border-radius: 999px; padding: .25rem .65rem;
      transition: background-color .3s ease, color .3s ease;
    }
    .bs-mode i { width: .45rem; height: .45rem; border-radius: 50%; background: #94a3b8; transition: background-color .3s ease; }
    .bs-mode.is-auto { background: #fff4e6; color: #9a4f04; }
    .bs-mode.is-auto i { background: var(--unrender-accent, #f99126); animation: bs-blink 1.6s ease-in-out infinite alternate; }

    .bs-body { display: grid; grid-template-columns: minmax(0, 1fr); }
    @container (min-width: 620px) {
      .bs-body { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); }
      .bs-list { border-top: 0; border-left: 1px solid #eef2f6; }
    }

    /* Bancada: leitor fixo em cima, produto passa por baixo */
    .bs-stage {
      position: relative;
      display: flex; flex-direction: column; align-items: center;
      gap: .75rem;
      padding: 1.25rem 1rem 1rem;
      background: #f8fafc;
      overflow: hidden;
    }
    .bs-reader {
      position: relative; z-index: 2;
      width: 8.5rem; height: 2.4rem;
      border-radius: .6rem .6rem 1rem 1rem;
      background: #1e293b;
      box-shadow: 0 6px 14px rgba(15, 23, 42, .18);
    }
    .bs-window {
      position: absolute; left: 12%; right: 12%; bottom: .3rem; height: .5rem;
      border-radius: 999px; background: #7f1d1d;
      transition: background-color .25s ease;
    }
    .bs-led {
      position: absolute; top: .45rem; right: .7rem;
      width: .5rem; height: .5rem; border-radius: 50%;
      background: #64748b;
      transition: background-color .2s ease;
    }
    .bs-led::after {
      content: ''; position: absolute; inset: 0; border-radius: 50%;
      border: 2px solid #22c55e; opacity: 0;
    }
    .bs-sound {
      position: absolute; top: .35rem; left: .7rem;
      font-size: .8rem; color: #4ade80; opacity: 0; transform: scale(.6);
      transition: opacity .2s ease, transform .25s cubic-bezier(.3, 1.6, .5, 1);
    }
    .bs-reader.is-beep .bs-led { background: #22c55e; }
    .bs-reader.is-beep .bs-led::after { animation: bs-ping .5s ease-out; }
    .bs-reader.is-beep .bs-sound { opacity: 1; transform: scale(1); }
    .bs-reader.is-beep .bs-window { background: #22c55e; }

    .bs-cone {
      position: absolute; z-index: 1; top: 3.4rem; left: 50%;
      width: 13rem; height: 6.5rem; margin-left: -6.5rem;
      background: linear-gradient(to bottom, rgba(239, 68, 68, .28), rgba(239, 68, 68, 0));
      clip-path: polygon(34% 0, 66% 0, 100% 100%, 0 100%);
      opacity: 0; transition: opacity .35s ease;
      pointer-events: none;
    }
    .bs-cone.is-on { opacity: 1; }

    .bs-card {
      position: relative; z-index: 2;
      width: min(100%, 17rem);
      background: #fff; border: 1px solid #e2e8f0; border-radius: .9rem;
      padding: .9rem; text-align: center;
      box-shadow: 0 8px 20px rgba(15, 23, 42, .08);
    }
    .bs-card[data-phase='enter'] { animation: bs-in .52s cubic-bezier(.2, .8, .2, 1) both; }
    .bs-card[data-phase='exit'], .bs-card[data-phase='done'] { animation: bs-out .38s cubic-bezier(.5, 0, .8, .4) both; }
    .bs-prod { display: flex; align-items: center; justify-content: center; gap: .6rem; margin-bottom: .7rem; min-width: 0; }
    .bs-prod-icon {
      flex: none; width: 2.25rem; height: 2.25rem; border-radius: .6rem;
      display: grid; place-items: center;
      background: #fff4e6; color: #c2640a;
    }
    .bs-prod-name { font-weight: 700; font-size: .9rem; text-align: left; overflow-wrap: anywhere; }
    .bs-code {
      position: relative; overflow: hidden;
      border: 2px solid #0f172a; border-radius: .35rem;
      padding: .5rem .6rem .3rem; background: #fff;
      transition: border-color .2s ease, box-shadow .2s ease;
    }
    .bs-card[data-phase='read'] .bs-code { border-color: #16a34a; box-shadow: 0 0 0 4px rgba(34, 197, 94, .18); }
    .bs-bars { display: flex; height: 3.4rem; }
    .bs-bars i { flex: 1 1 0; background: #0f172a; }
    .bs-bars i:nth-child(even) { background: transparent; }
    .bs-digits { font-family: ui-monospace, 'Cascadia Mono', Menlo, monospace; font-size: .7rem; letter-spacing: .22em; margin-top: .25rem; font-weight: 600; }
    /* Feixe em vai-e-vem: a animação nunca para (só aparece/some), então não há salto */
    .bs-beam {
      position: absolute; left: 0; right: 0; top: .5rem; height: 2px;
      background: #ef4444; box-shadow: 0 0 10px 2px rgba(239, 68, 68, .7);
      opacity: 0; transition: opacity .25s ease;
      animation: bs-sweep .9s ease-in-out infinite alternate;
    }
    .bs-card[data-phase='scan'] .bs-beam { opacity: 1; }

    .bs-done {
      position: absolute; z-index: 3; left: 0; right: 0; top: 5.2rem;
      display: flex; flex-direction: column; align-items: center; gap: .4rem;
      color: #15803d; font-weight: 700;
      opacity: 0; transform: scale(.9);
      transition: opacity .3s ease, transform .4s cubic-bezier(.3, 1.5, .5, 1);
      pointer-events: none;
    }
    .bs-done fa-icon { font-size: 2.6rem; }
    .bs-done.is-on { opacity: 1; transform: none; transition-delay: .25s; }

    .bs-status { margin: 0; font-size: .8rem; color: #475569; min-height: 1.2em; }
    .bs-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
      min-height: 44px; padding: .5rem 1.1rem;
      border-radius: 999px; border: 0;
      background: var(--unrender-purple, #10051c); color: #fff;
      font-weight: 600; font-size: .875rem; cursor: pointer;
      transition: transform .15s ease, background-color .2s ease;
    }
    .bs-btn:hover { background: #2a1245; }
    .bs-btn:active { transform: scale(.96); }
    .bs-btn:focus-visible { outline: 3px solid var(--unrender-accent, #f99126); outline-offset: 2px; }

    .bs-list { display: flex; flex-direction: column; border-top: 1px solid #eef2f6; min-width: 0; }
    .bs-list-head {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: .25rem .75rem;
      padding: .75rem 1rem; font-size: .8rem; font-weight: 700; color: #334155;
    }
    .bs-list-head fa-icon { color: #94a3b8; margin-right: .25rem; }
    .bs-count { font-weight: 600; color: #64748b; }
    /* Altura reservada para a venda inteira: a página não "anda" quando entram itens */
    .bs-rows { position: relative; flex: 1; min-height: 15.5rem; padding: 0 1rem; }
    .bs-empty {
      position: absolute; inset: 0; margin: 0;
      display: grid; place-items: center; text-align: center; padding: 1rem;
      font-size: .85rem; color: #94a3b8;
      opacity: 0; transition: opacity .3s ease; pointer-events: none;
    }
    .bs-empty.is-on { opacity: 1; transition-delay: .25s; }
    .bs-row {
      display: grid; grid-template-rows: 1fr;
      animation: bs-row-in .45s cubic-bezier(.2, .8, .2, 1) both;
      transition: grid-template-rows .32s ease, opacity .26s ease, transform .32s ease;
    }
    .bs-row.is-leaving { grid-template-rows: 0fr; opacity: 0; transform: translateX(14px); }
    .bs-row-in {
      min-height: 0; overflow: hidden;
      display: flex; align-items: center; gap: .6rem;
    }
    .bs-row-in > * { margin-block: .35rem; }
    .bs-row-icon {
      flex: none; width: 2rem; height: 2rem; border-radius: .5rem;
      display: grid; place-items: center; font-size: .8rem;
      background: #f1f5f9; color: #475569;
      animation: bs-tint 1.2s ease-out both;
    }
    .bs-row-name { flex: 1; min-width: 0; font-size: .82rem; font-weight: 600; line-height: 1.2; overflow-wrap: anywhere; }
    .bs-row-name small { display: block; font-family: ui-monospace, Menlo, monospace; font-size: .65rem; font-weight: 400; color: #94a3b8; }
    .bs-row-price { flex: none; font-size: .82rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .bs-total {
      display: flex; justify-content: space-between; align-items: baseline; gap: .75rem;
      padding: .75rem 1rem; border-top: 1px dashed #cbd5e1; margin-top: .25rem;
      font-size: .85rem; color: #475569;
    }
    .bs-total strong { font-size: 1.25rem; color: var(--unrender-purple, #10051c); font-variant-numeric: tabular-nums; }

    @keyframes bs-in { from { opacity: 0; transform: translateX(-42%) rotate(-4deg); } to { opacity: 1; transform: none; } }
    @keyframes bs-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(42%) rotate(4deg); } }
    @keyframes bs-sweep { from { transform: translateY(0); } to { transform: translateY(3.3rem); } }
    @keyframes bs-ping { from { opacity: .9; transform: scale(1); } to { opacity: 0; transform: scale(3.6); } }
    @keyframes bs-blink { from { opacity: 1; } to { opacity: .35; } }
    @keyframes bs-row-in { from { grid-template-rows: 0fr; opacity: 0; transform: translateX(-14px); } to { grid-template-rows: 1fr; opacity: 1; transform: none; } }
    @keyframes bs-tint { from { background: #ffe2bd; color: #9a4f04; } to { background: #f1f5f9; color: #475569; } }

    @media (prefers-reduced-motion: reduce) {
      .bs-card, .bs-row, .bs-row-icon, .bs-beam, .bs-mode i { animation: none !important; }
      .bs-row, .bs-done, .bs-sound { transition: none; }
    }
  `],
})
export class BarcodeScannerComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly faBarcode = faBarcode;
  readonly faReceipt = faReceipt;
  readonly faCircleCheck = faCircleCheck;
  readonly faVolumeHigh = faVolumeHigh;

  readonly phase = signal<Phase>('scan');
  readonly index = signal(0);
  readonly rows = signal<Row[]>([]);
  readonly shownTotal = signal(0);
  readonly auto = signal(false);

  readonly current = computed(() => PRODUCTS[this.index() % PRODUCTS.length]);
  /** Larguras das barras (pretas e brancas alternadas), derivadas do próprio código. */
  readonly bars = computed(() => barWidths(this.current().code));
  readonly status = computed(() => {
    switch (this.phase()) {
      case 'scan': return this.t('stReading');
      case 'read': return this.t('stRead');
      case 'done': return this.t('saleDone');
      default: return this.t('stWaiting');
    }
  });
  readonly countLabel = computed(() => {
    const n = this.rows().filter((r) => !r.leaving).length;
    return n === 1 ? this.t('item1') : this.t('itemN', { n });
  });

  private readonly showcase = new Showcase(this.host.nativeElement, 7000, () => !this.busy);
  private busy = false;
  private queued = false;
  private uid = 0;
  private total = 0;
  private cancelTween: () => void = () => {};
  private audio: AudioContext | null = null;

  ngAfterViewInit(): void {
    if (this.showcase.reduced) {
      // Sem movimento: mostra um cupom já lido, parado.
      const rows = PRODUCTS.slice(0, 3).map((product) => ({ uid: ++this.uid, product, leaving: false }));
      this.rows.set(rows);
      this.total = rows.reduce((s, r) => s + r.product.price, 0);
      this.shownTotal.set(this.total);
      this.index.set(3);
    }
    this.showcase.start(async (step) => {
      this.auto.set(true);
      await this.cycle(false);
      await step(200);
    });
  }

  ngOnDestroy(): void {
    this.showcase.destroy();
    this.cancelTween();
    void this.audio?.close();
  }

  onTouch(): void {
    this.auto.set(false);
    this.showcase.interrupt();
  }

  /** Leitura disparada pelo usuário (com bip sonoro, já que houve um gesto). */
  scanNow(): void {
    this.onTouch();
    if (this.busy) {
      this.queued = true;
      return;
    }
    void this.showcase.guard(async () => {
      do {
        this.queued = false;
        await this.cycle(true);
      } while (this.queued);
    });
  }

  /** Um produto: lê, lança no cupom, sai da bancada e dá lugar ao próximo. */
  private async cycle(manual: boolean): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const wait = (ms: number) => this.showcase.wait(ms);
    try {
      this.phase.set('scan');
      await wait(manual ? 550 : 1500);

      this.phase.set('read');
      this.addRow(this.current());
      if (manual) this.beep();
      await wait(650);

      if (this.rows().length >= SALE_SIZE) {
        await this.closeSale(wait);
      } else {
        this.phase.set('exit');
        await wait(400);
      }
      this.index.update((i) => i + 1);
      this.phase.set('enter');
      await wait(560);
    } finally {
      this.busy = false;
    }
  }

  /** Fecha a venda: confirma, recolhe as linhas uma a uma e zera o total suavemente. */
  private async closeSale(wait: (ms: number) => Promise<void>): Promise<void> {
    this.phase.set('done');
    await wait(1700);
    for (const row of this.rows()) {
      this.rows.update((rows) => rows.map((r) => (r.uid === row.uid ? { ...r, leaving: true } : r)));
      await wait(90);
    }
    this.setTotal(0);
    await wait(380);
    this.rows.set([]);
    await wait(250);
  }

  private addRow(product: Product): void {
    this.rows.update((rows) => [...rows, { uid: ++this.uid, product, leaving: false }]);
    this.setTotal(this.total + product.price);
  }

  private setTotal(value: number): void {
    this.cancelTween();
    this.cancelTween = tween(this.shownTotal(), value, 450, (v) => this.shownTotal.set(v));
    this.total = value;
  }

  private beep(): void {
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.audio ??= new Ctor();
      const ctx = this.audio;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1500;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      // Sem áudio disponível: o bip fica só visual.
    }
  }
}

/** Gera larguras estáveis de barras a partir dos dígitos (visual, não é um EAN válido). */
function barWidths(code: string): number[] {
  const out: number[] = [1, 1, 1];
  for (const ch of code) {
    const d = ch.charCodeAt(0) - 48;
    out.push(1 + (d % 3), 1 + ((d >> 1) % 2), 1 + ((d * 7) % 4 === 0 ? 2 : 0), 1 + (d % 2));
  }
  out.push(1, 1, 1);
  return out;
}
