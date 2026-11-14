import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { I18nService } from '../../../../i18n/i18n.service';
import { DesktopPwaDemoComponent } from './desktop-pwa-demo.component';

describe('DesktopPwaDemoComponent', () => {
  let component: DesktopPwaDemoComponent;
  let fixture: ComponentFixture<DesktopPwaDemoComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DesktopPwaDemoComponent],
    }).compileComponents();

    // Os textos conferidos abaixo são os do português.
    TestBed.inject(I18nService).set('pt');
    fixture = TestBed.createComponent(DesktopPwaDemoComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    component.stopAutoPlay();
  });

  afterEach(() => {
    component.stopAutoPlay();
    fixture.destroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the window with title bar, PWA badge and the sales list', () => {
    expect(el.querySelector('.window')).toBeTruthy();
    expect(el.querySelector('.app-title')?.textContent).toContain('SGA CTRLB · Frente de caixa');
    expect(el.querySelector('.pwa-pill')?.textContent).toContain('PWA');
    expect(el.querySelectorAll('.sale').length).toBe(4);
    expect(el.querySelector('.win-foot')?.textContent).toContain('Demonstração interativa');
  });

  it('should adapt the copy to the context input', () => {
    component.context = 'web';
    fixture.detectChanges();
    expect(el.querySelector('.side h4')?.textContent).toContain('Seu sistema web na área de trabalho');

    component.context = 'desktop';
    fixture.detectChanges();
    expect(el.querySelector('.side h4')?.textContent).toContain('Frente de caixa que continua vendendo sem internet');
  });

  it('should translate when the language changes', () => {
    TestBed.inject(I18nService).set('fr');
    fixture.detectChanges();
    expect(el.querySelector('.app-title')?.textContent).toContain('Caisse');
    expect(el.querySelector('.sale .c-amount')?.textContent).toContain('R$');
  });

  it('should show the four steps as buttons', () => {
    const steps = el.querySelectorAll('button.step');
    expect(steps.length).toBe(4);
    expect(steps[0].getAttribute('aria-current')).toBe('step');
    expect(steps[1].getAttribute('aria-current')).toBeNull();
    const titles = Array.from(el.querySelectorAll('.step-head b')).map((b) => b.textContent?.trim());
    expect(titles).toEqual([
      'Instala em um clique',
      'Caiu a internet? O caixa não para',
      'Tudo salvo no computador',
      'Voltou a conexão? Sincroniza sozinho',
    ]);
  });

  it('should start online with everything in the cloud', () => {
    expect(component.offline).toBeFalse();
    expect(component.pendingCount).toBe(0);
    expect(component.syncedCount).toBe(4);
    expect(el.querySelectorAll('.sum')[1]?.textContent).toContain('Tudo na nuvem');
  });

  it('should go offline and update banner and badge', () => {
    component.toggleOffline();
    fixture.detectChanges();
    expect(component.offline).toBeTrue();
    expect(component.activeStep).toBe(1);
    expect(el.querySelector('.conn')?.textContent).toContain('Sem internet');
    expect(el.querySelector('.banner-face.shown')?.textContent).toContain('Rede fora do ar');
  });

  it('should keep offline sales on the computer as pending', () => {
    component.toggleOffline();
    component.addSale();
    fixture.detectChanges();
    expect(component.sales.length).toBe(5);
    expect(component.sales[0].state).toBe('pending');
    expect(component.activeStep).toBe(2);
    expect(el.querySelector('.pill-pending')?.textContent).toContain('Salvo no PC');
  });

  it('should total the sales of the day', () => {
    // 269,70 + 214,00 + 89,90 + 125,00
    expect(component.total).toBeCloseTo(698.6, 2);
    component.addSale();
    expect(component.total).toBeGreaterThan(698.6);
  });

  it('should sync pending sales when the connection returns', fakeAsync(() => {
    component.toggleOffline();
    component.addSale();
    component.toggleOffline();
    fixture.detectChanges();

    expect(component.syncingCount).toBe(1);
    expect(el.querySelectorAll('.sum')[1]?.textContent).toContain('enviando');

    tick(1800);
    fixture.detectChanges();
    expect(component.syncingCount).toBe(0);
    expect(component.syncedCount).toBe(5);
    expect(component.noticeShown).toBeTrue();
    expect(el.querySelectorAll('.sum')[1]?.textContent).toContain('Tudo na nuvem');
    component.stopAutoPlay();
  }));

  it('should revert in-flight sales to pending if the network drops during a sync', () => {
    component.toggleOffline();
    component.addSale();
    component.toggleOffline();
    expect(component.syncingCount).toBe(1);

    component.toggleOffline();
    expect(component.offline).toBeTrue();
    expect(component.pendingCount).toBe(1);
    expect(component.syncingCount).toBe(0);
    expect(component.toast?.key).toBe('tSyncCut');
  });

  it('should filter sales by category without removing rows from the DOM', () => {
    component.setCategory('planos');
    fixture.detectChanges();
    expect(component.filteredSales.every((s) => s.category === 'planos')).toBeTrue();
    expect(el.querySelectorAll('.sale').length).toBe(4);
    expect(el.querySelectorAll('.sale.leaving').length).toBe(4 - component.filteredSales.length);

    component.setCategory('todos');
    expect(component.filteredSales.length).toBe(component.sales.length);
  });

  it('should switch the window frame', () => {
    component.setOs('macos');
    fixture.detectChanges();
    expect(el.querySelector('.window')?.classList.contains('os-macos')).toBeTrue();
    component.setOs('linux');
    fixture.detectChanges();
    expect(el.querySelector('.window')?.classList.contains('os-linux')).toBeTrue();
  });

  it('should make every step reachable on its own', () => {
    component.selectStep(1);
    expect(component.activeStep).toBe(1);
    expect(component.offline).toBeTrue();

    component.selectStep(2);
    expect(component.activeStep).toBe(2);
    expect(component.pendingCount).toBeGreaterThanOrEqual(1);

    component.selectStep(0);
    expect(component.activeStep).toBe(0);
    expect(component.offline).toBeFalse();
    expect(component.installed).toBeFalse();
  });
});
