import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/tickets/[id]/detalhes — buscar ticket completo por ID (equipe)
export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      mensagens: {
        orderBy: { criadoEm: "asc" },
        include: {
          usuario: { select: { id: true, nome: true } },
        },
      },
      historico: {
        orderBy: { criadoEm: "asc" },
      },
      eventos: {
        select: { id: true, googleEventId: true },
      },
    },
  });

  if (!ticket) return Response.json({ erro: "Ticket não encontrado" }, { status: 404 });

  return Response.json({ ticket });
}
