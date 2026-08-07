import { auth } from "@/lib/auth";
import { enviarEmail } from "@/lib/email";
import { renderizarTemplate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

const LABELS: Record<string, string> = {
  template_confirmacao: "Confirmação de Abertura",
  template_notificacao_equipe: "Notificação Novo Ticket para a Equipe",
  template_aceite: "Aceite do Ticket",
  template_recusa: "Recusa do Ticket",
  template_mensagem: "Nova Mensagem no Chat",
};

// POST /api/configuracoes/testar-template — envia um e-mail de teste do template selecionado
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { chaveTemplate, htmlCustomizado, paraEmail } = body;

    if (!paraEmail || typeof paraEmail !== "string" || !paraEmail.includes("@")) {
      return Response.json(
        { sucesso: false, erro: "Informe um e-mail válido para receber o teste do template." },
        { status: 400 }
      );
    }

    if (!chaveTemplate || !LABELS[chaveTemplate]) {
      return Response.json(
        { sucesso: false, erro: "Template inválido selecionado." },
        { status: 400 }
      );
    }

    let html = htmlCustomizado?.trim();
    if (!html) {
      const cfg = await prisma.configuracao.findUnique({ where: { chave: chaveTemplate } });
      html = cfg?.valor;
    }

    if (!html) {
      return Response.json(
        { sucesso: false, erro: "O template não possui código HTML preenchido." },
        { status: 400 }
      );
    }

    const variaveisSimuladas: Record<string, string> = {
      nome_solicitante: "João da Silva",
      email_solicitante: "joao.silva@ufsm.br",
      codigo_ticket: "MW-98765",
      titulo_evento: "Evento de Teste – Transmissão Especial",
      data_inicio: "15/08/2026 às 14:00",
      data_fim: "15/08/2026 às 17:00",
      local: "Auditório Central – UFSM",
      tipo: "Transmissão Externa",
      mensagem_equipe: `<div style="background: #e8f5e9; border-left: 4px solid #28a745; padding: 12px; margin: 16px 0;"><strong>Mensagem da Equipe:</strong> Sua solicitação foi aprovada pela equipe CTE. Estaremos no local com 30 minutos de antecedência.</div>`,
      conteudo_mensagem: "Olá! Confirmamos o recebimento de todas as informações necessárias para o agendamento.",
      link_ticket: "https://agenda.cte.edu/consultar?codigo=MW-98765",
    };

    const htmlRenderizado = renderizarTemplate(html, variaveisSimuladas);
    const labelTemplate = LABELS[chaveTemplate] || "Template";

    await enviarEmail({
      para: paraEmail.trim(),
      assunto: `[Teste de Template] ${labelTemplate} - Agenda Multiweb`,
      html: htmlRenderizado,
    });

    return Response.json({
      sucesso: true,
      mensagem: `E-mail de teste do template "${labelTemplate}" enviado com sucesso para ${paraEmail}! 🚀`,
    });
  } catch (err) {
    const msg = (err as Error).message || "Erro ao enviar e-mail de teste";
    console.error("[Testar Template] Erro:", err);
    return Response.json({
      sucesso: false,
      erro: `Falha ao enviar e-mail de teste: ${msg}. Verifique as configurações SMTP.`,
    });
  }
}
