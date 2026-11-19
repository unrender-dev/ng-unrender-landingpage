import type { Lang } from '../../../../i18n/i18n.service';

/**
 * Dados simulados do painel ao vivo, por setor.
 *
 * `SECTORS` guarda o que não depende de idioma (números, ícones, tipo de cada
 * evento do feed). `SECTOR_TEXT` traz os textos nos quatro idiomas, na MESMA
 * ordem de `SECTORS` — cada `feed[i]` do texto corresponde a `feed[i]` daqui.
 * Valores em dinheiro dentro dos textos passam pelo formatador do idioma (`m`).
 */
export type SectorId =
  | 'academia'
  | 'clinica'
  | 'restaurante'
  | 'varejo'
  | 'advocacia'
  | 'imobiliaria'
  | 'escola'
  | 'beleza'
  | 'pet'
  | 'oficina';

export type FeedKind = 'sale' | 'booking' | 'ai' | 'pay' | 'alert';

export interface SectorShape {
  id: SectorId;
  icon: string;
  /** Receita acumulada nos últimos 30 dias (R$). */
  revenue: number;
  /** Meta dos 30 dias (R$). */
  target: number;
  ticket: number;
  newClients: number;
  /** Conversão do funil, em %. */
  conversion: number;
  /** Métrica de risco do setor (inadimplência, no-show, evasão…), em %. Menor é melhor. */
  risk: number;
  nps: number;
  /** Variação vs. mês anterior, em %: receita, ticket, novos, conversão, risco, NPS (pontos). */
  deltas: [number, number, number, number, number, number];
  funnel: [number, number, number, number];
  /** Pessoas online agora (equipe + clientes). */
  online: number;
  team: number;
  rpm: number;
  p95: number;
  /** Tipo e valor (R$) de cada evento do feed; vendas somam na receita. */
  feed: { k: FeedKind; v?: number }[];
  /** Semente do gerador da série de receita (cada setor tem uma curva própria). */
  seed: number;
}

export const SECTORS: SectorShape[] = [
  {
    id: 'academia', icon: 'fa-solid fa-dumbbell',
    revenue: 186400, target: 200000, ticket: 142, newClients: 168, conversion: 31.4, risk: 3.8, nps: 78,
    deltas: [12.4, 3.1, 18.2, 4.6, -1.2, 5],
    funnel: [612, 284, 203, 168], online: 46, team: 9, rpm: 1840, p95: 112,
    feed: [{ k: 'sale', v: 1078.8 }, { k: 'booking' }, { k: 'ai' }, { k: 'pay', v: 119.9 }, { k: 'alert' }],
    seed: 11,
  },
  {
    id: 'clinica', icon: 'fa-solid fa-tooth',
    revenue: 312800, target: 330000, ticket: 486, newClients: 94, conversion: 38.2, risk: 9.1, nps: 86,
    deltas: [9.8, 6.4, 11.3, 3.2, -8.7, 3],
    funnel: [420, 236, 152, 94], online: 28, team: 12, rpm: 960, p95: 98,
    feed: [{ k: 'sale', v: 4800 }, { k: 'booking' }, { k: 'ai' }, { k: 'pay', v: 450 }, { k: 'alert' }],
    seed: 23,
  },
  {
    id: 'restaurante', icon: 'fa-solid fa-burger',
    revenue: 264300, target: 280000, ticket: 58.4, newClients: 742, conversion: 12.6, risk: 1.9, nps: 72,
    deltas: [14.6, 4.8, 21.5, 1.9, -0.6, 4],
    funnel: [18240, 5470, 4526, 1630], online: 132, team: 14, rpm: 4120, p95: 134,
    feed: [{ k: 'sale', v: 72.8 }, { k: 'booking' }, { k: 'ai' }, { k: 'pay', v: 3120 }, { k: 'alert' }],
    seed: 37,
  },
  {
    id: 'varejo', icon: 'fa-solid fa-bag-shopping',
    revenue: 198700, target: 220000, ticket: 186.5, newClients: 391, conversion: 3.4, risk: 4.2, nps: 74,
    deltas: [7.2, -2.1, 9.6, 0.4, -0.9, 2],
    funnel: [22800, 2510, 1180, 776], online: 88, team: 11, rpm: 3260, p95: 121,
    feed: [{ k: 'sale', v: 389.7 }, { k: 'booking' }, { k: 'ai' }, { k: 'pay', v: 259.9 }, { k: 'alert' }],
    seed: 41,
  },
  {
    id: 'advocacia', icon: 'fa-solid fa-scale-balanced',
    revenue: 148500, target: 160000, ticket: 4850, newClients: 31, conversion: 44.3, risk: 6.4, nps: 89,
    deltas: [10.9, 7.5, 14.8, 5.1, -2.3, 2],
    funnel: [118, 82, 49, 31], online: 14, team: 8, rpm: 410, p95: 89,
    feed: [{ k: 'sale', v: 6500 }, { k: 'booking' }, { k: 'ai' }, { k: 'pay', v: 1800 }, { k: 'alert' }],
    seed: 53,
  },
  {
    id: 'imobiliaria', icon: 'fa-solid fa-house-chimney',
    revenue: 238900, target: 250000, ticket: 3120, newClients: 214, conversion: 7.9, risk: 2.1, nps: 81,
    deltas: [8.3, 2.6, 16.4, 1.1, -1.7, 3],
    funnel: [1480, 362, 141, 58], online: 31, team: 10, rpm: 1270, p95: 104,
    feed: [{ k: 'sale', v: 18600 }, { k: 'booking' }, { k: 'ai' }, { k: 'pay', v: 61200 }, { k: 'alert' }],
    seed: 67,
  },
  {
    id: 'escola', icon: 'fa-solid fa-graduation-cap',
    revenue: 412600, target: 415000, ticket: 1180, newClients: 57, conversion: 46.8, risk: 1.4, nps: 84,
    deltas: [6.1, 4.2, 22.6, 6.8, -0.8, 4],
    funnel: [384, 171, 92, 57], online: 64, team: 22, rpm: 2210, p95: 117,
    feed: [{ k: 'sale', v: 1250 }, { k: 'booking' }, { k: 'ai' }, { k: 'pay', v: 48750 }, { k: 'alert' }],
    seed: 71,
  },
  {
    id: 'beleza', icon: 'fa-solid fa-spa',
    revenue: 96400, target: 105000, ticket: 132, newClients: 118, conversion: 54.1, risk: 7.2, nps: 91,
    deltas: [11.7, 5.3, 13.9, 3.8, -4.1, 2],
    funnel: [486, 352, 318, 211], online: 19, team: 7, rpm: 640, p95: 92,
    feed: [{ k: 'sale', v: 520 }, { k: 'booking' }, { k: 'ai' }, { k: 'pay', v: 140 }, { k: 'alert' }],
    seed: 83,
  },
  {
    id: 'pet', icon: 'fa-solid fa-paw',
    revenue: 128700, target: 135000, ticket: 164, newClients: 86, conversion: 41.6, risk: 5.3, nps: 88,
    deltas: [9.4, 3.7, 12.2, 2.9, -3.4, 3],
    funnel: [392, 268, 241, 74], online: 24, team: 9, rpm: 780, p95: 95,
    feed: [{ k: 'sale', v: 289 }, { k: 'booking' }, { k: 'ai' }, { k: 'pay', v: 850 }, { k: 'alert' }],
    seed: 97,
  },
  {
    id: 'oficina', icon: 'fa-solid fa-screwdriver-wrench',
    revenue: 174200, target: 190000, ticket: 728, newClients: 73, conversion: 62.4, risk: 18.6, nps: 83,
    deltas: [7.9, 4.4, 10.1, 6.2, -5.8, 4],
    funnel: [302, 214, 168, 159], online: 17, team: 8, rpm: 520, p95: 101,
    feed: [{ k: 'sale', v: 1340 }, { k: 'booking' }, { k: 'ai' }, { k: 'pay', v: 389 }, { k: 'alert' }],
    seed: 101,
  },
];

export interface SectorText {
  /** Nome curto no seletor. */
  label: string;
  /** Empresa fictícia mostrada na barra da janela. */
  business: string;
  /** Rótulo do KPI de novos clientes (alunos, pacientes, tutores…). */
  newClients: string;
  /** Rótulo da métrica de risco. */
  risk: string;
  funnel: [string, string, string, string];
  /** Eventos do feed; `{v}` é o valor formatado. */
  feed: string[];
  /** Dicas do copiloto, específicas do setor. */
  tips: string[];
}

type Money = (value: number) => string;

export const SECTOR_TEXT: Record<Lang, (m: Money) => SectorText[]> = {
  pt: (m) => [
    {
      label: 'Academia', business: 'Academia Força Total', newClients: 'Novas matrículas', risk: 'Inadimplência',
      funnel: ['Leads', 'Aula experimental', 'Proposta', 'Matrícula'],
      feed: [
        'Matrícula no plano anual — Mariana S. · {v}',
        'Aula experimental agendada pela IA — amanhã, 19h',
        'IA respondeu 14 dúvidas sobre horários no WhatsApp',
        'PIX recebido — mensalidade de Rafael T. · {v}',
        'Catraca: 86 check-ins na última hora',
      ],
      tips: [
        '12 alunos estão sem treinar há 10 dias: dispare o fluxo de reengajamento antes que cancelem.',
        'A turma das 19h está com 94% de ocupação: abra um horário extra às 20h e chame a lista de espera.',
        `O plano anual converte 2,3× mais quando ofertado depois da 3ª aula: ative a oferta automática (potencial de +${m(8400)}/mês).`,
        '7 mensalidades vencem amanhã sem cartão salvo: envie o link de PIX hoje às 10h.',
      ],
    },
    {
      label: 'Clínica', business: 'Clínica Sorriso', newClients: 'Novos pacientes', risk: 'No-show',
      funnel: ['Contatos', 'Avaliação marcada', 'Orçamento enviado', 'Tratamento fechado'],
      feed: [
        'Tratamento de implante fechado — João P. · {v}',
        'Consulta confirmada pela IA — quinta, 9h, Dra. Paula',
        'IA confirmou 23 consultas de amanhã pelo WhatsApp',
        'Cartão aprovado — 1ª parcela do clareamento · {v}',
        'Lista de espera: encaixe automático às 15h30',
      ],
      tips: [
        'O no-show caiu de 18% para 9% com a confirmação 24 h antes: repita o lembrete na véspera às 18h e chegue a 6%.',
        `31 orçamentos abertos há mais de 7 dias somam ${m(86400)}: o follow-up com parcelamento recupera cerca de 1 em cada 4.`,
        'Terça à tarde está com 40% da agenda livre: lance a campanha de limpeza para quem não volta há mais de 6 meses.',
        'A Dra. Paula tem NPS 92 e o dobro de indicações: destaque o perfil dela na página de agendamento.',
      ],
    },
    {
      label: 'Restaurante', business: 'Burger da Vila · Delivery', newClients: 'Novos clientes', risk: 'Cancelamentos',
      funnel: ['Cardápio aberto', 'Carrinho', 'Pedido', 'Recompra em 30 dias'],
      feed: [
        'Pedido nº 1318 — 2 smash duplos + refrigerante · {v}',
        'Reserva para 8 pessoas — sábado, 20h30',
        'IA montou 9 pedidos direto da conversa no WhatsApp',
        'iFood repassou o lote do dia · {v}',
        'Estoque: pão brioche abaixo do mínimo (40 un.)',
      ],
      tips: [
        'Sexta, das 19h às 21h, concentra 38% dos pedidos: escale mais um entregador e corte 8 min do tempo de entrega.',
        `O combo com batata aumenta o ticket em ${m(14)}: sugira-o automaticamente no carrinho.`,
        '214 clientes não pedem há 21 dias: um cupom de frete grátis traz de volta, em média, 18% deles.',
        'No ritmo atual, o pão brioche acaba às 20h40: o pedido de compra já está pronto para aprovar.',
      ],
    },
    {
      label: 'Varejo', business: 'Loja Bella Moda', newClients: 'Novos clientes', risk: 'Trocas e devoluções',
      funnel: ['Visitantes', 'Carrinho', 'Checkout', 'Compra'],
      feed: [
        'Venda no PDV — 3 peças, caixa 2 · {v}',
        'Retirada na loja agendada — hoje, 17h',
        'IA recuperou 6 carrinhos abandonados pelo WhatsApp',
        'Venda online aprovada (cartão em 3x) · {v}',
        'Estoque: jaqueta jeans M com 2 unidades',
      ],
      tips: [
        `47 carrinhos abandonados ontem somam ${m(12900)}: a mensagem com 5% de desconto em até 1 h recupera até 22%.`,
        'A jaqueta jeans gira 3× mais rápido que a média: reponha 30 unidades antes do fim de semana.',
        'Quem compra 2 vezes em 60 dias gasta 4× mais no ano: crie a régua de segunda compra.',
        'Quinta é o dia de menor movimento: programe o disparo da coleção nova para quarta, às 18h.',
      ],
    },
    {
      label: 'Advocacia', business: 'Lara & Associados Advocacia', newClients: 'Novos clientes', risk: 'Honorários em atraso',
      funnel: ['Consultas', 'Análise do caso', 'Proposta de honorários', 'Contrato assinado'],
      feed: [
        'Contrato assinado — ação trabalhista · {v}',
        'Consulta inicial agendada pela IA — segunda, 10h',
        'IA fez a triagem de 11 contatos e separou 3 casos previdenciários',
        'Honorários recebidos — parcela 2 de 5 · {v}',
        'Prazo: contestação vence em 2 dias úteis',
      ],
      tips: [
        '3 prazos processuais vencem esta semana: as tarefas já foram criadas e os responsáveis, avisados no app.',
        `Propostas enviadas pelo WhatsApp com assinatura digital fecham 41% mais rápido: ${m(38500)} aguardam assinatura.`,
        'Casos previdenciários têm a maior taxa de fechamento (62%): direcione os anúncios para esse tema.',
        '5 clientes estão há 30 dias sem notícia do processo: envie o resumo automático do andamento.',
      ],
    },
    {
      label: 'Imobiliária', business: 'Horizonte Imóveis', newClients: 'Novos interessados', risk: 'Aluguel em atraso',
      funnel: ['Leads', 'Visita agendada', 'Proposta', 'Contrato'],
      feed: [
        'Comissão de venda — casa no Jardim Itália · {v}',
        'Visita agendada pela IA — sábado, 10h, casa de 3 quartos',
        'IA qualificou 17 leads do portal por renda e região',
        'Aluguéis recebidos — 34 boletos compensados · {v}',
        'Vistoria de saída marcada — Rua das Palmeiras, 88',
      ],
      tips: [
        'Leads respondidos em menos de 5 min marcam 3× mais visitas: a IA já atende 100% dos contatos fora do horário.',
        '9 imóveis estão há mais de 60 dias sem visita: baixar 4% no preço os coloca na faixa mais buscada da região.',
        `Com a régua de PIX no dia seguinte ao vencimento, ${m(14300)} deixaram de atrasar este mês.`,
        '22 contratos vencem nos próximos 90 dias: comece a renovação já com o reajuste calculado.',
      ],
    },
    {
      label: 'Escola', business: 'Colégio Saber', newClients: 'Novas matrículas', risk: 'Evasão',
      funnel: ['Interessados', 'Visita / aula aberta', 'Matrícula iniciada', 'Matrícula concluída'],
      feed: [
        'Matrícula 2027 concluída — 6º ano · {v}',
        'Visita guiada agendada — terça, 14h, família Souza',
        'IA respondeu 28 dúvidas sobre material e uniforme',
        'Mensalidades compensadas hoje · {v}',
        'Frequência: 4 alunos com 3 faltas seguidas',
      ],
      tips: [
        '4 alunos estão com 3 faltas seguidas: avise os responsáveis hoje — faltas repetidas antecedem 70% das evasões.',
        'A rematrícula está em 81%: ofereça 5% de desconto até o dia 30 para quem ainda não renovou.',
        `O 6º ano tem 12 vagas abertas: preenchê-las rende ${m(162000)} no ano letivo.`,
        'Famílias que abrem o app toda semana renovam 2× mais: mande o boletim pelo app, não por e-mail.',
      ],
    },
    {
      label: 'Beleza', business: 'Studio Bella Pele', newClients: 'Novas clientes', risk: 'No-show',
      funnel: ['Contatos', 'Horário reservado', 'Atendimento', 'Retorno em 45 dias'],
      feed: [
        'Pacote de 4 sessões de limpeza de pele · {v}',
        'Horário reservado pela IA — Camila, coloração, sábado 9h',
        'IA remarcou 5 horários sem ninguém da recepção',
        'PIX recebido — corte + escova · {v}',
        'Estoque: tintura 7.0 com 3 unidades',
      ],
      tips: [
        '38 clientes de coloração passaram de 40 dias sem voltar: o lembrete automático costuma trazer 1 em cada 3.',
        'Sábado está lotado e terça tem 45% livre: ofereça 10% na terça para quem está na lista de espera.',
        `Pacotes de 4 sessões elevam o ticket para ${m(520)}: ofereça logo depois da primeira sessão.`,
        'A Juliana tem o maior índice de retorno (78%): faça dela a profissional padrão para clientes novas.',
      ],
    },
    {
      label: 'Pet shop', business: 'Pet Feliz · Clínica e Banho', newClients: 'Novos tutores', risk: 'No-show',
      funnel: ['Contatos', 'Agendado', 'Atendido', 'Plano mensal'],
      feed: [
        'Plano de banho mensal — Thor (golden) · {v}',
        'Vacina V10 agendada pela IA — Luna, amanhã às 10h',
        'IA enviou 19 lembretes de vacina e vermífugo',
        'Castração paga no cartão · {v}',
        'Táxi dog: 3 coletas programadas para as 8h',
      ],
      tips: [
        '27 pets estão com vacina vencendo em 15 dias: os lembretes saem amanhã às 9h, com link de agendamento.',
        'Tutores do plano mensal gastam 2,6× mais na loja: ofereça o plano depois do 2º banho avulso.',
        `A ração premium tem margem de 32%: ative a recompra automática a cada 30 dias (potencial de ${m(5800)}/mês).`,
        'Quarta de manhã há 6 horários livres no banho e tosa: dispare a promoção para quem não vem há 30 dias.',
      ],
    },
    {
      label: 'Oficina', business: 'Auto Center Rota', newClients: 'Novos clientes', risk: 'Orçamentos recusados',
      funnel: ['Contatos', 'Diagnóstico', 'Orçamento aprovado', 'Serviço entregue'],
      feed: [
        'OS nº 2084 — freios + alinhamento · {v}',
        'Revisão agendada pela IA — Onix 2021, sexta às 8h',
        'IA enviou fotos do diagnóstico e o orçamento para 4 clientes',
        'Pagamento aprovado — troca de óleo + filtros · {v}',
        'Peças: pastilha dianteira chega amanhã às 9h',
      ],
      tips: [
        '62 clientes passaram de 10.000 km desde a última troca de óleo: o lembrete por placa traz 1 em cada 4 de volta.',
        'Orçamentos com foto e vídeo do defeito são aprovados 37% mais: já é o padrão para todos os mecânicos.',
        `O box 2 ficou ocioso 11 h nesta semana: agendar alinhamentos nesses horários rende cerca de ${m(2400)}.`,
        'Pastilha de freio é a peça mais pedida: a compra programada evita 2 dias de carro parado.',
      ],
    },
  ],

  en: (m) => [
    {
      label: 'Gym', business: 'Força Total Gym', newClients: 'New members', risk: 'Late payments',
      funnel: ['Leads', 'Trial class', 'Offer', 'Sign-up'],
      feed: [
        'Annual plan sign-up — Mariana S. · {v}',
        'Trial class booked by the AI — tomorrow, 7 pm',
        'AI answered 14 questions about class times on WhatsApp',
        'PIX received — Rafael T.’s monthly fee · {v}',
        'Turnstile: 86 check-ins in the last hour',
      ],
      tips: [
        '12 members haven’t trained in 10 days: trigger the re-engagement flow before they cancel.',
        'The 7 pm class is 94% full: open an extra slot at 8 pm and invite the waiting list.',
        `The annual plan converts 2.3× better when offered after the 3rd class: turn on the automatic offer (up to +${m(8400)}/month).`,
        '7 monthly fees are due tomorrow with no saved card: send the PIX link today at 10 am.',
      ],
    },
    {
      label: 'Clinic', business: 'Sorriso Dental Clinic', newClients: 'New patients', risk: 'No-shows',
      funnel: ['Contacts', 'Assessment booked', 'Quote sent', 'Treatment closed'],
      feed: [
        'Implant treatment closed — João P. · {v}',
        'Appointment confirmed by the AI — Thursday, 9 am, Dr. Paula',
        'AI confirmed 23 of tomorrow’s appointments on WhatsApp',
        'Card approved — 1st whitening instalment · {v}',
        'Waiting list: automatic fit-in at 3:30 pm',
      ],
      tips: [
        'No-shows fell from 18% to 9% with the 24-hour confirmation: add a reminder the evening before at 6 pm to reach 6%.',
        `31 quotes open for more than 7 days add up to ${m(86400)}: a follow-up with instalments wins back about 1 in 4.`,
        'Tuesday afternoon is 40% free: launch the cleaning campaign for patients who haven’t returned in 6+ months.',
        'Dr. Paula has an NPS of 92 and twice the referrals: feature her profile on the booking page.',
      ],
    },
    {
      label: 'Restaurant', business: 'Burger da Vila · Delivery', newClients: 'New customers', risk: 'Cancellations',
      funnel: ['Menu opened', 'Cart', 'Order', 'Repeat within 30 days'],
      feed: [
        'Order #1318 — 2 double smash burgers + soda · {v}',
        'Table for 8 booked — Saturday, 8:30 pm',
        'AI built 9 orders straight from WhatsApp chats',
        'iFood paid out today’s batch · {v}',
        'Stock: brioche buns below minimum (40 left)',
      ],
      tips: [
        'Friday from 7 to 9 pm brings 38% of orders: add one more rider and cut delivery time by 8 min.',
        `The fries combo lifts the average ticket by ${m(14)}: suggest it automatically in the cart.`,
        '214 customers haven’t ordered in 21 days: a free-delivery coupon brings back 18% of them on average.',
        'At the current pace, brioche buns run out at 8:40 pm: the purchase order is ready to approve.',
      ],
    },
    {
      label: 'Retail', business: 'Bella Moda Store', newClients: 'New customers', risk: 'Returns and exchanges',
      funnel: ['Visitors', 'Cart', 'Checkout', 'Purchase'],
      feed: [
        'POS sale — 3 items, till 2 · {v}',
        'In-store pickup scheduled — today, 5 pm',
        'AI recovered 6 abandoned carts on WhatsApp',
        'Online sale approved (card, 3 instalments) · {v}',
        'Stock: denim jacket size M down to 2 units',
      ],
      tips: [
        `47 carts abandoned yesterday add up to ${m(12900)}: a 5%-off message within 1 hour recovers up to 22%.`,
        'The denim jacket sells 3× faster than average: restock 30 units before the weekend.',
        'Customers who buy twice in 60 days spend 4× more a year: set up a second-purchase sequence.',
        'Thursday is the slowest day: schedule the new collection blast for Wednesday at 6 pm.',
      ],
    },
    {
      label: 'Law firm', business: 'Lara & Associates Law', newClients: 'New clients', risk: 'Overdue fees',
      funnel: ['Consultations', 'Case review', 'Fee proposal', 'Signed engagement'],
      feed: [
        'Engagement signed — labour claim · {v}',
        'First consultation booked by the AI — Monday, 10 am',
        'AI screened 11 contacts and flagged 3 social-security cases',
        'Fees received — instalment 2 of 5 · {v}',
        'Deadline: defence is due in 2 business days',
      ],
      tips: [
        '3 court deadlines fall this week: tasks are already created and owners notified in the app.',
        `Proposals sent on WhatsApp with e-signature close 41% faster: ${m(38500)} is waiting to be signed.`,
        'Social-security cases have the highest close rate (62%): point your ads at that topic.',
        '5 clients haven’t had a case update in 30 days: send the automatic progress summary.',
      ],
    },
    {
      label: 'Real estate', business: 'Horizonte Real Estate', newClients: 'New prospects', risk: 'Late rent',
      funnel: ['Leads', 'Viewing booked', 'Offer', 'Contract'],
      feed: [
        'Sales commission — house in Jardim Itália · {v}',
        'Viewing booked by the AI — Saturday, 10 am, 3-bed house',
        'AI qualified 17 portal leads by income and area',
        'Rent received — 34 bank slips cleared · {v}',
        'Move-out inspection booked — 88 Palmeiras St.',
      ],
      tips: [
        'Leads answered within 5 min book 3× more viewings: the AI already handles 100% of after-hours contacts.',
        '9 listings have had no viewing in 60+ days: a 4% price cut puts them in the most searched range in the area.',
        `With the next-day PIX reminder, ${m(14300)} in rent was paid on time this month instead of late.`,
        '22 leases expire in the next 90 days: start renewals now with the adjustment already calculated.',
      ],
    },
    {
      label: 'School', business: 'Saber School', newClients: 'New enrolments', risk: 'Drop-outs',
      funnel: ['Interested', 'Tour / open class', 'Enrolment started', 'Enrolment completed'],
      feed: [
        '2027 enrolment completed — 6th grade · {v}',
        'Campus tour booked — Tuesday, 2 pm, Souza family',
        'AI answered 28 questions about supplies and uniforms',
        'Tuition cleared today · {v}',
        'Attendance: 4 students absent 3 days in a row',
      ],
      tips: [
        '4 students have missed 3 days in a row: let the parents know today — repeated absences come before 70% of drop-outs.',
        'Re-enrolment is at 81%: offer 5% off until the 30th to families who haven’t renewed yet.',
        `6th grade has 12 open seats: filling them brings in ${m(162000)} over the school year.`,
        'Families who open the app every week renew 2× more: send report cards through the app, not by e-mail.',
      ],
    },
    {
      label: 'Beauty', business: 'Bella Pele Studio', newClients: 'New clients', risk: 'No-shows',
      funnel: ['Contacts', 'Slot booked', 'Service done', 'Back within 45 days'],
      feed: [
        '4-session facial package · {v}',
        'Slot booked by the AI — Camila, hair colour, Saturday 9 am',
        'AI rescheduled 5 appointments without the front desk',
        'PIX received — cut + blow-dry · {v}',
        'Stock: hair dye 7.0 down to 3 units',
      ],
      tips: [
        '38 colour clients are past 40 days without coming back: the automatic reminder usually brings back 1 in 3.',
        'Saturday is fully booked while Tuesday is 45% free: offer 10% off on Tuesday to the waiting list.',
        `4-session packages raise the ticket to ${m(520)}: offer them right after the first session.`,
        'Juliana has the highest return rate (78%): make her the default professional for new clients.',
      ],
    },
    {
      label: 'Pet shop', business: 'Pet Feliz · Vet & Grooming', newClients: 'New pet owners', risk: 'No-shows',
      funnel: ['Contacts', 'Booked', 'Seen', 'Monthly plan'],
      feed: [
        'Monthly grooming plan — Thor (golden) · {v}',
        'V10 vaccine booked by the AI — Luna, tomorrow at 10 am',
        'AI sent 19 vaccine and deworming reminders',
        'Neutering paid by card · {v}',
        'Pet taxi: 3 pick-ups scheduled for 8 am',
      ],
      tips: [
        '27 pets have vaccines expiring within 15 days: reminders go out tomorrow at 9 am with a booking link.',
        'Monthly-plan owners spend 2.6× more in the shop: offer the plan after the 2nd one-off bath.',
        `Premium food has a 32% margin: turn on automatic reorders every 30 days (up to ${m(5800)}/month).`,
        'Wednesday morning has 6 free grooming slots: send the promo to owners who haven’t come in 30 days.',
      ],
    },
    {
      label: 'Auto repair', business: 'Rota Auto Center', newClients: 'New customers', risk: 'Rejected quotes',
      funnel: ['Contacts', 'Diagnosis', 'Quote approved', 'Car delivered'],
      feed: [
        'Work order #2084 — brakes + alignment · {v}',
        'Service booked by the AI — 2021 Onix, Friday at 8 am',
        'AI sent diagnosis photos and the quote to 4 customers',
        'Payment approved — oil change + filters · {v}',
        'Parts: front brake pads arrive tomorrow at 9 am',
      ],
      tips: [
        '62 customers are past 10,000 km since their last oil change: the plate-based reminder brings back 1 in 4.',
        'Quotes with a photo and video of the fault get approved 37% more often: it’s now the default for every mechanic.',
        `Bay 2 sat idle for 11 hours this week: booking alignments in those slots brings in about ${m(2400)}.`,
        'Brake pads are the most requested part: a scheduled purchase avoids 2 days of a car stuck in the shop.',
      ],
    },
  ],

  es: (m) => [
    {
      label: 'Gimnasio', business: 'Gimnasio Força Total', newClients: 'Nuevas inscripciones', risk: 'Morosidad',
      funnel: ['Leads', 'Clase de prueba', 'Propuesta', 'Inscripción'],
      feed: [
        'Inscripción en el plan anual — Mariana S. · {v}',
        'Clase de prueba agendada por la IA — mañana, 19 h',
        'La IA respondió 14 dudas sobre horarios en WhatsApp',
        'PIX recibido — cuota de Rafael T. · {v}',
        'Torniquete: 86 accesos en la última hora',
      ],
      tips: [
        '12 alumnos llevan 10 días sin entrenar: activa el flujo de reactivación antes de que se den de baja.',
        'La clase de las 19 h está al 94%: abre un horario extra a las 20 h y avisa a la lista de espera.',
        `El plan anual convierte 2,3× más si se ofrece después de la 3.ª clase: activa la oferta automática (hasta +${m(8400)}/mes).`,
        'Mañana vencen 7 cuotas sin tarjeta guardada: envía hoy a las 10 h el enlace de PIX.',
      ],
    },
    {
      label: 'Clínica', business: 'Clínica Sorriso', newClients: 'Nuevos pacientes', risk: 'Ausencias',
      funnel: ['Contactos', 'Evaluación agendada', 'Presupuesto enviado', 'Tratamiento cerrado'],
      feed: [
        'Tratamiento de implante cerrado — João P. · {v}',
        'Cita confirmada por la IA — jueves, 9 h, Dra. Paula',
        'La IA confirmó 23 citas de mañana por WhatsApp',
        'Tarjeta aprobada — 1.ª cuota del blanqueamiento · {v}',
        'Lista de espera: hueco ocupado automáticamente a las 15:30',
      ],
      tips: [
        'Las ausencias bajaron del 18% al 9% con la confirmación 24 h antes: añade un aviso la víspera a las 18 h y llega al 6%.',
        `31 presupuestos abiertos hace más de 7 días suman ${m(86400)}: el seguimiento con pago a plazos recupera cerca de 1 de cada 4.`,
        'El martes por la tarde tiene el 40% de la agenda libre: lanza la campaña de limpieza para quien no vuelve hace más de 6 meses.',
        'La Dra. Paula tiene NPS 92 y el doble de recomendaciones: destaca su perfil en la página de citas.',
      ],
    },
    {
      label: 'Restaurante', business: 'Burger da Vila · Delivery', newClients: 'Nuevos clientes', risk: 'Cancelaciones',
      funnel: ['Menú abierto', 'Carrito', 'Pedido', 'Recompra en 30 días'],
      feed: [
        'Pedido n.º 1318 — 2 smash dobles + refresco · {v}',
        'Reserva para 8 personas — sábado, 20:30',
        'La IA armó 9 pedidos directamente desde WhatsApp',
        'iFood transfirió el lote del día · {v}',
        'Inventario: pan brioche por debajo del mínimo (40 u.)',
      ],
      tips: [
        'El viernes de 19 a 21 h concentra el 38% de los pedidos: suma un repartidor y recorta 8 min del tiempo de entrega.',
        `El combo con patatas sube el ticket en ${m(14)}: sugiérelo automáticamente en el carrito.`,
        '214 clientes no piden desde hace 21 días: un cupón de envío gratis recupera, de media, al 18%.',
        'Al ritmo actual, el pan brioche se acaba a las 20:40: la orden de compra está lista para aprobar.',
      ],
    },
    {
      label: 'Comercio', business: 'Tienda Bella Moda', newClients: 'Nuevos clientes', risk: 'Cambios y devoluciones',
      funnel: ['Visitantes', 'Carrito', 'Checkout', 'Compra'],
      feed: [
        'Venta en el TPV — 3 prendas, caja 2 · {v}',
        'Recogida en tienda agendada — hoy, 17 h',
        'La IA recuperó 6 carritos abandonados por WhatsApp',
        'Venta online aprobada (tarjeta en 3 cuotas) · {v}',
        'Inventario: chaqueta vaquera talla M con 2 unidades',
      ],
      tips: [
        `47 carritos abandonados ayer suman ${m(12900)}: un mensaje con 5% de descuento en menos de 1 h recupera hasta el 22%.`,
        'La chaqueta vaquera rota 3× más rápido que la media: repón 30 unidades antes del fin de semana.',
        'Quien compra 2 veces en 60 días gasta 4× más al año: crea la secuencia de segunda compra.',
        'El jueves es el día más flojo: programa el envío de la nueva colección para el miércoles a las 18 h.',
      ],
    },
    {
      label: 'Abogados', business: 'Lara & Asociados Abogados', newClients: 'Nuevos clientes', risk: 'Honorarios atrasados',
      funnel: ['Consultas', 'Análisis del caso', 'Propuesta de honorarios', 'Contrato firmado'],
      feed: [
        'Contrato firmado — demanda laboral · {v}',
        'Consulta inicial agendada por la IA — lunes, 10 h',
        'La IA clasificó 11 contactos y separó 3 casos de pensiones',
        'Honorarios cobrados — cuota 2 de 5 · {v}',
        'Plazo: la contestación vence en 2 días hábiles',
      ],
      tips: [
        'Esta semana vencen 3 plazos procesales: las tareas ya están creadas y los responsables, avisados en la app.',
        `Las propuestas enviadas por WhatsApp con firma digital se cierran un 41% más rápido: ${m(38500)} esperan firma.`,
        'Los casos de pensiones tienen la mayor tasa de cierre (62%): orienta los anuncios a ese tema.',
        '5 clientes llevan 30 días sin novedades de su caso: envía el resumen automático del avance.',
      ],
    },
    {
      label: 'Inmobiliaria', business: 'Horizonte Inmuebles', newClients: 'Nuevos interesados', risk: 'Alquiler atrasado',
      funnel: ['Leads', 'Visita agendada', 'Oferta', 'Contrato'],
      feed: [
        'Comisión de venta — casa en Jardim Itália · {v}',
        'Visita agendada por la IA — sábado, 10 h, casa de 3 habitaciones',
        'La IA calificó 17 leads del portal por renta y zona',
        'Alquileres cobrados — 34 boletos compensados · {v}',
        'Inspección de salida agendada — calle das Palmeiras, 88',
      ],
      tips: [
        'Los leads atendidos en menos de 5 min agendan 3× más visitas: la IA ya responde el 100% fuera de horario.',
        '9 inmuebles llevan más de 60 días sin visitas: bajar un 4% el precio los coloca en la franja más buscada de la zona.',
        `Con el aviso de PIX al día siguiente del vencimiento, ${m(14300)} dejaron de atrasarse este mes.`,
        '22 contratos vencen en los próximos 90 días: empieza la renovación con el reajuste ya calculado.',
      ],
    },
    {
      label: 'Escuela', business: 'Colegio Saber', newClients: 'Nuevas matrículas', risk: 'Abandono',
      funnel: ['Interesados', 'Visita / clase abierta', 'Matrícula iniciada', 'Matrícula completada'],
      feed: [
        'Matrícula 2027 completada — 6.º curso · {v}',
        'Visita guiada agendada — martes, 14 h, familia Souza',
        'La IA respondió 28 dudas sobre material y uniforme',
        'Mensualidades cobradas hoy · {v}',
        'Asistencia: 4 alumnos con 3 faltas seguidas',
      ],
      tips: [
        '4 alumnos llevan 3 faltas seguidas: avisa hoy a las familias — las faltas repetidas preceden al 70% de los abandonos.',
        'La rematrícula está en el 81%: ofrece un 5% de descuento hasta el día 30 a quien aún no ha renovado.',
        `6.º curso tiene 12 plazas libres: cubrirlas aporta ${m(162000)} en el año escolar.`,
        'Las familias que abren la app cada semana renuevan 2× más: envía el boletín por la app, no por e-mail.',
      ],
    },
    {
      label: 'Belleza', business: 'Studio Bella Pele', newClients: 'Nuevas clientas', risk: 'Ausencias',
      funnel: ['Contactos', 'Hora reservada', 'Servicio', 'Vuelve en 45 días'],
      feed: [
        'Paquete de 4 sesiones de limpieza facial · {v}',
        'Hora reservada por la IA — Camila, coloración, sábado 9 h',
        'La IA reagendó 5 citas sin pasar por recepción',
        'PIX recibido — corte + brushing · {v}',
        'Inventario: tinte 7.0 con 3 unidades',
      ],
      tips: [
        '38 clientas de coloración llevan más de 40 días sin volver: el recordatorio automático suele traer de vuelta a 1 de cada 3.',
        'El sábado está completo y el martes tiene un 45% libre: ofrece un 10% el martes a la lista de espera.',
        `Los paquetes de 4 sesiones suben el ticket a ${m(520)}: ofrécelos justo después de la primera sesión.`,
        'Juliana tiene el mayor índice de retorno (78%): asígnala por defecto a las clientas nuevas.',
      ],
    },
    {
      label: 'Mascotas', business: 'Pet Feliz · Veterinaria y Peluquería', newClients: 'Nuevos tutores', risk: 'Ausencias',
      funnel: ['Contactos', 'Agendado', 'Atendido', 'Plan mensual'],
      feed: [
        'Plan mensual de baño — Thor (golden) · {v}',
        'Vacuna V10 agendada por la IA — Luna, mañana a las 10 h',
        'La IA envió 19 recordatorios de vacunas y desparasitación',
        'Castración pagada con tarjeta · {v}',
        'Taxi para mascotas: 3 recogidas programadas a las 8 h',
      ],
      tips: [
        '27 mascotas tienen vacunas que vencen en 15 días: los recordatorios salen mañana a las 9 h con enlace para agendar.',
        'Los tutores del plan mensual gastan 2,6× más en la tienda: ofrece el plan después del 2.º baño suelto.',
        `El pienso premium tiene un 32% de margen: activa la recompra automática cada 30 días (hasta ${m(5800)}/mes).`,
        'El miércoles por la mañana hay 6 huecos libres en peluquería: envía la promoción a quien no viene hace 30 días.',
      ],
    },
    {
      label: 'Taller', business: 'Auto Center Rota', newClients: 'Nuevos clientes', risk: 'Presupuestos rechazados',
      funnel: ['Contactos', 'Diagnóstico', 'Presupuesto aprobado', 'Vehículo entregado'],
      feed: [
        'Orden n.º 2084 — frenos + alineación · {v}',
        'Revisión agendada por la IA — Onix 2021, viernes a las 8 h',
        'La IA envió fotos del diagnóstico y el presupuesto a 4 clientes',
        'Pago aprobado — cambio de aceite + filtros · {v}',
        'Repuestos: las pastillas delanteras llegan mañana a las 9 h',
      ],
      tips: [
        '62 clientes superaron los 10.000 km desde el último cambio de aceite: el recordatorio por matrícula recupera a 1 de cada 4.',
        'Los presupuestos con foto y vídeo de la avería se aprueban un 37% más: ya es el estándar para todos los mecánicos.',
        `La bahía 2 estuvo parada 11 h esta semana: agendar alineaciones en esos huecos aporta unos ${m(2400)}.`,
        'Las pastillas de freno son la pieza más pedida: la compra programada evita 2 días de coche parado.',
      ],
    },
  ],

  fr: (m) => [
    {
      label: 'Salle de sport', business: 'Salle Força Total', newClients: 'Nouvelles inscriptions', risk: 'Impayés',
      funnel: ['Prospects', 'Séance d’essai', 'Proposition', 'Inscription'],
      feed: [
        'Inscription à l’abonnement annuel — Mariana S. · {v}',
        'Séance d’essai réservée par l’IA — demain, 19 h',
        'L’IA a répondu à 14 questions sur les horaires sur WhatsApp',
        'PIX reçu — mensualité de Rafael T. · {v}',
        'Tourniquet : 86 passages dans la dernière heure',
      ],
      tips: [
        '12 adhérents ne sont pas venus depuis 10 jours : lancez le parcours de relance avant qu’ils résilient.',
        'Le cours de 19 h est rempli à 94 % : ouvrez un créneau à 20 h et prévenez la liste d’attente.',
        `L’abonnement annuel convertit 2,3× mieux s’il est proposé après la 3e séance : activez l’offre automatique (jusqu’à +${m(8400)}/mois).`,
        '7 mensualités arrivent à échéance demain sans carte enregistrée : envoyez le lien PIX aujourd’hui à 10 h.',
      ],
    },
    {
      label: 'Clinique', business: 'Cabinet dentaire Sorriso', newClients: 'Nouveaux patients', risk: 'Rendez-vous manqués',
      funnel: ['Contacts', 'Bilan planifié', 'Devis envoyé', 'Traitement signé'],
      feed: [
        'Traitement d’implant signé — João P. · {v}',
        'Rendez-vous confirmé par l’IA — jeudi, 9 h, Dr Paula',
        'L’IA a confirmé 23 rendez-vous de demain par WhatsApp',
        'Carte acceptée — 1re échéance du blanchiment · {v}',
        'Liste d’attente : créneau comblé automatiquement à 15 h 30',
      ],
      tips: [
        'Les absences sont passées de 18 % à 9 % avec la confirmation 24 h avant : ajoutez un rappel la veille à 18 h pour viser 6 %.',
        `31 devis ouverts depuis plus de 7 jours totalisent ${m(86400)} : une relance avec paiement échelonné en récupère environ 1 sur 4.`,
        'Le mardi après-midi est libre à 40 % : lancez la campagne de détartrage pour les patients absents depuis plus de 6 mois.',
        'Le Dr Paula a un NPS de 92 et deux fois plus de recommandations : mettez son profil en avant sur la page de réservation.',
      ],
    },
    {
      label: 'Restaurant', business: 'Burger da Vila · Livraison', newClients: 'Nouveaux clients', risk: 'Annulations',
      funnel: ['Menu ouvert', 'Panier', 'Commande', 'Recommande sous 30 jours'],
      feed: [
        'Commande n° 1318 — 2 smash doubles + soda · {v}',
        'Réservation pour 8 personnes — samedi, 20 h 30',
        'L’IA a monté 9 commandes directement depuis WhatsApp',
        'iFood a versé le lot du jour · {v}',
        'Stock : pain brioché sous le minimum (40 pièces)',
      ],
      tips: [
        'Le vendredi de 19 h à 21 h concentre 38 % des commandes : ajoutez un livreur et gagnez 8 min de délai.',
        `Le menu avec frites augmente le panier de ${m(14)} : proposez-le automatiquement au panier.`,
        '214 clients n’ont pas commandé depuis 21 jours : un code livraison offerte en fait revenir 18 % en moyenne.',
        'Au rythme actuel, le pain brioché sera épuisé à 20 h 40 : le bon de commande est prêt à être validé.',
      ],
    },
    {
      label: 'Commerce', business: 'Boutique Bella Moda', newClients: 'Nouveaux clients', risk: 'Retours et échanges',
      funnel: ['Visiteurs', 'Panier', 'Paiement', 'Achat'],
      feed: [
        'Vente en caisse — 3 articles, caisse 2 · {v}',
        'Retrait en magasin planifié — aujourd’hui, 17 h',
        'L’IA a récupéré 6 paniers abandonnés sur WhatsApp',
        'Vente en ligne acceptée (carte, 3 fois) · {v}',
        'Stock : veste en jean taille M, plus que 2 pièces',
      ],
      tips: [
        `47 paniers abandonnés hier totalisent ${m(12900)} : un message avec 5 % de remise en moins d’1 h en récupère jusqu’à 22 %.`,
        'La veste en jean part 3× plus vite que la moyenne : réassortez 30 pièces avant le week-end.',
        'Les clients qui achètent 2 fois en 60 jours dépensent 4× plus par an : créez le parcours de second achat.',
        'Le jeudi est le jour le plus calme : programmez l’envoi de la nouvelle collection mercredi à 18 h.',
      ],
    },
    {
      label: 'Cabinet d’avocats', business: 'Lara & Associés Avocats', newClients: 'Nouveaux clients', risk: 'Honoraires en retard',
      funnel: ['Consultations', 'Analyse du dossier', 'Proposition d’honoraires', 'Convention signée'],
      feed: [
        'Convention signée — litige prud’homal · {v}',
        'Première consultation réservée par l’IA — lundi, 10 h',
        'L’IA a trié 11 contacts et isolé 3 dossiers de retraite',
        'Honoraires encaissés — échéance 2 sur 5 · {v}',
        'Délai : les conclusions sont à rendre dans 2 jours ouvrés',
      ],
      tips: [
        '3 délais de procédure tombent cette semaine : les tâches sont créées et les responsables prévenus dans l’app.',
        `Les propositions envoyées sur WhatsApp avec signature électronique se concluent 41 % plus vite : ${m(38500)} attendent une signature.`,
        'Les dossiers de retraite ont le meilleur taux de conclusion (62 %) : orientez vos annonces vers ce thème.',
        '5 clients n’ont reçu aucune nouvelle de leur dossier depuis 30 jours : envoyez le point d’avancement automatique.',
      ],
    },
    {
      label: 'Immobilier', business: 'Horizonte Immobilier', newClients: 'Nouveaux prospects', risk: 'Loyers en retard',
      funnel: ['Prospects', 'Visite planifiée', 'Offre', 'Bail / acte'],
      feed: [
        'Commission de vente — maison au Jardim Itália · {v}',
        'Visite réservée par l’IA — samedi, 10 h, maison 3 chambres',
        'L’IA a qualifié 17 prospects du portail par revenu et quartier',
        'Loyers encaissés — 34 avis de paiement soldés · {v}',
        'État des lieux de sortie planifié — 88, rue das Palmeiras',
      ],
      tips: [
        'Les prospects contactés en moins de 5 min réservent 3× plus de visites : l’IA répond déjà à 100 % des contacts hors horaires.',
        '9 biens n’ont eu aucune visite depuis plus de 60 jours : une baisse de 4 % les place dans la tranche la plus recherchée du quartier.',
        `Grâce au rappel PIX le lendemain de l’échéance, ${m(14300)} de loyers ont été payés à temps ce mois-ci.`,
        '22 baux arrivent à échéance dans les 90 prochains jours : lancez le renouvellement avec la révision déjà calculée.',
      ],
    },
    {
      label: 'École', business: 'Collège Saber', newClients: 'Nouvelles inscriptions', risk: 'Décrochage',
      funnel: ['Intéressés', 'Visite / cours ouvert', 'Inscription commencée', 'Inscription finalisée'],
      feed: [
        'Inscription 2027 finalisée — 6e · {v}',
        'Visite guidée planifiée — mardi, 14 h, famille Souza',
        'L’IA a répondu à 28 questions sur les fournitures et l’uniforme',
        'Frais de scolarité encaissés aujourd’hui · {v}',
        'Assiduité : 4 élèves absents 3 jours de suite',
      ],
      tips: [
        '4 élèves sont absents 3 jours de suite : prévenez les familles aujourd’hui — les absences répétées précèdent 70 % des décrochages.',
        'La réinscription atteint 81 % : proposez 5 % de remise jusqu’au 30 à ceux qui n’ont pas encore renouvelé.',
        `La 6e compte 12 places libres : les remplir rapporte ${m(162000)} sur l’année scolaire.`,
        'Les familles qui ouvrent l’app chaque semaine se réinscrivent 2× plus : envoyez le bulletin par l’app, pas par e-mail.',
      ],
    },
    {
      label: 'Beauté', business: 'Studio Bella Pele', newClients: 'Nouvelles clientes', risk: 'Rendez-vous manqués',
      funnel: ['Contacts', 'Créneau réservé', 'Prestation', 'Retour sous 45 jours'],
      feed: [
        'Forfait de 4 soins du visage · {v}',
        'Créneau réservé par l’IA — Camila, coloration, samedi 9 h',
        'L’IA a déplacé 5 rendez-vous sans passer par l’accueil',
        'PIX reçu — coupe + brushing · {v}',
        'Stock : coloration 7.0, plus que 3 tubes',
      ],
      tips: [
        '38 clientes coloration ne sont pas revenues depuis plus de 40 jours : le rappel automatique en fait revenir 1 sur 3.',
        'Le samedi est complet, le mardi libre à 45 % : proposez 10 % le mardi à la liste d’attente.',
        `Les forfaits de 4 séances portent le panier à ${m(520)} : proposez-les juste après la première séance.`,
        'Juliana a le meilleur taux de retour (78 %) : attribuez-la par défaut aux nouvelles clientes.',
      ],
    },
    {
      label: 'Animalerie', business: 'Pet Feliz · Vétérinaire et toilettage', newClients: 'Nouveaux propriétaires', risk: 'Rendez-vous manqués',
      funnel: ['Contacts', 'Réservé', 'Reçu', 'Forfait mensuel'],
      feed: [
        'Forfait toilettage mensuel — Thor (golden) · {v}',
        'Vaccin V10 réservé par l’IA — Luna, demain à 10 h',
        'L’IA a envoyé 19 rappels de vaccin et de vermifuge',
        'Stérilisation réglée par carte · {v}',
        'Taxi animalier : 3 prises en charge prévues à 8 h',
      ],
      tips: [
        '27 animaux ont un vaccin qui expire sous 15 jours : les rappels partent demain à 9 h avec un lien de réservation.',
        'Les clients au forfait mensuel dépensent 2,6× plus en boutique : proposez le forfait après le 2e toilettage.',
        `Les croquettes premium ont 32 % de marge : activez le réachat automatique tous les 30 jours (jusqu’à ${m(5800)}/mois).`,
        'Mercredi matin, 6 créneaux de toilettage sont libres : envoyez la promo aux clients absents depuis 30 jours.',
      ],
    },
    {
      label: 'Garage', business: 'Garage Rota Auto', newClients: 'Nouveaux clients', risk: 'Devis refusés',
      funnel: ['Contacts', 'Diagnostic', 'Devis accepté', 'Véhicule livré'],
      feed: [
        'OR n° 2084 — freins + parallélisme · {v}',
        'Révision réservée par l’IA — Onix 2021, vendredi à 8 h',
        'L’IA a envoyé les photos du diagnostic et le devis à 4 clients',
        'Paiement accepté — vidange + filtres · {v}',
        'Pièces : plaquettes avant livrées demain à 9 h',
      ],
      tips: [
        '62 clients ont dépassé 10 000 km depuis leur dernière vidange : le rappel par plaque en fait revenir 1 sur 4.',
        'Les devis avec photo et vidéo de la panne sont acceptés 37 % plus souvent : c’est désormais la norme pour tous les mécaniciens.',
        `Le pont 2 est resté inoccupé 11 h cette semaine : y planifier des parallélismes rapporte environ ${m(2400)}.`,
        'Les plaquettes de frein sont la pièce la plus demandée : un achat programmé évite 2 jours d’immobilisation.',
      ],
    },
  ],
};
