/**
 * Ligação desta landing com o SGA Ctrl+B (CRM da Unrender), do jeito que uma
 * página gerada no Ctrl+B faz: formulário vira contato, WhatsApp é Link
 * Rastreável (a conversa cai no Atendimento com a origem) e os serviços em que a
 * pessoa clicou viram interesse no card.
 *
 * Os endereços do SGA vêm do cofre (sga/cofre, projeto `publico`) em tempo de
 * execução: publicar é só trocar SGA_URL / SGA_API_URL no cofre, sem rebuild.
 *   - aberta em localhost/IP da rede → cofre em http://<host>:7700
 *   - em produção → https://api.ctrlb.com.br/cofre (ou <meta name="ctrlb-cofre" content="...">)
 */
const SITE = 'unrender-dev';
const CHAVE = 'unrender_dev_visitante';
const WHATSAPP_PADRAO = 'https://wa.me/5565999207154';

export interface SgaCtrlb {
  api: string;
  whatsapp: string;
  catalogo?: string;
}

const ehLocal = (h: string) =>
  h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local') || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h);

function urlDoCofre(): string {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="ctrlb-cofre"]')?.content?.trim();
  if (meta) return meta.replace(/\/+$/, '');
  const h = location.hostname;
  return ehLocal(h) ? `http://${h}:7700` : 'https://api.ctrlb.com.br/cofre';
}

let pedido: Promise<SgaCtrlb | null> | null = null;

export function sgaCtrlb(): Promise<SgaCtrlb | null> {
  if (pedido) return pedido;
  const ctl = new AbortController();
  const corte = setTimeout(() => ctl.abort(), 3000);
  const padrao = ehLocal(location.hostname) ? 'http://localhost:3002/api/v1' : 'https://api.ctrlb.com.br/api/v1';
  pedido = fetch(`${urlDoCofre()}/v1/publico/publico.json`, { signal: ctl.signal, credentials: 'omit' })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((amb: Record<string, string> | null) => {
      const api = (amb?.['SGA_API_URL'] || padrao).replace(/\/+$/, '');
      return {
        api,
        whatsapp: `${api}/public/landing/${SITE}/whatsapp`,
        catalogo: `${api}/public/landing/${SITE}/catalogo`,
      };
    })
    .finally(() => clearTimeout(corte));
  return pedido;
}

export async function buscarCatalogoSga(): Promise<any | null> {
  try {
    const s = await sgaCtrlb();
    const apiBase = s?.api || (ehLocal(location.hostname) ? 'http://localhost:3002/api/v1' : 'https://api.ctrlb.com.br/api/v1');
    const url = s?.catalogo || `${apiBase}/public/landing/${SITE}/catalogo`;
    const r = await fetch(url, { credentials: 'omit' }).catch(() => null);
    if (r && r.ok) {
      return await r.json();
    }
    const rFallback = await fetch(`${apiBase}/public/unidade/unrender/dados?linha=pos`, { credentials: 'omit' }).catch(() => null);
    if (rFallback && rFallback.ok) {
      return await rFallback.json();
    }
  } catch {
    // Fallback silencioso para catálogo estático
  }
  return null;
}

export function visitante(): string {
  try {
    let v = localStorage.getItem(CHAVE);
    if (!v || !/^[A-Za-z0-9-]{8,64}$/.test(v)) {
      v = (crypto as any).randomUUID?.() || 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      localStorage.setItem(CHAVE, v as string);
    }
    return v as string;
  } catch {
    return '';
  }
}

export async function whatsappUrl(): Promise<string> {
  const s = await sgaCtrlb();
  if (!s) return WHATSAPP_PADRAO;
  const v = visitante();
  return v ? `${s.whatsapp}?v=${encodeURIComponent(v)}` : s.whatsapp;
}

export async function enviarEvento(eventos: { tipo: string; alvo?: string; rotulo?: string }[]): Promise<void> {
  const s = await sgaCtrlb();
  const v = visitante();
  if (!s || !v) return;
  const url = `${s.api}/public/landing/${SITE}/eventos`;
  const corpo = JSON.stringify({ visitante: v, pagina: location.href, eventos });
  const ok = navigator.sendBeacon?.(url, new Blob([corpo], { type: 'text/plain' }));
  if (!ok) fetch(url, { method: 'POST', body: corpo, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
}

/** Motivo da falha de `enviarContato`; quem chama traduz pelo código. */
export type CodigoErroContato = 'sem-conexao' | 'falha-envio';

const MENSAGEM_ERRO_CONTATO: Record<CodigoErroContato, string> = {
  'sem-conexao': 'Sem conexão. Tente de novo ou chame no WhatsApp.',
  'falha-envio': 'Não deu para enviar agora. Tente de novo ou chame no WhatsApp.',
};

/**
 * Erro de `enviarContato`. `codigo` é a chave que a tela traduz; `message` segue
 * em português para quem ainda exibe `e.message` direto. `detalhe` é o texto que
 * a API devolveu (em português), quando houver.
 */
export class ErroContato extends Error {
  constructor(
    readonly codigo: CodigoErroContato,
    readonly detalhe = '',
  ) {
    super(detalhe || MENSAGEM_ERRO_CONTATO[codigo]);
    this.name = 'ErroContato';
  }
}

export async function enviarContato(d: { nome: string; contato: string; mensagem: string }): Promise<void> {
  const s = await sgaCtrlb();
  if (!s) throw new ErroContato('sem-conexao');
  const ehEmail = d.contato.includes('@');
  const r = await fetch(`${s.api}/public/landing/${SITE}/contato`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: d.nome,
      email: ehEmail ? d.contato.trim() : '',
      whatsapp: ehEmail ? '' : d.contato,
      mensagem: d.mensagem,
      visitante: visitante(),
      pagina: location.href,
    }),
  }).catch(() => {
    throw new ErroContato('sem-conexao');
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new ErroContato('falha-envio', typeof j.error === 'string' ? j.error : '');
  }
}

export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
