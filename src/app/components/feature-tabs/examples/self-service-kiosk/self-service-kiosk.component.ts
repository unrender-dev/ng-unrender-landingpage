import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowDown,
  faArrowLeft,
  faBacon,
  faBlender,
  faBolt,
  faBurger,
  faCamera,
  faCartShopping,
  faCheese,
  faCheck,
  faCircleCheck,
  faCookieBite,
  faCreditCard,
  faDownload,
  faDrumstickBite,
  faGlassWater,
  faHandPointer,
  faIceCream,
  faLemon,
  faMugHot,
  faPizzaSlice,
  faPlus,
  faPrint,
  faReceipt,
  faRotateRight,
  faSeedling,
  faUtensils,
  faVideo,
  faVideoSlash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { I18nService } from '../../../../i18n/i18n.service';
import { CameraService } from '../../../../services/camera.service';
import { ABORT, Showcase, Step } from '../hardware-demos/showcase';
import { ProdutosPosModalService } from '../../../../services/produtos-pos-modal.service';

/** Totem interativo da loja: o preço impresso na foto vem dele. */
const TOTEM_PRODUCT_ID = 'totem-interativo-55';
const TOTEM_FALLBACK = { price: 3199, installment: 299 };
import { I18N } from './self-service-kiosk.i18n';

type Key = keyof (typeof I18N)['pt'];
type Mode = 'food' | 'photo';
type OrderState = 'idle' | 'menu' | 'cart' | 'processing' | 'success';
/** idle → countdown → printing (sai pela fenda) → delivered (entregue, revelando) */
type PhotoState = 'idle' | 'countdown' | 'printing' | 'delivered';
type CategoryId = 'burgers' | 'pizza' | 'drinks' | 'desserts';

interface Product {
  id: number;
  category: CategoryId;
  name: Key;
  desc: Key;
  price: number;
  icon: IconDefinition;
}

interface CartItem extends Product {
  uid: number;
}

const CATEGORIES: { id: CategoryId; name: Key; icon: IconDefinition }[] = [
  { id: 'burgers', name: 'cBurgers', icon: faBurger },
  { id: 'pizza', name: 'cPizza', icon: faPizzaSlice },
  { id: 'drinks', name: 'cDrinks', icon: faMugHot },
  { id: 'desserts', name: 'cDesserts', icon: faIceCream },
];

const PRODUCTS: Product[] = [
  { id: 1, category: 'burgers', name: 'p1', desc: 'd1', price: 25.9, icon: faBacon },
  { id: 2, category: 'burgers', name: 'p2', desc: 'd2', price: 28.5, icon: faBurger },
  { id: 3, category: 'burgers', name: 'p3', desc: 'd3', price: 24, icon: faSeedling },
  { id: 4, category: 'burgers', name: 'p4', desc: 'd4', price: 22.9, icon: faDrumstickBite },
  { id: 5, category: 'pizza', name: 'p5', desc: 'd5', price: 35, icon: faPizzaSlice },
  { id: 6, category: 'pizza', name: 'p6', desc: 'd6', price: 32, icon: faCheese },
  { id: 7, category: 'drinks', name: 'p7', desc: 'd7', price: 6, icon: faGlassWater },
  { id: 8, category: 'drinks', name: 'p8', desc: 'd8', price: 8, icon: faLemon },
  { id: 9, category: 'drinks', name: 'p9', desc: 'd9', price: 15, icon: faBlender },
  { id: 10, category: 'desserts', name: 'p10', desc: 'd10', price: 12, icon: faIceCream },
  { id: 11, category: 'desserts', name: 'p11', desc: 'd11', price: 14.5, icon: faCookieBite },
];

/** Tempo que a foto leva para sair inteira pela fenda (igual à transição no SCSS). */
const EJECT_MS = 2700;
/** Tempo de avanço do comprovante (igual à transição no SCSS). */
const RECEIPT_MS = 2500;

@Component({
  selector: 'app-self-service-kiosk',
  standalone: true,
  imports: [FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './self-service-kiosk.component.html',
  styleUrls: ['./self-service-kiosk.component.scss'],
})
export class SelfServiceKioskComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly cameraService = inject(CameraService);
  private readonly posModal = inject(ProdutosPosModalService);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  @ViewChild('video') private videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('demo') private demoRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('polImg') private polImgRef?: ElementRef<HTMLImageElement>;

  readonly icons = {
    utensils: faUtensils, camera: faCamera, hand: faHandPointer, xmark: faXmark, cart: faCartShopping,
    back: faArrowLeft, card: faCreditCard, check: faCircleCheck, receipt: faReceipt, plus: faPlus,
    added: faCheck, print: faPrint, redo: faRotateRight, download: faDownload, bolt: faBolt,
    video: faVideo, videoOff: faVideoSlash, down: faArrowDown,
  };
  readonly categories = CATEGORIES;

  // ---- estado
  readonly mode = signal<Mode>('food');
  readonly state = signal<OrderState>('idle');
  readonly photoState = signal<PhotoState>('idle');
  readonly selectedCategory = signal<CategoryId>('burgers');
  readonly cart = signal<CartItem[]>([]);
  readonly orderNumber = signal(0);
  readonly countdown = signal(3);
  readonly flash = signal(false);
  readonly capturedPhoto = signal<string | null>(null);
  /** Comprovante: escondido dentro do totem → saindo pela fenda → destacado (cai). */
  readonly receipt = signal<'hidden' | 'printing' | 'cut'>('hidden');
  /** O comprovante terminou de sair: a tela passa a pedir para retirá-lo. */
  readonly receiptReady = signal(false);
  /** Foto: escondida → saindo pela fenda → apresentada na frente da tela → retirada. */
  readonly paper = signal<'hidden' | 'eject' | 'present' | 'exit'>('hidden');
  /** A foto já saiu inteira: deixa de ser recortada pela fenda (pode subir para a frente da tela). */
  readonly paperFree = signal(false);
  readonly cam = signal<'off' | 'starting' | 'on'>('off');
  readonly camError = signal<'denied' | 'unavailable' | null>(null);
  /** Alvo do "toque" simulado no modo vitrine. */
  readonly tapId = signal<string | null>(null);
  /** Produto recém-adicionado (confirmação visual no cartão). */
  readonly added = signal<number | null>(null);

  readonly total = computed(() => this.cart().reduce((sum, item) => sum + item.price, 0));
  readonly currentProducts = computed(() => PRODUCTS.filter((p) => p.category === this.selectedCategory()));
  readonly cartLabel = computed(() => {
    const n = this.cart().length;
    return n === 1 ? this.t('item1') : this.t('itemN', { n });
  });
  /** Tela visível: as telas ficam todas no DOM e trocam por transição. */
  readonly view = computed(() => {
    if (this.mode() === 'food') return this.state();
    const s = this.photoState();
    return s === 'printing' || s === 'delivered' ? 'print' : 'photo';
  });

  /** Texto comercial impresso no rodapé da foto. */
  get polaroidOfferText(): string {
    // Espaço fino (U+202F) do separador de milhar em francês não existe na fonte: usa o comum.
    const money = (value: number) => this.i18n.money(value, 0).replace(/\u202f/g, '\u00a0');
    // Preço do totem vem do catálogo da loja (sincronizado com o SGA CTRLB); os valores
    // fixos só valem enquanto o catálogo não tem o produto.
    const totem = this.posModal.produtoPorId(TOTEM_PRODUCT_ID);
    const price = totem?.priceSaleNumeric || TOTEM_FALLBACK.price;
    const installment = totem?.priceRentNumeric || TOTEM_FALLBACK.installment;
    return this.t('offer', { price: money(price), installment: money(installment) });
  }

  private readonly showcase = new Showcase(
    this.host.nativeElement,
    10000,
    // Não retoma no meio de um fluxo, nem enquanto alguém usa a própria câmera.
    () => !this.flowBusy && (this.cam() === 'off' || Date.now() - this.lastTouch > 30000),
  );
  private flowToken = 0;
  private flowBusy = false;
  private lastTouch = 0;
  private uid = 0;
  private cameraOwned = false;
  private timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    // O texto da cena de demonstração é desenhado em canvas: redesenha na troca de idioma.
    effect(() => {
      this.i18n.lang();
      this.renderPreview();
    });
  }

  ngAfterViewInit(): void {
    this.renderPreview();
    this.showcase.start((step) => this.attract(step));
  }

  ngOnDestroy(): void {
    this.showcase.destroy();
    for (const timer of this.timers) clearTimeout(timer);
    this.stopCamera();
  }

  /** Encerra o modo vitrine (usado nos testes). */
  stopShowcase(): void {
    this.showcase.disable();
  }

  // ---------------------------------------------------------------- interação

  onTouch(): void {
    this.lastTouch = Date.now();
    this.tapId.set(null);
    this.showcase.interrupt();
  }

  setMode(mode: Mode): void {
    if (mode === this.mode()) return;
    this.abortFlows();
    this.mode.set(mode);
    if (mode === 'photo') {
      this.photoState.set('idle');
      this.capturedPhoto.set(null);
    } else {
      this.stopCamera();
      this.photoState.set('idle');
    }
  }

  // ---- pedidos

  startOrder(): void {
    this.state.set('menu');
    this.selectedCategory.set('burgers');
    this.cart.set([]);
  }

  cancelOrder(): void {
    this.state.set('idle');
    this.later(450, () => this.state() === 'idle' && this.cart.set([]));
  }

  selectCategory(id: CategoryId): void {
    this.selectedCategory.set(id);
  }

  addToCart(product: Product): void {
    this.cart.update((cart) => [...cart, { ...product, uid: ++this.uid }]);
    this.added.set(product.id);
    this.later(650, () => this.added() === product.id && this.added.set(null));
  }

  removeFromCart(uid: number): void {
    this.cart.update((cart) => cart.filter((item) => item.uid !== uid));
  }

  viewCart(): void {
    if (this.cart().length) this.state.set('cart');
  }

  backToMenu(): void {
    this.state.set('menu');
  }

  checkout(): void {
    if (!this.cart().length || this.flowBusy) return;
    void this.showcase.guard(() => this.checkoutFlow());
  }

  // ---- fotos

  startCountdown(): void {
    if (this.flowBusy || this.photoState() !== 'idle') return;
    void this.showcase.guard(() => this.photoFlow());
  }

  /** Tira a foto na hora (sem contagem) e imprime. */
  capturePhoto(): void {
    if (this.flowBusy) return;
    void this.showcase.guard(() => this.photoFlow(false));
  }

  simulatePrintAgain(): void {
    if (!this.capturedPhoto() || this.flowBusy) return;
    void this.showcase.guard(() =>
      this.flow(async (wait) => {
        this.paper.set('exit');
        await wait(520);
        await this.printPhoto(wait);
      }),
    );
  }

  retakePhoto(): void {
    if (this.flowBusy) return;
    void this.showcase.guard(() => this.dismissPhoto());
  }

  savePhoto(): void {
    const data = this.composePolaroid();
    if (!data) return;
    const link = document.createElement('a');
    link.href = data;
    link.download = `totem-foto-${Date.now()}.png`;
    link.click();
  }

  /** Câmera real só com gesto do usuário; sem ela, a foto usa a cena de demonstração. */
  async toggleCamera(): Promise<void> {
    if (this.cam() !== 'off') {
      this.stopCamera();
      return;
    }
    this.cam.set('starting');
    this.camError.set(null);
    try {
      const stream = await this.cameraService.startCamera();
      this.cameraOwned = true;
      if (this.mode() !== 'photo') {
        this.stopCamera();
        return;
      }
      const video = this.videoRef?.nativeElement;
      if (video) {
        video.srcObject = stream;
        void video.play?.().catch(() => {});
      }
      this.cam.set('on');
    } catch (err) {
      const name = (err as { name?: string } | null)?.name ?? '';
      this.cam.set('off');
      this.camError.set(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
      this.later(7000, () => this.camError.set(null));
    }
  }

  // ---------------------------------------------------------------- fluxos

  /** Roda um fluxo com pausas que só caem se o modo mudar ou o componente for destruído. */
  private async flow(run: (wait: (ms: number) => Promise<void>) => Promise<void>): Promise<void> {
    const token = ++this.flowToken;
    this.flowBusy = true;
    const wait = async (ms: number) => {
      await this.showcase.wait(ms);
      if (token !== this.flowToken) throw ABORT;
    };
    try {
      await run(wait);
    } finally {
      if (token === this.flowToken) this.flowBusy = false;
    }
  }

  private abortFlows(): void {
    this.flowToken++;
    this.flowBusy = false;
    this.flash.set(false);
    // Papel que estava na saída é retirado com animação, não some de repente.
    if (this.receipt() !== 'hidden') {
      this.receipt.set('cut');
      this.later(760, () => this.receipt.set('hidden'));
    }
    if (this.paper() !== 'hidden') {
      this.paper.set('exit');
      this.later(520, () => this.paper.set('hidden'));
    }
    if (this.state() === 'processing' || this.state() === 'success') {
      this.state.set('idle');
      this.cart.set([]);
    }
  }

  /** Pagamento → confirmação → comprovante sai pela fenda → é destacado → volta ao início. */
  private checkoutFlow(): Promise<void> {
    return this.flow(async (wait) => {
      this.state.set('processing');
      await wait(1900);
      this.orderNumber.set(1000 + Math.floor(Math.random() * 1000));
      this.state.set('success');
      await wait(550);
      this.receiptReady.set(false);
      this.receipt.set('printing');
      await wait(RECEIPT_MS);
      this.receiptReady.set(true);
      await wait(1700);
      this.receipt.set('cut');
      await wait(760);
      this.receipt.set('hidden');
      await wait(450);
      this.state.set('idle');
      await wait(450);
      this.cart.set([]);
      this.receiptReady.set(false);
    });
  }

  /** Contagem → flash → a foto sai pela fenda → é entregue na frente da tela. */
  private photoFlow(countdown = true): Promise<void> {
    return this.flow(async (wait) => {
      if (countdown) {
        this.photoState.set('countdown');
        for (const n of [3, 2, 1]) {
          this.countdown.set(n);
          await wait(900);
        }
      }
      this.capture();
      this.flash.set(true);
      await wait(280);
      this.flash.set(false);
      await this.printPhoto(wait);
    });
  }

  private async printPhoto(wait: (ms: number) => Promise<void>): Promise<void> {
    this.paper.set('hidden');
    this.paperFree.set(false);
    this.photoState.set('printing');
    await wait(80);
    this.paper.set('eject');
    await wait(EJECT_MS + 250);
    this.paperFree.set(true);
    this.paper.set('present');
    this.photoState.set('delivered');
    await wait(900);
  }

  /** A foto é "levada" (sai com movimento) e a cabine volta a ficar pronta. */
  private dismissPhoto(): Promise<void> {
    return this.flow(async (wait) => {
      this.paper.set('exit');
      await wait(520);
      this.paper.set('hidden');
      this.photoState.set('idle');
      await wait(450);
      this.capturedPhoto.set(null);
    });
  }

  // ---------------------------------------------------------------- vitrine

  /** Roteiro em loop: um pedido completo, depois uma foto, e volta ao início. */
  private async attract(step: Step): Promise<void> {
    await this.settle(step);
    await step(2200);

    await this.tap('start', step);
    this.startOrder();
    await step(1000);
    await this.tap('p1', step);
    this.addToCart(PRODUCTS[0]);
    await step(900);
    await this.tap('cat-drinks', step);
    this.selectCategory('drinks');
    await step(900);
    await this.tap('p9', step);
    this.addToCart(PRODUCTS[8]);
    await step(1000);
    await this.tap('view-cart', step);
    this.viewCart();
    await step(1600);
    await this.tap('pay', step);
    await this.checkoutFlow();
    await step(1500);

    await this.tap('mode-photo', step);
    this.setMode('photo');
    await step(1700);
    await this.tap('snap', step);
    await this.photoFlow();
    await step(5600);
    await this.dismissPhoto();
    await step(500);
    await this.tap('mode-food', step);
    this.setMode('food');
    await step(600);
  }

  /** Volta ao ponto de partida do roteiro, sempre com as transições das telas. */
  private async settle(step: Step): Promise<void> {
    if (this.mode() === 'photo') {
      if (this.paper() !== 'hidden') await this.dismissPhoto();
      this.setMode('food');
      await step(600);
    }
    if (this.state() !== 'idle') {
      this.state.set('idle');
      await step(500);
    }
    this.cart.set([]);
    this.selectedCategory.set('burgers');
  }

  private async tap(id: string, step: Step): Promise<void> {
    this.tapId.set(id);
    await step(460);
    this.tapId.set(null);
  }

  // ---------------------------------------------------------------- câmera e imagem

  private stopCamera(): void {
    const video = this.videoRef?.nativeElement;
    if (video) video.srcObject = null;
    if (this.cameraOwned) this.cameraService.stopCamera();
    this.cameraOwned = false;
    this.cam.set('off');
  }

  private capture(): void {
    const size = 540;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const video = this.videoRef?.nativeElement;
    if (this.cam() === 'on' && video && video.videoWidth > 0) {
      // Recorte quadrado central, espelhado como no visor.
      const side = Math.min(video.videoWidth, video.videoHeight);
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, size, size);
    } else {
      this.drawDemo(ctx, size, size);
    }
    this.capturedPhoto.set(canvas.toDataURL('image/jpeg', 0.9));
  }

  private renderPreview(): void {
    const canvas = this.demoRef?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) this.drawDemo(ctx, canvas.width, canvas.height);
  }

  /** Cena de demonstração (duas pessoas em festa), desenhada em código e rotulada como tal. */
  private drawDemo(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#3a1d5c');
    bg.addColorStop(1, '#10051c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Luzes de festa: posições fixas (a foto sai igual ao visor).
    const lights = [[0.12, 0.14, 0.05], [0.82, 0.1, 0.07], [0.3, 0.07, 0.03], [0.62, 0.2, 0.04], [0.93, 0.34, 0.035], [0.06, 0.4, 0.045]];
    for (const [x, y, r] of lights) {
      ctx.fillStyle = 'rgba(249, 145, 38, 0.32)';
      ctx.beginPath();
      ctx.arc(x * w, y * h, r * w, 0, Math.PI * 2);
      ctx.fill();
    }

    const person = (cx: number, top: number, scale: number, color: string) => {
      const r = 0.105 * w * scale;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx * w, top * h + r, r, 0, Math.PI * 2);
      ctx.fill();
      // Sorriso
      ctx.strokeStyle = 'rgba(16, 5, 28, 0.55)';
      ctx.lineWidth = r * 0.12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx * w, top * h + r * 1.05, r * 0.45, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.beginPath();
      const sw = r * 3.3;
      const sy = top * h + r * 2.25;
      ctx.moveTo(cx * w - sw / 2, h);
      ctx.lineTo(cx * w - sw / 2, sy + r);
      ctx.quadraticCurveTo(cx * w - sw / 2, sy, cx * w - sw / 2 + r, sy);
      ctx.lineTo(cx * w + sw / 2 - r, sy);
      ctx.quadraticCurveTo(cx * w + sw / 2, sy, cx * w + sw / 2, sy + r);
      ctx.lineTo(cx * w + sw / 2, h);
      ctx.closePath();
      ctx.fill();
    };
    const base = h > w ? 0.36 : 0.3;
    person(0.66, base + 0.03, 0.92, '#ffd2a1');
    person(0.36, base, 1, '#f99126');

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `600 ${Math.round(w * 0.04)}px Montserrat, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(this.t('demoPhoto'), w / 2, h * (h > w ? 0.27 : 0.12));
  }

  /** Monta a foto com moldura e rodapé no idioma atual (arquivo de "Salvar foto"). */
  private composePolaroid(): string | null {
    // Usa a imagem já decodificada que está na foto em tela.
    const img = this.polImgRef?.nativeElement;
    if (!this.capturedPhoto()) return null;
    const w = 600;
    const h = 740;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    try {
      if (img) ctx.drawImage(img, 30, 30, 540, 540);
    } catch {
      // Imagem ainda não decodificada: o arquivo sai só com a moldura e o rodapé.
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#71717a';
    ctx.font = '700 14px Montserrat, Arial, sans-serif';
    ctx.fillText(this.t('polTag').toUpperCase(), w / 2, 612);
    ctx.fillStyle = '#10051c';
    ctx.font = '700 17px Montserrat, Arial, sans-serif';
    ctx.fillText(this.polaroidOfferText, w / 2, 650, w - 60);
    ctx.fillStyle = '#c2640a';
    ctx.font = '600 13px Montserrat, Arial, sans-serif';
    ctx.fillText(this.t('polPerks'), w / 2, 684, w - 60);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '12px Montserrat, Arial, sans-serif';
    ctx.fillText('unrender.dev  ·  unrender.games', w / 2, 712);
    return canvas.toDataURL('image/png');
  }

  private later(ms: number, fn: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    this.timers.add(timer);
  }
}
