import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { ProdutoPos, produtosPos, mesclarCatalogoPosSga } from '../data/produtos-pos.data';
import {
  TextosPos,
  carregadoresTextosPos,
  categoriasPosLocalizadas,
  localizarProdutoPos,
} from '../data/produtos-pos.i18n';
import { I18nService, Lang } from '../i18n/i18n.service';
import { buscarCatalogoSga, whatsappUrl } from './sga-ctrlb';

export type ModoModalPos = 'catalogo' | 'detalhe' | 'pedido';

/**
 * Modalidade do pedido. Os valores são identificadores estáveis (vão para o SGA em
 * português); o rótulo exibido é traduzido no modal.
 */
export type ModalidadePos = 'Compra (Venda Definitiva)' | 'Locação Mensal (HaaS)';

@Injectable({
  providedIn: 'root',
})
export class ProdutosPosModalService {
  private readonly i18n = inject(I18nService);

  readonly isOpen = signal(false);
  readonly viewMode = signal<ModoModalPos>('catalogo');
  readonly selectedCategory = signal<string>('todos');
  readonly orderModality = signal<ModalidadePos>('Compra (Venda Definitiva)');

  /** Catálogo e produto selecionado na fonte (português). */
  private readonly catalogoBase = signal<ProdutoPos[]>(disponiveis(produtosPos));
  private readonly selecionadoBase = signal<ProdutoPos>(produtosPos[0]);
  /** Dicionários en/es/fr já carregados. */
  private readonly textos = signal<Partial<Record<Lang, TextosPos>>>({});

  /** Catálogo já no idioma atual (reage à troca de idioma e à sincronização com o SGA). */
  readonly catalogo = computed<ProdutoPos[]>(() => this.catalogoBase().map((p) => this.localizar(p)));
  /** Produto aberto no modal, já no idioma atual. */
  readonly selectedProduct = computed<ProdutoPos>(() => this.localizar(this.selecionadoBase()));
  /** Categorias com rótulo no idioma atual. */
  readonly categorias = computed(() => categoriasPosLocalizadas(this.i18n.lang()));

  readonly sgaSincronizado = signal<boolean>(false);
  readonly whatsappBase = signal<string>('https://wa.me/5565999207154');

  private carregando = false;

  constructor() {
    // Baixa o dicionário do idioma só quando ele é usado (o pt já está no bundle).
    effect(() => {
      const lang = this.i18n.lang();
      if (lang === 'pt' || untracked(this.textos)[lang]) return;
      carregadoresTextosPos[lang]()
        .then((dic) => this.textos.update((atual) => ({ ...atual, [lang]: dic })))
        .catch(() => {
          // Sem o dicionário o catálogo segue em português.
        });
    });

    if (typeof window !== 'undefined') {
      this.sincronizarComSga();
    }
  }

  async sincronizarComSga(): Promise<void> {
    if (this.carregando) return;
    this.carregando = true;
    try {
      whatsappUrl()
        .then((u) => {
          if (u) this.whatsappBase.set(u);
        })
        .catch(() => {});

      const dados = await buscarCatalogoSga();
      if (dados && Array.isArray(dados.produtos)) {
        const mesclados = mesclarCatalogoPosSga(dados.produtos);
        if (mesclados.length > 0) {
          this.catalogoBase.set(mesclados);
          this.sgaSincronizado.set(true);
          const atual = this.selecionadoBase();
          const atualizado = mesclados.find((p) => p.id === atual.id || p.sku === atual.sku);
          this.selecionadoBase.set(atualizado ?? mesclados[0]);
        }
      }
    } finally {
      this.carregando = false;
    }
  }

  abrirCatalogo(categoria = 'todos'): void {
    this.selectedCategory.set(categoria || 'todos');
    this.viewMode.set('catalogo');
    this.isOpen.set(true);
    this.sincronizarComSga();
  }

  abrirDetalhe(produtoOuId: ProdutoPos | string): void {
    this.selecionar(produtoOuId);
    this.viewMode.set('detalhe');
    this.isOpen.set(true);
    this.sincronizarComSga();
  }

  abrirPedido(produtoOuId: ProdutoPos | string, modalidade: ModalidadePos = 'Compra (Venda Definitiva)'): void {
    this.selecionar(produtoOuId);
    this.orderModality.set(modalidade);
    this.viewMode.set('pedido');
    this.isOpen.set(true);
    this.sincronizarComSga();
  }

  fechar(): void {
    this.isOpen.set(false);
  }

  /** Produto (no idioma atual) pelo id ou SKU, mesmo que não esteja no catálogo filtrado. */
  produtoPorId(id: string): ProdutoPos | undefined {
    const base = this.acharBase(id);
    return base ? this.localizar(base) : undefined;
  }

  /** Versão da fonte (pt) do produto: usada nos eventos e no pedido enviado ao SGA. */
  basePt(produto: ProdutoPos): ProdutoPos {
    return this.acharBase(produto.id) ?? produto;
  }

  linkWhatsappProduto(produto: ProdutoPos): string {
    const msg = encodeURIComponent(produto.whatsappMessage);
    const base = this.whatsappBase();
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}text=${msg}`;
  }

  /** Guarda sempre o produto da fonte (pt); a versão traduzida sai de `selectedProduct`. */
  private selecionar(produtoOuId: ProdutoPos | string): void {
    const chave = typeof produtoOuId === 'string' ? produtoOuId : produtoOuId.id;
    const encontrado =
      this.acharBase(chave) ?? (typeof produtoOuId === 'string' ? this.catalogoBase()[0] : produtoOuId);
    if (encontrado) this.selecionadoBase.set(encontrado);
  }

  private acharBase(chave: string): ProdutoPos | undefined {
    const k = chave.toLowerCase();
    const achar = (lista: ProdutoPos[]) => lista.find((p) => p.id === chave || p.sku.toLowerCase() === k);
    return achar(this.catalogoBase()) ?? achar(produtosPos);
  }

  private localizar(p: ProdutoPos): ProdutoPos {
    const lang = this.i18n.lang();
    return localizarProdutoPos(p, lang, this.textos()[lang], (valor) => this.i18n.money(valor, 0));
  }
}

function disponiveis(lista: ProdutoPos[]): ProdutoPos[] {
  return lista.filter((p) => p.inStock && (p.stockCount ?? 1) > 0);
}
