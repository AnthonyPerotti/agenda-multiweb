"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

const STATUS_CONFIG: Record<string, { label: string; cor: string; icone: string }> = {
  ABERTO: { label: "Em Aberto", cor: "#60a5fa", icone: "🔵" },
  EM_ANALISE: { label: "Em Análise", cor: "#fbbf24", icone: "🟡" },
  ACEITO: { label: "Aceito", cor: "#4ade80", icone: "🟢" },
  RECUSADO: { label: "Recusado", cor: "#f87171", icone: "🔴" },
  FINALIZADO: { label: "Finalizado", cor: "#a78bfa", icone: "✅" },
};

function formatarData(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface Mensagem {
  id: string;
  nomeAutor: string;
  tipoAutor: "EQUIPE" | "SOLICITANTE" | "SISTEMA";
  conteudo: string;
  criadoEm: string;
}

interface HistoricoItem {
  id: string;
  nomeUsuario: string;
  acao: string;
  criadoEm: string;
}

interface Ticket {
  id: string;
  codigo: string;
  tipo: string;
  status: string;
  nomeSolicitante: string;
  emailSolicitante: string;
  tituloEvento: string;
  descricao?: string;
  dataInicio: string;
  dataFim: string;
  local: string;
  criadoEm: string;
  mensagens: Mensagem[];
  historico: HistoricoItem[];
}

function ConsultarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [codigo, setCodigo] = useState(searchParams.get("codigo") ?? "");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [novaMensagem, setNovaMensagem] = useState("");
  const [enviandoMsg, setEnviandoMsg] = useState(false);
  const [aba, setAba] = useState<"detalhes" | "chat">("detalhes");

  const buscarTicket = useCallback(async (cod: string) => {
    if (!cod.trim()) return;
    setCarregando(true);
    setErro("");
    try {
      const res = await fetch(`/api/tickets/buscar/${cod.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Ticket não encontrado");
        setTicket(null);
      } else {
        setTicket(data.ticket);
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const codigoParam = searchParams.get("codigo");
    if (codigoParam) {
      setCodigo(codigoParam);
      buscarTicket(codigoParam);
    }
  }, [searchParams, buscarTicket]);

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !ticket) return;
    setEnviandoMsg(true);
    try {
      const res = await fetch(`/api/tickets/buscar/${ticket.codigo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conteudo: novaMensagem,
          nomeAutor: ticket.nomeSolicitante,
        }),
      });
      if (res.ok) {
        setNovaMensagem("");
        await buscarTicket(ticket.codigo);
      }
    } finally {
      setEnviandoMsg(false);
    }
  };

  const imprimirComprovante = () => {
    window.print();
  };

  const cfg = ticket ? STATUS_CONFIG[ticket.status] : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Header */}
      <header className="no-print" style={{
        background: "linear-gradient(135deg, #001a0d, #003366)",
        borderBottom: "1px solid rgba(0,102,51,0.3)",
        padding: "0 24px",
      }}>
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#006633,#008040)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📅</div>
            <span style={{ fontWeight: 700, color: "#f0f4ff", fontSize: 15 }}>Agenda Multiweb</span>
          </button>
          <span style={{ color: "#64748b", fontSize: 13 }}>CTE – UFSM</span>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        <div className="no-print" style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f0f4ff", marginBottom: 8 }}>
            Consultar Solicitação
          </h1>
          <p style={{ color: "#94a3b8" }}>Digite o código de rastreamento recebido por e-mail</p>
        </div>

        {/* Campo de busca */}
        <div className="glass-card no-print" style={{ padding: 24, marginBottom: 32 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <input
              className="input"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && buscarTicket(codigo)}
              placeholder="Ex: MW-8F92A"
              style={{ fontFamily: "monospace", fontSize: 18, letterSpacing: 2, textAlign: "center", flex: 1 }}
              maxLength={8}
            />
            <button
              className="btn btn-primary"
              onClick={() => buscarTicket(codigo)}
              disabled={carregando || !codigo.trim()}
              style={{ padding: "10px 24px", minWidth: 120 }}
            >
              {carregando ? "⏳" : "🔍 Buscar"}
            </button>
          </div>
          {erro && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", marginTop: 12, fontSize: 14 }}>
              ⚠️ {erro}
            </div>
          )}
        </div>

        {/* Resultado */}
        {ticket && (
          <div className="fade-in">
            {/* Card de status com Botão de Imprimir Comprovante */}
            <div className="card no-print" style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  Solicitação #{ticket.codigo}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#f0f4ff" }}>{ticket.tituloEvento}</div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button className="btn btn-secondary" onClick={imprimirComprovante} style={{ fontSize: 13, gap: 6 }}>
                  🖨️ Imprimir Comprovante (PDF)
                </button>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: `${cfg?.cor}22`,
                  border: `1px solid ${cfg?.cor}44`,
                  borderRadius: 20,
                  padding: "8px 16px",
                  color: cfg?.cor,
                  fontWeight: 700,
                  fontSize: 15,
                }}>
                  {cfg?.icone} {cfg?.label}
                </div>
              </div>
            </div>

            {/* Abas */}
            <div className="no-print" style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
              {(["detalhes", "chat"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAba(a)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "10px 20px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: aba === a ? "#4ade80" : "#64748b",
                    borderBottom: aba === a ? "2px solid #4ade80" : "2px solid transparent",
                    marginBottom: -1,
                    transition: "color 0.15s",
                  }}
                >
                  {a === "detalhes" ? "📋 Detalhes" : `💬 Mensagens (${ticket.mensagens.filter(m => m.tipoAutor === "EQUIPE").length})`}
                </button>
              ))}
            </div>

            {/* Aba Detalhes */}
            {aba === "detalhes" && (
              <div className="card fade-in no-print">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[
                    { label: "Solicitante", valor: `${ticket.nomeSolicitante} (${ticket.emailSolicitante})` },
                    { label: "Tipo", valor: ticket.tipo === "TRANSMISSAO_EXTERNA" ? "📡 Transmissão Externa" : "🎤 Mini Auditório" },
                    { label: "Local", valor: ticket.local },
                    { label: "Início", valor: formatarData(ticket.dataInicio) },
                    { label: "Fim", valor: formatarData(ticket.dataFim) },
                    { label: "Aberto em", valor: formatarData(ticket.criadoEm) },
                  ].map(({ label, valor }) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
                      <div style={{ color: "#f0f4ff", fontSize: 14 }}>{valor}</div>
                    </div>
                  ))}
                </div>
                {ticket.descricao && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Descrição</div>
                    <div style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>{ticket.descricao}</div>
                  </div>
                )}

                {/* Histórico */}
                {ticket.historico.length > 0 && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 12 }}>📜 Histórico</div>
                    {ticket.historico.map((h) => (
                      <div key={h.id} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: "#64748b" }}>
                        <span>•</span>
                        <span><strong style={{ color: "#94a3b8" }}>{h.acao}</strong> — {formatarData(h.criadoEm)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Aba Chat */}
            {aba === "chat" && (
              <div className="fade-in no-print">
                <div className="card" style={{ minHeight: 320, marginBottom: 16 }}>
                  {ticket.mensagens.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                      <p>Nenhuma mensagem ainda.<br />Use o campo abaixo para enviar uma mensagem à equipe CTE.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {ticket.mensagens.map((msg) => (
                        <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: msg.tipoAutor === "SISTEMA" ? "center" : msg.tipoAutor === "EQUIPE" ? "flex-start" : "flex-end" }}>
                          {msg.tipoAutor === "SISTEMA" ? (
                            <div className="chat-bubble-sistema">{msg.conteudo}</div>
                          ) : (
                            <>
                              <div style={{ fontSize: 11, color: "#64748b", padding: "0 4px" }}>
                                {msg.tipoAutor === "EQUIPE" ? "🟢 Equipe CTE" : `👤 ${msg.nomeAutor}`} · {formatarData(msg.criadoEm)}
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

                {ticket.status !== "FINALIZADO" && ticket.status !== "RECUSADO" && (
                  <div className="card">
                    <textarea
                      className="input"
                      value={novaMensagem}
                      onChange={(e) => setNovaMensagem(e.target.value)}
                      placeholder="Digite sua mensagem para a equipe CTE..."
                      rows={3}
                      style={{ resize: "vertical", marginBottom: 12 }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-primary"
                        onClick={enviarMensagem}
                        disabled={enviandoMsg || !novaMensagem.trim()}
                      >
                        {enviandoMsg ? "Enviando..." : "Enviar Mensagem ➤"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── DOCUMENTO IMPRESSO (Visível apenas ao imprimir ou salvar PDF) ─── */}
            <div className="comprovante-print">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "3px solid #006633", paddingBottom: 16, marginBottom: 24, gap: 16 }}>
                {/* Logo UFSM */}
                <img src="/images/ufsm-logo.png" alt="UFSM" style={{ height: 64, objectFit: "contain" }} />

                <div style={{ textAlign: "center", flex: 1 }}>
                  <h2 style={{ fontSize: 16, color: "#006633", fontWeight: 800, textTransform: "uppercase" }}>
                    UNIVERSIDADE FEDERAL DE SANTA MARIA — UFSM
                  </h2>
                  <h3 style={{ fontSize: 13, color: "#003366", fontWeight: 700, marginTop: 2 }}>
                    Coordenadoria de Tecnologia Educacional – CTE / Agenda Multiweb
                  </h3>
                  <h4 style={{ fontSize: 14, color: "#111827", fontWeight: 800, marginTop: 8, textTransform: "uppercase" }}>
                    COMPROVANTE OFICIAL DE RESERVA E AGENDAMENTO
                  </h4>
                </div>

                {/* Logo CTE */}
                <img src="/images/cte-logo.png" alt="CTE/UFSM" style={{ height: 52, objectFit: "contain" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "16px 20px", borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Código de Acompanhamento</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#006633", letterSpacing: 2 }}>{ticket.codigo}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Situação Atual</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: ticket.status === "ACEITO" ? "#006633" : "#003366" }}>
                    {cfg?.icone} {cfg?.label.toUpperCase()}
                  </div>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
                <tbody>
                  {[
                    ["Título do Evento", ticket.tituloEvento],
                    ["Tipo de Serviço", ticket.tipo === "TRANSMISSAO_EXTERNA" ? "Transmissão Externa (Prédios UFSM)" : "Mini Auditório (Prédio 14, Sala 109)"],
                    ["Solicitante", ticket.emailSolicitante ? `${ticket.nomeSolicitante} (${ticket.emailSolicitante})` : ticket.nomeSolicitante],
                    ["Data / Hora Início", formatarData(ticket.dataInicio)],
                    ["Data / Hora Fim", formatarData(ticket.dataFim)],
                    ["Local do Evento", ticket.local],
                    ["Data de Emissão da Solicitação", formatarData(ticket.criadoEm)],
                  ].map(([label, valor]) => (
                    <tr key={label as string} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#334155", width: "35%", background: "#f1f5f9" }}>{label}</td>
                      <td style={{ padding: "10px 12px", color: "#0f172a" }}>{valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {ticket.descricao && (
                <div style={{ marginBottom: 24, padding: 16, background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, color: "#334155", marginBottom: 4, fontSize: 12, textTransform: "uppercase" }}>Descrição / Observações</div>
                  <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.5 }}>{ticket.descricao}</div>
                </div>
              )}

              <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid #cbd5e1", fontSize: 11, color: "#64748b", textAlign: "center" }}>
                Documento emitido automaticamente pelo sistema Agenda Multiweb – Coordenadoria de Tecnologia Educacional (CTE/UFSM).
                <br />
                Para verificar a autenticidade ou atualizar o status, acesse <strong>agenda.cte.edu</strong> e informe o código <strong>{ticket.codigo}</strong>.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConsultarPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#94a3b8" }}>Carregando...</div>}>
      <ConsultarContent />
    </Suspense>
  );
}
