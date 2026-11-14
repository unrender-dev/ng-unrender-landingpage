/**
 * Banner responsivo renderizado em código (HTML/CSS), no lugar das imagens
 * com texto "queimado" que eram cortadas pelo object-cover em cada tela.
 *
 * - O texto (eyebrow, título, destaques) é HTML de verdade: quebra linha e
 *   escala com a tela, nunca é cortado.
 * - O visual usa apenas material real (telas do produto, fotos de eventos,
 *   ilustrações de produto) dentro de molduras com proporção fixa, ou um
 *   mosaico de ícones quando não há material real.
 */
export type BannerMediaKind =
  /** Captura de tela 16:10 de sistema web, exibida numa janela de navegador. */
  | 'screen'
  /** Captura de tela vertical de celular, exibida numa moldura de smartphone. */
  | 'phone'
  /** Foto real (eventos, totens). Preenche a moldura com enquadramento central. */
  | 'photo'
  /** Ilustração de produto 8:5 (SVGs da loja). */
  | 'product'
  /**
   * Composição completa (ex.: notebook + tablet + celular) exibida inteira,
   * na proporção natural da imagem — nunca recortada. Use com layout 'wide'.
   */
  | 'showcase';

export interface BannerMedia {
  kind: BannerMediaKind;
  src: string;
  alt: string;
  /** Texto exibido na barra de endereço das molduras 'screen'. */
  address?: string;
  /** Ponto de foco da foto/tela quando a moldura recorta (object-position). */
  focus?: string;
  /** Dimensões intrínsecas (evita layout shift em 'showcase'). */
  width?: number;
  height?: number;
}

export interface BannerHighlight {
  /** Classe Font Awesome (biblioteca de ícones já usada no projeto). */
  icon: string;
  label: string;
}

export interface FeatureBanner {
  /**
   * 'split' (padrão): texto e visual lado a lado.
   * 'wide': texto em cima e visual em largura total — para imagens panorâmicas.
   */
  layout?: 'split' | 'wide';
  eyebrow: string;
  headline: string;
  /** Trecho do título destacado na cor de acento (deve existir em headline). */
  accent?: string;
  highlights: BannerHighlight[];
  cta?: { label: string; link: string };
  /** Material real, alternado automaticamente. */
  media?: BannerMedia[];
  /** Mosaico de ícones usado quando não há material real (até 6). */
  mosaic?: BannerHighlight[];
}
