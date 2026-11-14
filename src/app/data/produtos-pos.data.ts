export interface ProdutoPos {
  id: string;
  sgaId?: string;
  sku: string;
  name: string;
  shortTitle: string;
  tagline: string;
  quickPitch: string;
  tags: string[];
  category: string;
  categoryLabel: string;
  badge: string;
  badgeColor: string;
  image: string;
  inStock: boolean;
  stockCount: number;
  leadTime: string;
  priceSale: string;
  priceSaleNumeric: number;
  priceRent: string;
  priceRentNumeric: number;
  rating: number;
  reviewsCount: number;
  shortDesc: string;
  longDesc: string;
  highlights: string[];
  techSpecs: Record<string, string>;
  softwareModes: string[];
  idealFor: string[];
  parcelamentoExtraido?: string | null;
  precoCartaoCentavos?: number | null;
  margemLucroPct?: number | null;
  fontePrecoLoja?: string | null;
  whatsappMessage: string;
}

export interface CategoriaPos {
  id: string;
  label: string;
  icon: string;
}

export const categoriasPos: CategoriaPos[] = [
  { id: 'todos', label: 'Todos os equipamentos', icon: 'fa-solid fa-layer-group' },
  { id: 'impressora-termica', label: 'Impressoras térmicas', icon: 'fa-solid fa-print' },
  { id: 'impressora-bluetooth', label: 'Impressoras Bluetooth', icon: 'fa-solid fa-wifi' },
  { id: 'caixa-usb', label: 'Caixas registradoras USB', icon: 'fa-solid fa-cash-register' },
  { id: 'kit-pc-caixa', label: 'Kits PC para caixa', icon: 'fa-solid fa-desktop' },
  { id: 'kit-headset-boost', label: 'Kits de headsets e Boost', icon: 'fa-solid fa-headset' },
  { id: 'perifericos-pdv', label: 'Leitores e periféricos de PDV', icon: 'fa-solid fa-barcode' },
];

export const produtosPos: ProdutoPos[] = [
  {
    id: 'impressora-termica-80mm',
    sku: 'POS-IMP-TERM-80',
    name: 'Impressora Térmica 80mm USB/Ethernet Guilhotina Automática',
    shortTitle: 'Impressora Térmica 80mm',
    tagline: 'Emissão instantânea de cupons fiscais NFC-e, SAT, recibos e comandas com corte automático.',
    quickPitch: 'Impressora térmica 80 mm 260 mm/s com guilhotina automática + USB + Ethernet LAN + RJ11 para gaveta.',
    tags: ['Guilhotina automática', 'USB + Ethernet LAN', '260 mm/s'],
    category: 'impressora-termica',
    categoryLabel: 'Impressoras Térmicas',
    badge: 'Mais vendido • Pronta entrega',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    image: '/images/produtos/pos-impressora-termica-80mm.svg',
    inStock: true,
    stockCount: 12,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 696',
    priceSaleNumeric: 696,
    priceRent: 'R$ 89 / mês',
    priceRentNumeric: 89,
    rating: 5.0,
    reviewsCount: 64,
    shortDesc: 'Impressora térmica não fiscal de alta velocidade (260 mm/s) com guilhotina automática de alta durabilidade e tripla interface (USB + Ethernet LAN + RJ11 para gaveta).',
    longDesc: 'Projetada para frentes de caixa que exigem rapidez e zero travamento de papel. A impressora térmica 80 mm USB/Ethernet conta com mecanismo de corte automático (guilhotina para 1,5 milhão de cortes), impressão nítida de QR Code PIX e códigos de barras, além de porta RJ11 dedicada para abrir a caixa registradora automaticamente ao finalizar a venda.\n\nTotalmente homologada para o ecossistema SGA CTRLB, Kardapio.Delivery e sistemas de automação comercial em Windows e Linux.',
    highlights: [
      'Velocidade de 260 mm/s com impressão instantânea de QR Code PIX e Danfe NFC-e',
      'Guilhotina automática de aço temperado (1,5 milhão de cortes)',
      'Conexão simultânea USB 2.0 + rede Ethernet 10/100 + porta RJ11 para gaveta',
      'Sistema Easy-Load de troca rápida de bobina térmica 80 mm',
      'Compatível com protocolo universal ESC/POS'
    ],
    techSpecs: {
      'Velocidade de impressão': '260 mm/s',
      'Largura do papel': '80 mm (bobina até 83 mm)',
      'Corte de papel': 'Guilhotina automática + serrilha manual',
      'Interfaces': 'USB 2.0 + Ethernet LAN + RJ11 (gaveta 12 V/24 V)',
      'Protocolo': 'ESC/POS nativo compatível com Windows e Linux',
      'Compatibilidade': 'SGA CTRLB, NFC-e, SAT, comandas e recibos'
    },
    softwareModes: [
      'Integração Plug & Play com SGA CTRLB e módulo de frente de caixa',
      'Disparo automático de abertura de gaveta ao registrar pagamento em dinheiro',
      'Impressão em rede para múltiplos caixas ou produção/cozinha'
    ],
    idealFor: [
      'Academias, estúdios, varejo, restaurantes, clínicas e recepções de alto fluxo'
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar a Impressora Térmica 80mm USB/Ethernet Guilhotina Automática na Unrender.'
  },
  {
    id: 'impressora-termica-pro-300',
    sku: 'POS-IMP-TERM-DUAL',
    name: 'Impressora Térmica 80mm Pro 300mm/s Tripla Interface (USB + Serial + LAN)',
    shortTitle: 'Impressora Térmica Pro 300mm/s',
    tagline: 'Robustez industrial para caixas de altíssimo volume.',
    quickPitch: 'Cabeça térmica de 150 km, 300 mm/s e tripla interface (USB + Ethernet Gigabit + serial RS-232).',
    tags: ['300 mm/s industrial', 'Padrão fiscal NFC-e/SAT', 'Tripla interface'],
    category: 'impressora-termica',
    categoryLabel: 'Impressoras Térmicas',
    badge: 'Linha Pro • Alta demanda',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    image: '/images/produtos/pos-impressora-termica-pro.svg',
    inStock: true,
    stockCount: 8,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 948',
    priceSaleNumeric: 948,
    priceRent: 'R$ 119 / mês',
    priceRentNumeric: 119,
    rating: 4.9,
    reviewsCount: 38,
    shortDesc: 'Modelo industrial para frente de caixa de alto fluxo. Cabeça térmica de longa vida útil (150 km), velocidade de 300 mm/s e sensores inteligentes de papel.',
    longDesc: 'Desenvolvida para operações críticas que não podem parar um segundo. Com velocidade de 300 mm/s, sensores ópticos de pouco papel, fim de papel e tampa aberta, a impressora térmica Pro entrega confiabilidade de nível bancário e supermercadista.\n\nAcompanha suporte remoto da engenharia Unrender para configuração de drivers fiscais, SAT, NFC-e e integração com ERPs.',
    highlights: [
      'Ultra velocidade de 300 mm/s sem perda de nitidez em fontes pequenas ou QR codes',
      'Cabeça térmica reforçada para 150 km de impressão contínua',
      'Tripla interface: USB + rede Ethernet + serial RS-232 + RJ11 para caixa registradora',
      'Sensores de fim de bobina, proximidade de fim de papel e aquecimento',
      'Configuração remota assistida pela equipe técnica Unrender'
    ],
    techSpecs: {
      'Velocidade de impressão': '300 mm/s',
      'Cabeça térmica': '150 km de vida útil',
      'Interfaces': 'USB + Ethernet + serial RS-232 + RJ11',
      'Resolução': '203 dpi de alto contraste',
      'Sensores': 'Pouco papel, fim de papel e cabeça aquecida',
      'Garantia e suporte': '12 meses + configuração remota Unrender'
    },
    softwareModes: [
      'Homologada para NFC-e, SAT fiscal, MFE e cupons de estacionamento/acesso',
      'Monitoramento de status de papel diretamente pelo software de PDV'
    ],
    idealFor: [
      'Supermercados, redes de franquias, arenas esportivas e operações 24/7'
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar a Impressora Térmica 80mm Pro 300mm/s na Unrender.'
  },
  {
    id: 'impressora-bluetooth-58mm',
    sku: 'POS-IMP-BT-58',
    name: 'Mini Impressora Térmica Portátil Bluetooth 58mm com Bateria Longa Duração',
    shortTitle: 'Impressora Bluetooth 58mm',
    tagline: 'Imprima recibos, comandas e QR codes PIX direto do celular ou tablet em qualquer lugar.',
    quickPitch: 'Portátil Bluetooth 5.0 + USB-C com bateria de 2600 mAh para Android, iOS e Windows.',
    tags: ['Bluetooth 5.0 + USB-C', 'Bateria 2600 mAh', 'Android / iOS / PC'],
    category: 'impressora-bluetooth',
    categoryLabel: 'Impressoras Bluetooth',
    badge: 'Portátil • Sem fio',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    image: '/images/produtos/pos-impressora-bluetooth-58mm.svg',
    inStock: true,
    stockCount: 18,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 288',
    priceSaleNumeric: 288,
    priceRent: 'R$ 49 / mês',
    priceRentNumeric: 49,
    rating: 4.9,
    reviewsCount: 52,
    shortDesc: 'Impressora térmica portátil sem fio Bluetooth + USB-C para atendimento móvel, mesas, estacionamento, eventos e entregas com bateria de 2600 mAh.',
    longDesc: 'Leve o caixa até o cliente. A mini impressora térmica Bluetooth 58 mm pesa apenas 210 g, cabe no bolso ou no cinto e conecta via Bluetooth a celulares Android, iPhones, tablets e notebooks.\n\nPerfeita para fechamento de conta na mesa, venda externa, valets, eventos, cobrança em domicílio e emissão instantânea de comprovantes via app ou Web Bluetooth.',
    highlights: [
      'Conexão rápida Bluetooth Dual Mode (BLE 5.0 + Classic) compatível com Android, iOS e Windows',
      'Bateria de lítio de 2600 mAh com autonomia para mais de 300 cupons por recarga',
      'Recarga prática via cabo USB Tipo-C (funciona também no powerbank ou carregador veicular)',
      'Suporte nativo a impressão de QR Code PIX, logotipos e códigos de barras',
      'Design ergonômico emborrachado resistente a respingos e impactos leves'
    ],
    techSpecs: {
      'Conectividade': 'Bluetooth 4.2/5.0 Dual Mode + USB-C',
      'Largura da bobina': '58 mm (48 mm de largura de impressão)',
      'Bateria': '2600 mAh Li-Ion (até 18 h em standby)',
      'Velocidade': '90 mm/s',
      'Peso': '210 g (acompanha clip de cinto e cabo USB-C)',
      'Sistemas suportados': 'Android, iOS, Windows e Web Bluetooth'
    },
    softwareModes: [
      'Impressão direta via app mobile, Kardapio.Delivery e Web PDV',
      'Modo economia de bateria com despertar automático ao receber comando Bluetooth'
    ],
    idealFor: [
      'Atendimento em mesas, delivery, estacionamentos, eventos e vendas em campo'
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar a Mini Impressora Térmica Portátil Bluetooth 58mm na Unrender.'
  },
  {
    id: 'impressora-bluetooth-80mm',
    sku: 'POS-IMP-BT-80',
    name: 'Impressora Térmica Bluetooth & Wi-Fi 80mm de Balcão com Guilhotina',
    shortTitle: 'Impressora 80mm Bluetooth & Wi-Fi',
    tagline: 'Liberdade sem cabos no balcão com bobina larga de 80 mm e corte automático.',
    quickPitch: 'Impressora térmica 80 mm com Bluetooth 5.0 + Wi-Fi + USB e guilhotina automática.',
    tags: ['Bluetooth + Wi-Fi', 'Bobina 80 mm', 'Guilhotina automática'],
    category: 'impressora-bluetooth',
    categoryLabel: 'Impressoras Bluetooth',
    badge: 'Balcão clean • Wireless',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    image: '/images/produtos/pos-impressora-bluetooth-80mm.svg',
    inStock: true,
    stockCount: 10,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 588',
    priceSaleNumeric: 588,
    priceRent: 'R$ 79 / mês',
    priceRentNumeric: 79,
    rating: 4.8,
    reviewsCount: 29,
    shortDesc: 'Solução híbrida sem fio para balcões clean, quiosques e expedição. Combina impressão larga de 80 mm, guilhotina automática e conexão Bluetooth + Wi-Fi + USB.',
    longDesc: 'Ideal para quem utiliza tablets ou notebooks no ponto de venda e quer eliminar fios aparentes no balcão sem abrir mão da bobina profissional de 80 mm com guilhotina automática.\n\nRecebe pedidos simultaneamente via Bluetooth e rede Wi-Fi, além de contar com saída RJ11 para disparo automático da caixa registradora.',
    highlights: [
      'Tripla conectividade: Bluetooth 5.0 + Wi-Fi 2,4 GHz + USB 2.0',
      'Largura padrão de 80 mm com guilhotina automática de alta velocidade (230 mm/s)',
      'Permite imprimir direto de iPads, tablets Android e smartphones sem computador intermediário',
      'Porta RJ11 integrada para acionar gaveta de dinheiro automática',
      'Perfeita para recepções modernas, quiosques de shopping e cozinhas de restaurantes'
    ],
    techSpecs: {
      'Conectividade': 'Bluetooth 5.0 + Wi-Fi 802.11b/g/n + USB',
      'Largura do papel': '80 mm com guilhotina automática',
      'Velocidade': '230 mm/s',
      'Impressão gráfica': 'QR Code PIX, logos, EAN-13, Code128',
      'Acionamento de gaveta': 'Porta RJ11 12 V/24 V integrada',
      'Aplicação': 'PDV tablet, balcão sem fio e produção/cozinha'
    },
    softwareModes: [
      'Impressão sem fio via rede Wi-Fi local ou pareamento direto Bluetooth',
      'Roteamento inteligente de comandas por setor (balcão, bar, cozinha)'
    ],
    idealFor: [
      'Quiosques, recepções premium, PDVs em tablet e operações sem cabeamento estruturado'
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar a Impressora Térmica Bluetooth & Wi-Fi 80mm na Unrender.'
  },
  {
    id: 'caixa-registradora-usb',
    sku: 'POS-CAIXA-USB',
    name: 'Caixa Registradora / Gaveta de Dinheiro Automática USB & RJ11 em Aço',
    shortTitle: 'Caixa Registradora USB & RJ11',
    tagline: 'Abertura automática pelo sistema PDV ou na chave, com estrutura blindada em aço.',
    quickPitch: 'Gaveta de dinheiro automática em aço com interface dupla (USB direto no PC + RJ11 para impressora).',
    tags: ['USB + RJ11 automática', 'Gabinete em aço', '5 cédulas + 8 moedas'],
    category: 'caixa-usb',
    categoryLabel: 'Caixas Registradoras USB',
    badge: 'Alta durabilidade • USB',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    image: '/images/produtos/pos-caixa-registradora-usb.svg',
    inStock: true,
    stockCount: 15,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 384',
    priceSaleNumeric: 384,
    priceRent: 'R$ 59 / mês',
    priceRentNumeric: 59,
    rating: 4.9,
    reviewsCount: 47,
    shortDesc: 'Gaveta de dinheiro e caixa registradora automática construída em aço carbono com acionamento via USB direto no computador ou RJ11 na impressora térmica.',
    longDesc: 'Segurança e organização profissional para o numerário do seu caixa. Construída em chapa de aço espessa com pintura eletrostática anticorrosiva, esta caixa registradora suporta o peso de monitores e computadores sobre sua estrutura.\n\nAcompanha interface híbrida: pode ser ligada tanto na porta USB do computador quanto na porta RJ11 da impressora térmica, abrindo automaticamente a cada venda em dinheiro ou sangria autorizada.',
    highlights: [
      'Duplo modo de acionamento eletrônico: cabo USB (direto no PC) + cabo RJ11 (via impressora)',
      '5 compartimentos de cédulas com prendedores de mola em aço inox de alta pressão',
      '8 divisórias de moedas removíveis e ajustáveis + fenda frontal (boca de lobo) para cheques/notas altas',
      'Fechadura de segurança com 3 posições: travada, abertura eletrônica pelo sistema ou abertura manual',
      'Trilhos telescópicos com rolamento de esferas testados para mais de 1 milhão de ciclos'
    ],
    techSpecs: {
      'Interface de acionamento': 'USB (módulo serial integrado) + RJ11 (solenoide 12 V/24 V)',
      'Compartimentos': '5 divisórias para cédulas (clip de aço) + 8 para moedas',
      'Estrutura': 'Aço laminado a frio com trilhos telescópicos de esferas',
      'Segurança': 'Fechadura de 3 posições com 2 chaves inclusas',
      'Fenda frontal': 'Boca de lobo para inserção de valores sem abrir a gaveta',
      'Dimensões': '410 mm (L) x 420 mm (P) x 100 mm (A)'
    },
    softwareModes: [
      'Abertura automática integrada ao SGA CTRLB em pagamentos em espécie e sangria/suprimento',
      'Compatível com qualquer sistema Windows/Linux via porta COM virtual USB ou comando ESC/POS'
    ],
    idealFor: [
      'Comércio varejista, academias, farmácias, padarias, estacionamentos e recepções'
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar a Caixa Registradora / Gaveta Automática USB & RJ11 na Unrender.'
  },
  {
    id: 'caixa-registradora-smart-usb',
    sku: 'POS-CAIXA-SMART-USB',
    name: 'Caixa Registradora Inteligente USB com Sensor de Abertura e Gaveta Removível',
    shortTitle: 'Caixa Registradora Smart USB',
    tagline: 'Conexão USB nativa sem precisar de impressora e sensor que avisa se a gaveta ficou aberta.',
    quickPitch: 'Caixa registradora USB Plug & Play com sensor de status aberto/fechado e bandeja extraível com tampa.',
    tags: ['USB Plug & Play', 'Sensor de gaveta aberta', 'Troca rápida de turno'],
    category: 'caixa-usb',
    categoryLabel: 'Caixas Registradoras USB',
    badge: 'Smart sensor • USB direto',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    image: '/images/produtos/pos-caixa-registradora-smart.svg',
    inStock: true,
    stockCount: 9,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 528',
    priceSaleNumeric: 528,
    priceRent: 'R$ 69 / mês',
    priceRentNumeric: 69,
    rating: 5.0,
    reviewsCount: 24,
    shortDesc: 'Caixa registradora USB com micro-switch sensor de estado (informa ao software se a gaveta está aberta ou fechada) e bandeja interna removível para troca de turno.',
    longDesc: 'Projetada para operações modernas que buscam auditoria rigorosa de caixa ou que operam 100% digitais (sem impressora de cupom). A conexão USB nativa alimenta e aciona a solenoide diretamente pela porta USB do computador.\n\nSeu sensor óptico/mecânico informa em tempo real se a gaveta permanece aberta, permitindo bloquear novas vendas até o fechamento e registrando logs de segurança no SGA CTRLB.',
    highlights: [
      'Opera 100% via USB direto no PC ou mini PC — não exige impressora térmica para funcionar',
      'Sensor micro-switch integrado: alerta na tela caso o operador esqueça a gaveta aberta',
      'Bandeja organizadora interna totalmente removível para conferência no cofre ou troca de turno',
      'Prendedores de notas metálicos e divisórias ajustáveis para todas as cédulas do Real',
      'Chassi reforçado suporta até 45 kg sobre o gabinete (monitor + computador)'
    ],
    techSpecs: {
      'Conexão': 'USB 2.0 nativo (alimentação e dados via cabo USB blindado)',
      'Sensor de status': 'Micro-switch integrado de detecção aberta/fechada',
      'Divisórias': '5 cédulas com clip metálico + 8 moedas removíveis',
      'Ciclo de vida': 'Homologada para 1.000.000+ de aberturas',
      'Acabamento': 'Pintura epóxi preta texturizada anti-risco',
      'Incluso': 'Cabo USB 1,8 m, 2 chaves e kit de fixação sob balcão opcional'
    },
    softwareModes: [
      'Auditoria de abertura de gaveta e alerta sonoro de gaveta aberta no PDV',
      'Disparo por atalho de teclado ou finalização de venda no SGA CTRLB'
    ],
    idealFor: [
      'Operações com troca de turno de operadores, tesourarias, clínicas e lojas sem impressora física'
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar a Caixa Registradora Inteligente USB com Sensor na Unrender.'
  },
  {
    id: 'kit-pc-caixa-completo',
    sku: 'POS-KIT-PC-CAIXA',
    name: 'Kit PC para Caixa PDV Completo (Mini PC Core i5, 8GB, SSD 256GB + Monitor 19.5" + Teclado e Mouse)',
    shortTitle: 'Kit PC para Caixa + Monitor + Teclado/Mouse',
    tagline: 'Computador rápido, silencioso e compacto com monitor LED 19,5", teclado e mouse prontos para o caixa.',
    quickPitch: 'Mini PC Intel Core i5 (8 GB RAM + SSD NVMe 256 GB) + monitor LED 19,5" HDMI + teclado ABNT2 e mouse USB.',
    tags: ['Core i5 + SSD 256 GB', 'Monitor LED 19,5"', 'Teclado + mouse inclusos'],
    category: 'kit-pc-caixa',
    categoryLabel: 'Kits PC para Caixa',
    badge: 'Kit campeão • Pronto para uso',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    image: '/images/produtos/pos-kit-pc-caixa.svg',
    inStock: true,
    stockCount: 10,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 2.268',
    priceSaleNumeric: 2268,
    priceRent: 'R$ 249 / mês',
    priceRentNumeric: 249,
    rating: 5.0,
    reviewsCount: 81,
    shortDesc: 'Estação de trabalho completa para frente de caixa e recepção: mini PC Intel Core i5, 8 GB RAM, SSD 256 GB + monitor LED 19,5" + teclado ABNT2 e mouse USB.',
    longDesc: 'Chega de computadores lentos travando a fila do seu caixa. O kit PC para caixa da Unrender entrega um mini PC corporativo ultracompacto (pode ser fixado atrás do monitor via suporte VESA), equipado com processador Intel Core i5, 8 GB de memória RAM e SSD NVMe de 256 GB que inicializa o sistema em segundos.\n\nAcompanha monitor LED widescreen de 19,5" antirreflexo, teclado USB padrão ABNT2 com teclado numérico dedicado e resistente a respingos, mais mouse óptico USB de alta precisão.',
    highlights: [
      'Kit 100% completo: mini PC Core i5 + monitor LED 19,5" + teclado ABNT2 + mouse USB + cabos',
      'SSD NVMe de 256 GB e 8 GB RAM: abertura instantânea do SGA CTRLB, navegador e emissor fiscal',
      'Gabinete mini PC ultracompacto e silencioso com suporte VESA para fixar atrás do monitor',
      '6 portas USB para conectar impressora térmica, caixa registradora, leitor de código de barras e pinpad TEF',
      'Entregue pré-configurado e revisado pela engenharia de hardware da Unrender'
    ],
    techSpecs: {
      'Processador': 'Intel Core i5 corporativo (4 núcleos / 8 threads)',
      'Memória e armazenamento': '8 GB DDR4 dual-channel + SSD NVMe 256 GB',
      'Monitor incluso': 'Monitor LED 19,5" widescreen HD+ (HDMI/VGA) antirreflexo',
      'Periféricos inclusos': 'Teclado USB ABNT2 com numérico + mouse óptico 1200 dpi',
      'Conectividade': '6x USB, HDMI, VGA, rede Gigabit LAN, Wi-Fi dual band e áudio',
      'Sistema operacional': 'Windows 11 Pro ou Linux PDV otimizado e pré-instalado'
    },
    softwareModes: [
      'Homologado e pré-configurado com SGA CTRLB, certificado digital A1/A3 e TEF',
      'Suporte a múltiplos monitores (tela do operador + segunda tela de propaganda/PIX para o cliente)'
    ],
    idealFor: [
      'Frente de caixa, recepção de academias e clínicas, balcão de vendas e escritórios administrativos'
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o Kit PC para Caixa PDV Completo (Core i5 + Monitor 19.5" + Teclado e Mouse) na Unrender.'
  },
  {
    id: 'kit-pc-caixa-touch-pro',
    sku: 'POS-KIT-PC-PRO',
    name: 'Kit PC Frente de Caixa Pro Touch (PC Slim i5 16GB SSD 512GB + Monitor Touchscreen 15.6" + Teclado/Mouse)',
    shortTitle: 'Kit PC Caixa Pro + Monitor Touch',
    tagline: 'Operação por toque na tela com performance de sobra (16 GB RAM + SSD 512 GB).',
    quickPitch: 'PC Slim Core i5 16 GB RAM SSD 512 GB + monitor touchscreen capacitivo 15,6" FHD + teclado e mouse USB.',
    tags: ['Monitor touchscreen', 'Core i5 + 16 GB RAM', 'SSD 512 GB + teclado/mouse'],
    category: 'kit-pc-caixa',
    categoryLabel: 'Kits PC para Caixa',
    badge: 'Touchscreen • Alta performance',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    image: '/images/produtos/pos-kit-pc-touch.svg',
    inStock: true,
    stockCount: 6,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 3.420',
    priceSaleNumeric: 3420,
    priceRent: 'R$ 349 / mês',
    priceRentNumeric: 349,
    rating: 5.0,
    reviewsCount: 33,
    shortDesc: 'Kit PDV avançado com monitor touchscreen capacitivo 15,6" Full HD + PC Slim Core i5 (16 GB RAM, SSD 512 GB) + teclado e mouse USB.',
    longDesc: 'A combinação definitiva entre velocidade de atendimento por toque na tela e potência de processamento. O monitor touchscreen capacitivo de 15,6" possui base articulada metálica pesada que não balança ao tocar, permitindo lançar produtos, fechar comandas e realizar check-in de alunos com um toque.\n\nAcompanha também teclado ABNT2 e mouse USB para cadastros rápidos e operações administrativas.',
    highlights: [
      'Monitor touchscreen capacitivo multi-touch de 15,6" Full HD com base ergonômica inclinável',
      'PC Slim Intel Core i5 com 16 GB RAM DDR4 e SSD NVMe de 512 GB para multitarefa pesada',
      'Acompanha kit teclado USB ABNT2 e mouse óptico para digitação rápida quando necessário',
      '8 portas USB + 2 saídas HDMI para conectar todos os periféricos do PDV com folga',
      'Ideal para operação híbrida: toque rápido no balcão e gestão completa no mesmo terminal'
    ],
    techSpecs: {
      'Computador': 'PC Slim Intel Core i5, 16 GB RAM DDR4, SSD NVMe 512 GB',
      'Monitor principal': 'Touchscreen capacitivo 15,6" Full HD (USB Touch + HDMI)',
      'Teclado e mouse': 'Combo corporativo USB ABNT2 incluso',
      'Portas': '8x USB (4x USB 3.2), 2x HDMI, Ethernet Gigabit, Wi-Fi 6',
      'Proteção da tela': 'Vidro temperado resistente a riscos e respingos (IP54 frontal)'
    },
    softwareModes: [
      'Interface Touch do SGA CTRLB e Kardapio.Delivery com botões de acesso rápido',
      'Modo totem de autoatendimento ou check-in de alunos por toque'
    ],
    idealFor: [
      'Restaurantes, cafeterias, academias, arenas, lojas de conveniência e autoatendimento'
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o Kit PC Frente de Caixa Pro Touch (Core i5 16GB + Monitor Touchscreen + Teclado/Mouse) na Unrender.'
  },
  {
    id: 'estacao-pdv-turnkey-completa',
    sku: 'POS-KIT-TURNKEY',
    name: 'Estação PDV Turnkey Completa (PC Caixa + Monitor + Teclado/Mouse + Impressora 80mm + Caixa Registradora USB)',
    shortTitle: 'Combo PDV Completo Turnkey',
    tagline: 'Tudo o que o seu caixa precisa em um único pacote integrado com desconto especial.',
    quickPitch: 'Mini PC Core i5 + monitor 19,5" + teclado/mouse + impressora térmica 80 mm guilhotina + caixa registradora USB.',
    tags: ['Combo completo 5 em 1', 'PC + monitor + teclado/mouse', 'Impressora 80 mm + gaveta USB'],
    category: 'kit-pc-caixa',
    categoryLabel: 'Kits PC para Caixa',
    badge: 'Solução completa • Economia',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    image: '/images/produtos/pos-kit-turnkey-completo.svg',
    inStock: true,
    stockCount: 7,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 3.228',
    priceSaleNumeric: 3228,
    priceRent: 'R$ 329 / mês',
    priceRentNumeric: 329,
    rating: 5.0,
    reviewsCount: 44,
    shortDesc: 'Pacote completo para inaugurar ou modernizar seu ponto de venda: kit PC Core i5 + monitor 19,5" + teclado/mouse + impressora térmica 80 mm + caixa registradora USB.',
    longDesc: 'Esqueça a preocupação de comprar peças separadas ou descobrir incompatibilidades na hora de inaugurar. A estação PDV Turnkey completa da Unrender entrega o ecossistema inteiro de hardware já testado e configurado em bancada.\n\nVocê recebe o computador Core i5 (8 GB RAM, SSD 256 GB), monitor LED 19,5", teclado e mouse USB, impressora térmica 80 mm com guilhotina automática e a caixa registradora automática em aço — basta ligar na tomada e começar a vender.',
    highlights: [
      'Inclui kit PC Core i5 (8 GB / SSD 256 GB) + monitor LED 19,5" + teclado ABNT2 e mouse USB',
      'Inclui impressora térmica 80 mm USB/Ethernet com guilhotina automática (260 mm/s)',
      'Inclui caixa registradora / gaveta de dinheiro automática em aço (USB & RJ11)',
      'Todos os cabos, drivers, acionamento automático de gaveta e integração SGA CTRLB já configurados',
      'Garantia unificada de 12 meses direto com o suporte técnico da Unrender'
    ],
    techSpecs: {
      'Itens do combo': 'Mini PC i5 + monitor 19,5" + teclado/mouse + impressora 80 mm + gaveta aço',
      'Computador': 'Intel Core i5, 8 GB RAM, SSD NVMe 256 GB, Wi-Fi + Gigabit LAN',
      'Impressora inclusa': 'Térmica 80 mm 260 mm/s USB/LAN com guilhotina automática',
      'Caixa registradora inclusa': 'Gaveta automática em aço 5 notas / 8 moedas com chave',
      'Instalação': 'Pré-configurado Plug & Play pela equipe Unrender'
    },
    softwareModes: [
      'Pronto para rodar SGA CTRLB, emissão de NFC-e/SAT, controle de caixa e atendimento WhatsApp'
    ],
    idealFor: [
      'Inauguração de lojas, novas unidades de academias/franquias e modernização completa de recepção'
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar a Estação PDV Turnkey Completa (PC + Monitor + Teclado/Mouse + Impressora 80mm + Caixa Registradora) na Unrender.'
  },
  {
    id: 'kit-headsets-boost-usb',
    sku: 'POS-KIT-HEADSET-BOOST',
    name: 'Kit Headsets / Boost Profissional USB Digital (2x Headsets Duplo Auricular ANC + Hub Áudio Boost)',
    shortTitle: 'Kit Headsets / Boost USB (2x + Hub)',
    tagline: 'Voz cristalina sem ruído de fundo para atendimento comercial, vendas, recepção e call center.',
    quickPitch: '2x headsets profissionais biauriculares com cancelamento de ruído ANC + amplificador USB Audio Boost.',
    tags: ['2x headsets + hub Boost', 'Microfone Noise-Cancelling', 'USB digital DSP'],
    category: 'kit-headset-boost',
    categoryLabel: 'Kits Headsets & Boost',
    badge: 'Vendas & atendimento • Audio Boost',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    image: '/images/produtos/pos-kit-headsets-boost.svg',
    inStock: true,
    stockCount: 14,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 672',
    priceSaleNumeric: 672,
    priceRent: 'R$ 85 / mês',
    priceRentNumeric: 85,
    rating: 4.9,
    reviewsCount: 57,
    shortDesc: 'Kit de áudio profissional para equipes comerciais e atendimento: inclui 2 headsets biauriculares com cancelamento de ruído + hub amplificador USB Audio Boost.',
    longDesc: 'Aumente a conversão de vendas da sua equipe comercial e a qualidade dos áudios enviados no WhatsApp e ligações VoIP. O kit headsets / Boost da Unrender reúne 2 headsets profissionais duplo auricular ergonomicamente projetados para uso contínuo de 8 h+ sem fadiga.\n\nO módulo USB Audio Boost aplica processamento digital de sinal (DSP) com ganho inteligente de voz e filtro de cancelamento de ruído ambiente (ANC), eliminando som de música de academia, conversas paralelas ou barulho de rua durante o atendimento ao cliente.',
    highlights: [
      'Kit completo com 2 headsets biauriculares profissionais + 1 hub amplificador USB Audio Boost',
      'Microfone com cancelamento ativo de ruído ambiente (filtra barulho de fundo da loja ou academia)',
      'Tecnologia Audio Boost DSP: voz encorpada, limpa e em volume ideal para áudios de WhatsApp e VoIP',
      'Controle in-line com botões de volume, atendimento e mute de microfone com LED indicador',
      'Arco em aço inox revestido e almofadas em couro proteico ultra macio para uso o dia inteiro'
    ],
    techSpecs: {
      'Conteúdo do kit': '2x headsets biauriculares USB + 1x hub/DAC USB Audio Boost',
      'Microfone': 'Haste flexível 300° com filtro direcional Noise-Cancelling (ANC)',
      'Processamento Boost': 'Chip DSP 24-bit com ganho automático de voz e proteção acústica',
      'Controles': 'Volume +, volume -, mute com LED vermelho e atendimento',
      'Conforto': 'Almofadas circumaurais macias + tiara ajustável reforçada',
      'Compatibilidade': 'WhatsApp Web, CRM SGA CTRLB, softphones VoIP, Meet, Zoom e Teams'
    },
    softwareModes: [
      'Integração direta com a central de atendimento omnichannel e discador VoIP do SGA CTRLB',
      'Gravação nítida de áudios e transcrição por IA sem interferência de ruído externo'
    ],
    idealFor: [
      'Equipes de vendas (SDR/Closers), recepção de academias e clínicas, suporte técnico e cobrança'
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o Kit Headsets / Boost Profissional USB Digital na Unrender.'
  },
  {
    id: 'kit-headset-wireless-boost',
    sku: 'POS-HEADSET-WL-BOOST',
    name: 'Kit Headset Wireless Bluetooth 5.3 + Base Carregadora Boost para Recepção e Vendas',
    shortTitle: 'Headset Wireless + Base Boost',
    tagline: 'Atenda clientes circulando pela loja com 35 h de bateria e duplo microfone com IA.',
    quickPitch: 'Headset sem fio Bluetooth 5.3 + dongle USB de baixa latência + base carregadora magnética Boost.',
    tags: ['Wireless BT 5.3 + dongle', 'Base carregadora Boost', '35 h bateria + ENC'],
    category: 'kit-headset-boost',
    categoryLabel: 'Kits Headsets & Boost',
    badge: 'Liberdade sem fio • 35 h',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    image: '/images/produtos/pos-headset-wireless-boost.svg',
    inStock: true,
    stockCount: 11,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 576',
    priceSaleNumeric: 576,
    priceRent: 'R$ 75 / mês',
    priceRentNumeric: 75,
    rating: 4.9,
    reviewsCount: 31,
    shortDesc: 'Headset sem fio com dongle USB + Bluetooth 5.3 multiponto, duplo microfone ENC para isolar ruído e base carregadora magnética Boost.',
    longDesc: 'Projetado para consultores de vendas e recepcionistas que precisam se movimentar pelo balcão, estoque ou salão sem interromper a chamada com o cliente. Conecta simultaneamente ao computador (via dongle USB Boost de longo alcance) e ao celular (via Bluetooth 5.3).\n\nAo final do atendimento, basta apoiar o headset na base carregadora magnética para mantê-lo sempre com 100% de carga e organizado na mesa.',
    highlights: [
      'Conexão multiponto: pareia no PC (via dongle USB Boost incluso) e no smartphone simultaneamente',
      'Alcance sem fio de até 30 metros com estabilidade de sinal e zero atraso de voz',
      'Duplo microfone ENC com algoritmo de IA que bloqueia até 96% dos ruídos ao redor',
      'Função Flip-to-Mute: basta levantar a haste do microfone para silenciar instantaneamente',
      'Até 35 horas de conversação contínua + base dock de carregamento rápido sobre a mesa'
    ],
    techSpecs: {
      'Conectividade': 'Bluetooth 5.3 multiponto + dongle USB-A Audio Boost',
      'Alcance sem fio': 'Até 30 metros livres de cabos',
      'Cancelamento de ruído': 'ENC Dual-Mic bloqueia até 96% do ruído ambiente',
      'Bateria e base': 'Até 35 h de chamadas + base dock magnética de mesa',
      'Função mute': 'Botão dedicado + Flip-to-Mute na haste do microfone'
    },
    softwareModes: [
      'Perfeito para atendimento híbrido (PC + WhatsApp mobile) e reuniões executivas'
    ],
    idealFor: [
      'Consultores comerciais, gerentes de loja, recepção dinâmica e atendimento VIP'
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o Kit Headset Wireless Bluetooth 5.3 + Base Carregadora Boost na Unrender.'
  },
  {
    id: 'leitor-codigo-barras-2d-usb',
    sku: 'POS-LEITOR-2D-USB',
    name: 'Leitor de Código de Barras 1D/2D e QR Code PIX Sem Fio + Base USB de Balcão',
    shortTitle: 'Leitor 2D / QR Code Sem Fio + USB',
    tagline: 'Leitura instantânea de produtos, boletos e QR Code na tela do celular com suporte automático.',
    quickPitch: 'Scanner Area Imager 1D/2D sem fio (2,4 GHz) + cabo USB com pedestal para leitura automática sem usar as mãos.',
    tags: ['Lê QR Code e telas', 'Sem fio + USB', 'Pedestal automático'],
    category: 'perifericos-pdv',
    categoryLabel: 'Leitores & Periféricos PDV',
    badge: '1D / 2D / QR Code • Sem fio',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    image: '/images/produtos/pos-leitor-2d-usb.svg',
    inStock: true,
    stockCount: 16,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 348',
    priceSaleNumeric: 348,
    priceRent: 'R$ 49 / mês',
    priceRentNumeric: 49,
    rating: 4.9,
    reviewsCount: 39,
    shortDesc: 'Leitor Area Imager 2D omnidirecional. Lê códigos de barras 1D, QR Code, PIX e carteirinhas na tela de celulares ou impressos, com ou sem fio.',
    longDesc: 'Agilize o lançamento de produtos no caixa e a validação de vouchers ou carteirinhas digitais. Diferente dos leitores laser antigos, a tecnologia Area Imager CMOS 2D lê códigos em qualquer ângulo (360°), inclusive códigos rasurados, plastificados ou exibidos na tela de smartphones.\n\nPode ser usado apoiado no pedestal incluso (modo automático Hands-Free que dispara sozinho ao aproximar o produto) ou fora da base sem fio em um raio de até 50 metros para conferência de estoque.',
    highlights: [
      'Leitura omnidirecional 360° de códigos de barras 1D (EAN/Boletos) e 2D (QR Code, PIX, DataMatrix)',
      'Lê diretamente na tela de celulares e tablets (ideal para vouchers, ingressos e carteirinha digital)',
      'Operação dupla: sem fio via receptor USB 2,4 GHz (até 50 m) ou conectado via cabo USB Plug & Play',
      'Memória interna para modo inventário (armazena até 10.000 leituras longe do computador)',
      'Acompanha pedestal articulado com sensor de leitura automática sem precisar apertar o gatilho'
    ],
    techSpecs: {
      'Tecnologia de leitura': 'Area Imager CMOS 2D omnidirecional (640 x 480 px)',
      'Leitura em telas': 'Sim — lê QR Code e códigos em telas de smartphones/monitores',
      'Conexão': 'Wireless 2,4 GHz (dongle USB) + cabo USB 2.0 Plug & Play',
      'Modo Hands-Free': 'Sensor de presença automático + pedestal de balcão incluso',
      'Resistência': 'Gabinete ABS emborrachado IP52 resistente a quedas de 1,5 m'
    },
    softwareModes: [
      'Busca e lançamento instantâneo de produtos no PDV e entrada de notas/estoque no SGA CTRLB',
      'Validação de check-in e comandas por QR Code'
    ],
    idealFor: [
      'Frente de caixa, controle de estoque/almoxarifado, lojas de suplementos/varejo e recepção'
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o Leitor de Código de Barras 1D/2D e QR Code Sem Fio + USB na Unrender.'
  }
];

function formatBrlFromCentavos(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined || centavos <= 0) return 'Sob consulta';
  const reais = Math.round(centavos / 100);
  return `R$ ${reais.toLocaleString('pt-BR')}`;
}

function mapearCategoriaPosSga(cat = ''): { id: string; label: string } {
  const c = cat.toLowerCase();
  if (c.includes('bluetooth')) return { id: 'impressora-bluetooth', label: 'Impressoras Bluetooth' };
  if (c.includes('impressora') || c.includes('térmica') || c.includes('termica')) {
    return { id: 'impressora-termica', label: 'Impressoras Térmicas' };
  }
  if (c.includes('caixa') || c.includes('gaveta') || c.includes('registradora')) {
    return { id: 'caixa-usb', label: 'Caixas Registradoras USB' };
  }
  if (c.includes('pc') || c.includes('computador') || c.includes('monitor') || c.includes('kit pc')) {
    return { id: 'kit-pc-caixa', label: 'Kits PC para Caixa' };
  }
  if (c.includes('headset') || c.includes('boost') || c.includes('áudio') || c.includes('audio')) {
    return { id: 'kit-headset-boost', label: 'Kits Headsets & Boost' };
  }
  return { id: 'perifericos-pdv', label: cat || 'Leitores & Periféricos PDV' };
}

/**
 * Mescla o catálogo ao vivo do SGA CTRLB (`produtosSga`) com os dados ricos de POS
 * da Unrender Dev, aplicando preço dinâmico (+ margem) e ocultando itens inativos
 * ou sem estoque no SGA CTRLB.
 */
export function mesclarCatalogoPosSga(produtosSga: any[] | null | undefined): ProdutoPos[] {
  if (!Array.isArray(produtosSga) || produtosSga.length === 0) {
    return produtosPos.filter((p) => p.inStock && (p.stockCount ?? 1) > 0);
  }

  const porSku = new Map<string, any>();
  const porNome = new Map<string, any>();
  for (const item of produtosSga) {
    if (item?.sku) porSku.set(String(item.sku).trim().toUpperCase(), item);
    if (item?.nome) porNome.set(String(item.nome).trim().toLowerCase(), item);
  }

  const usadosSgaIds = new Set<string>();
  const resultado: ProdutoPos[] = [];

  for (const base of produtosPos) {
    const skuKey = base.sku ? String(base.sku).trim().toUpperCase() : '';
    const sgaItem = (skuKey && porSku.get(skuKey)) || porNome.get(base.name.trim().toLowerCase()) || null;

    if (sgaItem) {
      usadosSgaIds.add(sgaItem.id);

      const ativo = sgaItem.ativo !== false && sgaItem.vender_online !== false;
      const controla = sgaItem.controla_estoque !== false;
      const saldo = typeof sgaItem.estoque_atual === 'number' ? sgaItem.estoque_atual : base.stockCount;
      const disponivelFlag =
        sgaItem.disponivel !== undefined
          ? Boolean(sgaItem.disponivel)
          : sgaItem.em_estoque !== undefined
            ? Boolean(sgaItem.em_estoque)
            : (!controla || saldo > 0) && !sgaItem.indisponivel_na_fonte;

      if (!ativo || !disponivelFlag || (controla && saldo <= 0) || sgaItem.indisponivel_na_fonte) {
        continue;
      }

      const precoCentavos =
        sgaItem.preco_efetivo_centavos ??
        sgaItem.preco_promocional_centavos ??
        sgaItem.preco_centavos ??
        null;
      const precoReais = precoCentavos !== null ? Math.round(precoCentavos / 100) : base.priceSaleNumeric;
      const locacaoCentavos = sgaItem.preco_locacao_centavos ?? null;
      const locacaoReais =
        locacaoCentavos !== null && locacaoCentavos > 0
          ? Math.round(locacaoCentavos / 100)
          : base.priceRentNumeric;

      resultado.push({
        ...base,
        sgaId: sgaItem.id,
        sku: sgaItem.sku || base.sku,
        name: sgaItem.nome || base.name,
        shortDesc: sgaItem.descricao || base.shortDesc,
        image: sgaItem.imagem_url || base.image,
        inStock: true,
        stockCount: saldo > 0 ? saldo : 1,
        priceSale: precoCentavos !== null ? formatBrlFromCentavos(precoCentavos) : base.priceSale,
        priceSaleNumeric: precoReais,
        priceRent:
          locacaoCentavos !== null && locacaoCentavos > 0
            ? `${formatBrlFromCentavos(locacaoCentavos)} / mês`
            : base.priceRent,
        priceRentNumeric: locacaoReais,
        parcelamentoExtraido: sgaItem.parcelamento_extraido || null,
        precoCartaoCentavos: sgaItem.preco_cartao_extraido_centavos || null,
        margemLucroPct: sgaItem.margem_lucro_pct ?? null,
        fontePrecoLoja: sgaItem.fonte_preco_loja ?? null,
      });
    } else {
      // Se o SGA retornou apenas itens de outra linha (ex.: antes da migration POS rodar),
      // mantém o catálogo base POS visível caso nenhum item POS tenha vindo do SGA ainda.
      const temAlgumPosNoSga = produtosSga.some((x) =>
        String(x?.sku || '').trim().toUpperCase().startsWith('POS-')
      );
      if (!temAlgumPosNoSga && base.inStock && (base.stockCount ?? 1) > 0) {
        resultado.push(base);
      }
    }
  }

  // Adiciona novos produtos POS cadastrados diretamente no SGA CTRLB
  for (const sgaItem of produtosSga) {
    if (!sgaItem || usadosSgaIds.has(sgaItem.id)) continue;
    const skuUpper = String(sgaItem.sku || '').trim().toUpperCase();
    // Ignora produtos VR da outra landing caso venham de um endpoint compartilhado
    if (skuUpper.startsWith('VR-') || skuUpper.startsWith('HW-')) continue;

    const ativo = sgaItem.ativo !== false && sgaItem.vender_online !== false;
    const controla = sgaItem.controla_estoque !== false;
    const saldo = typeof sgaItem.estoque_atual === 'number' ? sgaItem.estoque_atual : 1;
    const disponivelFlag =
      sgaItem.disponivel !== undefined
        ? Boolean(sgaItem.disponivel)
        : sgaItem.em_estoque !== undefined
          ? Boolean(sgaItem.em_estoque)
          : (!controla || saldo > 0) && !sgaItem.indisponivel_na_fonte;

    if (!ativo || !disponivelFlag || (controla && saldo <= 0) || sgaItem.indisponivel_na_fonte) {
      continue;
    }

    const cat = mapearCategoriaPosSga(sgaItem.categoria || '');
    const precoCentavos =
      sgaItem.preco_efetivo_centavos ?? sgaItem.preco_promocional_centavos ?? sgaItem.preco_centavos ?? null;
    const precoReais = precoCentavos !== null ? Math.round(precoCentavos / 100) : 0;
    const locacaoCentavos = sgaItem.preco_locacao_centavos ?? null;
    const locacaoReais = locacaoCentavos ? Math.round(locacaoCentavos / 100) : Math.max(49, Math.round(precoReais * 0.12));

    resultado.push({
      id: sgaItem.sku ? String(sgaItem.sku).toLowerCase() : `sga-${sgaItem.id}`,
      sgaId: sgaItem.id,
      sku: sgaItem.sku || 'POS-UNR',
      name: sgaItem.nome,
      shortTitle: String(sgaItem.nome || '').slice(0, 28),
      tagline: sgaItem.descricao || 'Equipamento comercial homologado pela Unrender.',
      quickPitch: sgaItem.descricao || 'Disponível para pronta entrega na Unrender.',
      tags: Array.isArray(sgaItem.selos) && sgaItem.selos.length > 0 ? sgaItem.selos : ['Pronta entrega', cat.label],
      category: cat.id,
      categoryLabel: cat.label,
      badge: sgaItem.destaque ? 'Destaque • Pronta entrega' : 'Pronta entrega',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      image: sgaItem.imagem_url || '/images/produtos/pos-kit-turnkey-completo.svg',
      inStock: true,
      stockCount: saldo,
      leadTime: 'Pronta entrega (envio em 24 h)',
      priceSale: formatBrlFromCentavos(precoCentavos),
      priceSaleNumeric: precoReais,
      priceRent: `${formatBrlFromCentavos(locacaoCentavos || Math.round((precoCentavos || 40000) * 0.12))} / mês`,
      priceRentNumeric: locacaoReais,
      rating: 5.0,
      reviewsCount: 15,
      shortDesc: sgaItem.descricao || sgaItem.nome,
      longDesc: sgaItem.descricao || sgaItem.nome,
      highlights: [
        'Equipamento homologado com garantia e suporte técnico Unrender',
        'Pronta entrega com configuração assistida para o seu negócio',
        sgaItem.parcelamento_extraido || 'Condições especiais no PIX ou parcelado em até 12x'
      ],
      techSpecs: sgaItem.especificacoes_tecnicas && Object.keys(sgaItem.especificacoes_tecnicas).length > 0
        ? sgaItem.especificacoes_tecnicas
        : {
            'Categoria': sgaItem.categoria || cat.label,
            'Código / SKU': sgaItem.sku || 'POS-UNR',
            'Disponibilidade': `${saldo} un. em estoque`
          },
      softwareModes: ['Compatível com o ecossistema SGA CTRLB e a automação comercial Unrender'],
      idealFor: ['Pontos de venda, recepções, escritórios comerciais e varejo'],
      parcelamentoExtraido: sgaItem.parcelamento_extraido || null,
      whatsappMessage: `Olá! Gostaria de comprar / orçar o equipamento "${sgaItem.nome}" na loja da Unrender.`
    });
  }

  return resultado;
}
