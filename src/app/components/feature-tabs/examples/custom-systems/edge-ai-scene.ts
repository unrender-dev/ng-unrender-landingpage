import { hash01, smoothstep } from '../infra-shared/sim-loop';

/**
 * Cena da demo de Edge AI: uma esteira de expedição vista de cima, com volumes
 * detectados, classificados e contados.
 *
 * Tudo é função do tempo contínuo `t`: o volume de índice `n` está sempre em
 * `x = v·t − n·passo`, então a esteira nunca "reinicia" — volumes entram por um
 * lado e saem pelo outro indefinidamente, sem emenda.
 */
const W = 400;
const H = 225;
const SPEED = 30;
const SPACING = 138;
const LINE_X = 268;
const BELT_TOP = 72;
const BELT_H = 92;
const ROLLER = 14;
const MARGIN = 90;

type Kind = 'box' | 'envelope' | 'crate';

interface Item {
  kind: Kind;
  damaged: boolean;
  w: number;
  h: number;
  dx: number;
  dy: number;
  rot: number;
  conf: number;
  tone: number;
}

export interface EdgeLabels {
  box: string;
  envelope: string;
  crate: string;
  damaged: string;
  line: string;
  percent: (value: number) => string;
}

export interface EdgeStats {
  inScene: number;
  counted: number;
  rejected: number;
}

const CARDBOARD = ['#c99a66', '#b98753', '#d6ad78'];
const OK_COLOR = '#f99126';
const BAD_COLOR = '#ff5d52';

export class EdgeAiScene {
  private readonly cache = new Map<number, Item>();
  private countedUpTo: number;
  private counted = 1284;
  private rejected = 37;
  private lastCross = -10;

  constructor() {
    // Volumes que já passaram da linha em t = 0 não entram na contagem.
    this.countedUpTo = Math.ceil((-LINE_X - 20) / SPACING) - 1;
    while (this.x(this.countedUpTo + 1, 0) > LINE_X) this.countedUpTo++;
  }

  private item(n: number): Item {
    let it = this.cache.get(n);
    if (it) return it;
    const k = hash01(n, 1);
    const kind: Kind = k < 0.6 ? 'box' : k < 0.82 ? 'envelope' : 'crate';
    const big = hash01(n, 2);
    it = {
      kind,
      damaged: kind === 'box' && hash01(n, 3) < 0.2,
      w: kind === 'envelope' ? 50 + big * 12 : kind === 'crate' ? 58 : 44 + big * 22,
      h: kind === 'envelope' ? 32 + big * 6 : kind === 'crate' ? 44 : 38 + hash01(n, 4) * 20,
      dx: (hash01(n, 5) - 0.5) * 30,
      dy: (hash01(n, 6) - 0.5) * 16,
      rot: (hash01(n, 7) - 0.5) * 0.22,
      conf: 0.9 + hash01(n, 8) * 0.085,
      tone: Math.floor(hash01(n, 9) * CARDBOARD.length),
    };
    this.cache.set(n, it);
    if (this.cache.size > 64) this.cache.delete(this.cache.keys().next().value as number);
    return it;
  }

  private x(n: number, t: number): number {
    return SPEED * t - n * SPACING + this.item(n).dx;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    cssW: number,
    dpr: number,
    t: number,
    labels: EdgeLabels,
  ): EdgeStats {
    const s = cssW / W;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
    // Rótulos com tamanho real de ~10–11 px em qualquer largura.
    const font = (cssW < 420 ? 10 : 11) / s;

    this.drawFloor(ctx, t);

    const nMin = Math.ceil((SPEED * t - (W + MARGIN)) / SPACING);
    const nMax = Math.floor((SPEED * t + MARGIN) / SPACING);

    // Contagem: cada volume cruza a linha uma única vez.
    while (this.x(this.countedUpTo + 1, t) > LINE_X) {
      this.countedUpTo++;
      this.counted++;
      if (this.item(this.countedUpTo).damaged) this.rejected++;
      this.lastCross = t;
    }

    for (let n = nMax; n >= nMin; n--) this.drawItem(ctx, this.item(n), this.x(n, t));

    this.drawCountLine(ctx, t, font, labels.line);

    let inScene = 0;
    for (let n = nMax; n >= nMin; n--) {
      const it = this.item(n);
      const x = this.x(n, t);
      // A detecção surge e some suavemente nas bordas do quadro.
      const alpha = smoothstep(6, 44, x) * (1 - smoothstep(W - 44, W - 6, x));
      if (alpha <= 0.01) continue;
      if (alpha > 0.5) inScene++;
      this.drawDetection(ctx, it, x, n, t, alpha, font, labels);
    }

    // Vinheta discreta de lente.
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    return { inScene, counted: this.counted, rejected: this.rejected };
  }

  private drawFloor(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.fillStyle = '#17111f';
    ctx.fillRect(0, 0, W, H);

    // Faixas de segurança no piso.
    ctx.strokeStyle = 'rgba(249,145,38,0.28)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    for (const y of [BELT_TOP - 22, BELT_TOP + BELT_H + 22]) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Esteira e roletes: o deslocamento é o resto da divisão pelo passo, logo o padrão é contínuo.
    ctx.fillStyle = '#2a2335';
    ctx.fillRect(0, BELT_TOP, W, BELT_H);
    const off = (SPEED * t) % ROLLER;
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = off - ROLLER; x < W + ROLLER; x += ROLLER) {
      ctx.moveTo(x, BELT_TOP + 3);
      ctx.lineTo(x, BELT_TOP + BELT_H - 3);
    }
    ctx.stroke();

    ctx.fillStyle = '#463a57';
    ctx.fillRect(0, BELT_TOP - 5, W, 5);
    ctx.fillRect(0, BELT_TOP + BELT_H, W, 5);
  }

  private drawItem(ctx: CanvasRenderingContext2D, it: Item, x: number): void {
    const y = BELT_TOP + BELT_H / 2 + it.dy;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(it.rot);
    const { w, h } = it;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    this.roundRect(ctx, -w / 2 + 2.5, -h / 2 + 3.5, w, h, 3);
    ctx.fill();

    if (it.kind === 'box') {
      ctx.fillStyle = CARDBOARD[it.tone];
      this.roundRect(ctx, -w / 2, -h / 2, w, h, 2.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,214,0.5)';
      ctx.fillRect(-w / 2, -3.5, w, 7);
      ctx.fillStyle = '#f6f2ea';
      ctx.fillRect(w / 2 - 17, -h / 2 + 4, 13, 9);
      ctx.fillStyle = '#3a3340';
      ctx.fillRect(w / 2 - 15, -h / 2 + 6, 9, 1.4);
      ctx.fillRect(w / 2 - 15, -h / 2 + 9, 6, 1.4);
      if (it.damaged) {
        // Canto amassado e rasgo.
        ctx.fillStyle = 'rgba(52,30,16,0.78)';
        ctx.beginPath();
        ctx.moveTo(-w / 2, h / 2);
        ctx.lineTo(-w / 2, h / 2 - 15);
        ctx.lineTo(-w / 2 + 7, h / 2 - 9);
        ctx.lineTo(-w / 2 + 12, h / 2 - 12);
        ctx.lineTo(-w / 2 + 18, h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(52,30,16,0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 12, h / 2 - 12);
        ctx.lineTo(-w / 2 + 20, h / 2 - 20);
        ctx.lineTo(-w / 2 + 23, h / 2 - 15);
        ctx.stroke();
      }
    } else if (it.kind === 'envelope') {
      ctx.fillStyle = '#d9dce3';
      this.roundRect(ctx, -w / 2, -h / 2, w, h, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(70,74,90,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 2, -h / 2 + 2);
      ctx.lineTo(0, 1);
      ctx.lineTo(w / 2 - 2, -h / 2 + 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-9, 5, 18, 7);
    } else {
      ctx.fillStyle = '#3d6f8a';
      this.roundRect(ctx, -w / 2, -h / 2, w, h, 4);
      ctx.fill();
      ctx.fillStyle = '#2c5268';
      this.roundRect(ctx, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 4; i++) {
        const gx = -w / 2 + 5 + ((w - 10) * i) / 4;
        ctx.moveTo(gx, -h / 2 + 5);
        ctx.lineTo(gx, h / 2 - 5);
      }
      ctx.moveTo(-w / 2 + 5, 0);
      ctx.lineTo(w / 2 - 5, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCountLine(ctx: CanvasRenderingContext2D, t: number, font: number, label: string): void {
    const flash = Math.exp(-(t - this.lastCross) * 3.2);
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.42 + flash * 0.5})`;
    ctx.lineWidth = 1.2 + flash * 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(LINE_X, BELT_TOP - 12);
    ctx.lineTo(LINE_X, BELT_TOP + BELT_H + 12);
    ctx.stroke();
    ctx.setLineDash([]);
    if (flash > 0.02) {
      ctx.fillStyle = `rgba(249,145,38,${flash * 0.2})`;
      ctx.fillRect(LINE_X - 8, BELT_TOP - 12, 16, BELT_H + 24);
    }
    ctx.font = `600 ${font * 0.9}px Montserrat, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    // No rodapé do quadro: o topo fica livre para as etiquetas da câmera.
    ctx.fillText(label, Math.min(LINE_X, W - ctx.measureText(label).width / 2 - 4), H - 9);
    ctx.restore();
  }

  private drawDetection(
    ctx: CanvasRenderingContext2D,
    it: Item,
    x: number,
    n: number,
    t: number,
    alpha: number,
    font: number,
    labels: EdgeLabels,
  ): void {
    const y = BELT_TOP + BELT_H / 2 + it.dy;
    const c = Math.abs(Math.cos(it.rot));
    const sn = Math.abs(Math.sin(it.rot));
    // Caixa delimitadora alinhada aos eixos, com a oscilação mínima típica de um detector.
    const bw = it.w * c + it.h * sn + 8 + Math.sin(t * 5.1 + n) * 0.7;
    const bh = it.w * sn + it.h * c + 8 + Math.cos(t * 4.3 + n * 2) * 0.7;
    const left = x - bw / 2;
    const top = y - bh / 2;
    const color = it.damaged ? BAD_COLOR : OK_COLOR;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = alpha * 0.4;
    ctx.strokeRect(left, top, bw, bh);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2;
    const k = 8;
    ctx.beginPath();
    ctx.moveTo(left, top + k);
    ctx.lineTo(left, top);
    ctx.lineTo(left + k, top);
    ctx.moveTo(left + bw - k, top);
    ctx.lineTo(left + bw, top);
    ctx.lineTo(left + bw, top + k);
    ctx.moveTo(left + bw, top + bh - k);
    ctx.lineTo(left + bw, top + bh);
    ctx.lineTo(left + bw - k, top + bh);
    ctx.moveTo(left + k, top + bh);
    ctx.lineTo(left, top + bh);
    ctx.lineTo(left, top + bh - k);
    ctx.stroke();

    const conf = Math.min(0.99, it.conf + Math.sin(t * 0.9 + n * 1.7) * 0.012);
    const name = it.damaged ? labels.damaged : labels[it.kind];
    const text = `${name} ${labels.percent(Math.round(conf * 100) / 100)}`;
    ctx.font = `700 ${font}px Montserrat, system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width + font * 0.8;
    const th = font * 1.5;
    // A etiqueta acompanha a caixa sem sair do quadro; volumes vizinhos alternam
    // entre etiqueta acima e abaixo para nunca se sobreporem.
    const lx = Math.max(2, Math.min(W - tw - 2, left - 1));
    const ly = n % 2 === 0 ? top - th - 1 : top + bh + 1;
    ctx.fillStyle = color;
    this.roundRect(ctx, lx, ly, tw, th, 2);
    ctx.fill();
    ctx.fillStyle = '#10051c';
    ctx.fillText(text, lx + font * 0.4, ly + th / 2 + 0.5);
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

export const EDGE_SCENE_RATIO = W / H;
