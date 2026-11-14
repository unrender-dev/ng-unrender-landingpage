import { Lang, dict } from '../../../../i18n/i18n.service';

export const I18N = dict({
  pt: {
    title: 'Laboratório de hardware',
    subtitle: 'Comparativo de arquiteturas',
    categories: 'Categorias de hardware',
    catServers: 'Servidores',
    catProcessors: 'Processadores e aceleradores',
    catBoards: 'SBCs e placas-mãe',
    catDevices: 'Dispositivos especiais',
    highlights: 'Destaques',
    metrics: 'Análise de métricas',
    mPerformance: 'Desempenho',
    mEfficiency: 'Eficiência energética',
    mPower: 'Consumo de energia',
    mCost: 'Custo estimado',
    scale: 'Índices relativos de 0 a 100',
  },
  en: {
    title: 'Hardware lab',
    subtitle: 'Architecture comparison',
    categories: 'Hardware categories',
    catServers: 'Servers',
    catProcessors: 'Processors & accelerators',
    catBoards: 'SBCs & motherboards',
    catDevices: 'Special devices',
    highlights: 'Highlights',
    metrics: 'Metrics at a glance',
    mPerformance: 'Performance',
    mEfficiency: 'Energy efficiency',
    mPower: 'Power draw',
    mCost: 'Estimated cost',
    scale: 'Relative scores from 0 to 100',
  },
  es: {
    title: 'Laboratorio de hardware',
    subtitle: 'Comparativa de arquitecturas',
    categories: 'Categorías de hardware',
    catServers: 'Servidores',
    catProcessors: 'Procesadores y aceleradores',
    catBoards: 'SBC y placas base',
    catDevices: 'Dispositivos especiales',
    highlights: 'Puntos fuertes',
    metrics: 'Análisis de métricas',
    mPerformance: 'Rendimiento',
    mEfficiency: 'Eficiencia energética',
    mPower: 'Consumo de energía',
    mCost: 'Coste estimado',
    scale: 'Índices relativos de 0 a 100',
  },
  fr: {
    title: 'Laboratoire matériel',
    subtitle: 'Comparatif d’architectures',
    categories: 'Catégories de matériel',
    catServers: 'Serveurs',
    catProcessors: 'Processeurs et accélérateurs',
    catBoards: 'SBC et cartes mères',
    catDevices: 'Appareils spécialisés',
    highlights: 'Points forts',
    metrics: 'Analyse des indicateurs',
    mPerformance: 'Performances',
    mEfficiency: 'Efficacité énergétique',
    mPower: 'Consommation électrique',
    mCost: 'Coût estimé',
    scale: 'Indices relatifs de 0 à 100',
  },
});

export type ItemId =
  | 'srv-x86'
  | 'srv-arm'
  | 'srv-riscv'
  | 'proc-mcu'
  | 'proc-gpu'
  | 'proc-tpu'
  | 'dev-sbc'
  | 'mobo-ws'
  | 'dev-phone-thermal'
  | 'dev-phone-lidar'
  | 'dev-ar-glasses'
  | 'dev-tracker';

export interface ItemText {
  name: string;
  /** Selo curto (arquitetura ou classe do equipamento). */
  type: string;
  description: string;
  /** Três pares [rótulo, valor], na ordem dos ícones do componente. */
  specs: [[string, string], [string, string], [string, string]];
  features: [string, string, string];
}

/** Textos dos equipamentos: genéricos, sem marcas nem modelos de terceiros. */
export const ITEMS_TEXT: Record<Lang, Record<ItemId, ItemText>> = {
  pt: {
    'srv-x86': {
      name: 'Servidor x86 corporativo',
      type: 'x86-64',
      description: 'Servidor de alto desempenho no padrão da indústria. Ideal para sistemas legados e virtualização pesada.',
      specs: [['Arquitetura', 'x86 (CISC)'], ['Núcleos', '128 núcleos / 256 threads'], ['Memória', 'Até 4 TB DDR5']],
      features: ['Compatibilidade universal', 'Ecossistema maduro', 'TDP alto (350 W ou mais)'],
    },
    'srv-arm': {
      name: 'Servidor ARM para nuvem',
      type: 'ARM64',
      description: 'Servidor otimizado para nuvem, com alta densidade de núcleos e eficiência energética superior.',
      specs: [['Arquitetura', 'ARM (RISC)'], ['Núcleos', '192 núcleos'], ['Memória', 'Até 2 TB DDR5']],
      features: ['Alta eficiência por watt', 'Ótimo para microsserviços', 'Baixo custo operacional'],
    },
    'srv-riscv': {
      name: 'Nó RISC-V experimental',
      type: 'RISC-V',
      description: 'Plataforma de hardware aberto: alta customização e nenhum royalty de licenciamento.',
      specs: [['Arquitetura', 'RISC-V (aberta)'], ['Núcleos', '64 núcleos sob medida'], ['Memória', '512 GB DDR4']],
      features: ['Hardware de código aberto', 'Sem royalties', 'Altamente customizável'],
    },
    'proc-mcu': {
      name: 'Microcontrolador industrial',
      type: 'MCU',
      description: 'Microcontrolador de consumo ultrabaixo para IoT e controle industrial em tempo real.',
      specs: [['Clock', '480 MHz'], ['SRAM', '2 MB'], ['E/S', 'GPIO, I²C, SPI, CAN']],
      features: ['Tempo real (RTOS)', 'Consumo na faixa de µW', 'Robusto'],
    },
    'proc-gpu': {
      name: 'GPU para treinamento de IA',
      type: 'GPU',
      description: 'Acelerador gráfico massivamente paralelo, voltado ao treinamento de deep learning.',
      specs: [['VRAM', '80 GB HBM3'], ['Núcleos tensoriais', '512'], ['Banda de memória', '3,35 TB/s']],
      features: ['Aceleração FP8/FP16', 'Interconexão multi-GPU', 'Paralelismo massivo'],
    },
    'proc-tpu': {
      name: 'TPU de borda',
      type: 'ASIC',
      description: 'Processador de tensores dedicado à inferência de IA na borda (edge AI).',
      specs: [['Desempenho', '4 TOPS'], ['Potência', '2 W'], ['Interface', 'M.2 / USB']],
      features: ['Inferência local', 'Privacidade dos dados', 'Baixa latência'],
    },
    'dev-sbc': {
      name: 'SBC de alto desempenho',
      type: 'SBC',
      description: 'Computador completo em placa única, com NPU integrada, para robótica e automação.',
      specs: [['CPU', 'ARM de 8 núcleos'], ['NPU', '6 TOPS'], ['Conectividade', 'Wi-Fi 6, Bluetooth 5.0']],
      features: ['Barra de pinos GPIO', 'Interface de câmera (CSI)', 'Formato compacto'],
    },
    'mobo-ws': {
      name: 'Placa-mãe para workstation',
      type: 'E-ATX',
      description: 'Placa-mãe profissional com suporte a várias GPUs e grande capacidade de expansão.',
      specs: [['Soquete', 'CPU de workstation'], ['PCIe', '7 × PCIe 5.0 x16'], ['Rede', '2 × 10 GbE']],
      features: ['VRM de 24 fases', 'Suporte a memória ECC', 'Gerência remota (IPMI)'],
    },
    'dev-phone-thermal': {
      name: 'Smartphone robusto com câmera térmica',
      type: 'Móvel',
      description: 'Smartphone reforçado com câmera térmica integrada para inspeção industrial.',
      specs: [['Sensor térmico', '160 × 120 px'], ['Proteção', 'IP68 / MIL-STD-810H'], ['Bateria', '6.000 mAh']],
      features: ['Visão térmica', 'Resistente a quedas', 'Botões programáveis'],
    },
    'dev-phone-lidar': {
      name: 'Smartphone com scanner LiDAR',
      type: 'Móvel',
      description: 'Dispositivo móvel com sensor LiDAR para mapeamento 3D e realidade aumentada precisa.',
      specs: [['Scanner', 'LiDAR ToF'], ['Alcance', '5 metros'], ['Processamento', 'Motor de RA']],
      features: ['Escaneamento 3D', 'Medição de ambientes', 'RA avançada'],
    },
    'dev-ar-glasses': {
      name: 'Óculos de realidade aumentada',
      type: 'Vestível',
      description: 'Óculos de RA para assistência remota e visualização de dados industriais.',
      specs: [['Tela', 'Micro-OLED'], ['Campo de visão', '52°'], ['Peso', '75 g']],
      features: ['Operação com as mãos livres', 'Comandos de voz', 'Visor head-up'],
    },
    'dev-tracker': {
      name: 'Rastreador industrial de ativos',
      type: 'IoT',
      description: 'Rastreador de ativos com bateria de longuíssima duração e conectividade celular e por satélite.',
      specs: [['Rede', 'NB-IoT / satélite'], ['Bateria', 'Mais de 5 anos'], ['GPS', 'GNSS multibanda']],
      features: ['Cobertura global', 'Vedação IP69K', 'Detecção de movimento'],
    },
  },
  en: {
    'srv-x86': {
      name: 'Enterprise x86 server',
      type: 'x86-64',
      description: 'Industry-standard high-performance server. Ideal for legacy workloads and heavy virtualization.',
      specs: [['Architecture', 'x86 (CISC)'], ['Cores', '128 cores / 256 threads'], ['Memory', 'Up to 4 TB DDR5']],
      features: ['Runs everything', 'Mature ecosystem', 'High TDP (350 W+)'],
    },
    'srv-arm': {
      name: 'Cloud-native ARM server',
      type: 'ARM64',
      description: 'Cloud-optimized server with high core density and outstanding energy efficiency.',
      specs: [['Architecture', 'ARM (RISC)'], ['Cores', '192 cores'], ['Memory', 'Up to 2 TB DDR5']],
      features: ['High performance per watt', 'Great for microservices', 'Low running costs'],
    },
    'srv-riscv': {
      name: 'Experimental RISC-V node',
      type: 'RISC-V',
      description: 'Open hardware platform: deep customization and no licensing royalties.',
      specs: [['Architecture', 'RISC-V (open)'], ['Cores', '64 custom cores'], ['Memory', '512 GB DDR4']],
      features: ['Open-source hardware', 'Royalty-free', 'Highly customizable'],
    },
    'proc-mcu': {
      name: 'Industrial microcontroller',
      type: 'MCU',
      description: 'Ultra-low-power microcontroller for IoT and real-time industrial control.',
      specs: [['Clock', '480 MHz'], ['SRAM', '2 MB'], ['I/O', 'GPIO, I²C, SPI, CAN']],
      features: ['Real time (RTOS)', 'µW-range power draw', 'Rugged'],
    },
    'proc-gpu': {
      name: 'AI training GPU',
      type: 'GPU',
      description: 'Massively parallel graphics accelerator built for deep learning training.',
      specs: [['VRAM', '80 GB HBM3'], ['Tensor cores', '512'], ['Memory bandwidth', '3.35 TB/s']],
      features: ['FP8/FP16 acceleration', 'Multi-GPU interconnect', 'Massive parallelism'],
    },
    'proc-tpu': {
      name: 'Edge TPU',
      type: 'ASIC',
      description: 'Tensor processor dedicated to AI inference at the edge.',
      specs: [['Throughput', '4 TOPS'], ['Power', '2 W'], ['Interface', 'M.2 / USB']],
      features: ['On-device inference', 'Data stays private', 'Low latency'],
    },
    'dev-sbc': {
      name: 'High-end SBC',
      type: 'SBC',
      description: 'A complete single-board computer with a built-in NPU for robotics and automation.',
      specs: [['CPU', '8-core ARM'], ['NPU', '6 TOPS'], ['Connectivity', 'Wi-Fi 6, Bluetooth 5.0']],
      features: ['GPIO header', 'Camera interface (CSI)', 'Compact form factor'],
    },
    'mobo-ws': {
      name: 'Workstation motherboard',
      type: 'E-ATX',
      description: 'Professional-grade motherboard with multi-GPU support and plenty of room to expand.',
      specs: [['Socket', 'Workstation CPU'], ['PCIe', '7 × PCIe 5.0 x16'], ['Network', '2 × 10 GbE']],
      features: ['24-phase VRM', 'ECC memory support', 'Remote management (IPMI)'],
    },
    'dev-phone-thermal': {
      name: 'Rugged thermal-camera phone',
      type: 'Mobile',
      description: 'Rugged smartphone with a built-in thermal camera for industrial inspection.',
      specs: [['Thermal sensor', '160 × 120 px'], ['Protection', 'IP68 / MIL-STD-810H'], ['Battery', '6,000 mAh']],
      features: ['Thermal vision', 'Drop resistant', 'Programmable buttons'],
    },
    'dev-phone-lidar': {
      name: 'LiDAR scanner phone',
      type: 'Mobile',
      description: 'Mobile device with a LiDAR sensor for 3D mapping and accurate augmented reality.',
      specs: [['Scanner', 'ToF LiDAR'], ['Range', '5 meters'], ['Processing', 'AR engine']],
      features: ['3D scanning', 'Room measurement', 'Advanced AR'],
    },
    'dev-ar-glasses': {
      name: 'AR smart glasses',
      type: 'Wearable',
      description: 'Augmented reality glasses for remote assistance and industrial data visualization.',
      specs: [['Display', 'Micro-OLED'], ['Field of view', '52°'], ['Weight', '75 g']],
      features: ['Hands-free operation', 'Voice commands', 'Head-up display'],
    },
    'dev-tracker': {
      name: 'Industrial asset tracker',
      type: 'IoT',
      description: 'Asset tracker with multi-year battery life plus cellular and satellite connectivity.',
      specs: [['Network', 'NB-IoT / satellite'], ['Battery', '5+ years'], ['GPS', 'Multi-band GNSS']],
      features: ['Global coverage', 'IP69K sealing', 'Motion detection'],
    },
  },
  es: {
    'srv-x86': {
      name: 'Servidor x86 empresarial',
      type: 'x86-64',
      description: 'Servidor de alto rendimiento, estándar del sector. Ideal para sistemas heredados y virtualización intensiva.',
      specs: [['Arquitectura', 'x86 (CISC)'], ['Núcleos', '128 núcleos / 256 hilos'], ['Memoria', 'Hasta 4 TB DDR5']],
      features: ['Compatibilidad universal', 'Ecosistema maduro', 'TDP alto (350 W o más)'],
    },
    'srv-arm': {
      name: 'Servidor ARM para la nube',
      type: 'ARM64',
      description: 'Servidor optimizado para la nube, con alta densidad de núcleos y una eficiencia energética superior.',
      specs: [['Arquitectura', 'ARM (RISC)'], ['Núcleos', '192 núcleos'], ['Memoria', 'Hasta 2 TB DDR5']],
      features: ['Alta eficiencia por vatio', 'Ideal para microservicios', 'Bajo coste operativo'],
    },
    'srv-riscv': {
      name: 'Nodo RISC-V experimental',
      type: 'RISC-V',
      description: 'Plataforma de hardware abierto: gran personalización y sin regalías de licencia.',
      specs: [['Arquitectura', 'RISC-V (abierta)'], ['Núcleos', '64 núcleos a medida'], ['Memoria', '512 GB DDR4']],
      features: ['Hardware de código abierto', 'Sin regalías', 'Muy personalizable'],
    },
    'proc-mcu': {
      name: 'Microcontrolador industrial',
      type: 'MCU',
      description: 'Microcontrolador de consumo ultrabajo para IoT y control industrial en tiempo real.',
      specs: [['Reloj', '480 MHz'], ['SRAM', '2 MB'], ['E/S', 'GPIO, I²C, SPI, CAN']],
      features: ['Tiempo real (RTOS)', 'Consumo del orden de µW', 'Robusto'],
    },
    'proc-gpu': {
      name: 'GPU para entrenamiento de IA',
      type: 'GPU',
      description: 'Acelerador gráfico masivamente paralelo, pensado para entrenar modelos de deep learning.',
      specs: [['VRAM', '80 GB HBM3'], ['Núcleos tensoriales', '512'], ['Ancho de banda', '3,35 TB/s']],
      features: ['Aceleración FP8/FP16', 'Interconexión multi-GPU', 'Paralelismo masivo'],
    },
    'proc-tpu': {
      name: 'TPU para el borde',
      type: 'ASIC',
      description: 'Procesador de tensores dedicado a la inferencia de IA en el borde (edge AI).',
      specs: [['Rendimiento', '4 TOPS'], ['Potencia', '2 W'], ['Interfaz', 'M.2 / USB']],
      features: ['Inferencia local', 'Privacidad de los datos', 'Baja latencia'],
    },
    'dev-sbc': {
      name: 'SBC de gama alta',
      type: 'SBC',
      description: 'Ordenador completo en una sola placa, con NPU integrada, para robótica y automatización.',
      specs: [['CPU', 'ARM de 8 núcleos'], ['NPU', '6 TOPS'], ['Conectividad', 'Wi-Fi 6, Bluetooth 5.0']],
      features: ['Conector GPIO', 'Interfaz de cámara (CSI)', 'Formato compacto'],
    },
    'mobo-ws': {
      name: 'Placa base para estación de trabajo',
      type: 'E-ATX',
      description: 'Placa base profesional con soporte para varias GPU y gran capacidad de ampliación.',
      specs: [['Zócalo', 'CPU de estación de trabajo'], ['PCIe', '7 × PCIe 5.0 x16'], ['Red', '2 × 10 GbE']],
      features: ['VRM de 24 fases', 'Compatible con memoria ECC', 'Gestión remota (IPMI)'],
    },
    'dev-phone-thermal': {
      name: 'Smartphone robusto con cámara térmica',
      type: 'Móvil',
      description: 'Smartphone reforzado con cámara térmica integrada para inspección industrial.',
      specs: [['Sensor térmico', '160 × 120 px'], ['Protección', 'IP68 / MIL-STD-810H'], ['Batería', '6.000 mAh']],
      features: ['Visión térmica', 'Resistente a caídas', 'Botones programables'],
    },
    'dev-phone-lidar': {
      name: 'Smartphone con escáner LiDAR',
      type: 'Móvil',
      description: 'Dispositivo móvil con sensor LiDAR para mapeo 3D y realidad aumentada de precisión.',
      specs: [['Escáner', 'LiDAR ToF'], ['Alcance', '5 metros'], ['Procesamiento', 'Motor de RA']],
      features: ['Escaneo 3D', 'Medición de espacios', 'RA avanzada'],
    },
    'dev-ar-glasses': {
      name: 'Gafas de realidad aumentada',
      type: 'Wearable',
      description: 'Gafas de RA para asistencia remota y visualización de datos industriales.',
      specs: [['Pantalla', 'Micro-OLED'], ['Campo de visión', '52°'], ['Peso', '75 g']],
      features: ['Uso con manos libres', 'Comandos de voz', 'Pantalla head-up'],
    },
    'dev-tracker': {
      name: 'Rastreador industrial de activos',
      type: 'IoT',
      description: 'Rastreador de activos con batería de muy larga duración y conectividad celular y satelital.',
      specs: [['Red', 'NB-IoT / satélite'], ['Batería', 'Más de 5 años'], ['GPS', 'GNSS multibanda']],
      features: ['Cobertura global', 'Sellado IP69K', 'Detección de movimiento'],
    },
  },
  fr: {
    'srv-x86': {
      name: 'Serveur x86 d’entreprise',
      type: 'x86-64',
      description: 'Serveur hautes performances, standard du marché. Idéal pour les systèmes existants et la virtualisation intensive.',
      specs: [['Architecture', 'x86 (CISC)'], ['Cœurs', '128 cœurs / 256 threads'], ['Mémoire', 'Jusqu’à 4 To DDR5']],
      features: ['Compatibilité universelle', 'Écosystème mature', 'TDP élevé (350 W et plus)'],
    },
    'srv-arm': {
      name: 'Serveur ARM pour le cloud',
      type: 'ARM64',
      description: 'Serveur optimisé pour le cloud, avec une forte densité de cœurs et une excellente efficacité énergétique.',
      specs: [['Architecture', 'ARM (RISC)'], ['Cœurs', '192 cœurs'], ['Mémoire', 'Jusqu’à 2 To DDR5']],
      features: ['Haut rendement par watt', 'Idéal pour les microservices', 'Faible coût d’exploitation'],
    },
    'srv-riscv': {
      name: 'Nœud RISC-V expérimental',
      type: 'RISC-V',
      description: 'Plateforme matérielle ouverte : personnalisation poussée et aucune redevance de licence.',
      specs: [['Architecture', 'RISC-V (ouverte)'], ['Cœurs', '64 cœurs sur mesure'], ['Mémoire', '512 Go DDR4']],
      features: ['Matériel open source', 'Sans redevances', 'Très personnalisable'],
    },
    'proc-mcu': {
      name: 'Microcontrôleur industriel',
      type: 'MCU',
      description: 'Microcontrôleur à très basse consommation pour l’IoT et le contrôle industriel en temps réel.',
      specs: [['Horloge', '480 MHz'], ['SRAM', '2 Mo'], ['E/S', 'GPIO, I²C, SPI, CAN']],
      features: ['Temps réel (RTOS)', 'Consommation de l’ordre du µW', 'Robuste'],
    },
    'proc-gpu': {
      name: 'GPU pour l’entraînement d’IA',
      type: 'GPU',
      description: 'Accélérateur graphique massivement parallèle, conçu pour l’entraînement en deep learning.',
      specs: [['VRAM', '80 Go HBM3'], ['Cœurs tensoriels', '512'], ['Bande passante', '3,35 To/s']],
      features: ['Accélération FP8/FP16', 'Interconnexion multi-GPU', 'Parallélisme massif'],
    },
    'proc-tpu': {
      name: 'TPU embarqué',
      type: 'ASIC',
      description: 'Processeur de tenseurs dédié à l’inférence d’IA en périphérie (edge AI).',
      specs: [['Débit', '4 TOPS'], ['Puissance', '2 W'], ['Interface', 'M.2 / USB']],
      features: ['Inférence locale', 'Confidentialité des données', 'Faible latence'],
    },
    'dev-sbc': {
      name: 'SBC haut de gamme',
      type: 'SBC',
      description: 'Ordinateur complet sur une seule carte, avec NPU intégré, pour la robotique et l’automatisation.',
      specs: [['CPU', 'ARM 8 cœurs'], ['NPU', '6 TOPS'], ['Connectivité', 'Wi-Fi 6, Bluetooth 5.0']],
      features: ['Connecteur GPIO', 'Interface caméra (CSI)', 'Format compact'],
    },
    'mobo-ws': {
      name: 'Carte mère pour station de travail',
      type: 'E-ATX',
      description: 'Carte mère professionnelle, compatible multi-GPU et largement extensible.',
      specs: [['Socket', 'CPU de station de travail'], ['PCIe', '7 × PCIe 5.0 x16'], ['Réseau', '2 × 10 GbE']],
      features: ['VRM 24 phases', 'Mémoire ECC prise en charge', 'Gestion à distance (IPMI)'],
    },
    'dev-phone-thermal': {
      name: 'Smartphone durci à caméra thermique',
      type: 'Mobile',
      description: 'Smartphone durci doté d’une caméra thermique intégrée pour l’inspection industrielle.',
      specs: [['Capteur thermique', '160 × 120 px'], ['Protection', 'IP68 / MIL-STD-810H'], ['Batterie', '6 000 mAh']],
      features: ['Vision thermique', 'Résistant aux chutes', 'Boutons programmables'],
    },
    'dev-phone-lidar': {
      name: 'Smartphone à scanner LiDAR',
      type: 'Mobile',
      description: 'Appareil mobile équipé d’un capteur LiDAR pour la cartographie 3D et une réalité augmentée précise.',
      specs: [['Scanner', 'LiDAR ToF'], ['Portée', '5 mètres'], ['Traitement', 'Moteur de RA']],
      features: ['Numérisation 3D', 'Mesure des pièces', 'RA avancée'],
    },
    'dev-ar-glasses': {
      name: 'Lunettes de réalité augmentée',
      type: 'Wearable',
      description: 'Lunettes de RA pour l’assistance à distance et la visualisation de données industrielles.',
      specs: [['Écran', 'Micro-OLED'], ['Champ de vision', '52°'], ['Poids', '75 g']],
      features: ['Utilisation mains libres', 'Commandes vocales', 'Affichage tête haute'],
    },
    'dev-tracker': {
      name: 'Traceur industriel d’actifs',
      type: 'IoT',
      description: 'Traceur d’actifs à très longue autonomie, avec connectivité cellulaire et satellite.',
      specs: [['Réseau', 'NB-IoT / satellite'], ['Batterie', 'Plus de 5 ans'], ['GPS', 'GNSS multibande']],
      features: ['Couverture mondiale', 'Étanchéité IP69K', 'Détection de mouvement'],
    },
  },
};
