import { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";

const EMPRESAS      = ["Empresa Principal", "Filial"];
const DEPARTAMENTOS = [
  "Almoxarifado","Comercial","Compras","Contabilidade","Diretoria",
  "Elétrica","Expedição","Fábrica","Financeiro","Jurídico",
  "Logística","Portaria","PPCP","Qualidade","Recursos Humanos",
  "Segurança do Trabalho","TI",
];
const CATEGORIAS  = ["Impressoras","Suporte ao Usuário","Manutenções"];
const PRIORIDADES = ["Crítica","Alta","Média","Baixa"];
const STATUS_LISTA= ["Aberto","Em Análise","Fechado","Sem Solução"];
const SLA_HORAS   = { Crítica:4, Alta:8, Média:24, Baixa:72 };
const PRIO_ORDEM  = { Crítica:1, Alta:2, Média:3, Baixa:4 };
const ATIVOS      = ["Aberto","Em Análise"];
const ENCERRADOS  = ["Fechado","Sem Solução"];

function calcPrevisao(prioridade, criadoEm = new Date()) {
  return new Date(new Date(criadoEm).getTime() + (SLA_HORAS[prioridade]||24)*3600000);
}
function slaStatus(c) {
  if (ENCERRADOS.includes(c.status)) return "encerrado";
  if (!c.previsao) return "ok";
  const diff = new Date(c.previsao) - new Date();
  if (diff < 0) return "vencido";
  if (diff < 7200000) return "atencao";
  return "ok";
}
function slaLabel(c) {
  if (ENCERRADOS.includes(c.status)) return "Encerrado";
  if (!c.previsao) return "—";
  const diff = new Date(c.previsao) - new Date();
  if (diff < 0) {
    const h=Math.abs(Math.floor(diff/3600000)), m=Math.abs(Math.floor((diff%3600000)/60000));
    return `Vencido ${h}h${m?m+"m":""}`;
  }
  const h=Math.floor(diff/3600000), m=Math.floor((diff%3600000)/60000);
  return h>0?`${h}h ${m}min`:`${m}min`;
}
function fmtDt(ts) {
  if (!ts) return "—";
  const d=new Date(ts);
  return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})+" "+
    d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}
function fmtDtFull(ts) {
  if (!ts) return "—";
  const d=new Date(ts);
  return d.toLocaleDateString("pt-BR")+" "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}

const C = {
  royalDark:"#1a3a6b",royalMid:"#2d5aa0",royalLight:"#5b9bd5",
  royalBg:"#f0f4f8",royalGhost:"#e8f0fb",
  white:"#ffffff",slate800:"#1e293b",slate600:"#475569",
  slate400:"#94a3b8",slate200:"#e2e8f0",slate100:"#f1f5f9",
  greenDark:"#15803d",red:"#dc2626",redLight:"#fee2e2",
  amber:"#d97706",amberLight:"#fef3c7",
};
const inp={width:"100%",padding:"7px 10px",border:`1.5px solid ${C.slate200}`,borderRadius:6,fontSize:13,color:C.slate800,outline:"none",fontFamily:"'Nunito',sans-serif",background:C.white,boxSizing:"border-box"};

function Field({label,children}){return <div><div style={{fontSize:11,fontWeight:700,color:C.slate800,textTransform:"uppercase",letterSpacing:".06em",fontFamily:"'Montserrat',sans-serif",marginBottom:4}}>{label}</div>{children}</div>;}
function Btn({children,onClick,primary,style:s}){return <button onClick={onClick} style={{padding:"6px 13px",borderRadius:6,border:primary?`1px solid ${C.royalDark}`:`1px solid ${C.slate200}`,background:primary?C.royalDark:C.white,color:primary?C.white:C.slate600,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Nunito',sans-serif",whiteSpace:"nowrap",...s}}>{children}</button>;}
function BadgePrioridade({p}){const map={Crítica:{bg:C.redLight,color:"#c53030"},Alta:{bg:C.amberLight,color:"#b45309"},Média:{bg:"#dbeafe",color:"#1d4ed8"},Baixa:{bg:"#dcfce7",color:C.greenDark}};const s=map[p]||{bg:C.slate100,color:C.slate600};return <span style={{background:s.bg,color:s.color,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,fontFamily:"'Montserrat',sans-serif",whiteSpace:"nowrap"}}>{p}</span>;}
function BadgeStatus({s,onClick}){const map={"Aberto":{bg:C.royalGhost,color:C.royalDark},"Em Análise":{bg:C.amberLight,color:"#b45309"},"Fechado":{bg:"#dcfce7",color:C.greenDark},"Sem Solução":{bg:C.redLight,color:"#c53030"}};const st=map[s]||{bg:C.slate100,color:C.slate600};return <button onClick={onClick} style={{background:st.bg,color:st.color,fontSize:11,fontWeight:700,padding:"4px 9px",borderRadius:5,fontFamily:"'Montserrat',sans-serif",border:"none",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:3,whiteSpace:"nowrap"}}>{s} <span style={{fontSize:10}}>▾</span></button>;}
function SLAPill({chamado}){const st=slaStatus(chamado),label=slaLabel(chamado);const map={vencido:{bg:C.redLight,color:C.red},atencao:{bg:C.amberLight,color:C.amber},ok:{bg:"#dcfce7",color:C.greenDark},encerrado:{bg:C.slate100,color:C.slate400}};const s=map[st]||map.ok;return <span style={{background:s.bg,color:s.color,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,fontFamily:"'Montserrat',sans-serif",whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:3}}>{st==="vencido"&&"⚠ "}{label}</span>;}

function ModalChamado({chamado,movimentacoes,onClose,onSave,onAddMov,onFechar}){
  const isNovo=!chamado?.id;
  const [form,setForm]=useState(chamado||{empresa:"Empresa Principal",departamento:"",solicitante:"",assunto:"",descricao:"",categoria:"Suporte ao Usuário",prioridade:"Média",status:"Aberto",previsao:""});
  const [novaMov,setNovaMov]=useState("");
  const [fechando,setFechando]=useState(false);
  const [fechForm,setFechForm]=useState({tempo_gasto:"",resultado:""});
  const [salvando,setSalvando]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const movs=(movimentacoes||[]).filter(m=>m.chamado_id===chamado?.id).sort((a,b)=>new Date(b.registrado_em)-new Date(a.registrado_em));

  const handleSave=async()=>{
    if(!form.assunto?.trim())return alert("Informe o assunto.");
    if(!form.departamento)return alert("Selecione o departamento.");
    if(!form.solicitante?.trim())return alert("Informe o solicitante.");
    setSalvando(true);
    const previsao=form.previsao?new Date(form.previsao).toISOString():calcPrevisao(form.prioridade).toISOString();
    await onSave({...form,previsao});
    setSalvando(false);
  };
  const handleAddMov=async()=>{if(!novaMov.trim())return;await onAddMov(chamado.id,novaMov.trim());setNovaMov("");};
  const handleFechar=async()=>{if(!fechForm.resultado?.trim())return alert("Descreva o resultado.");await onFechar(chamado.id,fechForm);setFechando(false);};

  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.white,borderRadius:12,width:"min(700px,96vw)",maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",border:`1px solid ${C.slate200}`}}>
        <div style={{background:C.royalDark,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:13,fontWeight:700,color:C.white}}>{isNovo?"Novo Chamado":`Chamado #${chamado.numero}`}</div>
            {!isNovo&&<div style={{fontSize:11,color:C.royalLight,marginTop:2}}>{chamado.empresa} · {chamado.departamento}</div>}
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:C.white,width:30,height:30,borderRadius:6,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.slate200}`}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <Field label="Empresa"><select value={form.empresa} onChange={e=>set("empresa",e.target.value)} style={inp}>{EMPRESAS.map(e=><option key={e}>{e}</option>)}</select></Field>
              <Field label="Departamento"><select value={form.departamento} onChange={e=>set("departamento",e.target.value)} style={inp}><option value="">Selecione...</option>{DEPARTAMENTOS.map(d=><option key={d}>{d}</option>)}</select></Field>
            </div>
            <div style={{marginBottom:12}}><Field label="Solicitante"><input value={form.solicitante} onChange={e=>set("solicitante",e.target.value)} placeholder="Nome do usuário" style={inp}/></Field></div>
            <div style={{marginBottom:12}}><Field label="Assunto"><input value={form.assunto} onChange={e=>set("assunto",e.target.value)} placeholder="Descreva brevemente o problema" style={inp}/></Field></div>
            <div style={{marginBottom:12}}><Field label="Descrição"><textarea value={form.descricao||""} onChange={e=>set("descricao",e.target.value)} placeholder="Detalhes adicionais..." style={{...inp,minHeight:64,resize:"vertical"}}/></Field></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:12}}>
              <Field label="Categoria"><select value={form.categoria} onChange={e=>set("categoria",e.target.value)} style={inp}>{CATEGORIAS.map(c=><option key={c}>{c}</option>)}</select></Field>
              <Field label="Prioridade"><select value={form.prioridade} onChange={e=>set("prioridade",e.target.value)} style={inp}>{PRIORIDADES.map(p=><option key={p}>{p}</option>)}</select></Field>
              <Field label="Status"><select value={form.status} onChange={e=>set("status",e.target.value)} style={inp}>{STATUS_LISTA.map(s=><option key={s}>{s}</option>)}</select></Field>
              <Field label="Previsão (manual)"><input type="datetime-local" value={form.previsao?form.previsao.slice(0,16):""} onChange={e=>set("previsao",e.target.value)} style={inp}/></Field>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
              <Btn onClick={onClose}>Cancelar</Btn>
              <Btn primary onClick={handleSave} style={{opacity:salvando?0.7:1}}>{salvando?"Salvando...":isNovo?"Criar chamado":"Salvar alterações"}</Btn>
            </div>
          </div>
          {!isNovo&&(
            <div style={{padding:"16px 20px"}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:700,color:C.slate400,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>Movimentações</div>
              <div style={{background:C.royalBg,borderRadius:8,border:`1px solid ${C.slate200}`,padding:12,marginBottom:14}}>
                <textarea value={novaMov} onChange={e=>setNovaMov(e.target.value)} placeholder="Registrar o que foi feito..." style={{...inp,minHeight:60,resize:"vertical",marginBottom:8,background:C.white}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:C.slate400}}>Data/hora registrada automaticamente</span>
                  <Btn primary onClick={handleAddMov}>Registrar</Btn>
                </div>
              </div>
              {ATIVOS.includes(form.status)&&(
                <div style={{marginBottom:14}}>
                  {!fechando?<Btn onClick={()=>{setFechando(true);setFechForm({tempo_gasto:"",resultado:""});}}>Encerrar chamado</Btn>:(
                    <div style={{background:C.royalBg,borderRadius:8,border:`1px solid ${C.slate200}`,padding:14}}>
                      <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:700,color:C.slate600,marginBottom:10}}>Encerramento do chamado</div>
                      <div style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:10,marginBottom:10}}>
                        <Field label="Tempo gasto (min)"><input type="number" min={0} value={fechForm.tempo_gasto} onChange={e=>setFechForm(f=>({...f,tempo_gasto:e.target.value}))} placeholder="Ex: 45" style={inp}/></Field>
                        <Field label="O que foi feito / por que não resolveu"><input value={fechForm.resultado} onChange={e=>setFechForm(f=>({...f,resultado:e.target.value}))} placeholder="Descreva o resultado..." style={inp}/></Field>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <Btn onClick={()=>setFechando(false)}>Cancelar</Btn>
                        <Btn onClick={()=>{setFechForm(f=>({...f,sem_solucao:false}));handleFechar();}}>Fechar — Resolvido</Btn>
                        <Btn style={{background:C.redLight,color:"#c53030",borderColor:"#fca5a5"}} onClick={()=>{setFechForm(f=>({...f,sem_solucao:true}));handleFechar();}}>Fechar — Sem solução</Btn>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {movs.length===0?<div style={{fontSize:13,color:C.slate400,textAlign:"center",padding:"20px 0"}}>Nenhuma movimentação ainda.</div>
              :movs.map((m,i)=>(
                <div key={m.id} style={{display:"flex",gap:10,marginBottom:12}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:i===0?C.royalMid:C.slate400,flexShrink:0,marginTop:4}}/>
                    {i<movs.length-1&&<div style={{width:1,flex:1,background:C.slate200,margin:"4px 0"}}/>}
                  </div>
                  <div style={{paddingBottom:8}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.royalLight,fontFamily:"'Montserrat',sans-serif",marginBottom:3}}>{fmtDtFull(m.registrado_em)}</div>
                    <div style={{fontSize:13,color:C.slate800,lineHeight:1.5}}>{m.texto}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketRow({chamado,movimentacoes,onOpen,onStatusChange}){
  const st=slaStatus(chamado);
  const movs=movimentacoes.filter(m=>m.chamado_id===chamado.id);
  const borderColor=st==="vencido"?C.red:st==="atencao"?"#f59e0b":"transparent";
  const iconMap={Crítica:{bg:C.redLight,color:C.red,icon:"🔥"},Alta:{bg:C.amberLight,color:C.amber,icon:"⚡"},Média:{bg:"#dbeafe",color:"#1d4ed8",icon:"💻"},Baixa:{bg:"#dcfce7",color:C.greenDark,icon:"🖨"}};
  const ic=iconMap[chamado.prioridade]||iconMap.Média;
  return(
    <div onClick={()=>onOpen(chamado)} style={{borderBottom:`1px solid ${C.slate100}`,cursor:"pointer",padding:"0 16px",transition:"background .12s",borderLeft:`3px solid ${borderColor}`}} onMouseEnter={e=>e.currentTarget.style.background="#fafbfe"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <div style={{display:"grid",gridTemplateColumns:"28px 1fr 130px 130px 96px 110px 100px",alignItems:"center",padding:"9px 0 3px",gap:0}}>
        <div onClick={e=>e.stopPropagation()}><div style={{width:14,height:14,border:`1.5px solid ${C.slate200}`,borderRadius:3}}/></div>
        <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0,paddingRight:12}}>
          <div style={{width:22,height:22,borderRadius:5,background:ic.bg,color:ic.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>{ic.icon}</div>
          <span style={{fontSize:13,fontWeight:600,color:C.slate800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{chamado.assunto}</span>
        </div>
        <div style={{fontSize:12,color:C.slate600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",paddingRight:8}}>{chamado.departamento}</div>
        <div style={{fontSize:12,color:C.slate600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",paddingRight:8}}>{chamado.categoria}</div>
        <div style={{fontSize:11,color:C.slate400}}>{fmtDt(chamado.criado_em)}</div>
        <div><SLAPill chamado={chamado}/></div>
        <div style={{display:"flex",justifyContent:"flex-end"}} onClick={e=>e.stopPropagation()}><BadgeStatus s={chamado.status} onClick={()=>onStatusChange(chamado)}/></div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:14,padding:"2px 0 8px 35px",flexWrap:"wrap"}}>
        {[{icon:"🏢",text:chamado.empresa},{icon:"👤",text:chamado.solicitante},{icon:"💬",text:movs.length>0?`${movs.length} movimentação${movs.length>1?"ões":""}`:"Sem movimentações"},{icon:"📅",text:`Previsão: ${fmtDt(chamado.previsao)}`}].map((item,i)=>(
          <span key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.slate400,whiteSpace:"nowrap"}}><span style={{fontSize:11}}>{item.icon}</span> {item.text}</span>
        ))}
        <BadgePrioridade p={chamado.prioridade}/>
      </div>
    </div>
  );
}

export default function Chamados(){
  const [chamados,setChamados]=useState([]);
  const [movimentacoes,setMovimentacoes]=useState([]);
  const [carregando,setCarregando]=useState(true);
  const [erro,setErro]=useState(null);
  const [viewAtiva,setViewAtiva]=useState("todos");
  const [filtros,setFiltros]=useState({departamento:"",empresa:"",categoria:"",prioridade:""});
  const [filtroDatas,setFiltroDatas]=useState({de:"",ate:""});
  const [busca,setBusca]=useState("");
  const [modal,setModal]=useState(null);
  const [tick,setTick]=useState(0);

  useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),60000);return()=>clearInterval(t);},[]);
  useEffect(()=>{carregarTudo();},[]);

  async function carregarTudo(){
    setCarregando(true);setErro(null);
    try{
      const [chs,movs]=await Promise.all([api.chamados.listar(),api.movimentacoes.listar()]);
      setChamados(chs||[]);setMovimentacoes(movs||[]);
    }catch(e){setErro("Erro ao carregar: "+e.message);}
    finally{setCarregando(false);}
  }

  const criarChamado=useCallback(async(form)=>{
    const data=await api.chamados.criar(form);
    setChamados(prev=>[data,...prev]);setModal(null);
  },[]);

  const salvarChamado=useCallback(async(form)=>{
    const data=await api.chamados.atualizar(form.id,form);
    setChamados(prev=>prev.map(c=>c.id===form.id?data:c));setModal(null);
  },[]);

  const adicionarMov=useCallback(async(chamadoId,texto)=>{
    const data=await api.movimentacoes.criar({chamado_id:chamadoId,texto});
    setMovimentacoes(prev=>[data,...prev]);
  },[]);

  const fecharChamado=useCallback(async(chamadoId,{tempo_gasto,resultado,sem_solucao})=>{
    const novoStatus=sem_solucao?"Sem Solução":"Fechado";
    const chamado=chamados.find(c=>c.id===chamadoId);
    const data=await api.chamados.atualizar(chamadoId,{...chamado,status:novoStatus,tempo_gasto:parseInt(tempo_gasto)||0,resultado});
    setChamados(prev=>prev.map(c=>c.id===chamadoId?data:c));
    await adicionarMov(chamadoId,`Encerrado como "${novoStatus}". ${resultado}${tempo_gasto?` Tempo: ${tempo_gasto}min.`:""}`);
    setModal(null);
  },[chamados,adicionarMov]);

  const VIEWS=[
    {id:"pendentes",label:"Abertos pendentes",filtro:c=>c.status==="Aberto"},
    {id:"vencido",label:"SLA vencido",filtro:c=>slaStatus(c)==="vencido"},
    {id:"atencao",label:"Vencendo em breve",filtro:c=>slaStatus(c)==="atencao"},
    {id:"todos",label:"Todos os chamados",filtro:c=>ATIVOS.includes(c.status),star:true},
    {id:"sem_mov",label:"Sem movimentação",filtro:c=>ATIVOS.includes(c.status)&&movimentacoes.filter(m=>m.chamado_id===c.id).length===0},
    {id:"analise",label:"Em análise",filtro:c=>c.status==="Em Análise"},
    {id:"fechados",label:"Fechados",filtro:c=>c.status==="Fechado",encerrado:true},
    {id:"semsol",label:"Sem solução",filtro:c=>c.status==="Sem Solução",encerrado:true},
  ];
  const viewInfo=VIEWS.find(v=>v.id===viewAtiva)||VIEWS[3];

  const chamadosFiltrados=chamados.filter(viewInfo.filtro).filter(c=>{
    if(filtros.departamento&&c.departamento!==filtros.departamento)return false;
    if(filtros.empresa&&c.empresa!==filtros.empresa)return false;
    if(filtros.categoria&&c.categoria!==filtros.categoria)return false;
    if(filtros.prioridade&&c.prioridade!==filtros.prioridade)return false;
    if(busca){const b=busca.toLowerCase();if(!c.assunto.toLowerCase().includes(b)&&!c.solicitante.toLowerCase().includes(b))return false;}
    if(viewInfo.encerrado&&filtroDatas.de){
      const d=new Date(c.atualizado_em);
      if(d<new Date(filtroDatas.de))return false;
      if(filtroDatas.ate&&d>new Date(filtroDatas.ate+"T23:59:59"))return false;
    }
    return true;
  }).sort((a,b)=>{
    if(ATIVOS.includes(a.status)&&ATIVOS.includes(b.status)){
      const ord={vencido:0,atencao:1,ok:2,encerrado:3};
      const sa=slaStatus(a),sb=slaStatus(b);
      if(ord[sa]!==ord[sb])return ord[sa]-ord[sb];
      return PRIO_ORDEM[a.prioridade]-PRIO_ORDEM[b.prioridade];
    }
    return new Date(b.atualizado_em||b.criado_em)-new Date(a.atualizado_em||a.criado_em);
  });

  const counts={
    pendentes:chamados.filter(c=>c.status==="Aberto").length,
    vencido:chamados.filter(c=>slaStatus(c)==="vencido").length,
    atencao:chamados.filter(c=>slaStatus(c)==="atencao").length,
    sem_mov:chamados.filter(c=>ATIVOS.includes(c.status)&&movimentacoes.filter(m=>m.chamado_id===c.id).length===0).length,
    analise:chamados.filter(c=>c.status==="Em Análise").length,
    semsol:chamados.filter(c=>c.status==="Sem Solução").length,
  };

  const hoje=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"});

  if(carregando)return<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:C.royalBg,flexDirection:"column",gap:12}}><div style={{fontSize:32}}>⏳</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:13,color:C.slate400}}>Carregando chamados...</div></div>;
  if(erro)return<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:C.royalBg,flexDirection:"column",gap:12}}><div style={{fontSize:32}}>⚠️</div><div style={{fontSize:13,color:C.red,maxWidth:400,textAlign:"center"}}>{erro}</div><Btn onClick={carregarTudo}>Tentar novamente</Btn></div>;

  return(
    <div style={{display:"flex",flex:1,overflow:"hidden",fontFamily:"'Nunito',sans-serif",background:C.royalBg,color:C.slate800,fontSize:13}}>
      {/* Painel views */}
      <div style={{width:204,background:C.white,borderRight:`1px solid ${C.slate200}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"13px 14px 8px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,fontWeight:700,color:C.slate800}}>Views</span>
          <span style={{fontSize:11,color:C.royalMid,fontWeight:600,cursor:"pointer"}}>+ Criar</span>
        </div>
        <div style={{margin:"0 10px 6px",display:"flex",alignItems:"center",gap:6,background:C.royalBg,borderRadius:6,padding:"5px 8px",border:`1px solid ${C.slate200}`}}>
          <span style={{fontSize:12,color:C.slate400}}>🔍</span>
          <input placeholder="Buscar view..." style={{border:"none",background:"transparent",fontSize:11,color:C.slate600,width:"100%",outline:"none",fontFamily:"'Nunito',sans-serif"}}/>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"2px 0"}}>
          {VIEWS.map(v=>{
            const count=counts[v.id],isActive=viewAtiva===v.id;
            return<div key={v.id} onClick={()=>setViewAtiva(v.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:isActive?"7px 11px":"7px 14px",borderLeft:isActive?`3px solid ${C.royalDark}`:"3px solid transparent",cursor:"pointer",fontSize:12,color:isActive?C.royalDark:C.slate600,fontWeight:isActive?700:400,background:isActive?C.royalGhost:"transparent"}} onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background="#f8fafc"}} onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background="transparent"}}>
              <span style={{display:"flex",alignItems:"center",gap:5}}>{v.star&&<span style={{fontSize:11}}>⭐</span>}{v.label}</span>
              {count>0&&<span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:10,fontFamily:"'Montserrat',sans-serif",background:(v.id==="vencido"||v.id==="pendentes"||v.id==="semsol")?C.redLight:(v.id==="atencao"?C.amberLight:C.slate100),color:(v.id==="vencido"||v.id==="pendentes"||v.id==="semsol")?C.red:(v.id==="atencao"?C.amber:C.slate400)}}>{count}</span>}
            </div>;
          })}
        </div>
        <div style={{borderTop:`1px solid ${C.slate200}`,padding:"6px 10px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 4px",fontSize:12,color:C.slate400,cursor:"pointer"}}>
            <span>🗑 Excluídos</span>
            <span style={{fontSize:10,fontWeight:700,background:C.slate100,color:C.slate400,padding:"1px 6px",borderRadius:10,fontFamily:"'Montserrat',sans-serif"}}>0</span>
          </div>
        </div>
      </div>
      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        <div style={{background:C.white,borderBottom:`1px solid ${C.slate200}`,padding:"0 16px",height:46,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:13,fontWeight:700,color:C.slate800}}>{viewInfo.label}</span>
            <span style={{fontSize:11,color:C.slate400,fontFamily:"'Montserrat',sans-serif"}}>{chamadosFiltrados.length} chamado{chamadosFiltrados.length!==1?"s":""}</span>
            <span style={{fontSize:10,color:C.slate400}}>{hoje}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {viewInfo.encerrado&&<div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:C.slate600,fontWeight:600}}>Período:</span>
              <input type="date" value={filtroDatas.de} onChange={e=>setFiltroDatas(f=>({...f,de:e.target.value}))} style={{...inp,width:130,padding:"4px 8px"}}/>
              <span style={{fontSize:11,color:C.slate400}}>até</span>
              <input type="date" value={filtroDatas.ate} onChange={e=>setFiltroDatas(f=>({...f,ate:e.target.value}))} style={{...inp,width:130,padding:"4px 8px"}}/>
            </div>}
            <div style={{display:"flex",alignItems:"center",gap:6,border:`1px solid ${C.slate200}`,borderRadius:6,padding:"5px 10px",background:C.royalBg,width:180}}>
              <span style={{fontSize:13,color:C.slate400}}>🔍</span>
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar chamados..." style={{border:"none",background:"transparent",fontSize:12,color:C.slate800,width:"100%",outline:"none",fontFamily:"'Nunito',sans-serif"}}/>
            </div>
            <Btn onClick={carregarTudo}>↻</Btn>
            <button onClick={()=>setModal({chamado:null,modo:"novo"})} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 13px",borderRadius:6,border:`1px solid ${C.royalDark}`,background:C.royalDark,color:C.white,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>+ Novo Chamado</button>
          </div>
        </div>
        <div style={{background:C.white,borderBottom:`1px solid ${C.slate200}`,padding:"0 16px",height:36,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {[{key:"departamento",label:"Departamento",opts:DEPARTAMENTOS},{key:"empresa",label:"Empresa",opts:EMPRESAS},{key:"categoria",label:"Categoria",opts:CATEGORIAS},{key:"prioridade",label:"Prioridade",opts:PRIORIDADES}].map(({key,label,opts})=>(
              <select key={key} value={filtros[key]} onChange={e=>setFiltros(f=>({...f,[key]:e.target.value}))} style={{fontSize:11,padding:"3px 7px",borderRadius:5,border:`1px solid ${C.slate200}`,background:C.white,color:filtros[key]?C.royalDark:C.slate600,fontFamily:"'Nunito',sans-serif",fontWeight:filtros[key]?700:400,cursor:"pointer"}}>
                <option value="">{label}: todos</option>
                {opts.map(o=><option key={o}>{o}</option>)}
              </select>
            ))}
            {Object.values(filtros).some(Boolean)&&<button onClick={()=>setFiltros({departamento:"",empresa:"",categoria:"",prioridade:""})} style={{fontSize:11,color:C.red,background:"none",border:"none",cursor:"pointer",fontWeight:600,padding:"0 4px"}}>✕ Limpar</button>}
          </div>
          <span style={{fontSize:11,color:C.slate400,fontFamily:"'Montserrat',sans-serif"}}>{chamadosFiltrados.length} de {chamados.filter(viewInfo.filtro).length}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"28px 1fr 130px 130px 96px 110px 100px",alignItems:"center",padding:"0 16px",height:30,background:C.slate100,borderBottom:`1px solid ${C.slate200}`,flexShrink:0,gap:0}}>
          {["","Assunto","Departamento","Categoria","Aberto em","SLA","Status"].map((col,i)=>(
            <div key={i} style={{fontSize:10,fontWeight:700,color:C.slate400,textTransform:"uppercase",letterSpacing:".06em",fontFamily:"'Montserrat',sans-serif",textAlign:i===6?"right":"left"}}>{col}</div>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto",background:C.white}}>
          {chamadosFiltrados.length===0?<div style={{textAlign:"center",padding:"48px 16px",color:C.slate400}}><div style={{fontSize:32,marginBottom:8}}>🎫</div><div style={{fontSize:14,fontWeight:600}}>Nenhum chamado encontrado</div><div style={{fontSize:12,marginTop:4}}>{viewInfo.encerrado?"Ajuste o filtro de datas.":"Tudo em dia!"}</div></div>
          :chamadosFiltrados.map(c=><TicketRow key={c.id+tick} chamado={c} movimentacoes={movimentacoes} onOpen={ch=>setModal({chamado:ch,modo:"editar"})} onStatusChange={ch=>setModal({chamado:ch,modo:"editar"})}/>)}
        </div>
      </div>
      {modal&&<ModalChamado chamado={modal.modo==="novo"?null:modal.chamado} movimentacoes={movimentacoes} onClose={()=>setModal(null)} onSave={modal.modo==="novo"?criarChamado:salvarChamado} onAddMov={adicionarMov} onFechar={fecharChamado}/>}
    </div>
  );
}
