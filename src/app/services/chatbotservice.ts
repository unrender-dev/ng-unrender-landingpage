import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import type { Lang } from '../i18n/i18n.service';
import { sgaCtrlb } from './sga-ctrlb';

/**
 * IA da landing (chatbot e casa inteligente) pelo backend do SGA CTRLB.
 *
 * Nenhuma chave de IA fica no navegador: a landing manda só a conversa para
 * `POST {SGA_API_URL}/public/landing/unrender-dev/chat`, e o servidor escolhe a
 * instrução de sistema, chama a OpenAI com a chave dele e aplica os limites
 * (por minuto, por dia e de tamanho). Ver go-backend/internal/handlers/landing_chat.go.
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Dispositivo da demo de casa inteligente, como o servidor espera. */
export interface SmartDevice {
  id: string;
  nome: string;
  comodo: string;
  tipo: string;
  ligado: boolean;
  valor: number;
}

const SITE = 'unrender-dev';
const TIMEOUT_MS = 30000;

export class ChatbotError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  /** Assistente do site (responde no idioma pedido). */
  ask(history: ChatMessage[], lang: Lang): Observable<string> {
    return from(this.post({ modo: 'assistente', idioma: lang, mensagens: this.toWire(history) }));
  }

  /** Casa inteligente: devolve o texto cru (array JSON de ações) para a demo interpretar. */
  controlHome(history: ChatMessage[], devices: SmartDevice[], lang: Lang): Observable<string> {
    return from(
      this.post({ modo: 'casa', idioma: lang, mensagens: this.toWire(history), dispositivos: devices }),
    );
  }

  private toWire(history: ChatMessage[]) {
    return history.map((m) => ({ papel: m.role, texto: m.content }));
  }

  private async post(body: unknown): Promise<string> {
    const sga = await sgaCtrlb();
    const api = sga?.api;
    if (!api) throw new ChatbotError(0, 'SGA indisponível');

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${api}/public/landing/${SITE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'omit',
        signal: ctl.signal,
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; resposta?: string; erro?: string } | null;
      if (!res.ok || !data?.ok || !data.resposta) {
        throw new ChatbotError(res.status, data?.erro || `HTTP ${res.status}`);
      }
      return data.resposta;
    } finally {
      clearTimeout(timer);
    }
  }
}
