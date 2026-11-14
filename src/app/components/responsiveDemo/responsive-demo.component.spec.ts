import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../i18n/i18n.service';
import { ResponsiveDemoComponent } from './responsive-demo.component';

describe('ResponsiveDemoComponent', () => {
  let component: ResponsiveDemoComponent;
  let fixture: ComponentFixture<ResponsiveDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResponsiveDemoComponent]
    }).compileComponents();

    // os textos afirmados abaixo são os de português
    TestBed.inject(I18nService).set('pt');
    fixture = TestBed.createComponent(ResponsiveDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should present the real CTRLB composition by default', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const shot = compiled.querySelector('.rd-shot') as HTMLImageElement | null;

    expect(compiled.querySelector('.rd-tag')?.textContent).toContain('Responsividade no SGA CTRLB');
    expect(shot?.getAttribute('src')).toContain('ctrlb-responsive-devices.webp');
    expect(compiled.querySelector('.rd-real')?.classList).toContain('on');
    expect(compiled.querySelector('.rd-badge')?.textContent).toContain('captura real');
  });

  it('should switch devices when asked', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    component.switchToDevice('tablet');
    fixture.detectChanges();
    expect(component.currentDevice).toBe('tablet');
    expect(compiled.querySelector('.device-frame.tablet')).toBeTruthy();

    component.switchToDevice('phone');
    fixture.detectChanges();
    expect(component.currentDevice).toBe('phone');
    expect(compiled.querySelector('.device-frame.phone')).toBeTruthy();

    component.switchToDevice('desktop');
    fixture.detectChanges();
    expect(component.currentDevice).toBe('desktop');
    expect(compiled.querySelector('.device-frame.desktop')).toBeTruthy();
  });

  it('should label the meeting room as an interactive demonstration', () => {
    component.setView('demo');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.rd-demo')?.classList).toContain('on');
    expect(compiled.querySelector('.rd-badge')?.textContent).toContain('ilustração');
    expect(compiled.querySelector('.rd-cap.on strong')?.textContent).toContain('demonstração interativa');
    expect(compiled.querySelector('.mt-ttl b')?.textContent).toContain('Alinhamento semanal');
  });

  it('should translate when the language changes', () => {
    const i18n = TestBed.inject(I18nService);
    i18n.set('en');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.rd-tag')?.textContent).toContain('Responsive design in SGA CTRLB');
    i18n.set('pt');
  });

  it('should keep the legacy resize hook working', () => {
    expect(() => component.onResize()).not.toThrow();
  });
});
