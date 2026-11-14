import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy,
  computed, inject, signal, viewChildren,
} from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faCloud, faDesktop, faHardDrive, faLaptop, faLock, faLockOpen, faMapLocationDot, faMobileScreen,
  faNetworkWired, faPhone, faPlug, faPlugCircleXmark, faPrint, faServer, faShieldHalved, faWifi,
} from '@fortawesome/free-solid-svg-icons';
import { I18nService, Params } from '../../../../i18n/i18n.service';
import { Polyline, Pt, SimLoop, ease, smoothstep } from '../infra-shared/sim-loop';
import { I18N } from './physical-network-topology.i18n';

type Key = keyof (typeof I18N)['pt'];
type DeviceStatus = 'online' | 'down' | 'reconnect';
type CableKind = 'fiber' | 'utp' | 'wifi';

interface DeviceDef {
  id: string;
  label: Key;
  type: Key;
  icon: IconDefinition;
  x: number;
  y: number;
  ip: string;
  mac: string;
  conn: Key;
  port?: number;
  meters?: number;
  dbm?: number;
  /** Equipamento de ponta: pode ser desconectado na simulação. */
  edge?: boolean;
  /** Usa o túnel VPN ao sair para a internet. */
  client?: boolean;
}

interface CableDef {
  id: string;
  kind: CableKind;
  points: string;
  /** Equipamento de ponta ligado por este cabo (o cabo acompanha o estado dele). */
  device?: string;
}

interface PacketDef {
  id: number;
  color: string;
  path: Polyline;
  period: number;
  phase: number;
  from: string;
  to: string;
  /** Trecho do caminho (frações) que passa pelo enlace externo, onde o túnel VPN se aplica. */
  wan: [number, number] | null;
}

/** Altura da planta em unidades do viewBox (a largura é 100). */
const H = 104;
const SW: Pt = { x: 38, y: 48 };
const TRAY = 66;

const DEVICES: readonly DeviceDef[] = [
  { id: 'isp', label: 'dIsp', type: 'tIsp', icon: faCloud, x: 14, y: 6, ip: '203.0.113.1', mac: '—', conn: 'cWan' },
  { id: 'modem', label: 'dModem', type: 'tModem', icon: faHardDrive, x: 14, y: 27, ip: '203.0.113.10', mac: '3C:52:A1:0B:7E:10', conn: 'cFiber' },
  { id: 'fw', label: 'dFw', type: 'tFw', icon: faShieldHalved, x: 38, y: 27, ip: '192.168.1.1', mac: '3C:52:A1:0B:7E:11', conn: 'cRack', meters: 1 },
  { id: 'sw', label: 'dSw', type: 'tSw', icon: faNetworkWired, x: 38, y: 48, ip: '192.168.1.2', mac: '3C:52:A1:0B:7E:12', conn: 'cRack', meters: 1 },
  { id: 'srv', label: 'dSrv', type: 'tSrv', icon: faServer, x: 14, y: 48, ip: '192.168.1.10', mac: '3C:52:A1:44:90:0A', conn: 'cUtp', port: 2, meters: 3, edge: true },
  { id: 'ap', label: 'dAp', type: 'tAp', icon: faWifi, x: 74, y: 27, ip: '192.168.1.5', mac: '3C:52:A1:66:18:05', conn: 'cUtp', port: 5, meters: 24 },
  { id: 'nb', label: 'dNb', type: 'tNb', icon: faLaptop, x: 62, y: 48, ip: '192.168.1.102', mac: '9A:1F:07:C2:55:66', conn: 'cWifi', dbm: -48, edge: true, client: true },
  { id: 'cel', label: 'dCel', type: 'tCel', icon: faMobileScreen, x: 87, y: 48, ip: '192.168.1.103', mac: 'D2:40:8B:1E:73:67', conn: 'cWifi', dbm: -61, edge: true, client: true },
  { id: 'pc1', label: 'dPc1', type: 'tPc', icon: faDesktop, x: 15, y: 85, ip: '192.168.1.101', mac: '3C:52:A1:91:2D:65', conn: 'cUtp', port: 7, meters: 18, edge: true, client: true },
  { id: 'pc2', label: 'dPc2', type: 'tPc', icon: faDesktop, x: 38, y: 85, ip: '192.168.1.104', mac: '3C:52:A1:91:2D:68', conn: 'cUtp', port: 8, meters: 11, edge: true, client: true },
  { id: 'tel', label: 'dTel', type: 'tTel', icon: faPhone, x: 62, y: 85, ip: '192.168.1.201', mac: '00:1B:9E:5A:C0:C9', conn: 'cUtp', port: 12, meters: 16, edge: true },
  { id: 'prn', label: 'dPrn', type: 'tPrn', icon: faPrint, x: 86, y: 85, ip: '192.168.1.220', mac: '00:1B:9E:7D:02:DC', conn: 'cUtp', port: 14, meters: 27, edge: true },
];

/** Caminho físico de cada equipamento até o switch (cabos em ângulo reto pela eletrocalha). */
const TO_SWITCH: Record<string, Pt[]> = {
  isp: [{ x: 14, y: 6 }, { x: 14, y: 27 }, { x: 38, y: 27 }, SW],
  srv: [{ x: 14, y: 48 }, SW],
  nb: [{ x: 62, y: 48 }, { x: 74, y: 27 }, { x: 74, y: TRAY }, { x: 38, y: TRAY }, SW],
  cel: [{ x: 87, y: 48 }, { x: 74, y: 27 }, { x: 74, y: TRAY }, { x: 38, y: TRAY }, SW],
  pc1: [{ x: 15, y: 85 }, { x: 15, y: TRAY }, { x: 38, y: TRAY }, SW],
  pc2: [{ x: 38, y: 85 }, SW],
  tel: [{ x: 62, y: 85 }, { x: 62, y: TRAY }, { x: 38, y: TRAY }, SW],
  prn: [{ x: 86, y: 85 }, { x: 86, y: TRAY }, { x: 38, y: TRAY }, SW],
};

const pts = (list: Pt[]) => list.map((p) => `${p.x},${p.y}`).join(' ');

const CABLES: readonly CableDef[] = [
  { id: 'c-isp', kind: 'fiber', points: '14,6 14,27' },
  { id: 'c-modem', kind: 'utp', points: '14,27 38,27' },
  { id: 'c-fw', kind: 'utp', points: `38,27 ${SW.x},${SW.y}` },
  { id: 'c-ap', kind: 'utp', points: `${SW.x},${SW.y} 38,${TRAY} 74,${TRAY} 74,27` },
  { id: 'c-srv', kind: 'utp', points: pts(TO_SWITCH['srv']), device: 'srv' },
  { id: 'c-pc1', kind: 'utp', points: pts(TO_SWITCH['pc1']), device: 'pc1' },
  { id: 'c-pc2', kind: 'utp', points: pts(TO_SWITCH['pc2']), device: 'pc2' },
  { id: 'c-tel', kind: 'utp', points: pts(TO_SWITCH['tel']), device: 'tel' },
  { id: 'c-prn', kind: 'utp', points: pts(TO_SWITCH['prn']), device: 'prn' },
  { id: 'c-nb', kind: 'wifi', points: '62,48 74,27', device: 'nb' },
  { id: 'c-cel', kind: 'wifi', points: '87,48 74,27', device: 'cel' },
];

const DATA = '#3b82f6';
const VOICE = '#22c55e';
/** Comprimento do enlace externo (firewall → modem → operadora), em unidades do viewBox. */
const WAN_LENGTH = 24 + 21;

const FLOWS: readonly { from: string; to: string; color: string; period: number; phase: number }[] = [
  { from: 'pc1', to: 'srv', color: DATA, period: 5.6, phase: 0.1 },
  { from: 'pc2', to: 'isp', color: DATA, period: 6.8, phase: 0.45 },
  { from: 'tel', to: 'isp', color: VOICE, period: 5.1, phase: 0.8 },
  { from: 'nb', to: 'isp', color: DATA, period: 7.4, phase: 0.3 },
  { from: 'isp', to: 'cel', color: DATA, period: 6.2, phase: 0.65 },
  { from: 'pc2', to: 'prn', color: DATA, period: 8.3, phase: 0.2 },
  { from: 'srv', to: 'nb', color: DATA, period: 6.5, phase: 0.9 },
  { from: 'isp', to: 'pc1', color: DATA, period: 7.9, phase: 0.55 },
  { from: 'isp', to: 'tel', color: VOICE, period: 5.9, phase: 0.05 },
];

/** Ordem em que a vitrine desconecta os equipamentos de ponta. */
const FAULT_CYCLE = ['prn', 'pc1', 'nb', 'tel', 'pc2', 'cel'];

@Component({
  selector: 'app-physical-network-topology',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './physical-network-topology.component.html',
  styleUrls: ['./physical-network-topology.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhysicalNetworkTopologyComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly zone = inject(NgZone);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly packetEls = viewChildren<ElementRef<SVGGElement>>('pkt');
  private readonly ringEls = viewChildren<ElementRef<SVGCircleElement>>('ring');

  readonly icons = { plan: faMapLocationDot, lock: faLock, lockOpen: faLockOpen, unplug: faPlugCircleXmark, plug: faPlug };
  readonly H = H;
  readonly tray = TRAY;
  readonly devices = DEVICES;
  readonly cables = CABLES;
  readonly packets: readonly PacketDef[] = FLOWS.map((f, id) => this.buildPacket(f, id));
  readonly rooms: readonly { key: Key; x: number; y: number }[] = [
    { key: 'roomStreet', x: 46, y: 4.3 },
    { key: 'roomTech', x: 19, y: 15.5 },
    { key: 'roomMeeting', x: 54, y: 15.5 },
    { key: 'roomOffice', x: 5, y: 97 },
  ];

  readonly vpn = signal(true);
  readonly fault = signal<{ id: string; phase: 'down' | 'reconnect' } | null>(null);
  readonly selectedId = signal('sw');
  readonly selected = computed(() => DEVICES.find((d) => d.id === this.selectedId())!);
  readonly selectedStatus = computed(() => this.status(this.selectedId()));
  readonly activity = computed<{ key: Key; tone: 'ok' | 'bad' | 'wait' | 'vpn' }[]>(() => {
    const d = this.selected();
    const st = this.selectedStatus();
    if (st === 'down') return [{ key: 'aDown', tone: 'bad' }];
    if (st === 'reconnect') return [{ key: 'aRe', tone: 'wait' }];
    const lines: { key: Key; tone: 'ok' | 'bad' | 'wait' | 'vpn' }[] = [{ key: 'aLink', tone: 'ok' }];
    if (d.id !== 'isp') lines.push({ key: 'aDhcp', tone: 'ok' });
    if (this.vpn() && d.client) lines.push({ key: 'aVpn', tone: 'vpn' });
    return lines;
  });

  private loop?: SimLoop;
  private vpnMix = 1;
  private readonly health: Record<string, number> = Object.fromEntries(DEVICES.map((d) => [d.id, 1]));
  private faultUntil = 0;
  private nextFaultAt = 11;
  private faultIndex = 0;
  private holdUntil = 0;
  private readonly pt: Pt = { x: 0, y: 0 };

  ngAfterViewInit(): void {
    this.loop = new SimLoop(this.host.nativeElement, this.zone, (t, dt) => this.frame(t, dt), 6);
    this.loop.start();
  }

  ngOnDestroy(): void {
    this.loop?.destroy();
  }

  // --- Interação ---
  select(id: string): void {
    this.selectedId.set(id);
    this.hold(12);
  }

  toggleVpn(): void {
    this.vpn.update((v) => !v);
    this.hold(8);
  }

  toggleCable(id: string): void {
    const t = this.loop?.now() ?? 0;
    const f = this.fault();
    if (f?.id === id) {
      if (f.phase === 'down') this.beginReconnect(t);
    } else {
      // Um equipamento por vez; se o usuário sair, ele se reconecta sozinho depois.
      this.fault.set({ id, phase: 'down' });
      this.faultUntil = t + 20;
    }
    this.hold(30);
  }

  /** O usuário assumiu: as quedas automáticas só voltam depois de um tempo sem interação. */
  private hold(seconds: number): void {
    const t = this.loop?.now() ?? 0;
    this.holdUntil = Math.max(this.holdUntil, t + seconds);
    this.nextFaultAt = Math.max(this.nextFaultAt, this.holdUntil);
  }

  // --- Apresentação ---
  top(y: number): number {
    return (y / H) * 100;
  }

  status(id: string): DeviceStatus {
    const f = this.fault();
    return f?.id === id ? f.phase : 'online';
  }

  statusKey(st: DeviceStatus): Key {
    return st === 'online' ? 'stOnline' : st === 'down' ? 'stDown' : 'stReconnect';
  }

  connection(d: DeviceDef): string {
    const params: Params = {};
    if (d.port) params['port'] = this.i18n.number(d.port, { minimumIntegerDigits: 2 });
    if (d.meters) params['m'] = this.i18n.number(d.meters);
    if (d.dbm) params['dbm'] = this.i18n.number(d.dbm);
    return this.t(d.conn, params);
  }

  // --- Simulação (fora da NgZone) ---
  private frame(t: number, dt: number): void {
    const f = this.fault();
    if (f && t >= this.faultUntil) {
      if (f.phase === 'down') this.beginReconnect(t);
      else {
        this.fault.set(null);
        this.nextFaultAt = Math.max(this.nextFaultAt, t + 13);
      }
    } else if (!f && !this.loop?.reduced && t >= this.nextFaultAt) {
      // Modo vitrine: desconecta um equipamento de ponta por vez e mostra a recuperação.
      const id = FAULT_CYCLE[this.faultIndex++ % FAULT_CYCLE.length];
      this.fault.set({ id, phase: 'down' });
      this.faultUntil = t + 6;
      if (t >= this.holdUntil) this.selectedId.set(id);
    }

    this.vpnMix = ease(this.vpnMix, this.vpn() ? 1 : 0, dt, 0.35);
    const now = this.fault();
    for (const d of DEVICES) {
      if (d.edge) this.health[d.id] = ease(this.health[d.id], now?.id === d.id ? 0 : 1, dt, 0.4);
    }

    const els = this.packetEls();
    const rings = this.ringEls();
    for (let i = 0; i < this.packets.length; i++) {
      const p = this.packets[i];
      const el = els[i]?.nativeElement;
      if (!el) continue;
      const k = (t / p.period + p.phase) % 1;
      // Surge na origem e some no destino; some também, aos poucos, se uma das pontas cair.
      const alpha =
        smoothstep(0, 0.06, k) * (1 - smoothstep(0.94, 1, k)) * Math.min(this.health[p.from], this.health[p.to]);
      p.path.at(k, this.pt);
      el.setAttribute('transform', `translate(${this.pt.x.toFixed(2)} ${this.pt.y.toFixed(2)})`);
      el.setAttribute('opacity', alpha.toFixed(2));
      // O anel indica o pacote encapsulado no túnel, só no trecho externo.
      const inWan = p.wan ? smoothstep(p.wan[0] - 0.03, p.wan[0] + 0.03, k) * (1 - smoothstep(p.wan[1] - 0.03, p.wan[1] + 0.03, k)) : 0;
      rings[i]?.nativeElement.setAttribute('opacity', (inWan * this.vpnMix).toFixed(2));
    }
  }

  private beginReconnect(t: number): void {
    const f = this.fault();
    if (!f) return;
    this.fault.set({ id: f.id, phase: 'reconnect' });
    this.faultUntil = t + 2.4;
  }

  private buildPacket(f: (typeof FLOWS)[number], id: number): PacketDef {
    const up = TO_SWITCH[f.from];
    const down = [...TO_SWITCH[f.to]].reverse().slice(1);
    const path = new Polyline([...up, ...down]);
    const share = WAN_LENGTH / path.length;
    const wan: [number, number] | null =
      f.from === 'isp' ? [-1, share] : f.to === 'isp' ? [1 - share, 2] : null;
    return { id, color: f.color, path, period: f.period, phase: f.phase, from: f.from, to: f.to, wan };
  }
}
