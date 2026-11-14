import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { HeroCube } from '../../components/hero-cube/hero-cube';
import { FeatureTabs } from '../../components/feature-tabs/feature-tabs';
import { Contact } from '../../components/contact/contact';
import { I18nService } from '../../i18n/i18n.service';
import { I18N, HomeKey } from './home.i18n';
import { CATALOG, CatalogKey } from './home.catalog.i18n';

/** Prefixo das chaves de um item do catálogo (`<item>_name`, `<item>_cat`, `<item>_desc`). */
type ItemKey = CatalogKey extends infer K ? (K extends `${infer P}_name` ? P : never) : never;
/** Prefixo das chaves de um slide (`<item>_<n>_label`, `_title`, `_desc`). */
type SlideKey = CatalogKey extends infer K ? (K extends `${infer P}_label` ? P : never) : never;
type BadgeKey = Extract<CatalogKey, `badge_${string}`>;

export interface SoftwareSlide {
  src: string;
  /** Prefixo das chaves de texto do slide no catálogo. */
  key: SlideKey;
  /**
   * `screen`: captura real do sistema, inteira sobre fundo escuro (padrão);
   * `contain`: ilustração inteira no quadro; `logo`: logotipo centralizado sobre branco.
   */
  fit?: 'screen' | 'contain' | 'logo';
}

export interface SoftwareItem {
  id: string;
  /** Prefixo das chaves de texto do item no catálogo. */
  key: ItemKey;
  badge: BadgeKey;
  icon?: string;
  /** Setor atendido pelo CTRLB (mostra o ícone do setor em vez do logotipo). */
  isCtrlbSector: boolean;
  logo: string;
  link: string;
  slides: SoftwareSlide[];
}

const REAL = '/images/real-screens/';
const CTRLB_SITE = 'https://ctrlb.com.br';

/**
 * Catálogo de "Nossos produtos". Só material real: capturas do CTRLB
 * (`/images/real-screens`) e logotipos dos produtos. Os textos ficam em
 * `home.catalog.i18n.ts`, nos quatro idiomas.
 */
const SOFTWARE_ITEMS: SoftwareItem[] = [
  {
    id: 'ctrlb',
    key: 'ctrlb',
    badge: 'badge_integrated',
    icon: 'fa-solid fa-layer-group',
    isCtrlbSector: false,
    logo: '/ctrlb-logo.png',
    link: CTRLB_SITE,
    slides: [
      { src: REAL + 'dashboard-live-dark.png', key: 'ctrlb_1' },
      { src: REAL + 'conversas-live-dark.png', key: 'ctrlb_2' },
      { src: REAL + 'crm-live-dark.png', key: 'ctrlb_3' },
      { src: REAL + 'agenda-live-dark.png', key: 'ctrlb_4' },
      { src: REAL + 'editor-video-live-dark.png', key: 'ctrlb_5' },
    ],
  },
  {
    id: 'academias',
    key: 'academias',
    badge: 'badge_sector',
    icon: 'fa-solid fa-dumbbell',
    isCtrlbSector: true,
    logo: '/ctrlb-logo.png',
    link: CTRLB_SITE,
    slides: [
      { src: REAL + 'dashboard-live-dark.png', key: 'academias_1' },
      { src: REAL + 'conversas-live-dark.png', key: 'academias_2' },
      { src: REAL + 'agenda-live-dark.png', key: 'academias_3' },
      { src: REAL + 'crm-live-dark.png', key: 'academias_4' },
    ],
  },
  {
    id: 'restaurantes',
    key: 'restaurantes',
    badge: 'badge_sector_delivery',
    icon: 'fa-solid fa-utensils',
    isCtrlbSector: true,
    logo: '/ctrlb-logo.png',
    link: CTRLB_SITE,
    slides: [
      { src: '/kardapio-logo.png', key: 'restaurantes_1', fit: 'logo' },
      { src: REAL + 'dashboard-live-dark.png', key: 'restaurantes_2' },
      { src: REAL + 'compras-live.png', key: 'restaurantes_3' },
      { src: REAL + 'conversas-live-dark.png', key: 'restaurantes_4' },
    ],
  },
  {
    id: 'saude',
    key: 'saude',
    badge: 'badge_sector',
    icon: 'fa-solid fa-stethoscope',
    isCtrlbSector: true,
    logo: '/ctrlb-logo.png',
    link: CTRLB_SITE,
    slides: [
      { src: REAL + 'agenda-live-dark.png', key: 'saude_1' },
      { src: REAL + 'documentos-live-dark.png', key: 'saude_2' },
      { src: REAL + 'conversas-live-dark.png', key: 'saude_3' },
      { src: REAL + 'dashboard-live-dark.png', key: 'saude_4' },
    ],
  },
  {
    id: 'varejo',
    key: 'varejo',
    badge: 'badge_sector_shopping',
    icon: 'fa-solid fa-store',
    isCtrlbSector: true,
    logo: '/ctrlb-logo.png',
    link: CTRLB_SITE,
    slides: [
      { src: REAL + 'admin-unidades-live-dark.png', key: 'varejo_1' },
      { src: REAL + 'crm-live-dark.png', key: 'varejo_2' },
      { src: REAL + 'compras-live.png', key: 'varejo_3' },
      { src: REAL + 'marketing-live-dark.png', key: 'varejo_4' },
    ],
  },
  {
    id: 'beleza',
    key: 'beleza',
    badge: 'badge_sector',
    icon: 'fa-solid fa-scissors',
    isCtrlbSector: true,
    logo: '/ctrlb-logo.png',
    link: CTRLB_SITE,
    slides: [
      { src: REAL + 'agenda-live-dark.png', key: 'beleza_1' },
      { src: REAL + 'conversas-live-dark.png', key: 'beleza_2' },
      { src: REAL + 'dashboard-live-dark.png', key: 'beleza_3' },
      { src: REAL + 'editor-imagem-live-dark.png', key: 'beleza_4' },
    ],
  },
  {
    id: 'advocacia',
    key: 'advocacia',
    badge: 'badge_sector',
    icon: 'fa-solid fa-scale-balanced',
    isCtrlbSector: true,
    logo: '/ctrlb-logo.png',
    link: CTRLB_SITE,
    slides: [
      { src: REAL + 'documentos-live-dark.png', key: 'advocacia_1' },
      { src: REAL + 'conversas-live-dark.png', key: 'advocacia_2' },
      { src: REAL + 'agenda-live-dark.png', key: 'advocacia_3' },
      { src: REAL + 'dashboard-live-dark.png', key: 'advocacia_4' },
    ],
  },
  {
    id: 'servicos',
    key: 'servicos',
    badge: 'badge_sector',
    icon: 'fa-solid fa-wrench',
    isCtrlbSector: true,
    logo: '/ctrlb-logo.png',
    link: CTRLB_SITE,
    slides: [
      { src: REAL + 'compras-live.png', key: 'servicos_1' },
      { src: REAL + 'conversas-live-dark.png', key: 'servicos_2' },
      { src: REAL + 'agenda-live-dark.png', key: 'servicos_3' },
      { src: REAL + 'dashboard-live-dark.png', key: 'servicos_4' },
    ],
  },
  {
    id: 'educacao',
    key: 'educacao',
    badge: 'badge_sector',
    icon: 'fa-solid fa-graduation-cap',
    isCtrlbSector: true,
    logo: '/ctrlb-logo.png',
    link: CTRLB_SITE,
    slides: [
      { src: REAL + 'crm-live-dark.png', key: 'educacao_1' },
      { src: REAL + 'agenda-live-dark.png', key: 'educacao_2' },
      { src: REAL + 'documentos-live-dark.png', key: 'educacao_3' },
      { src: REAL + 'dashboard-live-dark.png', key: 'educacao_4' },
    ],
  },
  {
    id: 'construcao',
    key: 'construcao',
    badge: 'badge_sector',
    icon: 'fa-solid fa-helmet-safety',
    isCtrlbSector: true,
    logo: '/ctrlb-logo.png',
    link: CTRLB_SITE,
    slides: [
      { src: REAL + 'compras-live.png', key: 'construcao_1' },
      { src: REAL + 'agenda-live-dark.png', key: 'construcao_2' },
      { src: REAL + 'documentos-live-dark.png', key: 'construcao_3' },
      { src: REAL + 'dashboard-live-dark.png', key: 'construcao_4' },
    ],
  },
  {
    id: 'pet',
    key: 'pet',
    badge: 'badge_sector',
    icon: 'fa-solid fa-paw',
    isCtrlbSector: true,
    logo: '/ctrlb-logo.png',
    link: CTRLB_SITE,
    slides: [
      { src: REAL + 'agenda-live-dark.png', key: 'pet_1' },
      { src: REAL + 'documentos-live-dark.png', key: 'pet_2' },
      { src: REAL + 'compras-live.png', key: 'pet_3' },
      { src: REAL + 'conversas-live-dark.png', key: 'pet_4' },
    ],
  },
  {
    id: 'imobiliarias',
    key: 'imobiliarias',
    badge: 'badge_sector',
    icon: 'fa-solid fa-house',
    isCtrlbSector: true,
    logo: '/ctrlb-logo.png',
    link: CTRLB_SITE,
    slides: [
      { src: REAL + 'crm-live-dark.png', key: 'imobiliarias_1' },
      { src: REAL + 'conversas-live-dark.png', key: 'imobiliarias_2' },
      { src: REAL + 'documentos-live-dark.png', key: 'imobiliarias_3' },
      { src: REAL + 'dashboard-live-dark.png', key: 'imobiliarias_4' },
    ],
  },
  {
    id: 'kardapio',
    key: 'kardapio',
    badge: 'badge_marketplace',
    isCtrlbSector: false,
    logo: '/kardapio-logo.png',
    link: 'https://kardapio.delivery',
    slides: [
      // Ainda não há captura real do Kardapio.Delivery: o slide mostra o logotipo do produto.
      { src: '/kardapio-logo.png', key: 'kardapio_1', fit: 'logo' },
      { src: REAL + 'dashboard-live-dark.png', key: 'kardapio_2' },
      { src: REAL + 'compras-live.png', key: 'kardapio_3' },
      { src: REAL + 'conversas-live-dark.png', key: 'kardapio_4' },
    ],
  },
  {
    id: 'aqui-shopping',
    key: 'aqui',
    badge: 'badge_marketplace',
    isCtrlbSector: false,
    logo: '/aqui-shopping-f.png',
    link: 'https://aqui.shopping',
    slides: [
      { src: REAL + 'comercial-live.png', key: 'aqui_1' },
      { src: REAL + 'admin-unidades-live-dark.png', key: 'aqui_2' },
      { src: REAL + 'compras-live.png', key: 'aqui_3' },
      { src: REAL + 'dashboard-live-dark.png', key: 'aqui_4' },
    ],
  },
  {
    id: 'landing-page',
    key: 'lp',
    badge: 'badge_web',
    icon: 'fa-solid fa-laptop-code',
    isCtrlbSector: false,
    logo: '/landingpage-png.png',
    link: '#contato',
    slides: [
      { src: '/features/carousel/lp-showcase-anim.gif', key: 'lp_1', fit: 'contain' },
      { src: '/features/carousel/lp-gamification-anim.gif', key: 'lp_2', fit: 'contain' },
      { src: REAL + 'marketing-live-dark.png', key: 'lp_3' },
    ],
  },
];

type ModalId = 'saas' | 'onprem';

interface ModalDef {
  icon: string;
  title: HomeKey;
  introA: HomeKey;
  /** Termo em destaque no meio da frase de abertura (não traduzido). */
  term: string;
  introB: HomeKey;
  features: { icon: string; title: HomeKey; desc: HomeKey }[];
  ideal: HomeKey;
}

const MODALS: Record<ModalId, ModalDef> = {
  saas: {
    icon: 'fa-solid fa-cloud',
    title: 'saas_title',
    introA: 'saas_intro_a',
    term: 'SaaS (Software as a Service)',
    introB: 'saas_intro_b',
    features: [
      { icon: 'fa-solid fa-globe', title: 'saas_f1_t', desc: 'saas_f1_d' },
      { icon: 'fa-solid fa-rotate', title: 'saas_f2_t', desc: 'saas_f2_d' },
      { icon: 'fa-solid fa-server', title: 'saas_f3_t', desc: 'saas_f3_d' },
      { icon: 'fa-solid fa-arrow-up-right-dots', title: 'saas_f4_t', desc: 'saas_f4_d' },
    ],
    ideal: 'saas_ideal',
  },
  onprem: {
    icon: 'fa-solid fa-server',
    title: 'onprem_title',
    introA: 'onprem_intro_a',
    term: 'On-premise',
    introB: 'onprem_intro_b',
    features: [
      { icon: 'fa-solid fa-shield-halved', title: 'onprem_f1_t', desc: 'onprem_f1_d' },
      { icon: 'fa-solid fa-network-wired', title: 'onprem_f2_t', desc: 'onprem_f2_d' },
      { icon: 'fa-solid fa-lock', title: 'onprem_f3_t', desc: 'onprem_f3_d' },
      { icon: 'fa-solid fa-wifi', title: 'onprem_f4_t', desc: 'onprem_f4_d' },
    ],
    ideal: 'onprem_ideal',
  },
};

/** Tempo de cada slide no modo vitrine. */
const SLIDE_MS = 5000;
/** Depois de uma interação do usuário, a vitrine espera esse tempo para retomar. */
const RESUME_MS = 12000;
const MODAL_EXIT_MS = 180;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeroCube, FeatureTabs, Contact, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly tc = this.i18n.scope(CATALOG);
  private readonly zone = inject(NgZone);

  @ViewChild('sistemasSection') private sistemasSection?: ElementRef<HTMLElement>;
  @ViewChild('detailContent') private detailContent?: ElementRef<HTMLElement>;
  @ViewChild('modalClose') private modalClose?: ElementRef<HTMLButtonElement>;

  readonly softwareItems = SOFTWARE_ITEMS;

  /** Item destacado na lista (muda no clique, antes da transição do painel). */
  readonly activeId = signal(SOFTWARE_ITEMS[0].id);
  /** Item mostrado no painel de detalhe (muda no meio da transição). */
  private readonly shownId = signal(SOFTWARE_ITEMS[0].id);
  readonly selectedSoftware = computed(
    () => SOFTWARE_ITEMS.find((item) => item.id === this.shownId()) ?? SOFTWARE_ITEMS[0],
  );
  readonly currentSlideIndex = signal(0);

  readonly modal = signal<ModalId | null>(null);
  readonly modalClosing = signal(false);
  readonly modalDef = computed(() => {
    const id = this.modal();
    return id ? MODALS[id] : null;
  });

  private readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private autoplayTimer: ReturnType<typeof setTimeout> | undefined;
  private modalTimer: ReturnType<typeof setTimeout> | undefined;
  private pausedUntil = 0;
  private sectionVisible = false;
  private pointerInside = false;
  private observer?: IntersectionObserver;
  private navObserver?: ResizeObserver;
  private touchStartX: number | null = null;
  private modalOpener: HTMLElement | null = null;

  // ───────────── Textos do catálogo ─────────────

  itemName(item: SoftwareItem): string {
    return this.tc(`${item.key}_name`);
  }

  /** Nome com ponto de quebra depois do "." (ex.: "Kardapio.​Delivery" nos cards estreitos). */
  itemNameBreakable(item: SoftwareItem): string {
    return this.itemName(item).replace(/\./g, '.​');
  }

  itemCategory(item: SoftwareItem): string {
    return this.tc(`${item.key}_cat`);
  }

  itemSummary(item: SoftwareItem): string {
    return this.tc(`${item.key}_desc`);
  }

  itemBadge(item: SoftwareItem): string {
    return this.tc(item.badge);
  }

  slideLabel(slide: SoftwareSlide): string {
    return this.tc(`${slide.key}_label`);
  }

  slideTitle(slide: SoftwareSlide): string {
    return this.tc(`${slide.key}_title`);
  }

  slideDesc(slide: SoftwareSlide): string {
    return this.tc(`${slide.key}_desc`);
  }

  slideLinkLabel(item: SoftwareItem, slide: SoftwareSlide): string {
    const label = this.slideLabel(slide);
    return this.t(this.isExternal(item) ? 'slide_open' : 'slide_contact', { label });
  }

  isExternal(item: SoftwareItem): boolean {
    return item.link.startsWith('http');
  }

  // ───────────── Seleção de item e slides ─────────────

  selectSoftware(item: SoftwareItem): void {
    this.userInteracted();
    this.showItem(item.id);
  }

  nextSlide(): void {
    this.userInteracted();
    this.stepSlide(1);
  }

  prevSlide(): void {
    this.userInteracted();
    this.stepSlide(-1);
  }

  goToSlide(index: number): void {
    this.userInteracted();
    this.currentSlideIndex.set(index);
  }

  onCarouselTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0]?.clientX ?? null;
  }

  onCarouselTouchEnd(event: TouchEvent): void {
    if (this.touchStartX === null) return;
    const dx = (event.changedTouches[0]?.clientX ?? this.touchStartX) - this.touchStartX;
    this.touchStartX = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) this.nextSlide();
    else this.prevSlide();
  }

  onDetailPointer(inside: boolean): void {
    this.pointerInside = inside;
  }

  private stepSlide(delta: number): void {
    const total = this.selectedSoftware().slides.length;
    this.currentSlideIndex.update((i) => (i + delta + total) % total);
  }

  /**
   * Troca o item do painel com saída e entrada animadas: o conteúdo antigo
   * some, os dados mudam com o painel invisível e o novo conteúdo entra.
   */
  private showItem(id: string): void {
    this.activeId.set(id);
    if (id === this.shownId()) {
      this.currentSlideIndex.set(0);
      return;
    }
    const el = this.detailContent?.nativeElement;
    const swap = () => {
      this.shownId.set(id);
      this.currentSlideIndex.set(0);
    };
    if (!el || this.reducedMotion) {
      swap();
      return;
    }
    gsap.killTweensOf(el);
    gsap.to(el, {
      opacity: 0,
      y: 6,
      duration: 0.16,
      ease: 'power1.in',
      onComplete: () => {
        // O clique pode ter mudado de novo durante a saída: mostra o mais recente.
        this.zone.run(() => {
          this.shownId.set(this.activeId());
          this.currentSlideIndex.set(0);
        });
        gsap.to(el, { opacity: 1, y: 0, duration: 0.36, ease: 'power2.out', clearProps: 'transform' });
      },
    });
  }

  // ───────────── Modo vitrine (autoplay) ─────────────

  private userInteracted(): void {
    this.pausedUntil = performance.now() + RESUME_MS;
    this.scheduleAutoplay(RESUME_MS);
  }

  private scheduleAutoplay(delay = SLIDE_MS): void {
    clearTimeout(this.autoplayTimer);
    if (this.reducedMotion) return;
    // Fora da zona: o timer só entra no Angular quando realmente troca de slide.
    this.zone.runOutsideAngular(() => {
      this.autoplayTimer = setTimeout(() => this.autoplayTick(), delay);
    });
  }

  private autoplayTick(): void {
    const idle = performance.now() >= this.pausedUntil;
    const canPlay =
      idle && this.sectionVisible && !this.pointerInside && !document.hidden && this.modal() === null;
    if (canPlay) {
      this.zone.run(() => this.advanceShowcase());
    }
    this.scheduleAutoplay();
  }

  /** Avança um slide; no último, passa para o próximo item da lista. */
  private advanceShowcase(): void {
    const item = this.selectedSoftware();
    if (this.currentSlideIndex() < item.slides.length - 1) {
      this.currentSlideIndex.update((i) => i + 1);
      return;
    }
    const index = SOFTWARE_ITEMS.findIndex((i) => i.id === item.id);
    this.showItem(SOFTWARE_ITEMS[(index + 1) % SOFTWARE_ITEMS.length].id);
  }

  // ───────────── Modais SaaS / On-premise ─────────────

  openModal(id: ModalId, event?: Event): void {
    clearTimeout(this.modalTimer);
    this.modalOpener = (event?.currentTarget as HTMLElement | null) ?? null;
    this.modalClosing.set(false);
    this.modal.set(id);
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.modalClose?.nativeElement.focus());
  }

  closeModal(): void {
    if (this.modal() === null || this.modalClosing()) return;
    const finish = () => {
      this.modal.set(null);
      this.modalClosing.set(false);
      document.body.style.overflow = '';
      this.modalOpener?.focus();
      this.modalOpener = null;
    };
    if (this.reducedMotion) {
      finish();
      return;
    }
    // A saída é animada por classe; o nó só é removido depois.
    this.modalClosing.set(true);
    this.modalTimer = setTimeout(finish, MODAL_EXIT_MS);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeModal();
  }

  // ───────────── Ciclo de vida ─────────────

  ngAfterViewInit(): void {
    const section = this.sistemasSection?.nativeElement;
    if (section && typeof IntersectionObserver === 'function') {
      this.observer = new IntersectionObserver(
        (entries) => {
          this.sectionVisible = entries[entries.length - 1].isIntersecting;
        },
        // Só conta como visível quando a seção ocupa a faixa central da tela.
        { rootMargin: '-25% 0px -25% 0px' },
      );
      this.observer.observe(section);
    } else {
      this.sectionVisible = true;
    }
    if (section) this.trackNavHeight(section);
    this.scheduleAutoplay();
  }

  /**
   * O painel de detalhe gruda logo abaixo da navbar fixa. A altura dela muda
   * com a largura da tela, então é medida aqui e publicada em `--home-nav-h`.
   */
  private trackNavHeight(section: HTMLElement): void {
    const nav = document.querySelector('nav');
    if (!nav || typeof ResizeObserver !== 'function') return;
    const apply = () => {
      // Limite: com o menu do celular aberto a navbar cresce, e o painel não deve acompanhar.
      const height = Math.min(Math.round(nav.getBoundingClientRect().height), 120);
      if (height > 0) section.style.setProperty('--home-nav-h', `${height}px`);
    };
    this.zone.runOutsideAngular(() => {
      this.navObserver = new ResizeObserver(apply);
      this.navObserver.observe(nav);
    });
    apply();
  }

  ngOnDestroy(): void {
    clearTimeout(this.autoplayTimer);
    clearTimeout(this.modalTimer);
    this.observer?.disconnect();
    this.navObserver?.disconnect();
    const el = this.detailContent?.nativeElement;
    if (el) gsap.killTweensOf(el);
    document.body.style.overflow = '';
  }
}
