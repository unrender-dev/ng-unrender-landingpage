import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild, computed, effect, inject, untracked } from '@angular/core';
import { NgClass } from '@angular/common';
import { I18nService } from '../../../../i18n/i18n.service';
import { I18N, SCENARIO_TEXT } from './whatsapp-ai-demo.i18n';

interface Card { icon: string; title: string; lines: string[]; }
interface Msg { id: string; from: 'client' | 'ai'; text: string; card?: Card; }
interface Action { icon: string; color: string; text: string; module: string; }
interface Step { msg: Msg; action?: Action; }
interface Scenario { id: string; label: string; icon: string; business: string; avatar: string; steps: Step[]; actions: Action[]; }

interface StepShape { from: 'client' | 'ai'; card?: string; action?: { icon: string; color: string }; }
interface ScenarioShape { id: string; icon: string; avatar: string; steps: StepShape[]; }

/** Parte que não depende de idioma: quem fala, ícones e cores. Os textos vêm do arquivo de i18n. */
const SHAPES: ScenarioShape[] = [
  {
    id: 'academia', icon: 'fa-solid fa-dumbbell', avatar: 'FT',
    steps: [
      { from: 'client', action: { icon: 'fa-solid fa-user-plus', color: '#6366f1' } },
      { from: 'ai' },
      { from: 'client' },
      { from: 'ai', card: 'fa-regular fa-calendar-check', action: { icon: 'fa-regular fa-calendar-check', color: '#f99126' } },
      { from: 'ai', action: { icon: 'fa-solid fa-bell', color: '#22c55e' } },
    ],
  },
  {
    id: 'clinica', icon: 'fa-solid fa-tooth', avatar: 'CS',
    steps: [
      { from: 'client', action: { icon: 'fa-solid fa-id-card', color: '#6366f1' } },
      { from: 'ai' },
      { from: 'client' },
      { from: 'ai', card: 'fa-solid fa-tooth', action: { icon: 'fa-regular fa-calendar-check', color: '#f99126' } },
      { from: 'ai', action: { icon: 'fa-solid fa-robot', color: '#22c55e' } },
    ],
  },
  {
    id: 'restaurante', icon: 'fa-solid fa-utensils', avatar: 'BV',
    steps: [
      { from: 'client', action: { icon: 'fa-solid fa-receipt', color: '#6366f1' } },
      { from: 'ai' },
      { from: 'client' },
      { from: 'ai', card: 'fa-solid fa-motorcycle', action: { icon: 'fa-solid fa-fire-burner', color: '#f99126' } },
      { from: 'ai', action: { icon: 'fa-solid fa-boxes-stacked', color: '#22c55e' } },
    ],
  },
];

interface QueueStep { wait: number; run: () => void; }

const FADE_MS = 380;

/** Simulação de atendimento no WhatsApp feito pela IA do CTRLB, com as ações que ela executa no sistema. */
@Component({
  selector: 'app-whatsapp-ai-demo',
  standalone: true,
  imports: [NgClass],
  template: `
  <div class="wa grid md:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] gap-5 items-start" [class.leaving]="leaving">
    <!-- celular -->
    <div class="phone mx-auto">
      <div class="screen">
        <div class="wa-top">
          <i class="fa-solid fa-arrow-left text-white/80 text-sm" aria-hidden="true"></i>
          <div class="who">
            <div class="avatar" aria-hidden="true">{{ sc.avatar }}</div>
            <div class="min-w-0">
              <div class="text-white text-[13px] font-semibold truncate">{{ sc.business }}</div>
              <div class="text-[10px] text-white/70">{{ typing ? t('typing') : t('online') }}</div>
            </div>
          </div>
          <i class="fa-solid fa-video text-white/80 ml-auto text-sm" aria-hidden="true"></i>
        </div>
        <div class="chat" #chat role="log" aria-live="off" [attr.aria-label]="t('chatLabel')">
          <div class="chat-inner">
            <div class="day">{{ t('today') }}</div>
            @for (m of shown; track m.id) {
            <div class="bubble" [ngClass]="m.from">
              {{ m.text }}
              @if (m.card) {
              <div class="card-in">
                <div class="flex items-center gap-2 font-bold text-[12px]"><i [class]="m.card.icon" class="text-[#f99126]" aria-hidden="true"></i>{{ m.card.title }}</div>
                @for (l of m.card.lines; track $index) { <div class="text-[11px] opacity-80">{{ l }}</div> }
              </div>
              }
              <span class="meta">{{ m.from === 'ai' ? t('ai') + ' · ' : '' }}{{ clock() }} @if (m.from === 'client') { <i class="fa-solid fa-check-double text-sky-400" aria-hidden="true"></i> }</span>
            </div>
            }
            @if (typing) {
            <div class="bubble ai typing-b" aria-hidden="true"><span></span><span></span><span></span></div>
            }
          </div>
        </div>
        <div class="wa-input" aria-hidden="true">
          <div class="fake-input">{{ t('message') }}</div>
          <div class="mic"><i class="fa-solid fa-microphone"></i></div>
        </div>
      </div>
    </div>

    <!-- bastidores -->
    <div class="backstage rounded-2xl p-4 md:p-5 min-w-0">
      <div class="flex flex-wrap gap-2 mb-4" role="group" [attr.aria-label]="t('scenarios')">
        @for (s of scenarios(); track s.id; let i = $index) {
        <button type="button" class="tab" [class.on]="i === tab" [attr.aria-pressed]="i === tab" (click)="play(i)">
          <i [class]="s.icon" aria-hidden="true"></i> {{ s.label }}
        </button>
        }
      </div>

      <div class="flex items-center gap-2 mb-1">
        <img src="ctrlb-logo.png" alt="CTRLB" class="w-6 h-6 bg-white rounded p-0.5 object-contain shrink-0" />
        <span class="text-white font-bold">{{ t('backstageTitle') }}</span>
      </div>
      <p class="text-white/60 text-xs mb-4">{{ t('backstageText') }}</p>

      <div class="actions">
        @for (a of sc.actions; track $index; let i = $index) {
        <div class="action" [class.ghost]="i >= done">
          @if (i < done) {
          <span class="a-ico a-in" [style.background]="a.color"><i [class]="a.icon" aria-hidden="true"></i></span>
          <div class="flex-1 min-w-0 a-in">
            <div class="text-white text-[13px] leading-snug">{{ a.text }}</div>
            <div class="text-[10px] uppercase tracking-wider text-white/40 font-bold mt-0.5">{{ t('module', { nome: a.module }) }}</div>
          </div>
          <i class="fa-solid fa-circle-check text-emerald-400 a-pop" aria-hidden="true"></i>
          } @else {
          <span class="a-ico"></span><div class="flex-1"><div class="sk"></div></div>
          }
        </div>
        }
      </div>

      <div class="grid grid-cols-3 gap-2 mt-4">
        <div class="stat"><strong>{{ t('seconds', { n: responseLabel() }) }}</strong><span>{{ t('firstReply') }}</span></div>
        <div class="stat"><strong>24/7</strong><span>{{ t('noQueue') }}</span></div>
        <div class="stat"><strong>0</strong><span>{{ t('teamClicks') }}</span></div>
      </div>
      <p class="demo-note"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> {{ t('demoNote') }}</p>
    </div>
  </div>
  `,
  styles: [`
    :host { display:block; min-width: 0; }
    .phone { width: 100%; max-width: 300px; background:#0b0b0f; border-radius: 38px; padding: 10px; box-shadow: 0 30px 60px rgba(16,5,28,.35), inset 0 0 0 2px #2a2a33; }
    .screen { border-radius: 30px; overflow:hidden; background:#efeae2; height: 500px; display:flex; flex-direction:column; }
    .wa-top { background:#075e54; display:flex; align-items:center; gap:10px; padding: 26px 12px 10px; }
    .who { display:flex; align-items:center; gap:10px; min-width:0; }
    .avatar { width:32px; height:32px; border-radius:50%; background:#f99126; color:#10051c; font-weight:800; font-size:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .chat { flex:1; overflow-y:auto; padding: 10px; scroll-behavior:smooth; overscroll-behavior: contain; scrollbar-width: none;
      background-image: radial-gradient(rgba(0,0,0,.035) 1px, transparent 1px); background-size: 14px 14px; }
    .chat::-webkit-scrollbar { width: 0; }
    .chat-inner { display:flex; flex-direction:column; gap:6px; min-height: 100%; }
    /* fim de cada conversa: o conteúdo sai com fade antes de a próxima começar */
    .chat-inner, .actions, .who { transition: opacity .35s ease, transform .35s ease; }
    .wa.leaving .chat-inner, .wa.leaving .actions, .wa.leaving .who { opacity: 0; transform: translateY(-6px); }
    .day { align-self:center; font-size:10px; text-transform: uppercase; background:#fff; color:#667; padding: 2px 8px; border-radius:6px; margin-bottom:4px; }
    .bubble { max-width: 84%; font-size: 12.5px; line-height:1.35; padding: 6px 8px 16px; border-radius: 9px; position:relative; box-shadow: 0 1px 1px rgba(0,0,0,.08); animation: waIn .32s cubic-bezier(.2,.9,.3,1.2) both; color:#111; overflow-wrap: anywhere; }
    .bubble.client { align-self:flex-end; background:#d9fdd3; border-top-right-radius: 2px; transform-origin: 100% 100%; }
    .bubble.ai { align-self:flex-start; background:#fff; border-top-left-radius: 2px; transform-origin: 0 100%; }
    .meta { position:absolute; right:7px; bottom:3px; font-size: 9px; color:#8696a0; display:flex; gap:3px; align-items:center; white-space: nowrap; }
    @keyframes waIn { from { opacity:0; transform: translateY(8px) scale(.94);} to { opacity:1; transform:none; } }
    .card-in { margin-top:6px; background:#10051c; color:#fff; border-radius:8px; padding:8px 10px; }
    .typing-b { padding: 10px 12px; display:flex; gap:4px; }
    .typing-b span { width:6px; height:6px; border-radius:50%; background:#9aa5ad; animation: waDot 1.2s ease-in-out infinite; }
    .typing-b span:nth-child(2) { animation-delay: .15s; } .typing-b span:nth-child(3) { animation-delay: .3s; }
    @keyframes waDot { 0%,60%,100% { transform: translateY(0); opacity:.5;} 30% { transform: translateY(-4px); opacity:1; } }
    .wa-input { display:flex; gap:6px; padding: 8px; background:#efeae2; }
    .fake-input { flex:1; min-width:0; background:#fff; border-radius:999px; padding: 8px 14px; font-size:12px; color:#9aa; }
    .mic { width:36px; height:36px; border-radius:50%; background:#00a884; color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }

    .backstage { background: radial-gradient(130% 120% at 100% 0%, #2a1146 0%, #10051c 60%); border:1px solid rgba(249,145,38,.25); }
    .tab { display:inline-flex; align-items:center; gap:6px; min-height: 36px; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; color: rgba(255,255,255,.7); background: rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.08); transition: color .2s, background-color .2s, border-color .2s, transform .15s; }
    .tab:hover { color:#fff; background: rgba(255,255,255,.12); }
    .tab:active { transform: scale(.96); }
    .tab.on { background:#f99126; color:#10051c; border-color:#f99126; }
    .tab:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    @media (pointer: coarse) { .tab { min-height: 44px; } }
    .actions { display:flex; flex-direction:column; gap:8px; }
    .action { display:flex; align-items:center; gap:10px; min-height: 54px; padding:10px 12px; border-radius: 12px; background: rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.07); transition: opacity .4s ease; }
    .action.ghost { opacity:.35; }
    .a-in { animation: waAct .5s cubic-bezier(.2,1.2,.4,1) both; }
    @keyframes waAct { from { opacity:0; transform: translateX(-14px);} to { opacity:1; transform:none; } }
    .a-pop { animation: waPop .5s cubic-bezier(.2,1.6,.4,1) .15s both; }
    @keyframes waPop { from { opacity:0; transform: scale(.3);} to { opacity:1; transform:none; } }
    .a-ico { width: 30px; height: 30px; border-radius: 9px; color:#fff; display:flex; align-items:center; justify-content:center; font-size: 13px; flex-shrink:0; background: rgba(255,255,255,.1); }
    .sk { height: 10px; width: 70%; border-radius: 6px; background: linear-gradient(90deg, rgba(255,255,255,.08), rgba(255,255,255,.18), rgba(255,255,255,.08)); background-size: 200% 100%; animation: waSk 1.4s linear infinite; }
    @keyframes waSk { from { background-position: 200% 0; } to { background-position: -200% 0; } }
    .stat { background: rgba(255,255,255,.05); border-radius: 10px; padding: 8px; text-align:center; min-width: 0; }
    .stat strong { display:block; color:#f99126; font-size: 16px; }
    .stat span { display:block; color: rgba(255,255,255,.55); font-size: 10px; line-height: 1.25; overflow-wrap: anywhere; }
    .demo-note { margin: 12px 0 0; font-size: 11px; color: rgba(255,255,255,.45); }
    @media (prefers-reduced-motion: reduce) {
      .bubble, .a-in, .a-pop, .sk, .typing-b span { animation: none; }
      .chat-inner, .actions, .who, .action { transition: none; }
      .chat { scroll-behavior: auto; }
    }
  `],
})
export class WhatsappAiDemoComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chat') chat?: ElementRef<HTMLElement>;

  private readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  readonly t = this.i18n.scope(I18N);

  /** Cenários montados no idioma atual (esqueleto + textos). */
  readonly scenarios = computed<Scenario[]>(() => {
    const texts = this.i18n.pick(SCENARIO_TEXT)(v => this.i18n.money(v));
    return SHAPES.map((shape, si) => {
      const tx = texts[si];
      const steps: Step[] = shape.steps.map((st, i) => {
        const s = tx.steps[i];
        return {
          msg: { id: `${shape.id}-${i}`, from: st.from, text: s.text, card: st.card && s.card ? { icon: st.card, ...s.card } : undefined },
          action: st.action && s.action ? { ...st.action, ...s.action } : undefined,
        };
      });
      return { id: shape.id, icon: shape.icon, avatar: shape.avatar, label: tx.label, business: tx.business, steps, actions: steps.filter(s => s.action).map(s => s.action!) };
    });
  });

  /** aba destacada (troca na hora do clique) */
  tab = 0;
  /** cenário cujo conteúdo está na tela (troca só depois do fade de saída) */
  sIndex = 0;
  shown: Msg[] = [];
  done = 0;
  typing = false;
  leaving = false;

  private responseTime = 2;
  private readonly startedAt = new Date();
  private queue: QueueStep[] = [];
  private qi = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private swapTimer: ReturnType<typeof setTimeout> | undefined;
  private scrollTimer: ReturnType<typeof setTimeout> | undefined;
  private visible = false;
  private started = false;
  private reduced = false;
  private observer?: IntersectionObserver;

  constructor() {
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // As mensagens já exibidas são texto do idioma antigo: ao trocar de idioma a conversa
    // sai com fade e recomeça do início já traduzida.
    effect(() => {
      this.i18n.lang();
      untracked(() => { if (this.started) { this.play(this.tab); this.cdr.markForCheck(); } });
    });
  }

  get sc(): Scenario { return this.scenarios()[this.sIndex]; }
  clock(): string { return this.i18n.date(this.startedAt, { hour: 'numeric', minute: '2-digit' }); }
  responseLabel(): string { return this.i18n.number(this.responseTime, { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') { this.visible = true; this.begin(); return; }
    this.observer = new IntersectionObserver(es => {
      const v = es.some(e => e.isIntersecting);
      if (v === this.visible) return;
      this.visible = v;
      // fora da tela a conversa só pausa; ao voltar, continua de onde parou
      this.zone.run(() => {
        if (v) { if (this.started) this.next(); else this.begin(); }
        else clearTimeout(this.timer);
      });
    }, { threshold: 0.3 });
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    clearTimeout(this.swapTimer);
    clearTimeout(this.scrollTimer);
    this.observer?.disconnect();
  }

  play(i: number) {
    this.started = true;
    this.tab = i;
    clearTimeout(this.timer);
    clearTimeout(this.swapTimer);
    this.queue = [];
    this.qi = 0;

    if (this.reduced) {
      // sem animação: a conversa inteira aparece de uma vez e não avança sozinha
      const sc = this.scenarios()[i];
      this.sIndex = i;
      this.typing = false;
      this.shown = sc.steps.map(s => s.msg);
      this.done = sc.actions.length;
      return;
    }

    const swap = () => {
      this.sIndex = i;
      this.shown = [];
      this.done = 0;
      this.typing = false;
      this.leaving = false;
      this.responseTime = 1 + Math.random() * 2;
      const el = this.chat?.nativeElement;
      if (el) el.scrollTop = 0;
      this.buildQueue();
      this.next();
    };
    if (this.shown.length || this.done || this.typing) {
      this.leaving = true;
      this.swapTimer = setTimeout(() => { swap(); this.cdr.markForCheck(); }, FADE_MS);
    } else {
      swap();
    }
  }

  private begin() {
    this.play(this.tab);
    this.cdr.detectChanges();
  }

  private buildQueue() {
    const sc = this.sc;
    const q: QueueStep[] = [];
    let wait = 700;
    for (const step of sc.steps) {
      if (step.msg.from === 'ai') {
        q.push({ wait, run: () => { this.typing = true; this.scroll(); } });
        wait = 1300 + Math.min(1400, step.msg.text.length * 12);
      }
      q.push({ wait, run: () => { this.typing = false; this.shown = [...this.shown, step.msg]; this.scroll(); } });
      if (step.action) {
        q.push({ wait: 500, run: () => { this.done++; } });
        wait = step.msg.from === 'client' ? 400 : 800;
      } else {
        wait = step.msg.from === 'client' ? 900 : 1300;
      }
    }
    q.push({ wait: wait + 3800, run: () => this.play((this.sIndex + 1) % SHAPES.length) });
    this.queue = q;
    this.qi = 0;
  }

  /** Agenda o próximo passo da conversa (um timer por vez: pausar é só cancelá-lo). */
  private next() {
    clearTimeout(this.timer);
    const step = this.queue[this.qi];
    if (!step || !this.visible) return;
    this.timer = setTimeout(() => {
      this.qi++;
      step.run();
      this.cdr.markForCheck();
      this.next();
    }, step.wait);
  }

  private scroll() {
    clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => {
      const el = this.chat?.nativeElement;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 30);
  }
}
