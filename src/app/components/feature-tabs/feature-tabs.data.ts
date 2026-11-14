import { Type } from '@angular/core';

/**
 * Estrutura das abas de serviços. Todo texto fica em `feature-tabs.i18n.ts`:
 * aqui só entram chaves, ícones, imagens e os componentes de demonstração.
 *
 * Regra de material: nada de imagem gerada por IA ou de produto de terceiros se
 * passando por nosso. Quando o assunto é um sistema, entra captura real do SGA
 * CTRLB (`screen`); quando há foto nossa de verdade, entra `photo`; sem material
 * real, o tópico vira uma linha com ícone e descrição (`topic`).
 */
export type TabId = 'development' | 'infrastructure' | 'design';

export type FeatureKind = 'component' | 'product' | 'screen' | 'photo' | 'topic';

export interface Feature {
  /** Chave do nome em `feature-tabs.i18n.ts` (`f.<key>`); descrição em `f.<key>.d`. */
  key: string;
  kind: FeatureKind;
  /** component: demonstração interativa carregada sob demanda. */
  loadComponent?: () => Promise<Type<unknown>>;
  inputs?: Record<string, unknown>;
  /** product / photo / screen: imagem exibida. */
  image?: string;
  /** screen: texto da barra de endereço da moldura. */
  address?: string;
  /** topic: classe Font Awesome. */
  icon?: string;
  /** product: id do produto na loja (abre ficha/pedido no modal). */
  posProductId?: string;
  /** product: preço de venda em reais, usado enquanto o catálogo da loja não tem o produto. */
  price?: number;
  /** product: valor em reais da locação mensal ou da parcela. */
  rent?: number;
  /** product: número de parcelas quando `rent` é parcela, não locação. */
  installments?: number;
}

export interface MenuItem {
  id: string;
  features: Feature[];
}

const PRODUTOS = '/images/produtos';
const SCREENS = '/images/real-screens';

// ── Demonstrações interativas (lazy) ──────────────────────────────────────────
const galaga = () => import('../galaga-game/galaga-game.component').then((m) => m.GalagaArcadeComponent);
const responsive = () => import('../responsiveDemo/responsive-demo.component').then((m) => m.ResponsiveDemoComponent);
const webgl = () => import('../3d-animation/3d-animation.component').then((m) => m.ThreeDAnimationDemoComponent);
const ecommerce = () => import('./examples/ecommerce-demo/ecommerce-demo.component').then((m) => m.EcommerceDemoComponent);
const ctrlb = () => import('./examples/ctrlb-showcase/ctrlb-showcase.component').then((m) => m.CtrlbShowcaseComponent);
const vision = () => import('../computer-vision/computer-vision.component').then((m) => m.ComputerVisionComponent);
const chat = () => import('../chat-widget/chat-widget.component').then((m) => m.ChatWidgetComponent);
const whatsapp = () => import('./examples/whatsapp-ai-demo/whatsapp-ai-demo.component').then((m) => m.WhatsappAiDemoComponent);
const automation = () => import('./examples/automation-flow/automation-flow.component').then((m) => m.AutomationFlowComponent);
const mocap = () => import('../mocap/mocap.component').then((m) => m.MocapComponent);
const desktopPwa = () => import('./examples/desktop-pwa-demo/desktop-pwa-demo.component').then((m) => m.DesktopPwaDemoComponent);
const webSystem = () => import('./examples/web-system/web-system.component').then((m) => m.WebSystemComponent);
const api = () => import('./examples/api-integration/api-integration.component').then((m) => m.ApiIntegrationComponent);
const wasm = () => import('./examples/wasm-demo/wasm-demo.component').then((m) => m.WasmDemoComponent);
const nativeApp = () => import('./examples/native-app-demo/native-app-demo.component').then((m) => m.NativeAppDemoComponent);
const pwa = () => import('./examples/pwa-demo/pwa-demo.component').then((m) => m.PwaDemoComponent);
const desktopSoftware = () =>
  import('./examples/desktop-software-demo/desktop-software-demo.component').then((m) => m.DesktopSoftwareDemoComponent);
const fingerprint = () =>
  import('./examples/hardware-demos/fingerprint-scanner/fingerprint-scanner.component').then((m) => m.FingerprintScannerComponent);
const barcode = () =>
  import('./examples/hardware-demos/barcode-scanner/barcode-scanner.component').then((m) => m.BarcodeScannerComponent);
const pos = () =>
  import('./examples/commercial-automation/commercial-automation.component').then((m) => m.CommercialAutomationComponent);
const kiosk = () => import('./examples/self-service-kiosk/self-service-kiosk.component').then((m) => m.SelfServiceKioskComponent);
const gamesPages = () =>
  import('./examples/unrender-games-showcase/unrender-games-showcase.component').then((m) => m.UnrenderGamesShowcaseComponent);
const catalog = () =>
  import('./examples/hardware-consulting/hardware-consulting.component').then((m) => m.HardwareConsultingComponent);
const smartHome = () => import('./examples/smart-home/smart-home.component').then((m) => m.SmartHomeComponent);
const edgeAi = () => import('./examples/custom-systems/custom-systems.component').then((m) => m.CustomSystemsComponent);
const rack = () =>
  import('./examples/physical-server-rack/physical-server-rack.component').then((m) => m.PhysicalServerRackComponent);
const netMgmt = () => import('./examples/network-management/network-management.component').then((m) => m.NetworkManagementComponent);
const topology = () =>
  import('./examples/physical-network-topology/physical-network-topology.component').then((m) => m.PhysicalNetworkTopologyComponent);
const productivity = () =>
  import('./examples/employee-monitoring/employee-monitoring.component').then((m) => m.EmployeeMonitoringComponent);
const lab = () => import('./examples/hardware-showcase/hardware-showcase.component').then((m) => m.HardwareShowcaseComponent);
const drone = () => import('./examples/drone-simulation/drone-simulation.component').then((m) => m.DroneSimulationComponent);

// ── Produtos da loja reutilizados em mais de um item ──────────────────────────
const P_THERMAL_80: Feature = {
  key: 'pThermal80', kind: 'product', image: `${PRODUTOS}/pos-impressora-termica-80mm.svg`,
  posProductId: 'impressora-termica-80mm', price: 696, rent: 89,
};
const P_BLUETOOTH: Feature = {
  key: 'pBluetooth', kind: 'product', image: `${PRODUTOS}/pos-impressora-bluetooth-58mm.svg`,
  posProductId: 'impressora-bluetooth-58mm', price: 288, rent: 49,
};
const P_CASH_DRAWER: Feature = {
  key: 'pCashDrawer', kind: 'product', image: `${PRODUTOS}/pos-caixa-registradora-usb.svg`,
  posProductId: 'caixa-registradora-usb', price: 384, rent: 59,
};
const P_PC_KIT: Feature = {
  key: 'pPcKit', kind: 'product', image: `${PRODUTOS}/pos-kit-pc-caixa.svg`,
  posProductId: 'kit-pc-caixa-completo', price: 2268, rent: 249,
};
const P_HEADSETS: Feature = {
  key: 'pHeadsets', kind: 'product', image: `${PRODUTOS}/pos-kit-headsets-boost.svg`,
  posProductId: 'kit-headsets-boost-usb', price: 672, rent: 85,
};
const P_TURNKEY: Feature = {
  key: 'pTurnkey', kind: 'product', image: `${PRODUTOS}/pos-kit-turnkey-completo.svg`,
  posProductId: 'estacao-pdv-turnkey-completa', price: 3228, rent: 329,
};

export const DEVELOPMENT_ITEMS: MenuItem[] = [
  {
    id: 'web-mobile',
    features: [
      { key: 'gamification', kind: 'component', loadComponent: galaga },
      { key: 'stack', kind: 'topic', icon: 'fa-solid fa-bolt' },
      { key: 'responsive', kind: 'component', loadComponent: responsive },
      { key: 'webgl', kind: 'component', loadComponent: webgl },
      { key: 'ecommerce', kind: 'component', loadComponent: ecommerce },
      { key: 'ctrlbErp', kind: 'component', loadComponent: ctrlb, inputs: { focus: 'erp' } },
    ],
  },
  {
    id: 'ai-solutions',
    features: [
      { key: 'vision', kind: 'component', loadComponent: vision },
      { key: 'chatbot', kind: 'component', loadComponent: chat },
      { key: 'whatsapp', kind: 'component', loadComponent: whatsapp },
      { key: 'ctrlbAi', kind: 'component', loadComponent: ctrlb, inputs: { focus: 'ai' } },
      { key: 'automation', kind: 'component', loadComponent: automation },
      { key: 'nlp', kind: 'screen', image: `${SCREENS}/ia-documento-previa.png`, address: 'SGA CTRLB · documentos' },
      { key: 'mocap', kind: 'component', loadComponent: mocap },
      { key: 'autonomous', kind: 'topic', icon: 'fa-solid fa-car-side' },
    ],
  },
  {
    id: 'web-apps',
    features: [
      { key: 'ctrlbWeb', kind: 'component', loadComponent: ctrlb, inputs: { focus: 'web' } },
      { key: 'pwaDesktopWeb', kind: 'component', loadComponent: desktopPwa, inputs: { context: 'web' } },
      { key: 'dashboards', kind: 'component', loadComponent: webSystem },
      { key: 'api', kind: 'component', loadComponent: api },
      { key: 'responsive', kind: 'component', loadComponent: responsive },
      { key: 'wasm', kind: 'component', loadComponent: wasm },
    ],
  },
  {
    id: 'mobile-apps',
    features: [
      { key: 'android', kind: 'component', loadComponent: nativeApp, inputs: { platform: 'android' } },
      { key: 'ios', kind: 'component', loadComponent: nativeApp, inputs: { platform: 'ios' } },
      { key: 'pwaMobile', kind: 'component', loadComponent: pwa },
    ],
  },
  {
    id: 'desktop-apps',
    features: [
      { key: 'windows', kind: 'component', loadComponent: desktopSoftware, inputs: { os: 'windows' } },
      { key: 'macos', kind: 'component', loadComponent: desktopSoftware, inputs: { os: 'macos' } },
      { key: 'linux', kind: 'component', loadComponent: desktopSoftware, inputs: { os: 'linux' } },
      { key: 'pwaDesktop', kind: 'component', loadComponent: desktopPwa, inputs: { context: 'desktop' } },
      { key: 'fingerprint', kind: 'component', loadComponent: fingerprint },
      { key: 'barcode', kind: 'component', loadComponent: barcode },
      { key: 'thermal', kind: 'component', loadComponent: pos },
      P_THERMAL_80,
      P_BLUETOOTH,
      P_CASH_DRAWER,
      P_PC_KIT,
      P_HEADSETS,
    ],
  },
  {
    id: 'custom-systems',
    features: [
      { key: 'kiosk', kind: 'component', loadComponent: kiosk },
      { key: 'meetings', kind: 'component', loadComponent: responsive },
      { key: 'gamesPages', kind: 'component', loadComponent: gamesPages },
      {
        key: 'pEventTotem', kind: 'product', image: '/features/totem2.jpg',
        posProductId: 'totem-interativo-55', price: 3199, rent: 299, installments: 12,
      },
      {
        key: 'pPhotoTotem', kind: 'product', image: '/features/unrender-games/totem-virtual-tryon.jpg',
        posProductId: 'totem-foto-polaroid', price: 3199, rent: 299, installments: 12,
      },
      { key: 'ctrlbCustom', kind: 'component', loadComponent: ctrlb, inputs: { focus: 'custom' } },
    ],
  },
];

export const INFRASTRUCTURE_ITEMS: MenuItem[] = [
  {
    id: 'commercial-automation',
    features: [
      { key: 'pos', kind: 'component', loadComponent: pos },
      P_THERMAL_80,
      P_BLUETOOTH,
      P_CASH_DRAWER,
      P_PC_KIT,
      P_HEADSETS,
      P_TURNKEY,
      { key: 'barcode2d', kind: 'component', loadComponent: barcode },
      { key: 'touchMonitors', kind: 'topic', icon: 'fa-solid fa-hand-pointer' },
      { key: 'kioskSelf', kind: 'component', loadComponent: kiosk },
    ],
  },
  {
    id: 'hardware-consulting',
    features: [
      { key: 'catalog', kind: 'component', loadComponent: catalog },
      P_PC_KIT,
      P_HEADSETS,
      P_THERMAL_80,
      P_CASH_DRAWER,
      { key: 'haas', kind: 'topic', icon: 'fa-solid fa-handshake' },
    ],
  },
  {
    id: 'smart-home',
    features: [
      { key: 'homeControl', kind: 'component', loadComponent: smartHome },
      { key: 'lighting', kind: 'topic', icon: 'fa-solid fa-lightbulb' },
      { key: 'climate', kind: 'topic', icon: 'fa-solid fa-temperature-half' },
      { key: 'security', kind: 'topic', icon: 'fa-solid fa-video' },
    ],
  },
  {
    id: 'ai-servers',
    features: [
      { key: 'edgeAi', kind: 'component', loadComponent: edgeAi, inputs: { type: 'edge-ai' } },
      { key: 'rack', kind: 'component', loadComponent: rack },
      { key: 'inference', kind: 'topic', icon: 'fa-solid fa-server' },
      { key: 'embedded', kind: 'topic', icon: 'fa-solid fa-microchip' },
      { key: 'onDevice', kind: 'topic', icon: 'fa-solid fa-mobile-screen-button' },
      { key: 'gpus', kind: 'photo', image: '/features/gpurack-1.png' },
    ],
  },
  {
    id: 'network-infrastructure',
    features: [
      { key: 'netMgmt', kind: 'component', loadComponent: netMgmt },
      { key: 'topology', kind: 'component', loadComponent: topology },
      { key: 'productivity', kind: 'component', loadComponent: productivity },
      { key: 'routers', kind: 'topic', icon: 'fa-solid fa-route' },
      { key: 'cabling', kind: 'photo', image: '/features/network2.jpg' },
      { key: 'wifi', kind: 'topic', icon: 'fa-solid fa-wifi' },
      { key: 'performance', kind: 'topic', icon: 'fa-solid fa-gauge-high' },
    ],
  },
  {
    id: 'custom-hardware',
    features: [
      { key: 'kioskCustom', kind: 'component', loadComponent: kiosk },
      { key: 'lab', kind: 'component', loadComponent: lab },
      { key: 'drone', kind: 'component', loadComponent: drone },
      { key: 'touchTotem', kind: 'photo', image: '/features/totem2.jpg' },
      { key: 'edgeDevices', kind: 'topic', icon: 'fa-solid fa-microchip' },
      { key: 'iot', kind: 'topic', icon: 'fa-solid fa-satellite-dish' },
      { key: 'onDevice', kind: 'topic', icon: 'fa-solid fa-mobile-screen-button' },
      { key: 'photoTotem', kind: 'photo', image: '/features/unrender-games/totem-virtual-tryon.jpg' },
    ],
  },
];

export const DESIGN_ITEMS: MenuItem[] = [
  {
    id: 'unrender-games',
    features: [
      { key: 'gamesPages', kind: 'component', loadComponent: gamesPages },
      { key: 'gameDev', kind: 'topic', icon: 'fa-solid fa-gamepad' },
      { key: 'showroom', kind: 'photo', image: '/showroom.jpg' },
      { key: 'modeling', kind: 'topic', icon: 'fa-solid fa-cube' },
      { key: 'vr', kind: 'photo', image: '/game.jpg' },
      { key: 'ar', kind: 'topic', icon: 'fa-solid fa-camera-rotate' },
    ],
  },
];

export const TAB_ITEMS: Record<TabId, MenuItem[]> = {
  development: DEVELOPMENT_ITEMS,
  infrastructure: INFRASTRUCTURE_ITEMS,
  design: DESIGN_ITEMS,
};

/** Especialidades e plataformas do estúdio (aba 3D e Games). */
export const GAME_SPECIALTIES = ['modeling3d', 'gamification', 'educational', 'audiovisual', 'vr', 'interactiveWeb', 'ar'] as const;

export const GAME_PLATFORMS: { icon: string; label: string }[] = [
  { icon: 'fa-brands fa-android', label: 'Android' },
  { icon: 'fa-brands fa-apple', label: 'iOS' },
  { icon: 'fa-brands fa-windows', label: 'Windows' },
  { icon: 'fa-brands fa-linux', label: 'Linux' },
  { icon: 'fa-solid fa-globe', label: 'Web' },
  { icon: 'fa-brands fa-apple', label: 'Mac' },
  { icon: 'fa-solid fa-vr-cardboard', label: 'Meta Quest' },
];
