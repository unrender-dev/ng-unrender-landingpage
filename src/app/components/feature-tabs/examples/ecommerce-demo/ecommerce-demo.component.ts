import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { I18nService, Params } from '../../../../i18n/i18n.service';
import { EcoKey, I18N } from './ecommerce-demo.i18n';

type Cat = 'featured' | 'fashion' | 'electronics' | 'home';

interface Product {
  id: number;
  name: EcoKey;
  price: number;
  icon: string;
  from: string;
  to: string;
  stock: number;
  cat: Exclude<Cat, 'featured'>;
  featured?: boolean;
  /** selo: texto fixo (ex.: -20%) ou chave traduzida */
  tag?: string;
  tagKey?: EcoKey;
}

interface CartLine { product: Product; qty: number; }

/** Item do feed: guarda a chave e os parâmetros para ser traduzido na hora de exibir. */
interface FeedItem { id: number; icon: string; color: string; key: EcoKey; params?: () => Params; at: Date; }

type Step = 'cart' | 'pix' | 'paid';

const DRAWER_MS = 420;
const IDLE_MS = 12000;

/**
 * Loja virtual funcional em miniatura: vitrine → carrinho → PIX → pedido pago,
 * com o painel da loja (CTRLB) recebendo tudo em tempo real ao lado.
 * Se ninguém mexer, ela se "compra sozinha" para mostrar o fluxo; ao primeiro toque
 * o controle passa para o visitante e o modo vitrine só volta após um tempo parado.
 */
@Component({
  selector: 'app-ecommerce-demo',
  standalone: true,
  imports: [NgClass],
  template: `
  <div class="eco grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4">

    <!-- LOJA -->
    <div class="store rounded-2xl overflow-hidden shadow-xl bg-white flex flex-col min-w-0" (pointerdown)="userTouched()" (keydown)="userTouched()">
      <div class="store-chrome flex items-center gap-2 px-3 py-2">
        <span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
        <div class="url flex-1 min-w-0 truncate"><i class="fa-solid fa-lock text-[9px] text-emerald-500 mr-1" aria-hidden="true"></i>aqui.shopping/<b>{{ t('slug') }}</b></div>
        <span class="demo-badge">{{ t('demoStore') }}</span>
      </div>

      <div class="store-head flex items-center justify-between gap-2 px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          <img src="aqui-shopping-f.png" alt="Aqui.shopping" class="h-7 w-7 object-contain rounded shrink-0" />
          <span class="font-extrabold text-unrender-purple tracking-tight truncate">{{ t('storeName') }}</span>
        </div>
        <button type="button" class="cart-btn" #cartBtn [class.bump]="bump" (click)="openCart()" [attr.aria-label]="t('openCart', { n: count })">
          <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>
          <span class="cart-count" [class.show]="count > 0" aria-hidden="true">{{ count || '' }}</span>
        </button>
      </div>

      <div class="relative flex-1 min-h-[380px] overflow-hidden" #area>
        <!-- vitrine -->
        <div class="p-4 pt-1">
          <div class="cats flex gap-2 mb-3 overflow-x-auto" role="group" [attr.aria-label]="t('cats')">
            @for (c of cats; track c) {
            <button type="button" class="cat" [class.on]="c === cat" [attr.aria-pressed]="c === cat" (click)="cat = c">{{ catLabel(c) }}</button>
            }
          </div>
          <div class="grid grid-cols-2 gap-3">
            @for (p of visibleProducts; track p.id) {
            <div class="prod" [class.flash]="flashId === p.id" [attr.data-pid]="p.id">
              <div class="prod-img" [style.background]="'linear-gradient(135deg,' + p.from + ',' + p.to + ')'">
                <i [class]="p.icon" aria-hidden="true"></i>
                @if (p.tag || p.tagKey) { <span class="prod-tag">{{ p.tagKey ? t(p.tagKey) : p.tag }}</span> }
              </div>
              <div class="p-2">
                <div class="prod-name">{{ t(p.name) }}</div>
                <div class="flex items-center justify-between gap-1 mt-1">
                  <span class="text-sm font-extrabold text-unrender-purple whitespace-nowrap">{{ i18n.money(p.price) }}</span>
                  <button type="button" class="add" (click)="add(p)" [disabled]="p.stock === 0" [attr.aria-label]="t('addToCart', { produto: t(p.name) })">
                    <i class="fa-solid fa-plus" aria-hidden="true"></i>
                  </button>
                </div>
                <div class="text-[10px] mt-0.5" [ngClass]="p.stock <= 3 ? 'text-red-600 font-semibold' : 'text-gray-500'">
                  {{ p.stock === 0 ? t('soldOut') : t('inStock', { n: p.stock }) }}
                </div>
              </div>
            </div>
            }
          </div>
        </div>

        <!-- gaveta do carrinho / checkout: o conteúdo permanece enquanto ela desliza para fora -->
        <div class="drawer" [class.open]="open" [attr.aria-hidden]="open ? null : 'true'" [attr.inert]="open ? null : ''">
          <div class="flex items-center justify-between mb-3">
            <strong class="text-unrender-purple">
              @switch (step) {
                @case ('cart') { {{ t('cartTitle') }} }
                @case ('pix') { {{ t('pixTitle') }} }
                @case ('paid') { {{ t('paidTitle') }} }
              }
            </strong>
            <button type="button" class="x" (click)="closeCart()" [attr.aria-label]="t('close')"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </div>

          @if (step === 'cart') {
          <div class="pane">
            @if (cart.length === 0) {
              <p class="text-sm text-gray-500 text-center py-8">{{ t('empty') }}</p>
            } @else {
              @for (l of cart; track l.product.id) {
              <div class="line">
                <div class="line-ico" [style.background]="'linear-gradient(135deg,' + l.product.from + ',' + l.product.to + ')'"><i [class]="l.product.icon" aria-hidden="true"></i></div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-semibold truncate">{{ t(l.product.name) }}</div>
                  <div class="text-[11px] text-gray-500">{{ t('qtyLine', { n: l.qty, preco: i18n.money(l.product.price) }) }}</div>
                </div>
                <div class="text-xs font-bold whitespace-nowrap">{{ i18n.money(l.qty * l.product.price) }}</div>
              </div>
              }
              <div class="flex justify-between text-xs text-gray-500 mt-3"><span>{{ t('shipping') }}</span><span class="text-emerald-600 font-semibold">{{ t('free') }}</span></div>
              <div class="flex justify-between font-extrabold text-unrender-purple mt-1 mb-4"><span>{{ t('total') }}</span><span>{{ i18n.money(total) }}</span></div>
              <button type="button" class="pay" (click)="checkout()"><i class="fa-brands fa-pix" aria-hidden="true"></i> {{ t('payPix') }}</button>
            }
          </div>
          }

          @if (step === 'pix') {
          <div class="pane text-center">
            <div class="qr mx-auto" role="img" [attr.aria-label]="t('qr')">
              @for (c of qr; track $index) { <span [class.b]="c"></span> }
            </div>
            <div class="text-xs text-gray-500 mt-3">{{ t('scan') }}</div>
            <div class="font-extrabold text-unrender-purple text-lg">{{ i18n.money(total) }}</div>
            <div class="waiting mt-3"><span class="spin"></span> {{ t('waiting', { n: pixSeconds }) }}</div>
          </div>
          }

          @if (step === 'paid') {
          <div class="pane text-center">
            <div class="paid-ico"><i class="fa-solid fa-check" aria-hidden="true"></i></div>
            <div class="font-bold text-gray-800">{{ t('paidMsg', { n: orderNo }) }}</div>
            <div class="text-[11px] text-gray-500 mb-4">{{ t('receipt') }}</div>
            <div class="timeline">
              @for (s of track; track s.label; let i = $index) {
              <div class="tl" [class.done]="i <= trackStep">
                <span class="tl-dot"><i [class]="s.icon" aria-hidden="true"></i></span><span>{{ t(s.label) }}</span>
              </div>
              }
            </div>
            <button type="button" class="again mt-4" (click)="reset()">{{ t('again') }}</button>
          </div>
          }
        </div>

        <div class="flyer" #flyer aria-hidden="true"><i [class]="flyIcon"></i></div>
      </div>
    </div>

    <!-- PAINEL DA LOJA (CTRLB) -->
    <div class="panel rounded-2xl p-4 text-white flex flex-col min-w-0">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-2 min-w-0">
          <img src="ctrlb-logo.png" alt="CTRLB" class="w-7 h-7 bg-white rounded-md p-0.5 object-contain shrink-0" />
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-widest text-unrender-accent font-bold">{{ t('panelTag') }}</div>
            <div class="text-sm font-bold leading-tight">{{ t('panelTitle') }}</div>
          </div>
        </div>
        <span class="live"><span class="ping"></span>{{ t('live') }}</span>
      </div>

      <div class="grid grid-cols-3 gap-2 mb-3">
        <div class="kpi"><span>{{ t('visitors') }}</span><strong>{{ i18n.number(visitors) }}</strong></div>
        <div class="kpi"><span>{{ t('orders') }}</span><strong>{{ i18n.number(orders) }}</strong></div>
        <div class="kpi"><span>{{ t('revenue') }}</span><strong>{{ i18n.money(revenue, 0) }}</strong></div>
      </div>

      <div class="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-2">{{ t('now') }}</div>
      <div class="feed flex-1" role="log" aria-live="off">
        @for (f of feed; track f.id) {
        <div class="feed-item">
          <span class="feed-ico" [style.background]="f.color"><i [class]="f.icon" aria-hidden="true"></i></span>
          <div class="flex-1 min-w-0 text-[12px] leading-snug">{{ t(f.key, f.params ? f.params() : undefined) }}</div>
          <span class="text-[10px] text-white/40 shrink-0">{{ time(f.at) }}</span>
        </div>
        }
      </div>

      <div class="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div class="pill"><i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i> <span>{{ t('pillStock') }}</span></div>
        <div class="pill"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> <span>{{ t('pillNotify') }}</span></div>
        <div class="pill"><i class="fa-solid fa-file-invoice" aria-hidden="true"></i> <span>{{ t('pillInvoice') }}</span></div>
        <div class="pill"><i class="fa-solid fa-magnifying-glass-chart" aria-hidden="true"></i> <span>{{ t('pillSeo') }}</span></div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    :host { display:block; min-width: 0; }
    .eco :focus-visible { outline: 2px solid #f99126; outline-offset: 2px; }
    .dot { width:9px; height:9px; border-radius:50%; display:inline-block; flex-shrink:0; }
    .dot.r { background:#ff5f57; } .dot.y { background:#febc2e; } .dot.g { background:#28c840; }
    .store-chrome { background:#f1f2f4; border-bottom:1px solid #e5e7eb; }
    .url { background:#fff; border-radius:999px; padding:3px 10px; font-size:11px; color:#777; font-family: ui-monospace, monospace; }
    .url b { color:#10051c; font-weight:600; }
    .demo-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color:#7a4a0c; background:#ffedd5; padding: 3px 7px; border-radius: 999px; white-space: nowrap; }
    @media (max-width: 420px) { .demo-badge { max-width: 96px; white-space: normal; line-height: 1.15; text-align: center; } }
    .store-head { border-bottom: 1px solid #f1f1f1; }
    .cart-btn { position:relative; width:44px; height:44px; border-radius:12px; background:#10051c; color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition: transform .2s; }
    .cart-btn:hover { transform: translateY(-1px); }
    .cart-btn:active { transform: scale(.94); }
    .cart-btn.bump { animation: ecoBump .45s; }
    @keyframes ecoBump { 30% { transform: scale(1.25) rotate(-8deg); } 60% { transform: scale(.95); } }
    .cart-count { position:absolute; top:-6px; right:-6px; min-width:18px; height:18px; border-radius:999px; background:#f99126; color:#10051c; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center; padding: 0 4px; transform: scale(0); opacity: 0; transition: transform .3s cubic-bezier(.2,1.6,.4,1), opacity .2s; }
    .cart-count.show { transform: scale(1); opacity: 1; }
    .cats { scrollbar-width: none; }
    .cats::-webkit-scrollbar { display:none; }
    .cat { min-height: 32px; padding:5px 12px; border-radius:999px; font-size:11px; font-weight:600; background:#f3f4f6; color:#555; white-space:nowrap; flex-shrink: 0; transition: background-color .2s, color .2s, transform .15s; }
    .cat:hover { background:#e5e7eb; }
    .cat:active { transform: scale(.95); }
    .cat.on { background:#10051c; color:#fff; }
    @media (pointer: coarse) { .cat { min-height: 44px; padding: 5px 14px; } }
    .prod { border:1px solid #f0f0f0; border-radius:14px; overflow:hidden; transition: transform .25s, box-shadow .25s; background:#fff; min-width: 0; animation: ecoIn .35s ease-out both; }
    .prod:hover { transform: translateY(-3px); box-shadow: 0 10px 22px rgba(16,5,28,.12); }
    .prod.flash { box-shadow: 0 0 0 3px #f99126; }
    .prod-img { position:relative; height: 82px; display:flex; align-items:center; justify-content:center; color:#fff; font-size: 34px; }
    .prod-img i { filter: drop-shadow(0 4px 8px rgba(0,0,0,.25)); transition: transform .3s; }
    .prod:hover .prod-img i { transform: scale(1.12) rotate(-6deg); }
    .prod-tag { position:absolute; top:6px; left:6px; font-size:9px; font-weight:800; background:#fff; color:#10051c; padding:2px 6px; border-radius:999px; }
    .prod-name { font-size: 12px; font-weight: 600; color:#1f2937; line-height: 1.25; min-height: 2.5em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
    .add { position:relative; width:32px; height:32px; border-radius:10px; background:#f99126; color:#10051c; font-size:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition: transform .15s; }
    /* área de toque de 44 px sem aumentar o botão */
    .add::before { content:''; position:absolute; inset:-6px; }
    .add:hover { transform: scale(1.1); }
    .add:active { transform: scale(.9); }
    .add:disabled { background:#e5e7eb; color:#aaa; }
    .drawer { position:absolute; top:0; right:0; bottom:0; width: min(100%, 300px); background:#fff; box-shadow: -12px 0 30px rgba(0,0,0,.12); padding: 16px; transform: translateX(105%); visibility: hidden; transition: transform .42s cubic-bezier(.2,.8,.2,1), visibility 0s linear .42s; overflow-y:auto; z-index: 3; }
    .drawer.open { transform: translateX(0); visibility: visible; transition: transform .42s cubic-bezier(.2,.8,.2,1), visibility 0s; }
    .x { width: 44px; height: 44px; margin: -12px -12px -12px 0; display:flex; align-items:center; justify-content:center; color:#9ca3af; border-radius: 50%; transition: color .2s, background-color .2s; }
    .x:hover { color:#374151; background:#f3f4f6; }
    .pane { animation: ecoIn .35s ease-out both; }
    .line { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px dashed #eee; animation: ecoIn .3s ease-out both; }
    .line-ico { width:34px; height:34px; border-radius:10px; color:#fff; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
    .pay { width:100%; min-height: 44px; padding:10px; border-radius:12px; background:#32bcad; color:#fff; font-weight:700; font-size:14px; display:flex; align-items:center; justify-content:center; gap:8px; transition: filter .2s, transform .15s; }
    .pay:hover { filter: brightness(1.08); }
    .pay:active { transform: scale(.97); }
    .qr { width: 132px; height: 132px; display:grid; grid-template-columns: repeat(21, 1fr); padding: 6px; background:#fff; border:2px solid #10051c; border-radius: 10px; }
    .qr span.b { background:#10051c; }
    .waiting { display:inline-flex; align-items:center; gap:8px; font-size:11px; color:#555; background:#f6f6f6; padding:5px 10px; border-radius:999px; }
    .spin { width:12px; height:12px; border:2px solid #ddd; border-top-color:#32bcad; border-radius:50%; animation: ecoSpin .8s linear infinite; flex-shrink:0; }
    @keyframes ecoSpin { to { transform: rotate(360deg); } }
    .paid-ico { width:56px; height:56px; margin: 6px auto 10px; border-radius:50%; background:#22c55e; color:#fff; display:flex; align-items:center; justify-content:center; font-size:24px; animation: ecoPop .5s cubic-bezier(.2,1.6,.4,1) both; }
    @keyframes ecoPop { from { transform: scale(0); } to { transform: scale(1); } }
    @keyframes ecoIn { from { opacity:0; transform: translateY(6px) scale(.98);} to { opacity:1; transform:none; } }
    .timeline { text-align:left; display:flex; flex-direction:column; gap:8px; }
    .tl { display:flex; align-items:center; gap:10px; font-size:12px; color:#9ca3af; transition: color .3s; }
    .tl-dot { width:26px; height:26px; border-radius:50%; background:#f1f1f1; display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; transition: background-color .3s, color .3s, transform .4s cubic-bezier(.2,1.6,.4,1); }
    .tl.done { color:#10051c; font-weight:600; }
    .tl.done .tl-dot { background:#f99126; color:#10051c; transform: scale(1.08); }
    .again { min-height: 44px; padding: 0 12px; font-size:12px; font-weight:700; color:#10051c; text-decoration: underline; }
    .flyer { position:absolute; left:0; top:0; z-index:10; width:34px; height:34px; border-radius:50%; background:#f99126; color:#10051c; display:flex; align-items:center; justify-content:center; pointer-events:none; opacity: 0; will-change: transform, opacity; }

    .panel { background: radial-gradient(130% 120% at 100% 0%, #2a1146 0%, #10051c 60%); border:1px solid rgba(249,145,38,.25); min-height: 420px; }
    .live { display:inline-flex; align-items:center; gap:6px; font-size:10px; font-weight:700; text-transform:uppercase; color:#86efac; background: rgba(34,197,94,.12); padding:3px 8px; border-radius:999px; white-space: nowrap; }
    .ping { position:relative; width:7px; height:7px; border-radius:50%; background:#22c55e; }
    .ping::after { content:''; position:absolute; inset:0; border-radius:50%; background:#22c55e; animation: ecoPing 1.6s ease-out infinite; }
    @keyframes ecoPing { 0% { transform: scale(1); opacity:.7; } 75%, 100% { transform: scale(2.6); opacity:0; } }
    .kpi { background: rgba(255,255,255,.06); border-radius:12px; padding:8px; min-width: 0; }
    .kpi span { display:block; font-size:10px; color: rgba(255,255,255,.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .kpi strong { display:block; font-size: 15px; color:#fff; white-space: nowrap; }
    .feed { display:flex; flex-direction:column; gap:6px; overflow:hidden; max-height: 250px;
      -webkit-mask-image: linear-gradient(#000 calc(100% - 30px), transparent); mask-image: linear-gradient(#000 calc(100% - 30px), transparent); }
    .feed-item { display:flex; align-items:center; gap:10px; background: rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.06); border-radius: 12px; padding: 8px 10px; flex-shrink: 0; animation: ecoFeed .45s ease-out; }
    @keyframes ecoFeed { from { opacity:0; transform: translateY(-10px) scale(.98); } to { opacity:1; transform:none; } }
    .feed-ico { width:26px; height:26px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:12px; color:#fff; flex-shrink:0; }
    .pill { display:flex; align-items:center; gap:6px; background: rgba(249,145,38,.1); border:1px solid rgba(249,145,38,.25); color: rgba(255,255,255,.85); border-radius: 10px; padding: 6px 8px; min-width: 0; }
    .pill span { min-width: 0; overflow-wrap: anywhere; line-height: 1.25; }
    .pill i { color:#f99126; flex-shrink:0; }
    @media (prefers-reduced-motion: reduce) {
      .prod, .pane, .line, .paid-ico, .feed-item, .cart-btn.bump, .ping::after { animation: none; }
      .drawer, .drawer.open, .prod, .cart-count, .tl-dot { transition: none; }
    }
  `],
})
export class EcommerceDemoComponent implements AfterViewInit, OnDestroy {
  @ViewChild('area') area?: ElementRef<HTMLElement>;
  @ViewChild('cartBtn') cartBtn?: ElementRef<HTMLElement>;
  @ViewChild('flyer') flyer?: ElementRef<HTMLElement>;

  readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  readonly t = this.i18n.scope(I18N);

  readonly cats: Cat[] = ['featured', 'fashion', 'electronics', 'home'];
  cat: Cat = 'featured';

  products: Product[] = [
    { id: 1, name: 'p_sneaker', price: 249.9, icon: 'fa-solid fa-shoe-prints', from: '#f99126', to: '#e2552b', stock: 8, cat: 'fashion', featured: true, tag: '-20%' },
    { id: 2, name: 'p_headphones', price: 159.9, icon: 'fa-solid fa-headphones', from: '#4b2a7a', to: '#10051c', stock: 5, cat: 'electronics', featured: true },
    { id: 3, name: 'p_watch', price: 399.0, icon: 'fa-solid fa-clock', from: '#0ea5e9', to: '#1e3a8a', stock: 3, cat: 'electronics', featured: true, tagKey: 'tagNew' },
    { id: 4, name: 'p_backpack', price: 189.9, icon: 'fa-solid fa-suitcase', from: '#22c55e', to: '#065f46', stock: 12, cat: 'fashion', featured: true },
    { id: 5, name: 'p_lamp', price: 129.9, icon: 'fa-solid fa-lightbulb', from: '#f59e0b', to: '#b45309', stock: 7, cat: 'home' },
    { id: 6, name: 'p_mugs', price: 79.9, icon: 'fa-solid fa-mug-hot', from: '#64748b', to: '#1e293b', stock: 9, cat: 'home' },
  ];

  readonly track: { label: EcoKey; icon: string }[] = [
    { label: 'tl_paid', icon: 'fa-solid fa-check' },
    { label: 'tl_picking', icon: 'fa-solid fa-box-open' },
    { label: 'tl_invoice', icon: 'fa-solid fa-file-invoice' },
    { label: 'tl_shipped', icon: 'fa-solid fa-truck-fast' },
  ];

  cart: CartLine[] = [];
  open = false;
  step: Step = 'cart';
  bump = false;
  flashId = 0;
  flyIcon = 'fa-solid fa-plus';
  qr: boolean[] = [];
  pixSeconds = 3;
  orderNo = 1042;
  trackStep = -1;

  visitors = 37;
  orders = 12;
  revenue = 3184;
  feed: FeedItem[] = [];

  private feedId = 0;
  /** timers do fluxo em andamento (carrinho, PIX, linha do tempo) */
  private timers: ReturnType<typeof setTimeout>[] = [];
  /** timers do modo vitrine (compra automática) */
  private autoTimers: ReturnType<typeof setTimeout>[] = [];
  private ambient: ReturnType<typeof setInterval> | undefined;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private auto = true;
  private visible = false;
  private reduced = false;
  private observer?: IntersectionObserver;

  constructor() {
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.push('fa-solid fa-eye', '#6366f1', 'f_view', () => ({ produto: this.t('p_watch') }));
    this.push('fa-brands fa-instagram', '#e1306c', 'f_insta');
  }

  get count(): number { return this.cart.reduce((a, l) => a + l.qty, 0); }
  get total(): number { return this.cart.reduce((a, l) => a + l.qty * l.product.price, 0); }
  get visibleProducts(): Product[] {
    return this.products.filter(p => (this.cat === 'featured' ? p.featured : p.cat === this.cat));
  }

  catLabel(c: Cat): string { return this.t(('c_' + c) as EcoKey); }
  time(d: Date): string { return this.i18n.date(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(es => {
      const v = es.some(e => e.isIntersecting);
      if (v === this.visible) return;
      this.visible = v;
      this.zone.run(() => {
        if (v) this.startLoops(); else this.stopLoops();
        this.cdr.markForCheck();
      });
    }, { threshold: 0.3 });
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void { this.stopLoops(); this.observer?.disconnect(); }

  /** O visitante assumiu: o modo vitrine para e só volta depois de um tempo sem interação. */
  userTouched() {
    this.auto = false;
    this.clearAuto();
    clearTimeout(this.idleTimer);
    if (!this.reduced) this.idleTimer = setTimeout(() => this.resumeAuto(), IDLE_MS);
  }

  add(p: Product) {
    if (p.stock === 0) return;
    const line = this.cart.find(l => l.product.id === p.id);
    if (line) line.qty++; else this.cart.push({ product: p, qty: 1 });
    this.flashId = p.id;
    this.fly(p);
    this.later(() => { this.bump = true; }, 550);
    this.later(() => { this.bump = false; this.flashId = 0; }, 1000);
    this.visitors++;
    this.push('fa-solid fa-cart-plus', '#f99126', 'f_add', () => ({ produto: this.t(p.name) }));
  }

  openCart() { this.open = true; }
  closeCart() {
    this.open = false;
    // pedido já concluído: limpa o carrinho só depois de a gaveta sair de cena
    if (this.step === 'paid') this.later(() => this.clearOrder(), DRAWER_MS);
  }

  checkout() {
    if (!this.cart.length) return;
    this.step = 'pix';
    this.qr = this.makeQr();
    this.pixSeconds = 3;
    const total = this.total;
    this.push('fa-brands fa-pix', '#32bcad', 'f_pix', () => ({ valor: this.i18n.money(total) }));
    for (let s = 1; s <= 3; s++) this.later(() => { this.pixSeconds = 3 - s; }, s * 1000);
    this.later(() => this.paid(), 3200);
  }

  reset() { this.closeCart(); }

  private clearOrder() {
    if (this.open) return;
    this.cart = [];
    this.step = 'cart';
    this.trackStep = -1;
  }

  private paid() {
    this.step = 'paid';
    this.orderNo++;
    this.orders++;
    const total = this.total;
    const n = this.orderNo;
    this.revenue += total;
    this.trackStep = 0;
    this.push('fa-solid fa-circle-check', '#22c55e', 'f_paid', () => ({ n, valor: this.i18n.money(total) }));
    this.cart.forEach(l => (l.product.stock = Math.max(0, l.product.stock - l.qty)));
    this.later(() => { this.trackStep = 1; this.push('fa-solid fa-boxes-stacked', '#0ea5e9', 'f_stock'); }, 1100);
    this.later(() => { this.trackStep = 2; this.push('fa-solid fa-file-invoice', '#a855f7', 'f_invoice', () => ({ n })); }, 2200);
    this.later(() => { this.trackStep = 3; this.push('fa-brands fa-whatsapp', '#25d366', 'f_notify'); }, 3300);
  }

  /** Bolinha que voa do produto até o carrinho (só transform/opacity, via Web Animations). */
  private fly(p: Product) {
    const area = this.area?.nativeElement;
    const btn = this.cartBtn?.nativeElement;
    const el = this.flyer?.nativeElement;
    const card = this.host.nativeElement.querySelector<HTMLElement>(`[data-pid="${p.id}"]`);
    if (this.reduced || !area || !btn || !el || !card || typeof el.animate !== 'function') return;
    const a = area.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const x0 = c.left - a.left + c.width / 2 - 17, y0 = c.top - a.top + 24;
    const x1 = b.left - a.left + b.width / 2 - 17, y1 = b.top - a.top + b.height / 2 - 17;
    this.flyIcon = p.icon;
    el.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${x0}px, ${y0 - 14}px) scale(1.1)`, opacity: 1, offset: 0.2 },
      { transform: `translate(${x1}px, ${y1}px) scale(.45)`, opacity: 0.9, offset: 0.92 },
      { transform: `translate(${x1}px, ${y1}px) scale(.2)`, opacity: 0 },
    ], { duration: 650, easing: 'cubic-bezier(.45,0,.3,1)' });
  }

  private startLoops() {
    this.stopLoops();
    if (this.reduced) return;
    // tráfego ambiente na loja
    this.ambient = setInterval(() => {
      this.visitors += 1 + Math.floor(Math.random() * 3);
      const pick = Math.floor(Math.random() * 4);
      if (pick === 0) this.push('fa-solid fa-eye', '#6366f1', 'f_google');
      else if (pick === 1) this.push('fa-solid fa-magnifying-glass', '#64748b', 'f_search');
      else if (pick === 2) this.push('fa-brands fa-whatsapp', '#25d366', 'f_ai');
      else this.push('fa-solid fa-heart', '#ef4444', 'f_fav', () => ({ produto: this.t('p_backpack') }));
      this.cdr.markForCheck();
    }, 4200);
    // voltou para a tela: recomeça o modo vitrine de um estado limpo
    this.resumeAuto(true);
  }

  private stopLoops() {
    clearInterval(this.ambient);
    clearTimeout(this.idleTimer);
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    this.clearAuto();
  }

  private clearAuto() {
    this.autoTimers.forEach(t => clearTimeout(t));
    this.autoTimers = [];
  }

  /** Retoma a compra automática: fecha a gaveta com a transição normal, limpa o pedido e recomeça. */
  private resumeAuto(force = false) {
    if (!this.visible || this.reduced) return;
    // pagamento em andamento iniciado pelo visitante: espera terminar
    if (!force && this.open && this.step === 'pix') { this.idleTimer = setTimeout(() => this.resumeAuto(), 4000); return; }
    this.auto = true;
    this.clearAuto();
    const wasOpen = this.open;
    this.open = false;
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    this.bump = false;
    this.flashId = 0;
    this.autoLater(() => { this.clearOrder(); this.autoBuy(); }, wasOpen ? DRAWER_MS : 0);
    this.cdr.markForCheck();
  }

  /** Um ciclo do modo vitrine: escolhe dois produtos, abre o carrinho, paga e recomeça. */
  private autoBuy() {
    if (!this.auto || !this.visible) return;
    this.cat = 'featured';
    this.products.forEach(p => { if (p.stock < 2) p.stock = 6 + Math.floor(Math.random() * 6); });
    this.autoLater(() => this.add(this.products[0]), 1800);
    this.autoLater(() => this.add(this.products[2]), 3000);
    this.autoLater(() => this.openCart(), 4300);
    this.autoLater(() => this.checkout(), 5800);
    // 5,8 s + PIX (3,2 s) + linha do tempo (3,3 s) + pausa para leitura
    this.autoLater(() => this.closeCart(), 15500);
    this.autoLater(() => this.autoBuy(), 18500);
  }

  private later(fn: () => void, ms: number) {
    this.timers.push(setTimeout(() => { fn(); this.cdr.markForCheck(); }, ms));
  }

  private autoLater(fn: () => void, ms: number) {
    this.autoTimers.push(setTimeout(() => { if (this.auto) { fn(); this.cdr.markForCheck(); } }, ms));
  }

  private push(icon: string, color: string, key: EcoKey, params?: () => Params) {
    this.feed = [{ id: ++this.feedId, icon, color, key, params, at: new Date() }, ...this.feed].slice(0, 6);
  }

  private makeQr(): boolean[] {
    const n = 21;
    const cells: boolean[] = [];
    const finder = (x: number, y: number) => {
      const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
      for (const [ox, oy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
        if (inBox(ox, oy)) {
          const dx = x - ox, dy = y - oy;
          return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
        }
      }
      return null;
    };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const f = finder(x, y);
      cells.push(f === null ? Math.random() > 0.52 : f);
    }
    return cells;
  }
}
