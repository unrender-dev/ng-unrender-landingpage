import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faGamepad,
  faExternalLinkAlt,
  faSync,
  faLock,
  faShoppingCart,
  faInfoCircle,
  faTv,
  faLightbulb,
  faArrowUpRightFromSquare,
} from '@fortawesome/free-solid-svg-icons';
import { ProdutosPosModalService } from '../../../../services/produtos-pos-modal.service';
import { I18nService } from '../../../../i18n/i18n.service';
import { I18N } from './unrender-games-showcase.i18n';

type Key = keyof (typeof I18N)['pt'];

export interface UnrenderGamesRoute {
  id: string;
  path: string;
  /** Chaves de tradução (o texto é resolvido no template). */
  label: Key;
  badge: Key;
}

interface TotemHighlight {
  id: string;
  name: Key;
  specs: Key;
  alt: Key | null;
  /** Foto real do produto; `null` mostra um ícone no lugar de uma foto que não é dele. */
  image: string | null;
  /** Ponto de foco do recorte (`object-position`). */
  focus?: string;
  price: number;
  rentInstallments: number;
  rentValue: number;
}

type FrameStatus = 'idle' | 'loading' | 'ready' | 'failed';

/** Site público do estúdio: é sempre ele que aparece na vitrine. */
const SITE = 'https://unrender.games';
/** Sem `load` do iframe nesse tempo, assume-se que a página não vai abrir. */
const LOAD_TIMEOUT_MS = 12000;

@Component({
  selector: 'app-unrender-games-showcase',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './unrender-games-showcase.component.html',
  styleUrls: ['./unrender-games-showcase.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnrenderGamesShowcaseComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);

  faGamepad = faGamepad;
  faExternalLinkAlt = faExternalLinkAlt;
  faSync = faSync;
  faLock = faLock;
  faShoppingCart = faShoppingCart;
  faInfoCircle = faInfoCircle;
  faTv = faTv;
  faLightbulb = faLightbulb;
  faArrowUpRight = faArrowUpRightFromSquare;

  readonly host = SITE;
  readonly hostLabel = 'unrender.games';

  readonly routes: UnrenderGamesRoute[] = [
    { id: 'gamificacao', path: '/gamificacao/', label: 'routeGamificacao', badge: 'routeGamificacaoBadge' },
    { id: 'loja', path: '/loja/', label: 'routeLoja', badge: 'routeLojaBadge' },
    { id: 'home', path: '/', label: 'routeHome', badge: 'routeHomeBadge' },
  ];

  /** Imagem real (evento com a marca Unrender) usada enquanto carrega e quando o iframe não abre. */
  readonly posterImage = '/features/totem2.jpg';

  readonly totemHighlights: TotemHighlight[] = [
    {
      id: 'totem-interativo-55',
      name: 'totem55Name',
      specs: 'totem55Specs',
      alt: 'totem55Alt',
      image: '/features/totem1.png',
      focus: '20% 60%',
      price: 3199,
      rentInstallments: 12,
      rentValue: 299,
    },
    {
      id: 'totem-foto-polaroid',
      name: 'totemFotoName',
      specs: 'totemFotoSpecs',
      alt: 'totemFotoAlt',
      image: '/features/unrender-games/totem-virtual-tryon.jpg',
      focus: '50% 35%',
      price: 3199,
      rentInstallments: 12,
      rentValue: 299,
    },
    {
      id: 'totem-arcade-retro',
      name: 'totemArcadeName',
      specs: 'totemArcadeSpecs',
      alt: null,
      image: null,
      price: 2899,
      rentInstallments: 12,
      rentValue: 269,
    },
  ];

  private readonly _activePath = signal('/gamificacao/');
  readonly status = signal<FrameStatus>('idle');
  readonly sanitizedUrl = signal<SafeResourceUrl | null>(null);
  readonly activeRoute = computed(() => this.routes.find((r) => r.path === this._activePath()) ?? this.routes[0]);

  readonly isBrowser: boolean;
  private inView = false;
  private observer: IntersectionObserver | null = null;
  private loadTimer: ReturnType<typeof setTimeout> | null = null;
  /** Invalida respostas de tentativas antigas (troca de página durante o carregamento). */
  private attempt = 0;

  constructor(
    private sanitizer: DomSanitizer,
    private el: ElementRef<HTMLElement>,
    public posModal: ProdutosPosModalService,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get activePath(): string {
    return this._activePath();
  }

  get currentFullUrl(): string {
    return `${SITE}${this._activePath()}`;
  }

  get isReloading(): boolean {
    return this.status() === 'loading';
  }

  /** Endereço sem o protocolo, como aparece na barra do navegador. */
  get displayUrl(): string {
    return this.currentFullUrl.replace(/^https:\/\//, '');
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    if (typeof IntersectionObserver === 'undefined') {
      this.inView = true;
      this.load();
      return;
    }
    // O site só começa a carregar quando a vitrine entra na tela.
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !this.inView) {
          this.inView = true;
          this.load();
          this.observer?.disconnect();
          this.observer = null;
        }
      },
      { rootMargin: '200px' },
    );
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.clearTimer();
    this.attempt++;
  }

  selectRoute(path: string): void {
    if (path === this._activePath() && this.status() !== 'failed') return;
    this._activePath.set(path);
    if (this.inView) this.load();
  }

  reloadIframe(): void {
    this.inView = true;
    this.load();
  }

  onFrameLoad(): void {
    // O `load` também dispara para about:blank e para trocas antigas: só vale durante o carregamento atual.
    if (this.status() !== 'loading' || !this.sanitizedUrl()) return;
    this.clearTimer();
    this.status.set('ready');
  }

  openInNewTab(): void {
    if (this.isBrowser) {
      window.open(this.currentFullUrl, '_blank', 'noopener,noreferrer');
    }
  }

  money(value: number): string {
    return this.i18n.money(value, 0);
  }

  private load(): void {
    const id = ++this.attempt;
    this.clearTimer();
    this.status.set('loading');
    // Novo objeto a cada chamada: o Angular reaplica o `src` e o iframe recarrega.
    this.sanitizedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.currentFullUrl));

    this.loadTimer = setTimeout(() => {
      if (id === this.attempt && this.status() === 'loading') this.fail();
    }, LOAD_TIMEOUT_MS);

    // O iframe não avisa erro de rede/certificado (dispara `load` na página de erro do navegador);
    // uma sondagem sem CORS rejeita justamente nesses casos e aciona o fallback. Se o servidor
    // responde, a janela já é revelada — o site é pesado e o `load` completo pode demorar.
    if (typeof fetch === 'function') {
      fetch(this.currentFullUrl, { mode: 'no-cors', cache: 'no-store' }).then(
        () => {
          if (id === this.attempt && this.status() === 'loading') {
            this.clearTimer();
            this.status.set('ready');
          }
        },
        () => {
          if (id === this.attempt) this.fail();
        },
      );
    }
  }

  private fail(): void {
    this.clearTimer();
    this.sanitizedUrl.set(null);
    this.status.set('failed');
  }

  private clearTimer(): void {
    if (this.loadTimer) {
      clearTimeout(this.loadTimer);
      this.loadTimer = null;
    }
  }
}
