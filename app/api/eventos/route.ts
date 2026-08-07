import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { atualizarEventoGoogle, removerEventoGoogle } from "@/lib/google-calendar";
import { z } from "zod";

// GET /api/eventos — listar eventos da agenda
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const inicio = searchParams.get("inicio");
  const fim = searchParams.get("fim");
  const tipo = searchParams.get("tipo");

  const where: Record<string, unknown> = {};
  if (tipo) where.tipo = tipo;
  if (inicio && fim) {
    where.dataInicio = { lt: new Date(fim) };
    where.dataFim = { gt: new Date(inicio) };
  }

  const eventos = await prisma.evento.findMany({
    where,
    orderBy: { dataInicio: "asc" },
    include: {
      ticket: { select: { codigo: true, nomeSolicitante: true, emailSolicitante: true } },
      responsaveis: { include: { usuario: { select: { id: true, nome: true } } } },
    },
  });

  return Response.json({ eventos });
}

// POST /api/eventos — criar evento manual (sem ticket)
const schemaEvento = z.object({
  titulo: z.string().min(3),
  descricao: z.string().optional(),
  dataInicio: z.string().datetime({ offset: true }),
  dataFim: z.string().datetime({ offset: true }),
  local: z.string().min(3),
  tipo: z.enum(["TRANSMISSAO_EXTERNA", "MINI_AUDITORIO"]),
  responsaveisIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await request.json();
  const dados = schemaEvento.parse(body);

  const evento = await prisma.evento.create({
    data: {
      titulo: dados.titulo,
      descricao: dados.descricao,
      dataInicio: new Date(dados.dataInicio),
      dataFim: new Date(dados.dataFim),
      local: dados.local,
      tipo: dados.tipo,
      ...(dados.responsaveisIds?.length
        ? {
            responsaveis: {
              create: dados.responsaveisIds.map((uid) => ({ usuarioId: uid })),
            },
          }
        : {}),
    },
    include: { responsaveis: { include: { usuario: { select: { id: true, nome: true } } } } },
  });

  return Response.json({ sucesso: true, evento }, { status: 201 });
}
