import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/email";
import { formatarData } from "@/lib/utils";

// GET /api/cron/lembretes — rota de verificação e disparo de lembretes automáticos pré-evento
export async function GET() {
  try {
    const [cfgLembretesAtivos, cfgHoras1, cfgHoras2] = await Promise.all([
      prisma.configuracao.findUnique({ where: { chave: "lembretes_ativos" } }),
      prisma.configuracao.findUnique({ where: { chave: "lembrete_horas_1" } }),
      prisma.configuracao.findUnique({ where: { chave: "lembrete_horas_2" } }),
    ]);

    if (cfgLembretesAtivos?.valor === "false") {
      return Response.json({ mensagem: "Lembretes automáticos desativados." });
    }

    const horas1 = parseInt(cfgHoras1?.valor ?? "24");
    const horas2 = parseInt(cfgHoras2?.valor ?? "2");

    if (horas1 <= 0 && horas2 <= 0) {
      return Response.json({ mensagem: "Nenhum lembrete com prazo ativo." });
    }

    const agora = new Date();
    const prazosValidos = [horas1, horas2].filter((h) => h > 0);
    const maiorPrazo = Math.max(...prazosValidos, 24);
    const limiteFuturo = new Date(agora.getTime() + (maiorPrazo + 24) * 3600 * 1000);

    // Buscar eventos nos próximos dias
    const eventosProximos = await prisma.evento.findMany({
      where: {
        dataInicio: {
          gte: agora,
          lte: limiteFuturo,
        },
      },
      include: {
        ticket: true,
      },
    });

    let lembretesEnviados = 0;

    for (const ev of eventosProximos) {
      if (!ev.ticket?.emailSolicitante) continue;

      const diffHoras = (new Date(ev.dataInicio).getTime() - agora.getTime()) / (3600 * 1000);

      // Lembrete 1 só dispara se horas1 > 0
      const naJanela1 = horas1 > 0 && diffHoras <= horas1 && diffHoras >= horas1 - 1;
      // Lembrete 2 só dispara se horas2 > 0
      const naJanela2 = horas2 > 0 && diffHoras <= horas2 && diffHoras >= horas2 - 0.5;

      if (naJanela1 || naJanela2) {
        try {
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
              <div style="background: #006633; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">⏰ Lembrete de Agendamento</h1>
                <p style="color: #a8d5b5; margin: 4px 0 0;">CTE – Coordenadoria de Tecnologia Educacional | UFSM</p>
              </div>
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #ddd;">
                <h2 style="color: #006633;">Seu evento acontece em breve!</h2>
                <p>Olá, <strong>${ev.ticket.nomeSolicitante}</strong>!</p>
                <p>Lembramos que o seu agendamento <strong>[${ev.ticket.codigo}] ${ev.titulo}</strong> está programado para:</p>
                <div style="background: white; border-left: 4px solid #006633; padding: 14px; margin: 16px 0;">
                  📅 <strong>Início:</strong> ${formatarData(ev.dataInicio)}<br>
                  📍 <strong>Local:</strong> ${ev.local}
                </div>
                <p style="color: #666; font-size: 13px;">Se precisar de suporte ou alteração, acesse a página do ticket ou entre em contato com a equipe CTE.</p>
              </div>
            </div>
          `;

          await enviarEmail({
            para: ev.ticket.emailSolicitante,
            assunto: `[Lembrete] Seu evento "${ev.titulo}" acontece em breve! - Agenda Multiweb`,
            html,
          });

          lembretesEnviados++;
        } catch (err) {
          console.error(`[Cron Lembretes Erro id=${ev.id}]`, err);
        }
      }
    }

    return Response.json({ sucesso: true, lembretesEnviados });
  } catch (err) {
    console.error("[Cron Lembretes Erro]", err);
    return Response.json({ erro: "Erro ao processar lembretes" }, { status: 500 });
  }
}
