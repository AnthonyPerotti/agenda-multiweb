"use client";

import { useState, useEffect, useCallback } from "react";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

interface Evento {
  id: string;
  titulo: string;
  tipo: string;
  dataInicio: string;
  dataFim: string;
  local: string;
  descricao?: string;
  googleEventId?: string;
  ticket?: { codigo: string; nomeSolicitante: string } | null;
  responsaveis: { usuario: { id: string; nome: string } }[];
}

interface EventoModal {
  evento: Evento;
  editando: boolean;
}

function formatarHora(data: string) {
  return new Date(data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatarDataCurta(data: string) {
  return new Date(data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function isMesmoDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

export default function AgendaPage() {
  const [view, setView] = useState<"mes" | "semana" | "dia">("mes");
  const [dataAtual, setDataAtual] = useState(new Date());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [eventoModal, setEventoModal] = useState<EventoModal | null>(null);
  const [editForm, setEditForm] = useState<Partial<Evento>>({});
  const [salvando, setSalvando] = useState(false);

  // Estado do Modal de Criar Evento Manual
  const [modalNovoEvento, setModalNovoEvento] = useState(false);
  const [novoEvento, setNovoEvento] = useState({
    titulo: "",
    tipo: "TRANSMISSAO_EXTERNA",
    dataInicio: "",
    dataFim: "",
    local: "",
    descricao: "",
  });
  const [criandoManual, setCriandoManual] = useState(false);
  const [erroManual, setErroManual] = useState("");

  const buscarEventos = useCallback(async () => {
    setCarregando(true);
    try {
      const inicio = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 1, 1);
      const fim = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 2, 0);
      const res = await fetch(`/api/eventos?inicio=${inicio.toISOString()}&fim=${fim.toISOString()}`);
      const data = await res.json();
      setEventos(data.eventos ?? []);
    } finally {
      setCarregando(false);
    }
  }, [dataAtual]);

  useEffect(() => { buscarEventos(); }, [buscarEventos]);

  const navegar = (direcao: 1 | -1) => {
    const nova = new Date(dataAtual);
    if (view === "mes") nova.setMonth(nova.getMonth() + direcao);
    else if (view === "semana") nova.setDate(nova.getDate() + 7 * direcao);
    else nova.setDate(nova.getDate() + direcao);
    setDataAtual(nova);
  };

  const hoje = new Date();

  // Título do período atual
  const tituloPeriodo = () => {
    if (view === "mes") return `${MESES[dataAtual.getMonth()]} ${dataAtual.getFullYear()}`;
    if (view === "semana") {
      const seg = new Date(dataAtual);
      seg.setDate(seg.getDate() - seg.getDay() + 1);
      const sab = new Date(seg); sab.setDate(seg.getDate() + 6);
      return `${formatarDataCurta(seg.toISOString())} – ${formatarDataCurta(sab.toISOString())}`;
    }
    return dataAtual.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  };

  // Eventos de um dia específico
  const eventosNoDia = (dia: Date) =>
    eventos.filter((e) => {
      const inicio = new Date(e.dataInicio);
      const fim = new Date(e.dataFim);
      return inicio <= dia && fim >= dia || isMesmoDay(inicio, dia);
    });

  // Salvar edição de evento
  const salvarEvento = async () => {
    if (!eventoModal) return;
    setSalvando(true);
    try {
      await fetch(`/api/eventos/${eventoModal.evento.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: editForm.titulo,
          descricao: editForm.descricao,
          local: editForm.local,
          dataInicio: editForm.dataInicio,
          dataFim: editForm.dataFim,
        }),
      });
      setEventoModal(null);
      await buscarEventos();
    } finally {
      setSalvando(false);
    }
  };

  const removerEvento = async () => {
    if (!eventoModal || !confirm("Remover este evento da agenda?")) return;
    await fetch(`/api/eventos/${eventoModal.evento.id}`, { method: "DELETE" });
    setEventoModal(null);
    await buscarEventos();
  };

  // Criar evento manual
  const criarEventoManual = async () => {
    setErroManual("");
    if (!novoEvento.titulo || !novoEvento.dataInicio || !novoEvento.dataFim || !novoEvento.local) {
      setErroManual("Preencha todos os campos obrigatórios");
      return;
    }
    setCriandoManual(true);
    try {
      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: novoEvento.titulo,
          tipo: novoEvento.tipo,
          dataInicio: new Date(novoEvento.dataInicio).toISOString(),
          dataFim: new Date(novoEvento.dataFim).toISOString(),
          local: novoEvento.local,
          descricao: novoEvento.descricao,
        }),
      });
      if (res.ok) {
        setModalNovoEvento(false);
        setNovoEvento({ titulo: "", tipo: "TRANSMISSAO_EXTERNA", dataInicio: "", dataFim: "", local: "", descricao: "" });
        await buscarEventos();
      } else {
        const data = await res.json();
        setErroManual(data.erro ?? "Erro ao criar evento");
      }
    } finally {
      setCriandoManual(false);
    }
  };

  // Calendário mensal
  const renderMes = () => {
    const primeiroDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    const ultimoDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0);
    const inicioGrid = new Date(primeiroDia); inicioGrid.setDate(inicioGrid.getDate() - primeiroDia.getDay());
    const diasGrid: Date[] = [];
    const cursor = new Date(inicioGrid);
    while (cursor <= ultimoDia || diasGrid.length % 7 !== 0) {
      diasGrid.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
      if (diasGrid.length > 42) break;
    }

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 1 }}>
          {DIAS_SEMANA.map((d) => (
            <div key={d} style={{ textAlign: "center", padding: "8px 0", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
          {diasGrid.map((dia, i) => {
            const mesAtual = dia.getMonth() === dataAtual.getMonth();
            const ehHoje = isMesmoDay(dia, hoje);
            const evsDia = eventosNoDia(dia);
            return (
              <div
                key={i}
                style={{
                  minHeight: 100,
                  background: ehHoje ? "rgba(0,102,51,0.12)" : mesAtual ? "var(--bg-card)" : "rgba(17,24,39,0.5)",
                  border: ehHoje ? "1px solid rgba(0,102,51,0.5)" : "1px solid var(--border-light)",
                  borderRadius: 6,
                  padding: "6px 8px",
                  cursor: "default",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: ehHoje ? 800 : 500, color: ehHoje ? "#4ade80" : mesAtual ? "#94a3b8" : "#374151", marginBottom: 4 }}>
                  {dia.getDate()}
                </div>
                {evsDia.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    className={`cal-event ${ev.tipo === "TRANSMISSAO_EXTERNA" ? "cal-event-transmissao" : "cal-event-auditorio"}`}
                    style={{ marginBottom: 2 }}
                    onClick={() => { setEventoModal({ evento: ev, editando: false }); setEditForm(ev); }}
                    title={`${ev.titulo} — ${formatarHora(ev.dataInicio)}`}
                  >
                    {formatarHora(ev.dataInicio)} {ev.titulo}
                  </div>
                ))}
                {evsDia.length > 2 && (
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>+{evsDia.length - 2} mais</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Calendário semanal
  const renderSemana = () => {
    const seg = new Date(dataAtual);
    seg.setDate(seg.getDate() - seg.getDay() + 1);
    const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(seg); d.setDate(seg.getDate() + i); return d; });

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {dias.map((dia, i) => {
          const ehHoje = isMesmoDay(dia, hoje);
          const evsDia = eventosNoDia(dia);
          return (
            <div key={i} style={{ minHeight: 400 }}>
              <div style={{ textAlign: "center", padding: "8px 0 12px", fontSize: 12, fontWeight: 700, color: ehHoje ? "#4ade80" : "#64748b" }}>
                <div>{DIAS_SEMANA[dia.getDay()]}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: ehHoje ? "#4ade80" : "#f0f4ff" }}>{dia.getDate()}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {evsDia.map((ev) => (
                  <div
                    key={ev.id}
                    className={`cal-event ${ev.tipo === "TRANSMISSAO_EXTERNA" ? "cal-event-transmissao" : "cal-event-auditorio"}`}
                    onClick={() => { setEventoModal({ evento: ev, editando: false }); setEditForm(ev); }}
                    style={{ whiteSpace: "normal", fontSize: 11 }}
                  >
                    <div style={{ fontWeight: 700 }}>{formatarHora(ev.dataInicio)}</div>
                    <div>{ev.titulo}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Calendário diário
  const renderDia = () => {
    const evsDia = eventosNoDia(dataAtual);
    return (
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f0f4ff", marginBottom: 16, textAlign: "center" }}>
          {dataAtual.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        {evsDia.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            Nenhum evento neste dia.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {evsDia.map((ev) => (
              <div
                key={ev.id}
                className="card"
                style={{ borderLeft: `4px solid ${ev.tipo === "TRANSMISSAO_EXTERNA" ? "#0ea5e9" : "#a855f7"}`, cursor: "pointer" }}
                onClick={() => { setEventoModal({ evento: ev, editando: false }); setEditForm(ev); }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#f0f4ff", marginBottom: 4 }}>{ev.titulo}</div>
                    <div style={{ color: "#94a3b8", fontSize: 13 }}>🕐 {formatarHora(ev.dataInicio)} – {formatarHora(ev.dataFim)}</div>
                    <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>📍 {ev.local}</div>
                  </div>
                  <span className={`badge ${ev.tipo === "TRANSMISSAO_EXTERNA" ? "badge-transmissao" : "badge-auditorio"}`}>
                    {ev.tipo === "TRANSMISSAO_EXTERNA" ? "📡 Transmissão" : "🎤 Auditório"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: "32px 32px 64px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f0f4ff", marginBottom: 4 }}>📅 Agenda</h1>
          <div style={{ display: "flex", gap: 12 }}>
            <span className="badge badge-transmissao">📡 Transmissão Externa</span>
            <span className="badge badge-auditorio">🎤 Mini Auditório</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Botão Novo Evento Manual */}
          <button className="btn btn-primary" onClick={() => setModalNovoEvento(true)} style={{ fontSize: 13, gap: 6 }}>
            ➕ Novo Evento Manual
          </button>

          {/* Seletor de view */}
          <div style={{ display: "flex", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {(["dia", "semana", "mes"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  background: view === v ? "rgba(0,102,51,0.3)" : "none",
                  border: "none", cursor: "pointer",
                  padding: "8px 16px", fontSize: 13, fontWeight: 600,
                  color: view === v ? "#4ade80" : "#64748b",
                  transition: "all 0.15s",
                  textTransform: "capitalize",
                }}
              >
                {v === "dia" ? "Dia" : v === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
          {/* Navegação */}
          <button className="btn btn-secondary" onClick={() => navegar(-1)}>◀</button>
          <button className="btn btn-secondary" onClick={() => setDataAtual(new Date())} style={{ fontSize: 13 }}>Hoje</button>
          <button className="btn btn-secondary" onClick={() => navegar(1)}>▶</button>
          <button className="btn btn-secondary" onClick={buscarEventos} style={{ fontSize: 13 }}>🔄</button>
        </div>
      </div>

      {/* Título do período */}
      <div style={{ fontSize: 20, fontWeight: 700, color: "#f0f4ff", textAlign: "center", marginBottom: 20 }}>
        {tituloPeriodo()}
      </div>

      {/* Calendário */}
      <div className="card" style={{ padding: view === "mes" ? 12 : 20 }}>
        {carregando ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
            <div className="pulse" style={{ fontSize: 32 }}>⏳</div>
          </div>
        ) : view === "mes" ? renderMes() : view === "semana" ? renderSemana() : renderDia()}
      </div>

      {/* Modal de Criar Evento Manual */}
      {modalNovoEvento && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
          <div className="glass-card fade-in" style={{ maxWidth: 540, width: "100%", padding: 32, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f0f4ff" }}>➕ Adicionar Evento Manual</h2>
              <button onClick={() => setModalNovoEvento(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 20 }}>✕</button>
            </div>

            {erroManual && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", marginBottom: 16, fontSize: 13 }}>
                ⚠️ {erroManual}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="label">Título do Evento *</label>
                <input
                  className="input"
                  value={novoEvento.titulo}
                  onChange={(e) => setNovoEvento(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="ex: Transmissão da Aula Inaugural / Evento Interno CTE"
                />
              </div>

              <div>
                <label className="label">Tipo de Serviço *</label>
                <select
                  className="input"
                  value={novoEvento.tipo}
                  onChange={(e) => setNovoEvento(p => ({ ...p, tipo: e.target.value }))}
                >
                  <option value="TRANSMISSAO_EXTERNA">📡 Transmissão Externa (Prédios UFSM)</option>
                  <option value="MINI_AUDITORIO">🎤 Mini Auditório (Prédio 14, Sala 109)</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Data & Hora de Início *</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={novoEvento.dataInicio}
                    onChange={(e) => setNovoEvento(p => ({ ...p, dataInicio: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Data & Hora de Fim *</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={novoEvento.dataFim}
                    onChange={(e) => setNovoEvento(p => ({ ...p, dataFim: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Local *</label>
                <input
                  className="input"
                  value={novoEvento.local}
                  onChange={(e) => setNovoEvento(p => ({ ...p, local: e.target.value }))}
                  placeholder="ex: Prédio 14, Sala 109 ou Auditório do CT"
                />
              </div>

              <div>
                <label className="label">Descrição / Observações (opcional)</label>
                <textarea
                  className="input"
                  value={novoEvento.descricao}
                  onChange={(e) => setNovoEvento(p => ({ ...p, descricao: e.target.value }))}
                  rows={3}
                  placeholder="Detalhes adicionais do evento presencial ou agendamento interno..."
                />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setModalNovoEvento(false)} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={criarEventoManual} disabled={criandoManual} style={{ flex: 1 }}>
                  {criandoManual ? "⏳ Criando..." : "Salvar na Agenda"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualizar/Editar Evento */}
      {eventoModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
          <div className="glass-card" style={{ maxWidth: 560, width: "100%", padding: 32, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <span className={`badge ${eventoModal.evento.tipo === "TRANSMISSAO_EXTERNA" ? "badge-transmissao" : "badge-auditorio"}`}>
                {eventoModal.evento.tipo === "TRANSMISSAO_EXTERNA" ? "📡 Transmissão" : "🎤 Auditório"}
              </span>
              <button onClick={() => setEventoModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 20 }}>✕</button>
            </div>

            {eventoModal.editando ? (
              // Formulário de edição
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label className="label">Título</label>
                  <input className="input" value={editForm.titulo ?? ""} onChange={(e) => setEditForm(p => ({ ...p, titulo: e.target.value }))} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="label">Início</label>
                    <input className="input" type="datetime-local" value={editForm.dataInicio ? new Date(editForm.dataInicio).toISOString().slice(0, 16) : ""} onChange={(e) => setEditForm(p => ({ ...p, dataInicio: new Date(e.target.value).toISOString() }))} />
                  </div>
                  <div>
                    <label className="label">Fim</label>
                    <input className="input" type="datetime-local" value={editForm.dataFim ? new Date(editForm.dataFim).toISOString().slice(0, 16) : ""} onChange={(e) => setEditForm(p => ({ ...p, dataFim: new Date(e.target.value).toISOString() }))} />
                  </div>
                </div>
                <div>
                  <label className="label">Local</label>
                  <input className="input" value={editForm.local ?? ""} onChange={(e) => setEditForm(p => ({ ...p, local: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Descrição</label>
                  <textarea className="input" value={editForm.descricao ?? ""} onChange={(e) => setEditForm(p => ({ ...p, descricao: e.target.value }))} rows={3} />
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button className="btn btn-secondary" onClick={() => setEventoModal(p => p ? { ...p, editando: false } : null)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={salvarEvento} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
                </div>
              </div>
            ) : (
              // Visualização
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f0f4ff", marginBottom: 16 }}>{eventoModal.evento.titulo}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { i: "🕐", v: `${formatarHora(eventoModal.evento.dataInicio)} – ${formatarHora(eventoModal.evento.dataFim)}` },
                    { i: "📅", v: new Date(eventoModal.evento.dataInicio).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) },
                    { i: "📍", v: eventoModal.evento.local },
                    ...(eventoModal.evento.ticket ? [{ i: "🎫", v: `Ticket #${eventoModal.evento.ticket.codigo} — ${eventoModal.evento.ticket.nomeSolicitante}` }] : []),
                    ...(eventoModal.evento.googleEventId ? [{ i: "🔄", v: "Sincronizado com Google Calendar" }] : []),
                  ].map(({ i, v }) => (
                    <div key={v} style={{ display: "flex", gap: 10, color: "#94a3b8", fontSize: 14 }}>
                      <span>{i}</span><span>{v}</span>
                    </div>
                  ))}
                  {eventoModal.evento.descricao && (
                    <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--border)", color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>
                      {eventoModal.evento.descricao}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                  <button className="btn btn-secondary" onClick={() => setEventoModal(p => p ? { ...p, editando: true } : null)}>✏️ Editar</button>
                  <button className="btn btn-danger" onClick={removerEvento} style={{ marginLeft: "auto" }}>🗑️ Remover</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
