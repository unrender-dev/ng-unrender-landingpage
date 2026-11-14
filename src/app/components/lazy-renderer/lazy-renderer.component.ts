import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  Type,
  inject,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { I18nService, dict } from '../../i18n/i18n.service';

const I18N = dict({
  pt: { loading: 'Carregando demonstração…', error: 'Não foi possível carregar esta demonstração.', retry: 'Tentar de novo' },
  en: { loading: 'Loading demo…', error: 'This demo could not be loaded.', retry: 'Try again' },
  es: { loading: 'Cargando demostración…', error: 'No se pudo cargar esta demostración.', retry: 'Reintentar' },
  fr: { loading: 'Chargement de la démonstration…', error: 'Impossible de charger cette démonstration.', retry: 'Réessayer' },
});

/**
 * Carrega um componente sob demanda, só quando ele se aproxima da área visível.
 * Antes todas as demos do item eram baixadas e iniciadas de uma vez (Three.js,
 * câmera, jogos…), mesmo as que estavam várias telas abaixo.
 */
@Component({
  selector: 'app-lazy-renderer',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `
    @if (component) {
      <ng-container [ngComponentOutlet]="component" [ngComponentOutletInputs]="inputs" />
    } @else if (error) {
      <div class="lazy-state lazy-state--error" role="alert">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        <p>{{ t('error') }}</p>
        <button type="button" (click)="load()">{{ t('retry') }}</button>
      </div>
    } @else {
      <div class="lazy-state" role="status" [attr.aria-label]="t('loading')">
        <span class="lazy-shimmer" aria-hidden="true"></span>
        <span class="lazy-spinner" aria-hidden="true"></span>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .lazy-state {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        min-height: 18rem;
        padding: 1.5rem;
        border-radius: 1rem;
        background: #f1f2f5;
        color: #4b5563;
        text-align: center;
        overflow: hidden;
      }

      .lazy-shimmer {
        position: absolute;
        inset: 0;
        background: linear-gradient(100deg, transparent 20%, rgba(255, 255, 255, 0.75) 50%, transparent 80%);
        background-size: 200% 100%;
        animation: lazy-shimmer 1.6s linear infinite;
      }

      .lazy-spinner {
        position: relative;
        width: 2.5rem;
        height: 2.5rem;
        border: 4px solid rgba(16, 5, 28, 0.12);
        border-top-color: var(--unrender-accent, #f99126);
        border-radius: 50%;
        animation: lazy-spin 0.9s linear infinite;
      }

      .lazy-state--error {
        background: #fef2f2;
        color: #991b1b;
        font-size: 0.9375rem;
      }

      .lazy-state--error i {
        font-size: 1.5rem;
      }

      .lazy-state--error p {
        margin: 0;
      }

      .lazy-state--error button {
        min-height: 44px;
        padding: 0.5rem 1.25rem;
        border: 0;
        border-radius: 999px;
        background: #991b1b;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      /* O gradiente desloca exatamente um período: o loop não tem emenda. */
      @keyframes lazy-shimmer {
        from {
          background-position: 200% 0;
        }
        to {
          background-position: 0 0;
        }
      }

      @keyframes lazy-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .lazy-shimmer,
        .lazy-spinner {
          animation: none;
        }
      }
    `,
  ],
})
export class LazyRendererComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() loader!: () => Promise<Type<any>>;
  @Input() inputs: Record<string, any> = {};

  component: Type<any> | null = null;
  error = false;
  readonly t = inject(I18nService).scope(I18N);

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: IntersectionObserver;
  private near = false;
  private ticket = 0;

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.near = true;
      void this.load();
      return;
    }
    // Começa a carregar ~uma tela antes de aparecer.
    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        this.near = true;
        this.observer?.disconnect();
        void this.load();
      },
      { rootMargin: '600px 0px' },
    );
    this.observer.observe(this.host.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loader'] && !changes['loader'].firstChange) {
      this.component = null;
      if (this.near) void this.load();
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.ticket++;
  }

  async load(): Promise<void> {
    if (!this.loader) return;
    const ticket = ++this.ticket;
    this.error = false;
    this.cdr.markForCheck();
    try {
      const loaded: any = await this.loader();
      if (ticket !== this.ticket) return; // o loader mudou (ou o componente saiu) enquanto carregava
      const component = loaded?.default ?? loaded;
      if (!component) throw new Error('export vazio');
      this.component = component;
    } catch (err) {
      if (ticket !== this.ticket) return;
      console.error('Falha ao carregar componente sob demanda:', err);
      this.error = true;
    } finally {
      if (ticket === this.ticket) this.cdr.markForCheck();
    }
  }
}
