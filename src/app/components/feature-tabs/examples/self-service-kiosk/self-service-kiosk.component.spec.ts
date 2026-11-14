import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SelfServiceKioskComponent } from './self-service-kiosk.component';
import { CameraService } from '../../../../services/camera.service';
import { I18nService } from '../../../../i18n/i18n.service';

/** Intl usa espaço não separável entre "R$" e o valor: normaliza para comparar texto. */
const text = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();

describe('SelfServiceKioskComponent', () => {
  let component: SelfServiceKioskComponent;
  let fixture: ComponentFixture<SelfServiceKioskComponent>;
  let mockCameraService: jasmine.SpyObj<CameraService>;

  beforeEach(async () => {
    mockCameraService = jasmine.createSpyObj('CameraService', ['startCamera', 'stopCamera']);
    mockCameraService.startCamera.and.returnValue(Promise.resolve(new MediaStream()));

    await TestBed.configureTestingModule({
      imports: [SelfServiceKioskComponent],
      providers: [{ provide: CameraService, useValue: mockCameraService }],
    }).compileComponents();

    // Os textos conferidos abaixo são os do português.
    TestBed.inject(I18nService).set('pt');

    fixture = TestBed.createComponent(SelfServiceKioskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Sem modo vitrine nos testes: cada teste dirige o totem à mão.
    component.stopShowcase();
  });

  afterEach(() => {
    TestBed.inject(I18nService).set('pt');
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display mode toggle buttons in Portuguese: Pedidos and Fotos', () => {
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('.mode-toggle button');
    expect(buttons.length).toBe(2);
    expect(text(buttons[0].textContent)).toContain('Pedidos');
    expect(text(buttons[1].textContent)).toContain('Fotos');
  });

  it('should follow the language of the page', () => {
    TestBed.inject(I18nService).set('en');
    fixture.detectChanges();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('.mode-toggle button');
    expect(text(buttons[0].textContent)).toContain('Orders');
    expect(text(buttons[1].textContent)).toContain('Photos');
  });

  it('should switch modes without asking for the camera', () => {
    expect(component.mode()).toBe('food');

    component.setMode('photo');
    fixture.detectChanges();
    expect(component.mode()).toBe('photo');
    expect(component.view()).toBe('photo');
    // A câmera real só liga por gesto do usuário.
    expect(mockCameraService.startCamera).not.toHaveBeenCalled();

    component.setMode('food');
    fixture.detectChanges();
    expect(component.mode()).toBe('food');
    expect(mockCameraService.stopCamera).not.toHaveBeenCalled();
  });

  it('should start and release the camera only when the user asks', async () => {
    component.setMode('photo');
    await component.toggleCamera();
    expect(mockCameraService.startCamera).toHaveBeenCalledTimes(1);
    expect(component.cam()).toBe('on');

    component.setMode('food');
    expect(mockCameraService.stopCamera).toHaveBeenCalledTimes(1);
    expect(component.cam()).toBe('off');
  });

  it('should explain when the camera is blocked', async () => {
    mockCameraService.startCamera.and.returnValue(Promise.reject({ name: 'NotAllowedError' }));
    component.setMode('photo');
    await component.toggleCamera();
    fixture.detectChanges();

    expect(component.cam()).toBe('off');
    expect(component.camError()).toBe('denied');
    const message = (fixture.nativeElement as HTMLElement).querySelector('.k-cam-msg');
    expect(text(message?.textContent)).toContain('Câmera bloqueada');
  });

  it('should contain the offer text printed on the photo', () => {
    expect(text(component.polaroidOfferText)).toBe('Totem a partir de R$ 3.199 ou 12x de R$ 299 sem juros');
  });

  it('should add products to the cart and total them', () => {
    component.startOrder();
    const [first, second] = component.currentProducts();
    component.addToCart(first);
    component.addToCart(second);
    expect(component.cart().length).toBe(2);
    expect(component.total()).toBeCloseTo(first.price + second.price, 2);

    component.removeFromCart(component.cart()[0].uid);
    expect(component.cart().length).toBe(1);
  });

  it('should print the receipt through the slot and return to the start', fakeAsync(() => {
    component.startOrder();
    component.addToCart(component.currentProducts()[0]);
    component.checkout();
    expect(component.state()).toBe('processing');

    tick(1900);
    expect(component.state()).toBe('success');
    tick(550);
    expect(component.receipt()).toBe('printing');
    tick(2500 + 1700);
    expect(component.receipt()).toBe('cut');
    tick(760 + 450 + 450);
    expect(component.receipt()).toBe('hidden');
    expect(component.state()).toBe('idle');
    expect(component.cart().length).toBe(0);
  }));

  it('should eject the photo through the slot and then deliver it', fakeAsync(() => {
    component.setMode('photo');
    fixture.detectChanges();

    component.capturePhoto();
    tick(280 + 80);
    fixture.detectChanges();
    expect(component.photoState()).toBe('printing');
    expect(component.paper()).toBe('eject');
    expect(component.capturedPhoto()).toBeTruthy();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(text(compiled.querySelector('.k-print-msg .on')?.textContent)).toContain('Imprimindo sua foto');
    expect(text(compiled.querySelector('.k-polaroid figcaption b')?.textContent)).toBe(
      'Totem a partir de R$ 3.199 ou 12x de R$ 299 sem juros',
    );

    tick(2700 + 250);
    expect(component.paper()).toBe('present');
    expect(component.photoState()).toBe('delivered');
    tick(900);
  }));

  it('should print again and take a new photo from the delivered state', fakeAsync(() => {
    component.setMode('photo');
    component.capturePhoto();
    tick(280 + 80 + 2700 + 250 + 900);
    expect(component.photoState()).toBe('delivered');

    component.simulatePrintAgain();
    expect(component.paper()).toBe('exit');
    tick(520 + 80);
    expect(component.paper()).toBe('eject');
    tick(2700 + 250 + 900);
    expect(component.photoState()).toBe('delivered');

    component.retakePhoto();
    tick(520 + 450);
    expect(component.photoState()).toBe('idle');
    expect(component.paper()).toBe('hidden');
    expect(component.capturedPhoto()).toBeNull();
  }));

  it('should trigger photo download when savePhoto is called', fakeAsync(() => {
    component.setMode('photo');
    component.capturePhoto();
    tick(280 + 80 + 2700 + 250 + 900);
    fixture.detectChanges();
    spyOn(document, 'createElement').and.callThrough();

    component.savePhoto();
    expect(document.createElement).toHaveBeenCalledWith('a');
  }));
});
