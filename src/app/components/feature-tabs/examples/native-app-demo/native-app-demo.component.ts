import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, NgZone, OnDestroy, inject, signal } from '@angular/core';
import { I18nService } from '../../../../i18n/i18n.service';
import { Showcase } from '../pwa-demo/showcase';
import { I18N } from './native-app-demo.i18n';

type TitleKey = 'task1' | 'task2' | 'task3' | 'new1' | 'new2' | 'new3';
type MetaKey = 'task1Meta' | 'task2Meta' | 'task3Meta' | 'newMeta';

interface Task {
  id: number;
  title: TitleKey;
  meta: MetaKey;
  icon: string;
  tone: 'a' | 'b' | 'c';
  done: boolean;
  /** Tarefa inicial da cena (as criadas na rodada saem com animação no recomeço). */
  seed: boolean;
  leaving: boolean;
  /** Liga o "toque" animado do modo vitrine. */
  tap: boolean;
}

const NEW_TITLES: readonly TitleKey[] = ['new1', 'new2', 'new3'];
const LEAVE_MS = 480;

/**
 * App nativo (Android ou iOS) em uma moldura genérica de celular desenhada em CSS.
 * É uma demonstração interativa de um app de tarefas, não uma tela de produto: roda
 * sozinha em loop (marca, cria, conclui) e cede o controle quando a pessoa toca.
 */
@Component({
  selector: 'app-native-app-demo',
  standalone: true,
  templateUrl: './native-app-demo.component.html',
  styleUrls: ['./native-app-demo.component.scss'],
})
export class NativeAppDemoComponent implements AfterViewInit, OnDestroy {
  @Input() platform: 'android' | 'ios' = 'android';

  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly showcase = new Showcase(inject(ElementRef).nativeElement, this.zone, {
    play: () => this.play(),
    rewind: () => this.rewind(),
    changed: () => this.cdr.markForCheck(),
  });

  readonly bullets = [
    { icon: 'fa-solid fa-gauge-high', title: 'b1Title', text: 'b1Text' },
    { icon: 'fa-solid fa-fingerprint', title: 'b2Title', text: 'b2Text' },
    { icon: 'fa-solid fa-plane', title: 'b3Title', text: 'b3Text' },
    { icon: 'fa-solid fa-store', title: 'b4Title', text: 'b4Text' },
  ] as const;

  readonly tabs = [
    { icon: 'fa-solid fa-house', label: 'tabHome' },
    { icon: 'fa-solid fa-magnifying-glass', label: 'tabSearch' },
    { icon: 'fa-solid fa-user', label: 'tabProfile' },
  ] as const;

  tasks: Task[] = this.seed();
  fabTap = false;
  private readonly now = signal(new Date());
  private nextId = 10;
  private newCount = 0;
  private fx = new Set<number>();
  private clockTimer = 0;

  get visible(): Task[] {
    return this.tasks.filter((t) => !t.leaving);
  }
  get doneCount(): number {
    return this.visible.filter((t) => t.done).length;
  }
  get ratio(): number {
    const total = this.visible.length;
    return total ? this.doneCount / total : 0;
  }

  progressText(): string {
    const total = this.visible.length;
    const done = this.doneCount;
    if (done === total) return this.t('allDone');
    return done === 1 ? this.t('progressOne', { total }) : this.t('progress', { done, total });
  }

  /** Hora da barra de status, no padrão do idioma. */
  clock(): string {
    return this.i18n.date(this.now(), { hour: '2-digit', minute: '2-digit' });
  }

  ngAfterViewInit(): void {
    this.showcase.attach();
    this.clockTimer = window.setInterval(() => this.now.set(new Date()), 30000);
  }

  ngOnDestroy(): void {
    this.showcase.destroy();
    clearInterval(this.clockTimer);
    this.clearFx();
  }

  toggle(task: Task): void {
    this.showcase.interact();
    task.done = !task.done;
  }

  add(): void {
    this.showcase.interact();
    this.pushTask();
  }

  private play(): void {
    this.showcase.seq([
      [1400, () => this.autoTap()],
      [1700, () => this.autoAdd()],
      [2000, () => this.autoTap()],
      [1800, () => this.autoTap()],
      [2800, () => this.showcase.loop()],
    ]);
  }

  /** Volta ao início com animação: desmarca as tarefas e recolhe as criadas na rodada. */
  private rewind(): number {
    this.clearFx();
    this.fabTap = false;
    let extras = 0;
    for (const task of this.tasks) {
      task.tap = false;
      task.done = false;
      if (!task.seed) {
        task.leaving = true;
        extras++;
      }
    }
    if (extras) this.later(LEAVE_MS, () => (this.tasks = this.tasks.filter((t) => t.seed)));
    this.newCount = 0;
    return 1100;
  }

  /** "Toque" do modo vitrine: mostra a onda e só então conclui a próxima tarefa pendente. */
  private autoTap(): void {
    const task = this.tasks.find((t) => !t.done && !t.leaving);
    if (!task) return;
    task.tap = true;
    this.later(240, () => (task.done = true));
    this.later(700, () => (task.tap = false));
  }

  private autoAdd(): void {
    this.fabTap = true;
    this.later(240, () => this.pushTask());
    this.later(700, () => (this.fabTap = false));
  }

  private pushTask(): void {
    const task: Task = {
      id: this.nextId++,
      title: NEW_TITLES[this.newCount++ % NEW_TITLES.length],
      meta: 'newMeta',
      icon: 'fa-solid fa-bolt',
      tone: 'c',
      done: false,
      seed: false,
      leaving: false,
      tap: false,
    };
    // A tela comporta quatro linhas: a tarefa criada antes dá lugar à nova.
    const extras = this.tasks.filter((t) => !t.seed);
    const rest = extras.length >= 1 ? this.tasks.filter((t) => t !== extras[extras.length - 1]) : this.tasks;
    this.tasks = [task, ...rest];
  }

  private seed(): Task[] {
    const base = { done: false, seed: true, leaving: false, tap: false };
    return [
      { ...base, id: 1, title: 'task1', meta: 'task1Meta', icon: 'fa-solid fa-pen-ruler', tone: 'a' },
      { ...base, id: 2, title: 'task2', meta: 'task2Meta', icon: 'fa-solid fa-rocket', tone: 'b' },
      { ...base, id: 3, title: 'task3', meta: 'task3Meta', icon: 'fa-solid fa-users', tone: 'c' },
    ];
  }

  private later(ms: number, fn: () => void): void {
    const id = window.setTimeout(() => {
      this.fx.delete(id);
      this.zone.run(() => {
        fn();
        this.cdr.markForCheck();
      });
    }, ms);
    this.fx.add(id);
  }

  private clearFx(): void {
    this.fx.forEach((id) => clearTimeout(id));
    this.fx.clear();
  }
}
