import { dict, Lang } from '../../../../i18n/i18n.service';

export const I18N = dict({
  pt: {
    typing: 'digitando…',
    online: 'online',
    today: 'Hoje',
    ai: 'IA',
    message: 'Mensagem',
    chatLabel: 'Conversa de exemplo no WhatsApp',
    scenarios: 'Cenários de atendimento',
    backstageTitle: 'O que a IA fez no sistema',
    backstageText: 'Enquanto conversa, a IA do CTRLB cadastra, agenda e dispara automações — sem ninguém da equipe tocar no celular.',
    module: 'módulo {nome}',
    seconds: '{n} s',
    firstReply: '1ª resposta',
    noQueue: 'sem fila',
    teamClicks: 'cliques da equipe',
    demoNote: 'Conversa simulada para demonstração.',
  },
  en: {
    typing: 'typing…',
    online: 'online',
    today: 'Today',
    ai: 'AI',
    message: 'Message',
    chatLabel: 'Sample WhatsApp conversation',
    scenarios: 'Service scenarios',
    backstageTitle: 'What the AI did in the system',
    backstageText: 'While it chats, the CTRLB AI registers, schedules and triggers automations — without anyone on the team touching a phone.',
    module: '{nome} module',
    seconds: '{n} s',
    firstReply: 'first reply',
    noQueue: 'no queue',
    teamClicks: 'clicks from the team',
    demoNote: 'Simulated conversation, for demonstration.',
  },
  es: {
    typing: 'escribiendo…',
    online: 'en línea',
    today: 'Hoy',
    ai: 'IA',
    message: 'Mensaje',
    chatLabel: 'Conversación de ejemplo en WhatsApp',
    scenarios: 'Escenarios de atención',
    backstageTitle: 'Lo que hizo la IA en el sistema',
    backstageText: 'Mientras conversa, la IA de CTRLB registra, agenda y dispara automatizaciones, sin que nadie del equipo toque el celular.',
    module: 'módulo {nome}',
    seconds: '{n} s',
    firstReply: '1.ª respuesta',
    noQueue: 'sin espera',
    teamClicks: 'clics del equipo',
    demoNote: 'Conversación simulada, a modo de demostración.',
  },
  fr: {
    typing: 'écrit…',
    online: 'en ligne',
    today: 'Aujourd’hui',
    ai: 'IA',
    message: 'Message',
    chatLabel: 'Exemple de conversation WhatsApp',
    scenarios: 'Scénarios de service client',
    backstageTitle: 'Ce que l’IA a fait dans le système',
    backstageText: 'Pendant la conversation, l’IA de CTRLB enregistre, planifie et déclenche des automatisations — sans que personne dans l’équipe ne touche au téléphone.',
    module: 'module {nome}',
    seconds: '{n} s',
    firstReply: '1re réponse',
    noQueue: 'sans attente',
    teamClicks: 'clics de l’équipe',
    demoNote: 'Conversation simulée, à titre de démonstration.',
  },
});

export interface StepText {
  text: string;
  card?: { title: string; lines: string[] };
  action?: { text: string; module: string };
}
export interface ScenarioText { label: string; business: string; steps: StepText[]; }

/** Formata um valor em reais no idioma atual. */
type Money = (value: number) => string;

/**
 * Conversas simuladas, na ordem: academia, clínica, restaurante.
 * Cada cenário tem 5 passos, alinhados ao esqueleto (remetente, ícones) do componente.
 */
export const SCENARIO_TEXT: Record<Lang, (m: Money) => ScenarioText[]> = {
  pt: (m) => [
    {
      label: 'Academia', business: 'Academia Força Total',
      steps: [
        { text: 'Oi! Quanto custa o plano mensal? Queria fazer uma aula teste.',
          action: { text: 'Lead “Mariana” criado no funil (origem: WhatsApp)', module: 'CRM' } },
        { text: `Oi, Mariana! O mensal sai por ${m(119.9)} e o anual por ${m(89.9)}/mês. A aula experimental é grátis. Prefere manhã ou noite?` },
        { text: 'Noite. Amanhã, umas 19h, dá?' },
        { text: 'Tem vaga, sim! Reservei para você:',
          card: { title: 'Aula experimental', lines: ['Amanhã · 19:00', 'Musculação com o prof. Diego', 'Leve um documento com foto'] },
          action: { text: 'Horário reservado na agenda do prof. Diego', module: 'Agenda' } },
        { text: 'Te mando um lembrete 2 h antes. Até amanhã!',
          action: { text: 'Lembrete e follow-up pós-aula programados', module: 'Automação' } },
      ],
    },
    {
      label: 'Clínica', business: 'Clínica Sorriso',
      steps: [
        { text: 'Bom dia, vocês atendem pelo convênio? Preciso de uma limpeza.',
          action: { text: 'Paciente encontrado no cadastro: João P.', module: 'Cadastro' } },
        { text: 'Bom dia, João! Atendemos os principais convênios, e o seu está ativo. Tenho quinta às 9h ou sexta às 14h.' },
        { text: 'Quinta às 9 está ótimo.' },
        { text: 'Agendado! Confirmação:',
          card: { title: 'Limpeza / profilaxia', lines: ['Quinta · 09:00', 'Dra. Paula · Sala 2', 'Convênio: autorizado'] },
          action: { text: 'Consulta marcada e guia do convênio solicitada', module: 'Agenda' } },
        { text: 'Na véspera eu confirmo com você por aqui. Qualquer coisa, é só chamar!',
          action: { text: 'Confirmação automática agendada para a véspera', module: 'Automação' } },
      ],
    },
    {
      label: 'Restaurante', business: 'Kardapio · Burger da Vila',
      steps: [
        { text: 'Boa noite! Me vê 2 smash duplos e um refrigerante de 2 L para entrega.',
          action: { text: 'Pedido montado a partir da mensagem', module: 'Kardapio' } },
        { text: 'Fechado! Entrego no mesmo endereço da última vez (Rua das Flores, 120)?' },
        { text: 'Isso, pago no PIX.' },
        { text: 'Pedido confirmado!',
          card: { title: 'Pedido nº 318', lines: ['2× smash duplo · 1× refrigerante 2 L', `Total ${m(72.8)} · PIX enviado`, 'Previsão: 35 min'] },
          action: { text: 'Comanda impressa na cozinha', module: 'PDV' } },
        { text: 'Aviso aqui quando o entregador sair. Bom apetite!',
          action: { text: 'Estoque de pão e carne baixado', module: 'Estoque' } },
      ],
    },
  ],
  en: (m) => [
    {
      label: 'Gym', business: 'Força Total Gym',
      steps: [
        { text: 'Hi! How much is the monthly plan? I’d like to try a class first.',
          action: { text: 'Lead “Mariana” created in the pipeline (source: WhatsApp)', module: 'CRM' } },
        { text: `Hi, Mariana! Monthly is ${m(119.9)} and the annual plan works out to ${m(89.9)} a month. The trial class is free. Do you prefer mornings or evenings?` },
        { text: 'Evenings. Would tomorrow around 7 pm work?' },
        { text: 'Yes, there’s a spot! I’ve booked it for you:',
          card: { title: 'Trial class', lines: ['Tomorrow · 7:00 pm', 'Weight training with coach Diego', 'Bring a photo ID'] },
          action: { text: 'Slot booked on coach Diego’s calendar', module: 'Calendar' } },
        { text: 'I’ll send you a reminder 2 hours before. See you tomorrow!',
          action: { text: 'Reminder and post-class follow-up scheduled', module: 'Automation' } },
      ],
    },
    {
      label: 'Clinic', business: 'Sorriso Dental Clinic',
      steps: [
        { text: 'Good morning, do you take my insurance? I need a cleaning.',
          action: { text: 'Patient found in the records: João P.', module: 'Records' } },
        { text: 'Good morning, João! We work with the main insurance plans, and yours is active. I have Thursday at 9 am or Friday at 2 pm.' },
        { text: 'Thursday at 9 is perfect.' },
        { text: 'Booked! Here’s your confirmation:',
          card: { title: 'Cleaning / prophylaxis', lines: ['Thursday · 9:00 am', 'Dr. Paula · Room 2', 'Insurance: approved'] },
          action: { text: 'Appointment booked and insurance authorization requested', module: 'Calendar' } },
        { text: 'I’ll confirm with you here the day before. If you need anything, just message me!',
          action: { text: 'Automatic confirmation scheduled for the day before', module: 'Automation' } },
      ],
    },
    {
      label: 'Restaurant', business: 'Kardapio · Burger da Vila',
      steps: [
        { text: 'Good evening! Can I get 2 double smash burgers and a 2 L soda for delivery?',
          action: { text: 'Order built from the message', module: 'Kardapio' } },
        { text: 'You got it! Same address as last time (Rua das Flores, 120)?' },
        { text: 'Yes, I’ll pay with PIX.' },
        { text: 'Order confirmed!',
          card: { title: 'Order #318', lines: ['2× double smash · 1× 2 L soda', `Total ${m(72.8)} · PIX code sent`, 'Estimated delivery: 35 min'] },
          action: { text: 'Ticket printed in the kitchen', module: 'POS' } },
        { text: 'I’ll let you know here when the courier leaves. Enjoy!',
          action: { text: 'Bun and patty stock updated', module: 'Stock' } },
      ],
    },
  ],
  es: (m) => [
    {
      label: 'Gimnasio', business: 'Gimnasio Força Total',
      steps: [
        { text: '¡Hola! ¿Cuánto cuesta el plan mensual? Me gustaría hacer una clase de prueba.',
          action: { text: 'Lead «Mariana» creado en el embudo (origen: WhatsApp)', module: 'CRM' } },
        { text: `¡Hola, Mariana! El mensual cuesta ${m(119.9)} y el anual sale a ${m(89.9)} al mes. La clase de prueba es gratis. ¿Prefieres por la mañana o por la noche?` },
        { text: 'Por la noche. ¿Mañana a eso de las 19 h puede ser?' },
        { text: '¡Sí, hay lugar! Te lo reservé:',
          card: { title: 'Clase de prueba', lines: ['Mañana · 19:00', 'Musculación con el profe Diego', 'Trae un documento con foto'] },
          action: { text: 'Horario reservado en la agenda del profe Diego', module: 'Agenda' } },
        { text: 'Te envío un recordatorio 2 h antes. ¡Hasta mañana!',
          action: { text: 'Recordatorio y seguimiento posclase programados', module: 'Automatización' } },
      ],
    },
    {
      label: 'Clínica', business: 'Clínica Sorriso',
      steps: [
        { text: 'Buenos días, ¿atienden con mi seguro? Necesito una limpieza.',
          action: { text: 'Paciente encontrado en el registro: João P.', module: 'Registro' } },
        { text: '¡Buenos días, João! Trabajamos con los principales seguros y el tuyo está activo. Tengo el jueves a las 9 h o el viernes a las 14 h.' },
        { text: 'El jueves a las 9 me viene perfecto.' },
        { text: '¡Agendado! Confirmación:',
          card: { title: 'Limpieza / profilaxis', lines: ['Jueves · 09:00', 'Dra. Paula · Consultorio 2', 'Seguro: autorizado'] },
          action: { text: 'Cita agendada y autorización del seguro solicitada', module: 'Agenda' } },
        { text: 'El día anterior te confirmo por aquí. ¡Cualquier cosa, escríbeme!',
          action: { text: 'Confirmación automática programada para el día anterior', module: 'Automatización' } },
      ],
    },
    {
      label: 'Restaurante', business: 'Kardapio · Burger da Vila',
      steps: [
        { text: '¡Buenas noches! Quiero 2 smash dobles y un refresco de 2 L a domicilio.',
          action: { text: 'Pedido armado a partir del mensaje', module: 'Kardapio' } },
        { text: '¡Listo! ¿Lo envío a la misma dirección de la última vez (Rua das Flores, 120)?' },
        { text: 'Sí, pago con PIX.' },
        { text: '¡Pedido confirmado!',
          card: { title: 'Pedido n.º 318', lines: ['2× smash doble · 1× refresco 2 L', `Total ${m(72.8)} · PIX enviado`, 'Entrega estimada: 35 min'] },
          action: { text: 'Comanda impresa en la cocina', module: 'TPV' } },
        { text: 'Te aviso por aquí cuando salga el repartidor. ¡Buen provecho!',
          action: { text: 'Stock de pan y carne actualizado', module: 'Stock' } },
      ],
    },
  ],
  fr: (m) => [
    {
      label: 'Salle de sport', business: 'Salle de sport Força Total',
      steps: [
        { text: 'Bonjour ! Combien coûte l’abonnement mensuel ? J’aimerais faire un cours d’essai.',
          action: { text: 'Lead « Mariana » créé dans le pipeline (origine : WhatsApp)', module: 'CRM' } },
        { text: `Bonjour Mariana ! Le mensuel est à ${m(119.9)} et l’annuel revient à ${m(89.9)} par mois. Le cours d’essai est gratuit. Plutôt le matin ou le soir ?` },
        { text: 'Le soir. Demain vers 19 h, c’est possible ?' },
        { text: 'Oui, il reste une place ! Je vous l’ai réservée :',
          card: { title: 'Cours d’essai', lines: ['Demain · 19 h 00', 'Musculation avec le coach Diego', 'Apportez une pièce d’identité'] },
          action: { text: 'Créneau réservé dans l’agenda du coach Diego', module: 'Agenda' } },
        { text: 'Je vous envoie un rappel 2 h avant. À demain !',
          action: { text: 'Rappel et suivi après le cours programmés', module: 'Automatisation' } },
      ],
    },
    {
      label: 'Clinique', business: 'Clinique Sorriso',
      steps: [
        { text: 'Bonjour, vous acceptez ma mutuelle ? J’ai besoin d’un détartrage.',
          action: { text: 'Patient trouvé dans le fichier : João P.', module: 'Fichier patients' } },
        { text: 'Bonjour João ! Nous travaillons avec les principales mutuelles et la vôtre est active. J’ai jeudi à 9 h ou vendredi à 14 h.' },
        { text: 'Jeudi à 9 h, c’est parfait.' },
        { text: 'C’est noté ! Votre confirmation :',
          card: { title: 'Détartrage / prophylaxie', lines: ['Jeudi · 9 h 00', 'Dr Paula · Salle 2', 'Mutuelle : accord obtenu'] },
          action: { text: 'Rendez-vous pris et accord de la mutuelle demandé', module: 'Agenda' } },
        { text: 'La veille, je vous confirme ici. Au moindre besoin, écrivez-moi !',
          action: { text: 'Confirmation automatique programmée pour la veille', module: 'Automatisation' } },
      ],
    },
    {
      label: 'Restaurant', business: 'Kardapio · Burger da Vila',
      steps: [
        { text: 'Bonsoir ! Je voudrais 2 doubles smash burgers et un soda de 2 L en livraison.',
          action: { text: 'Commande créée à partir du message', module: 'Kardapio' } },
        { text: 'C’est noté ! Je livre à la même adresse que la dernière fois (Rua das Flores, 120) ?' },
        { text: 'Oui, je paie par PIX.' },
        { text: 'Commande confirmée !',
          card: { title: 'Commande n° 318', lines: ['2× double smash · 1× soda 2 L', `Total ${m(72.8)} · PIX envoyé`, 'Livraison estimée : 35 min'] },
          action: { text: 'Bon imprimé en cuisine', module: 'Caisse' } },
        { text: 'Je vous préviens ici dès que le livreur part. Bon appétit !',
          action: { text: 'Stock de pains et de viande mis à jour', module: 'Stock' } },
      ],
    },
  ],
};
