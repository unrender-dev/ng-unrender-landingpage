import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Observable, Subscription } from 'rxjs';
import { ChatbotService } from '../../services/chatbotservice';
import { I18nService } from '../../i18n/i18n.service';
import { I18N } from './chat-widget.i18n';

type Key = keyof (typeof I18N)['pt'];
type ErrorKey = Extract<Key, 'errorGeneric' | 'errorOffline'>;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessage extends Message {
  id: number;
  /** HTML já convertido do markdown da resposta. */
  html?: SafeHtml;
  /** Resposta ainda chegando: mostra o indicador de "digitando". */
  pending?: boolean;
  /** Erro traduzido na hora de exibir (acompanha a troca de idioma). */
  errorKey?: ErrorKey;
  /** Pergunta cuja resposta falhou: fica na tela, mas não entra no histórico enviado ao modelo. */
  failed?: boolean;
}

/** Tempo mínimo do indicador de "digitando", para ele não piscar em respostas instantâneas. */
const MIN_TYPING_MS = 650;

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cw" [attr.aria-label]="t('conversation')">
      <header class="cw-head">
        <span class="cw-avatar" aria-hidden="true"><i class="fa-solid fa-robot"></i></span>
        <div class="cw-id">
          <strong>{{ t('name') }}</strong>
          <span><span class="cw-online" aria-hidden="true"></span>{{ t('status') }}</span>
        </div>
        <button
          type="button"
          class="cw-icon-btn"
          [class.is-hidden]="messages().length === 0"
          [disabled]="messages().length === 0"
          (click)="clear()"
          [attr.aria-label]="t('clear')"
          [title]="t('clear')">
          <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
        </button>
      </header>

      <div #thread class="cw-thread" role="log" aria-live="polite" tabindex="0" [attr.aria-label]="t('conversation')">
        <div class="cw-row cw-row-assistant">
          <div class="cw-bubble cw-assistant">{{ t('welcome') }}</div>
        </div>

        @for (m of messages(); track m.id; let last = $last) {
          <div class="cw-row" [class.cw-row-user]="m.role === 'user'" [class.cw-row-assistant]="m.role === 'assistant'">
            <div
              class="cw-bubble"
              [class.cw-user]="m.role === 'user'"
              [class.cw-assistant]="m.role === 'assistant'"
              [class.cw-error]="!!m.errorKey">
              @if (m.pending) {
                <span class="cw-typing" role="status" [attr.aria-label]="t('typing')">
                  <span></span><span></span><span></span>
                </span>
              } @else if (m.errorKey) {
                <p class="cw-error-text">
                  <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                  <span>{{ t(m.errorKey) }}</span>
                </p>
                @if (last) {
                  <button type="button" class="cw-retry" (click)="retry()">
                    <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                    {{ t('retry') }}
                  </button>
                }
              } @else if (m.role === 'assistant') {
                <div class="cw-md" [innerHTML]="m.html"></div>
              } @else {
                <span class="cw-sr">{{ t('you') }}: </span>{{ m.content }}
              }
            </div>
          </div>
        }
      </div>

      <!-- Sugestões: somem com transição (altura por grid) depois da primeira pergunta -->
      <div class="cw-suggestions" [class.is-hidden]="hasUserMessages()" [attr.inert]="hasUserMessages() ? '' : null">
        <div class="cw-suggestions-inner" role="group" [attr.aria-label]="t('suggestions')">
          @for (key of suggestionKeys; track key) {
            <button type="button" class="cw-chip" [disabled]="isLoading()" (click)="sendMessage(t(key))">
              {{ t(key) }}
            </button>
          }
        </div>
      </div>

      <form class="cw-input" (submit)="$event.preventDefault(); sendMessage()">
        <textarea
          #messageInput
          name="message"
          [(ngModel)]="currentMessage"
          (input)="autoGrow()"
          (keydown.enter)="onEnterKey($event)"
          [placeholder]="t('placeholder')"
          [attr.aria-label]="t('inputLabel')"
          [title]="t('enterHint')"
          rows="1"
          maxlength="2000"
          enterkeyhint="send"></textarea>
        <button
          type="submit"
          class="cw-send"
          [class.is-busy]="isLoading()"
          [disabled]="isLoading() || currentMessage.trim() === ''"
          [attr.aria-label]="t('send')"
          [title]="t('send')">
          <i class="fa-solid fa-paper-plane" aria-hidden="true"></i>
        </button>
      </form>
    </section>
  `,
  styles: [`
    :host {
      --cw-ink: var(--unrender-purple, #10051c);
      --cw-accent: var(--unrender-accent, #f99126);
      --cw-soft: #f1edf5;
      --cw-line: #e3dcea;
      --cw-muted: #5b5366;
      display: block;
      width: 100%;
      min-width: 0;
    }

    .cw {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 44rem;
      margin-inline: auto;
      background: #ffffff;
      border: 1px solid var(--cw-line);
      border-radius: 16px;
      overflow: hidden;
      color: var(--cw-ink);
      text-align: left;
    }

    /* Cabeçalho */
    .cw-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: var(--cw-ink);
      color: #ffffff;
    }

    .cw-avatar {
      flex: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--cw-accent);
      color: #1c0f02;
      font-size: 0.95rem;
    }

    .cw-id {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      line-height: 1.25;
    }

    .cw-id strong {
      font-size: 0.9375rem;
      font-weight: 700;
    }

    .cw-id > span {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.78);
    }

    .cw-online {
      flex: none;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #3ddc84;
    }

    .cw-icon-btn {
      flex: none;
      width: 44px;
      height: 44px;
      margin: -4px -6px -4px 0;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: #ffffff;
      cursor: pointer;
      transition: background-color 0.2s ease, opacity 0.25s ease, transform 0.2s ease;
    }

    .cw-icon-btn:hover { background: rgba(255, 255, 255, 0.12); }
    .cw-icon-btn:active { transform: rotate(-45deg); }
    .cw-icon-btn.is-hidden { opacity: 0; pointer-events: none; }

    /* Conversa */
    .cw-thread {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 200px;
      max-height: clamp(260px, 52vh, 440px);
      padding: 14px 12px;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      background: #fbfafc;
    }

    .cw-thread:focus-visible {
      outline: 2px solid var(--cw-accent);
      outline-offset: -2px;
    }

    .cw-row { display: flex; }
    .cw-row-user { justify-content: flex-end; }
    .cw-row-assistant { justify-content: flex-start; }

    .cw-bubble {
      max-width: min(85%, 34rem);
      min-width: 0;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 0.9375rem;
      line-height: 1.5;
      overflow-wrap: anywhere;
      animation: cw-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    .cw-user {
      background: var(--cw-ink);
      color: #ffffff;
      border-bottom-right-radius: 6px;
      transform-origin: bottom right;
      white-space: pre-wrap;
    }

    .cw-assistant {
      background: var(--cw-soft);
      color: var(--cw-ink);
      border-bottom-left-radius: 6px;
      transform-origin: bottom left;
    }

    .cw-error {
      background: #fdecec;
      color: #8c1d1d;
      border: 1px solid #f5c2c2;
    }

    .cw-error-text {
      margin: 0;
      display: flex;
      gap: 8px;
      align-items: baseline;
    }

    .cw-retry {
      margin-top: 8px;
      min-height: 44px;
      padding: 0 14px;
      border-radius: 10px;
      border: 1px solid #8c1d1d;
      background: #ffffff;
      color: #8c1d1d;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background-color 0.2s ease, transform 0.15s ease;
    }

    .cw-retry:hover { background: #fdf3f3; }
    .cw-retry:active { transform: scale(0.97); }

    @keyframes cw-in {
      from { opacity: 0; transform: translateY(8px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Indicador de "digitando": onda contínua (primeiro quadro = último) */
    .cw-typing {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 1.5em;
      padding: 0 2px;
    }

    .cw-typing span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--cw-ink);
      opacity: 0.35;
      animation: cw-wave 1.2s ease-in-out infinite;
    }

    .cw-typing span:nth-child(2) { animation-delay: 0.15s; }
    .cw-typing span:nth-child(3) { animation-delay: 0.3s; }

    @keyframes cw-wave {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
      30% { transform: translateY(-4px); opacity: 1; }
    }

    .cw-md { animation: cw-fade 0.35s ease both; }

    @keyframes cw-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .cw-sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    /* Sugestões */
    .cw-suggestions {
      display: grid;
      grid-template-rows: 1fr;
      opacity: 1;
      transition: grid-template-rows 0.35s ease, opacity 0.25s ease;
    }

    .cw-suggestions.is-hidden {
      grid-template-rows: 0fr;
      opacity: 0;
    }

    .cw-suggestions-inner {
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0 12px;
    }

    .cw-suggestions:not(.is-hidden) .cw-suggestions-inner { padding-top: 10px; }

    .cw-chip {
      min-height: 44px;
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid var(--cw-line);
      background: #ffffff;
      color: var(--cw-ink);
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.25;
      text-align: left;
      cursor: pointer;
      transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
    }

    .cw-chip:hover:not(:disabled) { background: var(--cw-soft); border-color: var(--cw-ink); }
    .cw-chip:active:not(:disabled) { transform: scale(0.97); }
    .cw-chip:disabled { opacity: 0.5; cursor: default; }

    /* Entrada */
    .cw-input {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 10px 12px 12px;
    }

    .cw-input textarea {
      flex: 1;
      min-width: 0;
      min-height: 48px;
      max-height: 120px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid var(--cw-line);
      background: #ffffff;
      color: var(--cw-ink);
      font: inherit;
      font-size: 1rem;
      line-height: 1.4;
      resize: none;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .cw-input textarea::placeholder {
      color: #7a7286;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cw-input textarea:focus {
      border-color: var(--cw-ink);
      box-shadow: 0 0 0 3px rgba(249, 145, 38, 0.35);
    }

    .cw-send {
      flex: none;
      width: 48px;
      height: 48px;
      border: none;
      border-radius: 50%;
      background: var(--cw-accent);
      color: #1c0f02;
      font-size: 1rem;
      cursor: pointer;
      display: grid;
      place-items: center;
      transition: background-color 0.2s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
    }

    .cw-send:hover:not(:disabled) { background: #ffa544; transform: translateY(-1px); }
    .cw-send:active:not(:disabled) { transform: scale(0.9); }
    .cw-send:disabled { opacity: 0.45; cursor: default; }
    .cw-send.is-busy i { animation: cw-send-busy 1.2s ease-in-out infinite; }

    @keyframes cw-send-busy {
      0%, 100% { transform: translate(0, 0); opacity: 1; }
      50% { transform: translate(2px, -2px); opacity: 0.5; }
    }

    :is(.cw-icon-btn, .cw-chip, .cw-send, .cw-retry):focus-visible {
      outline: 2px solid var(--cw-accent);
      outline-offset: 2px;
    }

    .cw-send:focus-visible { outline-color: var(--cw-ink); }

    /* Markdown da resposta: o HTML entra por innerHTML, fora do encapsulamento de estilos */
    :host ::ng-deep .cw-md > :first-child { margin-top: 0; }
    :host ::ng-deep .cw-md > :last-child { margin-bottom: 0; }
    :host ::ng-deep .cw-md p { margin: 0.5em 0; }
    :host ::ng-deep .cw-md strong { font-weight: 700; }
    :host ::ng-deep .cw-md em { font-style: italic; }
    :host ::ng-deep .cw-md ul, :host ::ng-deep .cw-md ol { margin: 0.5em 0; padding-left: 1.25em; }
    :host ::ng-deep .cw-md ul { list-style: disc; }
    :host ::ng-deep .cw-md ol { list-style: decimal; }
    :host ::ng-deep .cw-md li { margin: 0.25em 0; }
    :host ::ng-deep .cw-md h1, :host ::ng-deep .cw-md h2, :host ::ng-deep .cw-md h3 { margin: 0.75em 0 0.4em; font-weight: 700; line-height: 1.3; }
    :host ::ng-deep .cw-md h1 { font-size: 1.15em; }
    :host ::ng-deep .cw-md h2 { font-size: 1.08em; }
    :host ::ng-deep .cw-md h3 { font-size: 1em; }
    :host ::ng-deep .cw-md a { color: #8a4a05; text-decoration: underline; }
    :host ::ng-deep .cw-md code {
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(16, 5, 28, 0.08);
      font-family: ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace;
      font-size: 0.9em;
    }
    :host ::ng-deep .cw-md pre {
      margin: 0.6em 0;
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--cw-ink);
      color: #f1edf5;
      overflow-x: auto;
      font-size: 0.85em;
    }
    :host ::ng-deep .cw-md pre code { padding: 0; background: none; color: inherit; }

    @media (prefers-reduced-motion: reduce) {
      .cw-bubble, .cw-md { animation: none; }
      .cw-typing span, .cw-send.is-busy i { animation: none; opacity: 0.7; }
      .cw-suggestions { transition: none; }
    }
  `],
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  @ViewChild('thread') private threadRef?: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') private inputRef?: ElementRef<HTMLTextAreaElement>;

  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly injector = inject(Injector);

  readonly messages = signal<ChatMessage[]>([]);
  readonly isLoading = signal(false);
  readonly hasUserMessages = computed(() => this.messages().some((m) => m.role === 'user'));
  readonly suggestionKeys: Key[] = ['s1', 's2', 's3'];

  public currentMessage = '';

  private nextId = 1;
  private request: Subscription | null = null;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private chatService: ChatbotService, private sanitizer: DomSanitizer) {}

  /** Última pergunta e última resposta (mantidos para quem lê o estado do widget de fora). */
  get latestUserMessage(): string {
    return [...this.messages()].reverse().find((m) => m.role === 'user')?.content ?? '';
  }

  get latestAssistantMessage(): string {
    return [...this.messages()].reverse().find((m) => m.role === 'assistant' && !m.pending && !m.errorKey)?.content ?? '';
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.cancelRequest();
  }

  onInputFocus(): void {}

  onInputBlur(): void {}

  onEnterKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    // Shift+Enter quebra a linha; Enter durante composição (IME) não envia.
    if (keyboardEvent.shiftKey || keyboardEvent.isComposing) return;
    keyboardEvent.preventDefault();
    this.sendMessage();
  }

  /** Ajusta a altura do campo ao texto, até o limite definido no CSS. */
  autoGrow(): void {
    const el = this.inputRef?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 120)}px`;
  }

  /** Envia o texto digitado (ou uma sugestão) e mostra a resposta no idioma atual do site. */
  public sendMessage(text?: string): void {
    const content = (text ?? this.currentMessage).trim();
    if (content === '' || this.isLoading()) return;

    const question: ChatMessage = { id: this.nextId++, role: 'user', content };
    const reply: ChatMessage = { id: this.nextId++, role: 'assistant', content: '', pending: true };

    // Histórico enviado ao modelo: só trocas concluídas, mais a pergunta atual.
    const history: Message[] = [...this.messages(), question]
      .filter((m) => !m.pending && !m.errorKey && !m.failed)
      .map(({ role, content: c }) => ({ role, content: c }));

    this.messages.update((list) => [...list, question, reply]);
    if (text === undefined) {
      this.currentMessage = '';
      afterNextRender(() => this.autoGrow(), { injector: this.injector });
    }
    this.isLoading.set(true);
    this.scrollToBottom();

    const startedAt = Date.now();
    const settle = (apply: () => void) => {
      const wait = Math.max(0, MIN_TYPING_MS - (Date.now() - startedAt));
      this.typingTimer = setTimeout(() => {
        this.typingTimer = null;
        apply();
        this.isLoading.set(false);
        this.scrollToBottom();
      }, wait);
    };
    const fail = (err: unknown) => {
      console.error('Chatbot API error:', err);
      const errorKey: ErrorKey = typeof navigator !== 'undefined' && navigator.onLine === false ? 'errorOffline' : 'errorGeneric';
      settle(() =>
        this.messages.update((list) =>
          list.map((m) => {
            if (m.id === reply.id) return { ...m, pending: false, errorKey };
            if (m.id === question.id) return { ...m, failed: true };
            return m;
          }),
        ),
      );
    };

    let response$: Observable<string>;
    try {
      // A instrução de sistema e a chave da IA ficam no servidor (SGA); aqui vai só a conversa.
      response$ = this.chatService.ask(history, this.i18n.lang());
    } catch (err) {
      fail(err);
      return;
    }

    this.request = response$.subscribe({
      next: (response) =>
        settle(() =>
          this.messages.update((list) =>
            list.map((m) =>
              m.id === reply.id ? { ...m, pending: false, content: response, html: this.parseMarkdown(response) } : m,
            ),
          ),
        ),
      error: fail,
    });
  }

  /** Reenvia a última pergunta que falhou. */
  retry(): void {
    if (this.isLoading()) return;
    const list = this.messages();
    const failed = [...list].reverse().find((m) => m.failed);
    if (!failed) return;
    const errorBubble = list[list.indexOf(failed) + 1];
    this.messages.set(list.filter((m) => m !== failed && m !== errorBubble));
    this.sendMessage(failed.content);
  }

  clear(): void {
    this.cancelRequest();
    this.isLoading.set(false);
    this.messages.set([]);
  }

  /**
   * Converte o markdown básico da resposta em HTML.
   * O texto é escapado antes; só as tags geradas aqui chegam ao DOM.
   */
  parseMarkdown(text: string): SafeHtml {
    if (!text) return '';

    const blocks: string[] = [];
    const fenced = text.replace(/```[^\n]*\n?([\s\S]*?)```/g, (_match, code: string) => {
      blocks.push(`<pre><code>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`);
      return `\n@@BLOCK${blocks.length - 1}@@\n`;
    });

    const out: string[] = [];
    let list: 'ul' | 'ol' | null = null;
    let paragraph: string[] = [];
    const closeList = () => {
      if (list) out.push(`</${list}>`);
      list = null;
    };
    const closeParagraph = () => {
      if (paragraph.length) out.push(`<p>${paragraph.join('<br>')}</p>`);
      paragraph = [];
    };

    for (const raw of fenced.split('\n')) {
      const line = raw.trim();
      const block = /^@@BLOCK(\d+)@@$/.exec(line);
      const heading = /^(#{1,3})\s+(.+)$/.exec(line);
      const bullet = /^[-*•]\s+(.+)$/.exec(line);
      const numbered = /^\d+[.)]\s+(.+)$/.exec(line);

      if (block) {
        closeParagraph();
        closeList();
        out.push(blocks[+block[1]]);
      } else if (heading) {
        closeParagraph();
        closeList();
        const level = heading[1].length;
        out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      } else if (bullet || numbered) {
        closeParagraph();
        const kind = bullet ? 'ul' : 'ol';
        if (list !== kind) {
          closeList();
          out.push(`<${kind}>`);
          list = kind;
        }
        out.push(`<li>${inline((bullet ?? numbered)![1])}</li>`);
      } else if (line === '') {
        closeParagraph();
        closeList();
      } else {
        closeList();
        paragraph.push(inline(line));
      }
    }
    closeParagraph();
    closeList();

    return this.sanitizer.bypassSecurityTrustHtml(out.join(''));
  }

  /** Rola a conversa (só a lista, nunca a página) até a última mensagem, de forma suave. */
  private scrollToBottom(): void {
    afterNextRender(
      () => {
        const el = this.threadRef?.nativeElement;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: this.reducedMotion ? 'auto' : 'smooth' });
      },
      { injector: this.injector },
    );
  }

  private cancelRequest(): void {
    this.request?.unsubscribe();
    this.request = null;
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Formatação dentro da linha: código, negrito, itálico e links http(s)/mailto. */
function inline(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
  html = html.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return html;
}
