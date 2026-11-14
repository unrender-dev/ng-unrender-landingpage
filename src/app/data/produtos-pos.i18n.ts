import type { Lang } from '../i18n/i18n.service';
import { CategoriaPos, ProdutoPos, categoriasPos } from './produtos-pos.data';

/**
 * Tradução do catálogo POS.
 *
 * A fonte de verdade continua em português (`produtos-pos.data.ts` + API do SGA CTRLB).
 * Aqui ficam os textos en/es/fr por id de produto (carregados sob demanda, para não
 * pesar o bundle inicial) e a função que entrega um `ProdutoPos` já no idioma pedido.
 * SKU, estoque e valores numéricos nunca mudam; os preços continuam em reais.
 */
export interface ProdutoPosTexto {
  name: string;
  shortTitle: string;
  tagline: string;
  quickPitch: string;
  tags: string[];
  badge: string;
  shortDesc: string;
  longDesc: string;
  highlights: string[];
  techSpecs: Record<string, string>;
  softwareModes: string[];
  idealFor: string[];
}

export type TextosPos = Record<string, ProdutoPosTexto>;

export const carregadoresTextosPos: Record<Exclude<Lang, 'pt'>, () => Promise<TextosPos>> = {
  en: () => import('./produtos-pos.en').then((m) => m.PRODUTOS_POS_EN),
  es: () => import('./produtos-pos.es').then((m) => m.PRODUTOS_POS_ES),
  fr: () => import('./produtos-pos.fr').then((m) => m.PRODUTOS_POS_FR),
};

type PorIdioma = Record<Lang, string>;

const CATEGORIAS: Record<string, PorIdioma> = {
  todos: { pt: 'Todos os equipamentos', en: 'All equipment', es: 'Todos los equipos', fr: 'Tout le matériel' },
  'impressora-termica': {
    pt: 'Impressoras térmicas',
    en: 'Thermal printers',
    es: 'Impresoras térmicas',
    fr: 'Imprimantes thermiques',
  },
  'impressora-bluetooth': {
    pt: 'Impressoras Bluetooth',
    en: 'Bluetooth printers',
    es: 'Impresoras Bluetooth',
    fr: 'Imprimantes Bluetooth',
  },
  'caixa-usb': {
    pt: 'Caixas registradoras USB',
    en: 'USB cash drawers',
    es: 'Cajones portamonedas USB',
    fr: 'Tiroirs-caisses USB',
  },
  'kit-pc-caixa': { pt: 'Kits PC para caixa', en: 'POS PC kits', es: 'Kits PC para caja', fr: 'Kits PC de caisse' },
  'kit-headset-boost': {
    pt: 'Kits de headsets e Boost',
    en: 'Headset & Boost kits',
    es: 'Kits de auriculares y Boost',
    fr: 'Kits casques et Boost',
  },
  'perifericos-pdv': {
    pt: 'Leitores e periféricos de PDV',
    en: 'Scanners & POS peripherals',
    es: 'Lectores y periféricos de caja',
    fr: 'Lecteurs et périphériques de caisse',
  },
};

/** Rótulos pt que o catálogo/SGA usam para as categorias conhecidas (comparados sem caixa). */
const ROTULOS_PADRAO = new Set(
  [
    ...Object.values(CATEGORIAS).map((c) => c.pt),
    'Kits Headsets & Boost',
    'Leitores & Periféricos PDV',
  ].map((s) => s.toLowerCase())
);

const COMUNS: Record<Lang, { sobConsulta: string; porMes: string; estoque: string; whats: string }> = {
  pt: {
    sobConsulta: 'Sob consulta',
    porMes: '{v}/mês',
    estoque: '{n} un. em estoque',
    whats: 'Olá! Gostaria de comprar / orçar o equipamento "{nome}" na Unrender.',
  },
  en: {
    sobConsulta: 'Price on request',
    porMes: '{v}/month',
    estoque: '{n} in stock',
    whats: 'Hi! I\'d like to buy or get a quote for "{nome}" from Unrender.',
  },
  es: {
    sobConsulta: 'Precio a consultar',
    porMes: '{v}/mes',
    estoque: '{n} uds. en stock',
    whats: '¡Hola! Me gustaría comprar o cotizar "{nome}" en Unrender.',
  },
  fr: {
    sobConsulta: 'Sur devis',
    porMes: '{v}/mois',
    estoque: '{n} en stock',
    whats: 'Bonjour ! Je souhaite acheter ou obtenir un devis pour « {nome} » chez Unrender.',
  },
};

/**
 * Frases genéricas geradas em pt (prazo, selos e textos-padrão de produtos que só
 * existem no SGA). Chave = texto em português exatamente como sai dos dados.
 */
const FRASES: Record<string, Omit<PorIdioma, 'pt'>> = {
  'Pronta entrega (envio em 24 h)': {
    en: 'In stock, ships in 24 h',
    es: 'Entrega inmediata (envío en 24 h)',
    fr: 'En stock, expédié sous 24 h',
  },
  'Pronta entrega': { en: 'In stock', es: 'Entrega inmediata', fr: 'En stock' },
  'Destaque • Pronta entrega': {
    en: 'Featured • In stock',
    es: 'Destacado • Entrega inmediata',
    fr: 'À la une • En stock',
  },
  'Equipamento comercial homologado pela Unrender.': {
    en: 'Business equipment validated by Unrender.',
    es: 'Equipo comercial homologado por Unrender.',
    fr: 'Matériel professionnel validé par Unrender.',
  },
  'Disponível para pronta entrega na Unrender.': {
    en: 'In stock and ready to ship from Unrender.',
    es: 'Disponible para entrega inmediata en Unrender.',
    fr: 'En stock, livraison immédiate chez Unrender.',
  },
  'Equipamento homologado com garantia e suporte técnico Unrender': {
    en: 'Validated equipment with Unrender warranty and technical support',
    es: 'Equipo homologado con garantía y soporte técnico de Unrender',
    fr: 'Matériel validé, avec garantie et assistance technique Unrender',
  },
  'Pronta entrega com configuração assistida para o seu negócio': {
    en: 'In stock, with assisted setup for your business',
    es: 'Entrega inmediata con configuración asistida para tu negocio',
    fr: 'En stock, avec configuration assistée pour votre activité',
  },
  'Condições especiais no PIX ou parcelado em até 12x': {
    en: 'Special terms with PIX, or up to 12 installments',
    es: 'Condiciones especiales con PIX o hasta en 12 cuotas',
    fr: 'Conditions spéciales avec PIX, ou paiement en 12 fois',
  },
  'Compatível com o ecossistema SGA CTRLB e a automação comercial Unrender': {
    en: 'Works with the SGA CTRLB ecosystem and Unrender retail automation',
    es: 'Compatible con el ecosistema SGA CTRLB y la automatización comercial de Unrender',
    fr: 'Compatible avec l\'écosystème SGA CTRLB et les solutions d\'encaissement Unrender',
  },
  'Pontos de venda, recepções, escritórios comerciais e varejo': {
    en: 'Points of sale, front desks, sales offices and retail',
    es: 'Puntos de venta, recepciones, oficinas comerciales y comercios',
    fr: 'Points de vente, accueils, bureaux commerciaux et commerces',
  },
  Categoria: { en: 'Category', es: 'Categoría', fr: 'Catégorie' },
  'Código / SKU': { en: 'Code / SKU', es: 'Código / SKU', fr: 'Code / SKU' },
  Disponibilidade: { en: 'Availability', es: 'Disponibilidad', fr: 'Disponibilité' },
};

const ESTOQUE_PT = /^(\d+) un\.? em estoque$/;

function frase(texto: string, lang: Lang): string {
  if (lang === 'pt' || !texto) return texto;
  const direta = FRASES[texto]?.[lang];
  if (direta) return direta;
  const estoque = ESTOQUE_PT.exec(texto);
  if (estoque) return COMUNS[lang].estoque.replace('{n}', estoque[1]);
  // Rótulo de categoria usado como selo/valor de especificação.
  const categoria = Object.values(CATEGORIAS).find((c) => c.pt.toLowerCase() === texto.toLowerCase());
  return categoria ? categoria[lang] : texto;
}

export function rotuloCategoriaPos(id: string, lang: Lang, padrao = ''): string {
  return CATEGORIAS[id]?.[lang] ?? padrao;
}

export function categoriasPosLocalizadas(lang: Lang): CategoriaPos[] {
  return categoriasPos.map((c) => ({ ...c, label: rotuloCategoriaPos(c.id, lang, c.label) }));
}

/** "Sob consulta" no idioma (preço não numérico). */
export function sobConsultaPos(lang: Lang): string {
  return COMUNS[lang].sobConsulta;
}

/**
 * Devolve o produto com todos os textos no idioma pedido.
 * `textos` é o dicionário do idioma (ainda pode estar carregando: cai no pt até chegar).
 * `dinheiro` formata reais no padrão do idioma (ex.: `i18n.money(v, 0)`).
 */
export function localizarProdutoPos(
  p: ProdutoPos,
  lang: Lang,
  textos: TextosPos | undefined,
  dinheiro: (valor: number) => string
): ProdutoPos {
  const comuns = COMUNS[lang];
  const tx = lang === 'pt' ? undefined : textos?.[p.id];

  const traduzido: ProdutoPos = tx
    ? { ...p, ...tx }
    : lang === 'pt'
      ? { ...p }
      : {
          ...p,
          tagline: frase(p.tagline, lang),
          quickPitch: frase(p.quickPitch, lang),
          tags: p.tags.map((t) => frase(t, lang)),
          badge: frase(p.badge, lang),
          highlights: p.highlights.map((h) => frase(h, lang)),
          techSpecs: Object.fromEntries(
            Object.entries(p.techSpecs ?? {}).map(([k, v]) => [frase(k, lang), frase(String(v), lang)])
          ),
          softwareModes: p.softwareModes.map((m) => frase(m, lang)),
          idealFor: p.idealFor.map((i) => frase(i, lang)),
        };

  const rotuloPadrao = !p.categoryLabel || ROTULOS_PADRAO.has(p.categoryLabel.toLowerCase());

  return {
    ...traduzido,
    categoryLabel: rotuloPadrao ? rotuloCategoriaPos(p.category, lang, p.categoryLabel) : p.categoryLabel,
    leadTime: frase(p.leadTime, lang),
    priceSale: p.priceSaleNumeric > 0 ? dinheiro(p.priceSaleNumeric) : comuns.sobConsulta,
    priceRent: p.priceRentNumeric > 0 ? comuns.porMes.replace('{v}', dinheiro(p.priceRentNumeric)) : comuns.sobConsulta,
    whatsappMessage: lang === 'pt' ? p.whatsappMessage : comuns.whats.replace('{nome}', traduzido.name),
  };
}
