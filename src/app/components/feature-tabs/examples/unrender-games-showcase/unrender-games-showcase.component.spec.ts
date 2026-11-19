import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { UnrenderGamesShowcaseComponent } from './unrender-games-showcase.component';
import { ProdutosPosModalService } from '../../../../services/produtos-pos-modal.service';
import { I18nService } from '../../../../i18n/i18n.service';

describe('UnrenderGamesShowcaseComponent', () => {
  let component: UnrenderGamesShowcaseComponent;
  let fixture: ComponentFixture<UnrenderGamesShowcaseComponent>;
  let mockPosModal: jasmine.SpyObj<ProdutosPosModalService>;

  beforeEach(async () => {
    mockPosModal = jasmine.createSpyObj('ProdutosPosModalService', ['abrirPedido', 'abrirDetalhe', 'produtoPorId']);
    (mockPosModal as any).whatsappBase = signal('https://wa.me/5565999207154');
    mockPosModal.produtoPorId.and.callFake((id: string) =>
      id === 'totem-interativo-55' ? ({ id, priceSale: 'R$ 3.499', priceRent: 'R$ 329 / mês', image: '/x.svg' } as any) : undefined,
    );

    await TestBed.configureTestingModule({
      imports: [UnrenderGamesShowcaseComponent],
      providers: [{ provide: ProdutosPosModalService, useValue: mockPosModal }],
    }).compileComponents();

    TestBed.inject(I18nService).set('pt');
    fixture = TestBed.createComponent(UnrenderGamesShowcaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => component.ngOnDestroy());

  it('renderiza os quatro jogos sem depender de site externo', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.ugs-game-tab').length).toBe(4);
    expect(el.querySelector('iframe')).toBeNull();
    expect(el.textContent).not.toContain('unrender.games');
  });

  it('troca de jogo pela aba', () => {
    component.selectGame('memory');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.mem-card').length).toBe(12);
  });

  it('quiz soma pontos na resposta certa e abre a captação de lead no fim', () => {
    component.selectGame('quiz');
    for (let i = 0; i < component.quiz.length; i++) {
      component.answer(component.qCurrent().correct);
      component.nextQuestion();
    }
    expect(component.qHits()).toBe(component.quiz.length);
    expect(component.qDone()).toBeTrue();
    expect(component.leadState()).toBe('form');
  });

  it('formulário de lead só confirma com nome e consentimento, sem rede', () => {
    component.revealScratch();
    const ev = new Event('submit');
    component.submitLead(ev);
    expect(component.leadError()).toBeTrue();
    component.leadName.set('Teste');
    component.leadConsent.set(true);
    component.submitLead(new Event('submit'));
    expect(component.leadState()).toBe('done');
  });

  it('usa o preço do catálogo quando o totem existe e pede orçamento quando não existe', () => {
    const [comCatalogo, , semCatalogo] = component.totemHighlights;
    expect(component.saleLabel(comCatalogo)).toBe('R$ 3.499');
    expect(component.saleLabel(semCatalogo)).toContain('2.899');
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.totem-card');
    (cards[0].querySelector('.btn-order') as HTMLButtonElement).click();
    expect(mockPosModal.abrirPedido).toHaveBeenCalledWith('totem-interativo-55');
    expect(cards[2].querySelector('a.btn-order')?.getAttribute('href')).toContain('wa.me');
  });
});
