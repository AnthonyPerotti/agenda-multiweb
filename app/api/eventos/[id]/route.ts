import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { atualizarEventoGoogle, removerEventoGoogle } from "@/lib/google-calendar";
import { z } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

// PATCH /api/eventos/[id] — editar evento
export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const schema = z.object({
    titulo: z.string().min(3).optional(),
    descricao: z.string().optional(),
    dataInicio: z.string().datetime({ offset: true }).optional(),
    dataFim: z.string().datetime({ offset: true }).optional(),
    local: z.string().min(3).optional(),
    responsaveisIds: z.array(z.string()).optional(),
  });

  const dados = schema.parse(body);

  const evento = await prisma.evento.findUnique({ where: { id } });
  if (!evento) return Response.json({ erro: "Evento não encontrado" }, { status: 404 });

  const eventoAtualizado = await prisma.evento.update({
    where: { id },
    data: {
      ...(dados.titulo ? { titulo: dados.titulo } : {}),
      ...(dados.descricao !== undefined ? { descricao: dados.descricao } : {}),
      ...(dados.dataInicio ? { dataInicio: new Date(dados.dataInicio) } : {}),
      ...(dados.dataFim ? { dataFim: new Date(dados.dataFim) } : {}),
      ...(dados.local ? { local: dados.local } : {}),
      ...(dados.responsaveisIds !== undefined
        ? {
            responsaveis: {
              deleteMany: {},
              create: dados.responsaveisIds.map((uid) => ({ usuarioId: uid })),
            },
          }
        : {}),
    },
    include: { responsaveis: { include: { usuario: { select: { id: true, nome: true } } } } },
  });

  // Sincronizar com Google Calendar
  if (evento.googleEventId) {
    await atualizarEventoGoogle(evento.googleEventId, {
      titulo: dados.titulo,
      descricao: dados.descricao,
      local: dados.local,
      dataInicio: dados.dataInicio ? new Date(dados.dataInicio) : undefined,
      dataFim: dados.dataFim ? new Date(dados.dataFim) : undefined,
    });
  }

  // Registrar no histórico do ticket vinculado
  if (evento.ticketId) {
    await prisma.historicoAcao.create({
      data: {
        ticketId: evento.ticketId,
        usuarioId: session.user.id,
        nomeUsuario: session.user.name ?? "Equipe CTE",
        acao: "Evento na agenda atualizado",
        detalhes: JSON.stringify(dados),
      },
    });
  }

  return Response.json({ sucesso: true, evento: eventoAtualizado });
}

// DELETE /api/eventos/[id] — remover evento
export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const evento = await prisma.evento.findUnique({ where: { id } });
  if (!evento) return Response.json({ erro: "Evento não encontrado" }, { status: 404 });

  // Remover do Google Calendar
  if (evento.googleEventId) {
    await removerEventoGoogle(evento.googleEventId);
  }

  await prisma.evento.delete({ where: { id } });

  return Response.json({ sucesso: true });
}
