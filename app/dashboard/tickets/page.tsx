"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const STATUS_FILTROS = ["", "ABERTO", "EM_ANALISE", "ACEITO", "RECUSADO", "FINALIZADO"];
const STATUS_LABELS: Record<string, string> = {
  "": "Todos os Status",
  ABERTO: "Em Aberto",
  EM_ANALISE: "Em Análise",
  ACEITO: "Aceito",
  RECUSADO: "Recusado",
  FINALIZADO: "Concluído (Evento Realizado)",
};

const TIPO_LABELS: Record<string, string> = {
  "": "Todos os Tipos",
  TRANSMISSAO_EXTERNA: "Transmissão Externa",
  MINI_AUDITORIO: "Mini Auditório",
};

function badgeStatus(status: string) {
  const map: Record<string, string> = {
    ABERTO: "badge badge-aberto",
    EM_ANALISE: "badge badge-analise",
    ACEITO: "badge badge-aceito",
    RECUSADO: "badge badge-recusado",
    FINALIZADO: "badge badge-finalizado",
  };
  return map[status] ?? "badge";
}

function formatarData(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface Ticket {
  id: string;
  codigo: string;
  tipo: string;
  status: string;
  nomeSolicitante: string;
  emailSolicitante: string;
  tituloEvento: string;
  dataInicio: string;
  dataFim: string;
  local: string;
  criadoEm: string;
  _count: { mensagens: number };
}

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [abaArquivado, setAbaArquivado] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [processandoBulk, setProcessandoBulk] = useState(false);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);

  const buscarTickets = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (statusFiltro) params.set("status", statusFiltro);
      if (tipoFiltro) params.set("tipo", tipoFiltro);
      if (busca) params.set("busca", busca);
      if (dataDe) params.set("dataDe", dataDe);
      if (dataAte) params.set("dataAte", dataAte);
      if (abaArquivado) params.set("arquivado", "true");
      params.set("pagina", String(pagina));

      const res = await fetch(`/api/tickets?${params.toString()}`);
      const data = await res.json();
      setTickets(data.tickets ?? []);
      setTotal(data.paginacao?.total ?? 0);
      setSelecionados([]);
    } finally {
      setCarregando(false);
    }
  }, [statusFiltro, tipoFiltro, busca, dataDe, dataAte, abaArquivado, pagina]);

  useEffect(() => { buscarTickets(); }, [buscarTickets]);

  const toggleSelecionarTudo = () => {
    if (selecionados.length === tickets.length) {
      setSelecionados([]);
    } else {
      setSelecionados(tickets.map((t) => t.id));
    }
  };

  const toggleSelecionar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const executarAcaoMassa = async (acao: "arquivar" | "desarquivar" | "finalizar" | "excluir") => {
    if (selecionados.length === 0) return;
    if (acao === "excluir" && !confirm(`Tem certeza que deseja excluir permanentemente ${selecionados.length} ticket(s)?`)) return;

    setProcessandoBulk(true);
    try {
      await fetch("/api/tickets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selecionados, acao }),
      });
      await buscarTickets();
    } finally {
      setProcessandoBulk(false);
    }
  };

  return (
    <div style={{ padding: "32px 32px 64px" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f0f4ff", marginBottom: 4 }}>🎫 Tickets</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>{total} solicitações encontradas</p>
        </div>

        {/* Abas Ativos / Arquivados */}
        <div style={{ display: "flex", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <button
            onClick={() => { setAbaArquivado(false); setPagina(1); }}
            style={{
              background: !abaArquivado ? "rgba(0,102,51,0.3)" : "none",
              border: "none", cursor: "pointer", padding: "8px 16px", fontSize: 13, fontWeight: 600,
              color: !abaArquivado ? "#4ade80" : "#64748b", transition: "all 0.15s",
            }}
          >
            📋 Ativos
          </button>
          <button
            onClick={() => { setAbaArquivado(true); setPagina(1); }}
            style={{
              background: abaArquivado ? "rgba(0,102,51,0.3)" : "none",
              border: "none", cursor: "pointer", padding: "8px 16px", fontSize: 13, fontWeight: 600,
              color: abaArquivado ? "#4ade80" : "#64748b", transition: "all 0.15s",
            }}
          >
            🗄️ Arquivados
          </button>
        </div>
      </div>

      {/* Barra de Busca Global e Filtros Avançados */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {/* Busca instantânea */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <input
              className="input"
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
              placeholder="🔍 Buscar por código (MW-...), solicitante, e-mail ou evento..."
            />
          </div>

          <select
            className="input"
            value={statusFiltro}
            onChange={(e) => { setStatusFiltro(e.target.value); setPagina(1); }}
            style={{ width: "auto", minWidth: 160 }}
          >
            {STATUS_FILTROS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <select
            className="input"
            value={tipoFiltro}
            onChange={(e) => { setTipoFiltro(e.target.value); setPagina(1); }}
            style={{ width: "auto", minWidth: 180 }}
          >
            {Object.entries(TIPO_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          {/* Filtro por Intervalo de Data */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>De:</span>
            <input
              type="date"
              className="input"
              value={dataDe}
              onChange={(e) => { setDataDe(e.target.value); setPagina(1); }}
              style={{ width: "auto" }}
            />
            <span style={{ fontSize: 12, color: "#64748b" }}>Até:</span>
            <input
              type="date"
              className="input"
              value={dataAte}
              onChange={(e) => { setDataAte(e.target.value); setPagina(1); }}
              style={{ width: "auto" }}
            />
          </div>

          {(statusFiltro || tipoFiltro || busca || dataDe || dataAte) && (
            <button
              className="btn btn-secondary"
              onClick={() => { setStatusFiltro(""); setTipoFiltro(""); setBusca(""); setDataDe(""); setDataAte(""); setPagina(1); }}
              style={{ fontSize: 12 }}
            >
              ✕ Limpar
            </button>
          )}

          <button className="btn btn-secondary" onClick={buscarTickets} style={{ fontSize: 12 }}>
            🔄
          </button>
        </div>
      </div>

      {/* Barra Flutuante de Ações em Massa */}
      {selecionados.length > 0 && (
        <div className="card fade-in" style={{ marginBottom: 16, background: "rgba(0,102,51,0.15)", borderColor: "rgba(0,102,51,0.4)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 14 }}>
            ☑️ {selecionados.length} ticket(s) selecionado(s)
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!abaArquivado ? (
              <>
                <button className="btn btn-secondary" onClick={() => executarAcaoMassa("arquivar")} disabled={processandoBulk} style={{ fontSize: 12 }}>
                  🗄️ Arquivar
                </button>
                <button className="btn btn-secondary" onClick={() => executarAcaoMassa("finalizar")} disabled={processandoBulk} style={{ fontSize: 12 }}>
                  ✅ Concluir
                </button>
              </>
            ) : (
              <button className="btn btn-secondary" onClick={() => executarAcaoMassa("desarquivar")} disabled={processandoBulk} style={{ fontSize: 12 }}>
                📥 Desarquivar
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => executarAcaoMassa("excluir")} disabled={processandoBulk} style={{ fontSize: 12, color: "#f87171", borderColor: "rgba(239,68,68,0.4)" }}>
              🗑️ Excluir
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {carregando ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
            <div className="pulse" style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            Carregando tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p>Nenhum ticket encontrado {abaArquivado ? "nos arquivados" : "com os filtros selecionados"}.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selecionados.length === tickets.length && tickets.length > 0}
                      onChange={toggleSelecionarTudo}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Solicitante</th>
                  <th>Evento</th>
                  <th>Data/Hora</th>
                  <th>Status</th>
                  <th>Msgs</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}>
                    <td style={{ textAlign: "center" }} onClick={(e) => toggleSelecionar(ticket.id, e)}>
                      <input
                        type="checkbox"
                        checked={selecionados.includes(ticket.id)}
                        onChange={() => {}}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#4ade80", fontSize: 13 }}>
                        {ticket.codigo}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${ticket.tipo === "TRANSMISSAO_EXTERNA" ? "badge-transmissao" : "badge-auditorio"}`}>
                        {ticket.tipo === "TRANSMISSAO_EXTERNA" ? "📡 Transmissão" : "🎤 Auditório"}
                      </span>
                    </td>
                    <td style={{ color: "#94a3b8", fontSize: 13 }}>
                      <div>{ticket.nomeSolicitante}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{ticket.emailSolicitante}</div>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ fontWeight: 600, color: "#f0f4ff", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ticket.tituloEvento}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{ticket.local}</div>
                    </td>
                    <td style={{ color: "#94a3b8", fontSize: 12 }}>
                      <div>{formatarData(ticket.dataInicio)}</div>
                      <div style={{ color: "#64748b" }}>→ {formatarData(ticket.dataFim)}</div>
                    </td>
                    <td>
                      <span className={badgeStatus(ticket.status)}>
                        {STATUS_LABELS[ticket.status] ?? ticket.status}
                      </span>
                    </td>
                    <td>
                      {ticket._count.mensagens > 0 && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 12, padding: "2px 8px", fontSize: 11, color: "#60a5fa", fontWeight: 700 }}>
                          <span className="unread-dot" /> {ticket._count.mensagens}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/tickets/${ticket.id}`); }}
                        style={{ fontSize: 12, padding: "6px 12px" }}
                      >
                        Ver →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {total > 20 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          <button className="btn btn-secondary" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>
            ← Anterior
          </button>
          <span style={{ color: "#94a3b8", padding: "10px 16px", fontSize: 14 }}>
            Página {pagina} de {Math.ceil(total / 20)}
          </span>
          <button className="btn btn-secondary" disabled={pagina >= Math.ceil(total / 20)} onClick={() => setPagina(p => p + 1)}>
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
