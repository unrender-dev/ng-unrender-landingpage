import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProdutoPos } from '../../data/produtos-pos.data';
import { I18nService } from '../../i18n/i18n.service';
import { ModalidadePos, ProdutosPosModalService } from '../../services/produtos-pos-modal.service';
import { enviarContato, enviarEvento, slug } from '../../services/sga-ctrlb';
import { I18N } from './produtos-pos-modal.i18n';

type Quantidade = 'q1' | 'q2' | 'q3' | 'q6';

/** O resumo do pedido vai para a equipe comercial (SGA CTRLB), sempre em português. */
const QUANTIDADE_PT: Record<Quantidade, string> = {
  q1: '1 unidade',
  q2: '2 unidades',
  q3: '3 a 5 unidades',
  q6: '6+ unidades (lote corporativo)',
};

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Duração da animação de saída (igual à do SCSS). */
const SAIDA_MS = 180;

@Component({
  selector: 'app-produtos-pos-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './produtos-pos-modal.component.html',
  styleUrl: './produtos-pos-modal.component.scss',
})
export class ProdutosPosModalComponent implements OnDestroy {
  readonly modal = inject(ProdutosPosModalService);
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly router = inject(Router);

  private readonly dialogo = viewChild<ElementRef<HTMLElement>>('dialogo');

  /** Mantém o modal no DOM enquanto a animação de saída roda. */
  readonly visivel = signal(false);
  readonly fechando = signal(false);

  readonly termoBusca = signal('');
  readonly apenasProntaEntrega = signal(false);

  readonly quantidades: Quantidade[] = ['q1', 'q2', 'q3', 'q6'];
  pedidoNome = '';
  pedidoEmpresa = '';
  pedidoContato = '';
  pedidoQuantidade: Quantidade = 'q1';
  pedidoObservacoes = '';
  readonly pedidoEnviando = signal(false);
  readonly pedidoSucesso = signal(false);
  readonly pedidoErro = signal<'' | 'campos' | 'envio'>('');

  /** A busca procura no texto do idioma atual (o catálogo já chega traduzido). */
  readonly produtosFiltrados = computed<ProdutoPos[]>(() => {
    const cat = this.modal.selectedCategory();
    const q = this.termoBusca().trim().toLowerCase();
    const soEstoque = this.apenasProntaEntrega();
    return this.modal.catalogo().filter((p) => {
      const bateCat = cat === 'todos' || p.category === cat;
      const bateEstoque = !soEstoque || p.inStock;
      const bateBusca =
        !q ||
        [p.name, p.shortTitle, p.shortDesc, p.quickPitch, p.categoryLabel, p.sku, ...p.tags].some((txt) =>
          txt.toLowerCase().includes(q)
        );
      return bateCat && bateEstoque && bateBusca;
    });
  });

  readonly especificacoes = computed<[string, string][]>(() => {
    const prod = this.modal.selectedProduct();
    return prod?.techSpecs ? Object.entries(prod.techSpecs) : [];
  });

  private focoAnterior: HTMLElement | null = null;
  private rolagemTravada = false;
  private timerSaida: ReturnType<typeof setTimeout> | null = null;
  private overflowAnterior = '';
  private paddingAnterior = '';

  constructor() {
    effect(() => {
      const aberto = this.modal.isOpen();
      untracked(() => (aberto ? this.aoAbrir() : this.aoFechar()));
    });

    // Ao trocar de tela (catálogo → ficha → pedido), volta ao topo e leva o foco ao diálogo.
    effect(() => {
      this.modal.viewMode();
      untracked(() => {
        if (this.visivel()) this.focarDialogo(true);
      });
    });
  }

  ngOnDestroy(): void {
    if (this.timerSaida) clearTimeout(this.timerSaida);
    this.destravarRolagem();
  }

  /** A página da loja não precisa do atalho para ela mesma. */
  get naLoja(): boolean {
    return this.router.url.startsWith('/loja');
  }

  rotuloModalidade(m: ModalidadePos): string {
    return this.t(m === 'Locação Mensal (HaaS)' ? 'locacaoHaas' : 'venda');
  }

  get ehLocacao(): boolean {
    return this.modal.orderModality() === 'Locação Mensal (HaaS)';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modal.isOpen()) this.fechar();
  }

  /** Foco preso: Tab circula só entre os controles do diálogo. */
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const raiz = this.dialogo()?.nativeElement;
    if (!raiz) return;
    const itens = Array.from(raiz.querySelectorAll<HTMLElement>(FOCAVEIS)).filter((el) => el.offsetParent !== null);
    if (itens.length === 0) {
      event.preventDefault();
      return;
    }
    const primeiro = itens[0];
    const ultimo = itens[itens.length - 1];
    const ativo = document.activeElement;
    if (event.shiftKey && (ativo === primeiro || ativo === raiz)) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && ativo === ultimo) {
      event.preventDefault();
      primeiro.focus();
    }
  }

  /** Se o foco escapar (ex.: clique fora via leitor de tela), traz de volta. */
  @HostListener('document:focusin', ['$event'])
  onFocusIn(event: FocusEvent): void {
    if (!this.modal.isOpen()) return;
    const raiz = this.dialogo()?.nativeElement;
    if (raiz && event.target instanceof Node && !raiz.contains(event.target)) raiz.focus();
  }

  selecionarCategoria(catId: string): void {
    this.modal.selectedCategory.set(catId);
  }

  limparFiltros(): void {
    this.termoBusca.set('');
    this.apenasProntaEntrega.set(false);
    this.modal.selectedCategory.set('todos');
  }

  verDetalhe(produto: ProdutoPos): void {
    this.limparEstadoPedido();
    this.modal.abrirDetalhe(produto);
    const pt = this.modal.basePt(produto);
    enviarEvento([
      {
        tipo: 'servico_visualizado',
        alvo: slug(pt.name),
        rotulo: `Produto POS: ${pt.shortTitle}`,
      },
    ]);
  }

  iniciarPedido(produto: ProdutoPos, modalidade: ModalidadePos = 'Compra (Venda Definitiva)'): void {
    this.limparEstadoPedido();
    this.modal.abrirPedido(produto, modalidade);
    const pt = this.modal.basePt(produto);
    enviarEvento([
      {
        tipo: 'cta_clicado',
        alvo: `iniciar-pedido-${slug(pt.shortTitle)}`,
        rotulo: `Iniciar Pedido POS: ${pt.shortTitle} (${modalidade})`,
      },
    ]);
  }

  voltarCatalogo(): void {
    this.limparEstadoPedido();
    this.modal.viewMode.set('catalogo');
  }

  fechar(): void {
    this.modal.fechar();
  }

  registrarCliqueWhatsapp(produto: ProdutoPos, origem: string): void {
    const pt = this.modal.basePt(produto);
    enviarEvento([
      {
        tipo: 'whatsapp_clicado',
        alvo: `${origem}-${slug(pt.shortTitle)}`,
        rotulo: `WhatsApp POS: ${pt.shortTitle}`,
      },
    ]);
  }

  async enviarPedidoSga(): Promise<void> {
    if (this.pedidoEnviando()) return;
    if (!this.pedidoNome.trim() || !this.pedidoContato.trim()) {
      this.pedidoErro.set('campos');
      return;
    }

    // O pedido cai na fila comercial em português, qualquer que seja o idioma do visitante.
    const produto = this.modal.basePt(this.modal.selectedProduct());
    const modalidade = this.modal.orderModality();
    this.pedidoEnviando.set(true);
    this.pedidoErro.set('');

    const resumoPedido = [
      `[PEDIDO / ORÇAMENTO LOJA POS UNRENDER]`,
      `Equipamento: ${produto.name} (SKU: ${produto.sku})`,
      `Modalidade: ${modalidade}`,
      `Valor de referência: ${this.ehLocacao ? produto.priceRent : produto.priceSale}`,
      `Quantidade: ${QUANTIDADE_PT[this.pedidoQuantidade]}`,
      this.pedidoEmpresa.trim() ? `Empresa: ${this.pedidoEmpresa.trim()}` : null,
      this.pedidoObservacoes.trim() ? `Observações: ${this.pedidoObservacoes.trim()}` : null,
      `Idioma do visitante: ${this.i18n.lang()}`,
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      enviarEvento([
        {
          tipo: 'servico_interesse',
          alvo: slug(produto.name),
          rotulo: `Pedido POS (${modalidade}): ${produto.shortTitle}`,
        },
      ]);
      await enviarContato({
        nome: this.pedidoEmpresa.trim()
          ? `${this.pedidoNome.trim()} (${this.pedidoEmpresa.trim()})`
          : this.pedidoNome.trim(),
        contato: this.pedidoContato.trim(),
        mensagem: resumoPedido,
      });
      this.pedidoSucesso.set(true);
    } catch {
      this.pedidoErro.set('envio');
    } finally {
      this.pedidoEnviando.set(false);
    }
  }

  private limparEstadoPedido(): void {
    this.pedidoSucesso.set(false);
    this.pedidoErro.set('');
  }

  private aoAbrir(): void {
    if (this.timerSaida) {
      clearTimeout(this.timerSaida);
      this.timerSaida = null;
    }
    if (!this.visivel()) {
      this.focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.travarRolagem();
    }
    this.fechando.set(false);
    this.visivel.set(true);
    this.focarDialogo(false);
  }

  private aoFechar(): void {
    if (!this.visivel() || this.fechando()) return;
    this.fechando.set(true);
    this.timerSaida = setTimeout(() => {
      this.timerSaida = null;
      this.visivel.set(false);
      this.fechando.set(false);
      this.destravarRolagem();
      // Devolve o foco a quem abriu o modal.
      this.focoAnterior?.focus?.({ preventScroll: true });
      this.focoAnterior = null;
    }, SAIDA_MS);
  }

  private focarDialogo(rolarAoTopo: boolean): void {
    // Espera o template renderizar a tela nova antes de focar.
    setTimeout(() => {
      const raiz = this.dialogo()?.nativeElement;
      if (!raiz) return;
      if (rolarAoTopo) raiz.querySelector<HTMLElement>('.pos-panel')?.scrollTo({ top: 0 });
      raiz.focus({ preventScroll: true });
    });
  }

  private travarRolagem(): void {
    if (this.rolagemTravada) return;
    this.rolagemTravada = true;
    const corpo = document.body;
    const barra = window.innerWidth - document.documentElement.clientWidth;
    this.overflowAnterior = corpo.style.overflow;
    this.paddingAnterior = corpo.style.paddingRight;
    corpo.style.overflow = 'hidden';
    // Compensa a barra de rolagem que some, para a página não "pular".
    if (barra > 0) corpo.style.paddingRight = `${barra}px`;
  }

  private destravarRolagem(): void {
    if (!this.rolagemTravada) return;
    this.rolagemTravada = false;
    document.body.style.overflow = this.overflowAnterior;
    document.body.style.paddingRight = this.paddingAnterior;
  }
}
