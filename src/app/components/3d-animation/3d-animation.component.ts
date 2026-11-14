import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { I18nService } from '../../i18n/i18n.service';
import { I18N } from './3d-animation.i18n';

/** Fundo da cena: o roxo da marca. */
const BACKGROUND = 0x10051c;
const CONFETTI_COUNT = 200;

interface Orbiter {
  mesh: THREE.Mesh;
  /** Velocidade de rotação própria (rad/s). */
  spin: number;
  /** Velocidade orbital (rad/s), raio, ângulo inicial e altura média. */
  orbitSpeed: number;
  radius: number;
  angle: number;
  height: number;
}

interface Star {
  material: THREE.MeshBasicMaterial;
  speed: number;
  phase: number;
  base: number;
}

interface Confetto {
  origin: THREE.Vector3;
  amplitude: THREE.Vector3;
  frequency: THREE.Vector3;
  phase: THREE.Vector3;
  spin: THREE.Vector3;
  size: number;
}

@Component({
  selector: 'app-3d-animation-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="canvas-wrapper" #wrapper role="img" [attr.aria-label]="t('sceneLabel')">
      <canvas #canvas aria-hidden="true"></canvas>
      @if (failed()) {
        <p class="scene-error">{{ t('webglError') }}</p>
      } @else {
        <div class="interaction-hint" [class.is-visible]="hintVisible()" aria-hidden="true">
          <i class="fa-solid fa-arrows-up-down-left-right"></i>
          <span class="hint-pointer">{{ t('hintPointer') }}</span>
          <span class="hint-touch">{{ t('hintTouch') }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }

    .canvas-wrapper {
      position: relative;
      width: 100%;
      height: clamp(320px, 62vh, 560px);
      border-radius: 1rem;
      overflow: hidden;
      background: #10051c;
      /* Arrastar na horizontal gira a cena; a rolagem vertical da página continua livre. */
      touch-action: pan-y;
    }

    canvas {
      display: block;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .interaction-hint {
      position: absolute;
      left: 50%;
      bottom: 16px;
      max-width: calc(100% - 32px);
      transform: translate(-50%, 8px);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 999px;
      background: rgba(16, 5, 28, 0.82);
      border: 1px solid rgba(255, 255, 255, 0.22);
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.3;
      text-align: center;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .interaction-hint.is-visible {
      opacity: 1;
      transform: translate(-50%, 0);
    }

    .interaction-hint i { color: #f99126; }
    .hint-touch { display: none; }

    @media (pointer: coarse) {
      .hint-pointer { display: none; }
      .hint-touch { display: inline; }
    }

    .scene-error {
      position: absolute;
      inset: 0;
      margin: 0;
      padding: 24px;
      display: grid;
      place-items: center;
      text-align: center;
      color: #ffffff;
      font-size: 0.9375rem;
      line-height: 1.5;
    }

    @media (prefers-reduced-motion: reduce) {
      .interaction-hint { transition: none; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreeDAnimationDemoComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wrapper') private wrapperRef!: ElementRef<HTMLDivElement>;

  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  readonly hintVisible = signal(false);
  readonly failed = signal(false);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private composer: EffectComposer | null = null;
  private bloomPass!: UnrealBloomPass;
  private bokehPass!: BokehPass;
  private lensDistortionPass!: ShaderPass;
  private pointLight1!: THREE.PointLight;
  private pointLight2!: THREE.PointLight;

  private orbiters: Orbiter[] = [];
  private stars: Star[] = [];
  private confetti: Confetto[] = [];
  private confettiMesh: THREE.InstancedMesh | null = null;
  private readonly dummy = new THREE.Object3D();

  /** Relógio da cena em segundos; só avança enquanto ela está visível. */
  private time = 0;
  private lastFrame = 0;
  private cameraAngle = Math.PI / 2;
  private targetRotation = { x: 0, y: 0 };
  private currentRotation = { x: 0, y: 0 };
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };

  private animationFrameId = 0;
  private inView = false;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  private io: IntersectionObserver | null = null;
  private ro: ResizeObserver | null = null;
  private readonly isBrowser: boolean;
  private readonly reducedMotion: boolean;
  private removeListeners: Array<() => void> = [];

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private ngZone: NgZone,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.reducedMotion =
      this.isBrowser && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.ngZone.runOutsideAngular(() => {
      try {
        this.initThree();
      } catch (error) {
        console.error('3D Animation: WebGL indisponível', error);
        this.disposeThree();
        this.ngZone.run(() => this.failed.set(true));
        return;
      }
      this.initInteraction();
      this.initObservers();
    });
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    this.stopLoop();
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.io?.disconnect();
    this.ro?.disconnect();
    this.removeListeners.forEach((remove) => remove());
    this.removeListeners = [];
    this.disposeThree();
  }

  // --- Montagem da cena ---

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const { width, height } = this.size();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND);
    this.scene.fog = new THREE.Fog(BACKGROUND, 30, 120);

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 15, 30);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const directionalLight = new THREE.DirectionalLight(0xffa500, 1.5);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);

    this.pointLight1 = new THREE.PointLight(0xff8a3d, 600, 50);
    this.pointLight1.position.set(-15, 10, -15);
    this.scene.add(this.pointLight1);

    this.pointLight2 = new THREE.PointLight(0x7b5cff, 600, 50);
    this.pointLight2.position.set(15, 10, 15);
    this.scene.add(this.pointLight2);

    this.createCelestialObjects();
    this.createConfetti();

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.pixelRatio());
    this.composer.setSize(width, height);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.9, 0.4, 0.8);
    this.composer.addPass(this.bloomPass);

    this.bokehPass = new BokehPass(this.scene, this.camera, { focus: 25.0, aperture: 0.0001, maxblur: 0.01 });
    this.composer.addPass(this.bokehPass);

    this.initLensDistortionPass(width / height);
    this.composer.addPass(new OutputPass());

    this.update(0);
    this.composer.render();
  }

  private initLensDistortionPass(aspect: number): void {
    const background = new THREE.Color(BACKGROUND);
    this.lensDistortionPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        strength: { value: 0.15 },
        aspectRatio: { value: aspect },
        edgeColor: { value: new THREE.Vector3(background.r, background.g, background.b) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float strength;
        uniform float aspectRatio;
        uniform vec3 edgeColor;
        varying vec2 vUv;
        void main() {
          vec2 center = vec2(0.5);
          vec2 d = vUv - center;
          float r2 = (aspectRatio * d.x) * (aspectRatio * d.x) + d.y * d.y;
          vec2 uv = (1.0 + r2 * strength) * d + center;
          // Fora da imagem distorcida entra a cor de fundo, não um recorte transparente.
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            gl_FragColor = vec4(edgeColor, 1.0);
          } else {
            gl_FragColor = texture2D(tDiffuse, uv);
          }
        }`,
    });
    this.composer!.addPass(this.lensDistortionPass);
  }

  private createCelestialObjects(): void {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const palette = [
      { color: 0xff6b35, emissive: 0xff4400 }, { color: 0x4a90e2, emissive: 0x2266cc },
      { color: 0xffd700, emissive: 0xffaa00 }, { color: 0x9b59b6, emissive: 0x7733aa },
      { color: 0x1abc9c, emissive: 0x00aa77 }, { color: 0xe74c3c, emissive: 0xcc2211 },
      { color: 0xf39c12, emissive: 0xdd7700 }, { color: 0x3498db, emissive: 0x1166aa },
    ];

    // Planetas
    for (let i = 0; i < 8; i++) {
      const data = palette[i % palette.length];
      const material = new THREE.MeshStandardMaterial({
        color: data.color, metalness: 0.3, roughness: 0.7, emissive: data.emissive, emissiveIntensity: 0.35,
      });
      const mesh = new THREE.Mesh(box, material);
      mesh.scale.setScalar(Math.random() * 3 + 1.5);
      this.scene.add(mesh);
      this.orbiters.push({
        mesh,
        spin: Math.random() * 0.6 + 0.12,
        orbitSpeed: Math.random() * 0.06 + 0.03,
        radius: Math.random() * 25 + 15,
        angle: (i / 8) * Math.PI * 2,
        height: Math.random() * 20 - 10,
      });
    }

    // Luas e asteroides
    for (let i = 0; i < 15; i++) {
      const data = palette[Math.floor(Math.random() * palette.length)];
      const material = new THREE.MeshStandardMaterial({
        color: data.color, metalness: 0.5, roughness: 0.8, emissive: data.emissive, emissiveIntensity: 0.25,
      });
      const mesh = new THREE.Mesh(box, material);
      mesh.scale.setScalar(Math.random() * 0.8 + 0.3);
      const x = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;
      this.scene.add(mesh);
      this.orbiters.push({
        mesh,
        spin: Math.random() * 1.2 + 0.3,
        orbitSpeed: Math.random() * 0.12 + 0.06,
        radius: Math.sqrt(x * x + z * z),
        angle: Math.atan2(z, x),
        height: (Math.random() - 0.5) * 30,
      });
    }

    // Estrelas (cintilam por opacidade, com função periódica)
    for (let i = 0; i < 50; i++) {
      const color = Math.random() > 0.5 ? 0xffffff : Math.random() > 0.5 ? 0xffffaa : 0xaaaaff;
      const base = Math.random() * 0.4 + 0.5;
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: base });
      const mesh = new THREE.Mesh(box, material);
      mesh.scale.setScalar(Math.random() * 0.3 + 0.1);
      mesh.position.set((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 100);
      this.scene.add(mesh);
      this.stars.push({ material, speed: Math.random() * 1.2 + 0.6, phase: Math.random() * Math.PI * 2, base });
    }
  }

  private createConfetti(): void {
    const colors = [0xff006e, 0xffbe0b, 0xfb5607, 0x8338ec, 0x3a86ff, 0x06ffa5, 0xff69b4, 0x00ffff];
    const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7 });
    // Uma única malha instanciada: 200 cubos em uma chamada de desenho.
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, CONFETTI_COUNT);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    const color = new THREE.Color();
    const rnd = (range: number) => (Math.random() - 0.5) * range;

    for (let i = 0; i < CONFETTI_COUNT; i++) {
      mesh.setColorAt(i, color.setHex(colors[Math.floor(Math.random() * colors.length)]));
      this.confetti.push({
        origin: new THREE.Vector3(rnd(80), rnd(60), rnd(80)),
        // Deriva em trajetórias fechadas (senoides): nunca há salto de um lado para o outro.
        amplitude: new THREE.Vector3(2 + Math.random() * 6, 2 + Math.random() * 6, 2 + Math.random() * 6),
        frequency: new THREE.Vector3(0.1 + Math.random() * 0.25, 0.1 + Math.random() * 0.25, 0.1 + Math.random() * 0.25),
        phase: new THREE.Vector3(rnd(Math.PI * 2), rnd(Math.PI * 2), rnd(Math.PI * 2)),
        spin: new THREE.Vector3(rnd(3), rnd(3), rnd(3)),
        size: Math.random() * 0.3 + 0.1,
      });
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.confettiMesh = mesh;
    this.scene.add(mesh);
  }

  // --- Interação e ciclo de vida ---

  private initInteraction(): void {
    const el = this.wrapperRef.nativeElement;
    const on = <K extends keyof HTMLElementEventMap>(type: K, handler: (event: HTMLElementEventMap[K]) => void) => {
      el.addEventListener(type, handler, { passive: true });
      this.removeListeners.push(() => el.removeEventListener(type, handler));
    };

    on('pointermove', (event) => {
      const rect = el.getBoundingClientRect();
      if (event.pointerType === 'mouse') {
        // Mouse: a posição sobre a cena inclina a câmera.
        this.targetRotation.y = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.targetRotation.x = -(((event.clientY - rect.top) / rect.height) * 2 - 1) * 0.5;
      } else if (this.dragging) {
        // Toque: arrastar acumula rotação.
        this.targetRotation.y = clamp(this.targetRotation.y + ((event.clientX - this.lastPointer.x) / rect.width) * 2, -1, 1);
        this.lastPointer = { x: event.clientX, y: event.clientY };
      }
      this.hideHint();
    });
    on('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      this.dragging = true;
      this.lastPointer = { x: event.clientX, y: event.clientY };
    });
    const release = () => {
      this.dragging = false;
      // Ao soltar (ou sair com o mouse), a cena volta devagar ao giro de vitrine.
      this.targetRotation.x = 0;
      this.targetRotation.y = 0;
    };
    on('pointerup', release);
    on('pointercancel', release);
    on('pointerleave', release);

    const onVisibility = () => this.syncLoop();
    document.addEventListener('visibilitychange', onVisibility);
    this.removeListeners.push(() => document.removeEventListener('visibilitychange', onVisibility));
  }

  private initObservers(): void {
    const el = this.wrapperRef.nativeElement;

    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(el);
    }

    if (typeof IntersectionObserver !== 'undefined') {
      let hinted = false;
      this.io = new IntersectionObserver(
        (entries) => {
          this.inView = entries.some((e) => e.isIntersecting);
          this.syncLoop();
          if (this.inView && !hinted) {
            hinted = true;
            this.showHint(4500);
          }
        },
        { threshold: 0.1 },
      );
      this.io.observe(el);
    } else {
      this.inView = true;
      this.syncLoop();
    }
  }

  private syncLoop(): void {
    const shouldRun = this.inView && !document.hidden && !this.reducedMotion && !!this.composer;
    if (shouldRun && !this.animationFrameId) {
      this.lastFrame = performance.now();
      this.animationFrameId = requestAnimationFrame(this.animate);
    } else if (!shouldRun) {
      this.stopLoop();
    }
  }

  private stopLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  private size(): { width: number; height: number } {
    const el = this.wrapperRef.nativeElement;
    return { width: Math.max(1, el.clientWidth), height: Math.max(1, el.clientHeight) };
  }

  private pixelRatio(): number {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  private resize(): void {
    if (!this.renderer || !this.composer) return;
    const { width, height } = this.size();
    const ratio = this.pixelRatio();

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(width, height);
    (this.bokehPass.uniforms as Record<string, { value: unknown }>)['aspect'].value = width / height;
    this.lensDistortionPass.uniforms['aspectRatio'].value = width / height;

    // Parado (fora da tela ou movimento reduzido), o quadro precisa ser refeito no novo tamanho.
    if (!this.animationFrameId) this.composer.render();
  }

  // --- Animação: tudo é função do relógio contínuo, sem contadores que zeram ---

  private animate = (now: number): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    // Limita o passo para a cena não "pular" depois de uma aba congelada.
    const dt = Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;
    this.update(dt);
    this.composer!.render();
  };

  private update(dt: number): void {
    this.time += dt;
    const t = this.time;

    // Suavização independente da taxa de quadros.
    const ease = 1 - Math.exp(-dt * 6);
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * ease;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * ease;
    const rx = this.currentRotation.x;
    const ry = this.currentRotation.y;

    this.cameraAngle += (0.18 + ry * 0.6) * dt;
    this.camera.position.set(
      Math.cos(this.cameraAngle) * 30,
      15 + Math.sin(t * 0.6) * 2 + Math.cos(t * 0.42) + rx * 10,
      Math.sin(this.cameraAngle) * 30,
    );
    this.camera.lookAt(ry * 5, 5 + rx * 5, 0);

    for (const o of this.orbiters) {
      const angle = o.angle + o.orbitSpeed * t;
      o.mesh.position.set(Math.cos(angle) * o.radius, o.height + Math.sin(angle * 2) * 2, Math.sin(angle) * o.radius);
      o.mesh.rotation.set(o.spin * 0.3 * t, o.spin * t, 0);
    }

    for (const s of this.stars) {
      s.material.opacity = s.base + Math.sin(s.phase + s.speed * t) * 0.3;
    }

    if (this.confettiMesh) {
      const d = this.dummy;
      for (let i = 0; i < this.confetti.length; i++) {
        const c = this.confetti[i];
        d.position.set(
          c.origin.x + Math.sin(c.phase.x + c.frequency.x * t) * c.amplitude.x,
          c.origin.y + Math.sin(c.phase.y + c.frequency.y * t) * c.amplitude.y,
          c.origin.z + Math.sin(c.phase.z + c.frequency.z * t) * c.amplitude.z,
        );
        d.rotation.set(c.spin.x * t, c.spin.y * t, c.spin.z * t);
        d.scale.setScalar(c.size);
        d.updateMatrix();
        this.confettiMesh.setMatrixAt(i, d.matrix);
      }
      this.confettiMesh.instanceMatrix.needsUpdate = true;
    }

    this.pointLight1.position.x = Math.sin(t * 0.7) * 20;
    this.pointLight1.position.z = Math.cos(t * 0.5) * 20;
    this.pointLight2.position.x = Math.cos(t * 0.6) * 20;
    this.pointLight2.position.z = Math.sin(t * 0.8) * 20;
  }

  // --- Dica de interação ---

  private showHint(duration: number): void {
    this.ngZone.run(() => this.hintVisible.set(true));
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.hideHint(), duration);
  }

  private hideHint(): void {
    if (!this.hintVisible()) return;
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
    this.ngZone.run(() => this.hintVisible.set(false));
  }

  // --- Limpeza ---

  private disposeThree(): void {
    try {
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      this.scene?.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        const list = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        list.forEach((material) => materials.add(material));
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      this.confettiMesh?.dispose();
      this.scene?.clear();

      this.composer?.passes.forEach((pass) => pass.dispose?.());
      this.composer?.dispose();
      this.renderer?.dispose();
      this.renderer?.forceContextLoss();
    } catch (e) {
      console.warn('3D Animation: erro ao liberar recursos', e);
    }
    this.composer = null;
    this.renderer = null;
    this.confettiMesh = null;
    this.orbiters = [];
    this.stars = [];
    this.confetti = [];
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
