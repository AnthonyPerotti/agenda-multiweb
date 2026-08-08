import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

// GET /api/configuracoes/gerenciar-tickets — lista todos os códigos/tickets cadastrados
export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const tickets = await prisma.ticket.findMany({
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      codigo: true,
      tituloEvento: true,
      nomeSolicitante: true,
      emailSolicitante: true,
      status: true,
      tipo: true,
      arquivado: true,
      criadoEm: true,
    },
  });

  return Response.json({ tickets });
}

// POST /api/configuracoes/gerenciar-tickets — executa ação em lote (arquivar, desarquivar ou excluir)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await request.json();

  const schema = z.object({
    acao: z.enum(["arquivar", "desarquivar", "excluir"]),
    ids: z.array(z.string()).min(1, "Selecione ao menos um ticket"),
  });

  const { acao, ids } = schema.parse(body);

  if (acao === "arquivar") {
    await prisma.ticket.updateMany({
      where: { id: { in: ids } },
      data: { arquivado: true },
    });
    return Response.json({ mensagem: `${ids.length} ticket(s) arquivado(s) com sucesso.` });
  }

  if (acao === "desarquivar") {
    await prisma.ticket.updateMany({
      where: { id: { in: ids } },
      data: { arquivado: false },
    });
    return Response.json({ mensagem: `${ids.length} ticket(s) desarquivado(s) com sucesso.` });
  }

  if (acao === "excluir") {
    // Exclui eventos vinculados primeiro
    await prisma.evento.deleteMany({
      where: { ticketId: { in: ids } },
    });

    // Exclui os tickets (mensagens e historico são deletados via onDelete: Cascade)
    await prisma.ticket.deleteMany({
      where: { id: { in: ids } },
    });

    return Response.json({ mensagem: `${ids.length} ticket(s) excluído(s) permanentemente.` });
  }

  return Response.json({ erro: "Ação inválida" }, { status: 400 });
}
