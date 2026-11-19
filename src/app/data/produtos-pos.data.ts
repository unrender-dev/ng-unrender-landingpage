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
  /** Preço sincronizado automaticamente com a loja de origem (+ margem), no SGA. */
  precoDinamico?: boolean;
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
  { id: 'caixa-usb', label: 'Gavetas de dinheiro', icon: 'fa-solid fa-cash-register' },
  { id: 'kit-pc-caixa', label: 'Computadores e terminais PDV', icon: 'fa-solid fa-desktop' },
  { id: 'kit-headset-boost', label: 'Headsets para atendimento', icon: 'fa-solid fa-headset' },
  { id: 'perifericos-pdv', label: 'Leitores e periféricos de PDV', icon: 'fa-solid fa-barcode' },
];

export const produtosPos: ProdutoPos[] = [
  {
    id: 'impressora-termica-80mm',
    sku: 'POS-IMP-TERM-80',
    name: 'Impressora Térmica Não Fiscal Elgin i8 Full 80mm com Guilhotina (USB, Ethernet e Serial)',
    shortTitle: 'Elgin i8 Full 80mm',
    tagline: 'Cupons, comandas e recibos com corte automático, ligada ao caixa por USB, rede ou serial.',
    quickPitch: 'Elgin i8 Full: bobina de 80 mm, 203 dpi, guilhotina e três conexões (USB, Ethernet e Serial).',
    tags: ['Elgin i8 Full', 'Guilhotina', 'USB + Ethernet + Serial'],
    category: 'impressora-termica',
    categoryLabel: 'Impressoras térmicas',
    badge: 'Elgin • Pronta entrega',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    image: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/468534/Impressora-N-o-Fiscal-T-rmica-Elgin-I8-Full-203dpi-Ethernet-USB-E-Serial-Com-Guilhotina_1686163696_g.jpg',
    inStock: true,
    stockCount: 12,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 912',
    priceSaleNumeric: 912,
    priceRent: 'R$ 119 / mês',
    priceRentNumeric: 119,
    rating: 5.0,
    reviewsCount: 64,
    shortDesc: 'Impressora térmica não fiscal Elgin i8 Full para bobina de 80 mm, 203 dpi, com guilhotina e conexões USB, Ethernet e Serial.',
    longDesc: 'A Elgin i8 Full é uma impressora térmica não fiscal para frente de caixa, cozinha e balcão. Usa bobina de 80 mm, imprime em 203 dpi e corta o papel sozinha com a guilhotina.\n\nPelas três conexões (USB, Ethernet e Serial) ela pode ficar ligada direto no computador do caixa ou na rede, para mais de um ponto imprimir nela. A Unrender entrega instalada e configurada para imprimir os pedidos, comandas e recibos do SGA CTRLB.',
    highlights: [
      'Bobina de 80 mm com resolução de 203 dpi',
      'Guilhotina: o papel sai cortado',
      'Três conexões: USB, Ethernet e Serial',
      'Pode imprimir em rede para mais de um caixa ou para a cozinha',
    ],
    techSpecs: {
      'Marca': 'Elgin',
      'Modelo': 'i8 Full',
      'Tipo': 'Não fiscal',
      'Largura do papel': '80 mm',
      'Resolução': '203 dpi',
      'Corte': 'Guilhotina',
      'Interfaces': 'USB, Ethernet e Serial',
    },
    softwareModes: [
      'Instalação e configuração pela Unrender no computador do caixa',
      'Impressão de pedidos, comandas e recibos do SGA CTRLB',
      'Suporte técnico Unrender e garantia do fabricante',
    ],
    idealFor: ['Restaurantes, lanchonetes, varejo, academias, clínicas e recepções'],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o equipamento "Impressora Térmica Não Fiscal Elgin i8 Full 80mm com Guilhotina (USB, Ethernet e Serial)" na Unrender.'
  },
  {
    id: 'impressora-termica-pro-300',
    sku: 'POS-IMP-TERM-DUAL',
    name: 'Impressora Térmica Elgin i9 Full com Guilhotina (USB, Serial e Ethernet)',
    shortTitle: 'Elgin i9 Full',
    tagline: 'A mais rápida da linha Elgin: até 300 mm/s para caixas de movimento alto.',
    quickPitch: 'Elgin i9 Full: até 300 mm/s, guilhotina e tripla interface (USB, Serial e Ethernet).',
    tags: ['Elgin i9 Full', 'Até 300 mm/s', 'USB + Serial + Ethernet'],
    category: 'impressora-termica',
    categoryLabel: 'Impressoras térmicas',
    badge: 'Elgin • Alto volume',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    image: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/177587/large/Impressora-T-rmica-Elgin-I9-Full-USB-Serial-E-Ethernet_1793153329.jpg',
    inStock: true,
    stockCount: 8,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 1.199',
    priceSaleNumeric: 1199,
    priceRent: 'R$ 149 / mês',
    priceRentNumeric: 149,
    rating: 4.9,
    reviewsCount: 38,
    shortDesc: 'Impressora térmica não fiscal Elgin i9 Full, até 300 mm/s, guilhotina e tripla interface USB, Serial e Ethernet.',
    longDesc: 'A Elgin i9 Full é a opção para quem imprime muito: chega a 300 mm/s, então a fila do caixa não espera o cupom. Tem guilhotina e três interfaces (USB, Serial e Ethernet) para ligar no computador ou na rede.\n\nA Unrender instala, configura e deixa pronta para imprimir os pedidos e recibos do SGA CTRLB, com suporte técnico depois da entrega.',
    highlights: [
      'Impressão de até 300 mm/s',
      'Guilhotina para corte automático',
      'Tripla interface: USB, Serial e Ethernet',
      'Indicada para caixas e cozinhas de movimento alto',
    ],
    techSpecs: {
      'Marca': 'Elgin',
      'Modelo': 'i9 Full',
      'Tipo': 'Não fiscal',
      'Velocidade': 'até 300 mm/s',
      'Corte': 'Guilhotina',
      'Interfaces': 'USB, Serial e Ethernet',
    },
    softwareModes: [
      'Instalação e configuração pela Unrender no computador do caixa',
      'Impressão de pedidos, comandas e recibos do SGA CTRLB',
      'Suporte técnico Unrender e garantia do fabricante',
    ],
    idealFor: [
      'Supermercados, restaurantes com delivery, farmácias e lojas de movimento alto',
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o equipamento "Impressora Térmica Elgin i9 Full com Guilhotina (USB, Serial e Ethernet)" na Unrender.'
  },
  {
    id: 'impressora-bluetooth-58mm',
    sku: 'POS-IMP-BT-58',
    name: 'Mini Impressora Térmica Portátil Bluetooth 58mm Knup',
    shortTitle: 'Knup Bluetooth 58mm',
    tagline: 'Imprime do celular, do tablet ou do PC, sem fio, onde o atendimento estiver.',
    quickPitch: 'Mini impressora Knup de 58 mm com Bluetooth e USB, compatível com Android, iOS e Windows.',
    tags: ['Portátil', 'Bluetooth + USB', 'Android, iOS e Windows'],
    category: 'impressora-bluetooth',
    categoryLabel: 'Impressoras Bluetooth',
    badge: 'Portátil • Pronta entrega',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    image: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/562609/Mini-Impressora-T-rmica-Port-til-Bluetooth-58mm_1717700035_g.jpg',
    inStock: true,
    stockCount: 18,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 466',
    priceSaleNumeric: 466,
    priceRent: 'R$ 59 / mês',
    priceRentNumeric: 59,
    rating: 4.9,
    reviewsCount: 52,
    shortDesc: 'Mini impressora térmica portátil Knup para bobina de 58 mm, sem fio por Bluetooth e com porta USB; funciona com Android, iOS e Windows.',
    longDesc: 'Pequena e portátil, a Knup imprime comprovantes e pedidos de qualquer lugar: na mesa do cliente, na entrega, no evento ou no balcão. Conecta por Bluetooth ao celular, tablet ou computador e também tem porta USB.\n\nA Unrender pareia e configura a impressora com os aparelhos da sua equipe.',
    highlights: [
      'Bobina de 58 mm',
      'Sem fio por Bluetooth e com porta USB',
      'Funciona com Android, iOS e Windows',
      'Leve para usar em mesas, entregas e eventos',
    ],
    techSpecs: {
      'Marca': 'Knup',
      'Largura do papel': '58 mm',
      'Conexão': 'Bluetooth e USB',
      'Compatibilidade': 'Android, iOS e Windows',
    },
    softwareModes: [
      'Instalação e configuração pela Unrender no computador do caixa',
      'Suporte técnico Unrender e garantia do fabricante',
      'Compra à vista ou locação mensal com manutenção',
    ],
    idealFor: ['Delivery, food trucks, eventos, vendas externas e atendimento na mesa'],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o equipamento "Mini Impressora Térmica Portátil Bluetooth 58mm Knup" na Unrender.'
  },
  {
    id: 'impressora-bluetooth-80mm',
    sku: 'POS-IMP-BT-80',
    name: 'Impressora Térmica Bluetooth 80mm (Windows, iOS e Android)',
    shortTitle: 'Térmica Bluetooth 80mm',
    tagline: 'Cupom de 80 mm sem cabo: o tamanho do caixa com a liberdade do Bluetooth.',
    quickPitch: 'Impressora térmica para bobina de 80 mm com Bluetooth, compatível com Windows, iOS e Android.',
    tags: ['Bobina 80 mm', 'Bluetooth', 'Windows, iOS e Android'],
    category: 'impressora-bluetooth',
    categoryLabel: 'Impressoras Bluetooth',
    badge: 'Sem fio • Pronta entrega',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    image: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/562491/Mini-Impressora-Bluetooth-T-rmica-80mm-Windows-Ios-Android_1716987752_g.jpg',
    inStock: true,
    stockCount: 10,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 997',
    priceSaleNumeric: 997,
    priceRent: 'R$ 129 / mês',
    priceRentNumeric: 129,
    rating: 4.8,
    reviewsCount: 29,
    shortDesc: 'Impressora térmica para bobina de 80 mm com conexão Bluetooth, compatível com Windows, iOS e Android.',
    longDesc: 'Imprime na largura padrão de caixa (80 mm) sem precisar de cabo: o computador, o tablet ou o celular mandam a impressão por Bluetooth. Boa para balcões com tablet, quiosques e caixas móveis.\n\nA Unrender faz o pareamento com os aparelhos e deixa a impressão dos pedidos e recibos funcionando.',
    highlights: [
      'Bobina de 80 mm, o tamanho padrão de caixa',
      'Conexão Bluetooth, sem cabo',
      'Compatível com Windows, iOS e Android',
    ],
    techSpecs: {
      'Largura do papel': '80 mm',
      'Conexão': 'Bluetooth',
      'Compatibilidade': 'Windows, iOS e Android',
    },
    softwareModes: [
      'Instalação e configuração pela Unrender no computador do caixa',
      'Impressão de pedidos, comandas e recibos do SGA CTRLB',
      'Suporte técnico Unrender e garantia do fabricante',
    ],
    idealFor: ['Caixas com tablet, quiosques, feiras e lojas com caixa móvel'],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o equipamento "Impressora Térmica Bluetooth 80mm (Windows, iOS e Android)" na Unrender.'
  },
  {
    id: 'caixa-registradora-usb',
    sku: 'POS-CAIXA-USB',
    name: 'Gaveta de Dinheiro Automática Bematech GD-56 (RJ12, 5 cédulas e 6 moedas)',
    shortTitle: 'Gaveta Bematech GD-56',
    tagline: 'Abre sozinha quando a venda em dinheiro é fechada, comandada pela impressora de cupom.',
    quickPitch: 'Bematech GD-56: conector RJ12 para abrir pela impressora, 5 nichos para cédulas, 6 para moedas e 2 chaves.',
    tags: ['Bematech GD-56', 'Abertura automática RJ12', '5 cédulas + 6 moedas'],
    category: 'caixa-usb',
    categoryLabel: 'Gavetas de dinheiro',
    badge: 'Bematech • Pronta entrega',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    image: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/173563/large/Gaveta-de-Dinheiro-Autom-tica-Bematech-GD-56-RJ12-5-nichos-Para-C-dulas-e-6-nichos-para-Moedas_1790827420.jpg',
    inStock: true,
    stockCount: 15,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 546',
    priceSaleNumeric: 546,
    priceRent: 'R$ 69 / mês',
    priceRentNumeric: 69,
    rating: 4.9,
    reviewsCount: 47,
    shortDesc: 'Gaveta de dinheiro automática Bematech GD-56 com conector RJ12 (abre pela impressora de cupom), 5 nichos para cédulas, 6 para moedas e 2 chaves.',
    longDesc: 'A GD-56 liga na impressora de cupom pelo conector RJ12: quando a venda em dinheiro é registrada, a impressora manda abrir a gaveta. Também abre na chave, se precisar.\n\nTem 5 nichos para cédulas e 6 para moedas. A Unrender liga a gaveta à impressora e configura a abertura automática no caixa do SGA CTRLB.',
    highlights: [
      'Abertura automática pela impressora (RJ12)',
      'Abertura manual com chave (2 chaves)',
      '5 nichos para cédulas e 6 para moedas',
    ],
    techSpecs: {
      'Marca': 'Bematech',
      'Modelo': 'GD-56',
      'Abertura': 'Automática pela impressora (RJ12) e manual com chave',
      'Compartimentos': '5 para cédulas e 6 para moedas',
    },
    softwareModes: [
      'Instalação e configuração pela Unrender no computador do caixa',
      'Suporte técnico Unrender e garantia do fabricante',
      'Compra à vista ou locação mensal com manutenção',
    ],
    idealFor: [
      'Frentes de caixa de varejo, restaurantes, academias e recepções que recebem em dinheiro',
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o equipamento "Gaveta de Dinheiro Automática Bematech GD-56 (RJ12, 5 cédulas e 6 moedas)" na Unrender.'
  },
  {
    id: 'caixa-registradora-smart-usb',
    sku: 'POS-CAIXA-SMART-USB',
    name: 'Gaveta de Dinheiro Automática Megaview (5 posições)',
    shortTitle: 'Gaveta Megaview',
    tagline: 'Gaveta automática para o caixa, com 5 posições para cédulas.',
    quickPitch: 'Gaveta de dinheiro automática Megaview com 5 posições para cédulas.',
    tags: ['Megaview', 'Abertura automática', '5 posições'],
    category: 'caixa-usb',
    categoryLabel: 'Gavetas de dinheiro',
    badge: 'Megaview • Pronta entrega',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    image: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/502863/Gaveta-De-Dinheiro-Megaview-Autom-tica-Com-5-Posi-es_1697743098_g.jpg',
    inStock: true,
    stockCount: 9,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 600',
    priceSaleNumeric: 600,
    priceRent: 'R$ 79 / mês',
    priceRentNumeric: 79,
    rating: 5.0,
    reviewsCount: 24,
    shortDesc: 'Gaveta de dinheiro automática Megaview com 5 posições para cédulas.',
    longDesc: 'Gaveta de dinheiro automática da Megaview, com 5 posições para cédulas, para organizar o troco no caixa.\n\nA Unrender confere a compatibilidade com a sua impressora, faz a ligação e configura a abertura automática no caixa do SGA CTRLB.',
    highlights: [
      'Abertura automática',
      '5 posições para cédulas',
      'Ligação e configuração feitas pela Unrender',
    ],
    techSpecs: {
      'Marca': 'Megaview',
      'Abertura': 'Automática',
      'Compartimentos': '5 posições para cédulas',
    },
    softwareModes: [
      'Instalação e configuração pela Unrender no computador do caixa',
      'Suporte técnico Unrender e garantia do fabricante',
      'Compra à vista ou locação mensal com manutenção',
    ],
    idealFor: ['Lojas, lanchonetes, salões e recepções'],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o equipamento "Gaveta de Dinheiro Automática Megaview (5 posições)" na Unrender.'
  },
  {
    id: 'kit-pc-caixa-completo',
    sku: 'POS-KIT-PC-CAIXA',
    name: 'Computador Completo TOB Intel Core i5, 8GB, SSD 120GB, Monitor 19", Teclado e Mouse',
    shortTitle: 'PC TOB i5 + monitor 19"',
    tagline: 'Computador pronto para o caixa: liga, entra no SGA CTRLB e começa a vender.',
    quickPitch: 'TOB com Intel Core i5, 8 GB, SSD de 120 GB, monitor de 19", teclado e mouse.',
    tags: ['Intel Core i5', 'Monitor 19"', 'Teclado e mouse'],
    category: 'kit-pc-caixa',
    categoryLabel: 'Computadores e terminais PDV',
    badge: 'Completo • Pronta entrega',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    image: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/938903/large/Computador-Completo-Tob-Intel-Core-i5-Com-SSD-120GB-Mem-ria-8GB-WINDOWS-10-Pro-Trial-Teclado-E-Mouse-Monitor-19-Desktop_1770930015.jpg',
    inStock: true,
    stockCount: 10,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 1.213',
    priceSaleNumeric: 1213,
    priceRent: 'R$ 159 / mês',
    priceRentNumeric: 159,
    rating: 5.0,
    reviewsCount: 81,
    shortDesc: 'Computador completo TOB com Intel Core i5, 8 GB de memória, SSD de 120 GB, monitor de 19 polegadas, teclado e mouse.',
    longDesc: 'Tudo o que o caixa precisa numa caixa só: computador TOB com Intel Core i5, 8 GB de memória e SSD de 120 GB, mais monitor de 19 polegadas, teclado e mouse. Vem com Windows 10 Pro em versão de avaliação.\n\nA Unrender entrega com o SGA CTRLB instalado e ligado à impressora, à gaveta e ao leitor que você escolher.',
    highlights: [
      'Intel Core i5 com 8 GB de memória',
      'SSD de 120 GB',
      'Monitor de 19", teclado e mouse inclusos',
      'Windows 10 Pro (versão de avaliação)',
    ],
    techSpecs: {
      'Marca': 'TOB Computers',
      'Processador': 'Intel Core i5',
      'Memória': '8 GB',
      'Armazenamento': 'SSD 120 GB',
      'Monitor': '19 polegadas',
      'Periféricos': 'Teclado e mouse',
      'Sistema': 'Windows 10 Pro (avaliação)',
    },
    softwareModes: [
      'Entregue com o SGA CTRLB instalado e configurado pela Unrender',
      'Suporte técnico Unrender e garantia do fabricante',
      'Compra à vista ou locação mensal com manutenção',
    ],
    idealFor: ['Frentes de caixa, recepções e escritórios'],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o equipamento "Computador Completo TOB Intel Core i5, 8GB, SSD 120GB, Monitor 19", Teclado e Mouse" na Unrender.'
  },
  {
    id: 'kit-pc-caixa-touch-pro',
    sku: 'POS-KIT-PC-PRO',
    name: 'PDV Megaview Touch 15" Intel Core i5, 8GB, SSD 120GB, Windows 10 Pro',
    shortTitle: 'PDV Megaview Touch 15"',
    tagline: 'Terminal de caixa com tela touch: venda com o dedo, sem teclado no balcão.',
    quickPitch: 'PDV Megaview com tela touch de 15", Intel Core i5, 8 GB, SSD de 120 GB e Windows 10 Pro.',
    tags: ['Tela touch 15"', 'Intel Core i5', 'Windows 10 Pro'],
    category: 'kit-pc-caixa',
    categoryLabel: 'Computadores e terminais PDV',
    badge: 'Touch • Pronta entrega',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    image: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/564880/large/PDV-Megaview-Touch-15-Intel-Core-I5-8GB-SSD-120GB-Windows-10-Pro_1771429121.jpg',
    inStock: true,
    stockCount: 6,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 4.560',
    priceSaleNumeric: 4560,
    priceRent: 'R$ 569 / mês',
    priceRentNumeric: 569,
    rating: 5.0,
    reviewsCount: 33,
    shortDesc: 'Terminal PDV Megaview com tela touch de 15 polegadas, Intel Core i5, 8 GB de memória, SSD de 120 GB e Windows 10 Pro.',
    longDesc: 'Computador e tela num só equipamento: o PDV Megaview tem tela touch de 15 polegadas, Intel Core i5, 8 GB de memória, SSD de 120 GB e Windows 10 Pro. Ocupa pouco espaço no balcão e deixa o caixa mais rápido no toque.\n\nA Unrender instala o SGA CTRLB, liga impressora, gaveta e leitor e entrega pronto para vender.',
    highlights: [
      'Tela touch de 15 polegadas',
      'Intel Core i5, 8 GB e SSD de 120 GB',
      'Windows 10 Pro',
      'Computador e tela num só equipamento',
    ],
    techSpecs: {
      'Marca': 'Megaview',
      'Tela': 'Touch 15 polegadas',
      'Processador': 'Intel Core i5',
      'Memória': '8 GB',
      'Armazenamento': 'SSD 120 GB',
      'Sistema': 'Windows 10 Pro',
    },
    softwareModes: [
      'Entregue com o SGA CTRLB instalado e configurado pela Unrender',
      'Suporte técnico Unrender e garantia do fabricante',
      'Compra à vista ou locação mensal com manutenção',
    ],
    idealFor: ['Restaurantes, cafeterias, lojas e balcões com pouco espaço'],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o equipamento "PDV Megaview Touch 15" Intel Core i5, 8GB, SSD 120GB, Windows 10 Pro" na Unrender.'
  },
  {
    id: 'estacao-pdv-turnkey-completa',
    sku: 'POS-KIT-TURNKEY',
    name: 'Kit Automação PDV TOB Intel Core i5, 8GB, SSD 240GB + Impressora Térmica, Gaveta e Leitor',
    shortTitle: 'Kit PDV TOB completo',
    tagline: 'O caixa inteiro numa compra só: computador, impressora, gaveta e leitor.',
    quickPitch: 'Computador TOB i5 (4ª geração), 8 GB, SSD de 240 GB e Wi-Fi, com impressora térmica, gaveta, leitor, teclado e mouse.',
    tags: ['Kit PDV completo', 'Impressora + gaveta + leitor', 'Intel Core i5'],
    category: 'kit-pc-caixa',
    categoryLabel: 'Computadores e terminais PDV',
    badge: 'Kit completo • Pronta entrega',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    image: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/684884/large/Kit-Automa-o-Pdv-Tob-Intel-I5-4-g-8GB-SSD-240GB-Win10-Rede-S-fio-Teclado-Mouse-Gaveta-Dinheiro-Impressora-T-rmica-Leitor-C-digo-De-Barras_1760704459.jpg',
    inStock: true,
    stockCount: 7,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 2.076',
    priceSaleNumeric: 2076,
    priceRent: 'R$ 259 / mês',
    priceRentNumeric: 259,
    rating: 5.0,
    reviewsCount: 44,
    shortDesc: 'Kit de automação PDV TOB: computador Intel Core i5 (4ª geração), 8 GB, SSD 240 GB, Windows 10 e rede sem fio, com teclado, mouse, gaveta de dinheiro, impressora térmica e leitor de código de barras.',
    longDesc: 'Para abrir um caixa do zero sem montar peça por peça: o kit TOB traz o computador (Intel Core i5 de 4ª geração, 8 GB, SSD de 240 GB, Windows 10 e rede sem fio) com teclado, mouse, gaveta de dinheiro, impressora térmica e leitor de código de barras.\n\nA Unrender instala o SGA CTRLB, liga todos os periféricos e testa a venda completa antes de entregar.',
    highlights: [
      'Computador Intel Core i5 (4ª geração), 8 GB e SSD de 240 GB',
      'Windows 10 e rede sem fio',
      'Inclui impressora térmica, gaveta de dinheiro e leitor de código de barras',
      'Teclado e mouse inclusos',
    ],
    techSpecs: {
      'Marca': 'TOB Computers',
      'Computador': 'Intel Core i5 (4ª geração), 8 GB, SSD 240 GB, Windows 10, rede sem fio',
      'Inclui': 'Teclado, mouse, gaveta de dinheiro, impressora térmica e leitor de código de barras',
    },
    softwareModes: [
      'Entregue com o SGA CTRLB instalado e configurado pela Unrender',
      'Suporte técnico Unrender e garantia do fabricante',
      'Compra à vista ou locação mensal com manutenção',
    ],
    idealFor: [
      'Quem está abrindo um caixa novo: lojas, mercados, lanchonetes e restaurantes',
    ],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o equipamento "Kit Automação PDV TOB Intel Core i5, 8GB, SSD 240GB + Impressora Térmica, Gaveta e Leitor" na Unrender.'
  },
  {
    id: 'kit-headsets-boost-usb',
    sku: 'POS-KIT-HEADSET-BOOST',
    name: 'Headset Biauricular Intelbras CHS 60B USB',
    shortTitle: 'Headset Intelbras CHS 60B',
    tagline: 'Para quem atende o dia todo: dois fones, microfone e USB plug and play.',
    quickPitch: 'Intelbras CHS 60B: headset biauricular USB plug and play para atendimento, com Windows, Mac e Linux.',
    tags: ['Intelbras CHS 60B', 'USB plug and play', 'Call center'],
    category: 'kit-headset-boost',
    categoryLabel: 'Headsets para atendimento',
    badge: 'Intelbras • Pronta entrega',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    image: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/122746/large/Headset-Biauricular-Chs-60B-Usb_1794605918.jpg',
    inStock: true,
    stockCount: 14,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 370',
    priceSaleNumeric: 370,
    priceRent: 'R$ 49 / mês',
    priceRentNumeric: 49,
    rating: 4.9,
    reviewsCount: 57,
    shortDesc: 'Headset biauricular Intelbras CHS 60B com conexão USB plug and play, feito para atendimento e call center; funciona em Windows, Mac e Linux.',
    longDesc: 'O CHS 60B da Intelbras cobre as duas orelhas e tem microfone, para atender ligações e chamadas de vídeo com as mãos livres. Liga na porta USB e funciona sem instalar driver, em Windows, Mac e Linux.\n\nCombina com o atendimento do SGA CTRLB, em que a equipe conversa com os clientes pelo computador.',
    highlights: [
      'Biauricular, com microfone',
      'USB plug and play, sem driver',
      'Funciona em Windows, Mac e Linux',
      'Feito para atendimento e call center',
    ],
    techSpecs: {
      'Marca': 'Intelbras',
      'Modelo': 'CHS 60B USB',
      'Tipo': 'Biauricular',
      'Conexão': 'USB plug and play',
      'Compatibilidade': 'Windows, Mac e Linux',
    },
    softwareModes: [
      'Atendimento das conversas do SGA CTRLB (WhatsApp, Instagram e chamadas) com as mãos livres',
      'Suporte técnico Unrender e garantia do fabricante',
      'Compra à vista ou locação mensal com manutenção',
    ],
    idealFor: ['Equipes de atendimento, recepções, vendas internas e call centers'],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o equipamento "Headset Biauricular Intelbras CHS 60B USB" na Unrender.'
  },
  {
    id: 'kit-headset-wireless-boost',
    sku: 'POS-HEADSET-WL-BOOST',
    name: 'Headset Sem Fio para Home Office, Telemarketing e Call Center',
    shortTitle: 'Headset sem fio',
    tagline: 'Atenda sem cabo e levante da cadeira sem derrubar a ligação.',
    quickPitch: 'Headset sem fio para atendimento: home office, telemarketing e call center.',
    tags: ['Sem fio', 'Home office', 'Call center'],
    category: 'kit-headset-boost',
    categoryLabel: 'Headsets para atendimento',
    badge: 'Sem fio • Pronta entrega',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    image: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/612468/large/Fone-Headset-Home-Office-Telemarketing-Callcenter-Sem-Fio_1793237346.jpg',
    inStock: true,
    stockCount: 11,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 211',
    priceSaleNumeric: 211,
    priceRent: 'R$ 29 / mês',
    priceRentNumeric: 29,
    rating: 4.9,
    reviewsCount: 31,
    shortDesc: 'Headset sem fio para atendimento: home office, telemarketing e call center.',
    longDesc: 'Headset sem fio pensado para quem passa o dia atendendo, em casa ou no escritório. Sem o cabo, a pessoa se movimenta à vontade durante a ligação.\n\nA Unrender configura o headset no computador de cada atendente para o uso no SGA CTRLB.',
    highlights: [
      'Sem fio',
      'Para home office, telemarketing e call center',
      'Configuração feita pela Unrender',
    ],
    techSpecs: {
      'Tipo': 'Headset sem fio',
      'Uso': 'Home office, telemarketing e call center',
    },
    softwareModes: [
      'Atendimento das conversas do SGA CTRLB (WhatsApp, Instagram e chamadas) com as mãos livres',
      'Suporte técnico Unrender e garantia do fabricante',
      'Compra à vista ou locação mensal com manutenção',
    ],
    idealFor: ['Atendentes em home office, telemarketing e recepções'],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o equipamento "Headset Sem Fio para Home Office, Telemarketing e Call Center" na Unrender.'
  },
  {
    id: 'leitor-codigo-barras-2d-usb',
    sku: 'POS-LEITOR-2D-USB',
    name: 'Leitor de Código de Barras Elgin EL300 1D/2D QR Code Bluetooth 5.0 Sem Fio',
    shortTitle: 'Leitor Elgin EL300 2D',
    tagline: 'Lê código de barras, QR Code e códigos 2D sem fio, do balcão ao estoque.',
    quickPitch: 'Elgin EL300: leitor sem fio Bluetooth 5.0 para códigos 1D, 2D e QR Code.',
    tags: ['Elgin EL300', '1D, 2D e QR Code', 'Bluetooth 5.0'],
    category: 'perifericos-pdv',
    categoryLabel: 'Leitores e periféricos de PDV',
    badge: 'Elgin • Pronta entrega',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    image: 'https://images.kabum.com.br/produtos/fotos/sync_mirakl/708125/large/Leitor-De-C-digo-De-Barras-Elgin-El300-1d-2d-Qr-Code-Bluetooth-5-0-S-Fio-Preto_1787237316.jpg',
    inStock: true,
    stockCount: 16,
    leadTime: 'Pronta entrega (envio em 24 h)',
    priceSale: 'R$ 1.419',
    priceSaleNumeric: 1419,
    priceRent: 'R$ 179 / mês',
    priceRentNumeric: 179,
    rating: 4.9,
    reviewsCount: 39,
    shortDesc: 'Leitor de código de barras Elgin EL300 sem fio (Bluetooth 5.0), lê códigos 1D, 2D e QR Code.',
    longDesc: 'O Elgin EL300 lê códigos de barras comuns (1D), códigos 2D e QR Code, sem fio por Bluetooth 5.0. Serve no caixa, para passar os produtos, e no estoque, para conferir mercadoria longe do computador.\n\nA Unrender pareia o leitor e deixa a leitura caindo direto no caixa e no estoque do SGA CTRLB.',
    highlights: [
      'Lê códigos 1D, 2D e QR Code',
      'Sem fio, Bluetooth 5.0',
      'Para caixa e conferência de estoque',
    ],
    techSpecs: {
      'Marca': 'Elgin',
      'Modelo': 'EL300',
      'Leitura': '1D, 2D e QR Code',
      'Conexão': 'Bluetooth 5.0, sem fio',
    },
    softwareModes: [
      'Leitura direta no caixa e no estoque do SGA CTRLB',
      'Suporte técnico Unrender e garantia do fabricante',
      'Compra à vista ou locação mensal com manutenção',
    ],
    idealFor: ['Varejo, mercados, farmácias, almoxarifados e lojas de suplementos'],
    whatsappMessage: 'Olá! Gostaria de comprar / orçar o equipamento "Leitor de Código de Barras Elgin EL300 1D/2D QR Code Bluetooth 5.0 Sem Fio" na Unrender.'
  }
];

function formatBrlFromCentavos(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined || centavos <= 0) return 'Sob consulta';
  const reais = Math.round(centavos / 100);
  return `R$ ${reais.toLocaleString('pt-BR')}`;
}

function temSpecs(specs: unknown): specs is Record<string, string> {
  return !!specs && typeof specs === 'object' && Object.keys(specs as object).length > 0;
}

function mapearCategoriaPosSga(cat = ''): { id: string; label: string } {
  const c = cat.toLowerCase();
  if (c.includes('bluetooth')) return { id: 'impressora-bluetooth', label: 'Impressoras Bluetooth' };
  if (c.includes('impressora') || c.includes('térmica') || c.includes('termica')) {
    return { id: 'impressora-termica', label: 'Impressoras térmicas' };
  }
  if (c.includes('caixa') || c.includes('gaveta') || c.includes('registradora')) {
    return { id: 'caixa-usb', label: 'Gavetas de dinheiro' };
  }
  if (c.includes('pc') || c.includes('computador') || c.includes('monitor') || c.includes('kit pc')) {
    return { id: 'kit-pc-caixa', label: 'Computadores e terminais PDV' };
  }
  if (c.includes('headset') || c.includes('boost') || c.includes('áudio') || c.includes('audio')) {
    return { id: 'kit-headset-boost', label: 'Headsets para atendimento' };
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
        longDesc: sgaItem.descricao && sgaItem.descricao !== base.shortDesc ? sgaItem.descricao : base.longDesc,
        tags: Array.isArray(sgaItem.selos) && sgaItem.selos.length > 0 ? sgaItem.selos : base.tags,
        techSpecs: temSpecs(sgaItem.especificacoes_tecnicas) ? sgaItem.especificacoes_tecnicas : base.techSpecs,
        // Foto da loja de origem (ou subida no SGA); a ilustração local só quando o SGA não tem foto.
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
        precoDinamico: sgaItem.preco_dinamico_ativo === true,
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
      precoDinamico: sgaItem.preco_dinamico_ativo === true,
      whatsappMessage: `Olá! Gostaria de comprar / orçar o equipamento "${sgaItem.nome}" na loja da Unrender.`
    });
  }

  return resultado;
}
