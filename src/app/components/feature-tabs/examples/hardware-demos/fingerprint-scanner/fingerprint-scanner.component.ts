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
import { faFingerprint, faLock, faLockOpen, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { I18nService } from '../../../../../i18n/i18n.service';
import { Showcase } from '../showcase';
import { I18N } from './fingerprint-scanner.i18n';

type Key = keyof (typeof I18N)['pt'];

/** aguardando → lendo → reconhecido/negado → `reset` (volta suave) → aguardando */
type State = 'idle' | 'scanning' | 'granted' | 'denied' | 'reset';

interface Person {
  /** Nome fictício de exemplo; `null` = o próprio visitante. */
  name: string | null;
  role: Key;
}

const PEOPLE: Person[] = [
  { name: 'Marina Souza', role: 'roleCashier' },
  { name: 'Rafael Lima', role: 'roleManager' },
  { name: 'Camila Rocha', role: 'roleStock' },
];
const VISITOR: Person = { name: null, role: 'roleVisitor' };

const SCAN_MS = 2300;

@Component({
  selector: 'app-fingerprint-scanner',
  standalone: true,
  imports: [FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fp" [attr.data-s]="state()" (pointerdown)="showcase.interrupt()">
      <header class="fp-head">
        <span class="fp-title">
          <fa-icon [icon]="faShieldHalved"></fa-icon>
          <span>{{ t('title') }}</span>
        </span>
        <span class="fp-pill" aria-live="polite"><i></i>{{ statusLabel() }}</span>
      </header>

      <div class="fp-main">
        <button type="button" class="fp-sensor" (click)="scan()" [attr.aria-label]="t('sensorAria')">
          <svg class="fp-ring" viewBox="0 0 120 120" aria-hidden="true">
            <circle class="fp-track" cx="60" cy="60" r="55" />
            <circle class="fp-prog" cx="60" cy="60" r="55" pathLength="100" />
          </svg>
          <span class="fp-pad" aria-hidden="true">
            <fa-icon class="fp-print" [icon]="faFingerprint"></fa-icon>
            <fa-icon class="fp-print fp-fill" [icon]="faFingerprint"></fa-icon>
            <span class="fp-beam"></span>
          </span>
        </button>

        <!-- Mensagens empilhadas na mesma célula: trocam por fade, sem mudar a altura -->
        <div class="fp-msg">
          <p class="fp-hint" [class.is-on]="state() === 'idle'">{{ t('hint') }}</p>
          <p class="fp-hint" [class.is-on]="state() === 'scanning'">{{ t('keep') }}</p>
          <div class="fp-result fp-ok" [class.is-on]="state() === 'granted'">
            <fa-icon [icon]="faLockOpen"></fa-icon>
            <div>
              <strong>{{ t('okTitle') }}</strong>
              <span>{{ person().name ?? t('visitor') }} · {{ t(person().role) }}</span>
              <span>{{ t('okSub', { time: timeLabel() }) }}</span>
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
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .fp {
      --fp-c: #94a3b8;
      position: relative;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      overflow: hidden;
      color: #0f172a;
      user-select: none;
    }
    .fp[data-s='scanning'] { --fp-c: var(--unrender-accent, #f99126); }
    .fp[data-s='granted'] { --fp-c: #16a34a; }
    .fp[data-s='denied'] { --fp-c: #dc2626; }

    .fp-head {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: .5rem .75rem; padding: .75rem 1rem; border-bottom: 1px solid #eef2f6;
    }
    .fp-title { display: inline-flex; align-items: center; gap: .5rem; font-weight: 700; min-width: 0; }
    .fp-title fa-icon { color: var(--unrender-accent, #f99126); }
    .fp-pill {
      display: inline-flex; align-items: center; gap: .4rem;
      padding: .25rem .65rem; border-radius: 999px;
      font-size: .75rem; font-weight: 600;
      color: #334155; background: #f1f5f9;
    }
    .fp-pill i { width: .5rem; height: .5rem; border-radius: 50%; background: var(--fp-c); transition: background-color .35s ease; }
    .fp[data-s='scanning'] .fp-pill i { animation: fp-blink .7s ease-in-out infinite alternate; }

    .fp-main {
      display: flex; flex-direction: column; align-items: center; gap: 1.25rem;
      padding: 2rem 1rem 1.75rem;
      background-image: radial-gradient(#e2e8f0 1px, transparent 1px);
      background-size: 20px 20px;
    }

    .fp-sensor {
      position: relative; flex: none;
      width: min(11rem, 60%); aspect-ratio: 1;
      padding: 0; border: 0; border-radius: 50%;
      background: transparent; cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .fp-sensor:focus-visible { outline: 3px solid var(--unrender-accent, #f99126); outline-offset: 4px; }
    .fp[data-s='denied'] .fp-sensor { animation: fp-shake .45s cubic-bezier(.36, .07, .19, .97); }

    .fp-ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
    .fp-ring circle { fill: none; stroke-width: 5; }
    .fp-track { stroke: #e2e8f0; }
    .fp-prog {
      stroke: var(--fp-c); stroke-linecap: round;
      stroke-dasharray: 100; stroke-dashoffset: 100;
      opacity: 0;
      transition: stroke-dashoffset .5s ease, stroke .35s ease, opacity .45s ease;
    }
    .fp[data-s='scanning'] .fp-prog { opacity: 1; stroke-dashoffset: 0; transition: stroke-dashoffset 2.3s cubic-bezier(.45, .05, .3, 1), stroke .35s ease, opacity .25s ease; }
    .fp[data-s='granted'] .fp-prog, .fp[data-s='denied'] .fp-prog { opacity: 1; stroke-dashoffset: 0; }
    /* Volta ao início: o anel some por fade antes de esvaziar (nada "pula") */
    .fp[data-s='reset'] .fp-prog { opacity: 0; stroke-dashoffset: 0; }

    .fp-pad {
      position: absolute; inset: 9%;
      border-radius: 50%; overflow: hidden;
      display: grid; place-items: center;
      background: #f8fafc;
      box-shadow: inset 0 2px 8px rgba(15, 23, 42, .1);
      transition: transform .25s cubic-bezier(.3, 1.4, .5, 1), background-color .35s ease;
    }
    .fp-sensor:hover .fp-pad { background: #fff7ed; }
    .fp-sensor:active .fp-pad, .fp[data-s='scanning'] .fp-pad { transform: scale(.95); }
    .fp-print { grid-area: 1 / 1; font-size: 4.4rem; line-height: 1; color: #cbd5e1; }
    .fp-fill {
      color: var(--fp-c);
      clip-path: inset(100% 0 0 0);
      opacity: 0;
      transition: clip-path .01s linear .45s, opacity .4s ease, color .35s ease;
    }
    .fp[data-s='scanning'] .fp-fill { opacity: 1; clip-path: inset(0 0 0 0); transition: clip-path 2.3s cubic-bezier(.45, .05, .3, 1), opacity .2s ease, color .35s ease; }
    .fp[data-s='granted'] .fp-fill, .fp[data-s='denied'] .fp-fill { opacity: 1; clip-path: inset(0 0 0 0); }
    .fp[data-s='reset'] .fp-fill { opacity: 0; clip-path: inset(0 0 0 0); }

    /* Varredura em vai-e-vem que nunca reinicia: só aparece durante a leitura */
    .fp-beam {
      position: absolute; left: 0; right: 0; top: 0; height: 22%;
      background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--unrender-accent, #f99126) 45%, transparent));
      border-bottom: 2px solid var(--unrender-accent, #f99126);
      opacity: 0; transition: opacity .3s ease;
      animation: fp-sweep 1.15s ease-in-out infinite alternate;
    }
    .fp[data-s='scanning'] .fp-beam { opacity: 1; }

    .fp-msg { display: grid; width: 100%; justify-items: center; align-items: center; text-align: center; }
    .fp-msg > * {
      grid-area: 1 / 1; margin: 0;
      opacity: 0; transform: translateY(8px);
      transition: opacity .3s ease, transform .35s ease;
      pointer-events: none;
    }
    .fp-msg > .is-on { opacity: 1; transform: none; transition-delay: .15s; }
    .fp-hint { font-size: .875rem; font-weight: 500; color: #475569; }
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

    @keyframes fp-sweep { from { transform: translateY(-100%); } to { transform: translateY(455%); } }
    @keyframes fp-blink { from { opacity: 1; } to { opacity: .3; } }
    @keyframes fp-shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-7px); }
      40% { transform: translateX(6px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(2px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .fp-beam, .fp-sensor, .fp-pill i { animation: none !important; }
      .fp-prog, .fp-fill, .fp-pad, .fp-msg > * { transition-duration: .01s !important; transition-delay: 0s !important; }
    }
  `],
})
export class FingerprintScannerComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  readonly faFingerprint = faFingerprint;
  readonly faLock = faLock;
  readonly faLockOpen = faLockOpen;
  readonly faShieldHalved = faShieldHalved;

  readonly state = signal<State>('idle');
  readonly person = signal<Person>(PEOPLE[0]);
  private readonly grantedAt = signal(new Date());

  readonly statusLabel = computed(() => {
    switch (this.state()) {
      case 'scanning': return this.t('stScanning');
      case 'granted': return this.t('stGranted');
      case 'denied': return this.t('stDenied');
      default: return this.t('stIdle');
    }
  });
  readonly timeLabel = computed(() => this.i18n.date(this.grantedAt(), { hour: '2-digit', minute: '2-digit' }));

  readonly showcase = new Showcase(this.host.nativeElement, 6000, () => !this.busy);
  private busy = false;
  /** O visitante tocou durante uma leitura automática: a dele vem logo em seguida. */
  private queued = false;
  private turn = 0;

  ngAfterViewInit(): void {
    this.showcase.start(async (step) => {
      await step(1700);
      // A cada quatro leituras, uma digital desconhecida mostra o estado "negado".
      const denied = this.turn % 4 === 2;
      const who = PEOPLE[this.turn % PEOPLE.length];
      this.turn++;
      await this.read(denied ? null : who);
    });
  }

  ngOnDestroy(): void {
    this.showcase.destroy();
  }

  /** Leitura disparada pelo visitante. */
  scan(): void {
    this.showcase.interrupt();
    if (this.busy) {
      this.queued = true;
      return;
    }
    void this.showcase.guard(() => this.read(VISITOR));
  }

  /** Uma leitura completa; `who = null` simula digital não reconhecida. */
  private async read(who: Person | null): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const wait = (ms: number) => this.showcase.wait(ms);
    // Mostra o resultado, mas cede na hora se o visitante tocar no sensor.
    const hold = async (ms: number) => {
      for (let t = 0; t < ms && !this.queued; t += 100) await wait(100);
    };
    try {
      this.state.set('scanning');
      await wait(SCAN_MS);
      if (who) {
        this.person.set(who);
        this.grantedAt.set(new Date());
        this.state.set('granted');
        await hold(2800);
      } else {
        this.state.set('denied');
        await hold(2400);
      }
      this.state.set('reset');
      await wait(600);
      this.state.set('idle');
    } finally {
      this.busy = false;
    }
    if (this.queued) {
      this.queued = false;
      await wait(250);
      await this.read(VISITOR);
    }
  }
}
