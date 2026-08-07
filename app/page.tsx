"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

interface DiaHorario {
  data: string;
  horaInicio: string;
  horaFim: string;
}

export default function HomePage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<"TRANSMISSAO_EXTERNA" | "MINI_AUDITORIO">("TRANSMISSAO_EXTERNA");
  const [etapa, setEtapa] = useState<"form" | "sucesso">("form");
  const [codigoGerado, setCodigoGerado] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const [multiplosDias, setMultiplosDias] = useState(false);

  // Formulário base
  const [form, setForm] = useState({
    nomeSolicitante: "",
    emailSolicitante: "",
    tituloEvento: "",
    descricao: "",
    local: "",
    anexosLinks: "",
  });

  // Estado para Dia Único
  const [diaUnico, setDiaUnico] = useState<DiaHorario>({
    data: "",
    horaInicio: "08:00",
    horaFim: "12:00",
  });

  // Estado para Múltiplos Dias (Lista dinâmica)
  const [diasLista, setDiasLista] = useState<DiaHorario[]>([
    { data: "", horaInicio: "08:00", horaFim: "12:00" },
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErro("");
  };

  const adicionarDia = () => {
    setDiasLista((prev) => [...prev, { data: "", horaInicio: "08:00", horaFim: "12:00" }]);
  };

  const removerDia = (index: number) => {
    if (diasLista.length <= 1) return;
    setDiasLista((prev) => prev.filter((_, i) => i !== index));
  };

  const atualizarDiaLista = (index: number, campo: keyof DiaHorario, valor: string) => {
    setDiasLista((prev) => {
      const nova = [...prev];
      nova[index] = { ...nova[index], [campo]: valor };
      return nova;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro("");

    try {
      let dataInicioISO = "";
      let dataFimISO = "";
      let detalhamentoDiasTexto = "";

      if (!multiplosDias) {
        // Validação Dia Único
        if (!diaUnico.data || !diaUnico.horaInicio || !diaUnico.horaFim) {
          setErro("Informe a data e os horários de início e fim do evento.");
          setCarregando(false);
          return;
        }
        dataInicioISO = new Date(`${diaUnico.data}T${diaUnico.horaInicio}`).toISOString();
        dataFimISO = new Date(`${diaUnico.data}T${diaUnico.horaFim}`).toISOString();
      } else {
        // Validação Múltiplos Dias
        const diasValidos = diasLista.filter((d) => d.data && d.horaInicio && d.horaFim);
        if (diasValidos.length === 0) {
          setErro("Preencha ao menos uma data e horário para o evento.");
          setCarregando(false);
          return;
        }

        // Ordenar os dias por data
        diasValidos.sort((a, b) => new Date(`${a.data}T${a.horaInicio}`).getTime() - new Date(`${b.data}T${b.horaInicio}`).getTime());

        const primeiroDia = diasValidos[0];
        const ultimoDia = diasValidos[diasValidos.length - 1];

        dataInicioISO = new Date(`${primeiroDia.data}T${primeiroDia.horaInicio}`).toISOString();
        dataFimISO = new Date(`${ultimoDia.data}T${ultimoDia.horaFim}`).toISOString();

        detalhamentoDiasTexto = diasValidos
          .map((d, i) => `• Dia ${i + 1} (${new Date(`${d.data}T00:00`).toLocaleDateString("pt-BR")}): ${d.horaInicio} às ${d.horaFim}`)
          .join("\n");
      }

      const descricaoFinal = multiplosDias
        ? `📅 CRONOGRAMA DE MÚLTIPLOS DIAS:\n${detalhamentoDiasTexto}\n\n${form.descricao}`
        : form.descricao;

      let anexosLinksMeta = form.anexosLinks;
      if (multiplosDias) {
        const diasValidos = diasLista.filter((d) => d.data && d.horaInicio && d.horaFim);
        diasValidos.sort((a, b) => new Date(`${a.data}T${a.horaInicio}`).getTime() - new Date(`${b.data}T${b.horaInicio}`).getTime());

        anexosLinksMeta = JSON.stringify({
          diasAgendamento: diasValidos.map((d) => ({
            dataInicio: new Date(`${d.data}T${d.horaInicio}`).toISOString(),
            dataFim: new Date(`${d.data}T${d.horaFim}`).toISOString(),
          })),
          linkOriginal: form.anexosLinks || null,
        });
      }

      const payload = {
        ...form,
        anexosLinks: anexosLinksMeta,
        descricao: descricaoFinal,
        tipo,
        local: tipo === "MINI_AUDITORIO" ? "Prédio 14, Sala 109 – CTE/UFSM" : form.local,
        dataInicio: dataInicioISO,
        dataFim: dataFimISO,
      };

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
                setForm({ nomeSolicitante: "", emailSolicitante: "", tituloEvento: "", descricao: "", local: "", anexosLinks: "" });
                setDiaUnico({ data: "", horaInicio: "08:00", horaFim: "12:00" });
                setDiasLista([{ data: "", horaInicio: "08:00", horaFim: "12:00" }]);
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
          background: "linear-gradient(135deg, #001a0d, #003366)",
          borderBottom: "1px solid rgba(0, 102, 51, 0.3)",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justify: "space-between",
            height: 64,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: "linear-gradient(135deg, #006633, #008040)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justify: "center",
                fontSize: 18,
              }}
            >
              📅
            </div>
            <div>
              <div style={{ fontWeight: 800, color: "#f0f4ff", fontSize: 16, lineHeight: 1.2 }}>Agenda Multiweb</div>
              <div style={{ color: "#64748b", fontSize: 11, fontWeight: 500 }}>CTE – UFSM</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", marginLeft: "auto" }}>
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

      {/* Hero Section */}
      <div className="hero-gradient" style={{ padding: "60px 24px 40px", textAlign: "center" }}>
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
          <p style={{ color: "#94a3b8", fontSize: 16, maxWidth: 600, margin: "0 auto 32px" }}>
            APreencha o formulário abaixo para solicitar transmissões ao vivo ou reservar o Mini Auditório da CTE/UFSM.
          </p>

          {/* Seleção do Tipo de Serviço */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              maxWidth: 580,
              margin: "0 auto",
            }}
          >
            <button
              type="button"
              onClick={() => setTipo("TRANSMISSAO_EXTERNA")}
              style={{
                background: tipo === "TRANSMISSAO_EXTERNA" ? "rgba(0,102,51,0.25)" : "var(--bg-card)",
                border: `2px solid ${tipo === "TRANSMISSAO_EXTERNA" ? "#006633" : "var(--border)"}`,
                borderRadius: 12,
                padding: "20px 16px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, color: tipo === "TRANSMISSAO_EXTERNA" ? "#4ade80" : "#94a3b8" }}>
                <IconVideo />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Transmissão Externa</span>
              </div>
              <div style={{ fontWeight: 700, color: "#f0f4ff", fontSize: 14 }}>Transmissão ao Vivo</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Em qualquer prédio da UFSM</div>
            </button>

            <button
              type="button"
              onClick={() => setTipo("MINI_AUDITORIO")}
              style={{
                background: tipo === "MINI_AUDITORIO" ? "rgba(0,102,51,0.25)" : "var(--bg-card)",
                border: `2px solid ${tipo === "MINI_AUDITORIO" ? "#006633" : "var(--border)"}`,
                borderRadius: 12,
                padding: "20px 16px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, color: tipo === "MINI_AUDITORIO" ? "#4ade80" : "#94a3b8" }}>
                <IconMic />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Reserva de Espaço</span>
              </div>
              <div style={{ fontWeight: 700, color: "#f0f4ff", fontSize: 14 }}>Mini Auditório</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Prédio 14, Sala 109</div>
            </button>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 24px 80px" }}>
        <form onSubmit={handleSubmit} className="fade-in">
          {erro && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: 8,
                padding: "12px 16px",
                color: "#f87171",
                marginBottom: 20,
                fontSize: 14,
              }}
            >
              ⚠️ {erro}
            </div>
          )}

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

              {/* Seletor de Duração */}
              <div>
                <label className="label">Duração do Evento *</label>
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    type="button"
                    className={`btn ${!multiplosDias ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setMultiplosDias(false)}
                    style={{ flex: 1, fontSize: 13 }}
                  >
                    📆 Dia Único
                  </button>
                  <button
                    type="button"
                    className={`btn ${multiplosDias ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setMultiplosDias(true)}
                    style={{ flex: 1, fontSize: 13 }}
                  >
                    📅 Múltiplos Dias
                  </button>
                </div>
              </div>

              {/* Formulário de Data/Hora: DIA ÚNICO */}
              {!multiplosDias ? (
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 12, background: "rgba(0,102,51,0.06)", padding: 16, borderRadius: 8, border: "1px solid rgba(0,102,51,0.2)" }}>
                  <div>
                    <label className="label">Data do Evento *</label>
                    <input
                      className="input"
                      type="date"
                      value={diaUnico.data}
                      onChange={(e) => setDiaUnico(p => ({ ...p, data: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Hora de Início *</label>
                    <input
                      className="input"
                      type="time"
                      value={diaUnico.horaInicio}
                      onChange={(e) => setDiaUnico(p => ({ ...p, horaInicio: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Hora de Fim *</label>
                    <input
                      className="input"
                      type="time"
                      value={diaUnico.horaFim}
                      onChange={(e) => setDiaUnico(p => ({ ...p, horaFim: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              ) : (
                /* Formulário de Data/Hora: MÚLTIPLOS DIAS */
                <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "rgba(0,102,51,0.06)", padding: 16, borderRadius: 8, border: "1px solid rgba(0,102,51,0.2)" }}>
                  <label className="label">Datas e Horários dos Dias do Evento</label>
                  {diasLista.map((d, index) => (
                    <div key={index} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                      <div>
                        {index === 0 && <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>Data do Dia {index + 1}</label>}
                        <input
                          className="input"
                          type="date"
                          value={d.data}
                          onChange={(e) => atualizarDiaLista(index, "data", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        {index === 0 && <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>Hora Início</label>}
                        <input
                          className="input"
                          type="time"
                          value={d.horaInicio}
                          onChange={(e) => atualizarDiaLista(index, "horaInicio", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        {index === 0 && <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>Hora Fim</label>}
                        <input
                          className="input"
                          type="time"
                          value={d.horaFim}
                          onChange={(e) => atualizarDiaLista(index, "horaFim", e.target.value)}
                          required
                        />
                      </div>
                      {diasLista.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => removerDia(index)}
                          style={{ padding: "10px 12px" }}
                          title="Remover este dia"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={adicionarDia}
                    style={{ alignSelf: "flex-start", marginTop: 8, fontSize: 13 }}
                  >
                    ➕ Adicionar Outro Dia
                  </button>
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
                    placeholder="Ex: Prédio 26, Auditório do Anexo I (CT)"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="label">Local Reservado</label>
                  <input
                    className="input"
                    value="Prédio 14, Sala 109 – CTE/UFSM"
                    disabled
                    style={{ opacity: 0.8 }}
                  />
                </div>
              )}

              <div>
                <label className="label">Descrição / Observações (opcional)</label>
                <textarea
                  className="input"
                  name="descricao"
                  value={form.descricao}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Informe detalhes como estimativa de público, necessidade de microfones sem fio ou observações sobre a transmissão..."
                />
              </div>

              <div>
                <label className="label">Link para Programação / Arquivos (opcional)</label>
                <input
                  className="input"
                  name="anexosLinks"
                  value={form.anexosLinks}
                  onChange={handleChange}
                  placeholder="Ex: https://drive.google.com/file/d/... (Link do edital/programação)"
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={carregando}
              style={{ padding: "14px 32px", fontSize: 16 }}
            >
              {carregando ? "⏳ Enviando Solicitação..." : "Enviar Solicitação ➤"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
