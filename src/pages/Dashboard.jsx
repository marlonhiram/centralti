/**
 * @fileoverview Módulo de Dashboard de Métricas.
 * View dentro do módulo de Chamados — exibe gráficos e KPIs do período selecionado.
 * Depende de Chart.js carregado via CDN no index.html.
 */
import { useState, useEffect, useRef } from "react";
import { BASE } from "../utils/helpers";
import { C } from "../components/UI";

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const PERIODOS = [
  { id: "dia",    label: "Hoje" },
  { id: "semana", label: "Esta semana" },
  { id: "mes",    label: "Este mês" },
  { id: "ano",    label: "Este ano" },
];

const CORES_PRIORIDADE = {
  "Crítica": "#ef4444",
  "Alta":    "#f97316",
  "Média":   "#3b82f6",
  "Baixa":   "#22c55e",
};

// ─── COMPONENTE DE CARD KPI ───────────────────────────────────────────────────

/**
 * Exibe um cartão de KPI com valor destacado e rótulo.
 * @param {{ label: string, value: string|number, cor?: string, sub?: string }} props
 */
function CardKpi({ label, value, cor = C.royalDark, sub }) {
  return (
    <div style={{
      background: C.white, borderRadius: 10, border: `1px solid ${C.slate200}`,
      padding: "16px 20px", minWidth: 130, flex: 1,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.slate400, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: "'Montserrat',sans-serif", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: cor, fontFamily: "'Montserrat',sans-serif", lineHeight: 1 }}>
        {value ?? "—"}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.slate400, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── COMPONENTE DE GRÁFICO (WRAPPER) ─────────────────────────────────────────

/**
 * Renderiza um canvas gerenciado pelo Chart.js.
 * Destrói e recria o gráfico a cada mudança de dados para evitar conflitos de instância.
 * @param {{ tipo: string, dados: object, opcoes?: object, altura?: number }} props
 */
function Grafico({ tipo, dados, opcoes = {}, altura = 220 }) {
  const canvasRef = useRef(null);
  const instanciaRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;

    // Destrói instância anterior antes de recriar
    if (instanciaRef.current) {
      instanciaRef.current.destroy();
      instanciaRef.current = null;
    }

    instanciaRef.current = new window.Chart(canvasRef.current, {
      type: tipo,
      data: dados,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { font: { family: "'Nunito',sans-serif", size: 11 }, boxWidth: 12 } } },
        ...opcoes,
      },
    });

    return () => {
      if (instanciaRef.current) {
        instanciaRef.current.destroy();
        instanciaRef.current = null;
      }
    };
  }, [tipo, dados, opcoes]);

  return (
    <div style={{ position: "relative", height: altura }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function Dashboard() {
  const [periodo, setPeriodo]           = useState("mes");
  const [carregando, setCarregando]     = useState(true);
  const [erro, setErro]                 = useState(null);

  // Dados brutos de cada endpoint
  const [resumo, setResumo]             = useState([]);
  const [sla, setSla]                   = useState(null);
  const [porDepto, setPorDepto]         = useState([]);
  const [tempoMedio, setTempoMedio]     = useState([]);

  // ─── CARREGAMENTO ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro(null);
      try {
        const p = `periodo=${periodo}`;
        const [rResumo, rSla, rDepto, rTempo] = await Promise.all([
          fetch(`${BASE}/dashboard/resumo?${p}`).then(r => r.json()),
          fetch(`${BASE}/dashboard/sla?${p}`).then(r => r.json()),
          fetch(`${BASE}/dashboard/por-departamento?${p}`).then(r => r.json()),
          fetch(`${BASE}/dashboard/tempo-medio?${p}`).then(r => r.json()),
        ]);
        if (!rResumo.ok || !rSla.ok || !rDepto.ok || !rTempo.ok) throw new Error("Erro ao carregar dados do dashboard.");
        setResumo(rResumo.data);
        setSla(rSla.data);
        setPorDepto(rDepto.data);
        setTempoMedio(rTempo.data);
      } catch (e) {
        setErro(e.message || "Falha ao carregar dashboard.");
      }
      setCarregando(false);
    }
    carregar();
  }, [periodo]); // re-busca sem cache ao trocar período

  // ─── DERIVAÇÕES PARA KPIs ────────────────────────────────────────────────────
  const totalAbertos    = resumo.reduce((s, r) => s + parseInt(r.abertos || 0), 0);
  const totalFechados   = resumo.reduce((s, r) => s + parseInt(r.fechados || 0), 0);
  const totalSemSol     = resumo.reduce((s, r) => s + parseInt(r.sem_solucao || 0), 0);
  const totalGeral      = totalAbertos + totalFechados + totalSemSol;

  const pctSla = sla && parseInt(sla.total) > 0
    ? Math.round((parseInt(sla.cumpridos) / (parseInt(sla.cumpridos) + parseInt(sla.violados))) * 100)
    : null;

  // ─── DADOS DOS GRÁFICOS ───────────────────────────────────────────────────────

  /** Gráfico de linha: abertos vs fechados por dia */
  const dadosLinha = {
    labels: resumo.map(r => {
      const d = new Date(r.data);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }),
    datasets: [
      {
        label: "Abertos",
        data: resumo.map(r => parseInt(r.abertos || 0)),
        borderColor: C.royalDark,
        backgroundColor: "rgba(30,64,175,0.08)",
        tension: 0.3,
        fill: true,
        pointRadius: 3,
      },
      {
        label: "Fechados",
        data: resumo.map(r => parseInt(r.fechados || 0)),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.08)",
        tension: 0.3,
        fill: true,
        pointRadius: 3,
      },
    ],
  };

  /** Gráfico de rosca: SLA cumprido vs violado */
  const dadosSla = sla ? {
    labels: ["Cumprido", "Violado", "Sem previsão"],
    datasets: [{
      data: [
        parseInt(sla.cumpridos || 0),
        parseInt(sla.violados || 0),
        parseInt(sla.sem_previsao || 0),
      ],
      backgroundColor: ["#22c55e", "#ef4444", "#94a3b8"],
      borderWidth: 0,
    }],
  } : null;

  /** Gráfico de barras horizontal: por departamento */
  const dadosDepto = {
    labels: porDepto.map(r => r.departamento),
    datasets: [{
      label: "Chamados",
      data: porDepto.map(r => parseInt(r.total || 0)),
      backgroundColor: C.royalDark,
      borderRadius: 4,
    }],
  };

  /** Gráfico de barras: tempo médio por prioridade */
  const dadosTempo = {
    labels: tempoMedio.map(r => r.prioridade),
    datasets: [{
      label: "Tempo médio (min)",
      data: tempoMedio.map(r => parseInt(r.media_minutos || 0)),
      backgroundColor: tempoMedio.map(r => CORES_PRIORIDADE[r.prioridade] || C.royalDark),
      borderRadius: 4,
    }],
  };

  const opcoesBarraHorizontal = {
    indexAxis: "y",
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  const opcoesBarra = {
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  const opcoesLinha = {
    plugins: { legend: { position: "bottom" } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, overflowY: "auto", background: C.royalBg, padding: "20px 24px" }}>

      {/* Cabeçalho + seletor de período */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 15, fontWeight: 800, color: C.slate800 }}>Dashboard</div>
          <div style={{ fontSize: 11, color: C.slate400, marginTop: 2 }}>Métricas de atendimento</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {PERIODOS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              style={{
                padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                fontFamily: "'Nunito',sans-serif", border: `1px solid ${periodo === p.id ? C.royalDark : C.slate200}`,
                background: periodo === p.id ? C.royalDark : C.white,
                color: periodo === p.id ? C.white : C.slate600,
                transition: "all .12s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Estado de erro */}
      {erro && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px", color: "#dc2626", fontSize: 12, marginBottom: 16 }}>
          ⚠️ {erro}
        </div>
      )}

      {carregando ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.slate400, fontSize: 13 }}>
          Carregando métricas...
        </div>
      ) : (
        <>
          {/* ── KPIs ── */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <CardKpi label="Total no período" value={totalGeral} />
            <CardKpi label="Em aberto"         value={totalAbertos}  cor="#f97316" />
            <CardKpi label="Fechados"          value={totalFechados} cor="#22c55e" />
            <CardKpi label="Sem solução"       value={totalSemSol}   cor="#ef4444" />
            <CardKpi
              label="SLA cumprido"
              value={pctSla !== null ? `${pctSla}%` : "—"}
              cor={pctSla === null ? C.slate400 : pctSla >= 80 ? "#22c55e" : pctSla >= 60 ? "#f97316" : "#ef4444"}
              sub={sla ? `${sla.cumpridos} de ${parseInt(sla.cumpridos) + parseInt(sla.violados)} com prazo` : undefined}
            />
          </div>

          {/* ── Linha 1: Gráfico de linha + Rosca SLA ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 12, marginBottom: 12 }}>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.slate200}`, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.slate500, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: "'Montserrat',sans-serif", marginBottom: 12 }}>
                Abertos vs Fechados por dia
              </div>
              {resumo.length === 0
                ? <div style={{ textAlign: "center", padding: "40px 0", color: C.slate400, fontSize: 12 }}>Sem dados no período</div>
                : <Grafico tipo="line" dados={dadosLinha} opcoes={opcoesLinha} altura={220} />
              }
            </div>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.slate200}`, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.slate500, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: "'Montserrat',sans-serif", marginBottom: 12 }}>
                SLA
              </div>
              {!dadosSla || (parseInt(sla.cumpridos) + parseInt(sla.violados) + parseInt(sla.sem_previsao) === 0)
                ? <div style={{ textAlign: "center", padding: "40px 0", color: C.slate400, fontSize: 12 }}>Sem dados no período</div>
                : <Grafico tipo="doughnut" dados={dadosSla} opcoes={{ plugins: { legend: { position: "bottom" } }, cutout: "65%" }} altura={220} />
              }
            </div>
          </div>

          {/* ── Linha 2: Por departamento + Tempo médio ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.slate200}`, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.slate500, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: "'Montserrat',sans-serif", marginBottom: 12 }}>
                Chamados por departamento
              </div>
              {porDepto.length === 0
                ? <div style={{ textAlign: "center", padding: "40px 0", color: C.slate400, fontSize: 12 }}>Sem dados no período</div>
                : <Grafico tipo="bar" dados={dadosDepto} opcoes={opcoesBarraHorizontal} altura={220} />
              }
            </div>
            <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.slate200}`, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.slate500, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: "'Montserrat',sans-serif", marginBottom: 12 }}>
                Tempo médio de resolução por prioridade
              </div>
              {tempoMedio.length === 0
                ? <div style={{ textAlign: "center", padding: "40px 0", color: C.slate400, fontSize: 12 }}>Sem chamados fechados no período</div>
                : <Grafico tipo="bar" dados={dadosTempo} opcoes={opcoesBarra} altura={220} />
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}