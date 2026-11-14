import type { PoliticaTexto } from './politica.i18n';

export const PT: PoliticaTexto = {
  secoes: {
    identificacao: {
      menu: 'Identificação e encarregado (DPO)',
      kicker: 'Estrutura corporativa',
      title: 'Identificação da empresa e encarregado (DPO)',
    },
    principios: {
      menu: 'Princípios e governança LGPD',
      kicker: 'Diretrizes fundamentais',
      title: 'Princípios e governança de proteção de dados',
    },
    'dados-coletados': {
      menu: 'Dados pessoais coletados',
      kicker: 'Coleta de informações',
      title: 'Dados pessoais coletados e formas de coleta',
    },
    'controlador-operador': {
      menu: 'Papéis LGPD: controlador e operador',
      kicker: 'Arquitetura de responsabilidades',
      title: 'Papéis na LGPD: quando somos controlador e quando somos operador',
    },
    'bases-legais': {
      menu: 'Bases legais e finalidades',
      kicker: 'Legalidade do tratamento',
      title: 'Bases legais e finalidades (art. 7º da LGPD)',
    },
    seguranca: {
      menu: 'Segurança e retenção de dados',
      kicker: 'Proteção ativa',
      title: 'Segurança da informação e prazos de retenção',
    },
    compartilhamento: {
      menu: 'Compartilhamento com terceiros',
      kicker: 'Relações com terceiros',
      title: 'Compartilhamento de dados com terceiros',
    },
    cookies: {
      menu: 'Política de cookies',
      kicker: 'Rastreabilidade web',
      title: 'Política de cookies e armazenamento local',
    },
    'direitos-titular': {
      menu: 'Direitos do titular (art. 18 da LGPD)',
      kicker: 'Garantias fundamentais',
      title: 'Seus direitos como titular de dados (art. 18 da LGPD)',
    },
    'termos-uso': {
      menu: 'Termos de uso e propriedade intelectual',
      kicker: 'Condições de utilização',
      title: 'Termos de uso e propriedade intelectual',
    },
    'contato-dpo': {
      menu: 'Canal de atendimento e DPO',
      kicker: 'Disposições finais',
      title: 'Canal oficial do DPO, atualizações e foro',
    },
  },

  hero: {
    kicker: 'Governança digital, privacidade e termos de uso',
    titlePre: 'Política de privacidade,',
    titleHl: 'segurança de dados',
    titlePost: 'e termos de uso',
    intro:
      'A <strong>UNRENDER Software</strong> assume o compromisso de proteger sua privacidade e seus dados com transparência, ética e rigor técnico. Este documento detalha como coletamos, tratamos, protegemos e compartilhamos dados pessoais no uso do nosso portal institucional (<a href="https://unrender.pro">unrender.pro</a>), nas plataformas SaaS (<strong>CTRLB</strong>, <strong>Kardapio.Delivery</strong>, <strong>Aqui.shopping</strong>) e em nossas implementações On-Premise.',
  },

  s1: {
    intro:
      'A UNRENDER Software atua no desenvolvimento, licenciamento, customização e suporte de softwares corporativos, soluções de inteligência artificial, plataformas web/mobile e automação comercial integrada.',
    controllerLabel: 'Controlador dos dados',
    taxId: 'CNPJ: 46.276.782/0001-97',
    hqLabel: 'Sede administrativa',
    address: 'R. da Cereja, 11 - Bosque da Saúde, Cuiabá - MT',
    zip: 'CEP: 78050-020 • Brasil',
    dpoTitle: 'Canal direto do DPO (Data Protection Officer)',
    dpoText:
      'Nos termos do art. 41 da Lei nº 13.709/2018 (LGPD), qualquer solicitação, questionamento ou comunicação com a Autoridade Nacional de Proteção de Dados (ANPD) deve ser direcionada ao e-mail {mail:privacy} (com assunto <strong>DPO</strong>) ou via telefone comercial <strong>(65) 99920-7154</strong>.',
  },

  s2: {
    intro:
      'Todas as operações de tratamento de dados realizadas pela UNRENDER são pautadas pela boa-fé e pelos princípios fundamentais do artigo 6º da LGPD:',
    cards: [
      {
        title: 'Finalidade e adequação',
        text: 'Tratamento realizado exclusivamente para propósitos legítimos, específicos e transparentes informados ao titular.',
      },
      {
        title: 'Necessidade (minimização)',
        text: 'Coletamos apenas o volume estritamente pertinente e indispensável para a prestação dos serviços acordados.',
      },
      {
        title: 'Livre acesso e transparência',
        text: 'Garantia aos titulares de consulta facilitada e gratuita sobre a exatidão e a forma de tratamento de seus dados.',
      },
      {
        title: 'Segurança e prevenção',
        text: 'Uso de medidas técnicas e administrativas aptas a proteger dados pessoais de acessos não autorizados ou vazamentos.',
      },
    ],
  },

  s3: {
    intro: 'Coletamos dados por diferentes canais e contextos, divididos em três categorias fundamentais:',
    grupos: [
      {
        title: 'A. Dados fornecidos diretamente pelo usuário',
        badge: 'Formulários e contato',
        lead: 'Quando você solicita um orçamento, demonstração ou suporte em nosso site ou pelo WhatsApp oficial:',
        itens: [
          'Nome completo e cargo/empresa',
          'E-mail corporativo ou pessoal',
          'Número de telefone / WhatsApp',
          'Detalhes da demanda técnica ou do serviço solicitado',
        ],
      },
      {
        title: 'B. Dados de navegação e logs técnicos (Marco Civil)',
        badge: 'Automático',
        lead: 'Para cumprimento do art. 15 da Lei nº 12.965/2014 (Marco Civil da Internet) e estabilidade da infraestrutura:',
        itens: [
          'Endereço IP com data, hora e fuso horário da conexão',
          'Tipo e versão do navegador, resolução de tela e sistema operacional',
          'Páginas visitadas, tempo de permanência e rota de navegação',
        ],
      },
      {
        title: 'C. Dados cadastrais e de faturamento dos clientes contratantes',
        badge: 'Contratos B2B',
        lead: 'Para formalização contratual e faturamento de licenças SaaS e fornecimento de hardware:',
        itens: [
          'Razão social, nome fantasia, CNPJ e inscrição estadual/municipal',
          'Nome, CPF e e-mail dos representantes legais e administradores do sistema',
          'Endereço de faturamento e de entrega de equipamentos',
        ],
      },
    ],
  },

  s4: {
    intro:
      'Por operarmos como desenvolvedores de software corporativo e provedores de ecossistema multisserviço, nossos papéis sob a LGPD se definem conforme o modelo de uso:',
    controller: {
      title: 'UNRENDER como controladora',
      p1: 'Quando você acessa o site <strong>unrender.pro</strong>, solicita contato, compra hardware ou firma um contrato comercial conosco.',
      p2: 'Neste cenário, decidimos sobre as finalidades e os meios de tratamento nos estritos limites contratuais e regulatórios.',
    },
    processor: {
      title: 'UNRENDER como operadora',
      p1: 'Quando sua empresa utiliza o <strong>CTRLB (SGA)</strong>, <strong>Kardapio.Delivery</strong> ou <strong>Aqui.shopping</strong> para gerenciar seus próprios clientes, pedidos e funcionários.',
      p2: '<strong>Sua empresa é a controladora dos dados</strong> dos seus clientes e alunos; a UNRENDER atua como mera operadora técnica, sob contrato de tratamento de dados (DPA).',
    },
    onprem: {
      title: 'Destaque exclusivo: implementações On-Premise',
      text: 'Para clientes que contratam o <strong>CTRLB On-Premise</strong> instalado em servidores físicos locais ou nuvens privadas próprias, a UNRENDER <strong>não armazena, não espelha e não possui acesso rotineiro</strong> ao banco de dados ou às operações da sua empresa. Os dados residem exclusivamente sob custódia e infraestrutura do contratante, garantindo soberania total.',
    },
  },

  s5: {
    intro:
      'Em conformidade com a legislação brasileira, todo tratamento de dados realizado pela UNRENDER é respaldado por uma base legal válida:',
    cols: ['Finalidade do tratamento', 'Dados utilizados', 'Base legal (LGPD)'],
    rows: [
      [
        'Atendimento a orçamentos e contato comercial',
        'Nome, e-mail, telefone, mensagem',
        'Procedimentos preliminares a contrato (art. 7º, V)',
      ],
      [
        'Execução de assinaturas SaaS e entrega de hardware',
        'Dados cadastrais, CNPJ/CPF, endereço, logins',
        'Execução de contrato (art. 7º, V)',
      ],
      [
        'Guarda de registros de conexão (IPs e horários)',
        'IP, data, hora, porta lógica',
        'Cumprimento de obrigação legal (art. 7º, II, c/c Marco Civil)',
      ],
      [
        'Prevenção a fraudes e segurança de infraestrutura',
        'Telemetria técnica, logs de erro, user-agent',
        'Legítimo interesse do controlador (art. 7º, IX)',
      ],
      [
        'Emissão de notas fiscais e prestação de contas contábeis',
        'Dados de faturamento e fiscais',
        'Obrigação legal tributária (art. 7º, II)',
      ],
    ],
  },

  s6: {
    intro:
      'Adotamos as melhores práticas técnicas mundiais de cibersegurança e engenharia de software para resguardar a integridade, a confidencialidade e a disponibilidade dos dados:',
    cards: [
      {
        title: 'Criptografia forte',
        text: 'Tráfego HTTPS com TLS 1.3 obrigatório e chaves criptográficas em repouso nos bancos de dados gerenciados.',
      },
      {
        title: 'Controle de acesso',
        text: 'Princípio do menor privilégio (PoLP), logs de auditoria e autenticação com múltiplos fatores para administração.',
      },
      {
        title: 'Backups e redundância',
        text: 'Rotinas automatizadas de backup com isolamento lógico para prevenção contra perda de dados ou ransomware.',
      },
    ],
    retentionTitle: 'Prazos de retenção dos dados',
    retention: [
      {
        label: 'Logs de acesso à aplicação:',
        text: '6 meses, conforme exigência do art. 15 do Marco Civil da Internet.',
      },
      {
        label: 'Dados contratuais e fiscais:',
        text: '5 anos após o encerramento do contrato (para cumprimento dos prazos prescricionais civis e tributários do Código Tributário Nacional e do Código Civil).',
      },
      {
        label: 'Leads e contatos comerciais:',
        text: 'mantidos enquanto perdurar a relação de interesse do titular, sendo imediatamente excluídos mediante revogação ou pedido formal do titular.',
      },
    ],
  },

  s7: {
    notice:
      '<strong>Cláusula de não comercialização:</strong> a UNRENDER Software <strong>nunca comercializa, aluga, troca ou monetiza</strong> listas de contatos, dados de usuários ou bases cadastrais com corretores de dados (data brokers) ou empresas terceiras para fins publicitários não solicitados.',
    intro: 'O compartilhamento de dados ocorre de maneira estritamente restrita nas seguintes situações essenciais:',
    itens: [
      {
        label: 'Provedores de nuvem e hospedagem:',
        text: 'data centers de alta segurança (como provedores locais e internacionais homologados) que processam dados sob rígidos termos de sigilo e conformidade com a LGPD e o GDPR.',
      },
      {
        label: 'Gateways de pagamento e instituições financeiras:',
        text: 'apenas os dados estritamente necessários para liquidação de assinaturas e processamento via cartão de crédito, boleto ou Pix.',
      },
      {
        label: 'Transportadoras e logística:',
        text: 'para envio físico de equipamentos, kits PDV e impressoras homologadas comprados na Loja Unrender.',
      },
      {
        label: 'Autoridades públicas e ordens judiciais:',
        text: 'quando estritamente requisitado por determinação legal, judicial ou requerimento formal da ANPD.',
      },
    ],
  },

  s8: {
    intro:
      'Cookies e tokens de armazenamento local (Local Storage e Session Storage) são pequenos arquivos armazenados em seu dispositivo para garantir o correto funcionamento das páginas da UNRENDER:',
    cards: [
      {
        title: 'Cookies estritamente necessários',
        text: 'Essenciais para a navegação segura, o controle de autenticação em áreas restritas, o balanceamento de carga e a prevenção contra ataques CSRF/DDoS.',
      },
      {
        title: 'Cookies analíticos e de desempenho',
        text: 'Coletam métricas anônimas de uso (como páginas mais acessadas, taxas de erro e tempo de carregamento) para nos ajudar a otimizar a velocidade e a estabilidade da aplicação.',
      },
    ],
    note: 'Você pode desativar ou apagar cookies a qualquer momento nas configurações do seu navegador (Google Chrome, Mozilla Firefox, Safari, Microsoft Edge). Note que desativar cookies estritamente necessários poderá impactar a funcionalidade de áreas logadas dos sistemas.',
  },

  s9: {
    intro:
      'A LGPD assegura a você, na qualidade de titular de dados pessoais, o direito de requisitar à UNRENDER a qualquer momento, de forma simples e gratuita:',
    rights: [
      { title: 'Confirmação e acesso:', text: 'Saber se tratamos seus dados e solicitar cópia deles.' },
      { title: 'Correção e atualização:', text: 'Corrigir dados pessoais incompletos, inexatos ou desatualizados.' },
      { title: 'Anonimização ou bloqueio:', text: 'Solicitar a eliminação de dados desnecessários ou excessivos.' },
      { title: 'Portabilidade dos dados:', text: 'Receber seus dados em formato estruturado e interoperável.' },
      { title: 'Eliminação de dados:', text: 'Exclusão dos dados tratados com base em consentimento prévio.' },
      {
        title: 'Revogação do consentimento:',
        text: 'Revogar, a qualquer momento, consentimentos concedidos anteriormente.',
      },
    ],
    howTitle: 'Como exercer seus direitos?',
    howText:
      'Envie sua solicitação indicando nome e direito pleiteado para o e-mail {mail:exercise}, com o assunto <strong>DPO</strong>. Nosso encarregado de dados responderá no prazo legal estabelecido pela ANPD.',
  },

  s10: {
    intro:
      'Ao acessar o portal institucional da UNRENDER ou utilizar nossas soluções sob licença SaaS ou On-Premise, você concorda com as seguintes condições de uso:',
    itens: [
      {
        label: 'Propriedade intelectual:',
        text: 'todos os códigos-fonte, arquitetura, marcas, logotipos, designs, interfaces, patentes e documentações técnicas associados aos produtos UNRENDER, CTRLB, Kardapio.Delivery e Aqui.shopping pertencem exclusivamente à UNRENDER Software LTDA ou a seus licenciantes autorizados.',
      },
      {
        label: 'Vedações expressas:',
        text: 'é terminantemente proibido realizar engenharia reversa, descompilação, scraping não autorizado, ataques de negação de serviço (DDoS) ou qualquer conduta que comprometa a integridade dos servidores ou tente violar o isolamento multi-inquilino (multi-tenant).',
      },
      {
        label: 'Disponibilidade e SLA:',
        text: 'empregamos os mais altos padrões de disponibilidade para nossos serviços em nuvem. Janelas de manutenção programada são informadas com antecedência aos contratantes pelos canais oficiais.',
      },
      {
        label: 'Limitação de responsabilidade:',
        text: 'a UNRENDER não se responsabiliza pelo mau uso das ferramentas pelo cliente, por perdas decorrentes de credenciais compartilhadas indevidamente por usuários ou por instabilidades originadas exclusivamente em provedores de conectividade do próprio usuário.',
      },
    ],
  },

  s11: {
    intro:
      'Esta Política poderá ser atualizada periodicamente para refletir melhorias em nossos sistemas, novas funcionalidades ou adequações a resoluções emitidas pela ANPD. Notificaremos os usuários cadastrados e exibiremos a data da última modificação no topo desta página.',
    boxTitle: 'Atendimento oficial sobre privacidade e LGPD',
    dpoEmailLabel: 'E-mail do encarregado (DPO):',
    supportLabel: 'Suporte geral e operações:',
    phoneLabel: 'Telefone / WhatsApp comercial:',
    phone: '(65) 99920-7154',
    venueLabel: 'Foro eleito:',
    venue: 'Comarca de Cuiabá, Estado de Mato Grosso, Brasil',
  },
};
