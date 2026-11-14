import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import * as THREE from 'three';
import { LoadingService } from '../../services/loading.service';
import { I18nService } from '../../i18n/i18n.service';
import { I18N } from './hero-cube.i18n';

/** Um voxel do cubo: de onde sai, para onde voa e quando começa a se soltar. */
interface Voxel {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  delay: number;
  startOffset: number;
  distance: number;
  /** Giro total (rad por eixo) quando o voxel está totalmente solto. */
  spin: THREE.Vector3;
  /** Progresso suavizado da explosão (0 = no cubo, 1 = solto). */
  progress: number;
}

const POINT_COUNT = 200;
const AREA_SIZE = 250;
const HALF_AREA = AREA_SIZE / 2;
/** Faixa junto à borda em que o ponto some/aparece aos poucos antes de dar a volta. */
const EDGE_FADE = 18;
const LINK_DISTANCE = 35;
const MAX_LINKS = 4000;
const REPULSION_RADIUS = 40;
/** Ângulo do cubo no quadro estático (prefers-reduced-motion). */
const STATIC_TIME = 5;

@Component({
  selector: 'app-hero-cube',
  standalone: true,
  templateUrl: './hero-cube.html',
  styleUrl: './hero-cube.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroCube implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly ngZone = inject(NgZone);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly loadingService = inject(LoadingService);

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private mouseFollowGroup?: THREE.Group;
  private instancedCube?: THREE.InstancedMesh;
  private voxels: Voxel[] = [];

  private points?: THREE.Points;
  private lines?: THREE.LineSegments;
  private pointPositions = new Float32Array(POINT_COUNT * 3);
  private pointVelocities = new Float32Array(POINT_COUNT * 3);
  private pointColors = new Float32Array(POINT_COUNT * 3);
  private pointFade = new Float32Array(POINT_COUNT);
  private linePositions = new Float32Array(MAX_LINKS * 6);
  private lineColors = new Float32Array(MAX_LINKS * 6);

  // Objetos reutilizados a cada quadro (sem alocação no loop).
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private readonly pointerTarget = new THREE.Vector3();
  private readonly tmpPosition = new THREE.Vector3();
  private readonly tmpEuler = new THREE.Euler();
  private readonly tmpQuaternion = new THREE.Quaternion();
  private readonly tmpMatrix = new THREE.Matrix4();
  private readonly unitScale = new THREE.Vector3(1, 1, 1);

  private readonly mouse = new THREE.Vector2();
  private pointerActive = false;
  private scrollPercent = 0;

  /** Tempo contínuo da animação (s): só avança enquanto a cena está rodando. */
  private time = 0;
  private lastFrame = 0;
  private rafId: number | undefined;
  private inView = false;
  private reducedMotion = false;
  private destroyed = false;

  private intersectionObserver?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private motionQuery?: MediaQueryList;
  private readonly cleanups: (() => void)[] = [];

  constructor() {
    this.loadingService.show();
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      try {
        this.initThree();
        this.bindEvents();
      } catch (error) {
        // Sem WebGL (ou contexto negado): o herói fica com o fundo estático e o texto.
        console.warn('HeroCube: cena 3D indisponível.', error);
        this.disposeThree();
      } finally {
        this.ngZone.run(() => this.loadingService.hide());
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stop();
    this.intersectionObserver?.disconnect();
    this.resizeObserver?.disconnect();
    this.cleanups.forEach((cleanup) => cleanup());
    this.disposeThree();
  }

  // ───────────── Montagem da cena ─────────────

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const { width, height } = this.hostSize();
    const dpr = this.pixelRatio();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 20;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      // Em telas de alta densidade o próprio DPR já suaviza as bordas.
      antialias: dpr < 2,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const pointLight = new THREE.PointLight(0xffa500, 3.0, 150);
    pointLight.position.set(10, 15, 20);
    this.scene.add(pointLight);
    // Luz direcional suave: dá volume às faces sem clarear o cubo atrás do texto.
    const keyLight = new THREE.DirectionalLight(0xffd9a8, 1.1);
    keyLight.position.set(6, 12, 9);
    this.scene.add(keyLight);

    // Grupo que acompanha o mouse; fica abaixo do centro para não disputar com o título.
    this.mouseFollowGroup = new THREE.Group();
    this.mouseFollowGroup.position.y = -4.5;
    this.scene.add(this.mouseFollowGroup);

    this.createClusteredCube();
    this.createConstellation();
    this.applyLayout(width, height);
  }

  private createClusteredCube(): void {
    const gridSize = 5;
    const spacing = 1.2;
    const halfGrid = (gridSize - 1) / 2;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff8c00, metalness: 0.7, roughness: 0.3 });

    this.instancedCube = new THREE.InstancedMesh(geometry, material, gridSize ** 3);
    this.instancedCube.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Os voxels voam para longe da caixa original: sem descarte por frustum.
    this.instancedCube.frustumCulled = false;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        for (let k = 0; k < gridSize; k++) {
          const origin = new THREE.Vector3((i - halfGrid) * spacing, (j - halfGrid) * spacing, (k - halfGrid) * spacing);

          // Tendência diagonal (direita, cima, um pouco para frente) com variação por voxel.
          const direction = new THREE.Vector3(
            1.0 + Math.random() * 0.6 - 0.2,
            1.2 + Math.random() * 0.5 - 0.1,
            0.3 + Math.random() * 0.6 - 0.3,
          ).normalize();

          // Solta primeiro o topo e a direita; a base fica por último.
          const heightFactor = (gridSize - 1 - j) / (gridSize - 1);
          const rightFactor = (gridSize - 1 - i) / (gridSize - 1);
          const depthFactor = (gridSize - 1 - k) / (gridSize - 1);
          const delay = heightFactor * 0.6 + rightFactor * 0.25 + depthFactor * 0.15 + Math.random() * 0.3;

          this.voxels.push({
            origin,
            direction,
            delay,
            startOffset: Math.random() * 0.15,
            // Distância e giro sorteados uma vez: sorteá-los a cada quadro fazia os voxels tremerem.
            distance: 50 + Math.random() * 20,
            spin: new THREE.Vector3(
              (Math.random() - 0.5) * Math.PI * 3,
              (Math.random() - 0.5) * Math.PI * 4,
              (Math.random() - 0.5) * Math.PI * 2,
            ),
            progress: 0,
          });
        }
      }
    }
    this.writeVoxelMatrices();
    this.mouseFollowGroup!.add(this.instancedCube);
  }

  private createConstellation(): void {
    for (let i = 0; i < POINT_COUNT; i++) {
      const o = i * 3;
      this.pointPositions[o] = (Math.random() - 0.5) * AREA_SIZE;
      this.pointPositions[o + 1] = (Math.random() - 0.5) * AREA_SIZE;
      this.pointPositions[o + 2] = (Math.random() - 0.5) * AREA_SIZE;
      // Unidades por segundo (o loop usa o tempo real, não a contagem de quadros).
      this.pointVelocities[o] = (Math.random() - 0.5) * 6;
      this.pointVelocities[o + 1] = (Math.random() - 0.5) * 6;
      this.pointVelocities[o + 2] = (Math.random() - 0.5) * 6;
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', dynamicAttribute(this.pointPositions));
    pointsGeometry.setAttribute('color', dynamicAttribute(this.pointColors));
    // Mistura aditiva + cor por vértice: um ponto com cor zero some por completo,
    // o que permite apagar e acender os pontos aos poucos perto das bordas.
    const pointsMaterial = new THREE.PointsMaterial({
      color: 0x4f607b,
      size: 2,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.points = new THREE.Points(pointsGeometry, pointsMaterial);
    this.points.frustumCulled = false;
    this.scene!.add(this.points);

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', dynamicAttribute(this.linePositions));
    lineGeometry.setAttribute('color', dynamicAttribute(this.lineColors));
    lineGeometry.setDrawRange(0, 0);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x4a6088,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    this.lines.frustumCulled = false;
    this.scene!.add(this.lines);

    this.updateConstellation(0);
  }

  // ───────────── Eventos, visibilidade e tamanho ─────────────

  private bindEvents(): void {
    const hostEl = this.host.nativeElement;

    this.listen(window, 'scroll', () => this.onScroll());
    this.listen(window, 'pointermove', (event) => this.onPointerMove(event as PointerEvent));
    this.listen(window, 'touchmove', (event) => {
      const touch = (event as TouchEvent).touches[0];
      if (touch) this.setPointer(touch.clientX, touch.clientY);
    });
    // Sem dedo na tela não há ponteiro: a constelação volta a derivar livre.
    this.listen(window, 'touchend', () => (this.pointerActive = false));
    this.listen(document, 'visibilitychange', () => this.syncRunning());

    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = this.motionQuery.matches;
    const onMotionChange = () => {
      this.reducedMotion = this.motionQuery!.matches;
      this.syncRunning();
    };
    this.motionQuery.addEventListener('change', onMotionChange);
    this.cleanups.push(() => this.motionQuery?.removeEventListener('change', onMotionChange));

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(hostEl);

    this.intersectionObserver = new IntersectionObserver((entries) => {
      this.inView = entries[entries.length - 1].isIntersecting;
      this.syncRunning();
    });
    this.intersectionObserver.observe(hostEl);

    this.onScroll();
  }

  private listen(target: EventTarget, type: string, handler: (event: Event) => void): void {
    target.addEventListener(type, handler, { passive: true });
    this.cleanups.push(() => target.removeEventListener(type, handler));
  }

  private onScroll(): void {
    const heroHeight = this.host.nativeElement.clientHeight || window.innerHeight;
    this.scrollPercent = Math.min(Math.max(window.scrollY / (heroHeight * 0.8), 0), 1);
  }

  private onPointerMove(event: PointerEvent): void {
    if (event.pointerType === 'touch') return; // o toque é tratado em touchmove
    this.setPointer(event.clientX, event.clientY);
  }

  private setPointer(clientX: number, clientY: number): void {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    this.pointerActive = true;
  }

  private onResize(): void {
    if (!this.camera || !this.renderer) return;
    const { width, height } = this.hostSize();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(width, height, false);
    this.applyLayout(width, height);
    // setSize limpa o canvas: redesenha já (no modo estático não há loop para isso).
    if (this.rafId === undefined) this.renderStill();
    else this.renderer.render(this.scene!, this.camera);
  }

  /** Em telas estreitas o cubo encolhe um pouco para caber com folga na largura. */
  private applyLayout(width: number, height: number): void {
    const aspect = width / height;
    const scale = Math.min(1, Math.max(0.7, aspect / 0.45));
    this.mouseFollowGroup?.scale.setScalar(scale);
  }

  private hostSize(): { width: number; height: number } {
    const el = this.host.nativeElement;
    return { width: Math.max(el.clientWidth, 1), height: Math.max(el.clientHeight, 1) };
  }

  private pixelRatio(): number {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  /** Liga o loop só quando a cena está visível, a aba ativa e o movimento permitido. */
  private syncRunning(): void {
    if (this.destroyed || !this.renderer) return;
    const shouldRun = this.inView && !document.hidden && !this.reducedMotion;
    if (shouldRun) {
      this.start();
    } else {
      this.stop();
      if (this.inView && this.reducedMotion) this.renderStill();
    }
  }

  private start(): void {
    if (this.rafId !== undefined) return;
    // Zera a referência de tempo: ao voltar da pausa a animação continua de onde parou, sem salto.
    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  private stop(): void {
    if (this.rafId === undefined) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = undefined;
  }

  // ───────────── Loop ─────────────

  private readonly frame = (now: number): void => {
    this.rafId = requestAnimationFrame(this.frame);
    // dt limitado: um quadro atrasado não vira um salto na animação.
    const dt = Math.min(Math.max((now - this.lastFrame) / 1000, 0), 0.05);
    this.lastFrame = now;
    this.time += dt;
    this.update(dt);
    this.renderer!.render(this.scene!, this.camera!);
    this.markReady();
  };

  /** Quadro único e parado (prefers-reduced-motion): cubo montado, sem deriva. */
  private renderStill(): void {
    if (!this.renderer || !this.scene || !this.camera || !this.instancedCube) return;
    this.instancedCube.rotation.set(STATIC_TIME * 0.06, STATIC_TIME * 0.12, 0);
    this.mouseFollowGroup!.rotation.set(0, 0, 0);
    for (const voxel of this.voxels) voxel.progress = 0;
    this.writeVoxelMatrices();
    this.updateConstellation(0);
    this.renderer.render(this.scene, this.camera);
    this.markReady();
  }

  private markReady(): void {
    this.canvasRef.nativeElement.classList.add('is-ready');
  }

  private update(dt: number): void {
    const cube = this.instancedCube!;
    const group = this.mouseFollowGroup!;

    // Rotação em função do tempo contínuo: não há ponto de reinício no loop.
    cube.rotation.y = this.time * 0.12;
    cube.rotation.x = this.time * 0.06;

    // Suavização exponencial independente da taxa de quadros.
    const follow = 1 - Math.exp(-dt * 3);
    group.rotation.y += (this.mouse.x * 0.2 - group.rotation.y) * follow;
    group.rotation.x += (-this.mouse.y * 0.2 - group.rotation.x) * follow;

    this.updateConstellation(dt);

    // Paralaxe sutil da constelação com o mouse.
    const points = this.points!;
    points.rotation.y += (this.mouse.x * 0.03 - points.rotation.y) * follow;
    points.rotation.x += (-this.mouse.y * 0.03 - points.rotation.x) * follow;
    this.lines!.rotation.copy(points.rotation);

    this.updateVoxels(dt);
  }

  private updateVoxels(dt: number): void {
    const ease = 1 - Math.exp(-dt * 6);
    let moving = false;
    for (const voxel of this.voxels) {
      // Cada voxel só começa a se soltar quando o scroll passa do seu atraso.
      const adjusted = this.scrollPercent + voxel.startOffset;
      const target = adjusted > voxel.delay ? Math.min(1, (adjusted - voxel.delay) / (1 - voxel.delay + 0.3)) : 0;
      const delta = target - voxel.progress;
      if (Math.abs(delta) > 1e-4) {
        voxel.progress += delta * ease;
        moving = true;
      } else if (voxel.progress !== target) {
        voxel.progress = target;
        moving = true;
      }
    }
    if (moving) this.writeVoxelMatrices();
  }

  private writeVoxelMatrices(): void {
    const cube = this.instancedCube!;
    for (let i = 0; i < this.voxels.length; i++) {
      const voxel = this.voxels[i];
      const p = voxel.progress;
      const eased = p * p * (3 - 2 * p);
      this.tmpPosition.copy(voxel.direction).multiplyScalar(eased * voxel.distance).add(voxel.origin);
      // O giro acompanha o progresso: ao rolar de volta, o voxel reencaixa alinhado.
      this.tmpEuler.set(voxel.spin.x * p, voxel.spin.y * p, voxel.spin.z * p);
      this.tmpQuaternion.setFromEuler(this.tmpEuler);
      this.tmpMatrix.compose(this.tmpPosition, this.tmpQuaternion, this.unitScale);
      cube.setMatrixAt(i, this.tmpMatrix);
    }
    cube.instanceMatrix.needsUpdate = true;
  }

  private updateConstellation(dt: number): void {
    const positions = this.pointPositions;
    const velocities = this.pointVelocities;
    const fades = this.pointFade;

    let repel = false;
    if (dt > 0 && this.pointerActive && this.camera) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      repel = this.raycaster.ray.intersectPlane(this.pointerPlane, this.pointerTarget) !== null;
    }
    const target = this.pointerTarget;

    for (let i = 0; i < POINT_COUNT; i++) {
      const o = i * 3;
      let x = positions[o];
      let y = positions[o + 1];
      let z = positions[o + 2];

      if (repel) {
        const dx = x - target.x;
        const dy = y - target.y;
        const dz = z - target.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < REPULSION_RADIUS && dist > 1e-3) {
          const push = (((REPULSION_RADIUS - dist) / REPULSION_RADIUS) * 90 * dt) / dist;
          x += dx * push;
          y += dy * push;
          z += dz * push;
        }
      }

      x = wrap(x + velocities[o] * dt);
      y = wrap(y + velocities[o + 1] * dt);
      z = wrap(z + velocities[o + 2] * dt);
      positions[o] = x;
      positions[o + 1] = y;
      positions[o + 2] = z;

      // O ponto apaga ao chegar na borda e reacende do outro lado: a volta não aparece.
      const margin = HALF_AREA - Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
      const fade = smooth(margin / EDGE_FADE);
      fades[i] = fade;
      this.pointColors[o] = fade;
      this.pointColors[o + 1] = fade;
      this.pointColors[o + 2] = fade;
    }

    // Ligações: a intensidade cai com a distância até zero no limite, então
    // as linhas surgem e somem gradualmente em vez de piscar.
    const linePositions = this.linePositions;
    const lineColors = this.lineColors;
    const maxDistSq = LINK_DISTANCE * LINK_DISTANCE;
    let links = 0;
    outer: for (let i = 0; i < POINT_COUNT; i++) {
      const a = i * 3;
      const ax = positions[a];
      const ay = positions[a + 1];
      const az = positions[a + 2];
      for (let j = i + 1; j < POINT_COUNT; j++) {
        const b = j * 3;
        const dx = ax - positions[b];
        const dy = ay - positions[b + 1];
        const dz = az - positions[b + 2];
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq >= maxDistSq) continue;
        const strength = (1 - Math.sqrt(distSq) / LINK_DISTANCE) * fades[i] * fades[j];
        if (strength <= 0.01) continue;
        const o = links * 6;
        linePositions[o] = ax;
        linePositions[o + 1] = ay;
        linePositions[o + 2] = az;
        linePositions[o + 3] = positions[b];
        linePositions[o + 4] = positions[b + 1];
        linePositions[o + 5] = positions[b + 2];
        lineColors[o] = lineColors[o + 1] = lineColors[o + 2] = strength;
        lineColors[o + 3] = lineColors[o + 4] = lineColors[o + 5] = strength;
        if (++links >= MAX_LINKS) break outer;
      }
    }

    const pointsGeometry = this.points!.geometry;
    pointsGeometry.attributes['position'].needsUpdate = true;
    pointsGeometry.attributes['color'].needsUpdate = true;
    const lineGeometry = this.lines!.geometry;
    lineGeometry.attributes['position'].needsUpdate = true;
    lineGeometry.attributes['color'].needsUpdate = true;
    lineGeometry.setDrawRange(0, links * 2);
  }

  // ───────────── Limpeza ─────────────

  private disposeThree(): void {
    this.scene?.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
        object.geometry?.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      }
    });
    this.instancedCube?.dispose();
    this.renderer?.dispose();
    this.scene = undefined;
    this.renderer = undefined;
  }
}

function dynamicAttribute(array: Float32Array): THREE.BufferAttribute {
  const attribute = new THREE.BufferAttribute(array, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  return attribute;
}

/** Mantém a coordenada dentro da área, dando a volta pela borda oposta. */
function wrap(value: number): number {
  if (value > HALF_AREA) return value - AREA_SIZE;
  if (value < -HALF_AREA) return value + AREA_SIZE;
  return value;
}

/** Smoothstep limitado a [0, 1]. */
function smooth(value: number): number {
  const t = Math.min(Math.max(value, 0), 1);
  return t * t * (3 - 2 * t);
}
