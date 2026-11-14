import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LazyRendererComponent } from '../lazy-renderer/lazy-renderer.component';
import { ProdutosPosModalService } from '../../services/produtos-pos-modal.service';
import { FeatureBannerComponent } from '../feature-banner/feature-banner.component';
import { localizedBanners } from '../feature-banner/feature-banners.data';
import { FeatureBanner } from '../feature-banner/feature-banner.types';
import { I18nService, Params } from '../../i18n/i18n.service';
import { I18N } from './feature-tabs.i18n';
import { Feature, GAME_PLATFORMS, GAME_SPECIALTIES, MenuItem, TAB_ITEMS, TabId } from './feature-tabs.data';

interface TabDef {
  id: TabId;
  /** Classe de cor da aba no SCSS. */
  css: 'research' | 'strategy' | 'design';
}

const DESKTOP_QUERY = '(min-width: 768px)';
const NO_INPUTS: Record<string, unknown> = {};

@Component({
  selector: 'app-feature-tabs',
  standalone: true,
  imports: [NgTemplateOutlet, RouterModule, LazyRendererComponent, FeatureBannerComponent],
  templateUrl: './feature-tabs.html',
  styleUrls: ['./feature-tabs.scss'],
})
export class FeatureTabs implements OnInit, OnDestroy {
  readonly posModal = inject(ProdutosPosModalService);
  private readonly i18n = inject(I18nService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly translate = this.i18n.scope(I18N);

  /** Chaves são montadas a partir de ids (`item.<id>.title`, `f.<key>`), por isso `string`. */
  readonly t = (key: string, params?: Params): string => this.translate(key as never, params);

  readonly tabs: TabDef[] = [
    { id: 'development', css: 'research' },
    { id: 'infrastructure', css: 'strategy' },
    { id: 'design', css: 'design' },
  ];
  readonly items = TAB_ITEMS;
  readonly specialties = GAME_SPECIALTIES;
  readonly platforms = GAME_PLATFORMS;
  readonly noInputs = NO_INPUTS;

  readonly activeTab = signal<TabId>('development');
  /** Item de menu escolhido em cada aba. */
  readonly selected = signal<Record<TabId, MenuItem>>({
    development: TAB_ITEMS.development[0],
    infrastructure: TAB_ITEMS.infrastructure[0],
    design: TAB_ITEMS.design[0],
  });
  readonly activeItem = computed(() => this.selected()[this.activeTab()]);

  /**
   * Só um dos layouts (abas no desktop, acordeão no celular) existe no DOM por vez.
   * Antes os dois eram renderizados e um ficava escondido por CSS: cada demo era
   * instanciada em dobro (duas cenas 3D, duas câmeras…) e a escondida media 0 px.
   */
  readonly isDesktop = signal(typeof matchMedia === 'function' ? matchMedia(DESKTOP_QUERY).matches : true);

  private readonly banners = computed(() => localizedBanners(this.i18n.lang()));
  private media?: MediaQueryList;
  private readonly onMedia = (e: MediaQueryListEvent) => this.isDesktop.set(e.matches);
  private timers: ReturnType<typeof setTimeout>[] = [];

  ngOnInit(): void {
    if (typeof matchMedia === 'function') {
      this.media = matchMedia(DESKTOP_QUERY);
      this.media.addEventListener('change', this.onMedia);
    }
    this.openFromUrl();
  }

  ngOnDestroy(): void {
    this.media?.removeEventListener('change', this.onMedia);
    this.timers.forEach(clearTimeout);
  }

  bannerFor(item: MenuItem): FeatureBanner | null {
    return this.banners()[item.id] ?? null;
  }

  selectTab(tab: TabId): void {
    if (tab === this.activeTab()) return;
    this.activeTab.set(tab);
    // Ao trocar de aba, volta para o primeiro item dela.
    this.selected.update((s) => ({ ...s, [tab]: TAB_ITEMS[tab][0] }));
    if (!this.isDesktop()) this.later(() => this.scrollTo('.accordion-tab-wrapper.is-open', 64), 80);
  }

  selectItem(tab: TabId, item: MenuItem): void {
    if (item.id === this.selected()[tab].id) return;
    this.selected.update((s) => ({ ...s, [tab]: item }));
    this.later(() => {
      this.revealActiveChip();
      this.scrollTo('.modern-content-wrapper', this.isDesktop() ? 100 : this.stickyHeight() + 8);
    }, 80);
  }

  /** Leva para o formulário de contato da página (âncora `#contato` da home). */
  goToContact(): void {
    document.getElementById('contato')?.scrollIntoView({ behavior: this.scrollBehavior(), block: 'start' });
  }

  /** Preço de venda: o do catálogo da loja (sincronizado com o SGA) ou, sem ele, o da lista. */
  salePrice(feature: Feature): string {
    const product = feature.posProductId ? this.posModal.produtoPorId(feature.posProductId) : undefined;
    if (product) return product.priceSale;
    return feature.price ? this.i18n.money(feature.price, 0) : '';
  }

  rentLabel(feature: Feature): string {
    if (!feature.rent) return '';
    const value = this.i18n.money(feature.rent, 0);
    if (feature.installments) return this.t('ui.installments', { n: feature.installments, value });
    const product = feature.posProductId ? this.posModal.produtoPorId(feature.posProductId) : undefined;
    return `${this.t('ui.rent')}: ${product ? product.priceRent : this.t('ui.perMonth', { value })}`;
  }

  /** O produto existe no catálogo da loja? Só então o modal tem ficha e pedido para ele. */
  inCatalog(feature: Feature): boolean {
    return !!feature.posProductId && !!this.posModal.produtoPorId(feature.posProductId);
  }

  /** Orçamento pelo WhatsApp para produtos que ainda não estão no catálogo. */
  quoteLink(feature: Feature): string {
    const base = this.posModal.whatsappBase();
    const text = encodeURIComponent(this.t('ui.quoteMessage', { name: this.t('f.' + feature.key) }));
    return `${base}${base.includes('?') ? '&' : '?'}text=${text}`;
  }

  /**
   * Link direto: `?tab=<aba>&item=<id do item>&f=<índice da feature>`.
   * Abre a aba/o item e rola até a feature (ou até o conteúdo, sem `f`).
   */
  private openFromUrl(): void {
    if (typeof location === 'undefined') return;
    const params = new URLSearchParams(location.search);
    const itemId = params.get('item');
    let tab = params.get('tab') as TabId | null;
    if (tab && !(tab in TAB_ITEMS)) tab = null;
    if (!tab && itemId) {
      tab = (Object.keys(TAB_ITEMS) as TabId[]).find((id) => TAB_ITEMS[id].some((i) => i.id === itemId)) ?? null;
    }
    if (!tab) return;

    const item = TAB_ITEMS[tab].find((i) => i.id === itemId) ?? TAB_ITEMS[tab][0];
    this.activeTab.set(tab);
    this.selected.update((s) => ({ ...s, [tab!]: item }));

    const index = params.get('f');
    const target = index !== null ? `[data-feature-index="${CSS.escape(index)}"]` : '.modern-content-wrapper';
    // Duas tentativas: a página ainda cresce acima (herói, lista de sistemas) depois do primeiro paint.
    const go = () => {
      if (this.userScrolled) return;
      this.revealActiveChip();
      this.scrollTo(target, this.isDesktop() ? 100 : this.stickyHeight() + 8, 'auto');
    };
    this.later(go, 350);
    this.later(go, 1400);
    window.addEventListener('wheel', this.markScrolled, { passive: true, once: true });
    window.addEventListener('touchmove', this.markScrolled, { passive: true, once: true });
  }

  private userScrolled = false;
  private readonly markScrolled = () => (this.userScrolled = true);

  private later(fn: () => void, ms: number): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private scrollBehavior(): ScrollBehavior {
    return matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  private scrollTo(selector: string, offset: number, behavior: ScrollBehavior = this.scrollBehavior()): void {
    const el = this.host.nativeElement.querySelector<HTMLElement>(selector);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior });
  }

  /** Altura do cabeçalho fixo do acordeão (navbar + título da aba + chips), no celular. */
  private stickyHeight(): number {
    const sticky = this.host.nativeElement.querySelector<HTMLElement>('.accordion-tab-wrapper.is-open .sticky-header');
    return 64 + (sticky?.offsetHeight ?? 0);
  }

  /** No celular os chips rolam na horizontal: mantém o chip ativo à vista. */
  private revealActiveChip(): void {
    const chip = this.host.nativeElement.querySelector<HTMLElement>('.mobile-nav-container .chip.is-active');
    const row = chip?.closest<HTMLElement>('.chip-row');
    if (!chip || !row) return;
    const left = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
    row.scrollTo({ left, behavior: this.scrollBehavior() });
  }
}
