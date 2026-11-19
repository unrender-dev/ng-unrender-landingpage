import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy,
  inject, signal, viewChild,
} from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBan, faBriefcase, faCartShopping, faChartLine, faCode, faComments, faEnvelope, faFileContract, faGamepad,
  faHashtag, faListCheck, faPenRuler, faShieldHalved, faTableCells, faUserShield, faVideo,
} from '@fortawesome/free-solid-svg-icons';
import { I18nService } from '../../../../i18n/i18n.service';
import { SimLoop, ease, rng } from '../infra-shared/sim-loop';
import { I18N } from './employee-monitoring.i18n';

type Key = keyof (typeof I18N)['pt'];
type Category = 'work' | 'social' | 'streaming' | 'shopping' | 'games';
type PolicyId = Exclude<Category, 'work'>;

interface AppDef {
  key: Key;
  category: Category;
  icon: IconDefinition;
}

const WORK: Record<string, AppDef> = {
  code: { key: 'appCode', category: 'work', icon: faCode },
  chat: { key: 'appChat', category: 'work', icon: faComments },
  tasks: { key: 'appTasks', category: 'work', icon: faListCheck },
  mail: { key: 'appMail', category: 'work', icon: faEnvelope },
  sheet: { key: 'appSheet', category: 'work', icon: faTableCells },
  crm: { key: 'appCrm', category: 'work', icon: faBriefcase },
  design: { key: 'appDesign', category: 'work', icon: faPenRuler },
  docs: { key: 'appDocs', category: 'work', icon: faFileContract },
};

const PERSONAL: Record<PolicyId, AppDef> = {
  social: { key: 'appSocial', category: 'social', icon: faHashtag },
  streaming: { key: 'appVideo', category: 'streaming', icon: faVideo },
  shopping: { key: 'appShop', category: 'shopping', icon: faCartShopping },
  games: { key: 'appGames', category: 'games', icon: faGamepad },
};

const POLICY_IDS: readonly PolicyId[] = ['social', 'streaming', 'shopping', 'games'];

/** Estado contínuo de cada pessoa fictícia da demonstração. */
interface PersonSim {
  id: string;
  name: string;
  initials: string;
  role: Key;
  apps: AppDef[];
  app: AppDef;
  /** Foco habitual da pessoa, em %. */
  base: number;
  focus: number;
  blocked: number;
  returnAt: number;
  toast: Key | null;
  toastUntil: number;
}

export interface PersonView {
  id: string;
  name: string;
  initials: string;
  role: Key;
  app: Key;
  icon: IconDefinition;
  productive: boolean;
  focus: number;
  blocked: number;
  toast: Key | null;
  toastShow: boolean;
}

export interface PolicyView {
  id: PolicyId;
  name: Key;
  icon: IconDefinition;
  enabled: boolean;
  attempts: number;
}

interface LogEntry {
  id: number;
  time: Date;
  key: Key;
  tone: 'block' | 'warn' | 'info';
  person?: string;
  /** Chave traduzível do aplicativo ou da categoria citada. */
  subject: Key;
}

const SAMPLES = 60;
const SAMPLE_EVERY = 0.5;
const CHART_W = 240;
const CHART_H = 48;

@Component({
  selector: 'app-employee-monitoring',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './employee-monitoring.component.html',
  styleUrls: ['./employee-monitoring.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeMonitoringComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly zone = inject(NgZone);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly linePath = viewChild<ElementRef<SVGPathElement>>('line');
  private readonly areaPath = viewChild<ElementRef<SVGPathElement>>('area');

  readonly icons = { shield: faUserShield, policy: faShieldHalved, ban: faBan, chart: faChartLine };
  readonly chartBox = `0 0 ${CHART_W} ${CHART_H}`;

  private readonly rand = rng(4242);
  // Nomes fictícios e neutros; não representam pessoas reais.
  private readonly sim: PersonSim[] = [
    this.person('p1', 'Ana Lima', 'roleDev', [WORK['code'], WORK['chat'], WORK['tasks']], 94),
    this.person('p2', 'Bruno Costa', 'roleSales', [WORK['crm'], WORK['mail'], WORK['sheet']], 88),
    this.person('p3', 'Carla Dias', 'roleLegal', [WORK['docs'], WORK['mail'], WORK['chat']], 81),
    this.person('p4', 'Diego Rocha', 'roleDesign', [WORK['design'], WORK['chat'], WORK['tasks']], 91),
    this.person('p5', 'Elisa Prado', 'roleFinance', [WORK['sheet'], WORK['mail'], WORK['crm']], 90),
    this.person('p6', 'Felipe Nunes', 'roleSupport', [WORK['chat'], WORK['tasks'], WORK['mail']], 86),
  ];
  private readonly enabled: Record<PolicyId, boolean> = { social: true, streaming: true, shopping: false, games: true };
  private readonly attempts: Record<PolicyId, number> = { social: 14, streaming: 9, shopping: 6, games: 3 };
  private readonly history: number[] = Array.from(
    { length: SAMPLES },
    (_, i) => 88.5 + 3 * Math.sin(i * 0.31) + 1.5 * Math.sin(i * 0.93 + 1),
  );

  readonly people = signal<PersonView[]>(this.peopleView(0));
  readonly policies = signal<PolicyView[]>(this.policyView());
  readonly teamFocus = signal(89);
  /** Começa com o que aconteceu nos últimos minutos, para o registro não abrir vazio. */
  readonly log = signal<LogEntry[]>([
    { id: -1, time: new Date(Date.now() - 38_000), key: 'logBlocked', tone: 'block', person: 'Bruno Costa', subject: PERSONAL.social.key },
    { id: -2, time: new Date(Date.now() - 95_000), key: 'logPersonal', tone: 'warn', person: 'Elisa Prado', subject: PERSONAL.shopping.key },
    { id: -3, time: new Date(Date.now() - 170_000), key: 'logBlocked', tone: 'block', person: 'Felipe Nunes', subject: PERSONAL.streaming.key },
  ]);

  private loop?: SimLoop;
  private nextEventAt = 1.5;
  private publishAcc = 0;
  private sampleAcc = 0;
  private logId = 0;

  ngAfterViewInit(): void {
    this.loop = new SimLoop(this.host.nativeElement, this.zone, (t, dt) => this.frame(t, dt), 10);
    this.loop.start();
  }

  ngOnDestroy(): void {
    this.loop?.destroy();
  }

  // --- Interação ---
  togglePolicy(id: PolicyId): void {
    this.enabled[id] = !this.enabled[id];
    this.policies.set(this.policyView());
    this.addLog({ key: this.enabled[id] ? 'logPolicyOn' : 'logPolicyOff', tone: 'info', subject: this.policyName(id) });
    if (this.enabled[id]) {
      // Quem estava na categoria recém-bloqueada volta para o trabalho.
      const t = this.loop?.now() ?? 0;
      for (const p of this.sim) if (p.app.category === id) p.returnAt = t;
    }
  }

  // --- Apresentação ---
  pct(v: number): string {
    return this.i18n.number(v / 100, { style: 'percent', maximumFractionDigits: 0 });
  }

  num(v: number): string {
    return this.i18n.number(v);
  }

  blocksLabel(n: number): string {
    const one = n === 1 || (n === 0 && this.i18n.lang() === 'fr');
    return this.t(one ? 'blocksOne' : 'blocksMany', { n: this.num(n) });
  }

  logTime(e: LogEntry): string {
    return this.i18n.date(e.time, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  }

  logText(e: LogEntry): string {
    return this.t(e.key, { name: e.person ?? this.t(e.subject), app: this.t(e.subject) });
  }

  focusTone(focus: number): 'good' | 'mid' | 'low' {
    return focus >= 80 ? 'good' : focus >= 60 ? 'mid' : 'low';
  }

  attemptShare(p: PolicyView): number {
    const max = Math.max(1, ...this.policies().map((x) => x.attempts));
    return p.attempts / max;
  }

  // --- Simulação (fora da NgZone) ---
  private frame(t: number, dt: number): void {
    if (t >= this.nextEventAt) {
      this.nextEventAt = t + 2 + this.rand() * 1.6;
      this.event(t);
    }

    let sum = 0;
    for (const p of this.sim) {
      if (p.app.category !== 'work' && t >= p.returnAt) p.app = p.apps[Math.floor(this.rand() * p.apps.length)];
      // O indicador desliza até o alvo em vez de saltar a cada evento.
      p.focus = ease(p.focus, p.app.category === 'work' ? p.base + 3 * Math.sin(t * 0.23 + p.base) : p.base - 32, dt, 5);
      sum += p.focus;
    }
    const team = sum / this.sim.length;

    this.sampleAcc += dt;
    while (this.sampleAcc >= SAMPLE_EVERY) {
      this.sampleAcc -= SAMPLE_EVERY;
      this.history.push(team);
      this.history.shift();
    }
    this.drawChart(team);

    this.publishAcc += dt;
    if (this.publishAcc >= 0.25) {
      this.publishAcc = 0;
      this.people.set(this.peopleView(t));
      this.teamFocus.set(Math.round(team));
    }
  }

  private event(t: number): void {
    const p = this.sim[Math.floor(this.rand() * this.sim.length)];
    if (this.rand() < 0.62) {
      if (p.app.category === 'work') p.app = p.apps[Math.floor(this.rand() * p.apps.length)];
      return;
    }
    const id = POLICY_IDS[Math.floor(this.rand() * POLICY_IDS.length)];
    const app = PERSONAL[id];
    this.attempts[id]++;
    if (this.enabled[id]) {
      p.blocked++;
      p.toast = app.key;
      p.toastUntil = t + 2.8;
      this.addLog({ key: 'logBlocked', tone: 'block', person: p.name, subject: app.key });
    } else {
      p.app = app;
      p.returnAt = t + 5 + this.rand() * 4;
      this.addLog({ key: 'logPersonal', tone: 'warn', person: p.name, subject: app.key });
    }
    this.policies.set(this.policyView());
  }

  /**
   * Gráfico de linha rolando de forma contínua: as amostras deslizam uma fração
   * de passo a cada quadro e o ponto mais novo acompanha o valor ao vivo.
   */
  private drawChart(live: number): void {
    const line = this.linePath()?.nativeElement;
    if (!line) return;
    const dx = CHART_W / (SAMPLES - 1);
    const shift = (this.sampleAcc / SAMPLE_EVERY) * dx;
    const y = (v: number) => (CHART_H - 4 - ((Math.min(100, Math.max(70, v)) - 70) / 30) * (CHART_H - 8)).toFixed(1);
    let d = '';
    for (let i = 0; i < SAMPLES; i++) d += `${i ? 'L' : 'M'}${(i * dx - shift).toFixed(1)} ${y(this.history[i])}`;
    d += `L${(SAMPLES * dx - shift).toFixed(1)} ${y(live)}`;
    line.setAttribute('d', d);
    this.areaPath()?.nativeElement.setAttribute('d', `${d}V${CHART_H}H${-dx}Z`);
  }

  private addLog(entry: Omit<LogEntry, 'id' | 'time'>): void {
    this.log.set([{ ...entry, id: ++this.logId, time: new Date() }, ...this.log()].slice(0, 5));
  }

  private person(id: string, name: string, role: Key, apps: AppDef[], focus: number): PersonSim {
    const initials = name.split(' ').map((w) => w[0]).join('');
    // Expediente já em andamento: cada pessoa começa com alguns bloqueios no dia.
    const blocked = Math.floor(this.rand() * 4);
    return { id, name, initials, role, apps, app: apps[0], base: focus, focus, blocked, returnAt: 0, toast: null, toastUntil: 0 };
  }

  private policyName(id: PolicyId): Key {
    return ({ social: 'polSocial', streaming: 'polStreaming', shopping: 'polShopping', games: 'polGames' } as const)[id];
  }

  private policyView(): PolicyView[] {
    return POLICY_IDS.map((id) => ({
      id,
      name: this.policyName(id),
      icon: PERSONAL[id].icon,
      enabled: this.enabled[id],
      attempts: this.attempts[id],
    }));
  }

  private peopleView(t: number): PersonView[] {
    return this.sim.map((p) => ({
      id: p.id,
      name: p.name,
      initials: p.initials,
      role: p.role,
      app: p.app.key,
      icon: p.app.icon,
      productive: p.app.category === 'work',
      focus: Math.round(p.focus),
      blocked: p.blocked,
      toast: p.toast,
      toastShow: t < p.toastUntil,
    }));
  }
}
