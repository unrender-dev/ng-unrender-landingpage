import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy,
  computed, inject, signal, viewChildren,
} from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBolt, faListCheck, faPowerOff, faRotateRight, faServer, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { I18nService } from '../../../../i18n/i18n.service';
import { SimLoop, clamp, ease, rng } from '../infra-shared/sim-loop';
import { I18N } from './physical-server-rack.i18n';

type Key = keyof (typeof I18N)['pt'];
type ServerState = 'online' | 'offline' | 'booting';

const JOB_KEYS = ['jobBatch', 'jobVision', 'jobData', 'jobEval', 'jobRender', 'jobLlm', 'jobEmbed'] as const satisfies readonly Key[];
const VRAM_TOTAL = 24;
const BOOT_SECONDS = 3;

interface Job {
  id: number;
  key: Key;
  /** Segundos de GPU necessários. */
  duration: number;
  progress: number;
  intensity: number;
  vram: number;
}

/** Estado físico contínuo de uma GPU (atualizado a cada quadro). */
interface GpuSim {
  load: number;
  temp: number;
  vram: number;
  fan: number;
  angle: number;
  phase: number;
  idleUntil: number;
  job: Job | null;
}

interface ServerSim {
  id: string;
  name: string;
  state: ServerState;
  bootUntil: number;
  power: number;
  gpus: GpuSim[];
}

/** Retrato arredondado do estado, publicado algumas vezes por segundo para o template. */
export interface GpuView {
  n: number;
  load: number;
  temp: number;
  vram: number;
  job: Key | null;
  progress: number;
}

export interface ServerView {
  id: string;
  name: string;
  index: number;
  state: ServerState;
  power: number;
  gpus: GpuView[];
}

@Component({
  selector: 'app-physical-server-rack',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './physical-server-rack.component.html',
  styleUrls: ['./physical-server-rack.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhysicalServerRackComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly zone = inject(NgZone);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly rotors = viewChildren<ElementRef<SVGGElement>>('rotor');

  readonly icons = { bolt: faBolt, queue: faListCheck, power: faPowerOff, restart: faRotateRight, server: faServer, done: faCircleCheck };
  readonly vramTotal = VRAM_TOTAL;
  readonly blades = [0, 72, 144, 216, 288];
  readonly ports = Array.from({ length: 12 }, (_, i) => i);
  readonly battery = [0, 1, 2, 3, 4];

  private readonly rand = rng(20240);
  private readonly sim: ServerSim[] = Array.from({ length: 4 }, (_, i) => ({
    id: `node-${i + 1}`,
    name: `AI-NODE-0${i + 1}`,
    state: 'online' as ServerState,
    bootUntil: 0,
    power: 180,
    gpus: Array.from({ length: 3 }, () => ({
      load: 3, temp: 34, vram: 0.6, fan: 0.15, angle: this.rand() * 72,
      phase: this.rand() * 6.28, idleUntil: this.rand() * 3, job: null,
    })),
  }));
  private pending: Job[] = [];
  private jobId = 0;
  private nextJobAt = 0;
  private doneCount = 128;

  readonly servers = signal<ServerView[]>(this.snapshot());
  readonly queue = signal<{ id: number; key: Key }[]>([]);
  /** Tarefas na fila além das três mostradas. */
  readonly queueExtra = signal(0);
  readonly done = signal(this.doneCount);
  readonly totalPower = signal(0.9);
  readonly selectedId = signal(this.sim[0].id);
  readonly selected = computed(() => this.servers().find((s) => s.id === this.selectedId()) ?? this.servers()[0]);

  private loop?: SimLoop;
  private publishAcc = 0;
  private holdUntil = 0;
  private nextAutoSelect = 6;

  ngAfterViewInit(): void {
    // Começa com o rack já trabalhando: quase todas as GPUs com tarefa em andamento
    // (progresso variado) e uma fila esperando, como num rack de produção.
    for (const server of this.sim) {
      for (const gpu of server.gpus) {
        if (this.rand() < 0.85) {
          const job = this.makeJob();
          job.progress = this.rand() * 0.8;
          gpu.job = job;
          gpu.load = job.intensity;
          gpu.temp = 34 + job.intensity * 0.42;
          gpu.vram = job.vram;
          gpu.fan = clamp((gpu.temp - 34) / 38, 0.14, 1);
        }
      }
    }
    for (let i = 0; i < 5; i++) this.pending.push(this.makeJob());
    this.publish();
    this.loop = new SimLoop(this.host.nativeElement, this.zone, (t, dt) => this.frame(t, dt), 12);
    this.loop.start();
  }

  ngOnDestroy(): void {
    this.loop?.destroy();
  }

  // --- Interação ---
  select(id: string): void {
    this.selectedId.set(id);
    this.hold();
  }

  onServerKey(event: Event, id: string): void {
    event.preventDefault();
    this.select(id);
  }

  toggle(id: string): void {
    const server = this.sim.find((s) => s.id === id);
    if (!server || server.state === 'booting') return;
    this.hold();
    if (server.state === 'online') {
      server.state = 'offline';
      // As tarefas em andamento voltam para o início da fila, mantendo o progresso (checkpoint).
      for (const gpu of server.gpus) {
        if (gpu.job) this.pending.unshift(gpu.job);
        gpu.job = null;
      }
    } else {
      server.state = 'booting';
      server.bootUntil = (this.loop?.now() ?? 0) + BOOT_SECONDS;
    }
    this.publish();
  }

  /** O usuário assumiu: a seleção automática só volta depois de um tempo sem interação. */
  private hold(): void {
    this.holdUntil = (this.loop?.now() ?? 0) + 15;
  }

  // --- Formatação ---
  num(v: number, digits = 0): string {
    return this.i18n.number(v, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
  pct(v: number): string {
    return this.i18n.number(v / 100, { style: 'percent', maximumFractionDigits: 0 });
  }
  stateKey(state: ServerState): Key {
    return state;
  }
  loadColor(load: number): string {
    return load >= 85 ? '#ef4444' : load >= 55 ? '#f99126' : '#34d399';
  }
  portServer(port: number): ServerView | null {
    return port < 8 ? this.servers()[port >> 1] : null;
  }

  // --- Simulação (fora da NgZone) ---
  private makeJob(): Job {
    return {
      id: ++this.jobId,
      key: JOB_KEYS[Math.floor(this.rand() * JOB_KEYS.length)],
      duration: 8 + this.rand() * 10,
      progress: 0,
      intensity: 68 + this.rand() * 30,
      vram: 8 + this.rand() * 14,
    };
  }

  private frame(t: number, dt: number): void {
    // A fila é reabastecida indefinidamente: a simulação nunca "termina" para recomeçar.
    if (t >= this.nextJobAt && this.pending.length < 7) {
      this.pending.push(this.makeJob());
      this.nextJobAt = t + Math.max(0.35, 0.95 - 0.6 * Math.cos(t * 0.13)) + this.rand() * 0.3;
    }

    let total = 95;
    let k = 0;
    const rotors = this.rotors();
    for (const server of this.sim) {
      if (server.state === 'booting' && t >= server.bootUntil) server.state = 'online';
      const online = server.state === 'online';
      let power = online ? 180 : server.state === 'booting' ? 120 : 0;

      for (const gpu of server.gpus) {
        if (online && !gpu.job && t >= gpu.idleUntil && this.pending.length) {
          gpu.job = this.pending.shift()!;
        }
        if (gpu.job) {
          gpu.job.progress += dt / gpu.job.duration;
          if (gpu.job.progress >= 1) {
            gpu.job = null;
            gpu.idleUntil = t + 0.4 + this.rand() * 0.8;
            this.doneCount++;
          }
        }
        const targetLoad = !online ? 0 : gpu.job ? gpu.job.intensity + 4 * Math.sin(t * 0.8 + gpu.phase) : 3;
        // Interpolação exponencial: os valores deslizam até o alvo, sem saltos a cada tick.
        gpu.load = ease(gpu.load, clamp(targetLoad, 0, 100), dt, 1.1);
        gpu.temp = ease(gpu.temp, online ? 34 + gpu.load * 0.42 : 24, dt, online ? 3.5 : 6);
        gpu.vram = ease(gpu.vram, online ? (gpu.job ? gpu.job.vram : 0.6) : 0, dt, 0.9);
        gpu.fan = ease(gpu.fan, online ? clamp((gpu.temp - 34) / 38, 0.14, 1) : 0, dt, online ? 1.4 : 2.2);
        gpu.angle = (gpu.angle + gpu.fan * 640 * dt) % 360;
        if (online) power += 28 + gpu.load * 3.1;

        // Dois rotores por GPU, defasados para não girarem "em espelho".
        const a = gpu.angle.toFixed(1);
        rotors[k++]?.nativeElement.setAttribute('transform', `rotate(${a})`);
        rotors[k++]?.nativeElement.setAttribute('transform', `rotate(${((gpu.angle + 31) % 360).toFixed(1)})`);
      }
      server.power = ease(server.power, power, dt, 0.8);
      total += server.power;
    }
    this.rackPower = total;

    // Modo vitrine: percorre os servidores enquanto ninguém interage.
    if (!this.loop?.reduced && t >= this.holdUntil && t >= this.nextAutoSelect) {
      const i = this.sim.findIndex((s) => s.id === this.selectedId());
      this.selectedId.set(this.sim[(i + 1) % this.sim.length].id);
      this.nextAutoSelect = t + 6;
    }
    if (t < this.holdUntil) this.nextAutoSelect = this.holdUntil;

    this.publishAcc += dt;
    if (this.publishAcc >= 0.2) {
      this.publishAcc = 0;
      this.publish();
    }
  }

  private rackPower = 900;

  private publish(): void {
    this.servers.set(this.snapshot());
    this.queue.set(this.pending.slice(0, 3).map((j) => ({ id: j.id, key: j.key })));
    this.queueExtra.set(Math.max(0, this.pending.length - 3));
    this.done.set(this.doneCount);
    this.totalPower.set(this.rackPower / 1000);
  }

  private snapshot(): ServerView[] {
    return this.sim.map((s, index) => ({
      id: s.id,
      name: s.name,
      index,
      state: s.state,
      power: Math.round(s.power),
      gpus: s.gpus.map((g, n) => ({
        n: n + 1,
        load: Math.round(g.load),
        temp: Math.round(g.temp),
        vram: Math.round(g.vram * 10) / 10,
        job: g.job?.key ?? null,
        progress: g.job ? Math.min(100, Math.round(g.job.progress * 100)) : 0,
      })),
    }));
  }
}
