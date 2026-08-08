/**
 * Gera um código único de acompanhamento de ticket no formato MW-XXXXX
 * onde XXXXX é uma string alfanumérica aleatória em maiúsculas.
 */
export function gerarCodigoTicket(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sem caracteres ambíguos (0/O, 1/I)
  let codigo = "MW-";
  for (let i = 0; i < 5; i++) {
    codigo += chars[Math.floor(Math.random() * chars.length)];
  }
  return codigo;
}

/**
 * Formata uma data para exibição em pt-BR.
 */
export function formatarData(data: Date | string, incluirHora = true): string {
  const d = typeof data === "string" ? new Date(data) : data;
  if (incluirHora) {
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Retorna o label em português para cada status de ticket.
 */
export function labelStatus(status: string): string {
  const map: Record<string, string> = {
    ABERTO: "Em Aberto",
    EM_ANALISE: "Em Análise",
    ACEITO: "Aceito",
    RECUSADO: "Recusado",
    FINALIZADO: "Finalizado",
  };
  return map[status] ?? status;
}

/**
 * Retorna o label em português para cada tipo de solicitação.
 */
export function labelTipo(tipo: string): string {
  const map: Record<string, string> = {
    TRANSMISSAO_EXTERNA: "Transmissão Externa",
    MINI_AUDITORIO: "Mini Auditório",
  };
  return map[tipo] ?? tipo;
}

/**
 * Verifica se dois intervalos de tempo se sobrepõem.
 */
export function temConflito(
  inicio1: Date,
  fim1: Date,
  inicio2: Date,
  fim2: Date
): boolean {
  return inicio1 < fim2 && fim1 > inicio2;
}

/**
 * Substitui variáveis em templates de e-mail.
 * Variáveis no formato {nome_variavel}.
 */
export function renderizarTemplate(
  template: string,
  variaveis: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => variaveis[key] ?? `{${key}}`);
}

/**
 * Gera um Message-ID único para threading de e-mail.
 */
export function gerarMessageId(codigoTicket: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `<${codigoTicket}-${timestamp}-${random}@agenda-multiweb.ufsm.br>`;
}

export interface DiasAgendamentoItem {
  dataInicio: string;
  dataFim: string;
}

export interface ParsedAnexosLinks {
  linkOriginal: string | null;
  diasAgendamento: DiasAgendamentoItem[] | null;
}

/**
 * Faz a leitura segura do campo anexosLinks.
 * Se for JSON armazenando múltiplos dias e/ou um link original, desestrutura os campos.
 * Se for apenas uma string simples de link, retorna linkOriginal.
 */
export function parseAnexosLinks(str?: string | null): ParsedAnexosLinks {
  if (!str) return { linkOriginal: null, diasAgendamento: null };
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        linkOriginal: typeof parsed.linkOriginal === "string" ? parsed.linkOriginal : null,
        diasAgendamento: Array.isArray(parsed.diasAgendamento) ? parsed.diasAgendamento : null,
      };
    }
  } catch {
    // String simples
  }
  return { linkOriginal: str, diasAgendamento: null };
}

/**
 * Gera o link para criar evento diretamente no Google Calendar do solicitante em uma nova aba.
 * Utiliza o endpoint oficial r/eventedit do Google Calendar com parâmetros pré-preenchidos.
 */
export function gerarGoogleCalendarUrl(params: {
  titulo: string;
  descricao?: string | null;
  local: string;
  dataInicio: Date | string;
  dataFim: Date | string;
  diasAgendamento?: DiasAgendamentoItem[] | null;
}): string {
  const dInicio = typeof params.dataInicio === "string" ? new Date(params.dataInicio) : params.dataInicio;
  const dFim = typeof params.dataFim === "string" ? new Date(params.dataFim) : params.dataFim;

  const formatUtc = (d: Date) => {
    if (isNaN(d.getTime())) return "";
    return d.toISOString().replace(/-|:|\.\d{3}/g, "");
  };

  const startStr = formatUtc(dInicio);
  const endStr = formatUtc(dFim);

  // Limpa o texto da descrição
  const descLimpa = (
    params.descricao
      ? params.descricao.replace(/🗓 CRONOGRAMA DE MÚLTIPLOS DIAS:[\s\S]*?(?=\n\n|$)/g, "").trim()
      : ""
  );

  let detalhesTexto = descLimpa;

  if (params.diasAgendamento && params.diasAgendamento.length > 0) {
    const cronogramaLinhas = params.diasAgendamento.map((d, i) => {
      const dtIni = new Date(d.dataInicio);
      const dtFim = new Date(d.dataFim);
      const dataStr = dtIni.toLocaleDateString("pt-BR");
      const horaIniStr = dtIni.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const horaFimStr = dtFim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      return `• Dia ${i + 1} (${dataStr}): ${horaIniStr} às ${horaFimStr}`;
    });

    detalhesTexto = `🗓 CRONOGRAMA DETALHADO DO EVENTO (${params.diasAgendamento.length} DIAS):\n${cronogramaLinhas.join("\n")}${descLimpa ? `\n\nObservações:\n${descLimpa}` : ""}`;
  }

  const query = new URLSearchParams({
    text: params.titulo,
    dates: `${startStr}/${endStr}`,
    details: detalhesTexto,
    location: params.local,
  });

  return `https://calendar.google.com/calendar/r/eventedit?${query.toString()}`;
}

