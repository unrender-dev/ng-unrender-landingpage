/**
 * Fonte de voxels do Unrender Arcade: cada letra tem 5 linhas (de cima para baixo), `#` = bloco.
 * Acentos ocupam uma linha acima da letra (com uma linha de respiro) e a cedilha, uma abaixo.
 */
const GLYPHS: Record<string, string[]> = {
  A: ['.##.', '#..#', '####', '#..#', '#..#'],
  B: ['###.', '#..#', '###.', '#..#', '###.'],
  C: ['.###', '#...', '#...', '#...', '.###'],
  D: ['###.', '#..#', '#..#', '#..#', '###.'],
  E: ['####', '#...', '###.', '#...', '####'],
  F: ['####', '#...', '###.', '#...', '#...'],
  G: ['.###', '#...', '#.##', '#..#', '.###'],
  H: ['#..#', '#..#', '####', '#..#', '#..#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..##', '...#', '...#', '#..#', '.##.'],
  K: ['#..#', '#.#.', '##..', '#.#.', '#..#'],
  L: ['#...', '#...', '#...', '#...', '####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#'],
  O: ['.##.', '#..#', '#..#', '#..#', '.##.'],
  P: ['###.', '#..#', '###.', '#...', '#...'],
  Q: ['.##.', '#..#', '#..#', '#.#.', '.#.#'],
  R: ['###.', '#..#', '###.', '#.#.', '#..#'],
  S: ['.###', '#...', '.##.', '...#', '###.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..'],
  U: ['#..#', '#..#', '#..#', '#..#', '.##.'],
  V: ['#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  Y: ['#...#', '.#.#.', '..#..', '..#..', '..#..'],
  Z: ['####', '...#', '.##.', '#...', '####'],
  "'": ['#', '#', '.', '.', '.'],
  '-': ['...', '...', '###', '...', '...'],
  '!': ['#', '#', '#', '.', '#'],
};

/** Desenho do acento (4 colunas), posicionado sobre o centro da letra. */
const ACCENTS: Record<string, string> = {
  acute: '..##',
  grave: '##..',
  tilde: '####',
  circumflex: '.##.',
};

/** Letra acentuada → letra base + acento. */
const COMPOSED: Record<string, [string, string]> = {
  Á: ['A', 'acute'], À: ['A', 'grave'], Â: ['A', 'circumflex'], Ã: ['A', 'tilde'],
  É: ['E', 'acute'], È: ['E', 'grave'], Ê: ['E', 'circumflex'],
  Í: ['I', 'acute'],
  Ó: ['O', 'acute'], Ô: ['O', 'circumflex'], Õ: ['O', 'tilde'],
  Ú: ['U', 'acute'], Ù: ['U', 'grave'], Û: ['U', 'circumflex'],
  Ñ: ['N', 'tilde'],
};

/** Linha (em unidades de bloco) do acento e da cedilha em relação à base da letra. */
export const ACCENT_ROW = 6;
export const CEDILLA_ROW = -1;
/** Espaço entre letras e largura do espaço entre palavras, em blocos. */
export const LETTER_GAP = 1;
export const WORD_SPACE = 2;

export interface Glyph {
  width: number;
  /** Blocos da letra: [coluna, linha], com a linha 0 na base. */
  cells: Array<[number, number]>;
}

const cache = new Map<string, Glyph>();

export function glyph(char: string): Glyph {
  const cached = cache.get(char);
  if (cached) return cached;

  let base = char;
  let accent: string | null = null;
  let cedilla = false;
  if (char === 'Ç') {
    base = 'C';
    cedilla = true;
  } else if (COMPOSED[char]) {
    [base, accent] = COMPOSED[char];
  }

  const rows = GLYPHS[base];
  const result: Glyph = { width: rows ? rows[0].length : WORD_SPACE, cells: [] };
  if (rows) {
    rows.forEach((row, index) => {
      for (let col = 0; col < row.length; col++) {
        if (row[col] === '#') result.cells.push([col, rows.length - 1 - index]);
      }
    });
    if (accent) {
      const pattern = ACCENTS[accent];
      const offset = Math.floor((result.width - pattern.length) / 2);
      for (let col = 0; col < pattern.length; col++) {
        const x = col + offset;
        if (pattern[col] === '#' && x >= 0 && x < result.width) result.cells.push([x, ACCENT_ROW]);
      }
    }
    if (cedilla) {
      result.cells.push([1, CEDILLA_ROW], [2, CEDILLA_ROW]);
    }
  }
  cache.set(char, result);
  return result;
}

/** Largura de uma palavra em blocos (letras + espaços entre elas). */
export function wordUnits(word: string): number {
  let units = 0;
  for (const char of word) units += glyph(char).width + LETTER_GAP;
  return Math.max(0, units - LETTER_GAP);
}

/** Largura de uma linha (palavras separadas por espaço). */
export function lineUnits(line: string): number {
  const words = line.split(' ').filter(Boolean);
  if (!words.length) return 0;
  return words.reduce((sum, word) => sum + wordUnits(word), 0) + (words.length - 1) * (WORD_SPACE + 2 * LETTER_GAP);
}

/** Quebra a frase em linhas de no máximo `maxUnits` blocos; `null` se alguma palavra não couber. */
export function wrapPhrase(phrase: string, maxUnits: number): string[] | null {
  const lines: string[] = [];
  let current = '';
  for (const word of phrase.split(' ').filter(Boolean)) {
    if (wordUnits(word) > maxUnits) return null;
    const candidate = current ? `${current} ${word}` : word;
    if (lineUnits(candidate) <= maxUnits) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
