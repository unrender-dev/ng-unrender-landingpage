import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FeatureBanner } from './feature-banner.types';
import { I18nService, dict } from '../../i18n/i18n.service';

const I18N = dict({
  pt: { choose: 'Escolher imagem', show: 'Mostrar: {alt}' },
  en: { choose: 'Choose image', show: 'Show: {alt}' },
  es: { choose: 'Elegir imagen', show: 'Mostrar: {alt}' },
  fr: { choose: 'Choisir une image', show: 'Afficher : {alt}' },
});

const ROTATE_MS = 5500;

@Component({
  selector: 'app-feature-banner',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './feature-banner.component.html',
  styleUrls: ['./feature-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureBannerComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input({ required: true }) banner!: FeatureBanner;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly t = inject(I18nService).scope(I18N);
  /** Conjunto de mídias do banner atual; trocar só o idioma não reinicia o carrossel. */
  private mediaKey = '';

  index = 0;
  paused = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private visible = true;
  private observer?: IntersectionObserver;

  get mediaCount(): number {
    return this.banner?.media?.length ?? 0;
  }

  get isExternalCta(): boolean {
    return !!this.banner?.cta && /^https?:\/\//.test(this.banner.cta.link);
  }

  /** Divide o título para destacar o trecho de acento sem usar innerHTML. */
  get headlineParts(): { before: string; accent: string; after: string } {
    const { headline, accent } = this.banner;
    const at = accent ? headline.indexOf(accent) : -1;
    if (!accent || at < 0) return { before: headline, accent: '', after: '' };
    return {
      before: headline.slice(0, at),
      accent,
      after: headline.slice(at + accent.length),
    };
  }

  ngOnChanges(): void {
    const key = (this.banner?.media ?? []).map((m) => m.src).join('|');
    if (key !== this.mediaKey) {
      this.mediaKey = key;
      this.index = 0;
      this.restart();
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser || typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.restart();
    });
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.stop();
    this.observer?.disconnect();
  }

  go(i: number): void {
    this.index = (i + this.mediaCount) % this.mediaCount;
    this.restart();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.restart();
  }

  private restart(): void {
    this.stop();
    if (!this.isBrowser || this.mediaCount < 2 || this.paused || !this.visible) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // Fora da zona: o intervalo não dispara change detection na página inteira.
    this.zone.runOutsideAngular(() => {
      this.timer = setInterval(() => {
        this.index = (this.index + 1) % this.mediaCount;
        this.cdr.detectChanges();
      }, ROTATE_MS);
    });
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
