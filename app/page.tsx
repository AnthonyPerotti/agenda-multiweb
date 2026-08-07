"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Metadata } from "next";

// Ícones SVG inline (sem dependência externa)
const IconCalendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconVideo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const IconMic = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export default function HomePage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<"TRANSMISSAO_EXTERNA" | "MINI_AUDITORIO">("TRANSMISSAO_EXTERNA");
  const [etapa, setEtapa] = useState<"form" | "sucesso">("form");
  const [codigoGerado, setCodigoGerado] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    nomeSolicitante: "",
    emailSolicitante: "",
    tituloEvento: "",
    descricao: "",
    dataInicio: "",
    dataFim: "",
    local: "",
    anexosLinks: "",
    multiplosDias: false,
    detalhamentoDias: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErro("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro("");

    const descricaoFinal = form.multiplosDias
      ? `📅 EVENTO DE MÚLTIPLOS DIAS:\n${form.detalhamentoDias}\n\n${form.descricao}`
      : form.descricao;

    const payload = {
      ...form,
      descricao: descricaoFinal,
      tipo,
      local: tipo === "MINI_AUDITORIO" ? "Prédio 14, Sala 109 – CTE/UFSM" : form.local,
      dataInicio: new Date(form.dataInicio).toISOString(),
      dataFim: new Date(form.dataFim).toISOString(),
    };

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.erro ?? "Erro ao enviar solicitação. Tente novamente.");
        return;
      }

      setCodigoGerado(data.codigo);
      setEtapa("sucesso");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErro("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  if (etapa === "sucesso") {
    return (
      <div className="hero-gradient min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-10 max-w-lg w-full text-center fade-in">
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f0f4ff", marginBottom: 8 }}>
            Solicitação Enviada!
          </h1>
          <p style={{ color: "#94a3b8", marginBottom: 32 }}>
            Sua solicitação foi recebida com sucesso. Guarde o código abaixo para acompanhar:
          </p>

          <div
            style={{
              background: "linear-gradient(135deg, #006633, #008040)",
              borderRadius: 12,
              padding: "20px 32px",
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: 6,
              color: "white",
              marginBottom: 24,
              boxShadow: "0 8px 32px rgba(0,102,51,0.4)",
            }}
          >
            {codigoGerado}
          </div>

          <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 32 }}>
            📧 Um e-mail de confirmação foi enviado para <strong>{form.emailSolicitante}</strong>
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              onClick={() => router.push(`/consultar?codigo=${codigoGerado}`)}
            >
              <IconSearch /> Acompanhar Solicitação
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setEtapa("form");
                setForm({
                  nomeSolicitante: "", emailSolicitante: "", tituloEvento: "",
                  descricao: "", dataInicio: "", dataFim: "", local: "", anexosLinks: "",
                });
              }}
            >
              Nova Solicitação
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #001a0d 0%, #003333 50%, #003366 100%)",
          borderBottom: "1px solid rgba(0,102,51,0.3)",
          padding: "0 24px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: "linear-gradient(135deg, #006633, #008040)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              📅
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#f0f4ff" }}>Agenda Multiweb</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>CTE – UFSM</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={() => router.push("/consultar")}
              style={{ fontSize: 13 }}
            >
              <IconSearch /> Consultar Solicitação
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => router.push("/login")}
              style={{ fontSize: 13 }}
            >
              Área da Equipe
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div
        className="hero-gradient"
        style={{ padding: "80px 24px 60px", textAlign: "center" }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,102,51,0.2)",
              border: "1px solid rgba(0,102,51,0.4)",
              borderRadius: 20,
              padding: "6px 16px",
              fontSize: 13,
              color: "#4ade80",
              marginBottom: 24,
            }}
          >
            <span style={{ width: 6, height: 6, background: "#4ade80", borderRadius: "50%", display: "inline-block" }} />
            Sistema de Agendamento Online
          </div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800, color: "#f0f4ff", lineHeight: 1.2, marginBottom: 16 }}>
            Solicite sua{" "}
            <span style={{ color: "#4ade80" }}>transmissão</span>{" "}
            ou{" "}
            <span style={{ color: "#60a5fa" }}>reserva</span>
          </h1>
          <p style={{ fontSize: 18, color: "#94a3b8", maxWidth: 560, margin: "0 auto 40px" }}>
            Preencha o formulário abaixo para solicitar transmissões ao vivo ou reservar o Mini Auditório da CTE/UFSM.
          </p>

          {/* Cards de tipo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 640, margin: "0 auto 48px" }}>
            <button
              onClick={() => setTipo("TRANSMISSAO_EXTERNA")}
              style={{
                background: tipo === "TRANSMISSAO_EXTERNA"
                  ? "rgba(14,165,233,0.15)"
                  : "rgba(26,34,53,0.8)",
                border: tipo === "TRANSMISSAO_EXTERNA"
                  ? "2px solid #0ea5e9"
                  : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "20px 16px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
              }}
            >
              <div style={{ color: "#38bdf8", marginBottom: 8, display: "flex", justifyContent: "center" }}>
                <IconVideo />
              </div>
              <div style={{ fontWeight: 700, color: "#f0f4ff", fontSize: 14 }}>Transmissão Externa</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Outros prédios da UFSM</div>
            </button>
            <button
              onClick={() => setTipo("MINI_AUDITORIO")}
              style={{
                background: tipo === "MINI_AUDITORIO"
                  ? "rgba(168,85,247,0.15)"
                  : "rgba(26,34,53,0.8)",
                border: tipo === "MINI_AUDITORIO"
                  ? "2px solid #a855f7"
                  : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "20px 16px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
              }}
            >
              <div style={{ color: "#c084fc", marginBottom: 8, display: "flex", justifyContent: "center" }}>
                <IconMic />
              </div>
              <div style={{ fontWeight: 700, color: "#f0f4ff", fontSize: 14 }}>Mini Auditório</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Prédio 14, Sala 109</div>
            </button>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" }}>
        <form onSubmit={handleSubmit} className="fade-in">
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#f0f4ff", display: "flex", alignItems: "center", gap: 8 }}>
              👤 Seus Dados
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label className="label">Nome Completo *</label>
                <input
                  className="input"
                  name="nomeSolicitante"
                  value={form.nomeSolicitante}
                  onChange={handleChange}
                  placeholder="Seu nome completo"
                  required
                />
              </div>
              <div>
                <label className="label">E-mail de Contato *</label>
                <input
                  className="input"
                  type="email"
                  name="emailSolicitante"
                  value={form.emailSolicitante}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#f0f4ff", display: "flex", alignItems: "center", gap: 8 }}>
              📋 Detalhes do Evento
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="label">Título do Evento *</label>
                <input
                  className="input"
                  name="tituloEvento"
                  value={form.tituloEvento}
                  onChange={handleChange}
                  placeholder="Ex: Defesa de Dissertação – Programa de Pós-Graduação"
                  required
                />
              </div>

              <div>
                <label className="label">Duração do Evento *</label>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <button
                    type="button"
                    className={`btn ${!form.multiplosDias ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setForm(p => ({ ...p, multiplosDias: false }))}
                    style={{ flex: 1, fontSize: 13 }}
                  >
                    📆 Dia Único
                  </button>
                  <button
                    type="button"
                    className={`btn ${form.multiplosDias ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setForm(p => ({ ...p, multiplosDias: true }))}
                    style={{ flex: 1, fontSize: 13 }}
                  >
                    📅 Múltiplos Dias
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label className="label">{form.multiplosDias ? "Data e Hora de Início (1º Dia) *" : "Data e Hora de Início *"}</label>
                  <input
                    className="input"
                    type="datetime-local"
                    name="dataInicio"
                    value={form.dataInicio}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="label">{form.multiplosDias ? "Data e Hora de Fim (Último Dia) *" : "Data e Hora de Fim *"}</label>
                  <input
                    className="input"
                    type="datetime-local"
                    name="dataFim"
                    value={form.dataFim}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {form.multiplosDias && (
                <div>
                  <label className="label">Detalhamento dos Dias e Horários *</label>
                  <textarea
                    className="input"
                    name="detalhamentoDias"
                    value={form.detalhamentoDias}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Especifique as datas e turnos de cada dia (Ex: Dia 10/08: 09h às 12h | Dia 11/08: 14h às 18h)"
                    required
                  />
                </div>
              )}

              {tipo === "TRANSMISSAO_EXTERNA" ? (
                <div>
                  <label className="label">Local Exato *</label>
                  <input
                    className="input"
                    name="local"
                    value={form.local}
                    onChange={handleChange}
                    placeholder="Ex: Prédio 7, Sala 301 – CCSH/UFSM"
                    required
                  />
                  <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                    Informe prédio, sala e departamento/centro
                  </p>
                </div>
              ) : (
                <div>
                  <label className="label">Local</label>
                  <input
                    className="input"
                    value="Prédio 14, Sala 109 – CTE/UFSM"
                    disabled
                    style={{ opacity: 0.6, cursor: "not-allowed" }}
                  />
                </div>
              )}

              <div>
                <label className="label">Descrição do Evento / Necessidades</label>
                <textarea
                  className="input"
                  name="descricao"
                  value={form.descricao}
                  onChange={handleChange}
                  placeholder="Descreva o evento, número de participantes, necessidades técnicas especiais, etc."
                  rows={4}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div>
                <label className="label">Links ou Observações Adicionais</label>
                <input
                  className="input"
                  name="anexosLinks"
                  value={form.anexosLinks}
                  onChange={handleChange}
                  placeholder="Ex: https://link-do-programa.ufsm.br"
                />
                <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                  Cole links relevantes, documentos ou informações adicionais
                </p>
              </div>
            </div>
          </div>

          {erro && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8,
                padding: "12px 16px",
                color: "#f87171",
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              ⚠️ {erro}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={carregando}
              style={{ padding: "14px 32px", fontSize: 16 }}
            >
              {carregando ? (
                <>
                  <span className="pulse">⏳</span> Enviando...
                </>
              ) : (
                <>
                  Enviar Solicitação <IconArrow />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <footer
        style={{
          background: "var(--bg-secondary)",
          borderTop: "1px solid var(--border)",
          padding: "24px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        <strong style={{ color: "#4ade80" }}>Agenda Multiweb</strong> — Coordenadoria de Tecnologia Educacional (CTE) — UFSM
      </footer>
    </div>
  );
}
