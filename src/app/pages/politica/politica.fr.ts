import type { PoliticaTexto } from './politica.i18n';

// A LGPD (lei brasileira) continua sendo a norma aplicável. Terminologia em francês:
// controlador = responsable du traitement, operador = sous-traitant,
// encarregado (DPO) = délégué à la protection des données, titular = personne concernée.
export const FR: PoliticaTexto = {
  secoes: {
    identificacao: {
      menu: 'Identification et délégué (DPO)',
      kicker: 'Structure de l’entreprise',
      title: 'Identification de l’entreprise et délégué à la protection des données (DPO)',
    },
    principios: {
      menu: 'Principes et gouvernance LGPD',
      kicker: 'Lignes directrices',
      title: 'Principes et gouvernance de la protection des données',
    },
    'dados-coletados': {
      menu: 'Données personnelles collectées',
      kicker: 'Collecte d’informations',
      title: 'Données personnelles collectées et modes de collecte',
    },
    'controlador-operador': {
      menu: 'Rôles LGPD : responsable et sous-traitant',
      kicker: 'Répartition des responsabilités',
      title: 'Rôles au sens de la LGPD : quand nous sommes responsable du traitement et quand nous sommes sous-traitant',
    },
    'bases-legais': {
      menu: 'Bases légales et finalités',
      kicker: 'Licéité du traitement',
      title: 'Bases légales et finalités (art. 7 de la LGPD)',
    },
    seguranca: {
      menu: 'Sécurité et conservation des données',
      kicker: 'Protection active',
      title: 'Sécurité de l’information et durées de conservation',
    },
    compartilhamento: {
      menu: 'Partage avec des tiers',
      kicker: 'Relations avec les tiers',
      title: 'Partage de données avec des tiers',
    },
    cookies: {
      menu: 'Politique de cookies',
      kicker: 'Traçabilité web',
      title: 'Politique de cookies et de stockage local',
    },
    'direitos-titular': {
      menu: 'Droits de la personne concernée (art. 18 de la LGPD)',
      kicker: 'Garanties fondamentales',
      title: 'Vos droits en tant que personne concernée (art. 18 de la LGPD)',
    },
    'termos-uso': {
      menu: 'Conditions d’utilisation et propriété intellectuelle',
      kicker: 'Conditions d’utilisation',
      title: 'Conditions d’utilisation et propriété intellectuelle',
    },
    'contato-dpo': {
      menu: 'Contact et DPO',
      kicker: 'Dispositions finales',
      title: 'Canal officiel du DPO, mises à jour et juridiction compétente',
    },
  },

  hero: {
    kicker: 'Gouvernance numérique, confidentialité et conditions d’utilisation',
    titlePre: 'Politique de confidentialité,',
    titleHl: 'sécurité des données',
    titlePost: 'et conditions d’utilisation',
    intro:
      '<strong>UNRENDER Software</strong> s’engage à protéger votre vie privée et vos données avec transparence, éthique et rigueur technique. Ce document détaille la manière dont nous collectons, traitons, protégeons et partageons les données personnelles lors de l’utilisation de notre site institutionnel (<a href="https://unrender.pro">unrender.pro</a>), de nos plateformes SaaS (<strong>CTRLB</strong>, <strong>Kardapio.Delivery</strong>, <strong>Aqui.shopping</strong>) et de nos déploiements On-Premise.',
  },

  s1: {
    intro:
      'UNRENDER Software assure le développement, la concession de licences, la personnalisation et le support de logiciels d’entreprise, de solutions d’intelligence artificielle, de plateformes web et mobiles et de solutions intégrées d’automatisation commerciale.',
    controllerLabel: 'Responsable du traitement',
    taxId: 'CNPJ (numéro d’identification fiscale brésilien des entreprises) : 46.276.782/0001-97',
    hqLabel: 'Siège administratif',
    address: 'R. da Cereja, 11 - Bosque da Saúde, Cuiabá - MT',
    zip: 'CEP (code postal) : 78050-020 • Brésil',
    dpoTitle: 'Canal direct du DPO (Data Protection Officer)',
    dpoText:
      'Conformément à l’art. 41 de la loi n° 13.709/2018 (LGPD, loi générale brésilienne sur la protection des données), toute demande, question ou communication avec l’Autorité nationale de protection des données du Brésil (ANPD) doit être adressée par e-mail à {mail:privacy} (avec l’objet <strong>DPO</strong>) ou par téléphone à notre ligne commerciale, au <strong>+55 65 99920-7154</strong>.',
  },

  s2: {
    intro:
      'Toutes les opérations de traitement de données réalisées par UNRENDER sont guidées par la bonne foi et par les principes fondamentaux de l’article 6 de la LGPD :',
    cards: [
      {
        title: 'Finalité et adéquation',
        text: 'Le traitement est réalisé exclusivement à des fins légitimes, spécifiques et transparentes, portées à la connaissance de la personne concernée.',
      },
      {
        title: 'Nécessité (minimisation)',
        text: 'Nous ne collectons que les données strictement pertinentes et indispensables à la fourniture des services convenus.',
      },
      {
        title: 'Libre accès et transparence',
        text: 'Les personnes concernées bénéficient d’une consultation simple et gratuite sur l’exactitude de leurs données et sur la manière dont elles sont traitées.',
      },
      {
        title: 'Sécurité et prévention',
        text: 'Nous appliquons des mesures techniques et administratives propres à protéger les données personnelles contre les accès non autorisés et les fuites.',
      },
    ],
  },

  s3: {
    intro: 'Nous collectons des données par différents canaux et dans différents contextes, répartis en trois catégories principales :',
    grupos: [
      {
        title: 'A. Données fournies directement par l’utilisateur',
        badge: 'Formulaires et contact',
        lead: 'Lorsque vous demandez un devis, une démonstration ou une assistance sur notre site ou via notre WhatsApp officiel :',
        itens: [
          'Nom complet et fonction/entreprise',
          'Adresse e-mail professionnelle ou personnelle',
          'Numéro de téléphone / WhatsApp',
          'Détails du besoin technique ou du service demandé',
        ],
      },
      {
        title: 'B. Données de navigation et journaux techniques (Marco Civil)',
        badge: 'Automatique',
        lead: 'Pour respecter l’art. 15 de la loi n° 12.965/2014 (Marco Civil da Internet, le cadre civil brésilien de l’internet) et assurer la stabilité de l’infrastructure :',
        itens: [
          'Adresse IP avec la date, l’heure et le fuseau horaire de la connexion',
          'Type et version du navigateur, résolution d’écran et système d’exploitation',
          'Pages consultées, durée de visite et parcours de navigation',
        ],
      },
      {
        title: 'C. Données d’enregistrement et de facturation des clients contractants',
        badge: 'Contrats B2B',
        lead: 'Pour formaliser les contrats et facturer les licences SaaS et la fourniture de matériel :',
        itens: [
          'Raison sociale, nom commercial, CNPJ (identifiant fiscal des entreprises) et immatriculation au niveau de l’État ou de la commune',
          'Nom, CPF (identifiant fiscal des personnes physiques) et e-mail des représentants légaux et des administrateurs du système',
          'Adresse de facturation et adresse de livraison du matériel',
        ],
      },
    ],
  },

  s4: {
    intro:
      'Parce que nous sommes à la fois éditeur de logiciels d’entreprise et fournisseur d’un écosystème multiservice, notre rôle au sens de la LGPD dépend du mode d’utilisation :',
    controller: {
      title: 'UNRENDER en tant que responsable du traitement (« controlador » dans la LGPD)',
      p1: 'Lorsque vous consultez le site <strong>unrender.pro</strong>, demandez à être contacté, achetez du matériel ou concluez un contrat commercial avec nous.',
      p2: 'Dans ce cas, nous décidons des finalités et des moyens du traitement, dans les strictes limites contractuelles et réglementaires.',
    },
    processor: {
      title: 'UNRENDER en tant que sous-traitant (« operador » dans la LGPD)',
      p1: 'Lorsque votre entreprise utilise <strong>CTRLB (SGA)</strong>, <strong>Kardapio.Delivery</strong> ou <strong>Aqui.shopping</strong> pour gérer ses propres clients, commandes et salariés.',
      p2: '<strong>Votre entreprise est le responsable du traitement des données</strong> de ses clients et élèves ; UNRENDER agit comme simple sous-traitant technique, dans le cadre d’un accord de traitement des données (DPA).',
    },
    onprem: {
      title: 'Point fort exclusif : les déploiements On-Premise',
      text: 'Pour les clients qui souscrivent à <strong>CTRLB On-Premise</strong>, installé sur leurs propres serveurs physiques locaux ou clouds privés, UNRENDER <strong>ne stocke pas, ne réplique pas et n’a aucun accès courant</strong> à la base de données ni aux opérations de votre entreprise. Les données résident exclusivement sous la garde et sur l’infrastructure du client, ce qui garantit une souveraineté totale.',
    },
  },

  s5: {
    intro:
      'Conformément à la législation brésilienne, tout traitement de données réalisé par UNRENDER repose sur une base légale valide :',
    cols: ['Finalité du traitement', 'Données utilisées', 'Base légale (LGPD)'],
    rows: [
      [
        'Réponse aux demandes de devis et contact commercial',
        'Nom, e-mail, téléphone, message',
        'Mesures précontractuelles (art. 7, V)',
      ],
      [
        'Exécution des abonnements SaaS et livraison de matériel',
        'Données d’enregistrement, CNPJ/CPF, adresse, identifiants de connexion',
        'Exécution d’un contrat (art. 7, V)',
      ],
      [
        'Conservation des journaux de connexion (adresses IP et horaires)',
        'Adresse IP, date, heure, port logique',
        'Respect d’une obligation légale (art. 7, II, en lien avec le Marco Civil)',
      ],
      [
        'Prévention de la fraude et sécurité de l’infrastructure',
        'Télémétrie technique, journaux d’erreurs, user-agent',
        'Intérêt légitime du responsable du traitement (art. 7, IX)',
      ],
      [
        'Émission de factures et obligations comptables',
        'Données de facturation et données fiscales',
        'Obligation légale fiscale (art. 7, II)',
      ],
    ],
  },

  s6: {
    intro:
      'Nous appliquons les meilleures pratiques techniques mondiales en matière de cybersécurité et d’ingénierie logicielle pour préserver l’intégrité, la confidentialité et la disponibilité des données :',
    cards: [
      {
        title: 'Chiffrement robuste',
        text: 'Trafic HTTPS avec TLS 1.3 obligatoire et clés de chiffrement au repos dans les bases de données managées.',
      },
      {
        title: 'Contrôle d’accès',
        text: 'Principe du moindre privilège (PoLP), journaux d’audit et authentification multifacteur pour l’administration.',
      },
      {
        title: 'Sauvegardes et redondance',
        text: 'Sauvegardes automatisées avec isolation logique pour prévenir la perte de données et les rançongiciels.',
      },
    ],
    retentionTitle: 'Durées de conservation des données',
    retention: [
      {
        label: 'Journaux d’accès à l’application :',
        text: '6 mois, comme l’exige l’art. 15 du Marco Civil da Internet.',
      },
      {
        label: 'Données contractuelles et fiscales :',
        text: '5 ans après la fin du contrat (afin de respecter les délais de prescription civils et fiscaux prévus par le Code fiscal national et le Code civil brésiliens).',
      },
      {
        label: 'Prospects et contacts commerciaux :',
        text: 'conservés tant que perdure l’intérêt de la personne concernée pour la relation, et supprimés immédiatement en cas de retrait ou de demande formelle de sa part.',
      },
    ],
  },

  s7: {
    notice:
      '<strong>Clause de non-commercialisation :</strong> UNRENDER Software <strong>ne vend, ne loue, n’échange et ne monétise jamais</strong> de listes de contacts, de données d’utilisateurs ni de bases clients auprès de courtiers en données (data brokers) ou d’entreprises tierces à des fins publicitaires non sollicitées.',
    intro: 'Le partage de données n’a lieu que de manière strictement limitée, dans les situations essentielles suivantes :',
    itens: [
      {
        label: 'Fournisseurs de cloud et d’hébergement :',
        text: 'centres de données hautement sécurisés (tels que des prestataires locaux et internationaux agréés) qui traitent les données sous de stricts engagements de confidentialité et dans le respect de la LGPD et du RGPD.',
      },
      {
        label: 'Passerelles de paiement et établissements financiers :',
        text: 'uniquement les données strictement nécessaires au règlement des abonnements et au traitement des paiements par carte bancaire, boleto (bordereau de paiement bancaire brésilien) ou Pix.',
      },
      {
        label: 'Transporteurs et logistique :',
        text: 'pour l’expédition physique du matériel, des kits de point de vente et des imprimantes homologuées achetés dans la Boutique Unrender.',
      },
      {
        label: 'Autorités publiques et décisions de justice :',
        text: 'lorsque cela est strictement exigé par la loi, par une décision de justice ou par une demande formelle de l’ANPD.',
      },
    ],
  },

  s8: {
    intro:
      'Les cookies et les jetons de stockage local (Local Storage et Session Storage) sont de petits fichiers enregistrés sur votre appareil pour garantir le bon fonctionnement des pages d’UNRENDER :',
    cards: [
      {
        title: 'Cookies strictement nécessaires',
        text: 'Indispensables à une navigation sécurisée, au contrôle de l’authentification dans les espaces restreints, à la répartition de charge et à la protection contre les attaques CSRF/DDoS.',
      },
      {
        title: 'Cookies d’analyse et de performance',
        text: 'Ils collectent des mesures d’utilisation anonymes (pages les plus consultées, taux d’erreur, temps de chargement, par exemple) pour nous aider à optimiser la rapidité et la stabilité de l’application.',
      },
    ],
    note: 'Vous pouvez désactiver ou supprimer les cookies à tout moment dans les paramètres de votre navigateur (Google Chrome, Mozilla Firefox, Safari, Microsoft Edge). Notez que la désactivation des cookies strictement nécessaires peut affecter le fonctionnement des espaces connectés de nos systèmes.',
  },

  s9: {
    intro:
      'La LGPD vous garantit, en tant que personne concernée, le droit de demander à UNRENDER, à tout moment, simplement et gratuitement :',
    rights: [
      {
        title: 'Confirmation et accès :',
        text: 'Savoir si nous traitons vos données et en demander une copie.',
      },
      {
        title: 'Rectification et mise à jour :',
        text: 'Corriger des données personnelles incomplètes, inexactes ou obsolètes.',
      },
      {
        title: 'Anonymisation ou blocage :',
        text: 'Demander la suppression des données inutiles ou excessives.',
      },
      {
        title: 'Portabilité des données :',
        text: 'Recevoir vos données dans un format structuré et interopérable.',
      },
      {
        title: 'Suppression des données :',
        text: 'Effacement des données traitées sur la base d’un consentement préalable.',
      },
      {
        title: 'Retrait du consentement :',
        text: 'Retirer, à tout moment, un consentement donné précédemment.',
      },
    ],
    howTitle: 'Comment exercer vos droits ?',
    howText:
      'Envoyez votre demande, en indiquant votre nom et le droit que vous souhaitez exercer, par e-mail à {mail:exercise}, avec l’objet <strong>DPO</strong>. Notre délégué à la protection des données répondra dans le délai légal fixé par l’ANPD.',
  },

  s10: {
    intro:
      'En accédant au site institutionnel d’UNRENDER ou en utilisant nos solutions sous licence SaaS ou On-Premise, vous acceptez les conditions d’utilisation suivantes :',
    itens: [
      {
        label: 'Propriété intellectuelle :',
        text: 'l’ensemble des codes sources, de l’architecture, des marques, des logos, des designs, des interfaces, des brevets et de la documentation technique associés aux produits UNRENDER, CTRLB, Kardapio.Delivery et Aqui.shopping appartient exclusivement à UNRENDER Software LTDA ou à ses concédants de licence autorisés.',
      },
      {
        label: 'Interdictions expresses :',
        text: 'il est formellement interdit de procéder à de l’ingénierie inverse, à de la décompilation, à du scraping non autorisé, à des attaques par déni de service (DDoS) ou à tout comportement compromettant l’intégrité des serveurs ou visant à contourner l’isolation multi-locataire (multi-tenant).',
      },
      {
        label: 'Disponibilité et SLA :',
        text: 'nous appliquons les standards de disponibilité les plus élevés à nos services cloud. Les fenêtres de maintenance programmée sont annoncées à l’avance aux clients par les canaux officiels.',
      },
      {
        label: 'Limitation de responsabilité :',
        text: 'UNRENDER n’est pas responsable de la mauvaise utilisation des outils par le client, des pertes résultant d’identifiants indûment partagés par des utilisateurs, ni des instabilités provenant exclusivement des fournisseurs de connectivité de l’utilisateur lui-même.',
      },
    ],
  },

  s11: {
    intro:
      'La présente Politique pourra être mise à jour périodiquement afin de refléter les améliorations de nos systèmes, de nouvelles fonctionnalités ou des adaptations aux résolutions émises par l’ANPD. Nous en informerons les utilisateurs enregistrés et afficherons la date de la dernière modification en haut de cette page.',
    boxTitle: 'Contact officiel pour la confidentialité et la LGPD',
    dpoEmailLabel: 'E-mail du délégué à la protection des données (DPO) :',
    supportLabel: 'Support général et opérations :',
    phoneLabel: 'Téléphone / WhatsApp commercial :',
    phone: '+55 65 99920-7154',
    venueLabel: 'Juridiction compétente :',
    venue: 'Tribunaux de la circonscription judiciaire (comarca) de Cuiabá, État du Mato Grosso, Brésil',
  },
};
