import type { PoliticaTexto } from './politica.i18n';

// A LGPD (lei brasileira) continua sendo a norma aplicável; os termos seguem a tradução
// consagrada em inglês: controlador = controller, operador = processor, titular = data subject.
export const EN: PoliticaTexto = {
  secoes: {
    identificacao: {
      menu: 'Company details and DPO',
      kicker: 'Corporate structure',
      title: 'Company identification and Data Protection Officer (DPO)',
    },
    principios: {
      menu: 'LGPD principles and governance',
      kicker: 'Core guidelines',
      title: 'Data protection principles and governance',
    },
    'dados-coletados': {
      menu: 'Personal data we collect',
      kicker: 'Information collection',
      title: 'Personal data collected and how we collect it',
    },
    'controlador-operador': {
      menu: 'LGPD roles: controller and processor',
      kicker: 'Allocation of responsibilities',
      title: 'Roles under the LGPD: when we act as controller and when as processor',
    },
    'bases-legais': {
      menu: 'Legal bases and purposes',
      kicker: 'Lawfulness of processing',
      title: 'Legal bases and purposes (Art. 7 of the LGPD)',
    },
    seguranca: {
      menu: 'Security and data retention',
      kicker: 'Active protection',
      title: 'Information security and retention periods',
    },
    compartilhamento: {
      menu: 'Sharing with third parties',
      kicker: 'Third-party relationships',
      title: 'Sharing data with third parties',
    },
    cookies: {
      menu: 'Cookie policy',
      kicker: 'Web tracking',
      title: 'Cookie and local storage policy',
    },
    'direitos-titular': {
      menu: 'Data subject rights (Art. 18 of the LGPD)',
      kicker: 'Fundamental guarantees',
      title: 'Your rights as a data subject (Art. 18 of the LGPD)',
    },
    'termos-uso': {
      menu: 'Terms of use and intellectual property',
      kicker: 'Conditions of use',
      title: 'Terms of use and intellectual property',
    },
    'contato-dpo': {
      menu: 'Contact channel and DPO',
      kicker: 'Final provisions',
      title: 'Official DPO channel, updates and jurisdiction',
    },
  },

  hero: {
    kicker: 'Digital governance, privacy and terms of use',
    titlePre: 'Privacy policy,',
    titleHl: 'data security',
    titlePost: 'and terms of use',
    intro:
      '<strong>UNRENDER Software</strong> is committed to protecting your privacy and your data with transparency, ethics and technical rigor. This document explains how we collect, process, protect and share personal data when you use our corporate website (<a href="https://unrender.pro">unrender.pro</a>), our SaaS platforms (<strong>CTRLB</strong>, <strong>Kardapio.Delivery</strong>, <strong>Aqui.shopping</strong>) and our On-Premise deployments.',
  },

  s1: {
    intro:
      'UNRENDER Software develops, licenses, customizes and supports business software, artificial intelligence solutions, web and mobile platforms, and integrated retail automation.',
    controllerLabel: 'Data controller',
    taxId: 'CNPJ (Brazilian company tax ID): 46.276.782/0001-97',
    hqLabel: 'Head office',
    address: 'R. da Cereja, 11 - Bosque da Saúde, Cuiabá - MT',
    zip: 'CEP (postal code): 78050-020 • Brazil',
    dpoTitle: 'Direct line to the DPO (Data Protection Officer)',
    dpoText:
      'Pursuant to Article 41 of Law No. 13,709/2018 (LGPD, Brazil’s General Data Protection Law), any request, inquiry or communication with the Brazilian National Data Protection Authority (ANPD) must be sent to {mail:privacy} (with the subject <strong>DPO</strong>) or made by phone on our business line, <strong>+55 65 99920-7154</strong>.',
  },

  s2: {
    intro:
      'All data processing carried out by UNRENDER is guided by good faith and by the fundamental principles set out in Article 6 of the LGPD:',
    cards: [
      {
        title: 'Purpose and adequacy',
        text: 'Data is processed solely for legitimate, specific and transparent purposes disclosed to the data subject.',
      },
      {
        title: 'Necessity (data minimization)',
        text: 'We collect only the data that is strictly relevant and indispensable to provide the agreed services.',
      },
      {
        title: 'Free access and transparency',
        text: 'Data subjects are guaranteed easy, free-of-charge access to information about the accuracy of their data and how it is processed.',
      },
      {
        title: 'Security and prevention',
        text: 'We use technical and administrative measures capable of protecting personal data from unauthorized access or leaks.',
      },
    ],
  },

  s3: {
    intro: 'We collect data through different channels and in different contexts, grouped into three main categories:',
    grupos: [
      {
        title: 'A. Data provided directly by the user',
        badge: 'Forms and contact',
        lead: 'When you request a quote, a demo or support on our website or through our official WhatsApp:',
        itens: [
          'Full name and job title/company',
          'Business or personal email address',
          'Phone / WhatsApp number',
          'Details of the technical request or the service requested',
        ],
      },
      {
        title: 'B. Browsing data and technical logs (Marco Civil)',
        badge: 'Automatic',
        lead: 'To comply with Article 15 of Law No. 12,965/2014 (Marco Civil da Internet, Brazil’s Internet Civil Framework) and to keep our infrastructure stable:',
        itens: [
          'IP address with the date, time and time zone of the connection',
          'Browser type and version, screen resolution and operating system',
          'Pages visited, time spent on each and navigation path',
        ],
      },
      {
        title: 'C. Registration and billing data of contracting customers',
        badge: 'B2B contracts',
        lead: 'To formalize contracts and to bill SaaS licenses and hardware supply:',
        itens: [
          'Corporate name, trade name, CNPJ (company tax ID) and state/municipal registration numbers',
          'Name, CPF (individual tax ID) and email address of legal representatives and system administrators',
          'Billing address and equipment delivery address',
        ],
      },
    ],
  },

  s4: {
    intro:
      'Because we operate both as a business software developer and as the provider of a multi-service ecosystem, our role under the LGPD depends on how our products are used:',
    controller: {
      title: 'UNRENDER as controller',
      p1: 'When you visit <strong>unrender.pro</strong>, ask us to contact you, buy hardware or enter into a commercial agreement with us.',
      p2: 'In this scenario, we determine the purposes and means of processing, strictly within contractual and regulatory limits.',
    },
    processor: {
      title: 'UNRENDER as processor',
      p1: 'When your company uses <strong>CTRLB (SGA)</strong>, <strong>Kardapio.Delivery</strong> or <strong>Aqui.shopping</strong> to manage its own customers, orders and employees.',
      p2: '<strong>Your company is the controller of the data</strong> of its customers and students; UNRENDER acts merely as the technical processor, under a data processing agreement (DPA).',
    },
    onprem: {
      title: 'Exclusive highlight: On-Premise deployments',
      text: 'For customers who contract <strong>CTRLB On-Premise</strong>, installed on their own local physical servers or private clouds, UNRENDER <strong>does not store, does not mirror and has no routine access</strong> to your company’s database or operations. The data resides exclusively in the custody and on the infrastructure of the contracting customer, ensuring full sovereignty.',
    },
  },

  s5: {
    intro:
      'In compliance with Brazilian law, all data processing carried out by UNRENDER is supported by a valid legal basis:',
    cols: ['Purpose of processing', 'Data used', 'Legal basis (LGPD)'],
    rows: [
      [
        'Responding to quote requests and sales contact',
        'Name, email, phone, message',
        'Preliminary procedures related to a contract (Art. 7, V)',
      ],
      [
        'Performing SaaS subscriptions and delivering hardware',
        'Registration data, CNPJ/CPF, address, logins',
        'Performance of a contract (Art. 7, V)',
      ],
      [
        'Keeping connection records (IP addresses and times)',
        'IP address, date, time, logical port',
        'Compliance with a legal obligation (Art. 7, II, in conjunction with the Marco Civil)',
      ],
      [
        'Fraud prevention and infrastructure security',
        'Technical telemetry, error logs, user agent',
        'Legitimate interest of the controller (Art. 7, IX)',
      ],
      [
        'Issuing invoices and meeting accounting obligations',
        'Billing and tax data',
        'Legal tax obligation (Art. 7, II)',
      ],
    ],
  },

  s6: {
    intro:
      'We adopt the world’s best technical practices in cybersecurity and software engineering to safeguard the integrity, confidentiality and availability of data:',
    cards: [
      {
        title: 'Strong encryption',
        text: 'HTTPS traffic with mandatory TLS 1.3 and encryption keys at rest in managed databases.',
      },
      {
        title: 'Access control',
        text: 'Principle of least privilege (PoLP), audit logs and multi-factor authentication for administration.',
      },
      {
        title: 'Backups and redundancy',
        text: 'Automated backup routines with logical isolation to prevent data loss or ransomware.',
      },
    ],
    retentionTitle: 'Data retention periods',
    retention: [
      {
        label: 'Application access logs:',
        text: '6 months, as required by Article 15 of the Marco Civil da Internet.',
      },
      {
        label: 'Contract and tax data:',
        text: '5 years after the contract ends (to comply with the civil and tax limitation periods of the Brazilian National Tax Code and Civil Code).',
      },
      {
        label: 'Leads and sales contacts:',
        text: 'kept for as long as the data subject’s interest in the relationship lasts, and deleted immediately upon withdrawal or a formal request from the data subject.',
      },
    ],
  },

  s7: {
    notice:
      '<strong>No-sale clause:</strong> UNRENDER Software <strong>never sells, rents, trades or monetizes</strong> contact lists, user data or customer databases with data brokers or third-party companies for unsolicited advertising purposes.',
    intro: 'Data is shared on a strictly limited basis, only in the following essential situations:',
    itens: [
      {
        label: 'Cloud and hosting providers:',
        text: 'high-security data centers (such as approved local and international providers) that process data under strict confidentiality terms and in compliance with the LGPD and the GDPR.',
      },
      {
        label: 'Payment gateways and financial institutions:',
        text: 'only the data strictly necessary to settle subscriptions and to process payments by credit card, boleto (Brazilian bank slip) or Pix.',
      },
      {
        label: 'Carriers and logistics:',
        text: 'for the physical shipment of equipment, POS kits and approved printers purchased from the Unrender Store.',
      },
      {
        label: 'Public authorities and court orders:',
        text: 'when strictly required by law, by a court order or by a formal request from the ANPD.',
      },
    ],
  },

  s8: {
    intro:
      'Cookies and local storage tokens (Local Storage and Session Storage) are small files stored on your device to ensure that UNRENDER’s pages work properly:',
    cards: [
      {
        title: 'Strictly necessary cookies',
        text: 'Essential for secure browsing, authentication control in restricted areas, load balancing and protection against CSRF/DDoS attacks.',
      },
      {
        title: 'Analytics and performance cookies',
        text: 'They collect anonymous usage metrics (such as most visited pages, error rates and loading times) to help us optimize the speed and stability of the application.',
      },
    ],
    note: 'You can disable or delete cookies at any time in your browser settings (Google Chrome, Mozilla Firefox, Safari, Microsoft Edge). Please note that disabling strictly necessary cookies may affect the functionality of the logged-in areas of our systems.',
  },

  s9: {
    intro:
      'The LGPD guarantees you, as a personal data subject, the right to request the following from UNRENDER at any time, simply and free of charge:',
    rights: [
      {
        title: 'Confirmation and access:',
        text: 'To know whether we process your data and to request a copy of it.',
      },
      {
        title: 'Correction and updating:',
        text: 'To correct incomplete, inaccurate or outdated personal data.',
      },
      {
        title: 'Anonymization or blocking:',
        text: 'To request the deletion of unnecessary or excessive data.',
      },
      {
        title: 'Data portability:',
        text: 'To receive your data in a structured, interoperable format.',
      },
      {
        title: 'Deletion of data:',
        text: 'Erasure of data processed on the basis of prior consent.',
      },
      {
        title: 'Withdrawal of consent:',
        text: 'To withdraw, at any time, consent you have previously given.',
      },
    ],
    howTitle: 'How do you exercise your rights?',
    howText:
      'Send your request, stating your name and the right you wish to exercise, to {mail:exercise}, with the subject <strong>DPO</strong>. Our Data Protection Officer will reply within the legal time limit set by the ANPD.',
  },

  s10: {
    intro:
      'By accessing UNRENDER’s corporate website or using our solutions under a SaaS or On-Premise license, you agree to the following conditions of use:',
    itens: [
      {
        label: 'Intellectual property:',
        text: 'all source code, architecture, trademarks, logos, designs, interfaces, patents and technical documentation associated with the UNRENDER, CTRLB, Kardapio.Delivery and Aqui.shopping products belong exclusively to UNRENDER Software LTDA or its authorized licensors.',
      },
      {
        label: 'Express prohibitions:',
        text: 'reverse engineering, decompilation, unauthorized scraping, denial-of-service (DDoS) attacks and any conduct that compromises the integrity of the servers or attempts to breach multi-tenant isolation are strictly prohibited.',
      },
      {
        label: 'Availability and SLA:',
        text: 'we apply the highest availability standards to our cloud services. Scheduled maintenance windows are announced to contracting customers in advance through the official channels.',
      },
      {
        label: 'Limitation of liability:',
        text: 'UNRENDER is not liable for the customer’s misuse of the tools, for losses arising from credentials improperly shared by users, or for instabilities originating exclusively from the user’s own connectivity providers.',
      },
    ],
  },

  s11: {
    intro:
      'This Policy may be updated periodically to reflect improvements to our systems, new features or adjustments to resolutions issued by the ANPD. We will notify registered users and display the date of the latest change at the top of this page.',
    boxTitle: 'Official contact for privacy and LGPD matters',
    dpoEmailLabel: 'Data Protection Officer (DPO) email:',
    supportLabel: 'General support and operations:',
    phoneLabel: 'Business phone / WhatsApp:',
    phone: '+55 65 99920-7154',
    venueLabel: 'Chosen jurisdiction:',
    venue: 'Courts of the judicial district (comarca) of Cuiabá, State of Mato Grosso, Brazil',
  },
};
