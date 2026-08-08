import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/email";
import { formatarData } from "@/lib/utils";

// GET /api/cron/lembretes — rota de verificação e disparo de lembretes automáticos pré-evento (Solicitante + Equipe)
export async function GET() {
  try {
    const [
      cfgSol1Ativo, cfgSol1Horas,
      cfgSol2Ativo, cfgSol2Horas,
      cfgEq1Ativo, cfgEq1Horas,
      cfgEq2Ativo, cfgEq2Horas,
      cfgLegacyAtivos, cfgLegacyH1, cfgLegacyH2,
      cfgEmailEquipe, cfgSmtpUser,
    ] = await Promise.all([
      prisma.configuracao.findUnique({ where: { chave: "lembrete_solicitante_1_ativo" } }),
      prisma.configuracao.findUnique({ where: { chave: "lembrete_solicitante_1_horas" } }),
      prisma.configuracao.findUnique({ where: { chave: "lembrete_solicitante_2_ativo" } }),
      prisma.configuracao.findUnique({ where: { chave: "lembrete_solicitante_2_horas" } }),
      prisma.configuracao.findUnique({ where: { chave: "lembrete_equipe_1_ativo" } }),
      prisma.configuracao.findUnique({ where: { chave: "lembrete_equipe_1_horas" } }),
      prisma.configuracao.findUnique({ where: { chave: "lembrete_equipe_2_ativo" } }),
      prisma.configuracao.findUnique({ where: { chave: "lembrete_equipe_2_horas" } }),
      prisma.configuracao.findUnique({ where: { chave: "lembretes_ativos" } }),
      prisma.configuracao.findUnique({ where: { chave: "lembrete_horas_1" } }),
      prisma.configuracao.findUnique({ where: { chave: "lembrete_horas_2" } }),
      prisma.configuracao.findUnique({ where: { chave: "email_notificacao_equipe" } }),
      prisma.configuracao.findUnique({ where: { chave: "smtp_user" } }),
    ]);

    const legacyGlobalAtivo = cfgLegacyAtivos?.valor !== "false";
    if (!legacyGlobalAtivo) {
      return Response.json({ mensagem: "Lembretes automáticos desativados globalmente." });
    }

    const sol1Ativo = (cfgSol1Ativo?.valor ?? "true") === "true";
    const sol1Horas = parseInt(cfgSol1Horas?.valor ?? cfgLegacyH1?.valor ?? "24");
    const sol2Ativo = (cfgSol2Ativo?.valor ?? "true") === "true";
    const sol2Horas = parseInt(cfgSol2Horas?.valor ?? cfgLegacyH2?.valor ?? "2");

    const eq1Ativo = (cfgEq1Ativo?.valor ?? "true") === "true";
    const eq1Horas = parseInt(cfgEq1Horas?.valor ?? "24");
    const eq2Ativo = (cfgEq2Ativo?.valor ?? "true") === "true";
    const eq2Horas = parseInt(cfgEq2Horas?.valor ?? "2");

    const emailEquipe = cfgEmailEquipe?.valor || cfgSmtpUser?.valor || "";

    const prazosValidos = [
      sol1Ativo ? sol1Horas : 0,
      sol2Ativo ? sol2Horas : 0,
      eq1Ativo ? eq1Horas : 0,
      eq2Ativo ? eq2Horas : 0,
    ].filter((h) => h > 0);

    if (prazosValidos.length === 0) {
      return Response.json({ mensagem: "Nenhum lembrete ativado nas configurações." });
    }

    const agora = new Date();
    const maiorPrazo = Math.max(...prazosValidos, 24);
    const limiteFuturo = new Date(agora.getTime() + (maiorPrazo + 24) * 3600 * 1000);

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
      if (!ev.ticket) continue;

      const diffHoras = (new Date(ev.dataInicio).getTime() - agora.getTime()) / (3600 * 1000);

      // Verificação para o Solicitante
      const sol1NoPrazo = sol1Ativo && sol1Horas > 0 && diffHoras <= sol1Horas && diffHoras >= sol1Horas - 1;
      const sol2NoPrazo = sol2Ativo && sol2Horas > 0 && diffHoras <= sol2Horas && diffHoras >= sol2Horas - 0.5;

      if ((sol1NoPrazo || sol2NoPrazo) && ev.ticket.emailSolicitante) {
        try {
          const htmlSolicitante = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
              <div style="background: #006633; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">⏰ Lembrete de Evento</h1>
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
            html: htmlSolicitante,
          });

          lembretesEnviados++;
        } catch (err) {
          console.error(`[Cron Lembretes Solicitante Erro id=${ev.id}]`, err);
        }
      }

      // Verificação para a Equipe CTE
      const eq1NoPrazo = eq1Ativo && eq1Horas > 0 && diffHoras <= eq1Horas && diffHoras >= eq1Horas - 1;
      const eq2NoPrazo = eq2Ativo && eq2Horas > 0 && diffHoras <= eq2Horas && diffHoras >= eq2Horas - 0.5;

      if ((eq1NoPrazo || eq2NoPrazo) && emailEquipe) {
        try {
          const htmlEquipe = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
              <div style="background: #1e293b; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px;">🔔 Lembrete para Equipe CTE</h1>
                <p style="color: #94a3b8; margin: 4px 0 0;">Agenda Multiweb – Notificação Interna</p>
              </div>
              <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
                <h2 style="color: #006633;">Evento Agendado Próximo!</h2>
                <p>Atenção equipe CTE, o evento <strong>[${ev.ticket.codigo}] ${ev.titulo}</strong> iniciará em breve.</p>
                <div style="background: white; border-left: 4px solid #006633; padding: 14px; margin: 16px 0;">
                  👤 <strong>Solicitante:</strong> ${ev.ticket.nomeSolicitante} (${ev.ticket.emailSolicitante})<br>
                  📅 <strong>Início:</strong> ${formatarData(ev.dataInicio)}<br>
                  📍 <strong>Local:</strong> ${ev.local}<br>
                  📡 <strong>Tipo:</strong> ${ev.tipo}
                </div>
              </div>
            </div>
          `;

          await enviarEmail({
            para: emailEquipe,
            assunto: `[Equipe CTE] Lembrete: Evento "${ev.titulo}" iniciará em breve!`,
            html: htmlEquipe,
          });

          lembretesEnviados++;
        } catch (err) {
          console.error(`[Cron Lembretes Equipe Erro id=${ev.id}]`, err);
        }
      }
    }

    return Response.json({ sucesso: true, lembretesEnviados });
  } catch (err) {
    console.error("[Cron Lembretes Erro]", err);
    return Response.json({ erro: "Erro ao processar lembretes" }, { status: 500 });
  }
}
