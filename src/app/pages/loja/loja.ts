import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Contact } from '../../components/contact/contact';
import { ProdutoPos } from '../../data/produtos-pos.data';
import { I18nService } from '../../i18n/i18n.service';
import { ModalidadePos, ProdutosPosModalService } from '../../services/produtos-pos-modal.service';
import { enviarEvento, slug } from '../../services/sga-ctrlb';
import { I18N } from './loja.i18n';

type Ordenacao = 'relevancia' | 'menor-preco' | 'maior-preco' | 'locacao';

@Component({
  selector: 'app-loja',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Contact],
  templateUrl: './loja.html',
  styleUrl: './loja.scss',
})
export class Loja implements OnInit {
  readonly modal = inject(ProdutosPosModalService);
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly filtros = viewChild<ElementRef<HTMLElement>>('filtros');

  readonly categoriaAtiva = signal('todos');
  readonly termoBusca = signal('');
  readonly apenasProntaEntrega = signal(false);
  readonly ordenacao = signal<Ordenacao>('relevancia');

  /** Atalhos do topo: cada um filtra a vitrine por uma linha de produto. */
  readonly atalhos = [
    { categoria: 'impressora-termica', icone: 'fa-solid fa-print', titulo: 'd1t', sub: 'd1s' },
    { categoria: 'caixa-usb', icone: 'fa-solid fa-cash-register', titulo: 'd2t', sub: 'd2s' },
    { categoria: 'kit-pc-caixa', icone: 'fa-solid fa-desktop', titulo: 'd3t', sub: 'd3s' },
    { categoria: 'kit-headset-boost', icone: 'fa-solid fa-headset', titulo: 'd4t', sub: 'd4s' },
  ] as const;

  readonly listaProdutos = computed<ProdutoPos[]>(() => this.modal.catalogo());
  readonly totalProntaEntrega = computed(() => this.listaProdutos().filter((p) => p.inStock).length);

  /** A busca procura no texto do idioma atual (o catálogo já chega traduzido). */
  readonly produtosFiltrados = computed<ProdutoPos[]>(() => {
    const q = this.termoBusca().trim().toLowerCase();
    const categoria = this.categoriaAtiva();
    const soEstoque = this.apenasProntaEntrega();
    const ordem = this.ordenacao();
    return this.listaProdutos()
      .filter((p) => {
        const bateCategoria = categoria === 'todos' || p.category === categoria;
        const bateEstoque = !soEstoque || p.inStock;
        const bateBusca =
          !q ||
          [p.name, p.shortTitle, p.shortDesc, p.categoryLabel, p.sku, ...p.tags].some((txt) =>
            txt.toLowerCase().includes(q)
          );
        return bateCategoria && bateEstoque && bateBusca;
      })
      .sort((a, b) => {
        if (ordem === 'menor-preco') return a.priceSaleNumeric - b.priceSaleNumeric;
        if (ordem === 'maior-preco') return b.priceSaleNumeric - a.priceSaleNumeric;
        if (ordem === 'locacao') return a.priceRentNumeric - b.priceRentNumeric;
        return Number(b.inStock) - Number(a.inStock);
      });
  });

  readonly temFiltro = computed(
    () => this.categoriaAtiva() !== 'todos' || !!this.termoBusca() || this.apenasProntaEntrega()
  );

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
    this.modal.sincronizarComSga();
    enviarEvento([{ tipo: 'secao_tempo', alvo: 'pagina-loja-pos', rotulo: 'Visitou Página /loja POS Unrender Dev' }]);

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const cat = params.get('categoria');
      if (cat && this.modal.categorias().some((c) => c.id === cat)) {
        this.categoriaAtiva.set(cat);
      }
      const prodId = params.get('produto');
      if (prodId && this.modal.produtoPorId(prodId)) {
        this.modal.abrirDetalhe(prodId);
      }
    });
  }

  contarPorCategoria(catId: string): number {
    const lista = this.listaProdutos();
    return catId === 'todos' ? lista.length : lista.filter((p) => p.category === catId).length;
  }

  selecionarCategoria(catId: string): void {
    this.categoriaAtiva.set(catId);
  }

  /** Atalho do topo: filtra e leva até a vitrine. */
  irParaCategoria(catId: string): void {
    this.categoriaAtiva.set(catId);
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.filtros()?.nativeElement.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
  }

  limparFiltros(): void {
    this.categoriaAtiva.set('todos');
    this.termoBusca.set('');
    this.apenasProntaEntrega.set(false);
    this.ordenacao.set('relevancia');
  }

  abrirDetalheProduto(produto: ProdutoPos): void {
    this.modal.abrirDetalhe(produto);
    const pt = this.modal.basePt(produto);
    enviarEvento([
      {
        tipo: 'servico_visualizado',
        alvo: slug(pt.name),
        rotulo: `Loja POS Detalhe: ${pt.shortTitle}`,
      },
    ]);
  }

  iniciarPedido(produto: ProdutoPos, modalidade: ModalidadePos = 'Compra (Venda Definitiva)'): void {
    this.modal.abrirPedido(produto, modalidade);
  }

  registrarWhatsapp(produto: ProdutoPos): void {
    const pt = this.modal.basePt(produto);
    enviarEvento([
      {
        tipo: 'whatsapp_clicado',
        alvo: `loja-card-${slug(pt.shortTitle)}`,
        rotulo: `WhatsApp Loja POS: ${pt.shortTitle}`,
      },
    ]);
  }
}
