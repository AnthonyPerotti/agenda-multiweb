import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { criarEventoGoogle, googleCalendarConfigurado } from "@/lib/google-calendar";
import { temConflito } from "@/lib/utils";
import { enviarAtualizacaoStatus } from "@/lib/email";

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/tickets/[id]/aceitar — aceitar ticket e criar evento na agenda
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { confirmarConflito = false, mensagemEquipe } = body;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { evento: true },
  });

  if (!ticket) return Response.json({ erro: "Ticket não encontrado" }, { status: 404 });
  if (ticket.status === "ACEITO") {
    return Response.json({ erro: "Este ticket já foi aceito" }, { status: 400 });
  }

  // Verificar conflitos de horário na agenda
  const eventosConflitantes = await prisma.evento.findMany({
    where: {
      OR: [
        {
          dataInicio: { lt: ticket.dataFim },
          dataFim: { gt: ticket.dataInicio },
        },
      ],
    },
    select: {
      id: true,
      titulo: true,
      dataInicio: true,
      dataFim: true,
      local: true,
      tipo: true,
    },
  });

  // Se há conflitos E o usuário não confirmou, retornar aviso (não bloquear)
  if (eventosConflitantes.length > 0 && !confirmarConflito) {
    return Response.json(
      {
        conflito: true,
        mensagem: `Atenção: Já existe(m) ${eventosConflitantes.length} evento(s) neste horário. Deseja prosseguir e aceitar o ticket assim mesmo?`,
        eventosConflitantes,
      },
      { status: 409 }
    );
  }

  // Criar o evento na agenda local
  const evento = await prisma.evento.create({
    data: {
      ticketId: ticket.id,
      titulo: ticket.tituloEvento,
      descricao: ticket.descricao,
      dataInicio: ticket.dataInicio,
      dataFim: ticket.dataFim,
      local: ticket.local,
      tipo: ticket.tipo,
    },
  });

  // Tentar sincronizar com Google Calendar
  let googleEventId: string | null = null;
  if (await googleCalendarConfigurado()) {
    googleEventId = await criarEventoGoogle({
      titulo: ticket.tituloEvento,
      descricao: ticket.descricao ?? undefined,
      local: ticket.local,
      dataInicio: ticket.dataInicio,
      dataFim: ticket.dataFim,
      codigoTicket: ticket.codigo,
    });

    if (googleEventId) {
      await prisma.evento.update({
        where: { id: evento.id },
        data: { googleEventId },
      });
    }
  }

  // Atualizar status do ticket
  await prisma.ticket.update({
    where: { id },
    data: { status: "ACEITO" },
  });

  // Registrar ação no histórico
  await prisma.historicoAcao.create({
    data: {
      ticketId: id,
      usuarioId: session.user.id,
      nomeUsuario: session.user.name ?? "Equipe CTE",
      acao: "Ticket aceito e evento criado na agenda",
      detalhes: JSON.stringify({
        eventoId: evento.id,
        googleEventId,
        conflitosIgnorados: confirmarConflito ? eventosConflitantes.length : 0,
      }),
    },
  });

  // Enviar e-mail de aceite ao solicitante
  if (ticket.emailMessageId) {
    try {
      await enviarAtualizacaoStatus({
        para: ticket.emailSolicitante,
        nome: ticket.nomeSolicitante,
        codigo: ticket.codigo,
        titulo: ticket.tituloEvento,
        status: "ACEITO",
        mensagem: mensagemEquipe,
        emailMessageIdOriginal: ticket.emailMessageId,
      });
    } catch (err) {
      console.error("[Email] Erro ao enviar aceite:", err);
    }
  }

  return Response.json({
    sucesso: true,
    evento,
    googleSincronizado: googleEventId !== null,
    conflitosIgnorados: confirmarConflito && eventosConflitantes.length > 0,
  });
}
