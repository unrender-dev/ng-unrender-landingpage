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
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// @ts-ignore
import { MindARThree } from '../../lib/mindar-face-three.js';
import { CameraService } from '../../services/camera.service';
import { CAMERA_I18N, CameraTextKey, cameraErrorKey } from '../../services/camera.i18n';
import { I18nService } from '../../i18n/i18n.service';
import { I18N } from './mocap.i18n';

class Avatar {
  gltf: any = null;
  morphTargetMeshes: any[] = [];
  root: any = null;

  async init() {
    const url = "https://assets.codepen.io/9177687/raccoon_head.glb";
    const gltf = await new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(url, (gltf: any) => resolve(gltf), undefined, (err: unknown) => reject(err));
    });
    (gltf as any).scene.traverse((object: any) => {
      if ((object).isBone && !this.root) {
        this.root = object; // as THREE.Bone;
      }
      if (!(object).isMesh) return
      const mesh = object;
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return
      this.morphTargetMeshes.push(mesh);
    });
    this.gltf = gltf;
  }

  updateBlendshapes(blendshapes: any) {
    const categories = blendshapes.categories;
    for (const mesh of this.morphTargetMeshes) {
      const dictionary = mesh.morphTargetDictionary;
      const influences = mesh.morphTargetInfluences;
      if (!dictionary || !influences) continue;
      for (let i = 0; i < categories.length; ++i) {
        const idx = dictionary[categories[i].categoryName];
        if (idx !== undefined) influences[idx] = categories[i].score;
      }
    }
  }

  dispose() {
    this.gltf?.scene?.traverse((object: any) => {
      object.geometry?.dispose?.();
      const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
      for (const material of materials) {
        material.map?.dispose?.();
        material.dispose?.();
      }
    });
  }
}

type Phase = 'idle' | 'starting' | 'active' | 'error';
type ErrorRef = { scope: 'camera'; key: CameraTextKey } | { scope: 'own'; key: 'loadError' };

@Component({
  selector: 'app-mocap',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mocap.component.html',
  styleUrls: ['./mocap.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MocapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  readonly ct = this.i18n.scope(CAMERA_I18N);
  private readonly zone = inject(NgZone);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  mindarThree: any;
  avatar: Avatar | null = null;
  cameraSubscribed = false;

  readonly phase = signal<Phase>('idle');
  readonly error = signal<ErrorRef | null>(null);
  readonly errorText = computed(() => {
    const err = this.error();
    if (!err) return '';
    return err.scope === 'camera' ? this.ct(err.key) : this.t(err.key);
  });

  get isStarted(): boolean {
    return this.phase() === 'starting' || this.phase() === 'active';
  }

  /** Muda a cada start/stop: etapas assíncronas de execuções antigas são descartadas. */
  private runId = 0;
  private io: IntersectionObserver | null = null;
  private ro: ResizeObserver | null = null;
  private readonly onVisibility = () => {
    if (document.hidden && this.isStarted) this.stop();
  };

  constructor(private cameraService: CameraService) { }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver !== 'undefined') {
      // Fora da tela a câmera e o rastreamento são desligados.
      this.io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting) && this.isStarted) this.zone.run(() => this.stop());
      });
      this.io.observe(this.host.nativeElement);
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => {
        if (this.phase() === 'active') this.mindarThree?._resize?.();
      });
      this.ro.observe(this.containerRef.nativeElement);
    }
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  async start(): Promise<void> {
    if (this.isStarted) return;
    const run = ++this.runId;
    this.error.set(null);
    this.phase.set('starting');

    let stream: MediaStream;
    try {
      stream = await this.cameraService.startCamera();
    } catch (err) {
      if (run === this.runId) this.fail({ scope: 'camera', key: cameraErrorKey(CameraService.errorKind(err)) });
      return;
    }
    this.cameraSubscribed = true;
    if (run !== this.runId) {
      this.releaseCamera();
      return;
    }

    try {
      const video = document.createElement('video');
      video.setAttribute('autoplay', '');
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.muted = true;
      video.srcObject = stream; // antes de esperar os metadados

      if (video.readyState < 1) {
        await new Promise<void>((resolve) => video.addEventListener('loadedmetadata', () => resolve(), { once: true }));
      }
      await video.play().catch(() => undefined);

      if (!this.avatar) {
        const avatar = new Avatar();
        await avatar.init();
        this.avatar = avatar;
      }
      if (run !== this.runId) return;

      if (!this.mindarThree) {
        this.mindarThree = new MindARThree({
          container: this.containerRef.nativeElement,
          inputVideo: video,
          // As mensagens de carregando/erro são as do próprio componente (traduzidas).
          uiLoading: 'no',
          uiScanning: 'no',
          uiError: 'no',
        });

        const { renderer, scene } = this.mindarThree;
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));
        const anchor = this.mindarThree.addAnchor(1);
        if (this.avatar.gltf) {
          this.avatar.gltf.scene.scale.set(2, 2, 2);
          anchor.group.add(this.avatar.gltf.scene);
        }
      } else {
        // Ao religar, o vídeo anterior aponta para um stream encerrado.
        this.mindarThree.inputVideo = video;
      }

      await this.mindarThree.start();
      if (run !== this.runId) {
        this.haltTracking();
        return;
      }

      const { renderer, scene, camera } = this.mindarThree;
      this.zone.runOutsideAngular(() => {
        renderer.setAnimationLoop(() => {
          const estimate = this.mindarThree.getLatestEstimate();
          if (estimate && estimate.blendshapes && this.avatar) {
            this.avatar.updateBlendshapes(estimate.blendshapes);
          }
          renderer.render(scene, camera);
        });
      });
      this.phase.set('active');
    } catch (err) {
      console.error('Failed to start MindAR:', err);
      if (run === this.runId) this.fail({ scope: 'own', key: 'loadError' });
    }
  }

  stop(): void {
    this.runId++;
    this.haltTracking();
    this.releaseCamera();
    this.error.set(null);
    this.phase.set('idle');
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
    this.ro?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.stop();
    try {
      this.avatar?.dispose();
      this.mindarThree?.renderer?.dispose();
    } catch {
      // limpeza de melhor esforço
    }
    this.mindarThree = null;
    this.avatar = null;
  }

  private fail(error: ErrorRef): void {
    this.runId++;
    this.haltTracking();
    this.releaseCamera();
    this.error.set(error);
    this.phase.set('error');
  }

  private haltTracking(): void {
    if (!this.mindarThree) return;
    try {
      this.mindarThree.renderer.setAnimationLoop(null);
      this.mindarThree.stop();
    } catch {
      // `stop()` da biblioteca falha se o início não chegou a terminar; não há o que desfazer.
    }
  }

  private releaseCamera(): void {
    if (this.cameraSubscribed) {
      this.cameraSubscribed = false;
      this.cameraService.stopCamera();
    }
  }
}
