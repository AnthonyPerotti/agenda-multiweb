"use client";

import { useState, useEffect, useCallback } from "react";

interface RelatorioData {
  resumo: {
    totalTickets: number;
    totalEventos: number;
    aceitos: number;
    recusados: number;
    abertos: number;
    finalizados: number;
    taxaAprovacao: number;
  };
  porTipo: Record<string, number>;
  evolucaoMensal: Array<{ mes: string; qtd: number }>;
}

export default function RelatoriosPage() {
  const [data, setData] = useState<RelatorioData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<string>("TODOS");

  const buscarRelatorios = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch(`/api/relatorios?tipo=${tipoFiltro}`);
      const d = await res.json();
      setData(d);
    } finally {
      setCarregando(false);
    }
  }, [tipoFiltro]);

  useEffect(() => {
    buscarRelatorios();
  }, [buscarRelatorios]);

  const exportarCSV = () => {
    if (!data) return;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Métrica,Valor\n" +
      `Filtro Selecionado,${tipoFiltro}\n` +
      `Total de Tickets,${data.resumo.totalTickets}\n` +
      `Total de Eventos na Agenda,${data.resumo.totalEventos}\n` +
      `Taxa de Aprovação,${data.resumo.taxaAprovacao}%\n` +
      `Tickets Aceitos,${data.resumo.aceitos}\n` +
      `Tickets Finalizados,${data.resumo.finalizados}\n` +
      `Tickets Recusados,${data.resumo.recusados}\n` +
      `Tickets Em Aberto,${data.resumo.abertos}\n\n` +
      "Tipo de Evento,Quantidade\n" +
      `Transmissão Externa,${data.porTipo.TRANSMISSAO_EXTERNA ?? 0}\n` +
      `Mini Auditório,${data.porTipo.MINI_AUDITORIO ?? 0}\n` +
      `Colação / Formatura,${data.porTipo.COLACAO_FORMATURA ?? 0}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio-cte-${tipoFiltro.toLowerCase()}-${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const imprimirPDF = () => {
    window.print();
  };

  const resumo = data?.resumo ?? {
    totalTickets: 0, totalEventos: 0, aceitos: 0, recusados: 0, abertos: 0, finalizados: 0, taxaAprovacao: 0,
  };

  const maxMensal = Math.max(...(data?.evolucaoMensal.map((m) => m.qtd) ?? [1]), 1);

  const rotuloFiltro =
    tipoFiltro === "TRANSMISSAO_EXTERNA"
      ? "📡 Apenas Transmissão Externa"
      : tipoFiltro === "MINI_AUDITORIO"
      ? "🎤 Apenas Mini Auditório (Sala 109)"
      : tipoFiltro === "COLACAO_FORMATURA"
      ? "🎓 Apenas Colação / Formatura"
      : "🌐 Todos os Tipos de Agendamento";

  return (
    <div style={{ padding: "32px 32px 64px" }}>
      {/* Header visível APENAS na impressão PDF */}
      <div className="print-only" style={{ marginBottom: 24, borderBottom: "2px solid #006633", paddingBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#006633", margin: 0 }}>
              UNIVERSIDADE FEDERAL DE SANTA MARIA - UFSM
            </h2>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#334155", margin: "2px 0 0" }}>
              Coordenadoria de Tecnologia Educacional (CTE) — Agenda Multiweb
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: "#64748b" }}>
            <div>Emissão: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
            <div style={{ fontWeight: 700, color: "#006633", marginTop: 2 }}>{rotuloFiltro}</div>
          </div>
        </div>
      </div>

      {/* Cabeçalho da página (Ocultado na impressão PDF) */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f0f4ff", marginBottom: 4 }}>📊 Relatórios & Estatísticas CTE</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>Indicadores de desempenho e métricas da Agenda Multiweb</p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={exportarCSV} style={{ fontSize: 13, gap: 6 }}>
            📥 Exportar CSV
          </button>
          <button className="btn btn-primary" onClick={imprimirPDF} style={{ fontSize: 13, gap: 6 }}>
            🖨️ Imprimir Relatório (PDF)
          </button>
        </div>
      </div>

      {/* Barra de Filtro por Tipo de Solicitação (Ocultada na impressão PDF) */}
      <div className="card no-print" style={{ marginBottom: 24, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>🎯 Filtrar por Tipo:</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { id: "TODOS", label: "🌐 Todos os Tipos" },
              { id: "TRANSMISSAO_EXTERNA", label: "📡 Transmissão Externa" },
              { id: "MINI_AUDITORIO", label: "🎤 Mini Auditório" },
              { id: "COLACAO_FORMATURA", label: "🎓 Colação / Formatura" },
            ].map((op) => (
              <button
                key={op.id}
                onClick={() => setTipoFiltro(op.id)}
                className={`btn ${tipoFiltro === op.id ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: 12, padding: "6px 14px" }}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {carregando ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", color: "#64748b" }}>
          <div className="pulse" style={{ fontSize: 32 }}>⏳ Carregando relatórios...</div>
        </div>
      ) : (
        <>
          {/* Indicador de Filtro Selecionado */}
          <div style={{ marginBottom: 16, fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>
            Exibindo dados para: <span style={{ color: "#4ade80" }}>{rotuloFiltro}</span>
          </div>

          {/* Cards de Indicadores (KPIs) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Total de Solicitações", valor: resumo.totalTickets, cor: "#60a5fa", icone: "🎫" },
              { label: "Eventos na Agenda", valor: resumo.totalEventos, cor: "#4ade80", icone: "📅" },
              { label: "Taxa de Aprovação", valor: `${resumo.taxaAprovacao}%`, cor: "#38bdf8", icone: "📈" },
              { label: "Aceitos / Concluídos", valor: resumo.aceitos + resumo.finalizados, cor: "#22c55e", icone: "🟢" },
              { label: "Em Aberto", valor: resumo.abertos, cor: "#fbbf24", icone: "🟡" },
              { label: "Recusados", valor: resumo.recusados, cor: "#f87171", icone: "🔴" },
            ].map((kpi) => (
              <div key={kpi.label} className="card" style={{ borderLeft: `4px solid ${kpi.cor}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{kpi.label}</span>
                  <span style={{ fontSize: 18 }}>{kpi.icone}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#f0f4ff" }}>{kpi.valor}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, flexWrap: "wrap" }}>
            {/* Gráfico de Barras — Evolução Mensal */}
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff", marginBottom: 20 }}>
                📅 Evolução de Solicitações (Últimos 6 Meses)
              </h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 200, paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
                {data?.evolucaoMensal.map((item) => {
                  const pct = (item.qtd / maxMensal) * 100;
                  return (
                    <div key={item.mes} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 700, marginBottom: 4 }}>
                        {item.qtd}
                      </span>
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 36,
                          height: `${Math.max(pct, 4)}%`,
                          background: "linear-gradient(180deg, #006633, #008040)",
                          borderRadius: "6px 6px 0 0",
                          transition: "height 0.3s ease",
                        }}
                      />
                      <span style={{ fontSize: 11, color: "#64748b", marginTop: 8, textTransform: "capitalize" }}>
                        {item.mes}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distribuição por Tipo de Evento */}
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff", marginBottom: 20 }}>
                📡 Distribuição por Tipo de Agendamento
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  {
                    label: "📡 Transmissão Externa",
                    qtd: data?.porTipo.TRANSMISSAO_EXTERNA ?? 0,
                    cor: "#0ea5e9",
                  },
                  {
                    label: "🎤 Mini Auditório (Sala 109)",
                    qtd: data?.porTipo.MINI_AUDITORIO ?? 0,
                    cor: "#a855f7",
                  },
                  {
                    label: "🎓 Colação / Formatura",
                    qtd: data?.porTipo.COLACAO_FORMATURA ?? 0,
                    cor: "#f5a623",
                  },
                ].map((tipo) => {
                  const pct = resumo.totalTickets > 0 ? Math.round((tipo.qtd / resumo.totalTickets) * 100) : 0;
                  return (
                    <div key={tipo.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                        <span style={{ color: "#f0f4ff", fontWeight: 600 }}>{tipo.label}</span>
                        <span style={{ color: "#94a3b8" }}>{tipo.qtd} ({pct}%)</span>
                      </div>
                      <div style={{ background: "var(--bg-secondary)", borderRadius: 6, height: 10, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: tipo.cor,
                            borderRadius: 6,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
