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
  FINALIZADO: "Finalizado",
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
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);

  const buscarTickets = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (statusFiltro) params.set("status", statusFiltro);
      if (tipoFiltro) params.set("tipo", tipoFiltro);
      params.set("pagina", String(pagina));

      const res = await fetch(`/api/tickets?${params.toString()}`);
      const data = await res.json();
      setTickets(data.tickets ?? []);
      setTotal(data.paginacao?.total ?? 0);
    } finally {
      setCarregando(false);
    }
  }, [statusFiltro, tipoFiltro, pagina]);

  useEffect(() => { buscarTickets(); }, [buscarTickets]);

  // Resumo de contagens por status
  const contagens = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ padding: "32px 32px 64px" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f0f4ff", marginBottom: 4 }}>🎫 Tickets</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>{total} solicitações no total</p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <select
          className="input"
          value={statusFiltro}
          onChange={(e) => { setStatusFiltro(e.target.value); setPagina(1); }}
          style={{ width: "auto", minWidth: 180 }}
        >
          {STATUS_FILTROS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          className="input"
          value={tipoFiltro}
          onChange={(e) => { setTipoFiltro(e.target.value); setPagina(1); }}
          style={{ width: "auto", minWidth: 200 }}
        >
          {Object.entries(TIPO_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        {(statusFiltro || tipoFiltro) && (
          <button
            className="btn btn-secondary"
            onClick={() => { setStatusFiltro(""); setTipoFiltro(""); setPagina(1); }}
            style={{ fontSize: 13 }}
          >
            ✕ Limpar filtros
          </button>
        )}
        <button className="btn btn-secondary" onClick={buscarTickets} style={{ marginLeft: "auto", fontSize: 13 }}>
          🔄 Atualizar
        </button>
      </div>

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
            <p>Nenhum ticket encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
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
