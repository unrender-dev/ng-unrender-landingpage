import type { PoliticaTexto } from './politica.i18n';

// A LGPD (lei brasileira) continua sendo a norma aplicável. Terminologia em espanhol:
// controlador = responsable del tratamiento, operador = encargado del tratamiento,
// encarregado (DPO) = delegado de protección de datos, titular = titular de los datos.
export const ES: PoliticaTexto = {
  secoes: {
    identificacao: {
      menu: 'Identificación y delegado (DPO)',
      kicker: 'Estructura corporativa',
      title: 'Identificación de la empresa y delegado de protección de datos (DPO)',
    },
    principios: {
      menu: 'Principios y gobernanza LGPD',
      kicker: 'Directrices fundamentales',
      title: 'Principios y gobernanza de la protección de datos',
    },
    'dados-coletados': {
      menu: 'Datos personales recogidos',
      kicker: 'Recogida de información',
      title: 'Datos personales recogidos y formas de recogida',
    },
    'controlador-operador': {
      menu: 'Roles LGPD: responsable y encargado',
      kicker: 'Reparto de responsabilidades',
      title: 'Roles en la LGPD: cuándo somos responsable y cuándo encargado del tratamiento',
    },
    'bases-legais': {
      menu: 'Bases jurídicas y finalidades',
      kicker: 'Licitud del tratamiento',
      title: 'Bases jurídicas y finalidades (art. 7 de la LGPD)',
    },
    seguranca: {
      menu: 'Seguridad y conservación de datos',
      kicker: 'Protección activa',
      title: 'Seguridad de la información y plazos de conservación',
    },
    compartilhamento: {
      menu: 'Comunicación a terceros',
      kicker: 'Relaciones con terceros',
      title: 'Comunicación de datos a terceros',
    },
    cookies: {
      menu: 'Política de cookies',
      kicker: 'Trazabilidad web',
      title: 'Política de cookies y almacenamiento local',
    },
    'direitos-titular': {
      menu: 'Derechos del titular (art. 18 de la LGPD)',
      kicker: 'Garantías fundamentales',
      title: 'Tus derechos como titular de los datos (art. 18 de la LGPD)',
    },
    'termos-uso': {
      menu: 'Términos de uso y propiedad intelectual',
      kicker: 'Condiciones de uso',
      title: 'Términos de uso y propiedad intelectual',
    },
    'contato-dpo': {
      menu: 'Canal de atención y DPO',
      kicker: 'Disposiciones finales',
      title: 'Canal oficial del DPO, actualizaciones y fuero',
    },
  },

  hero: {
    kicker: 'Gobernanza digital, privacidad y términos de uso',
    titlePre: 'Política de privacidad,',
    titleHl: 'seguridad de los datos',
    titlePost: 'y términos de uso',
    intro:
      '<strong>UNRENDER Software</strong> asume el compromiso de proteger tu privacidad y tus datos con transparencia, ética y rigor técnico. Este documento detalla cómo recogemos, tratamos, protegemos y comunicamos datos personales en el uso de nuestro portal institucional (<a href="https://unrender.pro">unrender.pro</a>), de las plataformas SaaS (<strong>CTRLB</strong>, <strong>Kardapio.Delivery</strong>, <strong>Aqui.shopping</strong>) y de nuestras implantaciones On-Premise.',
  },

  s1: {
    intro:
      'UNRENDER Software se dedica al desarrollo, la concesión de licencias, la personalización y el soporte de software empresarial, soluciones de inteligencia artificial, plataformas web y móviles y automatización comercial integrada.',
    controllerLabel: 'Responsable del tratamiento',
    taxId: 'CNPJ (identificación fiscal brasileña de empresas): 46.276.782/0001-97',
    hqLabel: 'Sede administrativa',
    address: 'R. da Cereja, 11 - Bosque da Saúde, Cuiabá - MT',
    zip: 'CEP (código postal): 78050-020 • Brasil',
    dpoTitle: 'Canal directo del DPO (Data Protection Officer)',
    dpoText:
      'De conformidad con el art. 41 de la Ley n.º 13.709/2018 (LGPD, Ley General de Protección de Datos de Brasil), cualquier solicitud, consulta o comunicación con la Autoridad Nacional de Protección de Datos de Brasil (ANPD) debe dirigirse al correo {mail:privacy} (con el asunto <strong>DPO</strong>) o al teléfono comercial <strong>+55 65 99920-7154</strong>.',
  },

  s2: {
    intro:
      'Todas las operaciones de tratamiento de datos realizadas por UNRENDER se rigen por la buena fe y por los principios fundamentales del artículo 6 de la LGPD:',
    cards: [
      {
        title: 'Finalidad y adecuación',
        text: 'El tratamiento se realiza exclusivamente para fines legítimos, específicos y transparentes, informados al titular.',
      },
      {
        title: 'Necesidad (minimización)',
        text: 'Recogemos únicamente los datos estrictamente pertinentes e indispensables para prestar los servicios acordados.',
      },
      {
        title: 'Libre acceso y transparencia',
        text: 'Se garantiza a los titulares una consulta sencilla y gratuita sobre la exactitud de sus datos y la forma en que se tratan.',
      },
      {
        title: 'Seguridad y prevención',
        text: 'Aplicamos medidas técnicas y administrativas aptas para proteger los datos personales frente a accesos no autorizados o filtraciones.',
      },
    ],
  },

  s3: {
    intro: 'Recogemos datos por distintos canales y en distintos contextos, divididos en tres categorías fundamentales:',
    grupos: [
      {
        title: 'A. Datos facilitados directamente por el usuario',
        badge: 'Formularios y contacto',
        lead: 'Cuando solicitas un presupuesto, una demostración o soporte en nuestro sitio web o por el WhatsApp oficial:',
        itens: [
          'Nombre completo y cargo/empresa',
          'Correo electrónico corporativo o personal',
          'Número de teléfono / WhatsApp',
          'Detalles de la necesidad técnica o del servicio solicitado',
        ],
      },
      {
        title: 'B. Datos de navegación y registros técnicos (Marco Civil)',
        badge: 'Automático',
        lead: 'Para cumplir el art. 15 de la Ley n.º 12.965/2014 (Marco Civil da Internet, el marco civil de internet de Brasil) y garantizar la estabilidad de la infraestructura:',
        itens: [
          'Dirección IP con fecha, hora y huso horario de la conexión',
          'Tipo y versión del navegador, resolución de pantalla y sistema operativo',
          'Páginas visitadas, tiempo de permanencia y recorrido de navegación',
        ],
      },
      {
        title: 'C. Datos de registro y facturación de los clientes contratantes',
        badge: 'Contratos B2B',
        lead: 'Para formalizar los contratos y facturar las licencias SaaS y el suministro de hardware:',
        itens: [
          'Razón social, nombre comercial, CNPJ (identificación fiscal de empresas) e inscripción estatal/municipal',
          'Nombre, CPF (identificación fiscal de personas físicas) y correo electrónico de los representantes legales y administradores del sistema',
          'Dirección de facturación y de entrega de equipos',
        ],
      },
    ],
  },

  s4: {
    intro:
      'Como desarrolladores de software empresarial y proveedores de un ecosistema multiservicio, nuestro papel conforme a la LGPD se define según el modelo de uso:',
    controller: {
      title: 'UNRENDER como responsable del tratamiento («controlador» en la LGPD)',
      p1: 'Cuando accedes al sitio <strong>unrender.pro</strong>, solicitas contacto, compras hardware o firmas un contrato comercial con nosotros.',
      p2: 'En este escenario, decidimos sobre los fines y los medios del tratamiento dentro de los estrictos límites contractuales y normativos.',
    },
    processor: {
      title: 'UNRENDER como encargado del tratamiento («operador» en la LGPD)',
      p1: 'Cuando tu empresa utiliza <strong>CTRLB (SGA)</strong>, <strong>Kardapio.Delivery</strong> o <strong>Aqui.shopping</strong> para gestionar sus propios clientes, pedidos y empleados.',
      p2: '<strong>Tu empresa es la responsable del tratamiento de los datos</strong> de sus clientes y alumnos; UNRENDER actúa como mero encargado técnico, en virtud de un contrato de tratamiento de datos (DPA).',
    },
    onprem: {
      title: 'Punto destacado exclusivo: implantaciones On-Premise',
      text: 'Para los clientes que contratan <strong>CTRLB On-Premise</strong>, instalado en servidores físicos locales o en nubes privadas propias, UNRENDER <strong>no almacena, no replica y no tiene acceso rutinario</strong> a la base de datos ni a las operaciones de tu empresa. Los datos residen exclusivamente bajo la custodia y en la infraestructura del contratante, lo que garantiza una soberanía total.',
    },
  },

  s5: {
    intro:
      'De conformidad con la legislación brasileña, todo tratamiento de datos realizado por UNRENDER se apoya en una base jurídica válida:',
    cols: ['Finalidad del tratamiento', 'Datos utilizados', 'Base jurídica (LGPD)'],
    rows: [
      [
        'Atención de presupuestos y contacto comercial',
        'Nombre, correo electrónico, teléfono, mensaje',
        'Procedimientos preliminares a un contrato (art. 7, V)',
      ],
      [
        'Ejecución de suscripciones SaaS y entrega de hardware',
        'Datos de registro, CNPJ/CPF, dirección, credenciales de acceso',
        'Ejecución de un contrato (art. 7, V)',
      ],
      [
        'Conservación de registros de conexión (IP y horarios)',
        'IP, fecha, hora, puerto lógico',
        'Cumplimiento de una obligación legal (art. 7, II, en relación con el Marco Civil)',
      ],
      [
        'Prevención del fraude y seguridad de la infraestructura',
        'Telemetría técnica, registros de errores, user-agent',
        'Interés legítimo del responsable del tratamiento (art. 7, IX)',
      ],
      [
        'Emisión de facturas y rendición de cuentas contables',
        'Datos de facturación y fiscales',
        'Obligación legal tributaria (art. 7, II)',
      ],
    ],
  },

  s6: {
    intro:
      'Adoptamos las mejores prácticas técnicas mundiales de ciberseguridad e ingeniería de software para preservar la integridad, la confidencialidad y la disponibilidad de los datos:',
    cards: [
      {
        title: 'Cifrado robusto',
        text: 'Tráfico HTTPS con TLS 1.3 obligatorio y claves criptográficas en reposo en las bases de datos gestionadas.',
      },
      {
        title: 'Control de acceso',
        text: 'Principio de mínimo privilegio (PoLP), registros de auditoría y autenticación multifactor para la administración.',
      },
      {
        title: 'Copias de seguridad y redundancia',
        text: 'Rutinas automatizadas de copia de seguridad con aislamiento lógico para prevenir la pérdida de datos o el ransomware.',
      },
    ],
    retentionTitle: 'Plazos de conservación de los datos',
    retention: [
      {
        label: 'Registros de acceso a la aplicación:',
        text: '6 meses, conforme exige el art. 15 del Marco Civil da Internet.',
      },
      {
        label: 'Datos contractuales y fiscales:',
        text: '5 años tras la finalización del contrato (para cumplir los plazos de prescripción civiles y tributarios del Código Tributario Nacional y del Código Civil de Brasil).',
      },
      {
        label: 'Leads y contactos comerciales:',
        text: 'se conservan mientras perdure la relación de interés del titular y se eliminan de inmediato ante la revocación o la solicitud formal del titular.',
      },
    ],
  },

  s7: {
    notice:
      '<strong>Cláusula de no comercialización:</strong> UNRENDER Software <strong>nunca vende, alquila, intercambia ni monetiza</strong> listas de contactos, datos de usuarios o bases de registros con intermediarios de datos (data brokers) ni con terceras empresas para fines publicitarios no solicitados.',
    intro: 'La comunicación de datos se produce de forma estrictamente restringida en las siguientes situaciones esenciales:',
    itens: [
      {
        label: 'Proveedores de nube y alojamiento:',
        text: 'centros de datos de alta seguridad (como proveedores locales e internacionales homologados) que tratan los datos bajo estrictos términos de confidencialidad y de conformidad con la LGPD y el RGPD.',
      },
      {
        label: 'Pasarelas de pago e instituciones financieras:',
        text: 'solo los datos estrictamente necesarios para liquidar las suscripciones y procesar los pagos con tarjeta de crédito, boleto (recibo bancario brasileño) o Pix.',
      },
      {
        label: 'Transportistas y logística:',
        text: 'para el envío físico de equipos, kits de punto de venta e impresoras homologadas comprados en la Tienda Unrender.',
      },
      {
        label: 'Autoridades públicas y órdenes judiciales:',
        text: 'cuando lo exija estrictamente una disposición legal, una resolución judicial o un requerimiento formal de la ANPD.',
      },
    ],
  },

  s8: {
    intro:
      'Las cookies y los tokens de almacenamiento local (Local Storage y Session Storage) son pequeños archivos que se guardan en tu dispositivo para garantizar el correcto funcionamiento de las páginas de UNRENDER:',
    cards: [
      {
        title: 'Cookies estrictamente necesarias',
        text: 'Esenciales para la navegación segura, el control de la autenticación en áreas restringidas, el balanceo de carga y la prevención de ataques CSRF/DDoS.',
      },
      {
        title: 'Cookies analíticas y de rendimiento',
        text: 'Recogen métricas anónimas de uso (como las páginas más visitadas, las tasas de error y el tiempo de carga) para ayudarnos a optimizar la velocidad y la estabilidad de la aplicación.',
      },
    ],
    note: 'Puedes desactivar o borrar las cookies en cualquier momento en la configuración de tu navegador (Google Chrome, Mozilla Firefox, Safari, Microsoft Edge). Ten en cuenta que desactivar las cookies estrictamente necesarias puede afectar al funcionamiento de las áreas con sesión iniciada de los sistemas.',
  },

  s9: {
    intro:
      'La LGPD te garantiza, como titular de datos personales, el derecho a solicitar a UNRENDER en cualquier momento, de forma sencilla y gratuita:',
    rights: [
      {
        title: 'Confirmación y acceso:',
        text: 'Saber si tratamos tus datos y solicitar una copia de ellos.',
      },
      {
        title: 'Rectificación y actualización:',
        text: 'Corregir datos personales incompletos, inexactos o desactualizados.',
      },
      {
        title: 'Anonimización o bloqueo:',
        text: 'Solicitar la eliminación de datos innecesarios o excesivos.',
      },
      {
        title: 'Portabilidad de los datos:',
        text: 'Recibir tus datos en un formato estructurado e interoperable.',
      },
      {
        title: 'Eliminación de datos:',
        text: 'Supresión de los datos tratados con base en un consentimiento previo.',
      },
      {
        title: 'Revocación del consentimiento:',
        text: 'Revocar, en cualquier momento, los consentimientos otorgados anteriormente.',
      },
    ],
    howTitle: '¿Cómo ejercer tus derechos?',
    howText:
      'Envía tu solicitud, indicando tu nombre y el derecho que deseas ejercer, al correo {mail:exercise}, con el asunto <strong>DPO</strong>. Nuestro delegado de protección de datos responderá dentro del plazo legal establecido por la ANPD.',
  },

  s10: {
    intro:
      'Al acceder al portal institucional de UNRENDER o utilizar nuestras soluciones bajo licencia SaaS u On-Premise, aceptas las siguientes condiciones de uso:',
    itens: [
      {
        label: 'Propiedad intelectual:',
        text: 'todo el código fuente, la arquitectura, las marcas, los logotipos, los diseños, las interfaces, las patentes y la documentación técnica asociados a los productos UNRENDER, CTRLB, Kardapio.Delivery y Aqui.shopping pertenecen exclusivamente a UNRENDER Software LTDA o a sus licenciantes autorizados.',
      },
      {
        label: 'Prohibiciones expresas:',
        text: 'queda terminantemente prohibido realizar ingeniería inversa, descompilación, scraping no autorizado, ataques de denegación de servicio (DDoS) o cualquier conducta que comprometa la integridad de los servidores o intente vulnerar el aislamiento multiinquilino (multi-tenant).',
      },
      {
        label: 'Disponibilidad y SLA:',
        text: 'aplicamos los más altos estándares de disponibilidad a nuestros servicios en la nube. Las ventanas de mantenimiento programado se comunican con antelación a los contratantes por los canales oficiales.',
      },
      {
        label: 'Limitación de responsabilidad:',
        text: 'UNRENDER no se hace responsable del mal uso de las herramientas por parte del cliente, de las pérdidas derivadas de credenciales compartidas indebidamente por los usuarios ni de las inestabilidades originadas exclusivamente en los proveedores de conectividad del propio usuario.',
      },
    ],
  },

  s11: {
    intro:
      'Esta Política podrá actualizarse periódicamente para reflejar mejoras en nuestros sistemas, nuevas funcionalidades o adaptaciones a las resoluciones emitidas por la ANPD. Notificaremos a los usuarios registrados y mostraremos la fecha de la última modificación en la parte superior de esta página.',
    boxTitle: 'Atención oficial sobre privacidad y LGPD',
    dpoEmailLabel: 'Correo del delegado de protección de datos (DPO):',
    supportLabel: 'Soporte general y operaciones:',
    phoneLabel: 'Teléfono / WhatsApp comercial:',
    phone: '+55 65 99920-7154',
    venueLabel: 'Fuero elegido:',
    venue: 'Tribunales de la comarca de Cuiabá, Estado de Mato Grosso, Brasil',
  },
};
