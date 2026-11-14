import { Injectable, signal } from '@angular/core';

/**
 * i18n da landing Unrender — Português, English, Español e Français.
 *
 * Como usar em um componente:
 *
 *   // meu.component.i18n.ts
 *   export const I18N = dict({
 *     pt: { titulo: 'Olá, {nome}', botao: 'Enviar' },
 *     en: { titulo: 'Hello, {nome}', botao: 'Send' },
 *     es: { titulo: 'Hola, {nome}', botao: 'Enviar' },
 *     fr: { titulo: 'Bonjour, {nome}', botao: 'Envoyer' },
 *   });
 *
 *   // meu.component.ts
 *   readonly i18n = inject(I18nService);
 *   readonly t = this.i18n.scope(I18N);
 *
 *   // template
 *   {{ t('titulo', { nome }) }}
 *
 * `t()` lê o signal do idioma: o template se atualiza sozinho na troca, inclusive
 * em componentes OnPush. Para texto desenhado fora do template (canvas, Three.js,
 * GSAP), reaja com `effect(() => { this.i18n.lang(); redesenhar(); })`.
 */
export type Lang = 'pt' | 'en' | 'es' | 'fr';

export interface LangOption {
  code: Lang;
  /** Nome do idioma no próprio idioma. */
  label: string;
  /** Sigla curta para o seletor. */
  short: string;
  /** Locale BCP 47 para `Intl` e para o atributo `lang` do documento. */
  locale: string;
}

export const LANGS: readonly LangOption[] = [
  { code: 'pt', label: 'Português', short: 'PT', locale: 'pt-BR' },
  { code: 'en', label: 'English', short: 'EN', locale: 'en-US' },
  { code: 'es', label: 'Español', short: 'ES', locale: 'es-ES' },
  { code: 'fr', label: 'Français', short: 'FR', locale: 'fr-FR' },
];

/** Dicionário de um componente: as mesmas chaves nos quatro idiomas. */
export type Dict<K extends string = string> = Record<Lang, Record<K, string>>;

/**
 * Declara um dicionário garantindo, em tempo de compilação, que `en`, `es` e `fr`
 * tenham exatamente as chaves de `pt` (chave faltando = erro de build).
 */
export function dict<T extends Record<string, string>>(d: {
  pt: T;
  en: Record<keyof T, string>;
  es: Record<keyof T, string>;
  fr: Record<keyof T, string>;
}): Dict<keyof T & string> {
  return d as unknown as Dict<keyof T & string>;
}

export type Params = Record<string, string | number>;
export type Translate<K extends string = string> = (key: K, params?: Params) => string;

const STORAGE_KEY = 'unrender_lang';
// O francês separa milhares com U+202F, que a Montserrat não desenha ("3199 R$"): usa U+00A0.
const NARROW_NBSP = /\u202f/g;
const NBSP = '\u00a0';
const CODES = LANGS.map((l) => l.code) as readonly string[];

function normalize(raw: string | null | undefined): Lang | null {
  if (!raw) return null;
  const base = raw.toLowerCase().split(/[-_]/)[0];
  return CODES.includes(base) ? (base as Lang) : null;
}

function detect(): Lang {
  try {
    const fromUrl = normalize(new URLSearchParams(location.search).get('lang'));
    if (fromUrl) return fromUrl;
    const saved = normalize(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
    for (const l of navigator.languages ?? [navigator.language]) {
      const hit = normalize(l);
      if (hit) return hit;
    }
  } catch {
    // SSR/prerender ou storage bloqueado: cai no padrão.
  }
  return 'pt';
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly langs = LANGS;
  /** Idioma atual (signal). */
  readonly lang = signal<Lang>(detect());

  constructor() {
    this.apply(this.lang());
  }

  /** Troca o idioma, persiste a escolha e atualiza `<html lang>`. */
  set(lang: Lang): void {
    if (!CODES.includes(lang) || lang === this.lang()) return;
    this.lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // storage bloqueado: a escolha vale só para esta visita.
    }
    this.apply(lang);
  }

  /** Locale BCP 47 do idioma atual (ex.: `pt-BR`). */
  locale(): string {
    return LANGS.find((l) => l.code === this.lang())!.locale;
  }

  /** Cria o tradutor de um dicionário. `{chave}` no texto é trocado por `params.chave`. */
  scope<K extends string>(d: Dict<K>): Translate<K> {
    return (key, params) => {
      const text = d[this.lang()]?.[key] ?? d.pt[key] ?? key;
      return params ? interpolate(text, params) : text;
    };
  }

  /** Escolhe o valor do idioma atual em um objeto `{ pt, en, es, fr }` (listas, objetos…). */
  pick<T>(values: Record<Lang, T>): T {
    return values[this.lang()] ?? values.pt;
  }

  /** Valor em reais formatado no padrão do idioma (a moeda continua BRL). */
  money(value: number, fractionDigits = 2): string {
    return new Intl.NumberFormat(this.locale(), {
      style: 'currency',
      currency: 'BRL',
      // Sem isto, es-ES escreve "BRL" no lugar de "R$".
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
      .format(value)
      .replace(NARROW_NBSP, NBSP);
  }

  /** Número formatado no padrão do idioma. */
  number(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale(), options).format(value).replace(NARROW_NBSP, NBSP);
  }

  /** Data/hora formatada no padrão do idioma. */
  date(value: Date | number | string, options: Intl.DateTimeFormatOptions = { dateStyle: 'short' }): string {
    return new Intl.DateTimeFormat(this.locale(), options).format(new Date(value));
  }

  private apply(lang: Lang): void {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = LANGS.find((l) => l.code === lang)!.locale;
  }
}

function interpolate(text: string, params: Params): string {
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}
