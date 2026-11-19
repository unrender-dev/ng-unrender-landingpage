import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition,
  faCommentDots,
  faCamera,
  faWallet,
  faUtensils,
  faQrcode,
  faCreditCard,
  faCalendarCheck,
  faTowerBroadcast,
  faCode,
  faDoorOpen,
  faPlug,
} from '@fortawesome/free-solid-svg-icons';
import { I18nService } from '../../../../i18n/i18n.service';
import { I18N } from './api-integration.i18n';

type Key = keyof (typeof I18N)['pt'];
type Dir = 'in' | 'out';

interface IntegrationDef {
  id: string;
  /** Nome próprio do serviço (não traduzido) ou chave de tradução. */
  name?: string;
  nameKey?: Key;
  /** Ícone genérico da categoria: serviços de terceiros aparecem só pelo nome, sem logo. */
  icon: IconDefinition;
  dir: Dir;
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  status: number;
  /** Faixa de latência típica (ms). */
  ms: [number, number];
  desc: Key;
}

interface IntegrationNode extends IntegrationDef {
  x: number;
  y: number;
  connected: boolean;
  /** Pulso de evento/conexão no ícone. */
  burst: boolean;
  /** Conexão acesa enquanto um evento passa. */
  hot: boolean;
  queued: number;
}

interface Packet { id: number; dx: number; dy: number; dir: Dir; }

interface EventRow {
  id: number;
  at: Date;
  node: string;
  method: string;
  path: string;
  /** `null` = ficou na fila (integração desligada). */
  status: number | null;
  ms: number;
  dir: Dir;
  desc: Key | null;
  /** Linha especial de reenvio da fila. */
  flushed?: number;
}

const DEFS: IntegrationDef[] = [
  { id: 'whatsapp', nameKey: 'whatsapp', icon: faCommentDots, dir: 'in', method: 'POST', path: '/webhooks/whatsapp', status: 200, ms: [38, 95], desc: 'd_whatsapp' },
  { id: 'instagram', name: 'Instagram', icon: faCamera, dir: 'in', method: 'POST', path: '/webhooks/instagram', status: 200, ms: [42, 110], desc: 'd_instagram' },
  { id: 'metaPay', nameKey: 'metaPay', icon: faWallet, dir: 'in', method: 'POST', path: '/webhooks/meta-pagamentos', status: 200, ms: [55, 140], desc: 'd_metaPay' },
  { id: 'ifood', name: 'iFood', icon: faUtensils, dir: 'in', method: 'POST', path: '/integracoes/ifood/pedidos', status: 201, ms: [70, 180], desc: 'd_ifood' },
  { id: 'pix', name: 'PIX', icon: faQrcode, dir: 'in', method: 'POST', path: '/webhooks/pix', status: 200, ms: [30, 80], desc: 'd_pix' },
  { id: 'cards', nameKey: 'cards', icon: faCreditCard, dir: 'out', method: 'POST', path: '/v1/charges', status: 201, ms: [180, 420], desc: 'd_cards' },
  { id: 'gcal', nameKey: 'gcal', icon: faCalendarCheck, dir: 'out', method: 'PUT', path: '/calendar/v3/events/{id}', status: 200, ms: [120, 260], desc: 'd_gcal' },
  { id: 'webhooks', name: 'Webhooks', icon: faTowerBroadcast, dir: 'out', method: 'POST', path: 'https://erp.cliente.com/hooks', status: 202, ms: [90, 240], desc: 'd_webhooks' },
  { id: 'publicApi', nameKey: 'publicApi', icon: faCode, dir: 'in', method: 'GET', path: '/api/v1/contatos?desde=hoje', status: 200, ms: [25, 70], desc: 'd_publicApi' },
  { id: 'gate', nameKey: 'gate', icon: faDoorOpen, dir: 'in', method: 'POST', path: '/acesso/eventos', status: 200, ms: [20, 60], desc: 'd_gate' },
];

const CENTER_X = 50;
const CENTER_Y = 48;
const RADIUS_X = 37;
const RADIUS_Y = 35;
/** Intervalo entre eventos simulados e pausa do autoplay após interação. */
const EVENT_MS = 1250;
const PACKET_MS = 900;
const MAX_ROWS = 6;

@Component({
  selector: 'app-api-integration',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './api-integration.component.html',
  styleUrls: ['./api-integration.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiIntegrationComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly zone = inject(NgZone);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly faPlug = faPlug;
  readonly centerX = CENTER_X;
  readonly centerY = CENTER_Y;

  readonly integrations = signal<IntegrationNode[]>(layout(DEFS));
  readonly packets = signal<Packet[]>([]);
  readonly events = signal<EventRow[]>([]);
  readonly today = signal(48213);
  readonly activeCount = computed(() => this.integrations().filter((n) => n.connected).length);
  readonly latency = computed(() => {
    const ok = this.events().filter((e) => e.status !== null && !e.flushed);
    return ok.length ? Math.round(ok.reduce((s, e) => s + e.ms, 0) / ok.length) : 64;
  });
  /** Animações CSS pausadas (fora da tela ou aba oculta). */
  readonly paused = signal(false);

  private timer: ReturnType<typeof setInterval> | null = null;
  private timeouts = new Set<ReturnType<typeof setTimeout>>();
  private observer: IntersectionObserver | null = null;
  private inView = true;
  private seq = 0;
  private lastNode = '';
  private readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  private readonly onVisibility = () => this.syncRunning();

  constructor() {
    // A lista já começa com alguns eventos, também para quem usa movimento reduzido.
    const now = Date.now();
    const seed = ['pix', 'whatsapp', 'gcal', 'ifood'];
    this.events.set(seed.map((id, i) => this.row(DEFS.find((d) => d.id === id)!, new Date(now - (seed.length - i) * 2100))).reverse());
  }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver((entries) => {
        this.inView = entries.some((e) => e.isIntersecting);
        this.syncRunning();
      });
      this.observer.observe(this.host.nativeElement);
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    this.syncRunning();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.stop();
    this.timeouts.forEach((t) => clearTimeout(t));
    this.timeouts.clear();
  }

  label(node: { name?: string; nameKey?: Key }): string {
    return node.nameKey ? this.t(node.nameKey) : (node.name ?? '');
  }

  nodeLabel(id: string): string {
    return this.label(DEFS.find((d) => d.id === id)!);
  }

  time(d: Date): string {
    return this.i18n.date(d, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  }

  ariaLabel(node: IntegrationNode): string {
    const params = { nome: this.label(node), estado: this.t(node.connected ? 'connected' : 'disconnected') };
    return this.t(node.connected ? 'toggleOff' : 'toggleOn', params);
  }

  /** Clique do usuário: liga/desliga. Ao religar, a fila acumulada é reenviada. */
  toggleConnection(node: IntegrationNode): void {
    const connected = !node.connected;
    const queued = node.queued;
    this.patch(node.id, { connected, queued: connected ? 0 : node.queued, burst: connected });
    this.later(() => this.patch(node.id, { burst: false }), 900);
    if (connected && queued > 0) {
      for (let i = 0; i < Math.min(queued, 4); i++) this.later(() => this.flow(node.id), i * 180);
      this.push({ ...this.row(node, new Date()), flushed: queued });
      this.today.update((n) => n + queued);
    }
  }

  private patch(id: string, change: Partial<IntegrationNode>): void {
    this.integrations.update((list) => list.map((n) => (n.id === id ? { ...n, ...change } : n)));
  }

  private row(def: IntegrationDef, at: Date, queued = false): EventRow {
    const [a, b] = def.ms;
    return {
      id: ++this.seq, at, node: def.id, method: def.method, path: def.path,
      status: queued ? null : def.status, ms: Math.round(a + Math.random() * (b - a)), dir: def.dir, desc: def.desc,
    };
  }

  private push(row: EventRow): void {
    this.events.update((list) => [row, ...list].slice(0, MAX_ROWS));
  }

  /** Um evento: pacote viaja pela conexão (entrada → hub, saída → serviço) e o nó pulsa. */
  private flow(id: string): void {
    const node = this.integrations().find((n) => n.id === id);
    if (!node) return;
    const packet: Packet = { id: ++this.seq, dx: node.x - CENTER_X, dy: node.y - CENTER_Y, dir: node.dir };
    this.packets.update((list) => [...list, packet]);
    this.patch(id, { hot: true, burst: true });
    this.later(() => {
      this.packets.update((list) => list.filter((p) => p.id !== packet.id));
      this.patch(id, { hot: false, burst: false });
    }, PACKET_MS + 60);
  }

  /** Próximo evento simulado: escolhe um serviço (sem repetir o anterior). */
  private tick(): void {
    const list = this.integrations();
    let pick = list[Math.floor(Math.random() * list.length)];
    if (pick.id === this.lastNode) pick = list[(list.indexOf(pick) + 3) % list.length];
    this.lastNode = pick.id;
    if (!pick.connected) {
      // Integração desligada: o evento não se perde, vai para a fila.
      this.patch(pick.id, { queued: pick.queued + 1 });
      this.push(this.row(pick, new Date(), true));
      return;
    }
    this.flow(pick.id);
    this.push(this.row(pick, new Date()));
    this.today.update((n) => n + 1 + Math.floor(Math.random() * 3));
  }

  private later(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      this.timeouts.delete(t);
      this.zone.run(fn);
    }, ms);
    this.timeouts.add(t);
  }

  private syncRunning(): void {
    const visible = this.inView && !document.hidden;
    this.paused.set(!visible);
    if (visible && !this.reducedMotion) this.start();
    else this.stop();
  }

  private start(): void {
    if (this.timer) return;
    this.zone.runOutsideAngular(() => {
      this.timer = setInterval(() => this.zone.run(() => this.tick()), EVENT_MS);
    });
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

function layout(defs: IntegrationDef[]): IntegrationNode[] {
  const count = defs.length;
  return defs.map((def, index) => {
    const angle = (-90 + index * (360 / count)) * (Math.PI / 180);
    return {
      ...def,
      x: +(CENTER_X + RADIUS_X * Math.cos(angle)).toFixed(2),
      y: +(CENTER_Y + RADIUS_Y * Math.sin(angle)).toFixed(2),
      connected: true,
      burst: false,
      hot: false,
      queued: 0,
    };
  });
}
