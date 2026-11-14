import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { Contact } from '../../components/contact/contact';
import { I18nService } from '../../i18n/i18n.service';
import { Cabecalho, I18N, SecaoId, TEXTOS } from './politica.i18n';

interface SecaoPolitica {
  id: SecaoId;
  numero: string;
  icone: string;
}

type Assunto = 'subjectRights' | 'subjectPrivacy' | 'subjectExercise' | 'subjectService';

const EMAIL = 'contato@unrender.dev';
/** Marcador `{mail:xxx}` nos textos → assunto do e-mail ao DPO. */
const ASSUNTO_DO_MARCADOR: Record<string, Assunto> = { privacy: 'subjectPrivacy', exercise: 'subjectExercise' };

@Component({
  selector: 'app-politica',
  standalone: true,
  imports: [CommonModule, RouterModule, Contact],
  templateUrl: './politica.html',
  styleUrl: './politica.scss',
})
export class Politica implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);

  readonly email = EMAIL;
  readonly versao = 'v2.4';
  private readonly dataAtualizacao = new Date(2026, 10, 5);
  readonly ultimaAtualizacao = computed(() => this.i18n.date(this.dataAtualizacao, { dateStyle: 'long' }));

  readonly secaoAtiva = signal<SecaoId>('identificacao');
  readonly copiadoFeedback = signal(false);
  /** Índice recolhível no celular (no desktop fica sempre aberto, via CSS). */
  readonly indiceAberto = signal(false);

  readonly secoes: readonly SecaoPolitica[] = [
    { id: 'identificacao', numero: '01', icone: 'fa-id-card' },
    { id: 'principios', numero: '02', icone: 'fa-shield-halved' },
    { id: 'dados-coletados', numero: '03', icone: 'fa-database' },
    { id: 'controlador-operador', numero: '04', icone: 'fa-network-wired' },
    { id: 'bases-legais', numero: '05', icone: 'fa-scale-balanced' },
    { id: 'seguranca', numero: '06', icone: 'fa-lock' },
    { id: 'compartilhamento', numero: '07', icone: 'fa-share-nodes' },
    { id: 'cookies', numero: '08', icone: 'fa-cookie-bite' },
    { id: 'direitos-titular', numero: '09', icone: 'fa-user-check' },
    { id: 'termos-uso', numero: '10', icone: 'fa-file-contract' },
    { id: 'contato-dpo', numero: '11', icone: 'fa-headset' },
  ];

  readonly iconesPrincipios = ['fa-bullseye', 'fa-filter', 'fa-eye', 'fa-shield-virus'];
  readonly iconesColeta = ['fa-comment-dots', 'fa-server', 'fa-briefcase'];
  readonly iconesSeguranca = ['fa-lock', 'fa-fingerprint', 'fa-database'];

  /** Texto do idioma atual, já com os marcadores `{mail:…}` trocados pelo link do DPO. */
  readonly c = computed(() => this.resolver(this.i18n.pick(TEXTOS)));

  private fragmentSub?: Subscription;
  private observer?: IntersectionObserver;
  private readonly visiveis = new Set<string>();
  private copiadoTimer?: ReturnType<typeof setTimeout>;
  private scrollTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.fragmentSub = this.route.fragment.subscribe((fragment) => {
      if (this.ehSecao(fragment)) {
        this.secaoAtiva.set(fragment);
        clearTimeout(this.scrollTimer);
        this.scrollTimer = setTimeout(() => this.rolarParaSecao(fragment), 150);
      }
    });
  }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    // Destaca no índice a seção que está na faixa de leitura (terço superior da tela).
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) this.visiveis.add(entry.target.id);
            else this.visiveis.delete(entry.target.id);
          }
          const atual = this.secoes.find((s) => this.visiveis.has(s.id));
          if (atual && atual.id !== this.secaoAtiva()) this.zone.run(() => this.secaoAtiva.set(atual.id));
        },
        { rootMargin: '-15% 0px -65% 0px' },
      );
      this.host.nativeElement.querySelectorAll('section.pol-sec[id]').forEach((el) => this.observer!.observe(el));
    });
  }

  ngOnDestroy(): void {
    this.fragmentSub?.unsubscribe();
    this.observer?.disconnect();
    clearTimeout(this.copiadoTimer);
    clearTimeout(this.scrollTimer);
  }

  private ehSecao(id: string | null): id is SecaoId {
    return !!id && this.secoes.some((s) => s.id === id);
  }

  /** Cabeçalho de uma seção (o `ng-template` do cabeçalho recebe o id sem tipo). */
  cabecalhoDe(id: string): Cabecalho {
    return this.c().secoes[id as SecaoId];
  }

  mailto(assunto: Assunto): string {
    return `mailto:${EMAIL}?subject=${encodeURIComponent(this.t(assunto))}`;
  }

  private resolver<T>(valor: T): T {
    if (typeof valor === 'string') {
      return valor.replace(/\{mail:(\w+)\}/g, (marcador, chave: string) => {
        const assunto = ASSUNTO_DO_MARCADOR[chave];
        return assunto ? `<a href="${this.mailto(assunto)}">${EMAIL}</a>` : marcador;
      }) as T;
    }
    if (Array.isArray(valor)) return valor.map((v) => this.resolver(v)) as T;
    if (valor && typeof valor === 'object') {
      return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, this.resolver(v)])) as T;
    }
    return valor;
  }

  /** Clique no índice: rola até a seção e grava a âncora na URL (o link copiado aponta para ela). */
  irPara(id: SecaoId, event: Event): void {
    event.preventDefault();
    this.secaoAtiva.set(id);
    this.indiceAberto.set(false);
    this.location.replaceState(`${this.location.path(false)}#${id}`);
    // No celular o índice fecha e o conteúdo sobe: rola só depois desse novo layout.
    clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => this.rolarParaSecao(id), 0);
  }

  irParaTopo(event: Event): void {
    event.preventDefault();
    this.location.replaceState(this.location.path(false));
    window.scrollTo({ top: 0, behavior: this.comportamentoRolagem() });
  }

  rolarParaSecao(id: string): void {
    if (typeof document === 'undefined') return;
    document.getElementById(id)?.scrollIntoView({ behavior: this.comportamentoRolagem(), block: 'start' });
  }

  private comportamentoRolagem(): ScrollBehavior {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  alternarIndice(): void {
    this.indiceAberto.update((aberto) => !aberto);
  }

  imprimir(): void {
    if (typeof window !== 'undefined') window.print();
  }

  copiarLink(): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.copiadoFeedback.set(true);
      clearTimeout(this.copiadoTimer);
      this.copiadoTimer = setTimeout(() => this.copiadoFeedback.set(false), 2500);
    });
  }
}
