import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { I18nService } from '../../../../i18n/i18n.service';
import { Showcase } from '../pwa-demo/showcase';
import { I18N } from './desktop-software-demo.i18n';

/** Capturas reais do SGA CTRLB (public/images/real-screens); `-dark` é o tema escuro. */
const SCREENS = [
  { key: 'dashboard', file: 'dashboard-live', label: 'tabDashboard', alt: 'altDashboard', icon: 'fa-solid fa-chart-line' },
  { key: 'crm', file: 'crm-live', label: 'tabCrm', alt: 'altCrm', icon: 'fa-solid fa-filter' },
  { key: 'agenda', file: 'agenda-live', label: 'tabAgenda', alt: 'altAgenda', icon: 'fa-regular fa-calendar' },
  { key: 'chat', file: 'conversas-live', label: 'tabChat', alt: 'altChat', icon: 'fa-solid fa-headset' },
] as const;

const STACK = {
  windows: 'Windows · WPF / .NET',
  macos: 'macOS · Swift / Electron',
  linux: 'Linux · GTK / Qt',
} as const;

const SLIDE_MS = 4200;

/**
 * Software desktop: uma janela do SGA CTRLB (capturas reais) dentro de uma área de trabalho
 * genérica desenhada em CSS — sem logotipos, ícones ou papéis de parede de Windows/macOS/Ubuntu.
 * O que muda entre os sistemas é só a disposição das barras e dos controles da janela.
 */
@Component({
  selector: 'app-desktop-software-demo',
  standalone: true,
  templateUrl: './desktop-software-demo.component.html',
  styleUrls: ['./desktop-software-demo.component.scss'],
})
export class DesktopSoftwareDemoComponent implements AfterViewInit, OnDestroy {
  @Input() os: 'windows' | 'macos' | 'linux' = 'windows';

  @ViewChild('monitor') private monitorRef!: ElementRef<HTMLElement>;
  @ViewChild('screen') private screenRef!: ElementRef<HTMLElement>;
  @ViewChild('win') private winRef!: ElementRef<HTMLElement>;

  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly showcase = new Showcase(inject(ElementRef).nativeElement, this.zone, {
    play: () => this.play(),
    rewind: () => this.rewind(),
    changed: () => this.cdr.markForCheck(),
  }, 8000);

  readonly screens = SCREENS;
  readonly stack = STACK;

  active = 0;
  /** Só carrega a captura atual e a próxima; as demais entram sob demanda. */
  loaded = new Set<number>([0, 1]);
  isWindowOpen = true;
  isMinimized = false;
  isMaximized = false;
  dragging = false;
  showCtrlBImage = false;

  private readonly now = signal(new Date());
  private clockTimer = 0;
  private drag = { x: 0, y: 0 };
  private stopDrag: (() => void) | null = null;
  private readonly onKey = (ev: KeyboardEvent) => this.handleKey(ev);

  get nativeKey(): 'nativeWin' | 'nativeMac' | 'nativeLinux' {
    return this.os === 'macos' ? 'nativeMac' : this.os === 'linux' ? 'nativeLinux' : 'nativeWin';
  }

  src(file: string): string {
    // A variante Linux usa as capturas do tema escuro, para as três molduras não ficarem iguais.
    return `/images/real-screens/${file}${this.os === 'linux' ? '-dark' : ''}.png`;
  }

  clock(): string {
    return this.i18n.date(this.now(), { hour: '2-digit', minute: '2-digit' });
  }

  day(): string {
    return this.i18n.date(this.now(), { day: '2-digit', month: 'short' });
  }

  ngAfterViewInit(): void {
    this.showcase.attach();
    this.clockTimer = window.setInterval(() => this.now.set(new Date()), 30000);
    this.zone.runOutsideAngular(() => document.addEventListener('keydown', this.onKey));
  }

  ngOnDestroy(): void {
    this.showcase.destroy();
    clearInterval(this.clockTimer);
    document.removeEventListener('keydown', this.onKey);
    this.stopDrag?.();
  }

  // ---------- telas ----------

  select(index: number): void {
    this.showcase.interact();
    this.go(index);
  }

  private go(index: number): void {
    this.active = index;
    this.loaded.add(index);
    this.loaded.add((index + 1) % SCREENS.length);
  }

  private play(): void {
    this.showcase.seq([
      [SLIDE_MS, () => this.go((this.active + 1) % SCREENS.length)],
      [60, () => this.showcase.loop()],
    ]);
  }

  /** A troca de tela é um crossfade contínuo; aqui só reabrimos a janela se alguém a fechou. */
  private rewind(): number {
    if (this.isWindowOpen && !this.isMinimized) return 0;
    this.isWindowOpen = true;
    this.isMinimized = false;
    return 500;
  }

  // ---------- janela ----------

  closeWindow(): void {
    this.showcase.interact();
    this.isWindowOpen = false;
    this.isMinimized = false;
    this.isMaximized = false;
    this.resetDrag();
  }

  openWindow(): void {
    this.showcase.interact();
    this.isWindowOpen = true;
    this.isMinimized = false;
  }

  minimizeWindow(): void {
    this.showcase.interact();
    this.isMinimized = true;
  }

  toggleMaximize(): void {
    this.showcase.interact();
    this.isMaximized = !this.isMaximized;
    if (this.isMaximized) this.resetDrag();
  }

  /** Ícone da barra de tarefas/dock: abre, restaura ou minimiza, como em um SO de verdade. */
  restoreWindow(): void {
    this.showcase.interact();
    if (!this.isWindowOpen || this.isMinimized) {
      this.isWindowOpen = true;
      this.isMinimized = false;
    } else {
      this.isMinimized = true;
    }
  }

  startDrag(ev: PointerEvent): void {
    const monitor = this.monitorRef.nativeElement;
    // Em telas estreitas a janela ocupa a área toda: não há para onde arrastar.
    if (this.isMaximized || monitor.clientWidth < 520 || ev.button > 0) return;
    if ((ev.target as HTMLElement).closest('button')) return;
    ev.preventDefault();
    this.showcase.interact();

    const win = this.winRef.nativeElement;
    const screen = this.screenRef.nativeElement.getBoundingClientRect();
    const box = win.getBoundingClientRect();
    const start = { x: ev.clientX - this.drag.x, y: ev.clientY - this.drag.y };
    // Limites: a barra de título nunca sai da tela simulada.
    const minX = this.drag.x - (box.left - screen.left) - box.width * 0.6;
    const maxX = this.drag.x + (screen.right - box.right) + box.width * 0.6;
    const minY = this.drag.y - (box.top - screen.top);
    const maxY = this.drag.y + (screen.bottom - box.top) - 40;

    this.dragging = true;
    const move = (e: PointerEvent) => {
      this.drag = {
        x: Math.min(maxX, Math.max(minX, e.clientX - start.x)),
        y: Math.min(maxY, Math.max(minY, e.clientY - start.y)),
      };
      win.style.setProperty('--dx', `${this.drag.x}px`);
      win.style.setProperty('--dy', `${this.drag.y}px`);
    };
    const end = () => {
      this.stopDrag?.();
      this.zone.run(() => this.set(() => (this.dragging = false)));
    };
    this.stopDrag = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      this.stopDrag = null;
    };
    this.zone.runOutsideAngular(() => {
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    });
  }

  /** Mudança de estado fora de um evento do template: avisa o Angular (a página é OnPush). */
  private set(change: () => void): void {
    change();
    this.cdr.markForCheck();
  }

  private resetDrag(): void {
    this.drag = { x: 0, y: 0 };
    const win = this.winRef?.nativeElement;
    win?.style.setProperty('--dx', '0px');
    win?.style.setProperty('--dy', '0px');
  }

  /** Brincadeira com o nome do produto: Ctrl+B mostra o logotipo enquanto a demo está na tela. */
  private handleKey(ev: KeyboardEvent): void {
    if (this.showCtrlBImage && ev.key === 'Escape') {
      this.zone.run(() => this.set(() => (this.showCtrlBImage = false)));
      return;
    }
    if (!ev.ctrlKey || ev.key.toLowerCase() !== 'b' || !this.showcase.isActive) return;
    const target = ev.target as HTMLElement | null;
    if (target?.closest('input, textarea, [contenteditable]')) return;
    ev.preventDefault();
    this.zone.run(() => this.set(() => (this.showCtrlBImage = !this.showCtrlBImage)));
  }
}
