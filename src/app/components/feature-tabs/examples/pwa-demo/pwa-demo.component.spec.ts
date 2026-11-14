import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { I18nService } from '../../../../i18n/i18n.service';
import { PwaDemoComponent } from './pwa-demo.component';

describe('PwaDemoComponent', () => {
  let component: PwaDemoComponent;
  let fixture: ComponentFixture<PwaDemoComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwaDemoComponent],
    }).compileComponents();

    // Os textos conferidos abaixo são os do português.
    TestBed.inject(I18nService).set('pt');
    fixture = TestBed.createComponent(PwaDemoComponent);
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

  it('should render the phone with the sales list right away', () => {
    expect(el.querySelector('.frame')).toBeTruthy();
    expect(el.querySelector('.app-header')).toBeTruthy();
    expect(el.querySelectorAll('.sale').length).toBe(3);
    expect(el.querySelector('.app-name')?.textContent).toContain('SGA CTRLB');
    expect(el.querySelector('figcaption')?.textContent).toContain('Demonstração interativa');
  });

  it('should show the four steps in plain language', () => {
    expect(el.querySelector('h4')?.textContent).toContain('Seu negócio não para quando a internet cai');
    const titles = Array.from(el.querySelectorAll('.step-head b')).map((b) => b.textContent?.trim());
    expect(titles).toEqual([
      'Instala em um toque',
      'Caiu a internet? Continua vendendo',
      'Tudo salvo no aparelho',
      'Voltou o sinal? Sincroniza e avisa',
    ]);
  });

  it('should translate when the language changes', () => {
    TestBed.inject(I18nService).set('en');
    fixture.detectChanges();
    expect(el.querySelector('h4')?.textContent).toContain('Your business keeps running');
    expect(el.querySelector('.conn')?.textContent).toContain('Online');
  });

  it('should start online with nothing pending', () => {
    expect(component.offline).toBeFalse();
    expect(component.pendingCount).toBe(0);
    expect(component.syncedCount).toBe(3);
    expect(el.querySelector('.conn')?.textContent).toContain('Online');
  });

  it('should install the app from the install sheet', fakeAsync(() => {
    component.selectStep(0);
    fixture.detectChanges();
    expect(component.installed).toBeFalse();
    expect(el.querySelector('.install')?.classList.contains('shown')).toBeTrue();

    component.install();
    tick(500);
    fixture.detectChanges();
    expect(component.installed).toBeTrue();
    expect(el.querySelector('.install')?.classList.contains('shown')).toBeFalse();
    component.stopAutoPlay();
  }));

  it('should go offline and update the indicators', () => {
    component.toggleOffline();
    fixture.detectChanges();

    expect(component.offline).toBeTrue();
    expect(component.activeStep).toBe(1);
    expect(el.querySelector('.conn')?.textContent).toContain('Modo avião');
    expect(el.querySelector('.banner')?.textContent).toContain('Sem sinal de internet');
  });

  it('should keep offline sales on the device as pending', () => {
    component.toggleOffline();
    component.addSale();
    fixture.detectChanges();

    expect(component.sales.length).toBe(4);
    expect(component.sales[0].state).toBe('pending');
    expect(component.pendingCount).toBe(1);
    expect(component.activeStep).toBe(2);
    expect(el.querySelector('.pill-pending')?.textContent).toContain('No aparelho');
  });

  it('should sync pending sales and notify when the connection returns', fakeAsync(() => {
    component.toggleOffline();
    component.addSale();
    component.toggleOffline();
    fixture.detectChanges();

    expect(component.offline).toBeFalse();
    expect(component.syncing).toBeTrue();
    expect(component.sales[0].state).toBe('syncing');

    tick(1800);
    fixture.detectChanges();
    expect(component.sales[0].state).toBe('synced');
    expect(component.pendingCount).toBe(0);
    expect(component.activeStep).toBe(3);
    expect(component.noticeShown).toBeTrue();
    expect(el.querySelector('.push')?.classList.contains('shown')).toBeTrue();

    tick(4300);
    expect(component.noticeShown).toBeFalse();
    component.stopAutoPlay();
  }));

  it('should not lose sales when the signal drops in the middle of a sync', () => {
    component.toggleOffline();
    component.addSale();
    component.toggleOffline();
    expect(component.syncingCount).toBe(1);

    component.toggleOffline();
    expect(component.offline).toBeTrue();
    expect(component.syncingCount).toBe(0);
    expect(component.pendingCount).toBe(1);
    expect(component.toast?.key).toBe('tSyncCut');
  });

  it('should make every step reachable on its own', fakeAsync(() => {
    component.selectStep(1);
    expect(component.offline).toBeTrue();
    expect(component.activeStep).toBe(1);

    component.selectStep(2);
    expect(component.sales[0].state).toBe('pending');
    expect(component.activeStep).toBe(2);

    component.selectStep(3);
    expect(component.offline).toBeFalse();
    expect(component.activeStep).toBe(3);
    expect(component.sales[0].state).toBe('syncing');

    tick(1800);
    expect(component.sales[0].state).toBe('synced');
    component.stopAutoPlay();
  }));

  it('should send a notification on demand', fakeAsync(() => {
    component.sendNotice();
    fixture.detectChanges();
    expect(component.noticeShown).toBeTrue();
    expect(component.notice?.key).toBe('nNewOrder');
    tick(4300);
    expect(component.noticeShown).toBeFalse();
    component.stopAutoPlay();
  }));
});
