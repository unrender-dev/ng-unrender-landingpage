import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProdutoPos } from '../../../../data/produtos-pos.data';
import { I18nService } from '../../../../i18n/i18n.service';
import { ProdutosPosModalService } from '../../../../services/produtos-pos-modal.service';
import { I18N } from './hardware-consulting.component.i18n';

interface HardwareItem {
  id: string;
  /** Presente nos itens do catálogo POS (abrem ficha e pedido no modal). */
  posProductId?: string;
  sku?: string;
  name: string;
  category: string;
  categoryLabel: string;
  description: string;
  specs: string[];
  image: string;
  price: string;
  rentPrice?: string;
  readyToUse: boolean;
  stockCount?: number;
}

interface Categoria {
  id: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-hardware-consulting',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './hardware-consulting.component.html',
  styleUrls: ['./hardware-consulting.component.scss'],
})
export class HardwareConsultingComponent implements OnInit {
  @Input() initialCategory = 'all';

  readonly posModal = inject(ProdutosPosModalService);
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);

  readonly selectedCategory = signal('all');
  readonly searchQuery = signal('');

  /**
   * A vitrine fica dentro de uma aba da landing: mostra um lote por vez
   * (menor no celular, onde é uma coluna só) para não virar uma página interminável.
   */
  readonly lote =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches ? 3 : 6;
  readonly limite = signal(this.lote);

  readonly categories = computed<Categoria[]>(() => [
    { id: 'all', name: this.t('todos'), icon: 'fa-solid fa-layer-group' },
    ...this.posModal
      .categorias()
      .filter((c) => c.id !== 'todos')
      .map((c) => ({ id: c.id, name: c.label, icon: c.icon })),
    { id: 'servers', name: this.t('servidores'), icon: 'fa-solid fa-server' },
  ]);

  /** Projetos de infraestrutura (fora do catálogo POS): texto e preço no idioma atual. */
  private readonly enterpriseList = computed<HardwareItem[]>(() => [
    {
      id: 'srv-ai-01',
      name: this.t('srvNome'),
      category: 'servers',
      categoryLabel: this.t('srvCat'),
      description: this.t('srvDesc'),
      specs: [this.t('srvS1'), this.t('srvS2'), this.t('srvS3')],
      image: '/images/produtos/hw-servidor-ia.svg',
      price: this.t('sobConsulta'),
      readyToUse: true,
    },
    {
      id: 'net-corp-01',
      name: this.t('netNome'),
      category: 'servers',
      categoryLabel: this.t('netCat'),
      description: this.t('netDesc'),
      specs: [this.t('netS1'), this.t('netS2'), this.t('netS3')],
      image: '/images/produtos/hw-rede-corporativa.svg',
      price: `${this.i18n.money(6800, 0)} – ${this.i18n.money(18000, 0)}`,
      readyToUse: true,
    },
  ]);

  /** Catálogo POS (já traduzido pelo serviço) + projetos de infraestrutura. */
  private readonly combinedList = computed<HardwareItem[]>(() => [
    ...this.posModal.catalogo().map((p: ProdutoPos) => ({
      id: p.id,
      posProductId: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      categoryLabel: p.categoryLabel,
      description: p.shortDesc,
      specs: p.tags.concat(p.highlights.slice(0, 1)),
      image: p.image,
      price: p.priceSale,
      rentPrice: p.priceRent,
      readyToUse: p.inStock,
      stockCount: p.stockCount,
    })),
    ...this.enterpriseList(),
  ]);

  /** A busca procura no texto do idioma atual. */
  readonly filteredList = computed<HardwareItem[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const categoria = this.selectedCategory();
    return this.combinedList().filter((item) => {
      const matchesCategory = categoria === 'all' || item.category === categoria;
      const matchesSearch =
        !q ||
        [item.name, item.description, item.categoryLabel, item.sku ?? '', ...item.specs].some((txt) =>
          txt.toLowerCase().includes(q)
        );
      return matchesCategory && matchesSearch;
    });
  });

  readonly visibleList = computed(() => this.filteredList().slice(0, this.limite()));
  readonly restantes = computed(() => Math.max(0, this.filteredList().length - this.limite()));

  ngOnInit(): void {
    if (this.initialCategory && this.initialCategory !== 'all') {
      this.selectedCategory.set(this.initialCategory);
    }
  }

  selectCategory(catId: string): void {
    this.selectedCategory.set(catId);
    this.limite.set(this.lote);
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement)?.value || '');
    this.limite.set(this.lote);
  }

  limparFiltros(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.limite.set(this.lote);
  }

  mostrarMais(): void {
    this.limite.update((n) => n + this.lote);
  }

  abrirItem(item: HardwareItem): void {
    if (item.posProductId) this.posModal.abrirDetalhe(item.posProductId);
  }

  comprarItem(item: HardwareItem): void {
    if (item.posProductId) this.posModal.abrirPedido(item.posProductId, 'Compra (Venda Definitiva)');
  }

  /** Projetos de infraestrutura são orçados caso a caso, pelo WhatsApp. */
  linkOrcamento(item: HardwareItem): string {
    const base = this.posModal.whatsappBase();
    const texto = encodeURIComponent(this.t('whatsOrcamento', { nome: item.name }));
    return `${base}${base.includes('?') ? '&' : '?'}text=${texto}`;
  }
}
