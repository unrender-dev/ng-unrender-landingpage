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
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition,
  faChartLine,
  faBullseye,
  faServer,
  faPause,
  faPlay,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import { I18nService } from '../../../../i18n/i18n.service';
import { I18N } from './web-system.i18n';

type Key = keyof (typeof I18N)['pt'];

/** Enquadramento do zoom: origem (em % da captura) e fator de escala. */
interface Focus {
  ox: number;
  oy: number;
  zoom: number;
}

interface Slide {
  id: string;
  icon: IconDefinition;
  /** Captura real do SGA CTRLB (1440×900). */
  src: string;
  tab: Key;
  title: Key;
  text: Key;
  alt: Key;
  spotLabel: Key;
  /** Área destacada, em % da captura. */
  spot: { l: number; t: number; w: number; h: number };
  wide: Focus;
  /** No celular o zoom é maior e mira a parte esquerda do destaque, para o texto ficar legível. */
  compact: Focus;
}

const SCREENS = '/images/real-screens';
/** Tempo com a tela inteira antes de aproximar do destaque. */
const INTRO_MS = 1300;
/** Duração do crossfade entre telas (igual à transição de opacidade no SCSS). */
const FADE_MS = 800;
const DWELL_MS = 7000;
/** Depois de um clique do usuário a tela escolhida fica mais tempo. */
const USER_DWELL_MS = 12000;

@Component({
  selector: 'app-web-system',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './web-system.component.html',
  styleUrls: ['./web-system.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebSystemComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly faPause = faPause;
  readonly faPlay = faPlay;
  readonly faCircleCheck = faCircleCheck;

  readonly slides: Slide[] = [
    {
      id: 'dashboard',
      icon: faChartLine,
      src: `${SCREENS}/dashboard-live.png`,
      tab: 'dashTab',
      title: 'dashTitle',
      text: 'dashText',
      alt: 'dashAlt',
      spotLabel: 'dashSpot',
      spot: { l: 18.3, t: 48.9, w: 80, h: 20.2 },
      wide: { ox: 100, oy: 62, zoom: 1.22 },
      compact: { ox: 29.25, oy: 71.5, zoom: 2.6 },
    },
    {
      id: 'kpis',
      icon: faBullseye,
      src: `${SCREENS}/metricas-live.png`,
      tab: 'kpiTab',
      title: 'kpiTitle',
      text: 'kpiText',
      alt: 'kpiAlt',
      spotLabel: 'kpiSpot',
      spot: { l: 18.3, t: 31.8, w: 80, h: 22.3 },
      wide: { ox: 100, oy: 45, zoom: 1.22 },
      compact: { ox: 29.25, oy: 42, zoom: 2.6 },
    },
    {
      id: 'telemetry',
      icon: faServer,
      src: `${SCREENS}/metricas-sistema-live.png`,
      tab: 'telTab',
      title: 'telTitle',
      text: 'telText',
      alt: 'telAlt',
      spotLabel: 'telSpot',
      spot: { l: 18.3, t: 24.4, w: 80, h: 17.4 },
      wide: { ox: 100, oy: 35, zoom: 1.22 },
      compact: { ox: 29.25, oy: 27.5, zoom: 2.6 },
    },
  ];

  readonly active = signal(0);
  /** Índice da tela aproximada (-1 = nenhuma). Fica na tela anterior durante o crossfade. */
  readonly zoomed = signal(-1);
  readonly dwell = signal(DWELL_MS);
  /** Muda a cada ciclo para recriar a barra de progresso (reinicia a animação CSS). */
  readonly cycle = signal(0);
  readonly compact = signal(false);
  readonly userPaused = signal(false);
  private readonly visible = signal(true);
  readonly running = computed(() => this.visible() && !this.userPaused());

  private timers: ReturnType<typeof setTimeout>[] = [];
  private io: IntersectionObserver | null = null;
  private ro: ResizeObserver | null = null;
  private inView = true;
  private readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly onVisibility = () => this.syncVisible();

  constructor() {
    // Sem autoplay para quem pede menos movimento.
    if (this.reducedMotion) this.userPaused.set(true);
  }

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? el.clientWidth;
        if (width > 0) this.compact.set(width < 560);
      });
      this.ro.observe(el);
    }
    if (typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver((entries) => {
        this.inView = entries.some((e) => e.isIntersecting);
        this.syncVisible();
      });
      this.io.observe(el);
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    this.show(0, DWELL_MS);
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
    this.ro?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.clearTimers();
  }

  focus(slide: Slide): Focus {
    return this.compact() ? slide.compact : slide.wide;
  }

  /** Clique em uma aba: mostra a tela e dá mais tempo antes de o ciclo seguir. */
  select(index: number): void {
    if (index === this.active()) return;
    this.show(index, USER_DWELL_MS);
  }

  onTabKey(event: KeyboardEvent, index: number): void {
    const last = this.slides.length - 1;
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    this.select(next);
    const tabs = this.host.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs[next]?.focus();
  }

  togglePlay(): void {
    this.userPaused.update((paused) => !paused);
    if (this.running()) this.show(this.active(), DWELL_MS);
    else this.clearTimers();
  }

  private syncVisible(): void {
    const visible = this.inView && !document.hidden;
    if (visible === this.visible()) return;
    this.visible.set(visible);
    if (this.running()) this.show(this.active(), DWELL_MS);
    else this.clearTimers();
  }

  private show(index: number, dwell: number): void {
    this.clearTimers();
    const previous = this.active();
    this.active.set(index);
    this.dwell.set(dwell);
    this.cycle.update((n) => n + 1);

    if (this.reducedMotion) return;

    if (previous !== index) {
      // A tela que sai continua aproximada até sumir; só então volta ao enquadramento inteiro.
      this.timers.push(
        setTimeout(() => {
          if (this.zoomed() === previous) this.zoomed.set(-1);
        }, FADE_MS),
      );
    }
    this.timers.push(setTimeout(() => this.zoomed.set(index), previous === index && this.zoomed() === index ? 0 : INTRO_MS));

    if (this.running()) {
      this.timers.push(setTimeout(() => this.show((index + 1) % this.slides.length, DWELL_MS), dwell));
    }
  }

  private clearTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
  }
}
