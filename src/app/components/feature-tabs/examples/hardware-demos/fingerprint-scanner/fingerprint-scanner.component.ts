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
import { faFingerprint, faLock, faLockOpen, faShieldHalved, faHandPointer } from '@fortawesome/free-solid-svg-icons';
import { I18nService } from '../../../../../i18n/i18n.service';
import { Showcase } from '../showcase';
import { I18N } from './fingerprint-scanner.i18n';

type Key = keyof (typeof I18N)['pt'];

/**
 * aguardando → lendo (enquanto o dedo está no sensor) → reconhecido/negado → `reset` → aguardando.
 * Soltar antes do fim → `lifted` (aviso) e o anel esvazia de volta.
 */
type State = 'idle' | 'scanning' | 'lifted' | 'granted' | 'denied' | 'reset';

interface Person {
  /** Nome fictício de exemplo; `null` = o próprio visitante. */
  name: string | null;
  role: Key;
  initials: string;
}

interface LogEntry {
  id: number;
  who: string;
  at: Date;
  ok: boolean;
}

const PEOPLE: Person[] = [
  { name: 'Marina Souza', role: 'roleCashier', initials: 'MS' },
  { name: 'Rafael Lima', role: 'roleManager', initials: 'RL' },
  { name: 'Camila Rocha', role: 'roleStock', initials: 'CR' },
];
const VISITOR: Person = { name: null, role: 'roleVisitor', initials: '?' };

/** Tempo de dedo no sensor até a leitura completar. */
const HOLD_MS = 1400;
/** O anel esvazia mais rápido do que enche quando o dedo sai. */
const DRAIN_MS = 450;

@Component({
  selector: 'app-fingerprint-scanner',
  standalone: true,
  imports: [FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fp" #root [attr.data-s]="state()" [class.is-pressed]="pressed()" [class.is-auto]="autoFinger()">
      <header class="fp-head">
        <span class="fp-title">
          <fa-icon [icon]="faShieldHalved"></fa-icon>
          <span>{{ t('title') }}</span>
          <small>{{ t('device') }}</small>
        </span>
        <span class="fp-pill" aria-live="polite"><i></i>{{ statusLabel() }}</span>
      </header>

      <div class="fp-body">
        <div class="fp-main">
          <button
            #sensor
            type="button"
            class="fp-sensor"
            [attr.aria-label]="t('sensorAria')"
            [attr.aria-pressed]="pressed()"
            (pointerdown)="onDown($event)"
            (pointerup)="onUp($event)"
            (pointercancel)="onUp($event)"
            (lostpointercapture)="onUp($event)"
            (keydown)="onKeyDown($event)"
            (keyup)="onKeyUp($event)"
            (blur)="release()"
            (contextmenu)="$event.preventDefault()">
            <svg class="fp-ring" viewBox="0 0 120 120" aria-hidden="true">
              <circle class="fp-track" cx="60" cy="60" r="55" />
              <circle class="fp-prog" cx="60" cy="60" r="55" pathLength="100" />
            </svg>
            <span class="fp-wave" aria-hidden="true"></span>
            <span class="fp-wave fp-wave--2" aria-hidden="true"></span>
            <span class="fp-pad" aria-hidden="true">
              <fa-icon class="fp-print" [icon]="faFingerprint"></fa-icon>
              <fa-icon class="fp-print fp-fill" [icon]="faFingerprint"></fa-icon>
              <span class="fp-beam"></span>
            </span>
            <!-- "dedo" da demonstração automática -->
            <span class="fp-finger" aria-hidden="true"><fa-icon [icon]="faHandPointer"></fa-icon></span>
          </button>

          <!-- Mensagens empilhadas na mesma célula: trocam por fade, sem mudar a altura -->
          <div class="fp-msg">
            <p class="fp-hint" [class.is-on]="state() === 'idle' || state() === 'reset'">
              <strong>{{ t('hint') }}</strong>
              <span>{{ t('hintKeys') }}</span>
            </p>
            <p class="fp-hint fp-hint--live" [class.is-on]="state() === 'scanning'">{{ t('keep', { pct: pct() }) }}</p>
            <p class="fp-hint fp-hint--warn" [class.is-on]="state() === 'lifted'">{{ t('lifted') }}</p>
            <div class="fp-result fp-ok" [class.is-on]="state() === 'granted'">
              <fa-icon [icon]="faLockOpen"></fa-icon>
              <div>
                <strong>{{ t('okTitle') }}</strong>
                <span>{{ person().name ?? t('visitor') }} · {{ t(person().role) }}</span>
                <span>{{ t('okSub', { time: timeLabel() }) }} · {{ t('match', { pct: matchPct() }) }}</span>
              </div>
            </div>
            <div class="fp-result fp-no" [class.is-on]="state() === 'denied'">
              <fa-icon [icon]="faLock"></fa-icon>
              <div>
                <strong>{{ t('noTitle') }}</strong>
                <span>{{ t('noSub') }}</span>
              </div>
            </div>
          </div>
        </div>

        <aside class="fp-side">
          <div class="fp-meter">
            <span>{{ t('quality') }}</span>
            <div class="fp-bar"><i></i></div>
            <small>{{ t('minutiae', { n: minutiae() }) }}</small>
          </div>
          <h4>{{ t('logTitle') }}</h4>
          <ol class="fp-log" aria-live="off">
            @for (e of log(); track e.id) {
              <li [class.is-no]="!e.ok">
                <span class="fp-av">{{ e.ok ? initialsOf(e.who) : '!' }}</span>
                <span class="fp-who">{{ e.who }}<small>{{ e.ok ? t('logIn') : t('logDenied') }}</small></span>
                <time>{{ clock(e.at) }}</time>
              </li>
            } @empty {
              <li class="fp-empty">{{ t('logEmpty') }}</li>
            }
          </ol>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; min-width: 0; }
    .fp {
      --fp-c: #94a3b8;
      --p: 0;
      position: relative;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      overflow: hidden;
      color: #0f172a;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    .fp[data-s='scanning'] { --fp-c: var(--unrender-accent, #f99126); }
    .fp[data-s='lifted'] { --fp-c: #d97706; }
    .fp[data-s='granted'] { --fp-c: #16a34a; }
    .fp[data-s='denied'] { --fp-c: #dc2626; }

    .fp-head {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: .5rem .75rem; padding: .75rem 1rem; border-bottom: 1px solid #eef2f6;
    }
    .fp-title { display: inline-flex; flex-wrap: wrap; align-items: baseline; gap: .25rem .5rem; font-weight: 700; min-width: 0; }
    .fp-title fa-icon { color: var(--unrender-accent, #f99126); }
    .fp-title small { font-weight: 500; font-size: .72rem; color: #64748b; }
    .fp-pill {
      display: inline-flex; align-items: center; gap: .4rem;
      padding: .25rem .65rem; border-radius: 999px;
      font-size: .75rem; font-weight: 600;
      color: #334155; background: #f1f5f9;
    }
    .fp-pill i { width: .5rem; height: .5rem; border-radius: 50%; background: var(--fp-c); transition: background-color .35s ease; }
    .fp[data-s='scanning'] .fp-pill i { animation: fp-blink .7s ease-in-out infinite alternate; }

    .fp-body { display: grid; grid-template-columns: minmax(0, 1fr); }
    @media (min-width: 640px) { .fp-body { grid-template-columns: minmax(0, 1fr) 15rem; } }

    .fp-main {
      display: flex; flex-direction: column; align-items: center; gap: 1.25rem;
      padding: 2rem 1rem 1.75rem;
      background-image: radial-gradient(#e2e8f0 1px, transparent 1px);
      background-size: 20px 20px;
      min-width: 0;
    }

    .fp-sensor {
      position: relative; flex: none;
      width: min(11rem, 62vw); aspect-ratio: 1;
      padding: 0; border: 0; border-radius: 50%;
      background: transparent; cursor: pointer;
      touch-action: none;
      -webkit-tap-highlight-color: transparent;
      -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
    }
    .fp-sensor:focus-visible { outline: 3px solid var(--unrender-accent, #f99126); outline-offset: 4px; }
    .fp[data-s='denied'] .fp-sensor, .fp[data-s='lifted'] .fp-sensor { animation: fp-shake .45s cubic-bezier(.36, .07, .19, .97); }

    .fp-ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
    .fp-ring circle { fill: none; stroke-width: 5; }
    .fp-track { stroke: #e2e8f0; }
    /* O progresso é a variável --p (0 → 1), escrita a cada quadro enquanto o dedo está no sensor */
    .fp-prog {
      stroke: var(--fp-c); stroke-linecap: round;
      stroke-dasharray: 100; stroke-dashoffset: calc(100 - var(--p) * 100);
      opacity: calc(var(--p) * 8);
      transition: stroke .35s ease;
    }
    .fp[data-s='granted'] .fp-prog, .fp[data-s='denied'] .fp-prog { opacity: 1; }
    .fp[data-s='reset'] .fp-prog { opacity: 0; transition: opacity .45s ease; }

    /* Ondas de leitura saindo do sensor enquanto o dedo está apoiado */
    .fp-wave {
      position: absolute; inset: 9%; border-radius: 50%;
      border: 2px solid var(--fp-c); opacity: 0; pointer-events: none;
    }
    .fp[data-s='scanning'] .fp-wave { animation: fp-wave 1.1s ease-out infinite; }
    .fp[data-s='scanning'] .fp-wave--2 { animation-delay: .55s; }
    .fp[data-s='granted'] .fp-wave { animation: fp-wave .8s ease-out 1; }

    .fp-pad {
      position: absolute; inset: 9%;
      border-radius: 50%; overflow: hidden;
      display: grid; place-items: center;
      background: #f8fafc;
      box-shadow: inset 0 2px 8px rgba(15, 23, 42, .1);
      transition: transform .25s cubic-bezier(.3, 1.4, .5, 1), background-color .35s ease, box-shadow .25s ease;
    }
    .fp-sensor:hover .fp-pad { background: #fff7ed; }
    .fp.is-pressed .fp-pad { transform: scale(.94); box-shadow: inset 0 4px 14px rgba(15, 23, 42, .2); background: #fff7ed; }
    .fp-print { grid-area: 1 / 1; font-size: 4.4rem; line-height: 1; color: #cbd5e1; }
    .fp-fill {
      color: var(--fp-c);
      clip-path: inset(calc((1 - var(--p)) * 100%) 0 0 0);
      transition: color .35s ease;
    }
    .fp[data-s='granted'] .fp-fill, .fp[data-s='denied'] .fp-fill { clip-path: inset(0); }
    .fp[data-s='reset'] .fp-fill { opacity: 0; transition: opacity .45s ease; }

    .fp-beam {
      position: absolute; left: 0; right: 0; top: 0; height: 22%;
      background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--unrender-accent, #f99126) 45%, transparent));
      border-bottom: 2px solid var(--unrender-accent, #f99126);
      opacity: 0; transition: opacity .25s ease;
      animation: fp-sweep 1.15s ease-in-out infinite alternate;
    }
    .fp[data-s='scanning'] .fp-beam { opacity: 1; }

    /* Dedo da demonstração automática: desce, apoia e sobe */
    .fp-finger {
      position: absolute; left: 50%; top: 58%;
      font-size: 2.4rem; color: #0f172a;
      filter: drop-shadow(0 6px 10px rgba(15,23,42,.35));
      transform: translate(-30%, 70%) scale(1.15); opacity: 0;
      transition: transform .45s cubic-bezier(.2,.9,.3,1.1), opacity .35s ease;
      pointer-events: none;
    }
    .fp.is-auto .fp-finger { opacity: .92; transform: translate(-30%, 40%) scale(1.15); }
    .fp.is-auto.is-pressed .fp-finger { transform: translate(-30%, 22%) scale(1); }

    .fp-msg { display: grid; width: 100%; min-height: 3.6rem; justify-items: center; align-items: center; text-align: center; }
    .fp-msg > * {
      grid-area: 1 / 1; margin: 0;
      opacity: 0; transform: translateY(8px);
      transition: opacity .3s ease, transform .35s ease;
      pointer-events: none;
    }
    .fp-msg > .is-on { opacity: 1; transform: none; transition-delay: .1s; }
    .fp-hint { font-size: .875rem; font-weight: 500; color: #475569; display: flex; flex-direction: column; gap: .15rem; }
    .fp-hint strong { color: #0f172a; font-weight: 700; }
    .fp-hint span { font-size: .75rem; color: #64748b; }
    .fp-hint--live { color: #9a3412; font-weight: 700; font-variant-numeric: tabular-nums; }
    .fp-hint--warn { color: #b45309; font-weight: 600; max-width: 22rem; }
    .fp-result { display: flex; align-items: center; gap: .75rem; text-align: left; max-width: 100%; }
    .fp-result > fa-icon {
      flex: none; width: 2.75rem; height: 2.75rem; border-radius: 50%;
      display: grid; place-items: center; font-size: 1.1rem;
    }
    .fp-ok > fa-icon { background: #dcfce7; color: #15803d; }
    .fp-no > fa-icon { background: #fee2e2; color: #b91c1c; }
    .fp-result div { min-width: 0; display: flex; flex-direction: column; overflow-wrap: anywhere; }
    .fp-result strong { font-size: 1rem; }
    .fp-result span { font-size: .78rem; color: #475569; }

    .fp-side { border-top: 1px solid #eef2f6; padding: .9rem 1rem 1rem; background: #f8fafc; min-width: 0; }
    @media (min-width: 640px) { .fp-side { border-top: 0; border-left: 1px solid #eef2f6; } }
    .fp-meter { display: grid; grid-template-columns: auto 1fr; gap: .3rem .6rem; align-items: center; font-size: .72rem; color: #475569; margin-bottom: .9rem; }
    .fp-meter small { grid-column: 1 / -1; color: #64748b; font-variant-numeric: tabular-nums; }
    .fp-bar { height: 6px; border-radius: 99px; background: #e2e8f0; overflow: hidden; }
    .fp-bar i { display: block; height: 100%; width: calc(var(--p) * 100%); background: var(--fp-c); border-radius: inherit; transition: background-color .3s ease; }
    .fp-side h4 { margin: 0 0 .5rem; font-size: .7rem; text-transform: uppercase; letter-spacing: .08em; color: #64748b; }
    .fp-log { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .4rem; }
    .fp-log li {
      display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .5rem;
      padding: .4rem .5rem; border-radius: .6rem; background: #fff; border: 1px solid #e2e8f0;
      font-size: .75rem; animation: fp-in .35s cubic-bezier(.2,.9,.3,1.2) both;
    }
    .fp-log li.is-no { border-color: #fecaca; }
    .fp-av { width: 1.6rem; height: 1.6rem; border-radius: 50%; display: grid; place-items: center; font-size: .62rem; font-weight: 800; background: #dcfce7; color: #166534; }
    .is-no .fp-av { background: #fee2e2; color: #b91c1c; }
    .fp-who { display: flex; flex-direction: column; min-width: 0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fp-who small { font-weight: 500; color: #64748b; }
    .fp-log time { color: #64748b; font-variant-numeric: tabular-nums; }
    .fp-log .fp-empty { display: block; color: #94a3b8; text-align: center; border-style: dashed; }

    @keyframes fp-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
    @keyframes fp-wave { from { opacity: .55; transform: scale(1); } to { opacity: 0; transform: scale(1.32); } }
    @keyframes fp-sweep { from { transform: translateY(-100%); } to { transform: translateY(455%); } }
    @keyframes fp-blink { from { opacity: 1; } to { opacity: .3; } }
    @keyframes fp-shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-7px); }
      40% { transform: translateX(6px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(2px); }
    }
    @media (pointer: coarse) { .fp-sensor { width: min(12rem, 66vw); } }
    @media (prefers-reduced-motion: reduce) {
      .fp-beam, .fp-sensor, .fp-pill i, .fp-wave, .fp-log li { animation: none !important; }
      .fp-pad, .fp-msg > *, .fp-finger { transition-duration: .01s !important; transition-delay: 0s !important; }
    }
  `],
})
export class FingerprintScannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root', { static: true }) root!: ElementRef<HTMLElement>;
  @ViewChild('sensor', { static: true }) sensor!: ElementRef<HTMLButtonElement>;

  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly zone = inject(NgZone);

  readonly faFingerprint = faFingerprint;
  readonly faLock = faLock;
  readonly faLockOpen = faLockOpen;
  readonly faShieldHalved = faShieldHalved;
  readonly faHandPointer = faHandPointer;

  readonly state = signal<State>('idle');
  readonly person = signal<Person>(PEOPLE[0]);
  /** Dedo apoiado no sensor (visitante ou o "dedo" da demonstração). */
  readonly pressed = signal(false);
  readonly autoFinger = signal(false);
  /** Percentual exibido na mensagem (atualizado em degraus de 5% para não redesenhar a cada quadro). */
  readonly pct = signal(0);
  readonly minutiae = signal(0);
  readonly matchPct = signal(98);
  readonly log = signal<LogEntry[]>([]);
  private readonly grantedAt = signal(new Date());

  readonly statusLabel = computed(() => {
    switch (this.state()) {
      case 'scanning': return this.t('stScanning');
      case 'lifted': return this.t('stLifted');
      case 'granted': return this.t('stGranted');
      case 'denied': return this.t('stDenied');
      default: return this.t('stIdle');
    }
  });
  readonly timeLabel = computed(() => this.i18n.date(this.grantedAt(), { hour: '2-digit', minute: '2-digit' }));

  readonly showcase = new Showcase(this.host.nativeElement, 6000, () => !this.pressed() && !this.resultTimer);

  /** Progresso da leitura, 0 → 1. Escrito direto na variável CSS --p, fora do Angular. */
  private progress = 0;
  private raf = 0;
  private last = 0;
  private holder: 'user' | 'auto' | null = null;
  /** Leitura automática que deve terminar como "negada". */
  private autoDenied = false;
  private onComplete: (() => void) | null = null;
  private resultTimer: ReturnType<typeof setTimeout> | null = null;
  private logId = 0;
  private turn = 0;
  private readonly reduced = this.showcase.reduced;

  ngAfterViewInit(): void {
    this.showcase.start(async (step) => {
      try {
        await step(1600);
        const who = PEOPLE[this.turn % PEOPLE.length];
        // roteiro: reconhece · reconhece · tira o dedo cedo · negado
        const kind = this.turn % 4;
        this.turn++;
        this.autoFinger.set(true);
        await step(500);
        if (kind === 2) {
          this.press('auto');
          await step(HOLD_MS * 0.45);
          this.release();
          await step(2200);
          this.autoFinger.set(false);
          return;
        }
        this.autoDenied = kind === 3;
        const done = new Promise<void>((resolve) => (this.onComplete = resolve));
        this.press('auto', who);
        await Promise.race([done, step(HOLD_MS + 600)]);
        this.autoFinger.set(false);
        await step(3000);
      } catch (e) {
        // O visitante tocou: o dedo da demonstração sai de cena.
        this.autoFinger.set(false);
        if (this.holder === 'auto') this.cancelHold(false);
        throw e;
      }
    });
  }

  ngOnDestroy(): void {
    this.showcase.destroy();
    cancelAnimationFrame(this.raf);
    if (this.resultTimer) clearTimeout(this.resultTimer);
  }

  // ───────── Entrada do visitante ─────────

  onDown(ev: PointerEvent): void {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    ev.preventDefault();
    // foco para o teclado/blur funcionarem, sem o anel de foco que é só para quem navega por teclado
    this.sensor.nativeElement.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    try { this.sensor.nativeElement.setPointerCapture(ev.pointerId); } catch { /* pointer já liberado */ }
    this.showcase.interrupt();
    this.autoFinger.set(false);
    this.press('user');
  }

  onUp(_ev: Event): void {
    if (this.holder === 'user') this.release();
  }

  onKeyDown(ev: KeyboardEvent): void {
    if (ev.key !== ' ' && ev.key !== 'Enter') return;
    ev.preventDefault();
    if (ev.repeat || this.holder === 'user') return;
    this.showcase.interrupt();
    this.autoFinger.set(false);
    this.press('user');
  }

  onKeyUp(ev: KeyboardEvent): void {
    if (ev.key !== ' ' && ev.key !== 'Enter') return;
    ev.preventDefault();
    this.release();
  }

  // ───────── Leitura ─────────

  private press(by: 'user' | 'auto', who: Person = VISITOR): void {
    if (this.resultTimer) { clearTimeout(this.resultTimer); this.resultTimer = null; }
    // começar de novo depois de um resultado: o anel parte do zero
    if (this.state() === 'granted' || this.state() === 'denied' || this.state() === 'reset') this.setProgress(0);
    if (by === 'user') this.autoDenied = false;
    this.holder = by;
    this.person.set(who);
    this.pressed.set(true);
    this.state.set('scanning');
    if (this.reduced) { this.setProgress(1); this.complete(); return; }
    this.tick();
  }

  /** Dedo saiu do sensor. Se a leitura não completou, avisa e o anel esvazia. */
  release(): void {
    if (!this.holder) return;
    this.pressed.set(false);
    if (this.state() !== 'scanning') { this.holder = null; return; }
    this.cancelHold(true);
  }

  private cancelHold(warn: boolean): void {
    this.holder = null;
    this.pressed.set(false);
    if (this.state() !== 'scanning') return;
    this.state.set(warn ? 'lifted' : 'idle');
    this.tick();
    this.resultTimer = setTimeout(() => {
      this.resultTimer = null;
      if (this.state() === 'lifted') this.state.set('idle');
    }, 2000);
  }

  /** Um só laço de animação: enche enquanto há dedo, esvazia quando não há. */
  private tick(): void {
    cancelAnimationFrame(this.raf);
    this.zone.runOutsideAngular(() => {
      this.last = performance.now();
      const frame = (now: number) => {
        const dt = Math.min(64, now - this.last);
        this.last = now;
        const filling = this.holder !== null && this.state() === 'scanning';
        const next = filling ? this.progress + dt / HOLD_MS : this.progress - dt / DRAIN_MS;
        this.setProgress(Math.max(0, Math.min(1, next)));
        if (filling && this.progress >= 1) {
          this.zone.run(() => this.complete());
          return;
        }
        if (filling || this.progress > 0) this.raf = requestAnimationFrame(frame);
      };
      this.raf = requestAnimationFrame(frame);
    });
  }

  private setProgress(p: number): void {
    this.progress = p;
    this.root.nativeElement.style.setProperty('--p', p.toFixed(4));
    const step = Math.round(p * 20) * 5;
    if (step !== this.pct()) {
      this.zone.run(() => {
        this.pct.set(step);
        this.minutiae.set(Math.round(p * 42));
      });
    }
  }

  private complete(): void {
    const by = this.holder;
    const denied = by === 'auto' && this.autoDenied;
    this.holder = null;
    this.pressed.set(false);
    const who = this.person();
    const name = who.name ?? this.t('visitor');
    if (denied) {
      this.state.set('denied');
      this.pushLog(this.t('noTitle'), false);
    } else {
      this.grantedAt.set(new Date());
      this.matchPct.set(94 + Math.floor(Math.random() * 6));
      this.state.set('granted');
      this.pushLog(name, true);
      if (by === 'user') navigator.vibrate?.(30);
    }
    this.onComplete?.();
    this.onComplete = null;
    this.resultTimer = setTimeout(() => {
      this.state.set('reset');
      this.resultTimer = setTimeout(() => {
        this.resultTimer = null;
        this.setProgress(0);
        if (this.state() === 'reset') this.state.set('idle');
      }, 500);
    }, denied ? 2400 : 2800);
  }

  private pushLog(who: string, ok: boolean): void {
    this.log.update((l) => [{ id: ++this.logId, who, at: new Date(), ok }, ...l].slice(0, 4));
  }

  initialsOf(name: string): string {
    return name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  }

  clock(d: Date): string {
    return this.i18n.date(d, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
