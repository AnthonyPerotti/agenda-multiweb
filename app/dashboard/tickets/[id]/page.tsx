"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  ABERTO: "Em Aberto", EM_ANALISE: "Em Análise", ACEITO: "Aceito",
  RECUSADO: "Recusado", FINALIZADO: "Finalizado",
};

function formatarData(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface Ticket {
  id: string; codigo: string; tipo: string; status: string;
  nomeSolicitante: string; emailSolicitante: string; tituloEvento: string;
  descricao?: string; dataInicio: string; dataFim: string; local: string;
  criadoEm: string; emailMessageId?: string; anexosLinks?: string;
  mensagens: { id: string; nomeAutor: string; tipoAutor: string; conteudo: string; criadoEm: string; lida: boolean }[];
  historico: { id: string; nomeUsuario: string; acao: string; criadoEm: string }[];
  evento?: { id: string; googleEventId?: string } | null;
}

export default function TicketDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<"detalhes" | "chat" | "historico">("detalhes");
  const [novaMensagem, setNovaMensagem] = useState("");
  const [enviandoMsg, setEnviandoMsg] = useState(false);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [novoStatus, setNovoStatus] = useState("");
  const [mensagemStatus, setMensagemStatus] = useState("");
  const [modal, setModal] = useState<null | { tipo: "aceitar" | "conflito"; conflitos?: unknown[] }>(null);
  const [processandoAceite, setProcessandoAceite] = useState(false);

  const buscarTicket = useCallback(async () => {
    setCarregando(true);
    try {
      // Buscar ticket pela API interna (inclui e-mail, que a pública não expõe)
      const res = await fetch(`/api/tickets?status=&tipo=&pagina=1`);
      // Buscar mensagens separadamente
      const [resTicket, resMensagens] = await Promise.all([
        fetch(`/api/tickets/${id}`, { method: "GET" }).catch(() => null),
        fetch(`/api/tickets/${id}/mensagens`),
      ]);

      // Fallback: buscar da lista e combinar com mensagens
      const listRes = await fetch(`/api/tickets?pagina=1`);
      const listData = await listRes.json();
      const ticketBasico = listData.tickets?.find((t: { id: string }) => t.id === id);

      const msgData = resMensagens.ok ? await resMensagens.json() : { mensagens: [] };

      if (ticketBasico) {
        setTicket({ ...ticketBasico, mensagens: msgData.mensagens ?? [], historico: [] });
      }
    } finally {
      setCarregando(false);
    }
  }, [id]);

  // Buscar ticket completo (necessita de endpoint dedicado por id)
  const buscarTicketCompleto = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch(`/api/tickets/${id}/detalhes`);
      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
      } else {
        // fallback simples
        await buscarTicket();
      }
    } catch {
      await buscarTicket();
    } finally {
      setCarregando(false);
    }
  }, [id, buscarTicket]);

  useEffect(() => { buscarTicketCompleto(); }, [buscarTicketCompleto]);

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !ticket) return;
    setEnviandoMsg(true);
    try {
      await fetch(`/api/tickets/${id}/mensagens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo: novaMensagem, notificarSolicitante: true }),
      });
      setNovaMensagem("");
      await buscarTicketCompleto();
    } finally {
      setEnviandoMsg(false);
    }
  };

  const atualizarStatus = async () => {
    if (!novoStatus || !ticket) return;
    setAtualizandoStatus(true);
    try {
      await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus, mensagemEquipe: mensagemStatus }),
      });
      setNovoStatus(""); setMensagemStatus("");
      await buscarTicketCompleto();
    } finally {
      setAtualizandoStatus(false);
    }
  };

  const aceitarTicket = async (confirmarConflito = false) => {
    if (!ticket) return;
    setProcessandoAceite(true);
    try {
      const res = await fetch(`/api/tickets/${id}/aceitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmarConflito }),
      });
      const data = await res.json();

      if (res.status === 409 && data.conflito) {
        setModal({ tipo: "conflito", conflitos: data.eventosConflitantes });
      } else if (res.ok) {
        setModal(null);
        await buscarTicketCompleto();
      }
    } finally {
      setProcessandoAceite(false);
    }
  };

  if (carregando) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#64748b" }}>
        <div className="pulse" style={{ fontSize: 32 }}>⏳</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
        <p>Ticket não encontrado.</p>
        <button className="btn btn-secondary" onClick={() => router.back()} style={{ marginTop: 16 }}>
          ← Voltar
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 32px 64px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <button className="btn btn-secondary" onClick={() => router.back()} style={{ fontSize: 13 }}>
          ← Voltar
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#4ade80", fontSize: 16 }}>
              #{ticket.codigo}
            </span>
            <span className={`badge badge-${ticket.status.toLowerCase().replace("_", "")}`}>
              {STATUS_LABELS[ticket.status]}
            </span>
            <span className={`badge ${ticket.tipo === "TRANSMISSAO_EXTERNA" ? "badge-transmissao" : "badge-auditorio"}`}>
              {ticket.tipo === "TRANSMISSAO_EXTERNA" ? "📡 Transmissão" : "🎤 Auditório"}
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f0f4ff", marginTop: 6 }}>
            {ticket.tituloEvento}
          </h1>
        </div>

        {/* Aceitar ticket */}
        {ticket.status !== "ACEITO" && ticket.status !== "RECUSADO" && ticket.status !== "FINALIZADO" && (
          <button
            className="btn btn-primary"
            onClick={() => aceitarTicket(false)}
            disabled={processandoAceite}
            style={{ padding: "10px 24px" }}
          >
            {processandoAceite ? "⏳" : "✅ Aceitar Ticket"}
          </button>
        )}
      </div>

      {/* Painel de atualização de status */}
      {ticket.status !== "ACEITO" && ticket.status !== "FINALIZADO" && (
        <div className="card" style={{ marginBottom: 20, background: "rgba(0,102,51,0.08)", borderColor: "rgba(0,102,51,0.3)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 12 }}>📋 Atualizar Status</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <select
              className="input"
              value={novoStatus}
              onChange={(e) => setNovoStatus(e.target.value)}
              style={{ width: "auto", minWidth: 180 }}
            >
              <option value="">Selecionar novo status...</option>
              {Object.entries(STATUS_LABELS)
                .filter(([s]) => s !== ticket.status)
                .map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input
              className="input"
              placeholder="Mensagem para o solicitante (opcional)"
              value={mensagemStatus}
              onChange={(e) => setMensagemStatus(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={atualizarStatus}
              disabled={!novoStatus || atualizandoStatus}
            >
              {atualizandoStatus ? "⏳" : "Atualizar"}
            </button>
          </div>
        </div>
      )}

      {/* Abas */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
        {(["detalhes", "chat", "historico"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 20px", fontSize: 14, fontWeight: 600,
              color: aba === a ? "#4ade80" : "#64748b",
              borderBottom: aba === a ? "2px solid #4ade80" : "2px solid transparent",
              marginBottom: -1, transition: "color 0.15s",
            }}
          >
            {a === "detalhes" ? "📋 Detalhes" : a === "chat" ? `💬 Chat (${ticket.mensagens?.length ?? 0})` : "📜 Histórico"}
          </button>
        ))}
      </div>

      {/* Aba Detalhes */}
      {aba === "detalhes" && (
        <div className="card fade-in">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { label: "Solicitante", valor: ticket.nomeSolicitante },
              { label: "E-mail", valor: ticket.emailSolicitante },
              { label: "Local", valor: ticket.local },
              { label: "Data de Abertura", valor: formatarData(ticket.criadoEm) },
              { label: "Início do Evento", valor: formatarData(ticket.dataInicio) },
              { label: "Fim do Evento", valor: formatarData(ticket.dataFim) },
            ].map(({ label, valor }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
                <div style={{ color: "#f0f4ff", fontSize: 14 }}>{valor}</div>
              </div>
            ))}
          </div>
          {ticket.descricao && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Descrição</div>
              <div style={{ color: "#94a3b8", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{ticket.descricao}</div>
            </div>
          )}
          {ticket.anexosLinks && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Links / Anexos</div>
              <div style={{ color: "#60a5fa", fontSize: 14 }}>{ticket.anexosLinks}</div>
            </div>
          )}
          {ticket.evento && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8 }}>
              <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>
                ✅ Evento registrado na agenda
                {ticket.evento.googleEventId ? " • 🔄 Sincronizado com Google Calendar" : ""}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Aba Chat */}
      {aba === "chat" && (
        <div className="fade-in">
          <div className="card" style={{ minHeight: 300, marginBottom: 16 }}>
            {!ticket.mensagens?.length ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                <p>Nenhuma mensagem ainda.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {ticket.mensagens.map((msg) => (
                  <div key={msg.id} style={{
                    display: "flex", flexDirection: "column", gap: 4,
                    alignItems: msg.tipoAutor === "SISTEMA" ? "center" : msg.tipoAutor === "EQUIPE" ? "flex-start" : "flex-end",
                  }}>
                    {msg.tipoAutor === "SISTEMA" ? (
                      <div className="chat-bubble-sistema">{msg.conteudo}</div>
                    ) : (
                      <>
                        <div style={{ fontSize: 11, color: "#64748b", padding: "0 4px" }}>
                          {msg.tipoAutor === "EQUIPE" ? `🟢 ${msg.nomeAutor}` : `👤 ${msg.nomeAutor} (Solicitante)`} · {formatarData(msg.criadoEm)}
                        </div>
                        <div className={`chat-bubble ${msg.tipoAutor === "EQUIPE" ? "chat-bubble-equipe" : "chat-bubble-solicitante"}`}>
                          {msg.conteudo}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <textarea
              className="input"
              value={novaMensagem}
              onChange={(e) => setNovaMensagem(e.target.value)}
              placeholder="Digite sua resposta para o solicitante..."
              rows={3}
              style={{ resize: "vertical", marginBottom: 12 }}
              onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) enviarMensagem(); }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Ctrl+Enter para enviar • O solicitante será notificado por e-mail</span>
              <button className="btn btn-primary" onClick={enviarMensagem} disabled={enviandoMsg || !novaMensagem.trim()}>
                {enviandoMsg ? "Enviando..." : "Enviar ➤"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aba Histórico */}
      {aba === "historico" && (
        <div className="card fade-in">
          {!ticket.historico?.length ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>Nenhuma ação registrada.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ticket.historico.map((h) => (
                <div key={h.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border-light)" }}>
                  <div style={{ width: 32, height: 32, background: "rgba(0,102,51,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>📝</div>
                  <div>
                    <div style={{ color: "#f0f4ff", fontSize: 14, fontWeight: 500 }}>{h.acao}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>por {h.nomeUsuario} · {formatarData(h.criadoEm)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de conflito */}
      {modal?.tipo === "conflito" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
          <div className="glass-card" style={{ maxWidth: 480, width: "100%", padding: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12, textAlign: "center" }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fbbf24", marginBottom: 12, textAlign: "center" }}>
              Conflito de Horário Detectado
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20, textAlign: "center", lineHeight: 1.6 }}>
              Já existe(m) <strong style={{ color: "#fbbf24" }}>{(modal.conflitos as unknown[])?.length}</strong> evento(s) agendado(s) neste horário. Deseja prosseguir e aceitar o ticket assim mesmo?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={() => aceitarTicket(true)}
                disabled={processandoAceite}
                style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
              >
                {processandoAceite ? "⏳" : "Aceitar assim mesmo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
