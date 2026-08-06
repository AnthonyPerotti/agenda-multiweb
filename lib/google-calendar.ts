import { google } from "googleapis";
import { prisma } from "./prisma";

/**
 * Busca as credenciais do Google Calendar configuradas no banco.
 */
async function getGoogleConfig(): Promise<{
  calendarId: string;
  credentials: Record<string, unknown>;
} | null> {
  const [calendarIdCfg, credentialsCfg] = await Promise.all([
    prisma.configuracao.findUnique({ where: { chave: "google_calendar_id" } }),
    prisma.configuracao.findUnique({ where: { chave: "google_credentials" } }),
  ]);

  if (!calendarIdCfg?.valor || !credentialsCfg?.valor) return null;

  try {
    return {
      calendarId: calendarIdCfg.valor,
      credentials: JSON.parse(credentialsCfg.valor),
    };
  } catch {
    return null;
  }
}

/**
 * Cria um cliente autenticado para a Google Calendar API via Service Account.
 */
async function getCalendarClient() {
  const config = await getGoogleConfig();
  if (!config) throw new Error("Google Calendar não configurado");

  const auth = new google.auth.GoogleAuth({
    credentials: config.credentials,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return { calendar: google.calendar({ version: "v3", auth }), calendarId: config.calendarId };
}

export interface GoogleEventData {
  titulo: string;
  descricao?: string;
  local: string;
  dataInicio: Date;
  dataFim: Date;
  codigoTicket?: string;
}

/**
 * Cria um evento no Google Calendar e retorna o ID do evento criado.
 */
export async function criarEventoGoogle(data: GoogleEventData): Promise<string | null> {
  try {
    const { calendar, calendarId } = await getCalendarClient();

    const evento = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: data.titulo,
        description: data.descricao
          ? `${data.descricao}${data.codigoTicket ? `\n\nTicket: ${data.codigoTicket}` : ""}`
          : data.codigoTicket
            ? `Ticket: ${data.codigoTicket}`
            : undefined,
        location: data.local,
        start: {
          dateTime: data.dataInicio.toISOString(),
          timeZone: "America/Sao_Paulo",
        },
        end: {
          dateTime: data.dataFim.toISOString(),
          timeZone: "America/Sao_Paulo",
        },
        colorId: data.codigoTicket ? "2" : "1", // Verde para eventos de ticket
      },
    });

    return evento.data.id ?? null;
  } catch (err) {
    console.error("[Google Calendar] Erro ao criar evento:", err);
    return null;
  }
}

/**
 * Atualiza um evento existente no Google Calendar.
 */
export async function atualizarEventoGoogle(
  googleEventId: string,
  data: Partial<GoogleEventData>
): Promise<boolean> {
  try {
    const { calendar, calendarId } = await getCalendarClient();

    const requestBody: Record<string, unknown> = {};
    if (data.titulo) requestBody.summary = data.titulo;
    if (data.descricao !== undefined) requestBody.description = data.descricao;
    if (data.local) requestBody.location = data.local;
    if (data.dataInicio) {
      requestBody.start = {
        dateTime: data.dataInicio.toISOString(),
        timeZone: "America/Sao_Paulo",
      };
    }
    if (data.dataFim) {
      requestBody.end = {
        dateTime: data.dataFim.toISOString(),
        timeZone: "America/Sao_Paulo",
      };
    }

    await calendar.events.patch({ calendarId, eventId: googleEventId, requestBody });
    return true;
  } catch (err) {
    console.error("[Google Calendar] Erro ao atualizar evento:", err);
    return false;
  }
}

/**
 * Remove um evento do Google Calendar.
 */
export async function removerEventoGoogle(googleEventId: string): Promise<boolean> {
  try {
    const { calendar, calendarId } = await getCalendarClient();
    await calendar.events.delete({ calendarId, eventId: googleEventId });
    return true;
  } catch (err) {
    console.error("[Google Calendar] Erro ao remover evento:", err);
    return false;
  }
}

/**
 * Verifica se a integração Google Calendar está configurada.
 */
export async function googleCalendarConfigurado(): Promise<boolean> {
  const config = await getGoogleConfig();
  return config !== null;
}
