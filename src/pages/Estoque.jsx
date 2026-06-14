/**
 * @fileoverview Módulo de Estoque — Produtos, Requisições de Entrada e Saída.
 */
import { useState, useEffect, useMemo } from "react";
import { BASE } from "../utils/helpers";
import { C, Field, Btn, inputStyle } from "../components/UI";

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const TIPOS_PRODUTO = ["Mouse","Teclado","Cabo","Toner","Memória RAM","Fonte","Adaptador","Outro"];
const UNIDADES      = ["un","cx","pc","rolo","resma","par"];

// ─── HELPERS LOCAIS ───────────────────────────────────────────────────────────
function fmtData(ts){ if(!ts) return "—"; return new Date(ts).toLocaleDateString("pt-BR"); }
function fmtDt(ts){ if(!ts) return "—"; const d=new Date(ts); return d.toLocaleDateString("pt-BR")+" "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}); }

// ─── BADGE ESTOQUE ────────────────────────────────────────────────────────────
function BadgeEstoque({ quantidade, qtd_minima }){
  const critico = quantidade <= 0;
  const baixo   = !critico && quantidade <= qtd_minima;
  if(critico) return <span style={{background:C.redLight,color:C.red,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,fontFamily:"'Montserrat',sans-serif"}}>Sem estoque</span>;
  if(baixo)   return <span style={{background:C.amberLight,color:C.amber,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,fontFamily:"'Montserrat',sans-serif"}}>Estoque baixo</span>;
  return <span style={{background:"#dcfce7",color:"#166534",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,fontFamily:"'Montserrat',sans-serif"}}>OK</span>;
}

// ─── BADGE TIPO REQUISIÇÃO ────────────────────────────────────────────────────
function BadgeTipo({ tipo }){
  const s = tipo==="entrada"
    ? {bg:"#dcfce7",color:"#166534",label:"↓ Entrada"}
    : {bg:C.redLight,color:C.red,label:"↑ Saída"};
  return <span style={{background:s.bg,color:s.color,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,fontFamily:"'Montserrat',sans-serif"}}>{s.label}</span>;
}

// ─── BADGE STATUS REQUISIÇÃO ──────────────────────────────────────────────────
function BadgeStatusReq({ status }){
  const s = status==="finalizada"
    ? {bg:"#dcfce7",color:"#166534"}
    : {bg:C.amberLight,color:C.amber};
  return <span style={{background:s.bg,color:s.color,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,fontFamily:"'Montserrat',sans-serif",textTransform:"capitalize"}}>{status}</span>;
}

// ─── MODAL PRODUTO ────────────────────────────────────────────────────────────
function ModalProduto({ produto, onClose, onSave }){
  const isNovo = !produto?.id;
  const [form, setForm] = useState(produto || {nome:"",tipo:"Mouse",unidade:"un",quantidade:0,qtd_minima:0});
  const [salvando, setSalvando] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if(!form.nome.trim()) return alert("Informe o nome do produto.");
    if(form.quantidade < 0) return alert("Quantidade não pode ser negativa.");
    if(form.qtd_minima < 0) return alert("Quantidade mínima não pode ser negativa.");
    setSalvando(true);
    try {
      const metodo = isNovo ? "POST" : "PUT";
      const url    = isNovo ? `${BASE}/estoque/itens` : `${BASE}/estoque/itens/${produto.id}`;
      const r = await fetch(url,{ method:metodo, headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
      const j = await r.json();
      if(j.ok) onSave(j.data);
      else alert("Erro ao salvar: "+j.error);
    } catch { alert("Erro ao salvar produto."); }
    setSalvando(false);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.white,borderRadius:12,width:"min(480px,96vw)",overflow:"hidden",border:`1px solid ${C.slate200}`}}>
        <div style={{background:C.royalDark,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:C.white}}>{isNovo?"Novo Produto":"Editar Produto"}</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:C.white,width:30,height:30,borderRadius:6,cursor:"pointer",fontSize:16}}>×</button>
        </div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
          <Field label="Nome do Produto">
            <input value={form.nome} onChange={e=>set("nome",e.target.value)} placeholder="Ex: Mouse USB" style={inputStyle}/>
          </Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Tipo">
              <select value={form.tipo} onChange={e=>set("tipo",e.target.value)} style={inputStyle}>
                {TIPOS_PRODUTO.map(t=><option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Unidade de Medida">
              <select value={form.unidade} onChange={e=>set("unidade",e.target.value)} style={inputStyle}>
                {UNIDADES.map(u=><option key={u}>{u}</option>)}
              </select>
            </Field>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Quantidade Atual">
              <input type="number" min={0} value={form.quantidade} onChange={e=>set("quantidade",parseInt(e.target.value)||0)} style={inputStyle}/>
            </Field>
            <Field label="Quantidade Mínima">
              <input type="number" min={0} value={form.qtd_minima} onChange={e=>set("qtd_minima",parseInt(e.target.value)||0)} style={inputStyle}/>
            </Field>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:4}}>
            <Btn onClick={onClose}>Cancelar</Btn>
            <Btn primary disabled={salvando} onClick={handleSave}>{salvando?"Salvando...":(isNovo?"Cadastrar":"Salvar alterações")}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL FINALIZAR ENTRADA ──────────────────────────────────────────────────
function ModalFinalizarEntrada({ requisicao, onClose, onFinalizada }){
  const [obs, setObs]           = useState(requisicao.observacao||"");
  const [salvando, setSalvando] = useState(false);

  const handleFinalizar = async () => {
    setSalvando(true);
    try {
      const r = await fetch(`${BASE}/estoque/requisicoes/${requisicao.id}/finalizar`,{
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({observacao:obs})
      });
      const j = await r.json();
      if(j.ok) onFinalizada(j.data);
      else alert("Erro ao finalizar: "+j.error);
    } catch { alert("Erro ao finalizar requisição."); }
    setSalvando(false);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.white,borderRadius:12,width:"min(500px,96vw)",overflow:"hidden",border:`1px solid ${C.slate200}`}}>
        <div style={{background:C.royalDark,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:C.white}}>Finalizar Requisição de Entrada</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:C.white,width:30,height:30,borderRadius:6,cursor:"pointer",fontSize:16}}>×</button>
        </div>
        <div style={{padding:20}}>
          {/* Resumo dos itens */}
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:700,color:C.slate400,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Itens que serão acrescentados ao estoque</div>
            <div style={{border:`1px solid ${C.slate200}`,borderRadius:8,overflow:"hidden"}}>
              {requisicao.itens.map((item,i)=>(
                <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:i%2===0?C.white:"#f8fafc",borderBottom:`1px solid ${C.slate200}`}}>
                  <div>
                    <span style={{fontWeight:700,fontSize:13,color:C.slate800}}>{item.nome}</span>
                    <span style={{fontSize:11,color:C.slate400,marginLeft:8}}>{item.tipo}</span>
                  </div>
                  <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:13,color:"#166534"}}>+{item.quantidade} {item.unidade}</span>
                </div>
              ))}
            </div>
          </div>
          <Field label="Observação (opcional)">
            <textarea value={obs} onChange={e=>setObs(e.target.value)} placeholder="Ex: Recebido via NF 12345, fornecedor X..." style={{...inputStyle,minHeight:72,resize:"vertical"}}/>
          </Field>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
            <Btn onClick={onClose}>Cancelar</Btn>
            <Btn primary disabled={salvando} onClick={handleFinalizar}>{salvando?"Finalizando...":"✓ Confirmar Entrada"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ABA PRODUTOS ─────────────────────────────────────────────────────────────
function AbaProdutos({ produtos, carregando, onNovo, onEditar, onRemover }){
  const [busca, setBusca] = useState("");
  const [fTipo, setFTipo] = useState("");

  const lista = useMemo(()=>produtos.filter(p=>{
    if(fTipo && p.tipo!==fTipo) return false;
    if(busca){
      const b=busca.toLowerCase();
      return p.nome.toLowerCase().includes(b)||p.tipo.toLowerCase().includes(b);
    }
    return true;
  }),[produtos,busca,fTipo]);

  const criticos = produtos.filter(p=>p.quantidade<=p.qtd_minima).length;

  return(
    <div>
      {/* Métricas */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:20}}>
        {[
          {label:"Total de Produtos",value:produtos.length,color:C.royalDark,bg:"#e8f0fb",icon:"📦"},
          {label:"Estoque OK",value:produtos.filter(p=>p.quantidade>p.qtd_minima).length,color:"#166534",bg:"#dcfce7",icon:"✅"},
          {label:"Atenção / Crítico",value:criticos,color:criticos>0?C.red:C.slate400,bg:criticos>0?C.redLight:C.slate100,icon:"⚠️"},
        ].map(s=>(
          <div key={s.label} style={{background:C.white,borderRadius:10,border:`1px solid ${C.slate200}`,padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:8,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{s.icon}</div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:C.slate400,textTransform:"uppercase",letterSpacing:".06em",fontFamily:"'Montserrat',sans-serif"}}>{s.label}</div>
              <div style={{fontSize:22,fontWeight:700,color:s.color,fontFamily:"'Montserrat',sans-serif",lineHeight:1.1}}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:6,border:`1px solid ${C.slate200}`,borderRadius:6,padding:"5px 10px",background:C.royalBg,flex:1,maxWidth:260}}>
          <span style={{fontSize:12,color:C.slate400}}>🔍</span>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar produto..." style={{border:"none",background:"transparent",fontSize:12,color:C.slate800,width:"100%",outline:"none",fontFamily:"'Nunito',sans-serif"}}/>
        </div>
        <select value={fTipo} onChange={e=>setFTipo(e.target.value)} style={{fontSize:11,padding:"5px 8px",borderRadius:5,border:`1px solid ${C.slate200}`,background:C.white,color:C.slate600,fontFamily:"'Nunito',sans-serif",cursor:"pointer"}}>
          <option value="">Tipo: todos</option>
          {TIPOS_PRODUTO.map(t=><option key={t}>{t}</option>)}
        </select>
        <button onClick={onNovo} style={{marginLeft:"auto",padding:"6px 14px",borderRadius:6,border:`1px solid ${C.royalDark}`,background:C.royalDark,color:C.white,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Nunito',sans-serif",whiteSpace:"nowrap"}}>+ Novo Produto</button>
      </div>

      {/* Tabela */}
      <div style={{background:C.white,borderRadius:10,border:`1px solid ${C.slate200}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 120px 80px 100px 120px 120px",padding:"0 16px",height:32,background:C.slate100,borderBottom:`1px solid ${C.slate200}`,alignItems:"center"}}>
          {["Produto","Tipo","Unidade","Qtd Atual","Qtd Mínima","Status"].map((h,i)=>(
            <div key={i} style={{fontSize:10,fontWeight:700,color:C.slate400,textTransform:"uppercase",letterSpacing:".06em",fontFamily:"'Montserrat',sans-serif"}}>{h}</div>
          ))}
        </div>
        {carregando?(
          <div style={{textAlign:"center",padding:"32px 0",color:C.slate400,fontSize:13}}>Carregando...</div>
        ):lista.length===0?(
          <div style={{textAlign:"center",padding:"32px 0",color:C.slate400,fontSize:13}}>Nenhum produto cadastrado.</div>
        ):lista.map((p,i)=>(
          <div key={p.id}
            style={{display:"grid",gridTemplateColumns:"1fr 120px 80px 100px 120px 120px",padding:"10px 16px",borderBottom:`1px solid ${C.slate100}`,alignItems:"center",background:i%2===0?C.white:"#fafbfe",cursor:"pointer"}}
            onClick={()=>onEditar(p)}
            onMouseEnter={ev=>ev.currentTarget.style.background="#eff6ff"}
            onMouseLeave={ev=>ev.currentTarget.style.background=i%2===0?C.white:"#fafbfe"}>
            <div style={{fontWeight:700,fontSize:13,color:C.slate800}}>{p.nome}</div>
            <div style={{fontSize:12,color:C.slate600}}>{p.tipo}</div>
            <div style={{fontSize:12,color:C.slate600}}>{p.unidade}</div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:14,color:p.quantidade<=0?C.red:p.quantidade<=p.qtd_minima?C.amber:C.slate800}}>{p.quantidade}</div>
            <div style={{fontSize:12,color:C.slate400}}>{p.qtd_minima}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <BadgeEstoque quantidade={p.quantidade} qtd_minima={p.qtd_minima}/>
              <button onClick={e=>{e.stopPropagation();onRemover(p);}} style={{background:"none",border:"none",color:C.slate400,cursor:"pointer",fontSize:14,padding:"2px 4px"}} title="Remover">×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ABA REQUISIÇÕES ──────────────────────────────────────────────────────────
function AbaRequisicoes({ requisicoes, carregando, onFinalizar }){
  const [fTipo,   setFTipo]   = useState("");
  const [fStatus, setFStatus] = useState("");

  const lista = useMemo(()=>requisicoes.filter(r=>{
    if(fTipo   && r.tipo!==fTipo)     return false;
    if(fStatus && r.status!==fStatus) return false;
    return true;
  }),[requisicoes,fTipo,fStatus]);

  return(
    <div>
      {/* Filtros */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <select value={fTipo} onChange={e=>setFTipo(e.target.value)} style={{fontSize:11,padding:"5px 8px",borderRadius:5,border:`1px solid ${C.slate200}`,background:C.white,color:C.slate600,fontFamily:"'Nunito',sans-serif",cursor:"pointer"}}>
          <option value="">Tipo: todos</option>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
        <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{fontSize:11,padding:"5px 8px",borderRadius:5,border:`1px solid ${C.slate200}`,background:C.white,color:C.slate600,fontFamily:"'Nunito',sans-serif",cursor:"pointer"}}>
          <option value="">Status: todos</option>
          <option value="pendente">Pendente</option>
          <option value="finalizada">Finalizada</option>
        </select>
        {(fTipo||fStatus)&&<button onClick={()=>{setFTipo("");setFStatus("");}} style={{fontSize:11,color:C.red,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>✕ Limpar</button>}
        <span style={{marginLeft:"auto",fontSize:11,color:C.slate400,fontFamily:"'Montserrat',sans-serif"}}>{lista.length} requisição(ões)</span>
      </div>

      {/* Lista */}
      {carregando?(
        <div style={{textAlign:"center",padding:"32px 0",color:C.slate400,fontSize:13}}>Carregando...</div>
      ):lista.length===0?(
        <div style={{textAlign:"center",padding:"48px 0",color:C.slate400}}>
          <div style={{fontSize:28,marginBottom:8}}>📋</div>
          <div style={{fontSize:13,fontWeight:600}}>Nenhuma requisição encontrada.</div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {lista.map(r=>(
            <div key={r.id} style={{background:C.white,borderRadius:10,border:`1px solid ${C.slate200}`,overflow:"hidden"}}>
              {/* Cabeçalho da requisição */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:`1px solid ${C.slate100}`,background:"#fafbfe"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <BadgeTipo tipo={r.tipo}/>
                  <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:C.royalMid}}>
                    Chamado #{String(r.chamado_numero).padStart(4,"0")}
                  </span>
                  <span style={{fontSize:12,color:C.slate600,maxWidth:300,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.chamado_assunto}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:11,color:C.slate400}}>{fmtDt(r.criado_em)}</span>
                  <BadgeStatusReq status={r.status}/>
                  {r.tipo==="entrada" && r.status==="pendente" && (
                    <button onClick={()=>onFinalizar(r)}
                      style={{padding:"4px 12px",borderRadius:6,border:`1px solid ${C.royalDark}`,background:C.royalDark,color:C.white,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>
                      ✓ Finalizar entrada
                    </button>
                  )}
                </div>
              </div>
              {/* Itens */}
              <div style={{padding:"10px 16px",display:"flex",flexWrap:"wrap",gap:8}}>
                {r.itens.map(item=>(
                  <div key={item.id} style={{display:"flex",alignItems:"center",gap:6,background:C.royalBg,borderRadius:6,padding:"5px 10px",fontSize:12}}>
                    <span style={{fontWeight:700,color:C.slate800}}>{item.nome}</span>
                    <span style={{color:C.slate400}}>·</span>
                    <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,color:r.tipo==="entrada"?"#166534":C.red}}>{r.tipo==="entrada"?"+":"-"}{item.quantidade} {item.unidade}</span>
                  </div>
                ))}
              </div>
              {/* Observação */}
              {r.observacao&&(
                <div style={{padding:"6px 16px 12px",fontSize:12,color:C.slate600}}>
                  <span style={{fontWeight:700,color:C.slate400}}>Obs: </span>{r.observacao}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Estoque(){
  const [aba,          setAba]          = useState("produtos");
  const [produtos,     setProdutos]     = useState([]);
  const [requisicoes,  setRequisicoes]  = useState([]);
  const [carregando,   setCarregando]   = useState(true);
  const [modalProduto, setModalProduto] = useState(null);  // null | {} | produto
  const [modalFinalizar, setModalFinalizar] = useState(null);

  // Carrega dados iniciais
  useEffect(()=>{
    async function carregar(){
      setCarregando(true);
      try {
        const [rP, rR] = await Promise.all([
          fetch(`${BASE}/estoque/itens`).then(r=>r.json()),
          fetch(`${BASE}/estoque/requisicoes`).then(r=>r.json()),
        ]);
        if(rP.ok) setProdutos(rP.data);
        if(rR.ok) setRequisicoes(rR.data);
      } catch { alert("Erro ao carregar dados do estoque."); }
      setCarregando(false);
    }
    carregar();
  },[]);

  /**
   * Atualiza lista local após salvar produto — evita refetch.
   * @param {object} produto - Produto retornado pela API.
   */
  const handleProdutoSalvo = (produto) => {
    setProdutos(p=>{
      const existe = p.find(x=>x.id===produto.id);
      return existe ? p.map(x=>x.id===produto.id?produto:x) : [...p,produto];
    });
    setModalProduto(null);
  };

  /**
   * Remove produto após confirmação.
   * @param {object} produto - Produto a remover.
   */
  const handleRemoverProduto = async (produto) => {
    if(!confirm(`Remover "${produto.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const r = await fetch(`${BASE}/estoque/itens/${produto.id}`,{method:"DELETE"});
      const j = await r.json();
      if(j.ok) setProdutos(p=>p.filter(x=>x.id!==produto.id));
      else alert("Erro ao remover: "+j.error);
    } catch { alert("Erro ao remover produto."); }
  };

  /**
   * Finaliza requisição de entrada e atualiza estoque local.
   * @param {object} finalizada - Requisição finalizada retornada pela API.
   */
  const handleEntradaFinalizada = async (finalizada) => {
    // Atualiza requisição na lista
    setRequisicoes(p=>p.map(r=>r.id===finalizada.id?{...r,...finalizada}:r));
    // Refetch produtos para refletir novas quantidades
    try {
      const r = await fetch(`${BASE}/estoque/itens`);
      const j = await r.json();
      if(j.ok) setProdutos(j.data);
    } catch {}
    setModalFinalizar(null);
  };

  const pendentes = requisicoes.filter(r=>r.tipo==="entrada"&&r.status==="pendente").length;

  return(
    <div style={{minHeight:"100vh",background:C.royalBg,fontFamily:"'Nunito',sans-serif"}}>

      {/* Header */}
      <div style={{background:C.royalDark,padding:"18px 32px",display:"flex",alignItems:"center",gap:12}}>
        <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        <div>
          <div style={{fontFamily:"'Montserrat',sans-serif",color:"#fff",fontWeight:700,fontSize:18,letterSpacing:.5}}>Estoque</div>
          <div style={{color:"#93c5fd",fontSize:12}}>Controle de produtos e requisições</div>
        </div>
      </div>

      {/* Abas */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.slate200}`,display:"flex",padding:"0 32px"}}>
        {[
          {id:"produtos",label:"Produtos"},
          {id:"requisicoes",label:pendentes>0?`Requisições · ${pendentes} pendente${pendentes>1?"s":""}` :"Requisições"},
        ].map(({id,label})=>(
          <button key={id} onClick={()=>setAba(id)} style={{padding:"14px 24px",border:"none",background:"none",cursor:"pointer",fontFamily:"'Montserrat',sans-serif",fontWeight:600,fontSize:13,color:aba===id?C.royalMid:C.slate400,borderBottom:aba===id?`2.5px solid ${C.royalMid}`:"2.5px solid transparent",transition:"all .15s"}}>
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div style={{padding:"28px 32px",maxWidth:1100,margin:"0 auto"}}>
        {aba==="produtos"?(
          <AbaProdutos
            produtos={produtos}
            carregando={carregando}
            onNovo={()=>setModalProduto({})}
            onEditar={p=>setModalProduto(p)}
            onRemover={handleRemoverProduto}
          />
        ):(
          <AbaRequisicoes
            requisicoes={requisicoes}
            carregando={carregando}
            onFinalizar={r=>setModalFinalizar(r)}
          />
        )}
      </div>

      {/* Modais */}
      {modalProduto!==null&&(
        <ModalProduto
          produto={modalProduto?.id?modalProduto:null}
          onClose={()=>setModalProduto(null)}
          onSave={handleProdutoSalvo}
        />
      )}
      {modalFinalizar&&(
        <ModalFinalizarEntrada
          requisicao={modalFinalizar}
          onClose={()=>setModalFinalizar(null)}
          onFinalizada={handleEntradaFinalizada}
        />
      )}
    </div>
  );
}