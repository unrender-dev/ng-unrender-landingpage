/**
 * "Modo vitrine" das simulações de hardware.
 *
 * Roda um roteiro assíncrono em loop infinito enquanto a demo está visível e
 * ninguém mexe nela. Quando o usuário interage, o roteiro é interrompido no
 * passo em que estava e só volta depois de alguns segundos de inatividade.
 *
 *   this.showcase.start(async (step) => {
 *     await this.voltarAoInicio();   // sempre com transição, nunca zerando seco
 *     await step(1200);              // pausa interrompível
 *     ...
 *   });
 */

/** Sentinela lançada quando um roteiro/fluxo é interrompido; `guard()` a engole. */
export const ABORT = Symbol('showcase-abort');

export type Step = (ms: number) => Promise<void>;

interface Pending {
  timer: ReturnType<typeof setTimeout> | null;
  reject: (reason: unknown) => void;
  /** Só é cancelado na destruição (fluxos que precisam terminar sozinhos). */
  sticky: boolean;
}

export class Showcase {
  /** `prefers-reduced-motion`: sem autoplay; a demo fica parada no estado inicial. */
  readonly reduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  private run = 0;
  private inView = false;
  private destroyed = false;
  private script: ((step: Step) => Promise<void>) | null = null;
  private pending = new Set<Pending>();
  private waiters = new Set<{ resolve: () => void; reject: (r: unknown) => void }>();
  private io: IntersectionObserver | null = null;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onVisibility = () => this.activeChanged();

  /** Avisado quando a demo entra/sai da tela ou a aba fica oculta (para pausar loops de RAF). */
  onActive: ((active: boolean) => void) | null = null;

  /**
   * @param host elemento observado (pausa fora da viewport)
   * @param resumeAfter ms de inatividade antes de retomar o roteiro
   * @param canResume devolve `false` enquanto um fluxo do usuário ainda está em curso
   */
  constructor(
    private readonly host: HTMLElement,
    private readonly resumeAfter = 8000,
    private readonly canResume: () => boolean = () => true,
  ) {}

  start(script: (step: Step) => Promise<void>): void {
    this.script = script;
    if (typeof IntersectionObserver === 'function') {
      this.io = new IntersectionObserver(
        (entries) => {
          this.inView = entries[entries.length - 1].isIntersecting;
          this.activeChanged();
        },
        { threshold: 0.15 },
      );
      this.io.observe(this.host);
    } else {
      this.inView = true;
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    if (!this.reduced) void this.loop();
  }

  /** O usuário interagiu: para o roteiro e agenda a retomada. */
  interrupt(): void {
    if (this.destroyed) return;
    this.run++;
    this.abort(false);
    this.scheduleResume(this.resumeAfter);
  }

  /** Pausa que só é cancelada na destruição do componente (para fluxos que devem terminar). */
  wait(ms: number): Promise<void> {
    return this.sleep(ms, true);
  }

  /** Engole a interrupção de um fluxo; outros erros seguem adiante. */
  async guard(flow: () => Promise<void>): Promise<void> {
    try {
      await flow();
    } catch (e) {
      if (e !== ABORT) throw e;
    }
  }

  /** Desliga só o autoplay (as pausas de `wait()` continuam valendo). Usado em testes. */
  disable(): void {
    this.script = null;
    this.run++;
    this.abort(false);
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.resumeTimer = null;
  }

  destroy(): void {
    this.destroyed = true;
    this.run++;
    this.abort(true);
    this.io?.disconnect();
    this.io = null;
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
  }

  /** Visível na tela e com a aba em primeiro plano. */
  get active(): boolean {
    return this.inView && !document.hidden;
  }

  private activeChanged(): void {
    this.onActive?.(this.active);
    this.flushWaiters();
  }

  private async loop(): Promise<void> {
    if (this.destroyed || !this.script) return;
    const id = ++this.run;
    const step: Step = async (ms) => {
      if (id !== this.run) throw ABORT;
      await this.sleep(ms, false);
      if (id !== this.run) throw ABORT;
      await this.whenActive();
      if (id !== this.run) throw ABORT;
    };
    try {
      await this.whenActive();
      while (id === this.run) await this.script(step);
    } catch (e) {
      if (e !== ABORT) console.error(e);
    }
  }

  private scheduleResume(ms: number): void {
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    if (this.reduced || this.destroyed || !this.script) return;
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = null;
      if (this.canResume()) void this.loop();
      else this.scheduleResume(1500);
    }, ms);
  }

  private sleep(ms: number, sticky: boolean): Promise<void> {
    if (this.destroyed) return Promise.reject(ABORT);
    return new Promise<void>((resolve, reject) => {
      const p: Pending = { timer: null, reject, sticky };
      p.timer = setTimeout(() => {
        this.pending.delete(p);
        resolve();
      }, ms);
      this.pending.add(p);
    });
  }

  private whenActive(): Promise<void> {
    if (this.active) return Promise.resolve();
    return new Promise<void>((resolve, reject) => this.waiters.add({ resolve, reject }));
  }

  private flushWaiters(): void {
    if (!this.active) return;
    for (const w of this.waiters) w.resolve();
    this.waiters.clear();
  }

  private abort(all: boolean): void {
    for (const p of [...this.pending]) {
      if (!all && p.sticky) continue;
      if (p.timer) clearTimeout(p.timer);
      this.pending.delete(p);
      p.reject(ABORT);
    }
    for (const w of this.waiters) w.reject(ABORT);
    this.waiters.clear();
  }
}

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

/**
 * Interpola um número ao longo de `ms` (para totais e telemetria que não devem "pular").
 * Devolve uma função que cancela a interpolação.
 */
export function tween(
  from: number,
  to: number,
  ms: number,
  apply: (value: number) => void,
  ease: (x: number) => number = easeOutCubic,
): () => void {
  if (from === to || ms <= 0 || typeof requestAnimationFrame !== 'function') {
    apply(to);
    return () => {};
  }
  const t0 = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const x = Math.min(1, (now - t0) / ms);
    apply(from + (to - from) * ease(x));
    if (x < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
