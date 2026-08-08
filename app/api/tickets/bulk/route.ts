import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/tickets/bulk — executar ações em massa em múltiplos tickets
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { ids, acao } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ erro: "Nenhum ticket selecionado" }, { status: 400 });
    }

    if (acao === "arquivar") {
      await prisma.ticket.updateMany({
        where: { id: { in: ids } },
        data: { arquivado: true },
      });
      return Response.json({ sucesso: true, mensagem: `${ids.length} ticket(s) arquivado(s) com sucesso.` });
    }

    if (acao === "desarquivar") {
      await prisma.ticket.updateMany({
        where: { id: { in: ids } },
        data: { arquivado: false },
      });
      return Response.json({ sucesso: true, mensagem: `${ids.length} ticket(s) desarquivado(s) com sucesso.` });
    }

    if (acao === "finalizar") {
      await prisma.ticket.updateMany({
        where: { id: { in: ids } },
        data: { status: "FINALIZADO" },
      });
      return Response.json({ sucesso: true, mensagem: `${ids.length} ticket(s) marcado(s) como finalizado(s).` });
    }

    if (acao === "excluir") {
      // Remover relacionamentos primeiro
      await prisma.historicoAcao.deleteMany({ where: { ticketId: { in: ids } } });
      await prisma.mensagem.deleteMany({ where: { ticketId: { in: ids } } });
      await prisma.evento.deleteMany({ where: { ticketId: { in: ids } } });
      await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
      return Response.json({ sucesso: true, mensagem: `${ids.length} ticket(s) excluído(s) permanentemente.` });
    }

    return Response.json({ erro: "Ação inválida" }, { status: 400 });
  } catch (err) {
    console.error("[Bulk Tickets Erro]", err);
    return Response.json({ erro: "Erro ao processar ação em massa" }, { status: 500 });
  }
}
