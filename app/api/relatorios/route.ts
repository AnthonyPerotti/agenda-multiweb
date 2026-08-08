import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/relatorios — retorna métricas e relatórios estatísticos da CTE
export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  try {
    const [totalTickets, totalEventos, aceitos, recusados, abertos, finalizados, tickets] = await Promise.all([
      prisma.ticket.count(),
      prisma.evento.count(),
      prisma.ticket.count({ where: { status: "ACEITO" } }),
      prisma.ticket.count({ where: { status: "RECUSADO" } }),
      prisma.ticket.count({ where: { status: "ABERTO" } }),
      prisma.ticket.count({ where: { status: "FINALIZADO" } }),
      prisma.ticket.findMany({
        select: {
          tipo: true,
          status: true,
          criadoEm: true,
        },
      }),
    ]);

    // Contagem por tipo de evento
    const porTipo: Record<string, number> = {
      TRANSMISSAO_EXTERNA: 0,
      MINI_AUDITORIO: 0,
    };
    for (const t of tickets) {
      porTipo[t.tipo] = (porTipo[t.tipo] ?? 0) + 1;
    }

    // Contagem por mês nos últimos 6 meses
    const mesesMap: Record<string, number> = {};
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const chave = `${d.toLocaleString("pt-BR", { month: "short" })}/${d.getFullYear().toString().substring(2)}`;
      mesesMap[chave] = 0;
    }

    for (const t of tickets) {
      const d = new Date(t.criadoEm);
      const chave = `${d.toLocaleString("pt-BR", { month: "short" })}/${d.getFullYear().toString().substring(2)}`;
      if (chave in mesesMap) {
        mesesMap[chave]++;
      }
    }

    const taxaAprovacao = totalTickets > 0 ? Math.round(((aceitos + finalizados) / totalTickets) * 100) : 0;

    return Response.json({
      resumo: {
        totalTickets,
        totalEventos,
        aceitos,
        recusados,
        abertos,
        finalizados,
        taxaAprovacao,
      },
      porTipo,
      evolucaoMensal: Object.entries(mesesMap).map(([mes, qtd]) => ({ mes, qtd })),
    });
  } catch (err) {
    console.error("[Relatórios Erro]", err);
    return Response.json({ erro: "Erro ao gerar estatísticas" }, { status: 500 });
  }
}
