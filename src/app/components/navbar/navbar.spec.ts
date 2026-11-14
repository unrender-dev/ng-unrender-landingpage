import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, RouterModule } from '@angular/router';
import { By } from '@angular/platform-browser';

import { Navbar } from './navbar';
import { I18nService } from '../../i18n/i18n.service';

/** `href` gerado pelo RouterLink, decodificado (a âncora `serviços` sai percent-encoded). */
const href = (el: { nativeElement: HTMLAnchorElement }) => decodeURI(el.nativeElement.getAttribute('href') ?? '');

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Navbar],
      imports: [RouterModule],
      providers: [provideRouter([])]
    })
    .compileComponents();

    // Os textos esperados abaixo são os do português.
    TestBed.inject(I18nService).set('pt');
    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Desktop menu', () => {
    it('should have exactly 4 navigation links', () => {
      const desktopList = fixture.debugElement.query(By.css('.lg\\:flex ul'));
      const links = desktopList.queryAll(By.css('li a'));
      expect(links.length).toBe(4);
    });

    it('should contain Início, Sistemas, Serviços and Loja', () => {
      const desktopList = fixture.debugElement.query(By.css('.lg\\:flex ul'));
      const linkTexts = desktopList.queryAll(By.css('li a')).map(el => el.nativeElement.textContent.trim());
      expect(linkTexts).toEqual(['Início', 'Sistemas', 'Serviços', 'Loja']);
    });

    it('should not contain Contato, Sobre, Games or Trabalhe Conosco', () => {
      const desktopList = fixture.debugElement.query(By.css('.lg\\:flex ul'));
      const text = desktopList.nativeElement.textContent;
      expect(text).not.toContain('Contato');
      expect(text).not.toContain('Sobre');
      expect(text).not.toContain('Games');
      expect(text).not.toContain('Trabalhe Conosco');
    });

    it('should format Loja consistently without pill/badge classes and with store icon', () => {
      const lojaLink = fixture.debugElement.query(By.css('.lg\\:flex ul a[href="/loja"]'));
      expect(lojaLink).toBeTruthy();

      const classes = lojaLink.nativeElement.className;
      expect(classes).toContain('hover:text-unrender-accent');
      expect(classes).not.toContain('rounded-full');
      expect(classes).not.toContain('bg-unrender-accent');
      expect(classes).not.toContain('border');
      expect(classes).not.toContain('font-bold');

      const icon = lojaLink.query(By.css('i.fa-store'));
      expect(icon).toBeTruthy();
      expect(lojaLink.nativeElement.textContent.trim()).toBe('Loja');
    });

    it('should configure routerLinks and fragments correctly for all desktop links', () => {
      const desktopLinks = fixture.debugElement.queryAll(By.css('.lg\\:flex ul li a'));
      expect(desktopLinks.map(href)).toEqual(['/inicio', '/inicio#sistemas', '/inicio#serviços', '/loja']);
    });
  });

  describe('Mobile menu', () => {
    it('should have exactly 4 navigation links', () => {
      const mobileList = fixture.debugElement.query(By.css('.lg\\:hidden ul'));
      const links = mobileList.queryAll(By.css('li a'));
      expect(links.length).toBe(4);
    });

    it('should contain Início, Sistemas, Serviços and Loja', () => {
      const mobileList = fixture.debugElement.query(By.css('.lg\\:hidden ul'));
      const linkTexts = mobileList.queryAll(By.css('li a')).map(el => el.nativeElement.textContent.trim());
      expect(linkTexts).toEqual(['Início', 'Sistemas', 'Serviços', 'Loja']);
    });

    it('should not contain Contato, Sobre, Games or Trabalhe Conosco', () => {
      const mobileList = fixture.debugElement.query(By.css('.lg\\:hidden ul'));
      const text = mobileList.nativeElement.textContent;
      expect(text).not.toContain('Contato');
      expect(text).not.toContain('Sobre');
      expect(text).not.toContain('Games');
      expect(text).not.toContain('Trabalhe Conosco');
    });

    it('should configure routerLinks and fragments correctly for all mobile links', () => {
      const mobileLinks = fixture.debugElement.queryAll(By.css('.lg\\:hidden ul li a'));
      expect(mobileLinks.map(href)).toEqual(['/inicio', '/inicio#sistemas', '/inicio#serviços', '/loja']);
    });

    it('should format mobile Loja consistently without pill/badge classes and with store icon', () => {
      const mobileLoja = fixture.debugElement.query(By.css('.lg\\:hidden ul a[href="/loja"]'));
      expect(mobileLoja).toBeTruthy();

      const classes = mobileLoja.nativeElement.className;
      expect(classes).toContain('hover:bg-gray-100');
      expect(classes).not.toContain('bg-unrender-accent');
      expect(classes).not.toContain('border');
      expect(classes).not.toContain('font-bold');

      const icon = mobileLoja.query(By.css('i.fa-store'));
      expect(icon).toBeTruthy();
      expect(mobileLoja.nativeElement.textContent.trim()).toBe('Loja');
    });

    it('should toggle and close mobile menu state', () => {
      expect(component.isMobileMenuOpen).toBeFalse();
      component.toggleMobileMenu();
      expect(component.isMobileMenuOpen).toBeTrue();
      component.closeMobileMenu();
      expect(component.isMobileMenuOpen).toBeFalse();
    });

    it('should close mobile menu when clicking a mobile navigation link', () => {
      component.isMobileMenuOpen = true;
      fixture.detectChanges();

      const mobileLoja = fixture.debugElement.query(By.css('.lg\\:hidden ul a[href="/loja"]'));
      mobileLoja.triggerEventHandler('click', {
        preventDefault: () => {},
        stopPropagation: () => {},
        stopImmediatePropagation: () => {}
      });
      expect(component.isMobileMenuOpen).toBeFalse();
    });
  });

  describe('Language switcher', () => {
    it('should offer Portuguese, English, Spanish and French', () => {
      const options = fixture.debugElement.queryAll(By.css('.lang__option'));
      expect(options.map(o => o.nativeElement.getAttribute('lang'))).toEqual(['pt-BR', 'en-US', 'es-ES', 'fr-FR']);
    });

    it('should translate the links when the language changes', () => {
      component.setLang('fr');
      fixture.detectChanges();
      const desktopList = fixture.debugElement.query(By.css('.lg\\:flex ul'));
      const linkTexts = desktopList.queryAll(By.css('li a')).map(el => el.nativeElement.textContent.trim());
      expect(linkTexts).toEqual(['Accueil', 'Systèmes', 'Services', 'Boutique']);
      expect(document.documentElement.lang).toBe('fr-FR');
      component.setLang('pt');
    });

    it('should close the language menu after choosing', () => {
      component.isLangMenuOpen = true;
      component.setLang('en');
      expect(component.isLangMenuOpen).toBeFalse();
      component.setLang('pt');
    });
  });

  describe('Navigation handling', () => {
    it('should prevent default and stop propagation on navigation event', () => {
      const event = jasmine.createSpyObj('Event', ['preventDefault', 'stopPropagation', 'stopImmediatePropagation']);
      component.handleNavigation(event, '/loja');

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(event.stopImmediatePropagation).toHaveBeenCalled();
    });
  });

  describe('Scroll behavior', () => {
    it('should update isScrolled based on scroll position', () => {
      component.onWindowScroll();
      expect(typeof component.isScrolled).toBe('boolean');
    });
  });
});
