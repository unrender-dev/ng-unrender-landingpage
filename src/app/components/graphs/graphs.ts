import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, effect, inject } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';
import { I18N, GraphKey } from './graphs.i18n';

// A biblioteca vis-network precisa estar carregada globalmente (ex.: array
// `scripts` do angular.json). Sem ela o componente não desenha nada.
declare var vis: any;

interface GraphNode {
  id: string;
  /** Nome do produto (não traduzido). */
  name: string;
  role: GraphKey;
  size: number;
  group: 'hub' | 'infra' | 'finance' | 'comms' | 'vertical' | 'tools';
  /** Existe `<id>-png.png` em `public/`; sem logotipo o nó vira um ponto com a cor da marca. */
  logo: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
  label?: GraphKey;
  dashes?: boolean | number[];
}

const NODES: GraphNode[] = [
  // Hubs centrais e de suporte
  { id: 'controlb', name: 'Control B', role: 'role_erp', size: 45, group: 'hub', logo: true },
  { id: 'norna', name: 'Norna', role: 'role_config', size: 30, group: 'infra', logo: false },
  { id: 'mani', name: 'Mani', role: 'role_billing', size: 35, group: 'finance', logo: false },
  { id: 'seshat', name: 'Seshat', role: 'role_comms', size: 35, group: 'comms', logo: false },
  { id: 'tevat', name: 'Tevat', role: 'role_drive', size: 35, group: 'infra', logo: false },
  // Sistemas verticais
  { id: 'higia', name: 'Higia', role: 'role_clinics', size: 30, group: 'vertical', logo: true },
  { id: 'brok', name: 'Brok', role: 'role_workshops', size: 30, group: 'vertical', logo: true },
  { id: 'freya', name: 'Freya', role: 'role_pets', size: 30, group: 'vertical', logo: true },
  { id: 'dice', name: 'Dice.adv.br', role: 'role_law', size: 30, group: 'vertical', logo: true },
  { id: 'kardapio', name: 'Kardapio', role: 'role_delivery', size: 30, group: 'vertical', logo: true },
  { id: 'odin', name: 'Odin', role: 'role_education', size: 30, group: 'vertical', logo: false },
  { id: 'janus', name: 'Janus', role: 'role_security', size: 30, group: 'vertical', logo: true },
  { id: 'hermes', name: 'Hermes', role: 'role_logistics', size: 30, group: 'vertical', logo: true },
  { id: 'apolo', name: 'Apolo', role: 'role_creative', size: 30, group: 'vertical', logo: true },
  // Sistemas auxiliares e ferramentas
  { id: 'shark', name: 'Shark', role: 'role_collections', size: 30, group: 'finance', logo: false },
  { id: 'ava', name: 'Ava', role: 'role_ai_agent', size: 30, group: 'comms', logo: false },
  { id: 'qotar', name: 'Qotar', role: 'role_ai_quotes', size: 30, group: 'tools', logo: true },
  { id: 'courier', name: 'Courier', role: 'role_email', size: 30, group: 'tools', logo: false },
];

const VERTICALS = ['higia', 'brok', 'freya', 'dice', 'kardapio', 'odin', 'janus', 'hermes', 'apolo'];

const EDGES: GraphEdge[] = [
  { from: 'higia', to: 'controlb', label: 'edge_clinical' },
  { from: 'brok', to: 'controlb', label: 'edge_work_orders' },
  { from: 'freya', to: 'controlb', label: 'edge_pet_sales' },
  { from: 'dice', to: 'controlb', label: 'edge_cases' },
  { from: 'kardapio', to: 'controlb', label: 'edge_orders' },
  { from: 'odin', to: 'controlb', label: 'edge_academic' },
  { from: 'janus', to: 'controlb', label: 'edge_alerts' },
  { from: 'hermes', to: 'controlb', label: 'edge_fleet' },
  { from: 'apolo', to: 'controlb', label: 'edge_projects' },
  ...VERTICALS.flatMap((vertical): GraphEdge[] => [
    { from: vertical, to: 'mani', label: 'edge_bill', dashes: true },
    { from: vertical, to: 'seshat', label: 'edge_notify', dashes: true },
  ]),
  { from: 'janus', to: 'tevat', label: 'edge_recordings', dashes: true },
  { from: 'apolo', to: 'tevat', label: 'edge_media', dashes: true },
  { from: 'higia', to: 'tevat', label: 'edge_exams', dashes: true },
  { from: 'shark', to: 'mani', label: 'edge_collect' },
  { from: 'ava', to: 'seshat', label: 'edge_automate' },
  { from: 'courier', to: 'seshat', label: 'edge_send_email' },
  { from: 'qotar', to: 'brok', label: 'edge_quotes' },
  { from: 'qotar', to: 'dice', label: 'edge_proposals' },
  { from: 'controlb', to: 'norna', dashes: [5, 5] },
  { from: 'mani', to: 'norna', dashes: [5, 5] },
  { from: 'seshat', to: 'norna', dashes: [5, 5] },
  { from: 'tevat', to: 'norna', dashes: [5, 5] },
];

const ACCENT = '#f99126';
/** Amplitude (px do grafo) da deriva suave dos nós depois da estabilização. */
const DRIFT_AMPLITUDE = 7;

@Component({
  selector: 'app-graphs',
  standalone: true,
  templateUrl: './graphs.html',
  styleUrl: './graphs.scss',
})
export class Graphs implements AfterViewInit, OnDestroy {
  @ViewChild('networkContainer') networkContainer!: ElementRef<HTMLElement>;

  private readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly zone = inject(NgZone);

  private network: any;
  private nodes: any;
  private edges: any;

  private basePositions: Record<string, { x: number; y: number }> | null = null;
  private readonly dragging = new Set<string>();
  private rafId: number | undefined;
  private time = 0;
  private lastFrame = 0;
  private inView = false;
  private observer?: IntersectionObserver;
  private readonly onVisibility = () => this.syncDrift();
  private readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    // Os rótulos são desenhados no canvas do vis: ao trocar de idioma, atualiza os dados.
    effect(() => {
      this.i18n.lang();
      this.relabel();
    });
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.createGraph());
  }

  ngOnDestroy(): void {
    this.stopDrift();
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.network?.destroy?.();
    this.network = undefined;
  }

  private nodeLabel(node: GraphNode): string {
    return `${node.name}\n(${this.t(node.role)})`;
  }

  private relabel(): void {
    if (!this.nodes?.update || !this.edges?.update) return;
    this.nodes.update(NODES.map((node) => ({ id: node.id, label: this.nodeLabel(node) })));
    this.edges.update(
      EDGES.map((edge, index) => ({ id: `e${index}`, label: edge.label ? this.t(edge.label) : undefined })),
    );
  }

  private createGraph(): void {
    if (typeof vis === 'undefined') {
      return;
    }

    this.nodes = new vis.DataSet(
      NODES.map((node) => ({
        id: node.id,
        label: this.nodeLabel(node),
        size: node.size,
        group: node.group,
        ...(node.logo
          ? { shape: 'circularImage', image: `${node.id}-png.png` }
          : { shape: 'dot', color: { background: ACCENT, border: ACCENT } }),
      })),
    );

    this.edges = new vis.DataSet(
      EDGES.map((edge, index) => ({
        id: `e${index}`,
        from: edge.from,
        to: edge.to,
        label: edge.label ? this.t(edge.label) : undefined,
        arrows: 'to',
        dashes: edge.dashes ?? false,
      })),
    );

    // Aparência para o tema escuro
    const options = {
      nodes: {
        borderWidth: 0,
        borderWidthSelected: 3,
        color: {
          border: ACCENT,
          background: 'transparent',
          highlight: { border: ACCENT, background: 'transparent' },
          hover: { border: ACCENT, background: 'transparent' },
        },
        font: { color: '#FFFFFF', size: 14, face: 'Montserrat', strokeWidth: 0 },
        shadow: { enabled: true, color: 'rgba(0, 0, 0, 0.5)', size: 10, x: 3, y: 3 },
        shapeProperties: { useBorderWithImage: true },
      },
      edges: {
        width: 2,
        color: { color: '#FFFFFF', highlight: ACCENT, hover: ACCENT, opacity: 0.6 },
        arrows: { to: { enabled: true, scaleFactor: 1, type: 'arrow' } },
        font: { color: '#FFFFFF', size: 12, face: 'Montserrat', align: 'middle', background: 'none', strokeWidth: 0 },
        // `continuous` não depende da física: as curvas seguem os nós durante a deriva.
        smooth: { enabled: true, type: 'continuous', roundness: 0.5 },
      },
      interaction: { hover: true, dragNodes: true, zoomView: true, dragView: true },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -40000,
          centralGravity: 0.1,
          springLength: 250,
          springConstant: 0.03,
          damping: 0.15,
        },
        solver: 'barnesHut',
        stabilization: { iterations: 2000, fit: true },
      },
    };

    const container = this.networkContainer.nativeElement;
    this.network = new vis.Network(container, { nodes: this.nodes, edges: this.edges }, options);

    if (this.reducedMotion) return; // grafo parado depois de estabilizar

    // Deriva contínua: depois de estabilizar, a física é desligada e cada nó oscila
    // em torno da posição de repouso com funções periódicas do tempo (sem saltos
    // nem reinício). Substitui o antigo sorteio de velocidade a cada quadro.
    this.network.on?.('stabilizationIterationsDone', () => {
      this.network.setOptions?.({ physics: { enabled: false } });
      this.basePositions = this.network.getPositions?.() ?? null;
      this.syncDrift();
    });
    this.network.on?.('dragStart', (params: { nodes: string[] }) => {
      params.nodes.forEach((id) => this.dragging.add(id));
    });
    this.network.on?.('dragEnd', (params: { nodes: string[] }) => {
      const moved = this.network.getPositions?.(params.nodes) ?? {};
      for (const id of params.nodes) {
        if (this.basePositions && moved[id]) this.basePositions[id] = moved[id];
        this.dragging.delete(id);
      }
    });

    if (typeof IntersectionObserver === 'function') {
      this.observer = new IntersectionObserver((entries) => {
        this.inView = entries[entries.length - 1].isIntersecting;
        this.syncDrift();
      });
      this.observer.observe(container);
    } else {
      this.inView = true;
    }
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  /** A deriva só roda com o grafo estabilizado, visível e com a aba ativa. */
  private syncDrift(): void {
    const shouldRun = !!this.basePositions && this.inView && !document.hidden && !!this.network?.moveNode;
    if (shouldRun && this.rafId === undefined) {
      this.lastFrame = performance.now();
      this.rafId = requestAnimationFrame(this.driftFrame);
    } else if (!shouldRun) {
      this.stopDrift();
    }
  }

  private stopDrift(): void {
    if (this.rafId === undefined) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = undefined;
  }

  private readonly driftFrame = (now: number): void => {
    this.rafId = requestAnimationFrame(this.driftFrame);
    this.time += Math.min(Math.max((now - this.lastFrame) / 1000, 0), 0.05);
    this.lastFrame = now;
    const base = this.basePositions;
    if (!base || !this.network) return;
    NODES.forEach((node, index) => {
      const rest = base[node.id];
      if (!rest || this.dragging.has(node.id)) return;
      // Fase e frequência próprias por nó, para o conjunto não oscilar em bloco.
      const phase = index * 1.7;
      const speed = 0.35 + (index % 5) * 0.05;
      this.network.moveNode(
        node.id,
        rest.x + Math.sin(this.time * speed + phase) * DRIFT_AMPLITUDE,
        rest.y + Math.cos(this.time * speed * 0.8 + phase * 1.3) * DRIFT_AMPLITUDE,
      );
    });
  };
}
