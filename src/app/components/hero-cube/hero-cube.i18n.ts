import { dict } from '../../i18n/i18n.service';

/**
 * Textos do herói. O título é montado em três linhas no template:
 * h1_a (em destaque) / h1_b / h1_c (em destaque) + h1_end.
 * O texto fica em caixa normal aqui; a caixa alta é aplicada por CSS.
 */
export const I18N = dict({
  pt: {
    badge: 'Soluções prontas e personalizadas',
    h1_a: 'Construindo',
    h1_b: 'o que você',
    h1_c: 'precisa',
    h1_end: '!',
    line_1: 'Software nativo e híbrido',
    line_2: 'Landing pages e web apps',
    line_3: 'SaaS e on-premise',
  },
  en: {
    badge: 'Ready-made and custom solutions',
    h1_a: 'Building',
    h1_b: 'what you',
    h1_c: 'need',
    h1_end: '!',
    line_1: 'Native and hybrid software',
    line_2: 'Landing pages and web apps',
    line_3: 'SaaS and on-premise',
  },
  es: {
    badge: 'Soluciones listas y a medida',
    h1_a: '¡Construimos',
    h1_b: 'lo que',
    h1_c: 'necesitas',
    h1_end: '!',
    line_1: 'Software nativo e híbrido',
    line_2: 'Landing pages y aplicaciones web',
    line_3: 'SaaS y on-premise',
  },
  fr: {
    badge: 'Solutions clés en main et sur mesure',
    h1_a: 'Nous créons',
    h1_b: 'ce dont vous',
    h1_c: 'avez besoin',
    h1_end: ' !',
    line_1: 'Logiciels natifs et hybrides',
    line_2: 'Landing pages et applications web',
    line_3: 'SaaS et on-premise',
  },
});
