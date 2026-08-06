import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { enviarAtualizacaoStatus } from "@/lib/email";
import { criarEventoGoogle } from "@/lib/google-calendar";
import { temConflito } from "@/lib/utils";
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
