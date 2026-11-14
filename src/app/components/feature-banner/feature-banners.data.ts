import { Lang } from '../../i18n/i18n.service';
import { BannerMedia, FeatureBanner } from './feature-banner.types';
import { BANNER_TEXT } from './feature-banners.i18n';

const SCREENS = '/images/real-screens';
const PRODUTOS = '/images/produtos';

/** Parte visual de um banner; os textos vêm de `feature-banners.i18n.ts`, na mesma ordem. */
interface BannerShape {
  layout?: 'split' | 'wide';
  /** Ícones dos destaques (Font Awesome). */
  highlights: string[];
  ctaLink?: string;
  media?: Omit<BannerMedia, 'alt'>[];
  /** Ícones do mosaico usado quando não há material real. */
  mosaic?: string[];
}

/**
 * Banners por id de item de menu (FeatureTabs). Só usa material real:
 * telas do SGA CTRLB, fotos de totens em eventos e ilustrações da loja.
 */
const SHAPES: Record<string, BannerShape> = {
  // ───────────── Desenvolvimento de Software ─────────────
  'web-mobile': {
    highlights: ['fa-solid fa-mobile-screen', 'fa-solid fa-cube', 'fa-brands fa-whatsapp', 'fa-solid fa-gauge-high'],
    ctaLink: 'https://unrender.dev',
    media: [
      { kind: 'screen', src: `${SCREENS}/crm-live-dark.png`, address: 'ctrlb.com.br/crm' },
      { kind: 'phone', src: `${SCREENS}/mobile-agendamento-modal.png` },
    ],
  },
  'ai-solutions': {
    highlights: ['fa-brands fa-whatsapp', 'fa-solid fa-tags', 'fa-solid fa-eye', 'fa-solid fa-pen-nib'],
    ctaLink: 'https://ctrlb.com.br',
    media: [
      { kind: 'screen', src: `${SCREENS}/conversas-live-dark.png`, address: 'ctrlb.com.br/conversas' },
      { kind: 'screen', src: `${SCREENS}/qualidade-ia-live-dark.png`, address: 'ctrlb.com.br/qualidade-ia' },
      { kind: 'screen', src: `${SCREENS}/ia-documento-previa.png`, address: 'ctrlb.com.br/documentos' },
    ],
  },
  'web-apps': {
    layout: 'wide',
    highlights: ['fa-solid fa-laptop', 'fa-solid fa-tablet-screen-button', 'fa-solid fa-mobile-screen', 'fa-solid fa-wifi'],
    ctaLink: 'https://ctrlb.com.br',
    media: [{ kind: 'showcase', src: '/images/showcases/ctrlb-responsive-devices.webp', width: 2181, height: 924 }],
  },
  'mobile-apps': {
    highlights: ['fa-brands fa-android', 'fa-brands fa-apple', 'fa-solid fa-cloud-arrow-down', 'fa-solid fa-bell'],
    media: [
      { kind: 'phone', src: `${SCREENS}/mobile-agendamento-modal.png` },
      { kind: 'screen', src: `${SCREENS}/agenda-live-dark.png`, address: 'SGA CTRLB · agenda' },
    ],
  },
  'desktop-apps': {
    highlights: ['fa-brands fa-windows', 'fa-solid fa-fingerprint', 'fa-solid fa-barcode', 'fa-solid fa-receipt'],
    media: [
      { kind: 'product', src: `${PRODUTOS}/pos-kit-turnkey-completo.svg` },
      { kind: 'screen', src: `${SCREENS}/comercial-live.png`, address: 'SGA CTRLB · app' },
    ],
  },
  'custom-systems': {
    highlights: ['fa-solid fa-hand-pointer', 'fa-solid fa-camera', 'fa-solid fa-building', 'fa-solid fa-gamepad'],
    ctaLink: 'https://unrender.games/gamificacao',
    media: [
      { kind: 'photo', src: '/features/totem1.png', focus: '35% center' },
      { kind: 'photo', src: '/features/totem2.jpg', focus: 'center 40%' },
      { kind: 'screen', src: `${SCREENS}/admin-unidades-live-dark.png`, address: 'ctrlb.com.br/unidades' },
    ],
  },

  // ───────────── Infraestrutura ─────────────
  'commercial-automation': {
    highlights: ['fa-solid fa-receipt', 'fa-solid fa-cash-register', 'fa-solid fa-desktop', 'fa-solid fa-truck-fast'],
    ctaLink: '/loja',
    media: [
      { kind: 'product', src: `${PRODUTOS}/pos-kit-turnkey-completo.svg` },
      { kind: 'product', src: `${PRODUTOS}/pos-impressora-termica-80mm.svg` },
      { kind: 'product', src: `${PRODUTOS}/pos-caixa-registradora-usb.svg` },
      { kind: 'product', src: `${PRODUTOS}/pos-leitor-2d-usb.svg` },
    ],
  },
  'hardware-consulting': {
    highlights: ['fa-solid fa-store', 'fa-solid fa-headset', 'fa-solid fa-server', 'fa-solid fa-calendar-check'],
    ctaLink: '/loja',
    media: [
      { kind: 'product', src: `${PRODUTOS}/pos-kit-pc-caixa.svg` },
      { kind: 'product', src: `${PRODUTOS}/pos-kit-headsets-boost.svg` },
      { kind: 'product', src: `${PRODUTOS}/pos-impressora-bluetooth-58mm.svg` },
    ],
  },
  'smart-home': {
    highlights: ['fa-solid fa-lightbulb', 'fa-solid fa-temperature-half', 'fa-solid fa-video'],
    mosaic: [
      'fa-solid fa-lightbulb',
      'fa-solid fa-temperature-half',
      'fa-solid fa-video',
      'fa-solid fa-door-open',
      'fa-solid fa-plug',
      'fa-solid fa-shield-halved',
    ],
  },
  'ai-servers': {
    highlights: ['fa-solid fa-microchip', 'fa-solid fa-lock', 'fa-solid fa-chart-area'],
    media: [
      { kind: 'screen', src: `${SCREENS}/metricas-sistema-live-dark.png`, address: 'ctrlb.com.br/metricas' },
      { kind: 'screen', src: `${SCREENS}/telemetria-servidores.png`, address: 'ctrlb.com.br/telemetria' },
    ],
  },
  'network-infrastructure': {
    highlights: ['fa-solid fa-network-wired', 'fa-solid fa-wifi', 'fa-solid fa-shield-halved'],
    mosaic: [
      'fa-solid fa-network-wired',
      'fa-solid fa-wifi',
      'fa-solid fa-shield-halved',
      'fa-solid fa-server',
      'fa-solid fa-diagram-project',
      'fa-solid fa-chart-line',
    ],
  },
  'custom-hardware': {
    highlights: ['fa-solid fa-hand-pointer', 'fa-solid fa-microchip', 'fa-solid fa-satellite-dish'],
    ctaLink: '/loja',
    media: [
      { kind: 'photo', src: '/features/totem1.png', focus: '35% center' },
      { kind: 'photo', src: '/features/totem2.jpg', focus: 'center 40%' },
      { kind: 'product', src: `${PRODUTOS}/pos-kit-pc-touch.svg` },
    ],
  },

  // ───────────── 3D & Games ─────────────
  'unrender-games': {
    highlights: ['fa-solid fa-gamepad', 'fa-solid fa-vr-cardboard', 'fa-solid fa-person-running'],
    ctaLink: 'https://unrender.games',
    mosaic: [
      'fa-solid fa-gamepad',
      'fa-solid fa-vr-cardboard',
      'fa-solid fa-cube',
      'fa-solid fa-person-running',
      'fa-solid fa-store',
      'fa-solid fa-trophy',
    ],
  },
};

const cache = new Map<Lang, Record<string, FeatureBanner>>();

/** Banners montados no idioma pedido (memoizado: a referência só muda quando o idioma muda). */
export function localizedBanners(lang: Lang): Record<string, FeatureBanner> {
  const hit = cache.get(lang);
  if (hit) return hit;

  const out: Record<string, FeatureBanner> = {};
  for (const [id, shape] of Object.entries(SHAPES)) {
    const text = BANNER_TEXT[lang]?.[id] ?? BANNER_TEXT.pt[id];
    const fallback = BANNER_TEXT.pt[id];
    out[id] = {
      layout: shape.layout,
      eyebrow: text.eyebrow,
      headline: text.headline,
      accent: text.accent,
      highlights: shape.highlights.map((icon, i) => ({ icon, label: text.highlights[i] ?? fallback.highlights[i] })),
      cta: shape.ctaLink ? { label: text.cta ?? fallback.cta ?? '', link: shape.ctaLink } : undefined,
      media: shape.media?.map((m, i) => ({ ...m, alt: text.media?.[i] ?? fallback.media?.[i] ?? '' })),
      mosaic: shape.mosaic?.map((icon, i) => ({ icon, label: text.mosaic?.[i] ?? fallback.mosaic?.[i] ?? '' })),
    };
  }
  cache.set(lang, out);
  return out;
}
