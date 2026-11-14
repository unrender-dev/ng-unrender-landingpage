import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faFan,
  faHouse,
  faKey,
  faLightbulb,
  faLock,
  faLockOpen,
  faMagnifyingGlass,
  faMinus,
  faMoon,
  faPaperPlane,
  faPlus,
  faRobot,
  faSnowflake,
  faTv,
  faVideo,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { I18nService, Params } from '../../../../i18n/i18n.service';
import { ChatbotService } from '../../../../services/chatbotservice';
import { ABORT, Showcase } from '../hardware-demos/showcase';
import { I18N } from './smart-home.i18n';

type Key = keyof (typeof I18N)['pt'];
type RoomId = 'living' | 'kitchen' | 'bedroom' | 'office';
type DeviceType = 'light' | 'tv' | 'ac' | 'fan' | 'lock' | 'camera';
type DeviceId = 'l1' | 't1' | 'a1' | 'lock1' | 'l2' | 'f1' | 'l3' | 'a2' | 'l4' | 'c1';
type SceneId = 'arrive' | 'hood' | 'keys' | 'night';

interface Device {
  id: DeviceId;
  type: DeviceType;
  room: RoomId;
  name: Key;
  icon: IconDefinition;
}

/** `on`: ligado (na fechadura, trancada). `value`: intensidade da luz (%) ou temperatura (°C). */
interface DeviceState {
  on: boolean;
  value: number;
}

interface Message {
  id: number;
  from: 'user' | 'ai';
  /** Mensagens do roteiro guardam a chave: trocam de idioma junto com a página. */
  key?: Key;
  params?: Params;
  text?: string;
}

const ROOMS: { id: RoomId; name: Key }[] = [
  { id: 'living', name: 'rLiving' },
  { id: 'kitchen', name: 'rKitchen' },
  { id: 'bedroom', name: 'rBedroom' },
  { id: 'office', name: 'rOffice' },
];

const DEVICES: Device[] = [
  { id: 'l1', type: 'light', room: 'living', name: 'dMainLight', icon: faLightbulb },
  { id: 't1', type: 'tv', room: 'living', name: 'dTv', icon: faTv },
  { id: 'a1', type: 'ac', room: 'living', name: 'dAc', icon: faSnowflake },
  { id: 'lock1', type: 'lock', room: 'living', name: 'dLock', icon: faLock },
  { id: 'l2', type: 'light', room: 'kitchen', name: 'dCounterLight', icon: faLightbulb },
  { id: 'f1', type: 'fan', room: 'kitchen', name: 'dHood', icon: faFan },
  { id: 'l3', type: 'light', room: 'bedroom', name: 'dLamp', icon: faLightbulb },
  { id: 'a2', type: 'ac', room: 'bedroom', name: 'dAc', icon: faSnowflake },
  { id: 'l4', type: 'light', room: 'office', name: 'dDeskLight', icon: faLightbulb },
  { id: 'c1', type: 'camera', room: 'office', name: 'dCamera', icon: faVideo },
];

const INITIAL: Record<DeviceId, DeviceState> = {
  l1: { on: false, value: 80 },
  t1: { on: false, value: 0 },
  a1: { on: false, value: 24 },
  lock1: { on: true, value: 0 },
  l2: { on: false, value: 70 },
  f1: { on: false, value: 0 },
  l3: { on: false, value: 40 },
  a2: { on: false, value: 22 },
  l4: { on: false, value: 90 },
  c1: { on: true, value: 0 },
};

/** Velocidade de cruzeiro do exaustor, em graus por segundo. */
const FAN_SPEED = 560;

/** Tira acentos e caixa para comparar comandos digitados nos quatro idiomas. */
const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

@Component({
  selector: 'app-smart-home',
  standalone: true,
  imports: [FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './smart-home.component.html',
  styleUrls: ['./smart-home.component.scss'],
})
export class SmartHomeComponent implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);
  private readonly chatbot = inject(ChatbotService);
  private readonly zone = inject(NgZone);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  @ViewChild('log') private logRef!: ElementRef<HTMLElement>;
  @ViewChild('fan') private fanRef!: ElementRef<HTMLElement>;
  @ViewChild('closeBtn') private closeRef!: ElementRef<HTMLButtonElement>;

  readonly faRobot = faRobot;
  readonly faHouse = faHouse;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faMoon = faMoon;
  readonly faPaperPlane = faPaperPlane;
  readonly faFan = faFan;
  readonly faLock = faLock;
  readonly faLockOpen = faLockOpen;
  readonly faVideo = faVideo;
  readonly faKey = faKey;
  readonly faMinus = faMinus;
  readonly faPlus = faPlus;
  readonly faXmark = faXmark;

  readonly rooms = ROOMS.map((r) => ({ ...r, devices: DEVICES.filter((d) => d.room === r.id) }));

  readonly state = signal<Record<DeviceId, DeviceState>>(structuredClone(INITIAL));
  readonly messages = signal<Message[]>([{ id: 0, from: 'ai', key: 'mHello' }]);
  readonly command = signal('');
  /** O assistente está executando uma cena ou esperando a IA. */
  readonly busy = signal(false);
  readonly scanningRoom = signal<RoomId | null>(null);
  readonly keysFound = signal(false);
  readonly cameraOpen = signal(false);
  private readonly clock = signal(new Date());
  readonly clockLabel = computed(() =>
    this.i18n.date(this.clock(), { dateStyle: 'short', timeStyle: 'medium' }),
  );

  private readonly showcase = new Showcase(
    this.host.nativeElement,
    12000,
    () => !this.busy() && !this.cameraOpen() && !this.command(),
  );
  private msgId = 0;
  private sceneToken = 0;
  private sceneIsAuto = false;
  private keysTimer: ReturnType<typeof setTimeout> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private returnFocus: HTMLElement | null = null;

  // Exaustor: rotação contínua com inércia (acelera e desacelera, nunca para seco)
  private fanAngle = 0;
  private fanOmega = 0;
  private fanRaf = 0;
  private fanLast = 0;

  ngAfterViewInit(): void {
    this.showcase.onActive = () => this.syncFan();
    this.showcase.start(async (step) => {
      await step(1800);
      await this.runScene('arrive', true);
      await step(3200);
      await this.runScene('hood', true);
      await step(2600);
      await this.runScene('keys', true);
      await step(3600);
      await this.runScene('night', true);
      await step(4200);
    });
  }

  ngOnDestroy(): void {
    this.showcase.destroy();
    cancelAnimationFrame(this.fanRaf);
    if (this.keysTimer) clearTimeout(this.keysTimer);
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  // ---------------------------------------------------------------- template

  st(id: DeviceId): DeviceState {
    return this.state()[id];
  }

  /** Brilho da luz para a planta (0 a 1); o CSS faz a transição suave. */
  glow(id: DeviceId): number {
    const s = this.state()[id];
    return s.on ? s.value / 100 : 0;
  }

  statusOf(d: Device): string {
    const s = this.state()[d.id];
    switch (d.type) {
      case 'light':
        return s.on ? this.i18n.number(s.value / 100, { style: 'percent' }) : this.t('lightOff');
      case 'tv':
        return this.t(s.on ? 'tvOn' : 'tvOff');
      case 'fan':
        return this.t(s.on ? 'fanOn' : 'fanOff');
      case 'ac':
        return s.on ? `${s.value} °C · ${this.t('cooling')}` : this.t('acOff');
      case 'lock':
        return this.t(s.on ? 'locked' : 'unlocked');
      default:
        return this.t('live');
    }
  }

  textOf(m: Message): string {
    return m.key ? this.t(m.key, m.params) : (m.text ?? '');
  }

  // ---------------------------------------------------------------- ações do usuário

  /** Qualquer toque devolve o controle ao usuário (e cancela a cena da vitrine em curso). */
  onTouch(): void {
    this.showcase.interrupt();
    if (this.sceneIsAuto) this.cancelScene();
  }

  toggle(id: DeviceId): void {
    this.cancelScene();
    this.patch(id, { on: !this.state()[id].on });
  }

  setValue(id: DeviceId, event: Event): void {
    this.patch(id, { value: +(event.target as HTMLInputElement).value });
  }

  nudge(id: DeviceId, delta: number): void {
    const value = Math.min(30, Math.max(16, this.state()[id].value + delta));
    this.patch(id, { value });
  }

  scene(id: SceneId): void {
    this.showcase.interrupt();
    void this.showcase.guard(() => this.runScene(id, false));
  }

  onCommand(event: Event): void {
    this.showcase.interrupt();
    this.command.set((event.target as HTMLInputElement).value);
  }

  send(event?: Event): void {
    event?.preventDefault();
    const text = this.command().trim();
    if (!text) return;
    this.showcase.interrupt();
    this.cancelScene();
    this.command.set('');
    this.say('user', { text });
    if (!this.interpret(text)) this.askAi(text);
  }

  openCamera(event?: Event): void {
    this.returnFocus = (event?.currentTarget as HTMLElement) ?? null;
    this.cameraOpen.set(true);
    this.clock.set(new Date());
    this.clockTimer ??= setInterval(() => this.clock.set(new Date()), 1000);
    setTimeout(() => this.closeRef?.nativeElement.focus(), 60);
  }

  closeCamera(): void {
    if (!this.cameraOpen()) return;
    this.cameraOpen.set(false);
    if (this.clockTimer) clearInterval(this.clockTimer);
    this.clockTimer = null;
    this.returnFocus?.focus();
    this.returnFocus = null;
  }

  // ---------------------------------------------------------------- estado

  private patch(id: DeviceId, p: Partial<DeviceState>): void {
    this.state.update((s) => ({ ...s, [id]: { ...s[id], ...p } }));
    if (id === 'f1') this.syncFan();
  }

  private say(from: Message['from'], m: { key?: Key; params?: Params; text?: string }): void {
    this.messages.update((list) => [...list.slice(-39), { id: ++this.msgId, from, ...m }]);
    setTimeout(() => {
      const el = this.logRef?.nativeElement;
      el?.scrollTo({ top: el.scrollHeight, behavior: this.showcase.reduced ? 'auto' : 'smooth' });
    }, 30);
  }

  private showKeys(): void {
    this.keysFound.set(true);
    if (this.keysTimer) clearTimeout(this.keysTimer);
    this.keysTimer = setTimeout(() => this.keysFound.set(false), 6000);
  }

  // ---------------------------------------------------------------- cenas

  private cancelScene(): void {
    this.sceneToken++;
    this.sceneIsAuto = false;
    this.scanningRoom.set(null);
    this.busy.set(false);
  }

  /** Roda uma cena passo a passo; uma nova cena (ou um toque) cancela a anterior. */
  private async runScene(id: SceneId, auto: boolean): Promise<void> {
    const token = ++this.sceneToken;
    this.sceneIsAuto = auto;
    this.busy.set(true);
    const wait = async (ms: number) => {
      await this.showcase.wait(ms);
      if (token !== this.sceneToken) throw ABORT;
    };
    try {
      switch (id) {
        case 'arrive':
          this.say('user', { key: 'uArrive' });
          await wait(800);
          this.say('ai', { key: 'aArrive1' });
          await wait(700);
          this.patch('lock1', { on: false });
          await wait(600);
          this.patch('l1', { on: true, value: 80 });
          await wait(450);
          this.patch('l2', { on: true, value: 70 });
          await wait(450);
          this.patch('a2', { on: false });
          this.patch('a1', { on: true, value: 23 });
          await wait(600);
          this.patch('t1', { on: true });
          await wait(500);
          this.say('ai', { key: 'aArrive2' });
          break;

        case 'hood':
          this.say('user', { key: 'uHood' });
          await wait(800);
          this.patch('f1', { on: true });
          await wait(500);
          this.say('ai', { key: 'aHood' });
          break;

        case 'keys':
          this.say('user', { key: 'uKeys' });
          await wait(900);
          this.say('ai', { key: 'aKeys1' });
          await this.scanRooms(wait);
          this.say('ai', { key: 'aKeys2' });
          this.showKeys();
          break;

        case 'night':
          this.say('user', { key: 'uNight' });
          await wait(800);
          this.say('ai', { key: 'aNight1' });
          for (const light of ['l4', 'l2', 'l1', 'l3'] as const) {
            await wait(420);
            this.patch(light, { on: false });
          }
          await wait(420);
          this.patch('t1', { on: false });
          this.patch('f1', { on: false });
          this.say('ai', { key: 'aNight2' });
          await wait(900);
          this.patch('lock1', { on: true });
          this.say('ai', { key: 'aNight3' });
          await wait(900);
          this.patch('a1', { on: false });
          this.patch('a2', { on: true, value: 22 });
          this.say('ai', { key: 'aNight4' });
          break;
      }
      await wait(300);
    } finally {
      if (token === this.sceneToken) {
        this.busy.set(false);
        this.sceneIsAuto = false;
      }
    }
  }

  /** Varre os cômodos pelas câmeras, um por vez, até a sala. */
  private async scanRooms(wait: (ms: number) => Promise<void>): Promise<void> {
    for (const room of ['office', 'kitchen', 'living'] as const) {
      this.scanningRoom.set(room);
      await wait(1300);
    }
    this.scanningRoom.set(null);
    await wait(350);
  }

  // ---------------------------------------------------------------- comandos digitados

  /** Entende localmente os pedidos mais comuns (pt/en/es/fr); devolve `false` se não reconhecer. */
  private interpret(raw: string): boolean {
    const text = ` ${plain(raw).replace(/[.,;:!?¿¡]/g, ' ')} `;
    const has = (...words: string[]) => words.some((w) => text.includes(w));

    if (has('boa noite', 'good night', 'goodnight', 'buenas noches', 'bonne nuit')) return this.sceneFromText('night');
    if (has('chave', ' key', 'llave', ' cle ', ' cles ', 'clef')) return this.sceneFromText('keys');
    if (has('cheguei', 'estou em casa', 'i am home', "i'm home", 'im home', 'llegue', 'estoy en casa', 'rentre')) {
      return this.sceneFromText('arrive');
    }

    // "desligar" contém "ligar": o teste de desligar vem primeiro.
    const unlock = has('destranc', 'unlock', 'deverrouill', 'abre a porta', 'abrir a porta', 'abre la puerta', 'ouvre');
    const lock = !unlock && has('tranc', 'lock', 'verrouill', 'cierra', 'fecha a porta', 'fechar a porta');
    const off = has('deslig', 'apag', 'turn off', 'switch off', 'eteins', 'eteindre', 'etein');
    const on = !off && has(' liga', ' ligue', 'acend', 'acender', 'turn on', 'switch on', 'enciend', 'encend', 'prende', 'allum');

    const types: DeviceType[] = [];
    if (has('luz', 'light', 'lumier', 'lamp', 'luces', 'abajur')) types.push('light');
    if (has('tv', 'tele')) types.push('tv');
    if (has('exaustor', 'ventilador', 'fan', 'hood', 'extractor', 'hotte')) types.push('fan');
    if (has('ar-condicionado', 'ar condicionado', ' ar ', 'air', 'aire', 'clim', ' ac')) types.push('ac');
    const everything = has('tudo', 'todas', 'todos', 'everything', ' all', 'todo', 'tout');

    const rooms: RoomId[] = [];
    if (has('sala', 'living', 'salon')) rooms.push('living');
    if (has('cozinha', 'kitchen', 'cocina', 'cuisine')) rooms.push('kitchen');
    if (has('quarto', 'bedroom', 'dormitorio', 'habitacion', 'chambre')) rooms.push('bedroom');
    if (has('escritorio', 'office', 'oficina', 'despacho', 'bureau')) rooms.push('office');

    if (lock || unlock) {
      this.patch('lock1', { on: lock });
      this.say('ai', { key: 'aDone1' });
      return true;
    }
    if (!on && !off) return false;
    if (!types.length && !everything) return false;

    const targets = DEVICES.filter(
      (d) =>
        d.type !== 'camera' &&
        d.type !== 'lock' &&
        (everything && !types.length ? true : types.includes(d.type)) &&
        (!rooms.length || rooms.includes(d.room)),
    );
    if (!targets.length) return false;
    for (const d of targets) this.patch(d.id, { on });
    this.say('ai', targets.length === 1 ? { key: 'aDone1' } : { key: 'aDoneN', params: { n: targets.length } });
    return true;
  }

  private sceneFromText(id: SceneId): boolean {
    // A frase do usuário já está no histórico: a cena só não repete a fala dele.
    this.messages.update((list) => list.slice(0, -1));
    void this.showcase.guard(() => this.runScene(id, false));
    return true;
  }

  /** Pedido livre: consulta o modelo de linguagem e executa as ações que ele devolver. */
  private askAi(userText: string): void {
    const token = ++this.sceneToken;
    this.busy.set(true);
    const language = { pt: 'Brazilian Portuguese', en: 'English', es: 'Spanish', fr: 'French' }[this.i18n.lang()];
    const deviceList = DEVICES.map((d) => {
      const s = this.state()[d.id];
      return `- ${this.t(d.name)} (id: ${d.id}, room: ${d.room}, type: ${d.type}, on: ${s.on}, value: ${s.value})`;
    }).join('\n');
    const system = `You are a smart home assistant controlling these devices:
${deviceList}

User input: "${userText}"

Return ONLY a JSON array of actions, with no markdown and no extra text. Supported actions:
{"action":"toggle","id":"DEVICE_ID","state":true|false}  (for the lock, true means locked)
{"action":"setValue","id":"DEVICE_ID","value":NUMBER}   (light brightness 10-100 or temperature 16-30)
{"action":"find","item":"ITEM_NAME"}
{"action":"scenario","name":"arrive"|"find-keys"|"good-night"}
{"action":"response","text":"short answer in ${language}"}`;
    const history = this.messages()
      .slice(0, -1)
      .map((m) => ({ role: m.from === 'ai' ? ('assistant' as const) : ('user' as const), content: this.textOf(m) }));

    const fail = () => {
      if (token !== this.sceneToken) return;
      this.say('ai', { key: 'aError' });
      this.busy.set(false);
    };
    try {
      this.chatbot.getGeminiResponse(system, history, 'gemini-2.5-flash-lite').subscribe({
        next: (response) => {
          if (token !== this.sceneToken) return;
          void this.showcase.guard(() => this.applyAi(response, token)).catch(fail);
        },
        error: fail,
      });
    } catch {
      fail();
    }
  }

  private async applyAi(response: string, token: number): Promise<void> {
    const clean = response.replace(/```json/g, '').replace(/```/g, '').trim();
    let actions: any[] = [];
    try {
      const parsed = JSON.parse(clean);
      actions = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      actions = (clean.match(/\{[^{}]*\}/g) ?? [])
        .map((m) => {
          try {
            return JSON.parse(m);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    }

    const wait = async (ms: number) => {
      await this.showcase.wait(ms);
      if (token !== this.sceneToken) throw ABORT;
    };
    let changed = 0;
    let reply = '';
    let scene: SceneId | null = null;
    try {
      for (const a of actions) {
        const device = DEVICES.find((d) => d.id === a?.id);
        if (a?.action === 'response' && typeof a.text === 'string') {
          reply = a.text;
        } else if (a?.action === 'toggle' && device && device.type !== 'camera') {
          this.patch(device.id, { on: !!a.state });
          changed++;
        } else if (a?.action === 'setValue' && device && (device.type === 'light' || device.type === 'ac')) {
          const [min, max] = device.type === 'light' ? [10, 100] : [16, 30];
          this.patch(device.id, { on: true, value: Math.min(max, Math.max(min, Math.round(+a.value) || min)) });
          changed++;
        } else if (a?.action === 'find' && typeof a.item === 'string') {
          const item = a.item.slice(0, 40);
          if (['chave', 'key', 'llave', 'cle'].some((w) => plain(item).includes(w))) scene = 'keys';
          else {
            this.say('ai', { key: 'aSearching', params: { item } });
            await this.scanRooms(wait);
            this.say('ai', { key: 'aNotFound', params: { item } });
            changed = -1;
          }
        } else if (a?.action === 'scenario') {
          scene = a.name === 'good-night' ? 'night' : a.name === 'find-keys' ? 'keys' : a.name === 'arrive' ? 'arrive' : null;
        }
      }
    } finally {
      if (token === this.sceneToken) this.busy.set(false);
    }
    if (scene) return this.runScene(scene, false);
    if (reply) this.say('ai', { text: reply.slice(0, 240) });
    else if (changed === 1) this.say('ai', { key: 'aDone1' });
    else if (changed > 1) this.say('ai', { key: 'aDoneN', params: { n: changed } });
    else if (changed === 0) this.say('ai', { key: 'aError' });
  }

  // ---------------------------------------------------------------- exaustor

  private syncFan(): void {
    if (this.showcase.reduced || this.fanRaf) return;
    const moving = this.state().f1.on || this.fanOmega > 0;
    if (!moving || !this.showcase.active) return;
    this.zone.runOutsideAngular(() => {
      this.fanLast = performance.now();
      this.fanRaf = requestAnimationFrame(this.fanFrame);
    });
  }

  private readonly fanFrame = (now: number) => {
    const dt = Math.min(0.05, (now - this.fanLast) / 1000);
    this.fanLast = now;
    const target = this.state().f1.on ? FAN_SPEED : 0;
    // Aproxima a velocidade do alvo aos poucos: liga acelerando, desliga girando até parar.
    this.fanOmega += (target - this.fanOmega) * (1 - Math.exp(-dt * 1.3));
    this.fanAngle = (this.fanAngle + this.fanOmega * dt) % 360;
    this.fanRef.nativeElement.style.transform = `rotate(${this.fanAngle.toFixed(1)}deg)`;
    if ((target === 0 && this.fanOmega < 2) || !this.showcase.active) {
      if (target === 0) this.fanOmega = 0;
      this.fanRaf = 0;
      return;
    }
    this.fanRaf = requestAnimationFrame(this.fanFrame);
  };
}
