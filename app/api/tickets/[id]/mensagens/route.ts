import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { enviarNotificacaoMensagem } from "@/lib/email";
import { z } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/tickets/[id]/mensagens — listar mensagens do ticket (equipe)
export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const mensagens = await prisma.mensagem.findMany({
    where: { ticketId: id },
    orderBy: { criadoEm: "asc" },
  });

  // Marcar mensagens do solicitante como lidas quando a equipe acessa
  await prisma.mensagem.updateMany({
    where: { ticketId: id, tipoAutor: "SOLICITANTE", lida: false },
    data: { lida: true },
  });

  return Response.json({ mensagens });
}

// POST /api/tickets/[id]/mensagens — equipe envia mensagem
const schemaMensagem = z.object({
  conteudo: z.string().min(1).max(2000),
  notificarSolicitante: z.boolean().default(true),
});

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const dados = schemaMensagem.parse(body);

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: {
      id: true,
      codigo: true,
      tituloEvento: true,
      nomeSolicitante: true,
      emailSolicitante: true,
      emailMessageId: true,
    },
  });

  if (!ticket) return Response.json({ erro: "Ticket não encontrado" }, { status: 404 });

  const mensagem = await prisma.mensagem.create({
    data: {
      ticketId: ticket.id,
      usuarioId: session.user.id,
      nomeAutor: session.user.name ?? "Equipe CTE",
      tipoAutor: "EQUIPE",
      conteudo: dados.conteudo,
      lida: true, // Já lida pela equipe (quem enviou)
    },
  });

  // Enviar notificação por e-mail ao solicitante
  if (dados.notificarSolicitante && ticket.emailMessageId) {
    try {
      await enviarNotificacaoMensagem({
        para: ticket.emailSolicitante,
        nome: ticket.nomeSolicitante,
        codigo: ticket.codigo,
        titulo: ticket.tituloEvento,
        conteudoMensagem: dados.conteudo,
        emailMessageIdOriginal: ticket.emailMessageId,
      });
    } catch (err) {
      console.error("[Email] Erro ao enviar notificação de mensagem:", err);
    }
  }

  return Response.json({ sucesso: true, mensagem }, { status: 201 });
}
