import { AfterViewInit, ChangeDetectorRef, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';
import { I18nService, Params } from '../../../../i18n/i18n.service';
import { Showcase } from './showcase';

export type SaleState = 'synced' | 'pending' | 'syncing';
export type SaleCategory = 'planos' | 'produtos' | 'servicos';
export type ToastType = 'info' | 'warning' | 'success';

/** Catálogo fictício da demonstração; o nome de cada item é traduzido no template pela chave. */
export const CATALOG = [
  { key: 'pQuarterly', category: 'planos', amount: 269.7 },
  { key: 'pWhey', category: 'produtos', amount: 214 },
  { key: 'pMonthly', category: 'planos', amount: 89.9 },
  { key: 'pKit', category: 'produtos', amount: 125 },
  { key: 'pAnnual', category: 'planos', amount: 899 },
  { key: 'pCreatine', category: 'produtos', amount: 139.9 },
  { key: 'pDayPass', category: 'servicos', amount: 75 },
  { key: 'pShirt', category: 'produtos', amount: 89 },
  { key: 'pAssessment', category: 'servicos', amount: 60 },
  { key: 'pPilates', category: 'planos', amount: 160 },
] as const satisfies ReadonlyArray<{ key: string; category: SaleCategory; amount: number }>;

export type ProductKey = (typeof CATALOG)[number]['key'];
export type PaymentKey = 'payCredit' | 'payPix' | 'payDebit' | 'payCash';

/** Chaves de aviso que os dois dicionários (celular e PC) precisam ter. */
export type ToastKey =
  | 'tInstalled'
  | 'tOffline'
  | 'tStillOffline'
  | 'tOnline'
  | 'tSavedLocal'
  | 'tSavedCloud'
  | 'tSyncingOne'
  | 'tSyncingMany'
  | 'tSyncedOne'
  | 'tSyncedMany'
  | 'tSyncCut';
export type NoticeKey = 'nSyncedOne' | 'nSyncedMany' | 'nNewOrder';

export interface DemoSale {
  id: number;
  client: string;
  product: ProductKey;
  category: SaleCategory;
  payment: PaymentKey;
  amount: number;
  at: Date;
  state: SaleState;
  /** Venda inicial da cena (as demais saem com animação quando o ciclo recomeça). */
  seed: boolean;
  leaving: boolean;
}

export interface DemoToast {
  key: ToastKey;
  type: ToastType;
  params?: Params;
}
export interface DemoNotice {
  key: NoticeKey;
  params?: Params;
}

/** Nomes de produto e formas de pagamento, iguais nas duas demos (celular e PC). */
export const SALES_I18N = {
  pt: {
    pQuarterly: 'Plano trimestral',
    pWhey: '2× whey isolado 900 g',
    pMonthly: 'Mensalidade plano Pro',
    pKit: 'Kit treino e squeeze',
    pAnnual: 'Plano anual VIP',
    pCreatine: 'Creatina 300 g + coqueteleira',
    pDayPass: '3× diária avulsa',
    pShirt: 'Camiseta dry-fit',
    pAssessment: 'Avaliação física',
    pPilates: 'Mensalidade de pilates',
    payCredit: 'Crédito',
    payPix: 'PIX',
    payDebit: 'Débito',
    payCash: 'Dinheiro',
  },
  en: {
    pQuarterly: 'Quarterly plan',
    pWhey: '2× whey isolate 900 g',
    pMonthly: 'Pro plan monthly fee',
    pKit: 'Training kit and bottle',
    pAnnual: 'VIP annual plan',
    pCreatine: 'Creatine 300 g + shaker',
    pDayPass: '3× day pass',
    pShirt: 'Dry-fit T-shirt',
    pAssessment: 'Fitness assessment',
    pPilates: 'Pilates monthly fee',
    payCredit: 'Credit',
    payPix: 'PIX',
    payDebit: 'Debit',
    payCash: 'Cash',
  },
  es: {
    pQuarterly: 'Plan trimestral',
    pWhey: '2× whey aislado 900 g',
    pMonthly: 'Mensualidad plan Pro',
    pKit: 'Kit de entrenamiento y botella',
    pAnnual: 'Plan anual VIP',
    pCreatine: 'Creatina 300 g + mezclador',
    pDayPass: '3× pase diario',
    pShirt: 'Camiseta dry-fit',
    pAssessment: 'Evaluación física',
    pPilates: 'Mensualidad de pilates',
    payCredit: 'Crédito',
    payPix: 'PIX',
    payDebit: 'Débito',
    payCash: 'Efectivo',
  },
  fr: {
    pQuarterly: 'Abonnement trimestriel',
    pWhey: '2× whey isolat 900 g',
    pMonthly: 'Mensualité formule Pro',
    pKit: 'Kit d’entraînement et gourde',
    pAnnual: 'Abonnement annuel VIP',
    pCreatine: 'Créatine 300 g + shaker',
    pDayPass: '3× entrée à la journée',
    pShirt: 'T-shirt dry-fit',
    pAssessment: 'Bilan de forme',
    pPilates: 'Mensualité de pilates',
    payCredit: 'Crédit',
    payPix: 'PIX',
    payDebit: 'Débit',
    payCash: 'Espèces',
  },
} as const;

const SEED_CLIENTS = ['Camila Duarte', 'Marcos Vinícius', 'Larissa Ferreira', 'Roberto Albuquerque'];
const SEED_TIMES: ReadonlyArray<readonly [number, number]> = [[16, 48], [16, 32], [16, 15], [15, 54]];
const NEW_CLIENTS = ['Eduardo Martins', 'Tatiane Ribeiro', 'Rodrigo Brandão', 'Beatriz Fonseca', 'Guilherme Siqueira', 'Vanessa Silveira'];
const PAYMENTS: readonly PaymentKey[] = ['payCredit', 'payPix', 'payDebit', 'payCash'];

const SYNC_MS = 1700;
const LEAVE_MS = 520;
const REWIND_MS = 1100;

/**
 * Lógica comum das duas demonstrações de venda offline (PWA no celular e PWA no PC):
 * instalar → ficar sem internet → vender → sincronizar. Não existe captura real do
 * PDV do SGA CTRLB, por isso a cena é uma demonstração interativa com dados fictícios.
 */
@Directive()
export abstract class OfflineSalesBase implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  protected readonly cdr = inject(ChangeDetectorRef);
  protected readonly zone = inject(NgZone);
  private readonly hostEl: HTMLElement = inject(ElementRef).nativeElement;

  /** Quantas vendas a cena tem no início e o número do pedido mais recente. */
  protected abstract readonly seedSize: number;
  protected abstract readonly firstId: number;

  readonly showcase = new Showcase(this.hostEl, this.zone, {
    play: () => this.play(),
    rewind: () => this.rewind(),
    changed: () => this.cdr.markForCheck(),
  });

  installed = this.showcase.reduced;
  installing = false;
  offline = false;
  syncing = false;
  activeStep = 0;
  sales: DemoSale[] = [];
  /** Total animado (não "pula" quando uma venda entra ou o ciclo recomeça). */
  displayTotal = 0;
  toast: DemoToast | null = null;
  toastShown = false;
  notice: DemoNotice | null = null;
  noticeShown = false;
  lastSync = new Date();
  now = new Date();

  private nextId = 0;
  private fxTimers = new Set<number>();
  private syncTimer = 0;
  private toastTimer = 0;
  private noticeTimer = 0;
  private totalRaf = 0;
  private destroyed = false;
  private ready = false;

  get pendingCount(): number {
    return this.sales.filter((s) => s.state === 'pending' && !s.leaving).length;
  }
  get syncingCount(): number {
    return this.sales.filter((s) => s.state === 'syncing' && !s.leaving).length;
  }
  get syncedCount(): number {
    return this.sales.filter((s) => s.state === 'synced' && !s.leaving).length;
  }
  get saleCount(): number {
    return this.sales.filter((s) => !s.leaving).length;
  }
  get total(): number {
    return this.sales.reduce((sum, s) => (s.leaving ? sum : sum + s.amount), 0);
  }
  get autoplay(): boolean {
    return this.showcase.autoplay;
  }
  get toastIcon(): string {
    if (this.toast?.type === 'warning') return 'fa-solid fa-triangle-exclamation';
    if (this.toast?.type === 'success') return 'fa-solid fa-circle-check';
    return 'fa-solid fa-circle-info';
  }

  /** Hora no padrão do idioma atual. */
  time(d: Date): string {
    return this.i18n.date(d, { hour: '2-digit', minute: '2-digit' });
  }

  /** Chamado pelo construtor da subclasse, depois que `seedSize`/`firstId` existem. */
  protected init(): void {
    this.sales = this.buildSeed();
    this.nextId = this.firstId + 1;
    this.displayTotal = this.total;
    this.ready = true;
  }

  ngAfterViewInit(): void {
    this.showcase.attach();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.showcase.destroy();
    this.clearFx();
    if (this.totalRaf) cancelAnimationFrame(this.totalRaf);
  }

  // ---------- ações da pessoa ----------

  install(): void {
    this.showcase.interact();
    this.pressInstall();
    this.fx(420, () => this.finishInstall());
  }

  toggleOffline(manual = true): void {
    if (manual) this.showcase.interact();
    this.ensureInstalled();
    this.setOffline(!this.offline);
  }

  addSale(manual = true): void {
    if (manual) this.showcase.interact();
    this.ensureInstalled();
    this.pushSale();
  }

  sendNotice(manual = true): void {
    if (manual) this.showcase.interact();
    this.ensureInstalled();
    this.activeStep = 3;
    this.showNotice('nNewOrder', { id: this.nextId - 1 });
  }

  /** Clique em um dos quatro passos: mostra aquela etapa, sem depender do que veio antes. */
  selectStep(index: number): void {
    this.showcase.interact();
    if (index === 0) {
      this.cancelSync();
      this.offline = false;
      this.installed = false;
      this.installing = false;
      this.activeStep = 0;
      this.hideToast();
      if (!this.showcase.reduced) {
        this.fx(1100, () => this.pressInstall());
        this.fx(1520, () => this.finishInstall());
      }
      return;
    }
    this.ensureInstalled();
    if (index === 1) {
      if (this.offline) this.showToast('tStillOffline', 'warning');
      else this.setOffline(true);
    } else if (index === 2) {
      if (!this.offline) {
        this.cancelSync();
        this.offline = true;
      }
      this.pushSale();
    } else {
      if (this.pendingCount === 0 && !this.syncing) {
        this.offline = true;
        this.pushSale();
      }
      if (this.offline) this.setOffline(false);
      else if (!this.syncing) this.sync();
    }
    this.activeStep = index;
  }

  restart(): void {
    this.showcase.restart();
  }

  /** Para o roteiro e todos os temporizadores (usado nos testes). */
  stopAutoPlay(): void {
    this.showcase.stop();
    this.clearFx();
    if (this.totalRaf) cancelAnimationFrame(this.totalRaf);
    this.totalRaf = 0;
    this.displayTotal = this.total;
  }

  // ---------- roteiro do modo vitrine ----------

  private play(): void {
    this.showcase.seq([
      [1500, () => this.pressInstall()],
      [450, () => this.finishInstall()],
      [2600, () => this.setOffline(true)],
      [2400, () => this.pushSale()],
      [2300, () => this.pushSale()],
      [2800, () => this.setOffline(false)],
      [SYNC_MS + 5200, () => this.showcase.loop()],
    ]);
  }

  /** Volta ao início com animação: as vendas da rodada recolhem e o convite de instalação reaparece. */
  private rewind(): number {
    if (!this.ready) return 0;
    this.clearFx();
    this.hideToast();
    this.noticeShown = false;
    this.offline = false;
    this.syncing = false;
    this.installing = false;
    this.activeStep = 0;
    this.installed = this.showcase.reduced;
    let extras = 0;
    for (const s of this.sales) {
      if (s.seed) s.state = 'synced';
      else {
        s.leaving = true;
        extras++;
      }
    }
    this.onRewind();
    this.tweenTotal();
    if (extras) {
      this.fx(LEAVE_MS, () => {
        this.sales = this.sales.filter((s) => s.seed);
        this.nextId = this.firstId + 1;
      });
    } else {
      this.nextId = this.firstId + 1;
    }
    return REWIND_MS;
  }

  /** Gancho para a subclasse desfazer o que é só dela (filtro de categoria etc.). */
  protected onRewind(): void {}

  // ---------- estado ----------

  private pressInstall(): void {
    if (this.installed) return;
    this.installing = true;
  }

  private finishInstall(): void {
    if (this.installed) return;
    this.installing = false;
    this.installed = true;
    this.activeStep = 0;
    this.showToast('tInstalled', 'success');
  }

  private ensureInstalled(): void {
    this.installing = false;
    this.installed = true;
  }

  private setOffline(off: boolean): void {
    if (this.offline === off) return;
    this.offline = off;
    this.now = new Date();
    if (off) {
      this.activeStep = 1;
      // Caiu no meio do envio: nada se perde, as vendas voltam para a fila do aparelho.
      const cut = this.cancelSync();
      if (cut) this.showToast('tSyncCut', 'warning', { n: cut });
      else this.showToast('tOffline', 'warning');
    } else if (this.pendingCount > 0) {
      this.activeStep = 3;
      this.sync();
    } else {
      this.showToast('tOnline', 'success');
    }
  }

  private sync(): void {
    const batch = this.sales.filter((s) => s.state === 'pending' && !s.leaving);
    const n = batch.length;
    if (!n) {
      this.showToast('tOnline', 'success');
      return;
    }
    batch.forEach((s) => (s.state = 'syncing'));
    this.syncing = true;
    this.showToast(n === 1 ? 'tSyncingOne' : 'tSyncingMany', 'info', { n });
    this.syncTimer = this.fx(SYNC_MS, () => {
      this.syncTimer = 0;
      this.syncing = false;
      batch.forEach((s) => (s.state = 'synced'));
      this.lastSync = new Date();
      this.showToast(n === 1 ? 'tSyncedOne' : 'tSyncedMany', 'success', { n });
      this.showNotice(n === 1 ? 'nSyncedOne' : 'nSyncedMany', { n });
    });
  }

  /** Interrompe um envio em andamento; devolve quantas vendas voltaram para "pendente". */
  private cancelSync(): number {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.fxTimers.delete(this.syncTimer);
      this.syncTimer = 0;
    }
    this.syncing = false;
    const inFlight = this.sales.filter((s) => s.state === 'syncing');
    inFlight.forEach((s) => (s.state = 'pending'));
    return inFlight.length;
  }

  private pushSale(): void {
    const id = this.nextId++;
    const item = CATALOG[(id + 4) % CATALOG.length];
    this.now = new Date();
    const sale: DemoSale = {
      id,
      client: NEW_CLIENTS[id % NEW_CLIENTS.length],
      product: item.key,
      category: item.category,
      payment: PAYMENTS[id % PAYMENTS.length],
      amount: item.amount,
      at: this.now,
      state: this.offline ? 'pending' : 'synced',
      seed: false,
      leaving: false,
    };
    // Mantém as vendas iniciais sempre na lista: o excesso sai pelas mais antigas da rodada.
    const next = [sale, ...this.sales];
    const extras = next.filter((s) => !s.seed);
    this.sales = extras.length > 5 ? next.filter((s) => s !== extras[extras.length - 1]) : next;
    if (this.offline) {
      this.activeStep = 2;
      this.showToast('tSavedLocal', 'warning', { id });
    } else {
      this.showToast('tSavedCloud', 'success', { id });
    }
    this.tweenTotal();
  }

  private buildSeed(): DemoSale[] {
    const day = new Date();
    return Array.from({ length: this.seedSize }, (_, i) => {
      const item = CATALOG[i % CATALOG.length];
      const [h, m] = SEED_TIMES[i % SEED_TIMES.length];
      return {
        id: this.firstId - i,
        client: SEED_CLIENTS[i % SEED_CLIENTS.length],
        product: item.key,
        category: item.category,
        payment: PAYMENTS[i % PAYMENTS.length],
        amount: item.amount,
        at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m),
        state: 'synced' as const,
        seed: true,
        leaving: false,
      };
    });
  }

  // ---------- avisos ----------

  private showToast(key: ToastKey, type: ToastType, params?: Params): void {
    this.dropTimer(this.toastTimer);
    this.toast = { key, type, params };
    this.toastShown = true;
    this.toastTimer = this.fx(3000, () => {
      this.toastTimer = 0;
      this.toastShown = false;
    });
  }

  private hideToast(): void {
    this.dropTimer(this.toastTimer);
    this.toastTimer = 0;
    this.toastShown = false;
  }

  private showNotice(key: NoticeKey, params?: Params): void {
    this.dropTimer(this.noticeTimer);
    this.notice = { key, params };
    this.noticeShown = true;
    this.noticeTimer = this.fx(4200, () => {
      this.noticeTimer = 0;
      this.noticeShown = false;
    });
  }

  // ---------- temporizadores ----------

  private fx(ms: number, fn: () => void): number {
    const id = window.setTimeout(() => {
      this.fxTimers.delete(id);
      if (this.destroyed) return;
      fn();
      this.cdr.markForCheck();
    }, ms);
    this.fxTimers.add(id);
    return id;
  }

  private dropTimer(id: number): void {
    if (!id) return;
    clearTimeout(id);
    this.fxTimers.delete(id);
  }

  private clearFx(): void {
    this.fxTimers.forEach((id) => clearTimeout(id));
    this.fxTimers.clear();
    this.syncTimer = this.toastTimer = this.noticeTimer = 0;
  }

  private tweenTotal(): void {
    const to = this.total;
    if (this.totalRaf) cancelAnimationFrame(this.totalRaf);
    this.totalRaf = 0;
    if (this.showcase.reduced || typeof requestAnimationFrame === 'undefined' || !this.showcase.isActive) {
      this.displayTotal = to;
      return;
    }
    const from = this.displayTotal;
    const t0 = performance.now();
    this.zone.runOutsideAngular(() => {
      const tick = (now: number) => {
        if (this.destroyed) return;
        const k = Math.min(1, (now - t0) / 650);
        this.displayTotal = from + (to - from) * (1 - Math.pow(1 - k, 3));
        this.cdr.detectChanges();
        this.totalRaf = k < 1 ? requestAnimationFrame(tick) : 0;
      };
      this.totalRaf = requestAnimationFrame(tick);
    });
  }
}
