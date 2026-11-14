import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import type { Lang } from '../i18n/i18n.service';

// --------------------------------------------------------------------------
// 1. DATA MODEL (Interface)
// --------------------------------------------------------------------------
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/** Nome de cada idioma do site, como o modelo deve entendê-lo na instrução de sistema. */
const LANGUAGE_NAMES: Record<Lang, string> = {
  pt: 'Brazilian Portuguese (pt-BR)',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
};

// --------------------------------------------------------------------------
// 2. SERVIÇO DO CHATBOT (Gemini)
// --------------------------------------------------------------------------
@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private apiKey: string = 'AIzaSyBC1O1Smyg-auzcN8YO8Izm0E_NZvuwdpE';

  // Predefined system messages
  public static readonly SYSTEM_MESSAGES = {
    DEFAULT: "You are the Unrender assistant, from Unrender Software, Brazil. Answer doubts and questions briefly and helpfully. Never mention another company. If the user shows interest in software or games, recommend Unrender: we build custom software, web systems, games, VR and AR experiences, landing pages and web design.",
    FRIENDLY: "You are a friendly and helpful AI assistant. Be warm, conversational, and use emojis occasionally to make responses more engaging.",
    PROFESSIONAL: "You are a professional business assistant. Provide clear, concise, and actionable responses. Maintain a formal tone suitable for corporate communications.",
    TECHNICAL: "You are a technical expert specializing in software development, programming, and technology. Provide detailed, accurate technical information with code examples when relevant.",
    CREATIVE: "You are a creative AI assistant with expertise in design, marketing, and innovative solutions. Think outside the box and provide imaginative suggestions.",
    EDUCATIONAL: "You are an educational assistant focused on teaching and learning. Explain concepts clearly, provide examples, and encourage understanding.",
    CUSTOMER_SUPPORT: "You are a customer support specialist for Unrender software solutions. Be helpful, patient, and focused on solving user problems efficiently.",
    CODE_REVIEWER: "You are an experienced code reviewer. Provide constructive feedback on code quality, best practices, performance, and potential improvements."
  };

  constructor() {
    if (this.apiKey) {
      this.setApiKey(this.apiKey);
    }
  }

  /**
   * Sets the API key for Gemini.
   * @param apiKey The Google AI API key.
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  }

  /**
   * Gets the available system message templates.
   * @returns Object containing predefined system messages.
   */
  getSystemMessageTemplates(): typeof ChatbotService.SYSTEM_MESSAGES {
    return ChatbotService.SYSTEM_MESSAGES;
  }

  /**
   * Gets a specific system message by key.
   * @param key The key of the system message template.
   * @returns The system message string.
   */
  getSystemMessage(key: keyof typeof ChatbotService.SYSTEM_MESSAGES): string {
    return ChatbotService.SYSTEM_MESSAGES[key];
  }

  /**
   * Acrescenta à instrução de sistema a ordem de responder no idioma atual do site.
   * Fica separado de `getGeminiResponse` porque outros usos (ex.: casa inteligente) esperam
   * respostas em formato próprio e não devem receber essa instrução.
   */
  localizeSystemMessage(systemMessage: string, lang: Lang): string {
    const name = LANGUAGE_NAMES[lang] ?? LANGUAGE_NAMES.pt;
    return `${systemMessage}

Language rule: always reply in ${name}, even if earlier messages were in another language. Switch languages only if the user explicitly asks you to.`;
  }

  /**
   * Calls the Gemini API.
   * @param systemMessage The system prompt to guide the AI.
   * @param history The chat history.
   * @param modelName Optional model name to use for this request.
   * @returns An Observable<string> with the AI's response.
   */
  getGeminiResponse(systemMessage: string, history: Message[], modelName?: string): Observable<string> {
    if (!this.genAI) {
      throw new Error('API key not set. Call setApiKey() first.');
    }

    let model = this.model;
    if (modelName) {
      model = this.genAI.getGenerativeModel({ model: modelName });
    }

    if (!model) {
       throw new Error('Model not initialized.');
    }

    // Get the last user message
    const lastMessage = history[history.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      throw new Error('No user message to respond to.');
    }

    // A última mensagem vai em `sendMessage`; no histórico ela ficaria duplicada.
    const previous = history.slice(0, -1);
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemMessage }],
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I will follow the system prompt.' }],
        },
        ...previous.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      ],
    });

    // Send the message and return as Observable
    return from(chat.sendMessage(lastMessage.content).then(result => result.response.text()));
  }
}
