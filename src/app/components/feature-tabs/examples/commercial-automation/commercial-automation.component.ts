import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  IconDefinition,
  faBottleWater,
  faBurger,
  faCashRegister,
  faCheck,
  faCheese,
  faCircleNotch,
  faCookieBite,
  faDesktop,
  faHeadset,
  faLemon,
  faMinus,
  faMoneyBillWave,
  faMugHot,
  faPrint,
  faReceipt,
  faStore,
  faTrash,
  faWifi,
} from '@fortawesome/free-solid-svg-icons';
import { gsap } from 'gsap';
import { I18nService } from '../../../../i18n/i18n.service';
import { ProdutosPosModalService } from '../../../../services/produtos-pos-modal.service';
import { I18N } from './commercial-automation.component.i18n';

type ProdutoKey = 'cafe' | 'paoQueijo' | 'suco' | 'sanduiche' | 'brownie' | 'agua';
type Fase = 'livre' | 'imprimindo' | 'cortando';

interface Produto {
  key: ProdutoKey;
  price: number;
  icon: IconDefinition;
}

interface Linha {
  key: ProdutoKey;
  qty: number;
}

interface Recibo {
  id: number;
  numero: string;
  data: Date;
  linhas: (Linha & { subtotal: number })[];
  total: number;
}

const PRODUTOS: Produto[] = [
  { key: 'cafe', price: 5.5, icon: faMugHot },
  { key: 'paoQueijo', price: 4, icon: faCheese },
  { key: 'suco', price: 8, icon: faLemon },
  { key: 'sanduiche', price: 12.5, icon: faBurger },
  { key: 'brownie', price: 6, icon: faCookieBite },
  { key: 'agua', price: 3, icon: faBottleWater },
];
const PRECO = Object.fromEntries(PRODUTOS.map((p) => [p.key, p.price])) as Record<ProdutoKey, number>;

/** Pedidos que o modo vitrine registra sozinho, em rodízio. */
const ROTEIROS: ProdutoKey[][] = [
  ['cafe', 'paoQueijo', 'cafe'],
  ['suco', 'sanduiche'],
  ['agua', 'brownie', 'cafe', 'paoQueijo'],
  ['sanduiche', 'suco', 'brownie'],
];

/**
 * A cena da impressora é desenhada em 300×350 px "de projeto" e escalada inteira
 * (ResizeObserver → --ca-s). Por isso as distâncias abaixo são constantes.
 */
const CENA_LARGURA = 300;
const ESCALA_MAX = 1.15;
/** Da fenda até a bandeja de cupons: deslocamento e escala do cupom na pilha. */
const VOO = { dx: 144, dy: 106, escala: 0.58 };
/** Posição de cada cupom na pilha (0 = mais novo, na frente). */
const PILHA = [
  { x: 0, y: 0, r: -3 },
  { x: 3, y: -5, r: 3 },
  { x: -4, y: -9, r: -5 },
  { x: 4, y: -13, r: 5 },
];
/** Segundos sem interação até o modo vitrine reassumir. */
const OCIOSO_S = 8;

const ATALHOS_LOJA: { id: string; icon: IconDefinition }[] = [
  { id: 'impressora-termica-80mm', icon: faPrint },
  { id: 'impressora-bluetooth-58mm', icon: faWifi },
  { id: 'caixa-registradora-usb', icon: faCashRegister },
  { id: 'kit-pc-caixa-completo', icon: faDesktop },
  { id: 'kit-headsets-boost-usb', icon: faHeadset },
];

@Component({
  selector: 'app-commercial-automation',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './commercial-automation.component.html',
  styleUrls: ['./commercial-automation.component.scss'],
  host: {
    '(pointerdown)': 'interagiu()',
    '(keydown)': 'interagiu()',
  },
})
export class CommercialAutomationComponent implements AfterViewInit, OnDestroy {
  readonly posModal = inject(ProdutosPosModalService);
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly cenaWrap = viewChild<ElementRef<HTMLElement>>('cenaWrap');
  private readonly lamina = viewChild<ElementRef<HTMLElement>>('lamina');
  private readonly listaCarrinho = viewChild<ElementRef<HTMLElement>>('listaCarrinho');

  readonly faCashRegister = faCashRegister;
  readonly faMoneyBillWave = faMoneyBillWave;
  readonly faCircleNotch = faCircleNotch;
  readonly faCheck = faCheck;
  readonly faMinus = faMinus;
  readonly faTrash = faTrash;
  readonly faReceipt = faReceipt;
  readonly faStore = faStore;

  readonly produtos = PRODUTOS;
  readonly preco = PRECO;

  readonly agora = signal(new Date());
  readonly carrinho = signal<Linha[]>([]);
  readonly recibos = signal<Recibo[]>([]);
  readonly fase = signal<Fase>('livre');
  /** Modo vitrine ligado: a demo registra, cobra e imprime sozinha. */
  readonly vitrine = signal(false);
  /** Produto "tocado" agora (anel de toque no botão). */
  readonly toque = signal<ProdutoKey | null>(null);
  readonly pagarDestacado = signal(false);
  readonly limpando = signal(false);
  readonly acabouDePagar = signal(false);
  readonly impressos = signal(0);

  readonly total = computed(() => this.carrinho().reduce((soma, l) => soma + l.qty * PRECO[l.key], 0));
  readonly podePagar = computed(() => this.carrinho().length > 0 && this.fase() === 'livre' && !this.limpando());

  readonly status = computed(() => {
    if (this.fase() === 'imprimindo') return this.t('stImprimindo');
    if (this.fase() === 'cortando') return this.t('stCortando');
    return this.impressos() > 0 ? this.t('stPronto') : this.t('stPronta');
  });

  /** Atalhos da loja: nome e preço vêm do catálogo (idioma atual, preço ao vivo do SGA). */
  readonly atalhosLoja = computed(() =>
    ATALHOS_LOJA.flatMap((a) => {
      const produto = this.posModal.produtoPorId(a.id);
      return produto ? [{ ...a, produto }] : [];
    })
  );

  private readonly reduzir =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private seq = 40;
  /** Ids dos cupons na pilha, do mais novo para o mais antigo. */
  private pilha: number[] = [];
  /** Animações em curso (para pausar fora da tela e limpar no destroy). */
  private readonly anims = new Set<gsap.core.Animation>();
  private chamadaRoteiro: gsap.core.Tween | null = null;
  private fila: ProdutoKey[] = [];
  private indiceRoteiro = 0;

  private naTela = false;
  private usuarioAtivo = false;
  private pausado = false;
  private timerOcioso: ReturnType<typeof setTimeout> | null = null;
  private timerToque: ReturnType<typeof setTimeout> | null = null;
  private timerLimpar: ReturnType<typeof setTimeout> | null = null;
  private timerPago: ReturnType<typeof setTimeout> | null = null;
  private relogio: ReturnType<typeof setInterval> | null = null;
  private io: IntersectionObserver | null = null;
  private ro: ResizeObserver | null = null;
  private readonly aoMudarVisibilidade = () => this.avaliar();

  constructor() {
    // Com o modal de produtos aberto a demo fica escondida: não roda sozinha.
    // Abrir e fechar contam como interação (a vitrine só volta depois do tempo ocioso).
    let primeira = true;
    effect(() => {
      this.posModal.isOpen();
      untracked(() => {
        if (!primeira) this.interagiu();
        primeira = false;
      });
    });
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    this.zone.runOutsideAngular(() => {
      const wrap = this.cenaWrap()?.nativeElement;
      if (wrap && typeof ResizeObserver !== 'undefined') {
        let escalaAtual = '';
        this.ro = new ResizeObserver(([entrada]) => {
          const largura = entrada.contentRect.width;
          if (largura <= 0) return;
          const escala = Math.min(ESCALA_MAX, largura / CENA_LARGURA).toFixed(4);
          if (escala === escalaAtual) return;
          escalaAtual = escala;
          // A escala muda a altura do próprio elemento observado: escrever no próximo
          // quadro evita o aviso "ResizeObserver loop" do navegador.
          requestAnimationFrame(() => wrap.style.setProperty('--ca-s', escala));
        });
        this.ro.observe(wrap);
      }

      if (typeof IntersectionObserver !== 'undefined') {
        this.io = new IntersectionObserver(
          ([entrada]) => {
            this.naTela = entrada.isIntersecting;
            this.avaliar();
          },
          { threshold: 0.2 }
        );
        this.io.observe(this.host.nativeElement);
      } else {
        this.naTela = true;
        this.avaliar();
      }

      document.addEventListener('visibilitychange', this.aoMudarVisibilidade);
      this.relogio = setInterval(() => this.zone.run(() => this.agora.set(new Date())), 20_000);
    });
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
    this.ro?.disconnect();
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.aoMudarVisibilidade);
    for (const timer of [this.timerOcioso, this.timerToque, this.timerLimpar, this.timerPago]) {
      if (timer) clearTimeout(timer);
    }
    if (this.relogio) clearInterval(this.relogio);
    this.chamadaRoteiro?.kill();
    this.anims.forEach((a) => a.kill());
    this.anims.clear();
  }

  // ───────────── Carrinho ─────────────

  qtd(key: ProdutoKey): number {
    return this.carrinho().find((l) => l.key === key)?.qty ?? 0;
  }

  adicionar(key: ProdutoKey): void {
    // Se o carrinho anterior ainda está sumindo (pós-pagamento), conclui antes de somar.
    if (this.limpando()) this.concluirLimpeza();
    this.tocar(key);
    this.carrinho.update((linhas) => {
      const existe = linhas.some((l) => l.key === key);
      return existe ? linhas.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)) : [...linhas, { key, qty: 1 }];
    });
    this.aposMudarCarrinho(key);
  }

  remover(key: ProdutoKey): void {
    this.carrinho.update((linhas) =>
      linhas.flatMap((l) => (l.key !== key ? [l] : l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : []))
    );
  }

  pagar(): void {
    if (!this.podePagar()) return;
    const recibo: Recibo = {
      id: ++this.seq,
      numero: String(this.seq).padStart(4, '0'),
      data: new Date(),
      linhas: this.carrinho().map((l) => ({ ...l, subtotal: l.qty * PRECO[l.key] })),
      total: this.total(),
    };
    this.fase.set('imprimindo');
    this.acabouDePagar.set(false);
    this.recibos.update((lista) => [...lista, recibo]);
    this.iniciarLimpeza();
    // O nó do cupom precisa existir antes de a animação começar.
    this.cdr.detectChanges();
    this.zone.runOutsideAngular(() => this.imprimir(recibo.id));
  }

  /** Interação real do usuário: a vitrine cede o controle e só volta após um tempo ocioso. */
  interagiu(): void {
    this.usuarioAtivo = true;
    if (this.timerOcioso) clearTimeout(this.timerOcioso);
    this.zone.runOutsideAngular(() => {
      this.timerOcioso = setTimeout(() => {
        this.usuarioAtivo = false;
        this.avaliar();
      }, OCIOSO_S * 1000);
    });
    this.avaliar();
  }

  private tocar(key: ProdutoKey): void {
    this.toque.set(key);
    if (this.timerToque) clearTimeout(this.timerToque);
    this.timerToque = setTimeout(() => this.toque.set(null), 380);
  }

  private aposMudarCarrinho(key: ProdutoKey): void {
    // Depois do render: mostra a linha nova e dá um "pulso" na quantidade.
    requestAnimationFrame(() => {
      const lista = this.listaCarrinho()?.nativeElement;
      if (!lista) return;
      const linha = lista.querySelector<HTMLElement>(`[data-linha="${key}"]`);
      if (!linha) return;
      const topo = linha.offsetTop;
      if (topo < lista.scrollTop || topo + linha.offsetHeight > lista.scrollTop + lista.clientHeight) {
        lista.scrollTo({ top: topo, behavior: this.reduzir ? 'auto' : 'smooth' });
      }
      if (!this.reduzir) {
        linha
          .querySelector('.ca-line-qty')
          ?.animate([{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'ease-out' });
      }
    });
  }

  /** O pedido pago sai da tela com fade antes de o carrinho esvaziar (sem "piscar"). */
  private iniciarLimpeza(): void {
    this.limpando.set(true);
    if (this.timerLimpar) clearTimeout(this.timerLimpar);
    this.timerLimpar = setTimeout(() => this.concluirLimpeza(), this.reduzir ? 0 : 260);
  }

  private concluirLimpeza(): void {
    if (this.timerLimpar) clearTimeout(this.timerLimpar);
    this.timerLimpar = null;
    this.carrinho.set([]);
    this.limpando.set(false);
  }

  // ───────────── Impressora ─────────────

  private ticketDe(id: number): { clip: HTMLElement; ticket: HTMLElement } | null {
    const clip = this.host.nativeElement.querySelector<HTMLElement>(`[data-recibo="${id}"]`);
    const ticket = clip?.querySelector<HTMLElement>('.ca-ticket');
    return clip && ticket ? { clip, ticket } : null;
  }

  private rastrear<T extends gsap.core.Animation>(anim: T): T {
    this.anims.add(anim);
    anim.eventCallback('onComplete', () => {
      this.anims.delete(anim);
    });
    if (this.pausado) anim.pause();
    return anim;
  }

  /**
   * Ciclo de impressão, num único nó de DOM por cupom:
   * avanço linha a linha pela fenda → guilhotina → o cupom solto desliza até a pilha.
   */
  private imprimir(id: number): void {
    const alvo = this.ticketDe(id);
    if (!alvo) {
      this.zone.run(() => this.aposCorte());
      return;
    }
    const { clip, ticket } = alvo;
    const naPilha = { x: VOO.dx + PILHA[0].x, y: VOO.dy + PILHA[0].y, rotation: PILHA[0].r, scale: VOO.escala };

    if (this.reduzir) {
      // Sem movimento: o cupom já aparece impresso na pilha.
      clip.classList.add('is-free');
      gsap.set(ticket, { ...naPilha, transformOrigin: '50% 100%' });
      this.acomodarPilha(id);
      this.zone.run(() => this.aposCorte());
      return;
    }

    const altura = ticket.offsetHeight;
    const linhas = Array.from(ticket.querySelectorAll<HTMLElement>('.cl'));
    const lamina = this.lamina()?.nativeElement ?? null;
    gsap.set(ticket, { x: 0, y: altura, rotation: 0, scale: 1, transformOrigin: '50% 100%' });

    const tl = this.rastrear(gsap.timeline());
    tl.to({}, { duration: 0.3 }); // o motor "acorda": só o LED pisca
    // Avanço em passos curtos, uma linha por vez, como o motor de passo de uma térmica.
    for (const linha of linhas) {
      const separador = linha.classList.contains('cl-sep');
      tl.to(ticket, {
        y: altura - (linha.offsetTop + linha.offsetHeight),
        duration: separador ? 0.05 : 0.085,
        ease: 'power2.out',
      });
      tl.to({}, { duration: separador ? 0.02 : 0.06 });
    }
    tl.to(ticket, { y: 0, duration: 0.22, ease: 'power2.out' }); // margem final até a serrilha
    tl.to({}, { duration: 0.14 });
    tl.call(() => this.zone.run(() => this.fase.set('cortando')));
    if (lamina) tl.fromTo(lamina, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.16, ease: 'power3.in' });
    // A partir daqui o cupom está solto: sai o recorte da fenda.
    tl.call(() => clip.classList.add('is-free'));
    tl.to(ticket, { y: -6, rotation: -1.5, duration: 0.14, ease: 'power2.out' });
    if (lamina) tl.to(lamina, { opacity: 0, duration: 0.22, ease: 'power1.out' }, '<');
    tl.call(() => this.zone.run(() => this.aposCorte()));
    // Antecipação (sobe um pouco) e voo em arco até a bandeja, com acomodação no fim.
    tl.to(ticket, { y: -24, rotation: -4, duration: 0.28, ease: 'power2.out' });
    tl.addLabel('voo');
    tl.to(ticket, { x: naPilha.x, scale: naPilha.scale, duration: 0.8, ease: 'power2.inOut' }, 'voo');
    tl.to(ticket, { y: naPilha.y - 5, duration: 0.8, ease: 'power2.in' }, 'voo');
    tl.to(ticket, { rotation: naPilha.rotation + 4, duration: 0.8, ease: 'power1.inOut' }, 'voo');
    tl.call(() => this.acomodarPilha(id), undefined, 'voo+=0.3');
    tl.to(ticket, { y: naPilha.y, rotation: naPilha.rotation, duration: 0.4, ease: 'back.out(2.4)' });
  }

  /** Os cupons antigos recuam uma posição; o que passa do limite some com fade e sai do DOM. */
  private acomodarPilha(novoId: number): void {
    this.pilha.unshift(novoId);
    this.pilha.forEach((id, i) => {
      if (i === 0) return;
      const ticket = this.ticketDe(id)?.ticket;
      if (!ticket) return;
      if (i >= PILHA.length) {
        const remover = () => this.zone.run(() => this.recibos.update((lista) => lista.filter((r) => r.id !== id)));
        if (this.reduzir) {
          remover();
          return;
        }
        const saida = this.rastrear(gsap.to(ticket, { opacity: 0, y: '+=12', duration: 0.5, ease: 'power1.in' }));
        saida.eventCallback('onComplete', () => {
          this.anims.delete(saida);
          remover();
        });
        return;
      }
      const destino = { x: VOO.dx + PILHA[i].x, y: VOO.dy + PILHA[i].y, rotation: PILHA[i].r };
      if (this.reduzir) gsap.set(ticket, destino);
      else this.rastrear(gsap.to(ticket, { ...destino, duration: 0.55, ease: 'power2.out' }));
    });
    this.pilha.length = Math.min(this.pilha.length, PILHA.length);
  }

  /** Cupom cortado: a impressora está livre de novo (o voo até a pilha segue sozinho). */
  private aposCorte(): void {
    this.fase.set('livre');
    this.impressos.update((n) => n + 1);
    this.acabouDePagar.set(true);
    if (this.timerPago) clearTimeout(this.timerPago);
    this.timerPago = setTimeout(() => this.acabouDePagar.set(false), 1400);
    if (this.vitrine()) this.agendarRoteiro(2.4);
  }

  // ───────────── Modo vitrine ─────────────

  /** Liga, pausa ou desliga a demo automática conforme visibilidade e atividade do usuário. */
  private avaliar(): void {
    const visivel = this.naTela && !document.hidden;

    // Fora da tela (ou aba oculta) tudo pausa onde está e retoma do mesmo ponto.
    if (this.pausado !== !visivel) {
      this.pausado = !visivel;
      this.anims.forEach((a) => (this.pausado ? a.pause() : a.resume()));
      if (this.chamadaRoteiro) this.pausado ? this.chamadaRoteiro.pause() : this.chamadaRoteiro.resume();
    }

    const deveRodar = visivel && !this.reduzir && !this.usuarioAtivo && !this.posModal.isOpen();
    if (deveRodar === this.vitrine()) return;
    this.zone.run(() => {
      this.vitrine.set(deveRodar);
      if (deveRodar) {
        this.agendarRoteiro(1.2);
      } else {
        this.chamadaRoteiro?.kill();
        this.chamadaRoteiro = null;
        this.pagarDestacado.set(false);
        // O que a vitrine ainda ia registrar é descartado; o carrinho fica com o usuário.
        this.fila = [];
      }
    });
  }

  private agendarRoteiro(segundos: number, acao: () => void = () => this.passoRoteiro()): void {
    this.chamadaRoteiro?.kill();
    this.zone.runOutsideAngular(() => {
      this.chamadaRoteiro = gsap.delayedCall(segundos, () => {
        this.chamadaRoteiro = null;
        this.zone.run(acao);
      });
      if (this.pausado) this.chamadaRoteiro.pause();
    });
  }

  private passoRoteiro(): void {
    if (!this.vitrine()) return;
    if (this.fase() !== 'livre') {
      this.agendarRoteiro(0.4);
      return;
    }
    if (this.fila.length === 0 && this.carrinho().length === 0) {
      this.fila = [...ROTEIROS[this.indiceRoteiro++ % ROTEIROS.length]];
    }
    const proximo = this.fila.shift();
    if (proximo) {
      this.adicionar(proximo);
      this.agendarRoteiro(this.fila.length ? 0.85 : 1.05);
      return;
    }
    // Carrinho montado: "aperta" o botão de pagar e imprime.
    this.pagarDestacado.set(true);
    this.agendarRoteiro(0.45, () => {
      this.pagarDestacado.set(false);
      if (!this.vitrine()) return;
      this.pagar();
      // Se por algum motivo não imprimiu, tenta de novo em vez de travar o loop.
      if (this.fase() === 'livre') this.agendarRoteiro(0.6);
    });
  }
}
