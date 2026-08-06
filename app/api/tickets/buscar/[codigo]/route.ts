import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface Params {
  params: Promise<{ codigo: string }>;
}

// GET /api/tickets/buscar/[codigo] — consultar ticket por código (público)
export async function GET(_request: Request, { params }: Params) {
  const { codigo } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { codigo: codigo.toUpperCase() },
    select: {
      id: true,
      codigo: true,
      tipo: true,
      status: true,
      nomeSolicitante: true,
      tituloEvento: true,
      descricao: true,
      dataInicio: true,
      dataFim: true,
      local: true,
      criadoEm: true,
      mensagens: {
        orderBy: { criadoEm: "asc" },
        select: {
          id: true,
          nomeAutor: true,
          tipoAutor: true,
          conteudo: true,
          criadoEm: true,
        },
      },
      historico: {
        where: { acao: { not: { startsWith: "interno" } } },
        orderBy: { criadoEm: "asc" },
        select: {
          id: true,
          nomeUsuario: true,
          acao: true,
          criadoEm: true,
        },
      },
    },
  });

  if (!ticket) {
    return Response.json(
      { erro: "Código de rastreamento não encontrado. Verifique o código e tente novamente." },
      { status: 404 }
    );
  }

  // Marcar mensagens da equipe como lidas quando o solicitante consulta
  await prisma.mensagem.updateMany({
    where: { ticketId: ticket.id, tipoAutor: "EQUIPE", lida: false },
    data: { lida: true },
  });

  return Response.json({ ticket });
}

// POST /api/tickets/buscar/[codigo] — solicitante envia mensagem (público)
const schemaMensagem = z.object({
  conteudo: z.string().min(1, "Mensagem não pode estar vazia").max(2000),
  nomeAutor: z.string().min(2),
});

export async function POST(request: Request, { params }: Params) {
  const { codigo } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { codigo: codigo.toUpperCase() },
    select: {
      id: true,
      codigo: true,
      tituloEvento: true,
      nomeSolicitante: true,
      emailSolicitante: true,
      status: true,
      emailMessageId: true,
    },
  });

  if (!ticket) {
    return Response.json({ erro: "Ticket não encontrado" }, { status: 404 });
  }

  if (ticket.status === "FINALIZADO" || ticket.status === "RECUSADO") {
    return Response.json(
      { erro: "Este ticket está encerrado e não aceita mais mensagens." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const dados = schemaMensagem.parse(body);

  const mensagem = await prisma.mensagem.create({
    data: {
      ticketId: ticket.id,
      nomeAutor: dados.nomeAutor,
      tipoAutor: "SOLICITANTE",
      conteudo: dados.conteudo,
      lida: false,
    },
  });

  return Response.json({ sucesso: true, mensagem }, { status: 201 });
}
