import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import * as L from 'leaflet';
import 'leaflet-routing-machine';

import { I18nService } from '../../i18n/i18n.service';
import { ErroContato, enviarContato, enviarEvento, slug, whatsappUrl } from '../../services/sga-ctrlb';
import { ContactKey, I18N } from './contact.i18n';

type Campo = 'name' | 'contact' | 'message';

interface Servico {
  /** Chave do rótulo traduzido ("Quero um jogo"…). */
  key: ContactKey;
  /** Nome do serviço como vai para o CRM: fica em português em qualquer idioma. */
  rotulo: string;
}

const ENDERECO = 'R. da Cereja, 11';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact implements AfterViewInit, OnDestroy {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.scope(I18N);

  @ViewChild('mapEl', { static: true }) private mapEl!: ElementRef<HTMLDivElement>;

  contactName = '';
  contactInfo = '';
  contactMessage = '';

  readonly enviando = signal(false);
  readonly statusEnvio = signal<'ok' | 'erro' | null>(null);
  /** Chave da mensagem geral de erro (traduzida no template). */
  readonly erroChave = signal<ContactKey>('errForm');
  /** Texto devolvido pela API (em português); só é exibido com o site em português. */
  readonly erroDetalhe = signal('');
  /** Erro por campo, exibido depois da tentativa de envio. */
  readonly erros = signal<Partial<Record<Campo, ContactKey>>>({});

  readonly email = 'contato@unrender.dev';
  readonly endereco = ENDERECO;
  readonly mapsUrl =
    'https://www.google.com/maps/place/NEW+WORKING+CUIAB%C3%81+-+SALAS+COMERCIAIS/data=!4m2!3m1!1s0x0:0xc53488fb087e891e?sa=X&ved=1t:2428&ictx=111';

  readonly servicos: readonly Servico[] = [
    { key: 'svcGame', rotulo: 'Jogo' },
    { key: 'svcApp', rotulo: 'App' },
    { key: 'svcLanding', rotulo: 'Landing Page' },
    { key: 'svcErp', rotulo: 'ERP' },
    { key: 'svcKiosk', rotulo: 'Totem de Vendas' },
    { key: 'svcSales', rotulo: 'Aumentar as Vendas' },
    { key: 'svcPurchasing', rotulo: 'Automatizar as Compras' },
    { key: 'svcMenu', rotulo: 'Cardápio Web' },
  ];

  // WhatsApp e QR = Link Rastreável do SGA Ctrl+B (endereço vindo do cofre).
  private readonly whatsappBase = signal('https://wa.me/5565999207154');

  /** Link do WhatsApp com a mensagem inicial no idioma atual. */
  readonly whatsappLink = computed(() => {
    const base = this.whatsappBase();
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}text=${encodeURIComponent(this.t('waMessage'))}`;
  });

  // O QR leva só o link base: com a mensagem embutida o código fica denso demais para ler a 100 px.
  readonly qrUrl = computed(
    () => 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=' + encodeURIComponent(this.whatsappBase()),
  );

  private map: L.Map | undefined;
  private routingControl: L.Routing.Control | undefined;
  private destinationMarker: L.Marker | undefined;
  private userMarker: L.Marker | undefined;
  private fallbackLine: L.Polyline | undefined;
  private readonly destinationCoords: L.LatLngTuple = [-15.587887, -56.080988];
  private locationRetryCount = 0;
  private readonly maxRetries = 2;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private focusTimer: ReturnType<typeof setTimeout> | undefined;
  private mapObserver: IntersectionObserver | undefined;
  private destroyed = false;

  private readonly destinationIcon = L.icon({
    iconUrl: 'gps.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
  });

  constructor() {
    if (typeof window !== 'undefined') {
      whatsappUrl().then((u) => this.whatsappBase.set(u));
      enviarEvento([{ tipo: 'visita' }]);
    }
    // Os balões do mapa são desenhados pelo Leaflet, fora do template: retraduz na troca de idioma.
    effect(() => {
      this.i18n.lang();
      this.atualizarBaloes();
    });
  }

  /** "Quero um jogo", "Quero um app"…: interesse no serviço + mensagem pronta no formulário. */
  quero(servico: Servico, ev: Event): void {
    ev.preventDefault();
    enviarEvento([{ tipo: 'produto', alvo: 'servico:' + slug(servico.rotulo), rotulo: servico.rotulo }]);
    this.contactMessage = this.t(servico.key);
    this.limparErro('message');
    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('contato-form')?.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'center' });
    clearTimeout(this.focusTimer);
    this.focusTimer = setTimeout(
      () => (document.getElementById('name') as HTMLInputElement | null)?.focus({ preventScroll: true }),
      reduzido ? 0 : 400,
    );
  }

  detectAndFormatContactInfo(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.limparErro('contact');
    const digitos = value.replace(/\D/g, '');

    // Máscara (XX) XXXXX-XXXX só para número nacional; "+", "00" ou mais de 11 dígitos
    // indicam número de outro país e ficam como a pessoa digitou.
    const pareceTelefoneBr = (/^\d/.test(value) || value.startsWith('(')) && !value.startsWith('00') && digitos.length <= 11;
    if (!pareceTelefoneBr) {
      this.contactInfo = value;
      return;
    }

    if (!digitos.length) {
      this.contactInfo = '';
      return;
    }
    let formatado = `(${digitos.substring(0, 2)}`;
    if (digitos.length > 2) formatado += `) ${digitos.substring(2)}`;
    if (digitos.length > 10) {
      formatado = `(${digitos.substring(0, 2)}) ${digitos.substring(2, 7)}-${digitos.substring(7, 11)}`;
    } else if (digitos.length > 6) {
      formatado = `(${digitos.substring(0, 2)}) ${digitos.substring(2, 6)}-${digitos.substring(6, 10)}`;
    }
    this.contactInfo = formatado;
  }

  limparErro(campo: Campo): void {
    if (!this.erros()[campo]) return;
    const { [campo]: _removido, ...resto } = this.erros();
    this.erros.set(resto);
    if (!Object.keys(resto).length && this.statusEnvio() === 'erro') this.statusEnvio.set(null);
  }

  /** Texto do erro geral: o detalhe da API só serve para quem lê português. */
  mensagemErro(): string {
    const detalhe = this.erroDetalhe();
    return detalhe && this.i18n.lang() === 'pt' ? detalhe : this.t(this.erroChave());
  }

  private validar(): Partial<Record<Campo, ContactKey>> {
    const erros: Partial<Record<Campo, ContactKey>> = {};
    const contato = this.contactInfo.trim();
    if (!this.contactName.trim()) erros.name = 'errName';
    if (!contato) {
      erros.contact = 'errContact';
    } else if (contato.includes('@') ? !EMAIL_RE.test(contato) : contato.replace(/\D/g, '').length < 8) {
      erros.contact = 'errContactInvalid';
    }
    if (!this.contactMessage.trim()) erros.message = 'errMessage';
    return erros;
  }

  async sendMessage(): Promise<void> {
    if (this.enviando()) return;
    const erros = this.validar();
    this.erros.set(erros);
    this.erroDetalhe.set('');
    const primeiro = (['name', 'contact', 'message'] as const).find((c) => erros[c]);
    if (primeiro) {
      this.statusEnvio.set('erro');
      this.erroChave.set('errForm');
      document.getElementById(primeiro)?.focus();
      return;
    }
    this.enviando.set(true);
    this.statusEnvio.set(null);
    try {
      // Cai no CRM da Unrender no SGA Ctrl+B (contato + origem + interesses).
      await enviarContato({ nome: this.contactName.trim(), contato: this.contactInfo.trim(), mensagem: this.contactMessage.trim() });
      this.statusEnvio.set('ok');
      this.contactName = '';
      this.contactInfo = '';
      this.contactMessage = '';
    } catch (e) {
      const erro = e instanceof ErroContato ? e : null;
      this.erroChave.set(erro?.codigo === 'falha-envio' ? 'errSend' : 'errOffline');
      this.erroDetalhe.set(erro?.detalhe ?? '');
      this.statusEnvio.set('erro');
    } finally {
      this.enviando.set(false);
    }
  }

  ngAfterViewInit(): void {
    // Mapa (e pedido de localização) só quando a seção se aproxima da tela: evita baixar
    // tiles e abrir o aviso de permissão para quem nem rolou até o contato.
    if (typeof IntersectionObserver === 'undefined') {
      this.iniciarMapa();
      return;
    }
    this.mapObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        this.mapObserver?.disconnect();
        this.mapObserver = undefined;
        this.iniciarMapa();
      },
      { rootMargin: '300px 0px' },
    );
    this.mapObserver.observe(this.mapEl.nativeElement);
  }

  private iniciarMapa(): void {
    if (this.map || this.destroyed) return;
    const toque = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    this.map = L.map(this.mapEl.nativeElement, {
      center: this.destinationCoords,
      zoom: 15,
      zoomControl: true,
      // Roda do mouse e arrasto de um dedo ficam para a página: o mapa não "prende" a rolagem.
      scrollWheelZoom: false,
      dragging: !toque,
      zoomAnimation: !reduzido,
      fadeAnimation: !reduzido,
      markerZoomAnimation: !reduzido,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    // O destino aparece de imediato; a rota entra depois, se a pessoa liberar a localização.
    this.addDestinationMarkerOnly();
    this.getUserLocation();
  }

  private getUserLocation(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (this.destroyed) return;
        this.createRoute([position.coords.latitude, position.coords.longitude]);
      },
      (error) => this.handleLocationError(error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }

  private handleLocationError(error: GeolocationPositionError): void {
    // Permissão negada não adianta repetir; indisponível/tempo esgotado tenta mais duas vezes.
    if (this.destroyed || error.code === error.PERMISSION_DENIED || this.locationRetryCount >= this.maxRetries) return;
    this.locationRetryCount++;
    this.retryTimer = setTimeout(() => this.getUserLocation(), 2000);
  }

  private popupDestino(): string {
    return `<b>UNRENDER</b><br>${ENDERECO}`;
  }

  private popupUsuario(): string {
    return `<b>${this.t('youAreHere')}</b>`;
  }

  private atualizarBaloes(): void {
    this.userMarker?.setPopupContent(this.popupUsuario());
    this.destinationMarker?.setPopupContent(this.popupDestino());
  }

  private createRoute(userCoords: L.LatLngTuple): void {
    if (!this.map || this.routingControl) return;

    try {
      const control = L.Routing.control({
        waypoints: [L.latLng(userCoords), L.latLng(this.destinationCoords)],
        show: false,
        addWaypoints: false,
        routeWhileDragging: false,
        lineOptions: {
          styles: [{ color: '#f99126', weight: 5, opacity: 0.9 }],
          extendToWaypoints: true,
          missingRouteTolerance: 10,
        },
        createMarker: (i: number, waypoint: L.Routing.Waypoint) => {
          const marker = L.marker(waypoint.latLng, { draggable: false, icon: this.destinationIcon });
          if (i === 0) {
            this.userMarker = marker.bindPopup(this.popupUsuario());
          } else {
            // O marcador avulso do destino sai: a rota traz o dela.
            this.destinationMarker?.remove();
            this.destinationMarker = marker.bindPopup(this.popupDestino());
          }
          return marker;
        },
        router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
      } as any);

      control.on('routingerror', () => this.addMarkersOnly(userCoords));
      control.addTo(this.map);
      this.routingControl = control;
    } catch {
      this.addMarkersOnly(userCoords);
    }
  }

  /** Sem rota disponível: mostra os dois pontos ligados por uma linha tracejada. */
  private addMarkersOnly(userCoords: L.LatLngTuple): void {
    if (!this.map || this.fallbackLine) return;
    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = undefined;
    }
    this.userMarker?.remove();
    this.destinationMarker?.remove();

    const userIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      shadowSize: [41, 41],
      shadowAnchor: [12, 41],
    });

    this.userMarker = L.marker(userCoords, { icon: userIcon }).addTo(this.map).bindPopup(this.popupUsuario());
    this.destinationMarker = L.marker(this.destinationCoords, { icon: this.destinationIcon })
      .addTo(this.map)
      .bindPopup(this.popupDestino());
    this.fallbackLine = L.polyline([userCoords, this.destinationCoords], {
      color: '#f99126',
      weight: 3,
      opacity: 0.8,
      dashArray: '10, 10',
    }).addTo(this.map);
  }

  private addDestinationMarkerOnly(): void {
    if (!this.map) return;
    this.destinationMarker = L.marker(this.destinationCoords, { icon: this.destinationIcon })
      .addTo(this.map)
      .bindPopup(this.popupDestino());
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.mapObserver?.disconnect();
    clearTimeout(this.retryTimer);
    clearTimeout(this.focusTimer);
    if (this.map) {
      if (this.routingControl) this.map.removeControl(this.routingControl);
      this.map.remove();
      this.map = undefined;
    }
  }
}
