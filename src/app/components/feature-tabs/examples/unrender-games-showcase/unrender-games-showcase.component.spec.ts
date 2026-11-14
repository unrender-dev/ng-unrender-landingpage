import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UnrenderGamesShowcaseComponent } from './unrender-games-showcase.component';
import { ProdutosPosModalService } from '../../../../services/produtos-pos-modal.service';
import { I18nService } from '../../../../i18n/i18n.service';

describe('UnrenderGamesShowcaseComponent', () => {
  let component: UnrenderGamesShowcaseComponent;
  let fixture: ComponentFixture<UnrenderGamesShowcaseComponent>;
  let mockPosModal: jasmine.SpyObj<ProdutosPosModalService>;

  beforeEach(async () => {
    mockPosModal = jasmine.createSpyObj('ProdutosPosModalService', ['abrirPedido', 'abrirDetalhe']);
    // A sondagem de rede não deve sair do teste.
    spyOn(window, 'fetch').and.returnValue(new Promise<Response>(() => {}));

    await TestBed.configureTestingModule({
      imports: [UnrenderGamesShowcaseComponent],
      providers: [{ provide: ProdutosPosModalService, useValue: mockPosModal }],
    }).compileComponents();

    // Os textos conferidos abaixo são os em português.
    TestBed.inject(I18nService).set('pt');

    fixture = TestBed.createComponent(UnrenderGamesShowcaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the showcase component', () => {
    expect(component).toBeTruthy();
  });

  it('should have gamificacao as default active path', () => {
    expect(component.activePath).toBe('/gamificacao/');
    expect(component.currentFullUrl).toContain('/gamificacao/');
  });

  it('should always point to the public unrender.games site', () => {
    expect(component.currentFullUrl).toBe('https://unrender.games/gamificacao/');
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('5174');
    expect(text).not.toContain('localhost');
  });

  it('should render page tabs including gamificacao and loja', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const tabButtons = compiled.querySelectorAll('.ugs-tab');
    expect(tabButtons.length).toBe(3);

    const text = compiled.textContent || '';
    expect(text).toContain('Gamificação e totens 3D');
    expect(text).toContain('Loja de totens e hardware');
    expect(text).toContain('Home da Unrender Games');
  });

  it('should translate the page tabs when the language changes', () => {
    TestBed.inject(I18nService).set('en');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Kiosk & hardware store');
  });

  it('should switch routes when clicking a page tab', () => {
    component.selectRoute('/loja/');
    fixture.detectChanges();

    expect(component.activePath).toBe('/loja/');
    expect(component.currentFullUrl).toBe('https://unrender.games/loja/');
  });

  it('should enter the loading state when reloadIframe is called and settle on frame load', () => {
    component.reloadIframe();
    expect(component.isReloading).toBeTrue();

    component.onFrameLoad();
    expect(component.isReloading).toBeFalse();
    expect(component.status()).toBe('ready');
    component.ngOnDestroy();
  });

  it('should display totem highlight cards with quick order action', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.totem-card');
    expect(cards.length).toBe(3);

    const firstCardTitle = cards[0].querySelector('h5')?.textContent;
    expect(firstCardTitle).toContain('Totem interativo Slim 55"');

    const orderBtn = cards[0].querySelector('.btn-order') as HTMLButtonElement;
    orderBtn.click();
    expect(mockPosModal.abrirPedido).toHaveBeenCalledWith('totem-interativo-55');
  });
});
