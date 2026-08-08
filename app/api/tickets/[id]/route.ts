import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { enviarAtualizacaoStatus } from "@/lib/email";
import { criarEventoGoogle } from "@/lib/google-calendar";
import { z } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

// PATCH /api/tickets/[id] — atualizar status do ticket
export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const schema = z.object({
    status: z.enum(["ABERTO", "EM_ANALISE", "ACEITO", "RECUSADO", "FINALIZADO"]).optional(),
    mensagemEquipe: z.string().optional(),
  });

  const dados = schema.parse(body);

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return Response.json({ erro: "Ticket não encontrado" }, { status: 404 });

  const ticketAtualizado = await prisma.ticket.update({
    where: { id },
    data: { ...(dados.status ? { status: dados.status } : {}) },
  });

  // Se o status for alterado para ACEITO, garantir que os eventos sejam criados na agenda
  if (dados.status === "ACEITO") {
    const eventosExistentes = await prisma.evento.findMany({ where: { ticketId: id } });
    if (eventosExistentes.length === 0) {
      let diasParaCriar = [{ dataInicio: ticket.dataInicio, dataFim: ticket.dataFim }];
      if (ticket.anexosLinks) {
        try {
          const parsedMeta = JSON.parse(ticket.anexosLinks);
          if (Array.isArray(parsedMeta.diasAgendamento) && parsedMeta.diasAgendamento.length > 0) {
            diasParaCriar = parsedMeta.diasAgendamento.map((d: { dataInicio: string; dataFim: string }) => ({
              dataInicio: new Date(d.dataInicio),
              dataFim: new Date(d.dataFim),
            }));
          }
        } catch {
          // anexosLinks é um link/texto comum
        }
      }

      for (const item of diasParaCriar) {
        await prisma.evento.create({
          data: {
            ticketId: ticket.id,
            titulo: ticket.tituloEvento,
            descricao: ticket.descricao,
            dataInicio: item.dataInicio,
            dataFim: item.dataFim,
            local: ticket.local,
            tipo: ticket.tipo,
          },
        });
      }
    }
  }

  // Registrar ação no histórico
  await prisma.historicoAcao.create({
    data: {
      ticketId: id,
      usuarioId: session.user.id,
      nomeUsuario: session.user.name ?? "Equipe CTE",
      acao: dados.status ? `Status alterado para ${dados.status}` : "Ticket atualizado",
    },
  });

  // Enviar e-mail de notificação ao solicitante
  if (dados.status && ticket.emailMessageId) {
    try {
      await enviarAtualizacaoStatus({
        para: ticket.emailSolicitante,
        nome: ticket.nomeSolicitante,
        codigo: ticket.codigo,
        titulo: ticket.tituloEvento,
        status: dados.status,
        mensagem: dados.mensagemEquipe,
        emailMessageIdOriginal: ticket.emailMessageId,
      });
    } catch (err) {
      console.error("[Email] Erro ao enviar atualização:", err);
    }
  }

  return Response.json({ sucesso: true, ticket: ticketAtualizado });
}
