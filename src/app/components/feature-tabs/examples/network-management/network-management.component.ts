import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy,
  computed, inject, signal, viewChild, viewChildren,
} from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faCircleInfo, faDatabase, faDesktop, faGlobe, faHardDrive, faLaptop, faMobileScreen, faNetworkWired,
  faPlugCircleXmark, faRotate, faServer, faShieldHalved, faShuffle, faTowerCell, faTriangleExclamation, faWifi,
} from '@fortawesome/free-solid-svg-icons';
import { I18nService, Params } from '../../../../i18n/i18n.service';
import { Polyline, Pt, SimLoop, clamp, ease, rng, smoothstep } from '../infra-shared/sim-loop';
import { I18N } from './network-management.i18n';

type Key = keyof (typeof I18N)['pt'];
type UplinkState = 'normal' | 'failover' | 'recovering';
type NodeStatus = 'online' | 'offline' | 'recovering' | 'standby' | 'active';
type Traffic = 'http' | 'db' | 'stream' | 'voip';

interface NodeDef {
  id: string;
  label: Key;
  role: Key;
  icon: IconDefinition;
  x: number;
  y: number;
  ip: string;
  /** Carga média, em %. */
  base: number;
  /** Equipamentos de núcleo ganham um pulso discreto. */
  core?: boolean;
}

interface PacketDef {
  id: number;
  color: string;
  path: Polyline;
  period: number;
  phase: number;
  /** Rota pela operadora A, pela B, ou tráfego interno (`null`). */
  via: 'a' | 'b' | null;
}

interface LogEvent {
  id: number;
  time: Date;
  key: Key;
  level: 'info' | 'warn' | 'ok';
  n?: number;
  ip?: string;
}

/** Fatia do tráfego por aplicação (painel "Banda por aplicação"). */
interface AppShare {
  key: Key;
  color: string;
  /** Participação média, em %. */
  base: number;
}

const APP_SHARES: readonly AppShare[] = [
  { key: 'appErp', color: '#f99126', base: 31 },
  { key: 'appBackup', color: '#0ea5a4', base: 22 },
  { key: 'appVideo', color: '#3b82f6', base: 19 },
  { key: 'appVoip', color: '#22c55e', base: 9 },
  { key: 'appWeb', color: '#a855f7', base: 19 },
];

/** Eventos de rotina que aparecem entre as falhas e ameaças (com o tipo de parâmetro). */
const ROUTINE: readonly { key: Key; level: LogEvent['level']; param: 'ip' | 'n' | 'none' }[] = [
  { key: 'evDhcp', level: 'info', param: 'ip' },
  { key: 'evBackup', level: 'ok', param: 'n' },
  { key: 'evVpn', level: 'info', param: 'ip' },
  { key: 'evPeak', level: 'warn', param: 'n' },
  { key: 'evPatch', level: 'ok', param: 'none' },
  { key: 'evRoam', level: 'info', param: 'none' },
  { key: 'evQos', level: 'ok', param: 'none' },
];

/** Altura do mapa em unidades do viewBox (a largura é 100). */
const H = 132;

const NODES: readonly NodeDef[] = [
  { id: 'ispA', label: 'nIspA', role: 'rIspA', icon: faGlobe, x: 31, y: 8, ip: '203.0.113.1', base: 46, core: true },
  { id: 'ispB', label: 'nIspB', role: 'rIspB', icon: faTowerCell, x: 69, y: 8, ip: '198.51.100.1', base: 4, core: true },
  { id: 'fw', label: 'nFw', role: 'rFw', icon: faShieldHalved, x: 50, y: 27, ip: '10.0.0.1', base: 34, core: true },
  { id: 'core', label: 'nCore', role: 'rCore', icon: faShuffle, x: 50, y: 46, ip: '10.0.0.2', base: 28, core: true },
  { id: 'dsrv', label: 'nDsrv', role: 'rDsrv', icon: faNetworkWired, x: 26, y: 63, ip: '10.0.10.1', base: 22 },
  { id: 'doff', label: 'nDoff', role: 'rDoff', icon: faNetworkWired, x: 74, y: 63, ip: '10.0.20.1', base: 38 },
  { id: 'db', label: 'nDb', role: 'rDb', icon: faDatabase, x: 11, y: 84, ip: '10.0.10.10', base: 58 },
  { id: 'app', label: 'nApp', role: 'rApp', icon: faServer, x: 26, y: 99, ip: '10.0.10.11', base: 44 },
  { id: 'bkp', label: 'nBkp', role: 'rBkp', icon: faHardDrive, x: 40, y: 84, ip: '10.0.10.12', base: 12 },
  { id: 'acc', label: 'nAcc', role: 'rAcc', icon: faNetworkWired, x: 61, y: 84, ip: '10.0.20.2', base: 31 },
  { id: 'wifi', label: 'nWifi', role: 'rWifi', icon: faWifi, x: 87, y: 84, ip: '10.0.30.1', base: 52 },
  { id: 'pc1', label: 'nPc1', role: 'rPc', icon: faDesktop, x: 52, y: 105, ip: '10.0.20.101', base: 18 },
  { id: 'pc2', label: 'nPc2', role: 'rPc', icon: faDesktop, x: 65, y: 119, ip: '10.0.20.102', base: 14 },
  { id: 'nb', label: 'nNb', role: 'rNb', icon: faLaptop, x: 77, y: 105, ip: '10.0.30.50', base: 27 },
  { id: 'cel', label: 'nCel', role: 'rCel', icon: faMobileScreen, x: 92, y: 119, ip: '10.0.30.51', base: 9 },
];

const LINKS: readonly (readonly [string, string])[] = [
  ['ispA', 'fw'], ['ispB', 'fw'], ['fw', 'core'], ['core', 'dsrv'], ['core', 'doff'],
  ['dsrv', 'db'], ['dsrv', 'app'], ['dsrv', 'bkp'], ['doff', 'acc'], ['doff', 'wifi'],
  ['acc', 'pc1'], ['acc', 'pc2'], ['wifi', 'nb'], ['wifi', 'cel'],
];

const COLORS: Record<Traffic, string> = { http: '#f99126', db: '#0ea5a4', stream: '#3b82f6', voip: '#22c55e' };

/** Fluxos de tráfego. `inet` vira duas rotas (operadora A e B) que se alternam no failover. */
const FLOWS: readonly { from: string; to: string; type: Traffic; period: number; phase: number }[] = [
  { from: 'pc1', to: 'db', type: 'db', period: 5.2, phase: 0.1 },
  { from: 'pc2', to: 'app', type: 'http', period: 6.1, phase: 0.55 },
  { from: 'nb', to: 'app', type: 'http', period: 7.3, phase: 0.8 },
  { from: 'app', to: 'bkp', type: 'db', period: 4.3, phase: 0.3 },
  { from: 'db', to: 'pc2', type: 'db', period: 6.7, phase: 0.05 },
  { from: 'nb', to: 'inet', type: 'http', period: 5.7, phase: 0.25 },
  { from: 'cel', to: 'inet', type: 'stream', period: 4.9, phase: 0.6 },
  { from: 'pc1', to: 'inet', type: 'voip', period: 6.4, phase: 0.9 },
  { from: 'inet', to: 'cel', type: 'stream', period: 5.3, phase: 0.4 },
  { from: 'inet', to: 'pc2', type: 'http', period: 7.9, phase: 0.7 },
  { from: 'inet', to: 'app', type: 'http', period: 6.9, phase: 0.15 },
];

@Component({
  selector: 'app-network-management',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './network-management.component.html',
  styleUrls: ['./network-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkManagementComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly zone = inject(NgZone);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly packetEls = viewChildren<ElementRef<SVGCircleElement>>('pkt');
  private readonly fwRing = viewChild<ElementRef<HTMLElement>>('fwRing');

  readonly icons = {
    net: faNetworkWired, info: faCircleInfo, warn: faTriangleExclamation, cut: faPlugCircleXmark, restore: faRotate,
  };
  readonly H = H;
  readonly nodes = NODES;
  readonly links = LINKS.map(([a, b]) => ({ id: `${a}-${b}`, a: this.node(a), b: this.node(b) }));
  readonly legend: readonly { key: Key; color: string }[] = [
    { key: 'lHttp', color: COLORS.http },
    { key: 'lDb', color: COLORS.db },
    { key: 'lStream', color: COLORS.stream },
    { key: 'lVoip', color: COLORS.voip },
  ];
  readonly packets: readonly PacketDef[] = this.buildPackets();

  readonly uplink = signal<UplinkState>('normal');
  readonly bandwidth = signal(2.4);
  readonly latency = signal(14);
  readonly threats = signal(37);
  readonly selectedId = signal('fw');
  readonly selected = computed(() => this.node(this.selectedId()));
  readonly selectedLoad = signal(34);
  readonly log = signal<LogEvent[]>(this.seedLog());
  /** Banda por aplicação (em %), atualizada ao vivo. */
  readonly appShares = signal<{ key: Key; color: string; pct: number }[]>(APP_SHARES.map((a) => ({ key: a.key, color: a.color, pct: a.base })));
  readonly devicesOnline = signal(NODES.length + 38);
  readonly statusKey = computed<Key>(() =>
    this.uplink() === 'normal' ? 'statusNormal' : this.uplink() === 'failover' ? 'statusFailover' : 'statusRecovering',
  );

  private readonly rand = rng(77);
  private loop?: SimLoop;
  private state: UplinkState = 'normal';
  /** 1 = tráfego pela operadora A; 0 = pela B. Varia de forma contínua na comutação. */
  private up = 1;
  private nextFailAt = 13;
  private failUntil = 0;
  private recoverUntil = 0;
  private nextThreatAt = 6;
  private nextRoutineAt = 3;
  private routineIdx = 0;
  /** Tour automático pelos dispositivos enquanto ninguém interage. */
  private nextTourAt = 5;
  private holdUntil = 0;
  private logId = 0;
  private publishAcc = 0;
  private readonly pt: Pt = { x: 0, y: 0 };

  ngAfterViewInit(): void {
    this.loop = new SimLoop(this.host.nativeElement, this.zone, (t, dt) => this.frame(t, dt), 8);
    this.loop.start();
  }

  ngOnDestroy(): void {
    this.loop?.destroy();
  }

  // --- Interação ---
  select(id: string): void {
    this.holdUntil = (this.loop?.now() ?? 0) + 15;
    this.selectedId.set(id);
    this.selectedLoad.set(Math.round(this.loadOf(id, this.loop?.now() ?? 0)));
  }

  toggleUplink(): void {
    const t = this.loop?.now() ?? 0;
    if (this.state === 'normal') {
      this.fail(t);
      // Falha pedida pelo usuário dura mais; se ele sair, a demo se recupera sozinha.
      this.failUntil = t + 25;
    } else if (this.state === 'failover') {
      this.recover(t);
      this.nextFailAt = t + 45;
    }
  }

  // --- Apresentação ---
  top(y: number): number {
    return (y / H) * 100;
  }

  status(id: string): NodeStatus {
    const u = this.uplink();
    if (id === 'ispA') return u === 'normal' ? 'online' : u === 'failover' ? 'offline' : 'recovering';
    if (id === 'ispB') return u === 'normal' ? 'standby' : 'active';
    return 'online';
  }

  statusLabel(id: string): Key {
    const map: Record<NodeStatus, Key> = {
      online: 'stOnline', offline: 'stOffline', recovering: 'stRecovering', standby: 'stStandby', active: 'stActive',
    };
    return map[this.status(id)];
  }

  eventText(e: LogEvent): string {
    const params: Params = {};
    if (e.n !== undefined) {
      params['n'] = this.i18n.number(e.n);
      params['ms'] = this.i18n.number(e.n);
    }
    if (e.ip) params['ip'] = e.ip;
    if (e.key === 'evPeak' && e.n !== undefined) params['n'] = this.num(e.n / 10, 1);
    return this.t(e.key, params);
  }

  eventTime(e: LogEvent): string {
    return this.i18n.date(e.time, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  }

  num(v: number, digits = 0): string {
    return this.i18n.number(v, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  pct(v: number): string {
    return this.i18n.number(v / 100, { style: 'percent', maximumFractionDigits: 0 });
  }

  // --- Simulação (fora da NgZone) ---
  private frame(t: number, dt: number): void {
    if (this.state === 'normal' && t >= this.nextFailAt) {
      this.fail(t);
      this.failUntil = t + 8;
    } else if (this.state === 'failover' && t >= this.failUntil) {
      this.recover(t);
    } else if (this.state === 'recovering' && t >= this.recoverUntil) {
      this.state = 'normal';
      this.nextFailAt = Math.max(this.nextFailAt, t + 24);
      this.uplink.set('normal');
      this.addEvent('evRestored', 'ok');
    }

    if (t >= this.nextThreatAt) {
      this.nextThreatAt = t + 9 + this.rand() * 8;
      this.threats.update((n) => n + 1);
      this.addEvent('evThreat', 'warn', undefined, `203.0.113.${20 + Math.floor(this.rand() * 200)}`);
      // Pulso no firewall sem recriar o nó (a animação é disparada pela Web Animations API).
      this.fwRing()?.nativeElement.animate?.(
        [{ transform: 'scale(1)', opacity: 0.7 }, { transform: 'scale(2.3)', opacity: 0 }],
        { duration: 900, easing: 'ease-out' },
      );
    }

    if (t >= this.nextRoutineAt) {
      this.nextRoutineAt = t + 3.5 + this.rand() * 3;
      const r = ROUTINE[this.routineIdx++ % ROUTINE.length];
      if (r.param === 'ip') {
        const ip = r.key === 'evVpn' ? `177.${40 + Math.floor(this.rand() * 80)}.${Math.floor(this.rand() * 250)}.${Math.floor(this.rand() * 250)}` : `10.0.30.${60 + Math.floor(this.rand() * 120)}`;
        if (r.key === 'evDhcp') this.devicesOnline.update((n) => n + 1);
        this.addEvent(r.key, r.level, undefined, ip);
      } else if (r.param === 'n') {
        this.addEvent(r.key, r.level, r.key === 'evPeak' ? 31 + Math.floor(this.rand() * 9) : 40 + Math.floor(this.rand() * 90));
      } else {
        this.addEvent(r.key, r.level);
      }
    }

    // Modo vitrine: percorre os dispositivos enquanto ninguém interage.
    if (!this.loop?.reduced && t >= this.holdUntil && t >= this.nextTourAt) {
      this.nextTourAt = t + 5;
      const order = ['fw', 'core', 'db', 'app', 'wifi', 'ispA', 'bkp', 'ispB'];
      const i = order.indexOf(this.selectedId());
      const next = order[(i + 1) % order.length];
      this.selectedId.set(next);
      this.selectedLoad.set(Math.round(this.loadOf(next, t)));
    }

    // A comutação entre operadoras é um crossfade: pacotes de uma rota somem enquanto os da outra surgem.
    this.up = ease(this.up, this.state === 'normal' ? 1 : 0, dt, 0.45);

    const els = this.packetEls();
    for (let i = 0; i < this.packets.length; i++) {
      const p = this.packets[i];
      const el = els[i]?.nativeElement;
      if (!el) continue;
      const f = (t / p.period + p.phase) % 1;
      const weight = p.via === 'a' ? this.up : p.via === 'b' ? 1 - this.up : 1;
      // O pacote surge na origem e some no destino: a volta do ciclo não tem salto visível.
      const alpha = smoothstep(0, 0.07, f) * (1 - smoothstep(0.93, 1, f)) * weight;
      p.path.at(f, this.pt);
      el.setAttribute('cx', this.pt.x.toFixed(2));
      el.setAttribute('cy', this.pt.y.toFixed(2));
      el.setAttribute('opacity', alpha.toFixed(2));
    }

    this.publishAcc += dt;
    if (this.publishAcc >= 0.25) {
      this.publishAcc = 0;
      const backup = 1 - this.up;
      this.bandwidth.set((2.4 + 0.5 * Math.sin(t * 0.21) + 0.2 * Math.sin(t * 0.67)) * (1 - 0.35 * backup));
      this.latency.set(14 + 2 * Math.sin(t * 0.4) + Math.sin(t * 1.1) + 21 * backup);
      this.selectedLoad.set(Math.round(this.loadOf(this.selectedId(), t)));
      // Banda por aplicação: cada fatia oscila em torno da média; no failover o backup
      // é adiado (QoS) e o ERP ganha prioridade.
      const raw = APP_SHARES.map((a, i) => {
        let v = a.base + 4 * Math.sin(t * 0.17 + i * 1.9) + 2 * Math.sin(t * 0.53 + i);
        if (a.key === 'appBackup') v *= 1 - 0.8 * backup;
        if (a.key === 'appErp') v *= 1 + 0.5 * backup;
        return Math.max(2, v);
      });
      const sum = raw.reduce((x, y) => x + y, 0);
      this.appShares.set(APP_SHARES.map((a, i) => ({ key: a.key, color: a.color, pct: Math.round((raw[i] / sum) * 100) })));
    }
  }

  private fail(t: number): void {
    this.state = 'failover';
    this.failUntil = t + 8;
    this.uplink.set('failover');
    this.addEvent('evFail', 'warn', 700 + Math.round(this.rand() * 40) * 10);
  }

  private recover(t: number): void {
    this.state = 'recovering';
    this.recoverUntil = t + 3;
    this.uplink.set('recovering');
    this.addEvent('evRecovering', 'info');
  }

  private loadOf(id: string, t: number): number {
    const i = NODES.findIndex((n) => n.id === id);
    const wave = 7 * Math.sin(t * 0.31 + i * 1.7) + 3 * Math.sin(t * 0.83 + i);
    if (id === 'ispA') return clamp((NODES[i].base + wave) * this.up, 0, 100);
    if (id === 'ispB') return clamp(4 + (68 + wave) * (1 - this.up), 0, 100);
    return clamp(NODES[i].base + wave, 2, 100);
  }

  private addEvent(key: Key, level: LogEvent['level'], n?: number, ip?: string): void {
    const next = [{ id: ++this.logId, time: new Date(), key, level, n, ip }, ...this.log()];
    this.log.set(next.slice(0, 6));
  }

  /** Histórico dos últimos minutos, para o painel não abrir vazio. */
  private seedLog(): LogEvent[] {
    const now = Date.now();
    const at = (s: number) => new Date(now - s * 1000);
    return [
      { id: -1, time: at(4), key: 'evStart', level: 'info', n: NODES.length + 38 },
      { id: -2, time: at(47), key: 'evBackup', level: 'ok', n: 86 },
      { id: -3, time: at(95), key: 'evThreat', level: 'warn', ip: '203.0.113.87' },
      { id: -4, time: at(160), key: 'evVpn', level: 'info', ip: '177.84.12.201' },
    ];
  }

  private node(id: string): NodeDef {
    return NODES.find((n) => n.id === id)!;
  }

  private buildPackets(): PacketDef[] {
    const out: PacketDef[] = [];
    let id = 0;
    for (const flow of FLOWS) {
      const viaInternet = flow.from === 'inet' || flow.to === 'inet';
      for (const via of viaInternet ? (['a', 'b'] as const) : [null]) {
        const isp = via === 'b' ? 'ispB' : 'ispA';
        const from = flow.from === 'inet' ? isp : flow.from;
        const to = flow.to === 'inet' ? isp : flow.to;
        const pts = this.route(from, to).map((nodeId) => {
          const n = this.node(nodeId);
          return { x: n.x, y: n.y };
        });
        out.push({ id: id++, color: COLORS[flow.type], path: new Polyline(pts), period: flow.period, phase: flow.phase, via });
      }
    }
    return out;
  }

  /** Busca em largura; a rede é uma árvore, então o caminho é único. */
  private route(from: string, to: string): string[] {
    const queue: string[][] = [[from]];
    const seen = new Set([from]);
    while (queue.length) {
      const path = queue.shift()!;
      const last = path[path.length - 1];
      if (last === to) return path;
      for (const [a, b] of LINKS) {
        const next = a === last ? b : b === last ? a : null;
        if (next && !seen.has(next)) {
          seen.add(next);
          queue.push([...path, next]);
        }
      }
    }
    return [from];
  }
}
