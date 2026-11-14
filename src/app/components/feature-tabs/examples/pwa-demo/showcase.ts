import { NgZone } from '@angular/core';

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface ShowcaseHooks {
  /** Agenda os passos de um ciclo (use `seq`) e termina chamando `loop()`. */
  play(): void;
  /** Leva a cena de volta ao estado inicial COM animação; devolve quantos ms isso leva. */
  rewind(): number;
  /** A demo entrou/saiu da tela (ou a aba ficou oculta/visível). */
  active?(on: boolean): void;
  /**
   * O roteiro mudou o estado fora de um evento do usuário. Use para `markForCheck()`:
   * a página que hospeda as demos é OnPush, então um timer sozinho não redesenha o template.
   */
  changed?(): void;
}

/**
 * "Modo vitrine" compartilhado pelas demos deste grupo: roda um roteiro em loop,
 * pausa fora da tela ou com a aba oculta, cede o controle quando a pessoa interage
 * e retoma sozinho depois de um tempo parado. O recomeço sempre passa por `rewind()`,
 * para a cena voltar ao início com transição em vez de ser zerada de repente.
 */
export class Showcase {
  readonly reduced = prefersReducedMotion();
  /** `true` enquanto o roteiro automático está no comando. */
  autoplay = !this.reduced;
  /** `true` quando a demo está na tela e a aba está visível. */
  isActive = false;

  private started = false;
  private onScreen = false;
  private destroyed = false;
  private timers = new Set<number>();
  private idleTimer = 0;
  private io?: IntersectionObserver;
  private readonly onVisibility = () => this.refresh();

  constructor(
    private readonly el: HTMLElement,
    private readonly zone: NgZone,
    private readonly hooks: ShowcaseHooks,
    private readonly idleMs = 9000,
  ) {}

  attach(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.onScreen = true;
    } else {
      this.io = new IntersectionObserver(
        (entries) => {
          this.onScreen = entries.some((e) => e.isIntersecting);
          this.refresh();
        },
        { threshold: 0.15 },
      );
      this.io.observe(this.el);
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    this.refresh();
  }

  destroy(): void {
    this.destroyed = true;
    this.clearScript();
    this.clearIdle();
    this.io?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  /** Agenda passos em sequência: cada item é `[espera em ms desde o passo anterior, ação]`. */
  seq(steps: ReadonlyArray<readonly [number, () => void]>): void {
    let at = 0;
    for (const [wait, fn] of steps) {
      at += wait;
      this.later(at, fn);
    }
  }

  /** Fim do ciclo (ou retomada): volta ao início com animação e toca de novo. */
  loop(): void {
    this.clearScript();
    const ms = this.hooks.rewind();
    this.later(ms, () => this.run());
  }

  /** A pessoa mexeu na demo: para o roteiro e agenda a retomada por inatividade. */
  interact(): void {
    this.clearScript();
    if (this.reduced) return;
    this.autoplay = false;
    this.armIdle();
  }

  /** Botão "reiniciar": devolve o controle ao roteiro imediatamente. */
  restart(): void {
    this.clearIdle();
    this.clearScript();
    if (this.reduced) {
      this.hooks.rewind();
      return;
    }
    this.autoplay = true;
    if (this.isActive) this.loop();
    else this.hooks.rewind();
  }

  /** Para tudo (testes e destruição). */
  stop(): void {
    this.clearScript();
    this.clearIdle();
    this.autoplay = false;
  }

  private run(): void {
    this.clearScript();
    this.started = true;
    this.hooks.play();
  }

  private refresh(): void {
    if (this.destroyed) return;
    const active = this.onScreen && !document.hidden;
    if (active === this.isActive) return;
    this.isActive = active;
    this.zone.run(() => {
      this.hooks.active?.(active);
      if (!active) {
        this.clearScript();
        this.clearIdle();
        return;
      }
      if (!this.reduced) {
        if (!this.autoplay) this.armIdle();
        else if (this.started) this.loop();
        else this.run();
      }
      this.hooks.changed?.();
    });
  }

  private later(ms: number, fn: () => void): void {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      if (this.destroyed) return;
      this.zone.run(() => {
        fn();
        this.hooks.changed?.();
      });
    }, ms);
    this.timers.add(id);
  }

  private armIdle(): void {
    this.clearIdle();
    this.idleTimer = window.setTimeout(() => {
      this.idleTimer = 0;
      if (this.destroyed || !this.isActive) return;
      this.zone.run(() => {
        this.autoplay = true;
        this.loop();
        this.hooks.changed?.();
      });
    }, this.idleMs);
  }

  private clearScript(): void {
    this.timers.forEach((id) => clearTimeout(id));
    this.timers.clear();
  }

  private clearIdle(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = 0;
  }
}
