import { Lang, dict } from '../../i18n/i18n.service';
import { EN } from './politica.en';
import { ES } from './politica.es';
import { FR } from './politica.fr';
import { PT } from './politica.pt';

/**
 * Texto da Política por idioma. O conteúdo jurídico é longo e cheio de listas, então
 * fica em um arquivo por idioma (`politica.<lang>.ts`), todos com esta mesma forma,
 * e é escolhido com `i18n.pick(TEXTOS)`.
 *
 * Campos marcados como "HTML" aceitam `<strong>` e `<a>` e os marcadores
 * `{mail:privacy}` / `{mail:exercise}`, trocados pelo link de e-mail do DPO com o
 * assunto já no idioma (ver `politica.ts`).
 */
export type SecaoId =
  | 'identificacao'
  | 'principios'
  | 'dados-coletados'
  | 'controlador-operador'
  | 'bases-legais'
  | 'seguranca'
  | 'compartilhamento'
  | 'cookies'
  | 'direitos-titular'
  | 'termos-uso'
  | 'contato-dpo';

export interface Cabecalho {
  /** Título curto para o índice. */
  menu: string;
  /** Sobretítulo da seção. */
  kicker: string;
  /** Título completo da seção. */
  title: string;
}

export interface Cartao {
  title: string;
  /** HTML */
  text: string;
}

export interface ItemRotulado {
  label: string;
  /** HTML */
  text: string;
}

export interface PoliticaTexto {
  secoes: Record<SecaoId, Cabecalho>;
  hero: { kicker: string; titlePre: string; titleHl: string; titlePost: string; /** HTML */ intro: string };
  s1: {
    intro: string;
    controllerLabel: string;
    taxId: string;
    hqLabel: string;
    address: string;
    zip: string;
    dpoTitle: string;
    /** HTML */ dpoText: string;
  };
  s2: { intro: string; cards: Cartao[] };
  s3: { intro: string; grupos: { title: string; badge: string; lead: string; itens: string[] }[] };
  s4: {
    intro: string;
    controller: { title: string; /** HTML */ p1: string; /** HTML */ p2: string };
    processor: { title: string; /** HTML */ p1: string; /** HTML */ p2: string };
    onprem: { title: string; /** HTML */ text: string };
  };
  s5: { intro: string; cols: [string, string, string]; rows: [string, string, string][] };
  s6: { intro: string; cards: Cartao[]; retentionTitle: string; retention: ItemRotulado[] };
  s7: { /** HTML */ notice: string; intro: string; itens: ItemRotulado[] };
  s8: { intro: string; cards: Cartao[]; note: string };
  s9: { intro: string; rights: Cartao[]; howTitle: string; /** HTML */ howText: string };
  s10: { intro: string; itens: ItemRotulado[] };
  s11: {
    intro: string;
    boxTitle: string;
    dpoEmailLabel: string;
    supportLabel: string;
    phoneLabel: string;
    phone: string;
    venueLabel: string;
    venue: string;
  };
}

export const TEXTOS: Record<Lang, PoliticaTexto> = { pt: PT, en: EN, es: ES, fr: FR };

/** Textos curtos de interface (botões, índice, selos) e assuntos dos e-mails ao DPO. */
export const I18N = dict({
  pt: {
    back: 'Voltar para o início',
    inForce: 'Em vigor • LGPD, Lei nº 13.709/2018',
    updated: '{versao} • Atualizado em {data}',
    print: 'Imprimir ou salvar em PDF',
    copy: 'Copiar o link desta página',
    copied: 'Link copiado!',
    dpoChannel: 'Canal do DPO para titulares de dados',
    indexTitle: 'Índice da política',
    indexCount: '{n} seções',
    indexShow: 'Mostrar índice',
    indexHide: 'Ocultar índice',
    dpoBoxTitle: 'Encarregado de dados (DPO)',
    dpoBoxText: 'Para requisições e dúvidas sobre seus dados sob a LGPD:',
    dpoSubjectHint: '(assunto: DPO)',
    subjectRights: 'DPO - LGPD Solicitação de direitos do titular',
    subjectPrivacy: 'DPO - Privacidade e LGPD',
    subjectExercise: 'DPO - Exercício de direitos LGPD',
    subjectService: 'DPO - Atendimento ao titular de dados',
    backToTop: 'Voltar ao topo',
  },
  en: {
    back: 'Back to home',
    inForce: 'In force • LGPD, Law No. 13,709/2018',
    updated: '{versao} • Updated on {data}',
    print: 'Print or save as PDF',
    copy: 'Copy link to this page',
    copied: 'Link copied!',
    dpoChannel: 'DPO channel for data subjects',
    indexTitle: 'Policy contents',
    indexCount: '{n} sections',
    indexShow: 'Show contents',
    indexHide: 'Hide contents',
    dpoBoxTitle: 'Data Protection Officer (DPO)',
    dpoBoxText: 'For requests and questions about your data under the LGPD:',
    dpoSubjectHint: '(subject: DPO)',
    subjectRights: 'DPO - LGPD data subject rights request',
    subjectPrivacy: 'DPO - Privacy and LGPD',
    subjectExercise: 'DPO - Exercising LGPD rights',
    subjectService: 'DPO - Data subject enquiry',
    backToTop: 'Back to top',
  },
  es: {
    back: 'Volver al inicio',
    inForce: 'En vigor • LGPD, Ley n.º 13.709/2018',
    updated: '{versao} • Actualizada el {data}',
    print: 'Imprimir o guardar en PDF',
    copy: 'Copiar el enlace de esta página',
    copied: '¡Enlace copiado!',
    dpoChannel: 'Canal del DPO para titulares de datos',
    indexTitle: 'Índice de la política',
    indexCount: '{n} secciones',
    indexShow: 'Mostrar índice',
    indexHide: 'Ocultar índice',
    dpoBoxTitle: 'Delegado de protección de datos (DPO)',
    dpoBoxText: 'Para solicitudes y dudas sobre tus datos conforme a la LGPD:',
    dpoSubjectHint: '(asunto: DPO)',
    subjectRights: 'DPO - LGPD Solicitud de derechos del titular',
    subjectPrivacy: 'DPO - Privacidad y LGPD',
    subjectExercise: 'DPO - Ejercicio de derechos LGPD',
    subjectService: 'DPO - Atención al titular de los datos',
    backToTop: 'Volver arriba',
  },
  fr: {
    back: 'Retour à l’accueil',
    inForce: 'En vigueur • LGPD, loi n° 13.709/2018',
    updated: '{versao} • Mise à jour le {data}',
    print: 'Imprimer ou enregistrer en PDF',
    copy: 'Copier le lien de cette page',
    copied: 'Lien copié !',
    dpoChannel: 'Canal du DPO pour les personnes concernées',
    indexTitle: 'Sommaire de la politique',
    indexCount: '{n} sections',
    indexShow: 'Afficher le sommaire',
    indexHide: 'Masquer le sommaire',
    dpoBoxTitle: 'Délégué à la protection des données (DPO)',
    dpoBoxText: 'Pour toute demande ou question sur vos données au titre de la LGPD :',
    dpoSubjectHint: '(objet : DPO)',
    subjectRights: 'DPO - LGPD Demande d’exercice des droits',
    subjectPrivacy: 'DPO - Confidentialité et LGPD',
    subjectExercise: 'DPO - Exercice des droits LGPD',
    subjectService: 'DPO - Demande d’une personne concernée',
    backToTop: 'Retour en haut',
  },
});
