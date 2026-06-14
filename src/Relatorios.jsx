import { useState } from "react";

// ─── Paleta de Cores ──────────────────────────────────────────
const C = {
  royalDark:  "#1a3a6b",
  royalMid:   "#2d5aa0",
  royalLight: "#5b9bd5",
  bg:         "#f0f4f8",
  white:      "#ffffff",
  gray1:      "#e2e8f0",
  gray2:      "#94a3b8",
  gray3:      "#64748b",
  green:      "#16a34a",
  red:        "#dc2626",
  amber:      "#d97706",
  text:       "#1e293b",
};

function fmt(val) {
  if (!val) return "—";
  if (typeof val === "string" && val.includes("T")) {
    const d = new Date(val);
    if (!isNaN(d)) return d.toLocaleString("pt-BR");
  }
  return val;
}
function fmtDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("pt-BR");
}
function hoje() { return new Date().toISOString().slice(0, 10); }
function mesPassado() {
  const d = new Date(); d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

const STATUS_CHAMADO = ["Em Análise", "Fechado", "Sem Solução", "Aberto"];
const TIPOS_EQ = ["Computador","Impressora","Roteador","Smartphone","Câmera","Servidor","Switch","CNC","Outro"];
const STATUS_EQ = ["Ativo","Disponível","Em Manutenção","Desativado"];
const DEPTOS = ["Almoxarifado","Comercial","Compras","Contabilidade","Diretoria","Elétrica",
  "Expedição","Fábrica","Financeiro","Jurídico","Logística","Portaria","PPCP",
  "Qualidade","Recursos Humanos","Segurança do Trabalho","TI"];

// ─── Excel ────────────────────────────────────────────────────
function baixarExcel(dados, nomeArquivo, colunas) {
  const cabecalho = colunas.map(c => c.label);
  const linhas = dados.map(row => colunas.map(c => {
    const v = row[c.key];
    if (!v) return "";
    if (typeof v === "string" && v.includes("T") && v.includes("-")) {
      const d = new Date(v);
      if (!isNaN(d)) return d.toLocaleString("pt-BR");
    }
    return v;
  }));
  const ws = XLSX.utils.aoa_to_sheet([cabecalho, ...linhas]);
  ws["!cols"] = colunas.map(c => ({ wch: Math.max(c.label.length + 4, 18) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(wb, nomeArquivo + ".xlsx");
}

// ─── PDF ──────────────────────────────────────────────────────
function baixarPDF(titulo, htmlConteudo, orientacao = "paisagem") {
  const janela = window.open("", "_blank");
  janela.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>${titulo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=Montserrat:wght@600;700&display=swap');
  @page { size: ${orientacao === "paisagem" ? "A4 landscape" : "A4 portrait"}; margin: 10mm 8mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Nunito',sans-serif; color:#1e293b; font-size:11px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; border-bottom:2px solid #1a3a6b; padding-bottom:8px; }
  .logo-txt { font-family:'Montserrat',sans-serif; font-size:16px; font-weight:700; color:#1a3a6b; }
  .logo-sub { font-size:10px; color:#64748b; margin-top:2px; }
  h1 { font-family:'Montserrat',sans-serif; color:#1a3a6b; font-size:14px; margin-bottom:4px; }
  .sub { color:#64748b; font-size:10px; margin-bottom:14px; }
  table { width:100%; border-collapse:collapse; font-size:9px; table-layout:auto; }
  th { background:#1a3a6b; color:#fff; padding:5px 6px; text-align:left; font-family:'Montserrat',sans-serif; font-size:8px; letter-spacing:.3px; white-space:nowrap; }
  td { padding:4px 6px; border-bottom:1px solid #e2e8f0; word-break:break-word; vertical-align:top; }
  tr:nth-child(even) td { background:#eef3f9 !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  tr:nth-child(odd) td { background:#ffffff !important; }
  th { background:#1a3a6b !important; color:#fff !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; padding:5px 6px; text-align:left; font-family:'Montserrat',sans-serif; font-size:8px; letter-spacing:.3px; white-space:nowrap; }
  .badge { display:inline-block; padding:1px 6px; border-radius:20px; font-size:9px; font-weight:700; }
  .badge-aberto { background:#dbeafe; color:#1d4ed8; }
  .badge-analise { background:#fef3c7; color:#92400e; }
  .badge-fechado { background:#dcfce7; color:#166534; }
  .badge-sem { background:#fee2e2; color:#991b1b; }
  .badge-ativo { background:#dcfce7; color:#166534; }
  .badge-disponivel { background:#dbeafe; color:#1d4ed8; }
  .badge-manutencao { background:#fef3c7; color:#92400e; }
  .badge-desativado { background:#f1f5f9; color:#475569; }
  .secao { margin-top:16px; }
  .secao h2 { font-family:'Montserrat',sans-serif; font-size:11px; color:#2d5aa0; border-bottom:1.5px solid #2d5aa0; padding-bottom:3px; margin-bottom:8px; }
  .campo { display:flex; gap:8px; margin-bottom:5px; font-size:11px; }
  .campo strong { min-width:150px; color:#1a3a6b; flex-shrink:0; }
  .mov { background:#f8fafc; border-left:3px solid #5b9bd5; padding:6px 10px; margin-bottom:6px; border-radius:0 4px 4px 0; }
  .mov .data { font-size:9px; color:#64748b; margin-bottom:2px; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo-txt">CentralTI</div>
    <div class="logo-sub">Central de Chamados TI · Relatório gerado em ${new Date().toLocaleString("pt-BR")}</div>
  </div>
  <div style="font-size:9px;color:#94a3b8;">${orientacao === "paisagem" ? "Paisagem" : "Retrato"}</div>
</div>
<h1>${titulo}</h1>
${htmlConteudo}
<script>window.onload=()=>{window.print();}<\/script>
</body></html>`);
  janela.document.close();
}

// ─── Modal de exportação (colunas + orientação + formato) ─────
function ModalExportar({ colunas, onConfirmar, onFechar }) {
  const [selecionadas, setSelecionadas] = useState(() => new Set(colunas.map(c => c.key)));
  const [orientacao, setOrientacao] = useState("paisagem");
  const [formato, setFormato] = useState("pdf");

  const toggle = key => setSelecionadas(prev => {
    const n = new Set(prev);
    n.has(key) ? n.delete(key) : n.add(key);
    return n;
  });
  const colsSel = colunas.filter(c => selecionadas.has(c.key));

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onFechar()}>
      <div style={{ background:C.white, borderRadius:12, width:"min(560px,94vw)", overflow:"hidden", border:`1px solid ${C.gray1}` }}>
        <div style={{ background:C.royalDark, padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:13, color:"#fff" }}>Configurar Exportação</div>
          <button onClick={onFechar} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", width:28, height:28, borderRadius:6, cursor:"pointer", fontSize:15 }}>×</button>
        </div>
        <div style={{ padding:20 }}>

          {/* Formato */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, fontWeight:700, color:C.royalDark, marginBottom:8, textTransform:"uppercase", letterSpacing:.3 }}>Formato</div>
            <div style={{ display:"flex", gap:10 }}>
              {[["pdf","📄 PDF"],["excel","📊 Excel"]].map(([id,label]) => (
                <div key={id} onClick={() => setFormato(id)} style={{
                  flex:1, padding:"10px", borderRadius:8, cursor:"pointer", textAlign:"center",
                  border:`2px solid ${formato===id ? C.royalMid : C.gray1}`,
                  background: formato===id ? "#eff6ff" : C.white,
                  fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:13,
                  color: formato===id ? C.royalMid : C.gray3,
                }}>{label}</div>
              ))}
            </div>
          </div>

          {/* Orientação — só PDF */}
          {formato === "pdf" && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, fontWeight:700, color:C.royalDark, marginBottom:8, textTransform:"uppercase", letterSpacing:.3 }}>Orientação</div>
              <div style={{ display:"flex", gap:10 }}>
                {[["paisagem","🖼 Paisagem (horizontal)"],["retrato","📋 Retrato (vertical)"]].map(([id,label]) => (
                  <div key={id} onClick={() => setOrientacao(id)} style={{
                    flex:1, padding:"10px", borderRadius:8, cursor:"pointer", textAlign:"center",
                    border:`2px solid ${orientacao===id ? C.royalMid : C.gray1}`,
                    background: orientacao===id ? "#eff6ff" : C.white,
                    fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:12,
                    color: orientacao===id ? C.royalMid : C.gray3,
                  }}>{label}</div>
                ))}
              </div>
            </div>
          )}

          {/* Colunas */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, fontWeight:700, color:C.royalDark, textTransform:"uppercase", letterSpacing:.3 }}>
                Colunas ({colsSel.length}/{colunas.length})
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setSelecionadas(new Set(colunas.map(c=>c.key)))} style={{ fontSize:11, color:C.royalMid, background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Todas</button>
                <button onClick={() => setSelecionadas(new Set())} style={{ fontSize:11, color:C.red, background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Limpar</button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 16px", maxHeight:200, overflowY:"auto", padding:2 }}>
              {colunas.map(c => (
                <label key={c.key} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:C.text, padding:"5px 8px", borderRadius:6, background: selecionadas.has(c.key) ? "#eff6ff" : "transparent", border:`1px solid ${selecionadas.has(c.key) ? C.royalLight : C.gray1}` }}>
                  <input type="checkbox" checked={selecionadas.has(c.key)} onChange={() => toggle(c.key)} style={{ accentColor:C.royalMid, width:14, height:14 }}/>
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={onFechar} style={{ padding:"8px 18px", borderRadius:7, border:`1px solid ${C.gray1}`, background:C.white, color:C.gray3, fontFamily:"'Montserrat',sans-serif", fontWeight:600, fontSize:12, cursor:"pointer" }}>Cancelar</button>
            <button onClick={() => { if (!colsSel.length) return alert("Selecione ao menos uma coluna."); onConfirmar(colsSel, orientacao, formato); onFechar(); }}
              style={{ padding:"8px 22px", borderRadius:7, border:"none", background:C.royalMid, color:"#fff", fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:12, cursor:"pointer" }}>
              ↓ Gerar {formato === "pdf" ? "PDF" : "Excel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal orientação simples (fichas detalhadas) ─────────────
function ModalOrientacao({ onConfirmar, onFechar }) {
  const [orientacao, setOrientacao] = useState("retrato");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onFechar()}>
      <div style={{ background:C.white, borderRadius:12, width:"min(380px,94vw)", overflow:"hidden", border:`1px solid ${C.gray1}` }}>
        <div style={{ background:C.royalDark, padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:13, color:"#fff" }}>Orientação do PDF</div>
          <button onClick={onFechar} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", width:28, height:28, borderRadius:6, cursor:"pointer", fontSize:15 }}>×</button>
        </div>
        <div style={{ padding:20 }}>
          <div style={{ display:"flex", gap:10, marginBottom:20 }}>
            {[["paisagem","🖼 Paisagem"],["retrato","📋 Retrato"]].map(([id,label]) => (
              <div key={id} onClick={() => setOrientacao(id)} style={{
                flex:1, padding:"12px", borderRadius:8, cursor:"pointer", textAlign:"center",
                border:`2px solid ${orientacao===id ? C.royalMid : C.gray1}`,
                background: orientacao===id ? "#eff6ff" : C.white,
                fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:13,
                color: orientacao===id ? C.royalMid : C.gray3,
              }}>{label}</div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={onFechar} style={{ padding:"8px 18px", borderRadius:7, border:`1px solid ${C.gray1}`, background:C.white, color:C.gray3, fontFamily:"'Montserrat',sans-serif", fontWeight:600, fontSize:12, cursor:"pointer" }}>Cancelar</button>
            <button onClick={() => onConfirmar(orientacao)} style={{ padding:"8px 22px", borderRadius:7, border:"none", background:"#dc2626", color:"#fff", fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:12, cursor:"pointer" }}>↓ Gerar PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────
export default function Relatorios() {
  const [aba, setAba] = useState("chamados");
  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Nunito',sans-serif" }}>
      <div style={{ background:C.royalDark, padding:"20px 32px", display:"flex", alignItems:"center", gap:12 }}>
        <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <div>
          <div style={{ fontFamily:"'Montserrat',sans-serif", color:"#fff", fontWeight:700, fontSize:18, letterSpacing:.5 }}>Relatórios</div>
          <div style={{ color:"#93c5fd", fontSize:12 }}>Emita relatórios em Excel ou PDF</div>
        </div>
      </div>
      <div style={{ background:C.white, borderBottom:`1px solid ${C.gray1}`, display:"flex", padding:"0 32px" }}>
        {[["chamados","Chamados"],["equipamentos","Equipamentos"]].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)} style={{
            padding:"14px 24px", border:"none", background:"none", cursor:"pointer",
            fontFamily:"'Montserrat',sans-serif", fontWeight:600, fontSize:13,
            color: aba === id ? C.royalMid : C.gray3,
            borderBottom: aba === id ? `2.5px solid ${C.royalMid}` : "2.5px solid transparent",
            transition:"all .15s"
          }}>{label}</button>
        ))}
      </div>
      <div style={{ padding:"32px", maxWidth:1100, margin:"0 auto" }}>
        {aba === "chamados" ? <RelChamados /> : <RelEquipamentos />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  CHAMADOS
// ══════════════════════════════════════════════════════════════
function RelChamados() {
  const [tipo, setTipo] = useState("listagem");
  return (
    <div>
      <div style={{ display:"flex", gap:16, marginBottom:28 }}>
        {[["listagem","📋 Listagem por Status","Múltiplos chamados filtrados por período e status"],
          ["detalhado","🔍 Chamado Detalhado","Um chamado específico com todas as movimentações"]
        ].map(([id, titulo, desc]) => (
          <div key={id} onClick={() => setTipo(id)} style={{
            flex:1, background: tipo===id ? "#eff6ff" : C.white,
            border:`2px solid ${tipo===id ? C.royalMid : C.gray1}`,
            borderRadius:10, padding:"16px 20px", cursor:"pointer", transition:"all .15s"
          }}>
            <div style={{ fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:14, color: tipo===id ? C.royalMid : C.text, marginBottom:4 }}>{titulo}</div>
            <div style={{ fontSize:12, color:C.gray3 }}>{desc}</div>
          </div>
        ))}
      </div>
      {tipo === "listagem" ? <ListagemChamados /> : <DetalheChamado />}
    </div>
  );
}

function ListagemChamados() {
  const [filtros, setFiltros] = useState({ status:"Fechado", deInicio:mesPassado(), deFim:hoje(), depto:"", categoria:"", prioridade:"" });
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalExp, setModalExp] = useState(false);
  const upd = (k, v) => setFiltros(f => ({ ...f, [k]: v }));

  async function buscar() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: filtros.status, de_inicio: filtros.deInicio, de_fim: filtros.deFim,
        ...(filtros.depto && { departamento: filtros.depto }),
        ...(filtros.categoria && { categoria: filtros.categoria }),
        ...(filtros.prioridade && { prioridade: filtros.prioridade }),
      });
      const r = await fetch(`http://localhost:3001/relatorios/chamados/listagem?${params}`);
      const j = await r.json();
      setDados(j.data || []);
    } catch { setDados([]); }
    setLoading(false);
  }

  const COLUNAS = [
    {key:"numero",label:"Nº"},{key:"empresa",label:"Empresa"},{key:"departamento",label:"Departamento"},
    {key:"solicitante",label:"Solicitante"},{key:"assunto",label:"Assunto"},{key:"descricao",label:"Descrição"},
    {key:"categoria",label:"Categoria"},{key:"prioridade",label:"Prioridade"},{key:"status",label:"Status"},
    {key:"criado_em",label:"Aberto em"},{key:"previsao",label:"SLA"},{key:"atualizado_em",label:"Última atualização"},
    {key:"tempo_gasto",label:"Tempo gasto (min)"},{key:"resultado",label:"Resultado"},
  ];

  function exportar(colunas, orientacao, formato) {
    const nome = `Chamados_${filtros.status}_${filtros.deInicio}_${filtros.deFim}`;
    if (formato === "excel") { baixarExcel(dados, nome, colunas); return; }
    const html = `
<p class="sub">Período: ${fmtDate(filtros.deInicio)} a ${fmtDate(filtros.deFim)} · Status: ${filtros.status} · Total: ${dados.length}</p>
<table>
  <thead><tr>${colunas.map(c=>`<th>${c.label}</th>`).join("")}</tr></thead>
  <tbody>${dados.map(r=>`<tr>${colunas.map(c=>{
    const v = r[c.key];
    if(c.key==="status") return `<td><span class="badge badge-${v==="Fechado"?"fechado":v==="Em Análise"?"analise":v==="Sem Solução"?"sem":"aberto"}">${v||"—"}</span></td>`;
    return `<td>${fmt(v)}</td>`;
  }).join("")}</tr>`).join("")}</tbody>
</table>`;
    baixarPDF(`Listagem de Chamados — ${filtros.status}`, html, orientacao);
  }

  return (
    <div>
      <Card titulo="Filtros do Relatório">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          <Campo label="Status" obrigatorio>
            <select value={filtros.status} onChange={e=>upd("status",e.target.value)} style={estiloSelect}>
              {STATUS_CHAMADO.map(s=><option key={s}>{s}</option>)}
            </select>
          </Campo>
          <Campo label="Data inicial" obrigatorio>
            <input type="date" value={filtros.deInicio} onChange={e=>upd("deInicio",e.target.value)} style={estiloInput}/>
          </Campo>
          <Campo label="Data final" obrigatorio>
            <input type="date" value={filtros.deFim} onChange={e=>upd("deFim",e.target.value)} style={estiloInput}/>
          </Campo>
          <Campo label="Departamento">
            <select value={filtros.depto} onChange={e=>upd("depto",e.target.value)} style={estiloSelect}>
              <option value="">Todos</option>{DEPTOS.map(d=><option key={d}>{d}</option>)}
            </select>
          </Campo>
          <Campo label="Categoria">
            <select value={filtros.categoria} onChange={e=>upd("categoria",e.target.value)} style={estiloSelect}>
              <option value="">Todas</option>{["Impressoras","Suporte ao Usuário","Manutenções"].map(c=><option key={c}>{c}</option>)}
            </select>
          </Campo>
          <Campo label="Prioridade">
            <select value={filtros.prioridade} onChange={e=>upd("prioridade",e.target.value)} style={estiloSelect}>
              <option value="">Todas</option>{["Crítica","Alta","Média","Baixa"].map(p=><option key={p}>{p}</option>)}
            </select>
          </Campo>
        </div>
        <div style={{ marginTop:16, display:"flex", gap:10, justifyContent:"flex-end" }}>
          <BotaoBuscar onClick={buscar} loading={loading}/>
        </div>
      </Card>

      {dados !== null && (
        <Card titulo={`Resultado — ${dados.length} chamado(s)`} extra={
          dados.length > 0 && <BotaoExportar label="↓ Exportar" cor={C.royalMid} onClick={() => setModalExp(true)}/>
        }>
          {dados.length === 0 ? <Vazio texto="Nenhum chamado encontrado."/> : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.royalDark }}>
                    {["Nº","Solicitante","Departamento","Assunto","Categoria","Prioridade","Status","Aberto em","SLA"].map(h=>(
                      <th key={h} style={{ padding:"9px 12px", color:"#fff", fontFamily:"'Montserrat',sans-serif", fontSize:11, textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.map((r,i) => (
                    <tr key={r.id} style={{ background: i%2===0?C.white:"#f8fafc" }}>
                      <td style={estiloTd}><strong style={{color:C.royalMid}}>#{r.numero}</strong></td>
                      <td style={estiloTd}>{r.solicitante}</td>
                      <td style={estiloTd}>{r.departamento}</td>
                      <td style={{...estiloTd,maxWidth:220}}><span title={r.assunto} style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.assunto}</span></td>
                      <td style={estiloTd}>{r.categoria}</td>
                      <td style={estiloTd}><PrioridadeBadge p={r.prioridade}/></td>
                      <td style={estiloTd}><StatusBadge s={r.status}/></td>
                      <td style={estiloTd}>{fmtDate(r.criado_em)}</td>
                      <td style={estiloTd}><SLACell previsao={r.previsao} status={r.status}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {modalExp && <ModalExportar colunas={COLUNAS} onConfirmar={exportar} onFechar={() => setModalExp(false)}/>}
    </div>
  );
}

function DetalheChamado() {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState(null);
  const [selecionado, setSelecionado] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOri, setModalOri] = useState(false);

  async function pesquisar() {
    if (!busca.trim()) return;
    setLoading(true); setSelecionado(null); setDetalhe(null);
    try {
      const r = await fetch(`http://localhost:3001/relatorios/chamados/busca?q=${encodeURIComponent(busca)}`);
      const j = await r.json(); setResultados(j.data || []);
    } catch { setResultados([]); }
    setLoading(false);
  }

  async function selecionar(c) {
    setSelecionado(c); setResultados(null); setLoading(true);
    try {
      const r = await fetch(`http://localhost:3001/relatorios/chamados/${c.id}/detalhado`);
      const j = await r.json(); setDetalhe(j.data);
    } catch { setDetalhe(null); }
    setLoading(false);
  }

  /**
   * Converte um anexo de imagem em base64 via fetch para embutir no HTML de impressão.
   * @param {number} id - ID do anexo
   * @returns {Promise<string>} Data URL base64 ou string vazia em caso de falha
   */
  async function imagemParaBase64(id) {
    try {
      const r = await fetch(`http://localhost:3001/anexos/${id}/arquivo`);
      const blob = await r.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(blob);
      });
    } catch {
      return "";
    }
  }

  async function gerarPDF(orientacao) {
    const d = detalhe;

    // Primeira folha — conteúdo existente, inalterado
    const htmlPrimeiraFolha = `
    <div class="secao"><h2>Dados do Chamado</h2>
    ${[["Número",`#${d.numero}`],["Empresa",d.empresa],["Departamento",d.departamento],
      ["Solicitante",d.solicitante],["Assunto",d.assunto],["Descrição",d.descricao||"—"],
      ["Categoria",d.categoria],["Prioridade",d.prioridade],["Status",d.status],
      ["Aberto em",fmt(d.criado_em)],["SLA / Previsão",fmt(d.previsao)],
      ["Tempo gasto",d.tempo_gasto?d.tempo_gasto+" min":"—"],["Resultado",d.resultado||"—"],
      ["Solução Aplicada",d.solucao_aplicada||"—"],
    ].map(([l,v])=>`<div class="campo"><strong>${l}:</strong><span>${v}</span></div>`).join("")}
    </div>
    ${d.movimentacoes?.length>0?`<div class="secao"><h2>Movimentações (${d.movimentacoes.length})</h2>
    ${d.movimentacoes.map(m=>`<div class="mov"><div class="data">${fmt(m.registrado_em)}</div><div>${m.texto}</div></div>`).join("")}
    </div>`:""}`;

        // Separa anexos por tipo
        const imagens = (d.anexos || []).filter(a => a.tipo.startsWith("image/"));
        const pdfs    = (d.anexos || []).filter(a => a.tipo === "application/pdf");
        const temEvidencias = imagens.length > 0 || pdfs.length > 0;

        let htmlSegundaFolha = "";

        if (temEvidencias) {
          // Converte imagens para base64 para garantir carregamento antes do print
          const imagensBase64 = await Promise.all(
            imagens.map(async (img) => ({
              ...img,
              src: await imagemParaBase64(img.id),
            }))
          );

          const htmlImagens = imagensBase64.length > 0 ? `
    <div class="secao">
      <h2>Imagens (${imagensBase64.length})</h2>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:10px;">
        ${imagensBase64.map(img => img.src ? `
        <div style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;break-inside:avoid;">
          <img src="${img.src}" style="width:100%;max-height:220px;object-fit:contain;display:block;background:#f8fafc;"/>
          <div style="padding:5px 8px;font-size:9px;color:#64748b;border-top:1px solid #e2e8f0;word-break:break-all;">${img.nome_original}</div>
        </div>` : "").join("")}
      </div>
    </div>` : "";

          const htmlPdfs = pdfs.length > 0 ? `
    <div class="secao">
      <h2>Documentos PDF (${pdfs.length})</h2>
      <table style="margin-top:8px;">
        <thead><tr><th>Arquivo</th><th>Link</th></tr></thead>
        <tbody>
          ${pdfs.map(p => `
          <tr>
            <td>${p.nome_original}</td>
            <td><a href="http://localhost:3001/anexos/${p.id}/arquivo" target="_blank"
                  style="color:#2d5aa0;font-weight:700;text-decoration:none;">
              ↓ Baixar PDF
            </a></td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>` : "";

          htmlSegundaFolha = `
    <div style="page-break-before:always;">
      <div style="border-bottom:2px solid #1a3a6b;padding-bottom:8px;margin-bottom:14px;">
        <div style="font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;color:#1a3a6b;">
          Evidências — Chamado #${d.numero}
        </div>
        <div style="font-size:10px;color:#64748b;margin-top:2px;">${d.assunto}</div>
      </div>
      ${htmlImagens}
      ${htmlPdfs}
    </div>`;
        }

        baixarPDF(
          `Chamado #${d.numero} — ${d.assunto}`,
          htmlPrimeiraFolha + htmlSegundaFolha,
          orientacao
        );
      }

    return (
      <div>
        <Card titulo="Buscar Chamado">
          <div style={{ display:"flex", gap:10 }}>
            <input style={{...estiloInput,flex:1}} placeholder="Digite o número, solicitante ou assunto..."
              value={busca} onChange={e=>setBusca(e.target.value)} onKeyDown={e=>e.key==="Enter"&&pesquisar()}/>
            <BotaoBuscar onClick={pesquisar} loading={loading}/>
          </div>
          {resultados !== null && resultados.length === 0 && <Vazio texto="Nenhum chamado encontrado."/>}
          {resultados?.length > 0 && (
            <div style={{ marginTop:12, border:`1px solid ${C.gray1}`, borderRadius:8, overflow:"hidden" }}>
              {resultados.map((c,i) => (
                <div key={c.id} onClick={()=>selecionar(c)} style={{ padding:"11px 16px", background:i%2===0?C.white:"#f8fafc", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${C.gray1}` }}>
                  <div>
                    <strong style={{color:C.royalMid}}>#{c.numero}</strong>
                    <span style={{margin:"0 8px",color:C.gray2}}>·</span>
                    <span style={{fontWeight:600}}>{c.solicitante}</span>
                    <span style={{margin:"0 8px",color:C.gray2}}>·</span>
                    <span style={{color:C.gray3}}>{c.assunto}</span>
                  </div>
                  <StatusBadge s={c.status}/>
                </div>
              ))}
            </div>
          )}
        </Card>
        {loading && selecionado && <div style={{textAlign:"center",padding:32,color:C.gray3}}>Carregando...</div>}
        {detalhe && (
          <Card titulo={`Chamado #${detalhe.numero} — ${detalhe.assunto}`} extra={
            <BotaoExportar label="↓ PDF" cor="#dc2626" onClick={() => setModalOri(true)}/>
          }>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 24px", marginBottom:20 }}>
                {[["Empresa",detalhe.empresa],["Departamento",detalhe.departamento],["Solicitante",detalhe.solicitante],
                ["Categoria",detalhe.categoria],["Prioridade",detalhe.prioridade],["Status",detalhe.status],
                ["Aberto em",fmt(detalhe.criado_em)],["SLA / Previsão",fmt(detalhe.previsao)],
                ["Tempo gasto",detalhe.tempo_gasto?detalhe.tempo_gasto+" min":"—"],["Resultado",detalhe.resultado||"—"],
                ["Solução Aplicada",detalhe.solucao_aplicada||"—"],
              ].map(([l,v])=>(
                <div key={l} style={{ display:"flex", gap:8, fontSize:13, padding:"5px 0", borderBottom:`1px solid ${C.gray1}` }}>
                  <strong style={{ minWidth:140, color:C.royalDark, fontSize:12, fontFamily:"'Montserrat',sans-serif" }}>{l}</strong>
                  <span style={{color:C.text}}>{v}</span>
                </div>
              ))}
            </div>
            {detalhe.descricao && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:12, fontWeight:700, color:C.royalDark, marginBottom:6 }}>Descrição</div>
                <div style={{ background:"#f8fafc", borderRadius:6, padding:"10px 14px", fontSize:13, color:C.text, lineHeight:1.6 }}>{detalhe.descricao}</div>
              </div>
            )}
            <div>
              <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:12, fontWeight:700, color:C.royalDark, marginBottom:10 }}>
                Movimentações ({detalhe.movimentacoes?.length || 0})
              </div>
              {detalhe.movimentacoes?.length === 0
                ? <div style={{color:C.gray3,fontSize:13}}>Sem movimentações registradas.</div>
                : detalhe.movimentacoes?.map(m=>(
                  <div key={m.id} style={{ background:"#f8fafc", borderLeft:`3px solid ${C.royalLight}`, padding:"8px 14px", marginBottom:8, borderRadius:"0 6px 6px 0" }}>
                    <div style={{ fontSize:11, color:C.gray3, marginBottom:3 }}>{fmt(m.registrado_em)}</div>
                    <div style={{ fontSize:13, color:C.text, lineHeight:1.6 }}>{m.texto}</div>
                  </div>
                ))
              }
            </div>
          </Card>
        )}
        {modalOri && <ModalOrientacao onConfirmar={async ori=>{await gerarPDF(ori);setModalOri(false);}} onFechar={()=>setModalOri(false)}/>}
      </div>
    );
  }

// ══════════════════════════════════════════════════════════════
//  EQUIPAMENTOS
// ══════════════════════════════════════════════════════════════
function RelEquipamentos() {
  const [tipo, setTipo] = useState("inventario");
  return (
    <div>
      <div style={{ display:"flex", gap:16, marginBottom:28 }}>
        {[["inventario","📦 Inventário Geral","Todos os equipamentos com filtros"],
          ["ficha","🔧 Ficha Completa","Um equipamento com histórico de manutenções"]
        ].map(([id,titulo,desc]) => (
          <div key={id} onClick={()=>setTipo(id)} style={{
            flex:1, background:tipo===id?"#eff6ff":C.white,
            border:`2px solid ${tipo===id?C.royalMid:C.gray1}`,
            borderRadius:10, padding:"16px 20px", cursor:"pointer", transition:"all .15s"
          }}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:14,color:tipo===id?C.royalMid:C.text,marginBottom:4}}>{titulo}</div>
            <div style={{fontSize:12,color:C.gray3}}>{desc}</div>
          </div>
        ))}
      </div>
      {tipo === "inventario" ? <InventarioGeral /> : <FichaEquipamento />}
    </div>
  );
}

function InventarioGeral() {
  const [filtros, setFiltros] = useState({ tipo:"", status:"", depto:"", deInicio:"", deFim:"" });
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalExp, setModalExp] = useState(false);
  const upd = (k,v) => setFiltros(f=>({...f,[k]:v}));

  async function buscar() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(filtros.tipo&&{tipo:filtros.tipo}),
        ...(filtros.status&&{status:filtros.status}),
        ...(filtros.depto&&{departamento:filtros.depto}),
        ...(filtros.deInicio&&{de_inicio:filtros.deInicio}),
        ...(filtros.deFim&&{de_fim:filtros.deFim}),
      });
      const r = await fetch(`http://localhost:3001/relatorios/equipamentos/inventario?${params}`);
      const j = await r.json(); setDados(j.data||[]);
    } catch { setDados([]); }
    setLoading(false);
  }

  const COLUNAS = [
    {key:"codigo",label:"Código"},{key:"tipo",label:"Tipo"},{key:"status",label:"Status"},
    {key:"departamento",label:"Departamento"},{key:"usuario",label:"Usuário"},
    {key:"ip",label:"IP"},{key:"mac",label:"MAC"},{key:"so",label:"SO"},
    {key:"office",label:"Office"},{key:"email",label:"E-mail"},
    {key:"criado_em",label:"Cadastrado em"},{key:"obs",label:"Obs"},
  ];

  function exportar(colunas, orientacao, formato) {
    if (formato==="excel") { baixarExcel(dados,`Inventario_${hoje()}`,colunas); return; }
    const html = `
<p class="sub">Total: ${dados.length} equipamento(s)${filtros.tipo?" · "+filtros.tipo:""}${filtros.status?" · "+filtros.status:""}</p>
<table>
  <thead><tr>${colunas.map(c=>`<th>${c.label}</th>`).join("")}</tr></thead>
  <tbody>${dados.map(r=>`<tr>${colunas.map(c=>{
    if(c.key==="status") return `<td><span class="badge badge-${r.status==="Ativo"?"ativo":r.status==="Disponível"?"disponivel":r.status==="Em Manutenção"?"manutencao":"desativado"}">${r.status||"—"}</span></td>`;
    return `<td>${fmt(r[c.key])}</td>`;
  }).join("")}</tr>`).join("")}</tbody>
</table>`;
    baixarPDF("Inventário de Equipamentos", html, orientacao);
  }

  return (
    <div>
      <Card titulo="Filtros">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
          <Campo label="Tipo"><select value={filtros.tipo} onChange={e=>upd("tipo",e.target.value)} style={estiloSelect}><option value="">Todos</option>{TIPOS_EQ.map(t=><option key={t}>{t}</option>)}</select></Campo>
          <Campo label="Status"><select value={filtros.status} onChange={e=>upd("status",e.target.value)} style={estiloSelect}><option value="">Todos</option>{STATUS_EQ.map(s=><option key={s}>{s}</option>)}</select></Campo>
          <Campo label="Departamento"><select value={filtros.depto} onChange={e=>upd("depto",e.target.value)} style={estiloSelect}><option value="">Todos</option>{DEPTOS.map(d=><option key={d}>{d}</option>)}</select></Campo>
          <Campo label="Cadastrado de"><input type="date" value={filtros.deInicio} onChange={e=>upd("deInicio",e.target.value)} style={estiloInput}/></Campo>
          <Campo label="Cadastrado até"><input type="date" value={filtros.deFim} onChange={e=>upd("deFim",e.target.value)} style={estiloInput}/></Campo>
        </div>
        <div style={{ marginTop:16, display:"flex", gap:10, justifyContent:"flex-end" }}>
          <BotaoBuscar onClick={buscar} loading={loading}/>
        </div>
      </Card>
      {dados !== null && (
        <Card titulo={`${dados.length} equipamento(s)`} extra={
          dados.length > 0 && <BotaoExportar label="↓ Exportar" cor={C.royalMid} onClick={()=>setModalExp(true)}/>
        }>
          {dados.length===0 ? <Vazio texto="Nenhum equipamento encontrado."/> : (
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:C.royalDark}}>
                  {["Código","Tipo","Status","Departamento","Usuário","IP","SO","Office"].map(h=>(
                    <th key={h} style={{padding:"9px 12px",color:"#fff",fontFamily:"'Montserrat',sans-serif",fontSize:11,textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{dados.map((r,i)=>(
                  <tr key={r.id} style={{background:i%2===0?C.white:"#f8fafc"}}>
                    <td style={estiloTd}><strong style={{color:C.royalMid}}>{r.codigo}</strong></td>
                    <td style={estiloTd}>{r.tipo}</td>
                    <td style={estiloTd}><StatusEqBadge s={r.status}/></td>
                    <td style={estiloTd}>{r.departamento||"—"}</td>
                    <td style={estiloTd}>{r.usuario||"—"}</td>
                    <td style={estiloTd}>{r.ip||"—"}</td>
                    <td style={estiloTd}>{r.so||"—"}</td>
                    <td style={estiloTd}>{r.office||"—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {modalExp && <ModalExportar colunas={COLUNAS} onConfirmar={exportar} onFechar={()=>setModalExp(false)}/>}
    </div>
  );
}

function FichaEquipamento() {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOri, setModalOri] = useState(false);

  async function pesquisar() {
    if (!busca.trim()) return;
    setLoading(true); setDetalhe(null);
    try {
      const r = await fetch(`http://localhost:3001/relatorios/equipamentos/busca?q=${encodeURIComponent(busca)}`);
      const j = await r.json(); setResultados(j.data||[]);
    } catch { setResultados([]); }
    setLoading(false);
  }

  async function selecionar(eq) {
    setResultados(null); setLoading(true);
    try {
      const r = await fetch(`http://localhost:3001/relatorios/equipamentos/${eq.id}/ficha`);
      const j = await r.json(); setDetalhe(j.data);
    } catch { setDetalhe(null); }
    setLoading(false);
  }

  function gerarPDF(orientacao) {
    const d = detalhe;
    const html = `
<div class="secao"><h2>Identificação</h2>
${[["Código",d.codigo],["Tipo",d.tipo],["Status",d.status],["Departamento",d.departamento||"—"],["Usuário",d.usuario||"—"]].map(([l,v])=>`<div class="campo"><strong>${l}:</strong><span>${v}</span></div>`).join("")}
</div>
<div class="secao"><h2>Rede</h2>
${[["IP",d.ip||"—"],["MAC",d.mac||"—"],["E-mail",d.email||"—"]].map(([l,v])=>`<div class="campo"><strong>${l}:</strong><span>${v}</span></div>`).join("")}
</div>
<div class="secao"><h2>Software</h2>
${[["SO",d.so||"—"],["Chave SO",d.chave_so||"—"],["Office",d.office||"—"],["Chave Office",d.chave_office||"—"]].map(([l,v])=>`<div class="campo"><strong>${l}:</strong><span>${v}</span></div>`).join("")}
</div>
${d.obs?`<div class="secao"><h2>Observações</h2><p style="font-size:11px">${d.obs}</p></div>`:""}
${d.manutencoes?.length>0?`<div class="secao"><h2>Histórico de Manutenções (${d.manutencoes.length})</h2>
<table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Chamado</th></tr></thead>
<tbody>${d.manutencoes.map(m=>`<tr><td>${fmt(m.registrado_em)}</td><td>${m.tipo}</td><td>${m.descricao}</td><td>${m.chamado_numero?"#"+m.chamado_numero:"—"}</td></tr>`).join("")}</tbody>
</table></div>`:""}`;
    baixarPDF(`Ficha — ${d.codigo} (${d.tipo})`, html, orientacao);
  }

  return (
    <div>
      <Card titulo="Buscar Equipamento">
        <div style={{ display:"flex", gap:10 }}>
          <input style={{...estiloInput,flex:1}} placeholder="Código, usuário, IP ou MAC..."
            value={busca} onChange={e=>setBusca(e.target.value)} onKeyDown={e=>e.key==="Enter"&&pesquisar()}/>
          <BotaoBuscar onClick={pesquisar} loading={loading}/>
        </div>
        {resultados !== null && resultados.length === 0 && <Vazio texto="Nenhum equipamento encontrado."/>}
        {resultados?.length > 0 && (
          <div style={{marginTop:12,border:`1px solid ${C.gray1}`,borderRadius:8,overflow:"hidden"}}>
            {resultados.map((eq,i)=>(
              <div key={eq.id} onClick={()=>selecionar(eq)} style={{padding:"11px 16px",background:i%2===0?C.white:"#f8fafc",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.gray1}`}}>
                <div>
                  <strong style={{color:C.royalMid}}>{eq.codigo}</strong>
                  <span style={{margin:"0 8px",color:C.gray2}}>·</span><span>{eq.tipo}</span>
                  <span style={{margin:"0 8px",color:C.gray2}}>·</span><span style={{color:C.gray3}}>{eq.departamento||"Sem depto"}</span>
                  {eq.usuario&&<><span style={{margin:"0 8px",color:C.gray2}}>·</span><span style={{color:C.gray3}}>{eq.usuario}</span></>}
                </div>
                <StatusEqBadge s={eq.status}/>
              </div>
            ))}
          </div>
        )}
      </Card>
      {loading && !detalhe && <div style={{textAlign:"center",padding:32,color:C.gray3}}>Carregando ficha...</div>}
      {detalhe && (
        <Card titulo={`${detalhe.codigo} — ${detalhe.tipo}`} extra={<BotaoExportar label="↓ PDF" cor="#dc2626" onClick={()=>setModalOri(true)}/>}>
          {[{titulo:"Identificação",campos:[["Código",detalhe.codigo],["Tipo",detalhe.tipo],["Status",detalhe.status],["Departamento",detalhe.departamento||"—"],["Usuário",detalhe.usuario||"—"]]},
            {titulo:"Rede",campos:[["IP",detalhe.ip||"—"],["MAC",detalhe.mac||"—"],["E-mail",detalhe.email||"—"]]},
            {titulo:"Software",campos:[["SO",detalhe.so||"—"],["Chave SO",detalhe.chave_so||"—"],["Office",detalhe.office||"—"],["Chave Office",detalhe.chave_office||"—"]]},
          ].map(sec=>(
            <div key={sec.titulo} style={{marginBottom:18}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:700,color:C.royalMid,letterSpacing:.5,textTransform:"uppercase",marginBottom:8}}>{sec.titulo}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 24px"}}>
                {sec.campos.map(([l,v])=>(
                  <div key={l} style={{display:"flex",gap:8,fontSize:13,padding:"4px 0",borderBottom:`1px solid ${C.gray1}`}}>
                    <strong style={{minWidth:130,color:C.royalDark,fontSize:12,fontFamily:"'Montserrat',sans-serif"}}>{l}</strong>
                    <span style={{color:C.text,wordBreak:"break-all"}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {detalhe.obs&&<div style={{marginBottom:18}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:700,color:C.royalMid,textTransform:"uppercase",marginBottom:6}}>Observações</div><div style={{background:"#f8fafc",borderRadius:6,padding:"10px 14px",fontSize:13,color:C.text}}>{detalhe.obs}</div></div>}
          <div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:700,color:C.royalMid,textTransform:"uppercase",marginBottom:10}}>Manutenções ({detalhe.manutencoes?.length||0})</div>
            {!detalhe.manutencoes?.length ? <div style={{color:C.gray3,fontSize:13}}>Nenhuma manutenção registrada.</div> : (
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:"#f1f5f9"}}>
                  {["Data","Tipo","Descrição","Chamado"].map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",fontFamily:"'Montserrat',sans-serif",fontSize:11,color:C.royalDark}}>{h}</th>)}
                </tr></thead>
                <tbody>{detalhe.manutencoes.map((m,i)=>(
                  <tr key={m.id} style={{background:i%2===0?C.white:"#f8fafc",borderBottom:`1px solid ${C.gray1}`}}>
                    <td style={{...estiloTd,whiteSpace:"nowrap"}}>{fmt(m.registrado_em)}</td>
                    <td style={estiloTd}><span style={{background:"#dbeafe",color:"#1d4ed8",padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:700}}>{m.tipo}</span></td>
                    <td style={estiloTd}>{m.descricao}</td>
                    <td style={estiloTd}>{m.chamado_numero?<span style={{color:C.royalMid,fontWeight:700}}>#{m.chamado_numero}</span>:"—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </Card>
      )}
      {modalOri&&<ModalOrientacao onConfirmar={ori=>{gerarPDF(ori);setModalOri(false);}} onFechar={()=>setModalOri(false)}/>}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────
function Card({ titulo, extra, children }) {
  return (
    <div style={{ background:C.white, borderRadius:10, border:`1px solid ${C.gray1}`, marginBottom:20, overflow:"hidden" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", borderBottom:`1px solid ${C.gray1}`, background:"#fafbfc" }}>
        <div style={{ fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:13, color:C.royalDark }}>{titulo}</div>
        {extra}
      </div>
      <div style={{ padding:20 }}>{children}</div>
    </div>
  );
}
function Campo({ label, obrigatorio, children }) {
  return (
    <div>
      <label style={{ display:"block", fontFamily:"'Montserrat',sans-serif", fontSize:11, fontWeight:700, color:C.royalDark, marginBottom:5, letterSpacing:.3 }}>
        {label}{obrigatorio&&<span style={{color:C.red,marginLeft:2}}>*</span>}
      </label>
      {children}
    </div>
  );
}
function BotaoBuscar({ onClick, loading }) {
  return <button onClick={onClick} disabled={loading} style={{ background:C.royalMid, color:"#fff", border:"none", borderRadius:7, padding:"0 22px", height:38, cursor:"pointer", fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:12, display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}>{loading?"Buscando...":"🔍 Buscar"}</button>;
}
function BotaoExportar({ label, cor, onClick }) {
  return <button onClick={onClick} style={{ background:cor, color:"#fff", border:"none", borderRadius:7, padding:"6px 16px", cursor:"pointer", fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:12 }}>{label}</button>;
}
function Vazio({ texto }) {
  return <div style={{ textAlign:"center", padding:"28px 0", color:C.gray3, fontSize:13 }}>{texto}</div>;
}
function StatusBadge({ s }) {
  const m = {"Aberto":["#dbeafe","#1d4ed8"],"Em Análise":["#fef3c7","#92400e"],"Fechado":["#dcfce7","#166534"],"Sem Solução":["#fee2e2","#991b1b"]};
  const [bg,color] = m[s]||["#f1f5f9","#475569"];
  return <span style={{background:bg,color,padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{s}</span>;
}
function StatusEqBadge({ s }) {
  const m = {"Ativo":["#dcfce7","#166534"],"Disponível":["#dbeafe","#1d4ed8"],"Em Manutenção":["#fef3c7","#92400e"],"Desativado":["#f1f5f9","#475569"]};
  const [bg,color] = m[s]||["#f1f5f9","#475569"];
  return <span style={{background:bg,color,padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{s}</span>;
}
function PrioridadeBadge({ p }) {
  const m = {"Crítica":["#fee2e2","#991b1b"],"Alta":["#ffedd5","#9a3412"],"Média":["#fef9c3","#854d0e"],"Baixa":["#f0fdf4","#166534"]};
  const [bg,color] = m[p]||["#f1f5f9","#475569"];
  return <span style={{background:bg,color,padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:700}}>{p}</span>;
}
function SLACell({ previsao, status }) {
  if (!previsao) return <span style={{color:C.gray2}}>—</span>;
  if (status==="Fechado"||status==="Sem Solução") return <span style={{color:C.gray3,fontSize:12}}>{fmtDate(previsao)}</span>;
  const diff = new Date(previsao)-new Date();
  const color = diff<0?C.red:diff<7200000?C.amber:C.green;
  return <span style={{color,fontWeight:600,fontSize:12}}>{fmtDate(previsao)}</span>;
}

const estiloInput = { width:"100%", padding:"8px 12px", border:`1.5px solid ${C.gray1}`, borderRadius:7, fontFamily:"'Nunito',sans-serif", fontSize:13, color:C.text, outline:"none", boxSizing:"border-box" };
const estiloSelect = { ...estiloInput, background:C.white };
const estiloTd = { padding:"8px 12px", color:C.text };