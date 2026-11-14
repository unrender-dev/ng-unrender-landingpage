import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition,
  faCommentDots,
  faCamera,
  faQrcode,
  faCreditCard,
  faUtensils,
  faFileInvoiceDollar,
  faServer,
  faCube,
  faPlug,
} from '@fortawesome/free-solid-svg-icons';
import { I18nService } from '../../../../i18n/i18n.service';
import { I18N } from './api-integration.i18n';

type Key = keyof (typeof I18N)['pt'];

interface IntegrationNode {
  id: string;
  /** Nome próprio do serviço (não traduzido) ou chave de tradução para rótulos genéricos. */
  name?: string;
  nameKey?: Key;
  /** Ícone genérico da categoria — serviços de terceiros aparecem só como texto. */
  icon: IconDefinition;
  x: number;
  y: number;
  /** Atraso negativo da animação: espalha os pulsos ao longo do ciclo. */
  delay: number;
  connected: boolean;
  /** Pulso de "acabou de conectar". */
  burst: boolean;
}

const CENTER_X = 50;
const CENTER_Y = 48;
const RADIUS_X = 36;
const RADIUS_Y = 34;
/** Intervalo do modo vitrine e pausa após interação do usuário. */
const AUTO_STEP_MS = 2600;
const USER_PAUSE_MS = 8000;

@Component({
  selector: 'app-api-integration',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './api-integration.component.html',
  styleUrls: ['./api-integration.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiIntegrationComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly zone = inject(NgZone);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly faPlug = faPlug;
  readonly centerX = CENTER_X;
  readonly centerY = CENTER_Y;
  readonly protocols = ['REST API', 'GraphQL', 'Webhooks', 'WebSocket'];

  readonly integrations = signal<IntegrationNode[]>(
    layout([
      { id: 'whatsapp', name: 'WhatsApp', icon: faCommentDots, connected: true },
      { id: 'pix', name: 'PIX', icon: faQrcode, connected: true },
      { id: 'cards', nameKey: 'cards', icon: faCreditCard, connected: true },
      { id: 'ifood', name: 'iFood', icon: faUtensils, connected: false },
      { id: 'invoice', nameKey: 'invoice', icon: faFileInvoiceDollar, connected: true },
      { id: 'erp', nameKey: 'erp', icon: faServer, connected: true },
      { id: 'instagram', name: 'Instagram', icon: faCamera, connected: false },
      { id: 'custom', nameKey: 'customApi', icon: faCube, connected: true },
    ]),
  );

  readonly activeCount = computed(() => this.integrations().filter((n) => n.connected).length);
  /** Animações CSS pausadas (fora da tela ou aba oculta). */
  readonly paused = signal(false);

  private autoTimer: ReturnType<typeof setInterval> | null = null;
  private burstTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private observer: IntersectionObserver | null = null;
  private inView = true;
  private autoCursor = 0;
  /** Integrações desligadas, da mais antiga para a mais recente. */
  private offQueue: string[] = ['ifood', 'instagram'];
  private resumeAt = 0;
  private readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  private readonly onVisibility = () => this.syncRunning();

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver((entries) => {
        this.inView = entries.some((e) => e.isIntersecting);
        this.syncRunning();
      });
      this.observer.observe(this.host.nativeElement);
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    this.syncRunning();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.stopAuto();
    this.burstTimers.forEach((timer) => clearTimeout(timer));
    this.burstTimers.clear();
  }

  label(node: IntegrationNode): string {
    return node.nameKey ? this.t(node.nameKey) : (node.name ?? '');
  }

  ariaLabel(node: IntegrationNode): string {
    const params = {
      nome: this.label(node),
      estado: this.t(node.connected ? 'connected' : 'disconnected'),
    };
    return this.t(node.connected ? 'toggleOff' : 'toggleOn', params);
  }

  /** Clique do usuário: alterna a integração e segura o modo vitrine por alguns segundos. */
  toggleConnection(node: IntegrationNode): void {
    this.resumeAt = Date.now() + USER_PAUSE_MS;
    this.setConnected(node.id, !node.connected);
  }

  private setConnected(id: string, connected: boolean): void {
    this.offQueue = this.offQueue.filter((other) => other !== id);
    if (!connected) this.offQueue.push(id);
    this.integrations.update((list) => list.map((n) => (n.id === id ? { ...n, connected, burst: connected } : n)));
    const previous = this.burstTimers.get(id);
    if (previous) clearTimeout(previous);
    if (connected) {
      this.burstTimers.set(
        id,
        setTimeout(() => {
          this.burstTimers.delete(id);
          this.integrations.update((list) => list.map((n) => (n.id === id ? { ...n, burst: false } : n)));
        }, 900),
      );
    }
  }

  private syncRunning(): void {
    const visible = this.inView && !document.hidden;
    this.paused.set(!visible);
    if (visible && !this.reducedMotion) this.startAuto();
    else this.stopAuto();
  }

  /** Modo vitrine: alterna entre derrubar uma integração e religar a mais antiga, sem esvaziar o diagrama. */
  private startAuto(): void {
    if (this.autoTimer) return;
    this.zone.runOutsideAngular(() => {
      this.autoTimer = setInterval(() => {
        if (Date.now() < this.resumeAt) return;
        const list = this.integrations();
        const off = this.offQueue.filter((id) => list.some((n) => n.id === id && !n.connected));
        if (off.length >= 2) {
          this.zone.run(() => this.setConnected(off[0], true));
          return;
        }
        // Passo 3 em 8 nós: percorre todos antes de repetir.
        for (let i = 0; i < list.length; i++) {
          this.autoCursor = (this.autoCursor + 3) % list.length;
          const target = list[this.autoCursor];
          if (target.connected) {
            this.zone.run(() => this.setConnected(target.id, false));
            return;
          }
        }
      }, AUTO_STEP_MS);
    });
  }

  private stopAuto(): void {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
  }
}

function layout(
  nodes: Array<Pick<IntegrationNode, 'id' | 'name' | 'nameKey' | 'icon' | 'connected'>>,
): IntegrationNode[] {
  const count = nodes.length;
  return nodes.map((node, index) => {
    const angle = (-90 + index * (360 / count)) * (Math.PI / 180);
    return {
      ...node,
      x: +(CENTER_X + RADIUS_X * Math.cos(angle)).toFixed(2),
      y: +(CENTER_Y + RADIUS_Y * Math.sin(angle)).toFixed(2),
      // Passo irregular (5/8 do ciclo) para os pulsos não saírem em fila.
      delay: -(((index * 5) % count) / count),
      burst: false,
    };
  });
}
