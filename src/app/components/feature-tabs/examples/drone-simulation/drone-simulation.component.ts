import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBatteryThreeQuarters,
  faGaugeHigh,
  faMapLocationDot,
  faMountain,
  faVideo,
} from '@fortawesome/free-solid-svg-icons';
import { I18nService } from '../../../../i18n/i18n.service';
import { I18N } from './drone-simulation.i18n';

type Mode = 'lidar' | 'cinema';
/** scan → done (pausa) → fade (nuvem some) → cinema → fade → scan … */
type Phase = 'scan' | 'done' | 'fade' | 'cinema';

interface CloudPoint {
  x: number;
  y: number;
  /** Quantas passadas do feixe são necessárias para este ponto aparecer. */
  need: number;
  hits: number;
  inside: boolean;
  alpha: number;
}

/** Cena em unidades fixas (160 × 100); o canvas e o drone escalam a partir daqui. */
const W = 160;
const H = 100;
const GROUND = 88;
const ROUTE = { cx: 80, rx: 62, ry: 4 };
const TAU = Math.PI * 2;

@Component({
  selector: 'app-drone-simulation',
  standalone: true,
  imports: [FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './drone-simulation.component.html',
  styleUrls: ['./drone-simulation.component.scss'],
})
export class DroneSimulationComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly zone = inject(NgZone);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  @ViewChild('view') private viewRef!: ElementRef<HTMLElement>;
  @ViewChild('cloud') private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('drone') private droneRef!: ElementRef<HTMLElement>;
  @ViewChild('body') private bodyRef!: ElementRef<HTMLElement>;

  readonly faMapLocationDot = faMapLocationDot;
  readonly faVideo = faVideo;
  readonly faBattery = faBatteryThreeQuarters;
  readonly faMountain = faMountain;
  readonly faGaugeHigh = faGaugeHigh;

  // Estado lido pelo template (atualizado poucas vezes por segundo)
  readonly mode = signal<Mode>('lidar');
  readonly scanDone = signal(false);
  readonly targetAltitude = signal(45);
  readonly targetSpeed = signal(12);
  readonly altitude = signal(45);
  readonly speed = signal(12);
  readonly battery = signal(86);
  readonly progress = signal(0);
  readonly pointCount = signal(0);
  private readonly recSeconds = signal(0);

  readonly statusLabel = computed(() =>
    this.mode() === 'cinema' ? this.t('stRecording') : this.scanDone() ? this.t('stDone') : this.t('stScanning'),
  );
  readonly recLabel = computed(() => {
    const s = this.recSeconds();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  });

  // Simulação (fora do Angular: nada aqui dispara change detection por quadro)
  private readonly cloud = buildCloud();
  private phase: Phase = 'scan';
  private phaseTime = 0;
  private afterFade: Mode = 'cinema';
  private theta = 0;
  private time = 0;
  private alt = 45;
  private spd = 12;
  private batt = 86;
  private charging = false;
  private cloudAlpha = 1;
  private beamAlpha = 0;
  private rec = 0;
  private droneX = ROUTE.cx - ROUTE.rx;
  private droneY = 24;
  private sinceEmit = 0;
  /** Enquanto o usuário mexe nos modos, a alternância automática fica suspensa. */
  private manualUntil = 0;

  private raf = 0;
  private last = 0;
  private inView = false;
  private viewW = 0;
  private viewH = 0;
  private ctx: CanvasRenderingContext2D | null = null;
  private ro: ResizeObserver | null = null;
  private io: IntersectionObserver | null = null;
  private readonly reduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly onVisibility = () => this.syncLoop();

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    if (this.reduced) {
      // Sem movimento: drone parado sobre a casa e nuvem de pontos completa.
      this.theta = Math.PI * 0.62;
      for (const p of this.cloud) {
        p.alpha = 1;
        p.hits = p.need;
      }
      this.setPhase('done');
    }
    this.zone.runOutsideAngular(() => {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.viewRef.nativeElement);
      this.resize();
      if (this.reduced) return;
      this.io = new IntersectionObserver((entries) => {
        this.inView = entries[entries.length - 1].isIntersecting;
        this.syncLoop();
      });
      this.io.observe(this.host.nativeElement);
      document.addEventListener('visibilitychange', this.onVisibility);
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.io?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  setMode(mode: Mode): void {
    if (this.reduced) {
      this.mode.set(mode);
      this.setPhase(mode === 'cinema' ? 'cinema' : 'done');
      this.renderStatic();
      return;
    }
    this.manualUntil = performance.now() + 20000;
    this.switchTo(mode);
  }

  onAltitude(event: Event): void {
    this.targetAltitude.set(+(event.target as HTMLInputElement).value);
    if (this.reduced) this.renderStatic();
  }

  onSpeed(event: Event): void {
    this.targetSpeed.set(+(event.target as HTMLInputElement).value);
    if (this.reduced) this.renderStatic();
  }

  // ---------------------------------------------------------------- loop

  /** Só anima quando está na tela e a aba está visível. */
  private syncLoop(): void {
    const run = this.inView && !document.hidden;
    if (run && !this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    } else if (!run && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private readonly frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    // dt limitado: voltar de uma aba em segundo plano não causa salto na rota.
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    this.draw();
  };

  private renderStatic(): void {
    this.alt = this.targetAltitude();
    this.spd = this.targetSpeed();
    this.altitude.set(this.alt);
    this.speed.set(this.spd);
    this.cloudAlpha = this.mode() === 'lidar' ? 1 : 0;
    this.update(0);
    this.draw();
  }

  private switchTo(mode: Mode): void {
    if (mode === this.mode() && this.phase !== 'fade') return;
    this.mode.set(mode);
    if (mode === 'cinema') {
      this.rec = 0;
      this.recSeconds.set(0);
      this.setPhase('cinema');
    } else if (this.cloudAlpha < 0.02) {
      this.restartScan();
    } else {
      // A nuvem antiga termina de sumir antes de a nova varredura começar.
      this.afterFade = 'lidar';
      this.setPhase('fade');
    }
  }

  private restartScan(): void {
    for (const p of this.cloud) {
      p.hits = 0;
      p.alpha = 0;
      p.inside = false;
    }
    this.mode.set('lidar');
    this.setPhase('scan');
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTime = 0;
    this.sinceEmit = 1; // o painel reflete a mudança de fase no próximo quadro
    // "Concluída" vale também enquanto a nuvem some; volta a "escaneando" só na nova varredura.
    if (phase === 'done') this.scanDone.set(true);
    else if (phase !== 'fade') this.scanDone.set(false);
  }

  private update(dt: number): void {
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);
    this.time += dt;
    this.phaseTime += dt;

    // Telemetria: persegue o alvo dos controles, sem degraus.
    this.spd += (this.targetSpeed() - this.spd) * ease(2.2);
    this.alt += (this.targetAltitude() - this.alt) * ease(1.6);

    // Rota fechada (elipse): o ângulo só avança, então nunca há teleporte.
    this.theta = (this.theta + this.spd * (Math.PI / 60) * dt) % TAU;
    const cy = 30 - ((this.alt - 10) / 90) * 18;
    this.droneX = ROUTE.cx - ROUTE.rx * Math.cos(this.theta);
    this.droneY = cy - ROUTE.ry * Math.sin(this.theta) + 0.7 * Math.sin(this.time * 1.7);

    // Bateria: descarrega devagar e, perto do fim, "troca" com uma subida suave.
    this.batt += (this.charging ? 7 : -0.04 * (this.spd / 12)) * dt;
    if (this.batt <= 24) this.charging = true;
    if (this.batt >= 97) this.charging = false;

    const lidar = this.mode() === 'lidar';
    const scanning = lidar && this.phase === 'scan';
    this.beamAlpha += ((scanning ? 1 : 0) - this.beamAlpha) * ease(5);
    const cloudTarget = lidar && this.phase !== 'fade' ? 1 : 0;
    this.cloudAlpha += (cloudTarget - this.cloudAlpha) * ease(3.2);

    let shown = 0;
    for (const p of this.cloud) {
      if (scanning) {
        const inside = Math.abs(p.x - this.droneX) < 4.5;
        if (inside && !p.inside) p.hits++;
        p.inside = inside;
      }
      if (p.hits >= p.need) {
        shown++;
        if (p.alpha < 1) p.alpha = Math.min(1, p.alpha + dt / 0.35);
      }
    }

    const auto = performance.now() > this.manualUntil;
    switch (this.phase) {
      case 'scan':
        if (shown === this.cloud.length) this.setPhase('done');
        break;
      case 'done':
        if (this.phaseTime > 2.8) {
          this.afterFade = auto ? 'cinema' : 'lidar';
          this.setPhase('fade');
        }
        break;
      case 'fade':
        if (this.cloudAlpha < 0.02) {
          this.restartScan();
          shown = 0;
          if (this.afterFade === 'cinema') {
            this.mode.set('cinema');
            this.rec = 0;
            this.setPhase('cinema');
          }
        }
        break;
      case 'cinema':
        this.rec += dt;
        // Duas travessias da rota e volta ao LiDAR (se ninguém escolheu o modo à mão).
        if (auto && this.phaseTime > 11) this.switchTo('lidar');
        break;
    }

    // Números do painel: 5 atualizações por segundo bastam e não pesam.
    this.sinceEmit += dt;
    if (this.sinceEmit >= 0.2 || dt === 0) {
      this.sinceEmit = 0;
      this.altitude.set(this.alt + 0.4 * Math.sin(this.time * 0.9));
      this.speed.set(this.spd + 0.3 * Math.sin(this.time * 1.3));
      this.battery.set(Math.round(this.batt));
      this.progress.set(Math.round((shown / this.cloud.length) * 100));
      this.pointCount.set(shown);
      this.recSeconds.set(Math.floor(this.rec));
    }
  }

  // ---------------------------------------------------------------- desenho

  private resize(): void {
    const view = this.viewRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    this.viewW = view.clientWidth;
    this.viewH = view.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(this.viewW * dpr));
    canvas.height = Math.max(1, Math.round(this.viewH * dpr));
    if (this.reduced) this.renderStatic();
    else this.draw();
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx || !this.viewW) return;
    const canvas = this.canvasRef.nativeElement;
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const x = this.droneX;
    const y = this.droneY;

    if (this.beamAlpha > 0.01) {
      const beam = ctx.createLinearGradient(0, y, 0, GROUND);
      beam.addColorStop(0, `rgba(249, 145, 38, ${0.4 * this.beamAlpha})`);
      beam.addColorStop(1, 'rgba(249, 145, 38, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x, y + 3);
      ctx.lineTo(x - 5.5, GROUND);
      ctx.lineTo(x + 5.5, GROUND);
      ctx.closePath();
      ctx.fill();
    }

    if (this.cloudAlpha > 0.01) {
      // Tamanho do ponto em pixels de tela (não cresce junto com a cena).
      const px = W / this.viewW;
      const dot = this.viewW < 480 ? 1.6 : 2.2;
      for (const p of this.cloud) {
        if (p.alpha <= 0) continue;
        // Ponto recém-lido nasce laranja e assenta no roxo da marca.
        ctx.fillStyle = p.alpha < 1 ? '#f99126' : '#10051c';
        ctx.globalAlpha = p.alpha * this.cloudAlpha * 0.85;
        const size = (p.alpha < 1 ? 1.5 : 1) * dot * px;
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    }

    const left = (x / W) * this.viewW;
    const top = (y / H) * this.viewH;
    // Inclina o nariz na direção do movimento, proporcional à velocidade horizontal.
    const tilt = Math.sin(this.theta) * 8;
    this.droneRef.nativeElement.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
    this.bodyRef.nativeElement.style.transform = `rotate(${tilt.toFixed(2)}deg)`;
  }
}

/** Nuvem de pontos da cena (casa, árvore e solo), sempre a mesma: semente fixa. */
function buildCloud(): CloudPoint[] {
  let seed = 20251;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pts: CloudPoint[] = [];
  const add = (x: number, y: number) =>
    pts.push({
      x: x + (rnd() - 0.5) * 0.7,
      y: y + (rnd() - 0.5) * 0.7,
      need: 1 + Math.floor(rnd() * 3),
      hits: 0,
      inside: false,
      alpha: 0,
    });
  const line = (x1: number, y1: number, x2: number, y2: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const k = rnd();
      add(x1 + (x2 - x1) * k, y1 + (y2 - y1) * k);
    }
  };

  // Telhado (duas águas) e beiral
  line(50, 58, 80, 38, 60);
  line(110, 58, 80, 38, 60);
  line(50, 58, 110, 58, 46);
  for (let i = 0; i < 70; i++) {
    const x = 53 + rnd() * 54;
    const top = 58 - (1 - Math.abs(x - 80) / 30) * 20;
    add(x, top + rnd() * (58 - top));
  }
  // Paredes e fachada
  line(56, 58, 56, 88, 30);
  line(104, 58, 104, 88, 30);
  for (let i = 0; i < 80; i++) add(56 + rnd() * 48, 59 + rnd() * 29);
  // Porta e janelas
  for (const [x1, y1, x2, y2] of [[75, 70, 85, 88], [61, 64, 70, 74], [90, 64, 99, 74]]) {
    line(x1, y1, x2, y1, 8);
    line(x1, y2, x2, y2, 8);
    line(x1, y1, x1, y2, 8);
    line(x2, y1, x2, y2, 8);
  }
  // Árvore
  for (let i = 0; i < 48; i++) {
    const a = rnd() * TAU;
    const r = Math.sqrt(rnd()) * 8;
    add(33 + Math.cos(a) * r, 66 + Math.sin(a) * r * 0.9);
  }
  line(33, 74, 33, 88, 12);
  // Solo
  line(25, GROUND, 135, GROUND, 64);
  return pts;
}
