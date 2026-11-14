import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { CameraService } from '../../services/camera.service';
import { CAMERA_I18N, CameraTextKey, cameraErrorKey } from '../../services/camera.i18n';
import { I18nService, Lang } from '../../i18n/i18n.service';
import { I18N } from './computer-vision.i18n';
import { COCO_LABELS } from './coco-labels.i18n';

type CocoKey = keyof (typeof COCO_LABELS)['pt'];
type Phase = 'idle' | 'loading' | 'starting' | 'active' | 'error';
type ErrorRef = { scope: 'camera'; key: CameraTextKey } | { scope: 'own'; key: 'modelError' };

/** Um objeto continua na lista por este tempo depois de sumir da imagem (evita piscar). */
const LINGER_MS = 900;
const BOX_COLOR = '#f99126';
const BOX_INK = '#1c0f02';

@Component({
  selector: 'app-computer-vision',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './computer-vision.component.html',
  styleUrls: ['./computer-vision.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComputerVisionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  readonly ct = this.i18n.scope(CAMERA_I18N);
  private readonly label = this.i18n.scope(COCO_LABELS);
  private readonly zone = inject(NgZone);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  model: cocoSsd.ObjectDetection | null = null;
  readonly phase = signal<Phase>('idle');
  readonly error = signal<ErrorRef | null>(null);
  /** Classes vistas agora (chaves do modelo; o nome é traduzido no template). */
  readonly detected = signal<string[]>([]);

  readonly busy = computed(() => this.phase() === 'loading' || this.phase() === 'starting');
  readonly statusText = computed(() => (this.phase() === 'loading' ? this.t('loadingModel') : this.ct('starting')));
  readonly errorText = computed(() => {
    const err = this.error();
    if (!err) return '';
    return err.scope === 'camera' ? this.ct(err.key) : this.t(err.key);
  });

  get isCameraActive(): boolean {
    return this.phase() === 'active';
  }

  private modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;
  private rafId: number | null = null;
  /** Muda a cada start/stop: respostas de execuções antigas são descartadas. */
  private runId = 0;
  private cameraHeld = false;
  private lastPredictions: cocoSsd.DetectedObject[] = [];
  private lastSeen = new Map<string, number>();
  private percent: { lang: Lang; format: Intl.NumberFormat } | null = null;
  private observer: IntersectionObserver | null = null;
  private readonly onVisibility = () => {
    if (document.hidden) this.stopCamera();
  };

  constructor(private cameraService: CameraService) {
    // Os rótulos são desenhados no canvas: ao trocar o idioma, redesenha o último quadro.
    effect(() => {
      this.i18n.lang();
      if (this.phase() === 'active') this.renderPredictions(this.lastPredictions);
    });
  }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver !== 'undefined') {
      // Fora da tela a câmera é desligada (privacidade e bateria).
      this.observer = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting) && this.phase() !== 'idle' && this.phase() !== 'error') {
          this.zone.run(() => this.stopCamera());
        }
      });
      this.observer.observe(this.host.nativeElement);
    }
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.stopCamera();
  }

  labelFor(cls: string): string {
    return this.label(cls as CocoKey);
  }

  async startCamera(): Promise<void> {
    if (this.busy() || this.phase() === 'active') return;
    const run = ++this.runId;
    this.error.set(null);
    this.phase.set(this.model ? 'starting' : 'loading');

    // Modelo e câmera em paralelo: o pedido de permissão aparece logo após o clique.
    const modelReady = this.loadModel();
    modelReady.catch(() => undefined);

    let stream: MediaStream;
    try {
      stream = await this.cameraService.startCamera();
    } catch (err) {
      if (run === this.runId) this.fail({ scope: 'camera', key: cameraErrorKey(CameraService.errorKind(err)) });
      return;
    }
    this.cameraHeld = true;
    if (run !== this.runId) {
      this.releaseCamera();
      return;
    }

    try {
      await modelReady;
    } catch (err) {
      console.error(err);
      if (run === this.runId) this.fail({ scope: 'own', key: 'modelError' });
      return;
    }
    if (run !== this.runId) return;

    this.phase.set('starting');
    const video = this.videoElement.nativeElement;
    video.srcObject = stream;
    try {
      if (video.readyState < 1) {
        await new Promise<void>((resolve) => video.addEventListener('loadedmetadata', () => resolve(), { once: true }));
      }
      await video.play();
    } catch (err) {
      if (run === this.runId) this.fail({ scope: 'camera', key: 'unknown' });
      return;
    }
    if (run !== this.runId) return;

    this.phase.set('active');
    this.zone.runOutsideAngular(() => this.detectFrame());
  }

  stopCamera(): void {
    this.runId++;
    this.teardown();
    this.error.set(null);
    this.phase.set('idle');
  }

  private fail(error: ErrorRef): void {
    this.runId++;
    this.teardown();
    this.error.set(error);
    this.phase.set('error');
  }

  private teardown(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    const video = this.videoElement?.nativeElement;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    this.releaseCamera();
    this.lastPredictions = [];
    this.lastSeen.clear();
    this.detected.set([]);
    const canvas = this.canvasElement?.nativeElement;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  private releaseCamera(): void {
    if (this.cameraHeld) {
      this.cameraHeld = false;
      this.cameraService.stopCamera();
    }
  }

  private loadModel(): Promise<cocoSsd.ObjectDetection> {
    if (!this.modelPromise) {
      this.modelPromise = cocoSsd.load().then(
        (model) => (this.model = model),
        (err) => {
          // Permite nova tentativa depois de uma falha de rede.
          this.modelPromise = null;
          throw err;
        },
      );
    }
    return this.modelPromise;
  }

  private detectFrame = (): void => {
    if (this.phase() !== 'active' || !this.model) return;
    const run = this.runId;
    const next = () => {
      if (run === this.runId) this.rafId = requestAnimationFrame(this.detectFrame);
    };
    this.model.detect(this.videoElement.nativeElement).then((predictions) => {
      if (run !== this.runId) return;
      this.lastPredictions = predictions;
      this.renderPredictions(predictions);
      this.updateDetected(predictions);
      next();
    }, next);
  };

  renderPredictions(predictions: cocoSsd.DetectedObject[]): void {
    const canvas = this.canvasElement?.nativeElement;
    const video = this.videoElement?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !video || !ctx || !video.videoWidth) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // O canvas tem a resolução do vídeo e é reduzido por CSS: compensa para o texto
    // ficar com ~13 px na tela em qualquer largura.
    const scale = canvas.clientWidth ? canvas.width / canvas.clientWidth : 1;
    const fontSize = Math.round(13 * scale);
    const pad = Math.round(5 * scale);
    const line = Math.max(2, Math.round(2.5 * scale));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `600 ${fontSize}px Montserrat, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.lineWidth = line;
    ctx.lineJoin = 'round';

    for (const prediction of predictions) {
      const [x, y, width, height] = prediction.bbox;
      const text = `${this.labelFor(prediction.class)} ${this.formatPercent(prediction.score)}`;
      const textWidth = ctx.measureText(text).width;
      const tagHeight = fontSize + pad * 2;
      // A etiqueta fica acima da caixa; se não couber, entra na caixa.
      const tagY = y - tagHeight >= 0 ? y - tagHeight : y;
      const tagX = Math.min(Math.max(0, x - line / 2), Math.max(0, canvas.width - textWidth - pad * 2));

      ctx.strokeStyle = BOX_COLOR;
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = BOX_COLOR;
      ctx.fillRect(tagX, tagY, textWidth + pad * 2, tagHeight);
      ctx.fillStyle = BOX_INK;
      ctx.fillText(text, tagX + pad, tagY + tagHeight / 2);
    }
  }

  private formatPercent(score: number): string {
    const lang = this.i18n.lang();
    if (!this.percent || this.percent.lang !== lang) {
      this.percent = {
        lang,
        format: new Intl.NumberFormat(this.i18n.locale(), { style: 'percent', maximumFractionDigits: 0 }),
      };
    }
    return this.percent.format.format(score);
  }

  private updateDetected(predictions: cocoSsd.DetectedObject[]): void {
    const now = performance.now();
    for (const prediction of predictions) this.lastSeen.set(prediction.class, now);
    for (const [cls, seen] of this.lastSeen) {
      if (now - seen > LINGER_MS) this.lastSeen.delete(cls);
    }
    const current = [...this.lastSeen.keys()].sort();
    const previous = this.detected();
    if (current.length !== previous.length || current.some((cls, i) => cls !== previous[i])) {
      this.zone.run(() => this.detected.set(current));
    }
  }
}
