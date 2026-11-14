import { Component, HostListener, inject, ChangeDetectorRef, ElementRef } from '@angular/core';
import { LoadingService } from '../../services/loading.service';
import { Router } from '@angular/router';
import { I18nService, Lang, LangOption, dict } from '../../i18n/i18n.service';

const I18N = dict({
  pt: {
    main: 'Navegação principal', home: 'Início', systems: 'Sistemas', services: 'Serviços', store: 'Loja',
    language: 'Idioma', openMenu: 'Abrir menu', closeMenu: 'Fechar menu',
  },
  en: {
    main: 'Main navigation', home: 'Home', systems: 'Systems', services: 'Services', store: 'Store',
    language: 'Language', openMenu: 'Open menu', closeMenu: 'Close menu',
  },
  es: {
    main: 'Navegación principal', home: 'Inicio', systems: 'Sistemas', services: 'Servicios', store: 'Tienda',
    language: 'Idioma', openMenu: 'Abrir menú', closeMenu: 'Cerrar menú',
  },
  fr: {
    main: 'Navigation principale', home: 'Accueil', systems: 'Systèmes', services: 'Services', store: 'Boutique',
    language: 'Langue', openMenu: 'Ouvrir le menu', closeMenu: 'Fermer le menu',
  },
});

interface NavLink {
  key: 'home' | 'systems' | 'services' | 'store';
  path: string;
  fragment?: string;
  icon?: string;
}

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  isScrolled = false;
  isMobileMenuOpen = false;
  isLangMenuOpen = false;
  protected readonly loadingService = inject(LoadingService);
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.scope(I18N);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // As âncoras da home continuam em português: são ids de seção, não texto visível.
  readonly links: NavLink[] = [
    { key: 'home', path: '/inicio' },
    { key: 'systems', path: '/inicio', fragment: 'sistemas' },
    { key: 'services', path: '/inicio', fragment: 'serviços' },
    { key: 'store', path: '/loja', icon: 'fa-solid fa-store' },
  ];

  /** Fundo branco (texto escuro): depois do herói ou com o menu do celular aberto. */
  get solid(): boolean {
    return this.isScrolled || this.isMobileMenuOpen;
  }

  get currentLang(): LangOption {
    return this.i18n.langs.find((l) => l.code === this.i18n.lang())!;
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // A transição acontece quando passa da seção hero-cube estendida
    // A seção agora vai até o título (100vh + 80px de extensão - 100px do título sobreposto)
    // Navbar muda quando passa do título branco
    const heroSectionHeight = window.innerHeight + 80 - 100; // calc(100vh + 80px - 100px)
    this.isScrolled = window.scrollY > heroSectionHeight;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.isLangMenuOpen) return;
    const lang = this.host.nativeElement.querySelector('.lang');
    if (lang && !lang.contains(event.target as Node)) this.isLangMenuOpen = false;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.isLangMenuOpen = false;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  toggleLangMenu(event: Event) {
    event.stopPropagation();
    this.isLangMenuOpen = !this.isLangMenuOpen;
  }

  closeLangMenu() {
    this.isLangMenuOpen = false;
  }

  setLang(lang: Lang) {
    this.i18n.set(lang);
    this.isLangMenuOpen = false;
  }

  handleNavigation(event: Event, path: string, fragment?: string) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const urlTree = this.router.createUrlTree([path]);
    const isActive = this.router.isActive(urlTree, {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored'
    });

    if (isActive) {
      this.router.navigate([path], { fragment });
      return;
    }

    this.loadingService.startNavigation();
    this.cdr.detectChanges();

    // Allow two frames for the spinner to paint before navigation begins.
    // First rAF: schedule after current event; second rAF: ensure paint; then navigate.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.router.navigate([path], { fragment })
          .then(() => {
            // Ensure spinner is turned off if navigation finishes or is skipped (e.g. same URL)
            this.loadingService.endNavigation();
          })
          .catch(() => {
            this.loadingService.endNavigation();
          });
      });
    });
  }
}
