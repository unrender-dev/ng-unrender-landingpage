import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBolt,
  faCamera,
  faLayerGroup,
  faLeaf,
  faMemory,
  faMicrochip,
  faMobileAlt,
  faServer,
  faThermometerHalf,
  faWifi,
} from '@fortawesome/free-solid-svg-icons';
import { I18nService } from '../../../../i18n/i18n.service';
import { Showcase, tween } from '../hardware-demos/showcase';
import { I18N, ITEMS_TEXT, ItemId } from './hardware-showcase.i18n';

type Key = keyof (typeof I18N)['pt'];
type CategoryId = 'servers' | 'processors' | 'sbc_mobo' | 'devices';
type MetricId = 'performance' | 'efficiency' | 'power' | 'cost';

interface HardwareItem {
  id: ItemId;
  category: CategoryId;
  icon: IconDefinition;
  /** Ícones das três especificações (os textos vêm do dicionário). */
  specIcons: [IconDefinition, IconDefinition, IconDefinition];
  /** Índices relativos de 0 a 100. */
  metrics: Record<MetricId, number>;
}

const CATEGORIES: { id: CategoryId; label: Key; icon: IconDefinition }[] = [
  { id: 'servers', label: 'catServers', icon: faServer },
  { id: 'processors', label: 'catProcessors', icon: faMicrochip },
  { id: 'sbc_mobo', label: 'catBoards', icon: faLayerGroup },
  { id: 'devices', label: 'catDevices', icon: faMobileAlt },
];

const METRICS: { id: MetricId; label: Key; lowerIsBetter: boolean }[] = [
  { id: 'performance', label: 'mPerformance', lowerIsBetter: false },
  { id: 'efficiency', label: 'mEfficiency', lowerIsBetter: false },
  { id: 'power', label: 'mPower', lowerIsBetter: true },
  { id: 'cost', label: 'mCost', lowerIsBetter: true },
];

const ITEMS: HardwareItem[] = [
  { id: 'srv-x86', category: 'servers', icon: faServer, specIcons: [faLayerGroup, faMicrochip, faMemory], metrics: { performance: 95, efficiency: 60, power: 90, cost: 85 } },
  { id: 'srv-arm', category: 'servers', icon: faServer, specIcons: [faLayerGroup, faMicrochip, faMemory], metrics: { performance: 85, efficiency: 95, power: 50, cost: 70 } },
  { id: 'srv-riscv', category: 'servers', icon: faServer, specIcons: [faLayerGroup, faMicrochip, faMemory], metrics: { performance: 60, efficiency: 85, power: 40, cost: 40 } },
  { id: 'proc-mcu', category: 'processors', icon: faMicrochip, specIcons: [faBolt, faMemory, faWifi], metrics: { performance: 20, efficiency: 99, power: 5, cost: 10 } },
  { id: 'proc-gpu', category: 'processors', icon: faLayerGroup, specIcons: [faMemory, faMicrochip, faBolt], metrics: { performance: 100, efficiency: 40, power: 100, cost: 100 } },
  { id: 'proc-tpu', category: 'processors', icon: faMicrochip, specIcons: [faBolt, faLeaf, faWifi], metrics: { performance: 40, efficiency: 90, power: 10, cost: 30 } },
  { id: 'dev-sbc', category: 'sbc_mobo', icon: faMicrochip, specIcons: [faMicrochip, faBolt, faWifi], metrics: { performance: 50, efficiency: 80, power: 20, cost: 25 } },
  { id: 'mobo-ws', category: 'sbc_mobo', icon: faLayerGroup, specIcons: [faMicrochip, faBolt, faWifi], metrics: { performance: 90, efficiency: 50, power: 40, cost: 80 } },
  { id: 'dev-phone-thermal', category: 'devices', icon: faMobileAlt, specIcons: [faThermometerHalf, faLayerGroup, faBolt], metrics: { performance: 45, efficiency: 70, power: 15, cost: 60 } },
  { id: 'dev-phone-lidar', category: 'devices', icon: faCamera, specIcons: [faLayerGroup, faWifi, faMicrochip], metrics: { performance: 75, efficiency: 65, power: 25, cost: 90 } },
  { id: 'dev-ar-glasses', category: 'devices', icon: faLayerGroup, specIcons: [faBolt, faCamera, faLeaf], metrics: { performance: 40, efficiency: 85, power: 10, cost: 95 } },
  { id: 'dev-tracker', category: 'devices', icon: faWifi, specIcons: [faWifi, faLeaf, faLayerGroup], metrics: { performance: 10, efficiency: 100, power: 2, cost: 20 } },
];

/** Tempo de cada equipamento no modo vitrine (igual ao da barra de progresso no CSS). */
const DWELL_MS = 4600;

@Component({
  selector: 'app-hardware-showcase',
  standalone: true,
  imports: [FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hardware-showcase.component.html',
  styleUrls: ['./hardware-showcase.component.scss'],
})
export class HardwareShowcaseComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly faMicrochip = faMicrochip;
  readonly categories = CATEGORIES;
  readonly metricDefs = METRICS;

  readonly selectedCategory = signal<CategoryId>('servers');
  readonly selectedId = signal<ItemId>(ITEMS[0].id);
  readonly auto = signal(false);
  /** Números das métricas, interpolados entre um equipamento e outro. */
  readonly shownMetrics = signal<Record<MetricId, number>>({ ...ITEMS[0].metrics });

  private readonly texts = computed(() => ITEMS_TEXT[this.i18n.lang()] ?? ITEMS_TEXT.pt);
  /** Todas as grades e todos os detalhes ficam no DOM, empilhados: a altura não muda na troca. */
  readonly groups = CATEGORIES.map((c) => ({ id: c.id, items: ITEMS.filter((i) => i.category === c.id) }));
  readonly items = ITEMS;
  readonly selected = computed(() => ITEMS.find((i) => i.id === this.selectedId())!);

  private readonly showcase = new Showcase(this.host.nativeElement, 10000);
  private cancelTween: () => void = () => {};

  ngAfterViewInit(): void {
    this.showcase.start(async (step) => {
      this.auto.set(true);
      await step(DWELL_MS);
      this.advance();
    });
  }

  ngOnDestroy(): void {
    this.showcase.destroy();
    this.cancelTween();
  }

  textOf(id: ItemId) {
    return this.texts()[id];
  }

  onTouch(): void {
    this.auto.set(false);
    this.showcase.interrupt();
  }

  selectCategory(id: CategoryId): void {
    if (id === this.selectedCategory()) return;
    this.selectedCategory.set(id);
    this.select(ITEMS.find((i) => i.category === id)!.id);
  }

  select(id: ItemId): void {
    if (id === this.selectedId()) return;
    this.selectedId.set(id);

    const from = { ...this.shownMetrics() };
    const to = this.selected().metrics;
    this.cancelTween();
    this.cancelTween = tween(0, 1, this.showcase.reduced ? 0 : 800, (k) =>
      this.shownMetrics.set({
        performance: from.performance + (to.performance - from.performance) * k,
        efficiency: from.efficiency + (to.efficiency - from.efficiency) * k,
        power: from.power + (to.power - from.power) * k,
        cost: from.cost + (to.cost - from.cost) * k,
      }),
    );
  }

  /** Verde / âmbar / vermelho conforme o índice (para consumo e custo, menor é melhor). */
  tone(value: number, lowerIsBetter: boolean): 'good' | 'mid' | 'bad' {
    if (value > 40 && value <= 75) return 'mid';
    return value > 75 !== lowerIsBetter ? 'good' : 'bad';
  }

  round(value: number): number {
    return Math.round(value);
  }

  /** Vitrine: próximo equipamento; ao fim da categoria, segue para a seguinte e recomeça. */
  private advance(): void {
    const next = ITEMS[(ITEMS.findIndex((i) => i.id === this.selectedId()) + 1) % ITEMS.length];
    if (next.category !== this.selectedCategory()) this.selectedCategory.set(next.category);
    this.select(next.id);
  }
}
