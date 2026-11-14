import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Home } from './home';
import { I18nService } from '../../i18n/i18n.service';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let i18n: I18nService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      // Componentes filhos (abas de serviços, contato) usam routerLink.
      providers: [provideRouter([])]
    })
    .compileComponents();

    // Idioma fixo: os testes abaixo conferem os textos em português.
    i18n = TestBed.inject(I18nService);
    i18n.set('pt');
    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('mostra o título e a lista de sistemas no idioma atual', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.title-section h2')?.textContent).toContain('Nossos produtos');
    expect(el.querySelectorAll('.sistemas-item').length).toBe(component.softwareItems.length);
    expect(el.querySelector('.sistemas-item__name')?.textContent).toContain('CTRLB Cockpit');

    i18n.set('en');
    fixture.detectChanges();
    expect(el.querySelector('.title-section h2')?.textContent).toContain('Our products');
    expect(el.querySelectorAll('.sistemas-item__name')[1]?.textContent).toContain('Gyms & Studios');
  });

  it('mantém as âncoras usadas pela navbar', () => {
    const el: HTMLElement = fixture.nativeElement;
    for (const id of ['sistemas', 'serviços', 'contato']) {
      expect(el.querySelector(`[id="${id}"]`)).withContext(id).not.toBeNull();
    }
  });
});
