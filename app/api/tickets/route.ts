import { prisma } from "@/lib/prisma";
import { gerarCodigoTicket, formatarData, labelTipo } from "@/lib/utils";
import { enviarConfirmacaoTicket, enviarNotificacaoEquipe } from "@/lib/email";
import { z } from "zod";

const schemaTicket = z.object({
  tipo: z.enum(["TRANSMISSAO_EXTERNA", "MINI_AUDITORIO"]),
  nomeSolicitante: z.string().min(3, "Nome inválido"),
  emailSolicitante: z.string().email("E-mail inválido"),
  tituloEvento: z.string().min(3, "Título inválido"),
  descricao: z.string().optional(),
  dataInicio: z.string().datetime({ offset: true }),
  dataFim: z.string().datetime({ offset: true }),
  local: z.string().min(3, "Local inválido"),
  anexosLinks: z.string().optional(),
});

// POST /api/tickets — criar novo ticket (rota pública)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const dados = schemaTicket.parse(body);

    // Validar que dataFim > dataInicio
    if (new Date(dados.dataFim) <= new Date(dados.dataInicio)) {
      return Response.json(
        { erro: "A data/hora de fim deve ser posterior ao início" },
        { status: 400 }
      );
    }

    // Verificar antecedência mínima configurada no sistema (padrão 48 horas)
    const cfgAntecedencia = await prisma.configuracao.findUnique({
      where: { chave: "antecedencia_minima_horas" },
    });
    const horasMinimas = parseInt(cfgAntecedencia?.valor ?? "48");
    if (horasMinimas > 0) {
      const dataMinima = new Date(Date.now() + horasMinimas * 3600 * 1000);
      if (new Date(dados.dataInicio) < dataMinima) {
        return Response.json(
          { erro: `As solicitações de evento exigem antecedência mínima de ${horasMinimas} horas.` },
          { status: 400 }
        );
      }
    }

    // Mini Auditório sempre no Prédio 14, Sala 109
    const local =
      dados.tipo === "MINI_AUDITORIO"
        ? "Prédio 14, Sala 109 – CTE/UFSM"
        : dados.local;

    // Gerar código único (tentar até 5 vezes em caso de colisão improvável)
    let codigo = "";
    for (let i = 0; i < 5; i++) {
      const candidato = gerarCodigoTicket();
      const existe = await prisma.ticket.findUnique({ where: { codigo: candidato } });
      if (!existe) { codigo = candidato; break; }
    }

    if (!codigo) throw new Error("Não foi possível gerar código único");

    const ticket = await prisma.ticket.create({
      data: {
        codigo,
        tipo: dados.tipo,
        nomeSolicitante: dados.nomeSolicitante,
        emailSolicitante: dados.emailSolicitante,
        tituloEvento: dados.tituloEvento,
        descricao: dados.descricao,
        dataInicio: new Date(dados.dataInicio),
        dataFim: new Date(dados.dataFim),
        local,
        anexosLinks: dados.anexosLinks,
        status: "ABERTO",
      },
    });

    // Registrar mensagem automática de abertura no histórico
    await prisma.historicoAcao.create({
      data: {
        ticketId: ticket.id,
        nomeUsuario: "Sistema",
        acao: "Ticket aberto pelo solicitante",
      },
    });

    // Tentar enviar e-mail de confirmação (silenciosamente em caso de erro de SMTP)
    let emailMessageId: string | null = null;
    try {
      emailMessageId = await enviarConfirmacaoTicket({
        para: ticket.emailSolicitante,
        nome: ticket.nomeSolicitante,
        codigo: ticket.codigo,
        titulo: ticket.tituloEvento,
        dataInicio: formatarData(ticket.dataInicio),
        dataFim: formatarData(ticket.dataFim),
        local: ticket.local,
        tipo: labelTipo(ticket.tipo),
      });

      // Salvar o Message-ID para threading futuro
      if (emailMessageId) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { emailMessageId },
        });
      }
      // Notificar a equipe CTE por e-mail sobre o novo agendamento
      await enviarNotificacaoEquipe({
        codigo: ticket.codigo,
        nomeSolicitante: ticket.nomeSolicitante,
        emailSolicitante: ticket.emailSolicitante,
        titulo: ticket.tituloEvento,
        dataInicio: formatarData(ticket.dataInicio),
        dataFim: formatarData(ticket.dataFim),
        local: ticket.local,
        tipo: labelTipo(ticket.tipo),
      });
    } catch (emailErr) {
      console.error("[Email] Erro ao enviar confirmação/notificação:", emailErr);
    }

    return Response.json(
      {
        sucesso: true,
        codigo: ticket.codigo,
        mensagem: "Solicitação enviada com sucesso! Guarde o código para acompanhar.",
        emailEnviado: emailMessageId !== null,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json(
        { erro: "Dados inválidos", detalhes: err.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/tickets]", err);
    return Response.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

// GET /api/tickets — listar tickets (requer autenticação, verificada no proxy)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const tipo = searchParams.get("tipo");
  const pagina = parseInt(searchParams.get("pagina") ?? "1");
  const porPagina = 20;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (tipo) where.tipo = tipo;

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      select: {
        id: true,
        codigo: true,
        tipo: true,
        status: true,
        nomeSolicitante: true,
        emailSolicitante: true,
        tituloEvento: true,
        dataInicio: true,
        dataFim: true,
        local: true,
        criadoEm: true,
        _count: { select: { mensagens: { where: { lida: false, tipoAutor: "SOLICITANTE" } } } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  return Response.json({
    tickets,
    paginacao: {
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
    },
  });
}
