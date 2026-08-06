import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { renderizarTemplate, gerarMessageId } from "./utils";

/**
 * Busca as configurações SMTP do banco de dados.
 */
async function getSmtpConfig() {
  const chaves = [
    "smtp_host",
    "smtp_port",
    "smtp_secure",
    "smtp_user",
    "smtp_pass",
    "smtp_from_name",
    "smtp_from_email",
  ];
  const configs = await prisma.configuracao.findMany({
    where: { chave: { in: chaves } },
  });
  const map: Record<string, string> = {};
  for (const c of configs) map[c.chave] = c.valor;
  return map;
}

/**
 * Cria um transporter Nodemailer com as configurações do banco.
 */
async function criarTransporter() {
  const cfg = await getSmtpConfig();
  return nodemailer.createTransport({
    host: cfg.smtp_host || "smtp.gmail.com",
    port: parseInt(cfg.smtp_port || "587"),
    secure: cfg.smtp_secure === "true",
    auth: {
      user: cfg.smtp_user,
      pass: cfg.smtp_pass,
    },
  });
}

interface EnviarEmailOpts {
  para: string;
  assunto: string;
  html: string;
  inReplyTo?: string; // Message-ID do e-mail original (threading)
  references?: string; // Cadeia de Message-IDs
  messageId?: string; // Message-ID gerado para este e-mail
}

/**
 * Envia um e-mail e retorna o Message-ID enviado.
 */
export async function enviarEmail(opts: EnviarEmailOpts): Promise<string> {
  const cfg = await getSmtpConfig();
  const transporter = await criarTransporter();
  const fromName = cfg.smtp_from_name || "Agenda Multiweb - CTE/UFSM";
  const fromEmail = cfg.smtp_from_email || cfg.smtp_user;

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: opts.para,
    subject: opts.assunto,
    html: opts.html,
    messageId: opts.messageId,
    headers: {
      ...(opts.inReplyTo ? { "In-Reply-To": opts.inReplyTo } : {}),
      ...(opts.references ? { References: opts.references } : {}),
    },
  });

  return info.messageId;
}

/**
 * Busca um template do banco de dados pelo nome da chave.
 */
async function getTemplate(chave: string): Promise<string> {
  const config = await prisma.configuracao.findUnique({ where: { chave } });
  return config?.valor ?? templatePadrao[chave] ?? "";
}

/**
 * Envia e-mail de confirmação de abertura de ticket.
 * Retorna o Message-ID para uso em threads futuras.
 */
export async function enviarConfirmacaoTicket(params: {
  para: string;
  nome: string;
  codigo: string;
  titulo: string;
  dataInicio: string;
  dataFim: string;
  local: string;
  tipo: string;
}): Promise<string> {
  const siteUrl = await getSiteUrl();
  const linkTicket = `${siteUrl}/consultar?codigo=${params.codigo}`;
  const messageId = gerarMessageId(params.codigo);

  const template = await getTemplate("template_confirmacao");
  const html = renderizarTemplate(template, {
    nome_solicitante: params.nome,
    codigo_ticket: params.codigo,
    titulo_evento: params.titulo,
    data_inicio: params.dataInicio,
    data_fim: params.dataFim,
    local: params.local,
    tipo: params.tipo,
    link_ticket: linkTicket,
  });

  await enviarEmail({
    para: params.para,
    assunto: `[Agenda Multiweb #${params.codigo}] Solicitação recebida: ${params.titulo}`,
    html,
    messageId,
  });

  return messageId;
}

/**
 * Envia e-mail de atualização de status do ticket.
 * Usa threading para agrupar na mesma conversa.
 */
export async function enviarAtualizacaoStatus(params: {
  para: string;
  nome: string;
  codigo: string;
  titulo: string;
  status: string;
  mensagem?: string;
  emailMessageIdOriginal: string;
}) {
  const siteUrl = await getSiteUrl();
  const linkTicket = `${siteUrl}/consultar?codigo=${params.codigo}`;
  const novoMessageId = gerarMessageId(params.codigo);

  const chaveTemplate =
    params.status === "ACEITO"
      ? "template_aceite"
      : params.status === "RECUSADO"
        ? "template_recusa"
        : "template_mensagem";

  const template = await getTemplate(chaveTemplate);
  const html = renderizarTemplate(template, {
    nome_solicitante: params.nome,
    codigo_ticket: params.codigo,
    titulo_evento: params.titulo,
    status_evento: params.status,
    mensagem_equipe: params.mensagem ?? "",
    link_ticket: linkTicket,
  });

  const labelStatus: Record<string, string> = {
    EM_ANALISE: "Em Análise",
    ACEITO: "Aceito ✓",
    RECUSADO: "Recusado",
    FINALIZADO: "Finalizado",
  };

  await enviarEmail({
    para: params.para,
    assunto: `[Agenda Multiweb #${params.codigo}] ${labelStatus[params.status] ?? params.status}: ${params.titulo}`,
    html,
    messageId: novoMessageId,
    inReplyTo: params.emailMessageIdOriginal,
    references: params.emailMessageIdOriginal,
  });
}

/**
 * Envia e-mail de nova mensagem do chat.
 */
export async function enviarNotificacaoMensagem(params: {
  para: string;
  nome: string;
  codigo: string;
  titulo: string;
  conteudoMensagem: string;
  emailMessageIdOriginal: string;
}) {
  const siteUrl = await getSiteUrl();
  const linkTicket = `${siteUrl}/consultar?codigo=${params.codigo}`;
  const novoMessageId = gerarMessageId(params.codigo);

  const template = await getTemplate("template_mensagem");
  const html = renderizarTemplate(template, {
    nome_solicitante: params.nome,
    codigo_ticket: params.codigo,
    titulo_evento: params.titulo,
    conteudo_mensagem: params.conteudoMensagem,
    link_ticket: linkTicket,
  });

  await enviarEmail({
    para: params.para,
    assunto: `[Agenda Multiweb #${params.codigo}] Nova mensagem: ${params.titulo}`,
    html,
    messageId: novoMessageId,
    inReplyTo: params.emailMessageIdOriginal,
    references: params.emailMessageIdOriginal,
  });
}

/**
 * Testa a conexão SMTP com as configurações fornecidas.
 */
export async function testarSmtp(config: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  paraEmail: string;
}): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
    await transporter.verify();
    await transporter.sendMail({
      from: config.fromEmail,
      to: config.paraEmail,
      subject: "[Agenda Multiweb] Teste de configuração SMTP",
      html: `<p>Conexão SMTP configurada com sucesso! 🎉</p>
             <p>Esta é uma mensagem de teste do sistema <strong>Agenda Multiweb – CTE/UFSM</strong>.</p>`,
    });
    return { sucesso: true };
  } catch (err) {
    return { sucesso: false, erro: (err as Error).message };
  }
}

async function getSiteUrl(): Promise<string> {
  const cfg = await prisma.configuracao.findUnique({ where: { chave: "site_url" } });
  return cfg?.valor ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

// ==================== TEMPLATES PADRÃO ====================
const templatePadrao: Record<string, string> = {
  template_confirmacao: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #006633; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">📅 Agenda Multiweb</h1>
    <p style="color: #a8d5b5; margin: 4px 0 0;">Coordenadoria de Tecnologia Educacional – UFSM</p>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #ddd;">
    <h2 style="color: #006633;">✅ Solicitação Recebida!</h2>
    <p>Olá, <strong>{nome_solicitante}</strong>!</p>
    <p>Sua solicitação foi recebida com sucesso. Utilize o código abaixo para acompanhar o status:</p>
    <div style="background: #006633; color: white; font-size: 28px; font-weight: bold; text-align: center; padding: 16px; border-radius: 8px; letter-spacing: 4px; margin: 20px 0;">
      {codigo_ticket}
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px; background: #f0f0f0; font-weight: bold; width: 40%;">Evento:</td><td style="padding: 8px;">{titulo_evento}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Início:</td><td style="padding: 8px;">{data_inicio}</td></tr>
      <tr><td style="padding: 8px; background: #f0f0f0; font-weight: bold;">Fim:</td><td style="padding: 8px; background: #f0f0f0;">{data_fim}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Local:</td><td style="padding: 8px;">{local}</td></tr>
      <tr><td style="padding: 8px; background: #f0f0f0; font-weight: bold;">Tipo:</td><td style="padding: 8px; background: #f0f0f0;">{tipo}</td></tr>
    </table>
    <div style="text-align: center; margin: 24px 0;">
      <a href="{link_ticket}" style="background: #006633; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Acompanhar Solicitação</a>
    </div>
    <p style="color: #666; font-size: 14px;">Nossa equipe analisará sua solicitação em breve. Você receberá atualizações por e-mail nesta mesma conversa.</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #999; font-size: 12px; text-align: center;">CTE – Coordenadoria de Tecnologia Educacional | UFSM<br>Este e-mail foi enviado automaticamente. Não responda diretamente.</p>
  </div>
</body>
</html>`,

  template_aceite: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #006633; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">📅 Agenda Multiweb</h1>
    <p style="color: #a8d5b5; margin: 4px 0 0;">Coordenadoria de Tecnologia Educacional – UFSM</p>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #ddd;">
    <h2 style="color: #28a745;">🎉 Solicitação Aceita!</h2>
    <p>Olá, <strong>{nome_solicitante}</strong>!</p>
    <p>Temos ótimas notícias! Sua solicitação <strong>[{codigo_ticket}] {titulo_evento}</strong> foi <strong style="color: #28a745;">aceita</strong> pela equipe CTE e registrada na nossa agenda.</p>
    {mensagem_equipe}
    <div style="text-align: center; margin: 24px 0;">
      <a href="{link_ticket}" style="background: #006633; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Ver Detalhes</a>
    </div>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #999; font-size: 12px; text-align: center;">CTE – Coordenadoria de Tecnologia Educacional | UFSM</p>
  </div>
</body>
</html>`,

  template_recusa: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #006633; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">📅 Agenda Multiweb</h1>
    <p style="color: #a8d5b5; margin: 4px 0 0;">Coordenadoria de Tecnologia Educacional – UFSM</p>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #ddd;">
    <h2 style="color: #dc3545;">❌ Solicitação Não Atendida</h2>
    <p>Olá, <strong>{nome_solicitante}</strong>!</p>
    <p>Infelizmente, sua solicitação <strong>[{codigo_ticket}] {titulo_evento}</strong> não pôde ser atendida no momento.</p>
    {mensagem_equipe}
    <p>Para mais informações, acesse o detalhe da sua solicitação:</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="{link_ticket}" style="background: #006633; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Ver Detalhes</a>
    </div>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #999; font-size: 12px; text-align: center;">CTE – Coordenadoria de Tecnologia Educacional | UFSM</p>
  </div>
</body>
</html>`,

  template_mensagem: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #006633; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">📅 Agenda Multiweb</h1>
    <p style="color: #a8d5b5; margin: 4px 0 0;">Coordenadoria de Tecnologia Educacional – UFSM</p>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #ddd;">
    <h2 style="color: #006633;">💬 Nova mensagem da equipe CTE</h2>
    <p>Olá, <strong>{nome_solicitante}</strong>!</p>
    <p>A equipe CTE enviou uma nova mensagem sobre sua solicitação <strong>[{codigo_ticket}] {titulo_evento}</strong>:</p>
    <div style="background: white; border-left: 4px solid #006633; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
      {conteudo_mensagem}
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a href="{link_ticket}" style="background: #006633; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Responder / Ver Conversa</a>
    </div>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #999; font-size: 12px; text-align: center;">CTE – Coordenadoria de Tecnologia Educacional | UFSM</p>
  </div>
</body>
</html>`,
};
