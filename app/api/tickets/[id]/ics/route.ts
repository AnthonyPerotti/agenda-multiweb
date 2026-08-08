import { prisma } from "@/lib/prisma";
import { parseAnexosLinks } from "@/lib/utils";

interface Params {
  params: Promise<{ id: string }>;
}

function formatarDataICS(dt: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}Z`;
}

// GET /api/tickets/[id]/ics — baixa arquivo .ics para adicionar à agenda do solicitante
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;

  // Buscar por ID ou por código de ticket
  const ticket = await prisma.ticket.findFirst({
    where: {
      OR: [{ id }, { codigo: id.toUpperCase() }],
    },
  });

  if (!ticket) {
    return new Response("Ticket não encontrado", { status: 404 });
  }

  const parsedLinks = parseAnexosLinks(ticket.anexosLinks);
  const eventosICS: Array<{ start: Date; end: Date }> = [];

  if (parsedLinks.diasAgendamento && parsedLinks.diasAgendamento.length > 0) {
    for (const d of parsedLinks.diasAgendamento) {
      eventosICS.push({
        start: new Date(d.dataInicio),
        end: new Date(d.dataFim),
      });
    }
  } else {
    eventosICS.push({
      start: ticket.dataInicio,
      end: ticket.dataFim,
    });
  }

  const agoraICS = formatarDataICS(new Date());
  const vevents = eventosICS
    .map((ev, idx) => {
      const uid = `${ticket.codigo}-${idx + 1}@agenda.cte.edu`;
      return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${agoraICS}
DTSTART:${formatarDataICS(ev.start)}
DTEND:${formatarDataICS(ev.end)}
SUMMARY:[${ticket.codigo}] ${ticket.tituloEvento}
LOCATION:${ticket.local}
DESCRIPTION:Solicitação de Agendamento #${ticket.codigo}\\nSolicitante: ${ticket.nomeSolicitante}\\nStatus: ${ticket.status}\\nCTE - UFSM
STATUS:CONFIRMED
END:VEVENT`;
    })
    .join("\r\n");

  const content = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Agenda Multiweb CTE UFSM//PT-BR
CALSCALE:GREGORIAN
METHOD:PUBLISH
${vevents}
END:VCALENDAR`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="evento-${ticket.codigo}.ics"`,
    },
  });
}
