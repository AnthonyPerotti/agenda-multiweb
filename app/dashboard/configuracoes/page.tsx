"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface Config {
  chave: string;
  valor: string;
}

interface TemplateEditor {
  chave: string;
  label: string;
  descricao: string;
}

const TEMPLATES: TemplateEditor[] = [
  { chave: "template_confirmacao", label: "Confirmação de Abertura (Solicitante)", descricao: "Enviado ao solicitante quando o ticket é criado" },
  { chave: "template_notificacao_equipe", label: "Notificação Novo Ticket (Equipe)", descricao: "Enviado à equipe CTE sempre que uma nova solicitação é criada" },
  { chave: "template_aceite", label: "Aceite do Ticket", descricao: "Enviado quando a equipe aceita a solicitação" },
  { chave: "template_recusa", label: "Recusa do Ticket", descricao: "Enviado quando a solicitação não pode ser atendida" },
  { chave: "template_mensagem", label: "Nova Mensagem no Chat", descricao: "Enviado quando a equipe responde no chat" },
];

const HTML_PADRAO: Record<string, string> = {
  template_confirmacao: `<!DOCTYPE html>
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

  template_notificacao_equipe: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #006633; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">📅 Agenda Multiweb</h1>
    <p style="color: #a8d5b5; margin: 4px 0 0;">Coordenadoria de Tecnologia Educacional – UFSM</p>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #ddd;">
    <h2 style="color: #006633;">🔔 Novo Agendamento Recebido!</h2>
    <p>Uma nova solicitação de agendamento foi aberta no sistema:</p>
    <div style="background: #006633; color: white; font-size: 24px; font-weight: bold; text-align: center; padding: 14px; border-radius: 8px; letter-spacing: 3px; margin: 16px 0;">
      {codigo_ticket}
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px; background: #f0f0f0; font-weight: bold; width: 40%;">Solicitante:</td><td style="padding: 8px;">{nome_solicitante} ({email_solicitante})</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Evento:</td><td style="padding: 8px;">{titulo_evento}</td></tr>
      <tr><td style="padding: 8px; background: #f0f0f0; font-weight: bold;">Início:</td><td style="padding: 8px; background: #f0f0f0;">{data_inicio}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Fim:</td><td style="padding: 8px;">{data_fim}</td></tr>
      <tr><td style="padding: 8px; background: #f0f0f0; font-weight: bold;">Local:</td><td style="padding: 8px; background: #f0f0f0;">{local}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold;">Tipo:</td><td style="padding: 8px;">{tipo}</td></tr>
    </table>
    <div style="text-align: center; margin: 24px 0;">
      <a href="{link_ticket}" style="background: #006633; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Gerenciar no Painel</a>
    </div>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #999; font-size: 12px; text-align: center;">CTE – Coordenadoria de Tecnologia Educacional | UFSM</p>
  </div>
</body>
</html>`,

  template_aceite: `<!DOCTYPE html>
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

  template_recusa: `<!DOCTYPE html>
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

  template_mensagem: `<!DOCTYPE html>
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

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<"smtp" | "templates" | "google" | "usuario">("smtp");
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [testandoGoogle, setTestandoGoogle] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; mensagem: string } | null>(null);
  const [templateAtivo, setTemplateAtivo] = useState("template_confirmacao");
  const [emailTeste, setEmailTeste] = useState("");

  const buscarConfigs = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/configuracoes");
      const data = await res.json();
      const map: Record<string, string> = {};
      for (const cfg of (data.configuracoes as Config[])) {
        map[cfg.chave] = cfg.valor;
      }
      setConfigs(map);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { buscarConfigs(); }, [buscarConfigs]);

  const atualizar = (chave: string, valor: string) => {
    setConfigs((prev) => ({ ...prev, [chave]: valor }));
    setFeedback(null);
  };

  const salvar = async () => {
    setSalvando(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/configuracoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configuracoes: configs }),
      });
      if (res.ok) {
        setFeedback({ tipo: "sucesso", mensagem: "Configurações salvas com sucesso!" });
      } else {
        const data = await res.json();
        setFeedback({ tipo: "erro", mensagem: data.erro ?? "Erro ao salvar" });
      }
    } finally {
      setSalvando(false);
    }
  };

  const testarSmtp = async () => {
    if (!emailTeste) { setFeedback({ tipo: "erro", mensagem: "Informe um e-mail para teste" }); return; }
    setTestando(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/configuracoes/testar-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: configs.smtp_host,
          port: parseInt(configs.smtp_port ?? "587"),
          secure: configs.smtp_secure === "true",
          user: configs.smtp_user,
          pass: configs.smtp_pass === "••••••••" ? undefined : configs.smtp_pass,
          fromEmail: configs.smtp_from_email || configs.smtp_user,
          paraEmail: emailTeste,
        }),
      });
      const data = await res.json();
      setFeedback({ tipo: data.sucesso ? "sucesso" : "erro", mensagem: data.mensagem ?? data.erro ?? "Erro no teste" });
    } finally {
      setTestando(false);
    }
  };

  const testarGoogle = async () => {
    if (!configs.google_calendar_id || !configs.google_credentials) {
      setFeedback({ tipo: "erro", mensagem: "Preencha o ID da Agenda e as Credenciais JSON antes de testar." });
      return;
    }
    setTestandoGoogle(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/configuracoes/testar-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId: configs.google_calendar_id,
          credentialsJson: configs.google_credentials,
          impersonatedEmail: configs.google_impersonated_email,
        }),
      });
      const data = await res.json();
      setFeedback({ tipo: data.sucesso ? "sucesso" : "erro", mensagem: data.mensagem ?? data.erro ?? "Erro ao testar Google Calendar" });
    } finally {
      setTestandoGoogle(false);
    }
  };

  const variaveis: Record<string, string[]> = {
    template_confirmacao: ["{nome_solicitante}", "{codigo_ticket}", "{titulo_evento}", "{data_inicio}", "{data_fim}", "{local}", "{tipo}", "{link_ticket}"],
    template_notificacao_equipe: ["{nome_solicitante}", "{email_solicitante}", "{codigo_ticket}", "{titulo_evento}", "{data_inicio}", "{data_fim}", "{local}", "{tipo}", "{link_ticket}"],
    template_aceite: ["{nome_solicitante}", "{codigo_ticket}", "{titulo_evento}", "{mensagem_equipe}", "{link_ticket}"],
    template_recusa: ["{nome_solicitante}", "{codigo_ticket}", "{titulo_evento}", "{mensagem_equipe}", "{link_ticket}"],
    template_mensagem: ["{nome_solicitante}", "{codigo_ticket}", "{titulo_evento}", "{conteudo_mensagem}", "{link_ticket}"],
  };

  if (carregando) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#64748b" }}><div className="pulse" style={{ fontSize: 32 }}>⏳</div></div>;
  }

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f0f4ff", marginBottom: 8 }}>⚙️ Configurações</h1>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>Configure SMTP, templates de e-mail e dados da conta de acesso</p>

      {/* Abas */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 28 }}>
        {[
          { k: "smtp", l: "📧 Servidor de E-mail" },
          { k: "templates", l: "✉️ Templates" },
          { k: "google", l: "🗓️ Google Calendar" },
          { k: "usuario", l: "👤 Usuário & Acesso" },
        ].map(({ k, l }) => (
          <button
            key={k}
            onClick={() => setAba(k as typeof aba)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 20px", fontSize: 14, fontWeight: 600,
              color: aba === k ? "#4ade80" : "#64748b",
              borderBottom: aba === k ? "2px solid #4ade80" : "2px solid transparent",
              marginBottom: -1, transition: "color 0.15s",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Feedback global */}
      {feedback && (
        <div style={{
          background: feedback.tipo === "sucesso" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${feedback.tipo === "sucesso" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          borderRadius: 8, padding: "10px 16px",
          color: feedback.tipo === "sucesso" ? "#4ade80" : "#f87171",
          marginBottom: 20, fontSize: 14,
        }}>
          {feedback.tipo === "sucesso" ? "✅" : "⚠️"} {feedback.mensagem}
        </div>
      )}

      {/* ─── Aba SMTP ─── */}
      {aba === "smtp" && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff", marginBottom: 20 }}>Configurações SMTP</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label className="label">Servidor (Host)</label>
                <input className="input" value={configs.smtp_host ?? ""} onChange={(e) => atualizar("smtp_host", e.target.value)} placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="label">Porta</label>
                <input className="input" type="number" value={configs.smtp_port ?? "587"} onChange={(e) => atualizar("smtp_port", e.target.value)} placeholder="587" />
              </div>
              <div>
                <label className="label">Usuário (E-mail)</label>
                <input className="input" type="email" value={configs.smtp_user ?? ""} onChange={(e) => atualizar("smtp_user", e.target.value)} placeholder="noreply@ufsm.br" />
              </div>
              <div>
                <label className="label">Senha / App Password</label>
                <input className="input" type="password" value={configs.smtp_pass ?? ""} onChange={(e) => atualizar("smtp_pass", e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label className="label">Nome do Remetente</label>
                <input className="input" value={configs.smtp_from_name ?? ""} onChange={(e) => atualizar("smtp_from_name", e.target.value)} placeholder="Agenda Multiweb – CTE/UFSM" />
              </div>
              <div>
                <label className="label">E-mail do Remetente</label>
                <input className="input" type="email" value={configs.smtp_from_email ?? ""} onChange={(e) => atualizar("smtp_from_email", e.target.value)} placeholder="noreply@ufsm.br" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label className="label">URL do Site (para links nos e-mails)</label>
                <input className="input" value={configs.site_url ?? ""} onChange={(e) => atualizar("site_url", e.target.value)} placeholder="https://agenda.cte.ufsm.br" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label className="label">E-mail de Notificação da Equipe (Recebe aviso de novos tickets)</label>
                <input className="input" type="email" value={configs.email_notificacao_equipe ?? ""} onChange={(e) => atualizar("email_notificacao_equipe", e.target.value)} placeholder="multiweb@cte.ufsm.br (deixe vazio para usar o e-mail do usuário SMTP)" />
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Endereço de e-mail da equipe CTE que receberá uma notificação automática sempre que um novo agendamento for aberto.
                </p>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={configs.smtp_secure === "true"}
                  onChange={(e) => atualizar("smtp_secure", e.target.checked ? "true" : "false")}
                  style={{ width: 16, height: 16, accentColor: "#006633" }}
                />
                <span style={{ color: "#94a3b8", fontSize: 14 }}>Usar SSL/TLS (marque para porta 465)</span>
              </label>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff", marginBottom: 16 }}>⏱️ Regras de Antecedência para Agendamento</h3>
            <div>
              <label className="label">Antecedência Mínima de Solicitação (em horas)</label>
              <input
                className="input"
                type="number"
                min="0"
                max="720"
                value={configs.antecedencia_minima_horas ?? "48"}
                onChange={(e) => atualizar("antecedencia_minima_horas", e.target.value)}
                placeholder="48"
                style={{ maxWidth: 200 }}
              />
              <p style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                Define quantas horas de antecedência o público deve ter para abrir um ticket (padrão: 48h). Digite 0 para desativar a restrição.
              </p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f0f4ff", marginBottom: 16 }}>🧪 Testar Conexão</h3>
            <div style={{ display: "flex", gap: 12 }}>
              <input
                className="input"
                type="email"
                value={emailTeste}
                onChange={(e) => setEmailTeste(e.target.value)}
                placeholder="email@para.receber.o.teste.com"
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary" onClick={testarSmtp} disabled={testando} style={{ minWidth: 120 }}>
                {testando ? "⏳ Testando..." : "🚀 Testar"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? "⏳ Salvando..." : "💾 Salvar Configurações"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Aba Templates ─── */}
      {aba === "templates" && (
        <div className="fade-in">
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {TEMPLATES.map((t) => (
              <button
                key={t.chave}
                onClick={() => setTemplateAtivo(t.chave)}
                className={`btn ${templateAtivo === t.chave ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: 13 }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {TEMPLATES.filter((t) => t.chave === templateAtivo).map((t) => (
            <div key={t.chave}>
              <div className="card" style={{ marginBottom: 16, background: "rgba(0,102,51,0.06)", borderColor: "rgba(0,102,51,0.2)" }}>
                <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>{t.descricao}</p>
                <p style={{ color: "#64748b", fontSize: 12 }}>
                  <strong style={{ color: "#94a3b8" }}>Variáveis disponíveis: </strong>
                  {variaveis[t.chave]?.map((v) => (
                    <code key={v} style={{ background: "rgba(0,102,51,0.15)", padding: "1px 6px", borderRadius: 4, marginRight: 4, color: "#4ade80", fontSize: 11 }}>{v}</code>
                  ))}
                </p>
                <p style={{ color: "#64748b", fontSize: 11, marginTop: 6 }}>
                  💡 Deixe em branco para usar o template padrão do sistema (com design UFSM)
                </p>
              </div>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <label className="label" style={{ marginBottom: 0 }}>{t.label} — HTML do Template</label>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: "4px 12px" }}
                    onClick={() => atualizar(t.chave, HTML_PADRAO[t.chave] ?? "")}
                  >
                    ✨ Carregar HTML Padrão deste Template
                  </button>
                </div>
                <textarea
                  className="input"
                  value={configs[t.chave] ?? ""}
                  onChange={(e) => atualizar(t.chave, e.target.value)}
                  rows={20}
                  style={{ fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
                  placeholder={`<!-- Cole aqui o HTML do template de ${t.label.toLowerCase()} -->\n<!-- Use as variáveis listadas acima -->`}
                />
              </div>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 13 }}
              onClick={() => {
                for (const t of TEMPLATES) {
                  if (HTML_PADRAO[t.chave]) atualizar(t.chave, HTML_PADRAO[t.chave]);
                }
              }}
            >
              ✨ Carregar Todos os Templates Padrão CTE
            </button>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? "⏳ Salvando..." : "💾 Salvar Templates"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Aba Google Calendar ─── */}
      {aba === "google" && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 16, background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.2)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f0f4ff", marginBottom: 8 }}>🗓️ Google Calendar – Service Account</h3>
            <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>
              Para integrar com o Google Calendar, você precisa de uma <strong>Service Account</strong> com acesso à agenda da equipe CTE.
              <br /><br />
              <strong>Passos:</strong>
              <ol style={{ paddingLeft: 20, marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                <li>No Google Cloud Console, crie um projeto e ative a Google Calendar API</li>
                <li>Crie uma Service Account e gere uma chave JSON</li>
                <li>Compartilhe a agenda do Google com o e-mail da Service Account (permissão de editor)</li>
                <li>Cole o JSON abaixo e o ID da agenda</li>
              </ol>
            </p>
          </div>
          <div className="card">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="label">ID da Agenda Google</label>
                <input
                  className="input"
                  value={configs.google_calendar_id ?? ""}
                  onChange={(e) => atualizar("google_calendar_id", e.target.value)}
                  placeholder="cte.ufsm@group.calendar.google.com"
                />
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Encontrado em: Configurações da Agenda → Integrar agenda → ID da agenda
                </p>
              </div>
              <div>
                <label className="label">E-mail a Personificar (Domain-Wide Delegation — Opcional)</label>
                <input
                  className="input"
                  type="email"
                  value={configs.google_impersonated_email ?? ""}
                  onChange={(e) => atualizar("google_impersonated_email", e.target.value)}
                  placeholder="ex: anthony.souza@cead.ufsm.br ou multiweb@cead.ufsm.br"
                />
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Utilizado quando o suporte ativa a Delegação em todo o domínio (Option 2). A Service Account atuará em nome deste e-mail institucional.
                </p>
              </div>
              <div>
                <label className="label">Credenciais da Service Account (JSON)</label>
                <textarea
                  className="input"
                  value={configs.google_credentials ?? ""}
                  onChange={(e) => atualizar("google_credentials", e.target.value)}
                  rows={12}
                  placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "...",\n  ...\n}'}
                  style={{ fontFamily: "monospace", fontSize: 11, resize: "vertical" }}
                />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={testarGoogle} disabled={testandoGoogle}>
              {testandoGoogle ? "⏳ Testando..." : "🧪 Testar Conexão"}
            </button>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
              {salvando ? "⏳ Salvando..." : "💾 Salvar Integração"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Aba Usuário & Acesso ─── */}
      {aba === "usuario" && (
        <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <AlterarEmail />
          <AlterarSenha />
        </div>
      )}
    </div>
  );
}

function AlterarEmail() {
  const { data: session, update } = useSession();
  const [novoEmail, setNovoEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; mensagem: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (session?.user?.email) {
      setNovoEmail(session.user.email);
    }
  }, [session]);

  const salvar = async () => {
    if (!novoEmail || !senhaAtual) {
      setFeedback({ tipo: "erro", mensagem: "Preencha o novo e-mail e a senha atual" });
      return;
    }
    setSalvando(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/usuarios/alterar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novoEmail, senhaAtual }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ tipo: "sucesso", mensagem: "E-mail de login atualizado com sucesso!" });
        setSenhaAtual("");
        await update();
      } else {
        setFeedback({ tipo: "erro", mensagem: data.erro ?? "Erro ao alterar e-mail" });
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="card">
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff", marginBottom: 8 }}>✉️ Alterar E-mail de Login</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>
        E-mail atual de login da equipe: <strong style={{ color: "#4ade80" }}>{session?.user?.email}</strong>
      </p>

      {feedback && (
        <div style={{
          background: feedback.tipo === "sucesso" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${feedback.tipo === "sucesso" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          borderRadius: 8, padding: "10px 14px", color: feedback.tipo === "sucesso" ? "#4ade80" : "#f87171",
          marginBottom: 16, fontSize: 13,
        }}>
          {feedback.tipo === "sucesso" ? "✅" : "⚠️"} {feedback.mensagem}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="label">Novo E-mail de Login</label>
          <input
            className="input"
            type="email"
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            placeholder="ex: novo_email@ufsm.br"
          />
        </div>
        <div>
          <label className="label">Senha Atual (para confirmar)</label>
          <input
            className="input"
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando || !novoEmail || !senhaAtual}>
          {salvando ? "⏳ Atualizando..." : "Atualizar E-mail"}
        </button>
      </div>
    </div>
  );
}

function AlterarSenha() {
  const [form, setForm] = useState({ senhaAtual: "", novaSenha: "", confirmar: "" });
  const [feedback, setFeedback] = useState<{ tipo: "sucesso" | "erro"; mensagem: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (form.novaSenha !== form.confirmar) {
      setFeedback({ tipo: "erro", mensagem: "A nova senha e a confirmação não conferem" });
      return;
    }
    if (form.novaSenha.length < 8) {
      setFeedback({ tipo: "erro", mensagem: "A senha deve ter pelo menos 8 caracteres" });
      return;
    }
    setSalvando(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/usuarios/alterar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual: form.senhaAtual, novaSenha: form.novaSenha }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ tipo: "sucesso", mensagem: "Senha alterada com sucesso!" });
        setForm({ senhaAtual: "", novaSenha: "", confirmar: "" });
      } else {
        setFeedback({ tipo: "erro", mensagem: data.erro ?? "Erro ao alterar senha" });
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="card">
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff", marginBottom: 20 }}>🔑 Alterar Senha</h3>
      {feedback && (
        <div style={{
          background: feedback.tipo === "sucesso" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${feedback.tipo === "sucesso" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          borderRadius: 8, padding: "10px 14px", color: feedback.tipo === "sucesso" ? "#4ade80" : "#f87171",
          marginBottom: 16, fontSize: 13,
        }}>
          {feedback.tipo === "sucesso" ? "✅" : "⚠️"} {feedback.mensagem}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="label">Senha Atual</label>
          <input className="input" type="password" value={form.senhaAtual} onChange={(e) => setForm(p => ({ ...p, senhaAtual: e.target.value }))} placeholder="••••••••" />
        </div>
        <div>
          <label className="label">Nova Senha</label>
          <input className="input" type="password" value={form.novaSenha} onChange={(e) => setForm(p => ({ ...p, novaSenha: e.target.value }))} placeholder="Mínimo 8 caracteres" />
        </div>
        <div>
          <label className="label">Confirmar Nova Senha</label>
          <input className="input" type="password" value={form.confirmar} onChange={(e) => setForm(p => ({ ...p, confirmar: e.target.value }))} placeholder="Repita a nova senha" />
        </div>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando || !form.senhaAtual || !form.novaSenha}>
          {salvando ? "⏳ Alterando..." : "Alterar Senha"}
        </button>
      </div>
    </div>
  );
}
