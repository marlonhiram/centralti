/**
 * @fileoverview Componente principal da aplicação.
 * Gerencia a navegação entre módulos e o estado global dos chamados.
 */
import { useState, useEffect, useCallback } from "react";
import Inventario from "./Inventario";
import Relatorios from "./Relatorios";
import Etiquetas from "./Etiquetas";
import Estoque from "./pages/Estoque";
import Dashboard from "./pages/Dashboard";

// Importação de Componentes Organizados
import TicketRow from "./components/TicketRow";
import ModalChamado from "./components/ModalChamado";
import { C, FiltroDatas } from "./components/UI";

// Importação de Lógica e Constantes
import { 
  BASE, DEPARTAMENTOS, EMPRESAS, CATEGORIAS, PRIORIDADES, 
  STATUS_LISTA, STATUS_ATIVOS, STATUS_ENCERRADOS, 
  slaStatus, fmtDatetime 
} from "./utils/helpers";

// ─── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function App() {
  // Estados Globais
  const [chamados, setChamados] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [viewAtiva, setViewAtiva] = useState("todos");
  const [filtros, setFiltros] = useState({ departamento: "", empresa: "", categoria: "", prioridade: "", status: "" });
  const [filtroDatas, setFiltroDatas] = useState({ de: "", ate: "" });
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(null);
  const [tick, setTick] = useState(0);
  const [pagina, setPagina] = useState("chamados");
  const [carregando, setCarregando] = useState(true);

  // Atualização do relógio (para SLA)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  // Carregamento de Dados
  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const [rc, rm] = await Promise.all([
          fetch(`${BASE}/chamados`).then(r => r.json()),
          fetch(`${BASE}/movimentacoes`).then(r => r.json()),
        ]);
        if (rc.ok) setChamados(rc.data);
        if (rm.ok) setMovimentacoes(rm.data);
      } catch (e) {
        console.error("Erro ao carregar dados:", e);
      }
      setCarregando(false);
    }
    carregar();
  }, []);

  // ─── AÇÕES (CRUD) ───────────────────────────────────────────────────────────
  const criarChamado = useCallback(async (form) => {
    try {
      const r = await fetch(`${BASE}/chamados`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await r.json();
      if (j.ok) { setChamados(prev => [j.data, ...prev]); setModal(null); }
    } catch { alert("Erro ao criar chamado."); }
  }, []);

  const salvarChamado = useCallback(async (form) => {
    try {
      const r = await fetch(`${BASE}/chamados/${form.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await r.json();
      if (j.ok) { setChamados(prev => prev.map(c => c.id === form.id ? j.data : c)); setModal(null); }
    } catch { alert("Erro ao salvar chamado."); }
  }, []);

  const adicionarMovimentacao = useCallback(async (chamadoId, texto) => {
    try {
      const r = await fetch(`${BASE}/movimentacoes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chamado_id: chamadoId, texto }) });
      const j = await r.json();
      if (j.ok) setMovimentacoes(prev => [...prev, j.data]);
    } catch { alert("Erro ao registrar movimentação."); }
  }, []);

  const fecharChamado = useCallback(async (chamadoId, { tempo_gasto, resultado, solucao_aplicada, sem_solucao }) => {
    const novoStatus = sem_solucao ? "Sem Solução" : "Fechado";
    const base = chamados.find(c => c.id === chamadoId);
    const form = { ...base, status: novoStatus, tempo_gasto: parseInt(tempo_gasto) || 0, resultado, solucao_aplicada: solucao_aplicada || null };
    try {
      const r = await fetch(`${BASE}/chamados/${chamadoId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await r.json();
      if (j.ok) {
        setChamados(prev => prev.map(c => c.id === chamadoId ? j.data : c));
        // Desconta requisições de saída pendentes vinculadas ao chamado
        await fetch(`${BASE}/estoque/requisicoes/descontar-saida`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chamado_id: chamadoId }),
        });
        const resumo = `Chamado encerrado como "${novoStatus}". ${resultado}${tempo_gasto ? ` Tempo gasto: ${tempo_gasto} min.` : ""}`;
        await adicionarMovimentacao(chamadoId, resumo);
        setModal(null);
      }
    } catch { alert("Erro ao fechar chamado."); }
  }, [chamados, adicionarMovimentacao]);

  const mudarStatus = useCallback((chamado) => { setModal({ chamado, modo: "editar" }); }, []);

  // ─── LÓGICA DE VISUALIZAÇÃO ───────────────────────────────────────────────────
  const VIEWS = [
    { id: "dashboard", label: "Dashboard", isDashboard: true, filtro: () => false },
    { id: "pendentes", label: "Abertos pendentes", filtro: c => c.status === "Aberto" },
    { id: "vencido", label: "SLA vencido", filtro: c => slaStatus(c) === "vencido" },
    { id: "atencao", label: "Vencendo em breve", filtro: c => slaStatus(c) === "atencao" },
    { id: "todos", label: "Todos os chamados", filtro: c => true, star: true }, // Corrigido para mostrar todos
    { id: "sem_mov", label: "Sem movimentação", filtro: c => STATUS_ATIVOS.includes(c.status) && movimentacoes.filter(m => m.chamado_id === c.id).length === 0 },
    { id: "analise", label: "Em análise", filtro: c => c.status === "Em Análise" },
    { id: "fechados", label: "Fechados", filtro: c => c.status === "Fechado", encerrado: true },
    { id: "semsol", label: "Sem solução", filtro: c => c.status === "Sem Solução", encerrado: true },
  ];

  const viewInfo = VIEWS.find(v => v.id === viewAtiva) || VIEWS[3];
  
  // Filtragem
  const chamadosFiltrados = chamados
    .filter(viewInfo.filtro)
    .filter(c => {
      if (filtros.departamento && c.departamento !== filtros.departamento) return false;
      if (filtros.empresa && c.empresa !== filtros.empresa) return false;
      if (filtros.categoria && c.categoria !== filtros.categoria) return false;
      if (filtros.prioridade && c.prioridade !== filtros.prioridade) return false;
      if (filtros.status && c.status !== filtros.status) return false; // NOVO: Filtro Status
      if (busca && !c.assunto.toLowerCase().includes(busca.toLowerCase()) && !c.solicitante.toLowerCase().includes(busca.toLowerCase())) return false;
      
      // NOVO: Lógica de Data
      if (filtroDatas.de) {
        const d = new Date(c.criado_em);
        if (d < new Date(filtroDatas.de)) return false;
      }
      if (filtroDatas.ate) {
        const d = new Date(c.criado_em);
        if (d > new Date(filtroDatas.ate + "T23:59:59")) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Ordenação inteligente
      const aActive = STATUS_ATIVOS.includes(a.status);
      const bActive = STATUS_ATIVOS.includes(b.status);
      if (aActive && bActive) {
        const sa = slaStatus(a), sb = slaStatus(b);
        const ord = { vencido: 0, atencao: 1, ok: 2, encerrado: 3 };
        if (ord[sa] !== ord[sb]) return ord[sa] - ord[sb];
        // Definido em helpers, mas precisamos importar PRIORIDADE_ORDEM se quisermos usar
        // Simplificando: ordena por data se status igual
        return new Date(b.criado_em) - new Date(a.criado_em);
      }
      return new Date(b.atualizado_em) - new Date(a.atualizado_em);
    });

  // Contadores
  const counts = {
    pendentes: chamados.filter(c => c.status === "Aberto").length,
    vencido: chamados.filter(c => slaStatus(c) === "vencido").length,
    atencao: chamados.filter(c => slaStatus(c) === "atencao").length,
    sem_mov: chamados.filter(c => STATUS_ATIVOS.includes(c.status) && movimentacoes.filter(m => m.chamado_id === c.id).length === 0).length,
    analise: chamados.filter(c => c.status === "Em Análise").length,
    semsol: chamados.filter(c => c.status === "Sem Solução").length,
  };

  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Nunito',sans-serif", background: C.royalBg, color: C.slate800, fontSize: 13, overflow: "hidden" }}>

      {/* ── SIDEBAR ÍCONES ── */}
      <div style={{ width: 52, background: C.royalDark, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 4, flexShrink: 0, zIndex: 10 }}>
        <div style={{ width: 34, height: 34, background: C.royalMid, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, fontSize: 18 }}>🖥</div>
        {[
          { id: "chamados", label: "Chamados", svg: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9l-4-4z"/><polyline points="15 5 15 9 19 9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg> },
          { id: "inventario", label: "Inventário", svg: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
          { id: "etiquetas", label: "Etiquetas", svg: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> },
          { id: "relatorios", label: "Relatórios", svg: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
          { id: "estoque", label: "Estoque", svg: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
        ].map(({ id, label, svg }) => (
          <div key={id} onClick={() => setPagina(id)} title={label} style={{ width: 38, height: 38, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background .15s", color: pagina === id ? "#fff" : "rgba(255,255,255,0.5)", background: pagina === id ? "rgba(45,90,160,0.65)" : "transparent" }}
            onMouseEnter={e => { if (pagina !== id) { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; } }}
            onMouseLeave={e => { if (pagina !== id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; } }}>
            {svg}
          </div>
        ))}
        <div style={{ marginTop: "auto", width: 30, height: 30, borderRadius: "50%", background: C.royalMid, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.white, fontFamily: "'Montserrat',sans-serif" }}>TI</div>
      </div>

      {/* ── INVENTÁRIO ── */}
      {pagina === "inventario" && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <Inventario />
        </div>
      )}

      {/* ── ETIQUETAS ── */}
      {pagina === "etiquetas" && (
        <div style={{ flex: 1, overflowY: "auto", background: C.royalBg }}>
          <Etiquetas />
        </div>
      )}

      {/* ── RELATÓRIOS ── */}
      {pagina === "relatorios" && (
        <div style={{ flex: 1, overflowY: "auto", background: C.royalBg }}>
          <Relatorios />
        </div>
      )}

      {/* ── ESTOQUE ── */}
      {pagina === "estoque" && (
        <div style={{ flex: 1, overflowY: "auto", background: C.royalBg }}>
          <Estoque />
        </div>
      )}

      {/* ── CHAMADOS ── */}
      {pagina === "chamados" && <>
        {/* Painel de views (Sidebar esquerda) */}
        <div style={{ width: 204, background: C.white, borderRight: `1px solid ${C.slate200}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "13px 14px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700, color: C.slate800 }}>Views</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "2px 0" }}>
            {VIEWS.map(v => {
              const count = counts[v.id];
              const isActive = viewAtiva === v.id;
              return (
                <div key={v.id} onClick={() => setViewAtiva(v.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isActive ? "7px 11px" : "7px 14px", borderLeft: isActive ? `3px solid ${C.royalDark}` : "3px solid transparent", cursor: "pointer", fontSize: 12, color: isActive ? C.royalDark : C.slate600, fontWeight: isActive ? 700 : 400, background: isActive ? C.royalGhost : "transparent", transition: "background .12s" }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f8fafc"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>{v.star && <span style={{ fontSize: 11 }}>⭐</span>}{v.label}</span>
                  {!v.isDashboard && count > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, fontFamily: "'Montserrat',sans-serif", background: (v.id === "vencido" || v.id === "pendentes" || v.id === "semsol") ? C.redLight : (v.id === "atencao" ? C.amberLight : C.slate100), color: (v.id === "vencido" || v.id === "pendentes" || v.id === "semsol") ? C.red : (v.id === "atencao" ? C.amber : C.slate400) }}>{count}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Conteúdo Chamados */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* ── VIEW DASHBOARD ── */}
          {viewAtiva === "dashboard" && <Dashboard />}

          {/* Header — oculto na view Dashboard */}
          {viewAtiva !== "dashboard" && <>

            <div style={{ background: C.white, borderBottom: `1px solid ${C.slate200}`, padding: "0 16px", height: 46, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 700, color: C.slate800 }}>{viewInfo.label}</span>
                <span style={{ fontSize: 11, color: C.slate400, fontFamily: "'Montserrat',sans-serif" }}>{chamadosFiltrados.length} chamado{chamadosFiltrados.length !== 1 ? "s" : ""}</span>
                <span style={{ fontSize: 10, color: C.slate400 }}>{hoje}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FiltroDatas de={filtroDatas.de} ate={filtroDatas.ate} onChange={(k, v) => setFiltroDatas(f => ({ ...f, [k]: v }))} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${C.slate200}`, borderRadius: 6, padding: "5px 10px", background: C.royalBg, width: 180 }}>
                  <span style={{ fontSize: 13, color: C.slate400 }}>🔍</span>
                  <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar chamados..." style={{ border: "none", background: "transparent", fontSize: 12, color: C.slate800, width: "100%", outline: "none", fontFamily: "'Nunito',sans-serif" }} />
                </div>
                <button onClick={() => setModal({ chamado: null, modo: "novo" })} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 13px", borderRadius: 6, border: `1px solid ${C.royalDark}`, background: C.royalDark, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>+ Novo Chamado</button>
              </div>
            </div>

            {/* Filtros Linha 2 */}
            <div style={{ background: C.white, borderBottom: `1px solid ${C.slate200}`, padding: "0 16px", height: 36, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {[{ key: "departamento", label: "Departamento", opts: DEPARTAMENTOS }, { key: "empresa", label: "Empresa", opts: EMPRESAS }, { key: "categoria", label: "Categoria", opts: CATEGORIAS }, { key: "prioridade", label: "Prioridade", opts: PRIORIDADES }, { key: "status", label: "Status", opts: STATUS_LISTA }].map(({ key, label, opts }) => (
                  <select key={key} value={filtros[key]} onChange={e => setFiltros(f => ({ ...f, [key]: e.target.value }))} style={{ fontSize: 11, padding: "3px 7px", borderRadius: 5, border: `1px solid ${C.slate200}`, background: C.white, color: filtros[key] ? C.royalDark : C.slate600, fontFamily: "'Nunito',sans-serif", fontWeight: filtros[key] ? 700 : 400, cursor: "pointer" }}>
                    <option value="">{label}: todos</option>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                ))}
                {Object.values(filtros).some(Boolean) && <button onClick={() => setFiltros({ departamento: "", empresa: "", categoria: "", prioridade: "", status: "" })} style={{ fontSize: 11, color: C.red, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: "0 4px" }}>✕ Limpar</button>}
              </div>
            </div>

            {/* Cabeçalho da Tabela */}
            <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 130px 130px 96px 110px 100px", alignItems: "center", padding: "0 16px", height: 30, background: C.slate100, borderBottom: `1px solid ${C.slate200}`, flexShrink: 0, gap: 0 }}>
              {["", "Assunto", "Departamento", "Categoria", "Aberto em", "SLA", "Status"].map((col, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: C.slate400, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: "'Montserrat',sans-serif", textAlign: i === 6 ? "right" : "left" }}>{col}</div>
              ))}
            </div>

            {/* Lista de Chamados */}
            <div style={{ flex: 1, overflowY: "auto", background: C.white }}>
              {carregando ? (
                <div style={{ textAlign: "center", padding: "48px 16px", color: C.slate400 }}>Carregando chamados...</div>
              ) : chamadosFiltrados.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 16px", color: C.slate400 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎫</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhum chamado encontrado</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Tudo em dia!</div>
                </div>
              ) : chamadosFiltrados.map(c => (
                <TicketRow key={c.id + tick} chamado={c} movimentacoes={movimentacoes} onOpen={ch => setModal({ chamado: ch, modo: "editar" })} onStatusChange={mudarStatus} />
              ))}
            </div>

          </>}
        </div>

        {/* Modal Global */}
        {modal && (
          <ModalChamado
            chamado={modal.modo === "novo" ? null : modal.chamado}
            movimentacoes={movimentacoes}
            onClose={() => setModal(null)}
            onSave={modal.modo === "novo" ? criarChamado : salvarChamado}
            onAddMov={adicionarMovimentacao}
            onFechar={fecharChamado}
          />
        )}
      </>}
    </div>
  );
}