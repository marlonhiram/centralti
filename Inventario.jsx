import { useState, useEffect, useMemo } from "react";
import { BASE } from "../utils/helpers";

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const TIPOS      = ["Computador","Impressora","Roteador","Smartphone","Câmera","Servidor","Switch","CNC","Outro"];
const STATUS_EQ  = ["Ativo","Disponível","Em Manutenção","Desativado"];
const DEPARTAMENTOS = ["Almoxarifado","Comercial","Compras","Contabilidade","Diretoria","Elétrica","Expedição","Fábrica","Financeiro","Jurídico","Logística","Portaria","PPCP","Qualidade","Recursos Humanos","Segurança do Trabalho","TI"];
const TIPO_MANUT = ["Manutenção preventiva","Manutenção corretiva","Troca de peça","Atualização de software","Configuração","Observação"];

// ─── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  royalDark:"#1a3a6b", royalMid:"#2d5aa0", royalLight:"#5b9bd5",
  royalBg:"#f0f4f8", royalGhost:"#e8f0fb",
  white:"#ffffff", slate800:"#1e293b", slate600:"#475569",
  slate400:"#94a3b8", slate200:"#e2e8f0", slate100:"#f1f5f9",
  green:"#16a34a", greenLight:"#dcfce7",
  red:"#dc2626", redLight:"#fee2e2",
  amber:"#d97706", amberLight:"#fef3c7",
  purple:"#7c3aed", purpleLight:"#ede9fe",
};

const TIPO_ICON = {
  Computador:"🖥", Impressora:"🖨", Roteador:"📡", Smartphone:"📱",
  Câmera:"📷", Servidor:"🗄", Switch:"🔀", CNC:"⚙️", Outro:"🔧",
};
const TIPO_COLOR = {
  Computador:{bg:"#e8f0fb",color:C.royalDark},
  Impressora:{bg:"#fef3c7",color:C.amber},
  Roteador:  {bg:"#dcfce7",color:C.green},
  Smartphone:{bg:C.purpleLight,color:C.purple},
  Câmera:    {bg:"#fee2e2",color:C.red},
  Servidor:  {bg:"#1e293b",color:"#fff"},
  Switch:    {bg:"#f1f5f9",color:C.slate600},
  CNC:       {bg:"#fef3c7",color:C.amber},
  Outro:     {bg:"#f1f5f9",color:C.slate600},
};
const STATUS_COLOR = {
  Ativo:           {bg:C.greenLight, color:C.green},
  Disponível:      {bg:"#e8f0fb",   color:C.royalDark},
  "Em Manutenção": {bg:C.amberLight, color:C.amber},
  Desativado:      {bg:"#f1f5f9",   color:C.slate400},
};
const STATUS_CHAMADO_COLOR = {
  "Aberto":      {bg:"#dbeafe", color:"#1d4ed8"},
  "Em Análise":  {bg:"#fef3c7", color:"#92400e"},
  "Fechado":     {bg:"#dcfce7", color:"#166534"},
  "Sem Solução": {bg:"#fee2e2", color:"#991b1b"},
};

function fmtDt(ts){ if(!ts) return "—"; const d=new Date(ts); return d.toLocaleDateString("pt-BR")+" "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}); }
function fmtData(ts){ if(!ts) return "—"; return new Date(ts).toLocaleDateString("pt-BR"); }

const inp = {width:"100%",padding:"7px 10px",border:`1.5px solid ${C.slate200}`,borderRadius:6,fontSize:13,color:C.slate800,fontFamily:"'Nunito',sans-serif",background:C.white,boxSizing:"border-box",outline:"none"};

function Field({label,children}){
  return <div><div style={{fontSize:10,fontWeight:700,color:C.slate600,textTransform:"uppercase",letterSpacing:".06em",fontFamily:"'Montserrat',sans-serif",marginBottom:4}}>{label}</div>{children}</div>;
}
function Btn({children,onClick,primary,danger,disabled,style:s}){
  return <button onClick={onClick} disabled={disabled} style={{padding:"6px 13px",borderRadius:6,border:danger?`1px solid ${C.red}`:primary?`1px solid ${C.royalDark}`:`1px solid ${C.slate200}`,background:danger?C.redLight:primary?C.royalDark:C.white,color:danger?C.red:primary?C.white:C.slate600,fontSize:12,fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.6:1,fontFamily:"'Nunito',sans-serif",whiteSpace:"nowrap",...s}}>{children}</button>;
}

// ─── MODAL FICHA ──────────────────────────────────────────────────────────────
function ModalFicha({ eq, onClose, onSave }){
  const isNovo = !eq?.id;

  const [form,       setForm]       = useState(eq || {codigo:"",tipo:"Computador",usuario:"",senha:"",so:"",chave_so:"",office:"",chave_office:"",email:"",senha_email:"",ip:"",mac:"",obs:"",status:"Ativo",departamento:""});
  const [manutencoes,setManutencoes]= useState([]);
  const [chamados,   setChamados]   = useState([]);
  const [novaMt,     setNovaMt]     = useState({tipo:"Manutenção corretiva",descricao:""});
  const [salvando,   setSalvando]   = useState(false);
  const [carregando, setCarregando] = useState(false);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const tc = TIPO_COLOR[form.tipo]||TIPO_COLOR.Outro;

  // Carrega manutenções e chamados ao abrir ficha de equipamento existente
  useEffect(()=>{
    if(isNovo) return;
    async function carregar(){
      setCarregando(true);
      try {
        const [rM, rC] = await Promise.all([
          fetch(`${BASE}/manutencoes?equipamento_id=${eq.id}`),
          fetch(`${BASE}/equipamentos/${eq.id}/chamados`),
        ]);
        const [jM, jC] = await Promise.all([rM.json(), rC.json()]);
        if(jM.ok) setManutencoes(jM.data);
        if(jC.ok) setChamados(jC.data);
      } catch {
        alert("Erro ao carregar dados do equipamento.");
      }
      setCarregando(false);
    }
    carregar();
  },[eq?.id]);

  /**
   * Persiste criação ou edição do equipamento via API.
   */
  const handleSave = async () => {
    if(!form.codigo.trim()) return alert("Informe o código.");
    setSalvando(true);
    try {
      const metodo = isNovo ? "POST" : "PUT";
      const url    = isNovo ? `${BASE}/equipamentos` : `${BASE}/equipamentos/${eq.id}`;
      const r = await fetch(url, { method: metodo, headers:{"Content-Type":"application/json"}, body: JSON.stringify(form) });
      const j = await r.json();
      if(j.ok) onSave(j.data);
      else alert("Erro ao salvar: " + j.error);
    } catch {
      alert("Erro ao salvar equipamento.");
    }
    setSalvando(false);
  };

  /**
   * Registra uma manutenção via API e atualiza a timeline local.
   */
  const handleAddManut = async () => {
    if(!novaMt.descricao.trim()) return alert("Descreva a manutenção.");
    try {
      const r = await fetch(`${BASE}/manutencoes`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ equipamento_id: eq.id, ...novaMt, chamado_id: null }),
      });
      const j = await r.json();
      if(j.ok){ setManutencoes(p=>[j.data,...p]); setNovaMt({tipo:"Manutenção corretiva",descricao:""}); }
      else alert("Erro ao registrar: " + j.error);
    } catch {
      alert("Erro ao registrar manutenção.");
    }
  };

  /**
   * Remove uma manutenção via API.
   * @param {number} id - ID da manutenção a remover.
   */
  const handleDelManut = async (id) => {
    if(!confirm("Remover esta manutenção?")) return;
    try {
      const r = await fetch(`${BASE}/manutencoes/${id}`, { method:"DELETE" });
      const j = await r.json();
      if(j.ok) setManutencoes(p=>p.filter(m=>m.id!==id));
      else alert("Erro ao remover: " + j.error);
    } catch {
      alert("Erro ao remover manutenção.");
    }
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.white,borderRadius:12,width:"min(740px,96vw)",maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",border:`1px solid ${C.slate200}`}}>

        {/* Header */}
        <div style={{background:C.royalDark,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:8,background:tc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{TIPO_ICON[form.tipo]||"🔧"}</div>
            <div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:13,fontWeight:700,color:C.white}}>{isNovo?"Novo Equipamento":form.codigo}</div>
              <div style={{fontSize:11,color:C.royalLight}}>{form.tipo}{form.departamento?" · "+form.departamento:""}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:C.white,width:30,height:30,borderRadius:6,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        <div style={{overflowY:"auto",flex:1}}>

          {/* Formulário */}
          <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.slate200}`}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
              <Field label="Código"><input value={form.codigo} onChange={e=>set("codigo",e.target.value)} style={inp} placeholder="Ex: MQ65"/></Field>
              <Field label="Tipo"><select value={form.tipo} onChange={e=>set("tipo",e.target.value)} style={inp}>{TIPOS.map(t=><option key={t}>{t}</option>)}</select></Field>
              <Field label="Status"><select value={form.status} onChange={e=>set("status",e.target.value)} style={inp}>{STATUS_EQ.map(s=><option key={s}>{s}</option>)}</select></Field>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <Field label="Usuário"><input value={form.usuario} onChange={e=>set("usuario",e.target.value)} style={inp} placeholder="Nome do usuário"/></Field>
              <Field label="Senha"><input value={form.senha} onChange={e=>set("senha",e.target.value)} style={inp} placeholder="Senha"/></Field>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
              <Field label="Sistema Op."><input value={form.so} onChange={e=>set("so",e.target.value)} style={inp} placeholder="WIN11"/></Field>
              <Field label="Chave SO"><input value={form.chave_so} onChange={e=>set("chave_so",e.target.value)} style={inp} placeholder="XXXX"/></Field>
              <Field label="Office"><input value={form.office} onChange={e=>set("office",e.target.value)} style={inp} placeholder="2021PRO"/></Field>
              <Field label="Chave Office"><input value={form.chave_office} onChange={e=>set("chave_office",e.target.value)} style={inp} placeholder="XXXX"/></Field>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <Field label="E-mail"><input value={form.email} onChange={e=>set("email",e.target.value)} style={inp} placeholder="usuario@empresa.com"/></Field>
              <Field label="Senha E-mail"><input value={form.senha_email} onChange={e=>set("senha_email",e.target.value)} style={inp} placeholder="Senha do e-mail"/></Field>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
              <Field label="Endereço IP"><input value={form.ip} onChange={e=>set("ip",e.target.value)} style={inp} placeholder="192.168.0.X"/></Field>
              <Field label="MAC Address"><input value={form.mac} onChange={e=>set("mac",e.target.value)} style={inp} placeholder="XX:XX:XX:XX:XX:XX"/></Field>
              <Field label="Departamento"><select value={form.departamento} onChange={e=>set("departamento",e.target.value)} style={inp}><option value="">—</option>{DEPARTAMENTOS.map(d=><option key={d}>{d}</option>)}</select></Field>
            </div>
            <div style={{marginBottom:12}}>
              <Field label="Observações"><textarea value={form.obs} onChange={e=>set("obs",e.target.value)} style={{...inp,minHeight:52,resize:"vertical"}} placeholder="Observações, informações de rede, etc."/></Field>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
              <Btn onClick={onClose}>Cancelar</Btn>
              <Btn primary disabled={salvando} onClick={handleSave}>
                {salvando?"Salvando...":(isNovo?"Cadastrar equipamento":"Salvar alterações")}
              </Btn>
            </div>
          </div>

          {/* Manutenções */}
          {!isNovo&&(
            <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.slate200}`}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:700,color:C.slate400,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>
                Histórico de Manutenções
              </div>
              <div style={{background:C.royalBg,borderRadius:8,border:`1px solid ${C.slate200}`,padding:12,marginBottom:14}}>
                <div style={{display:"grid",gridTemplateColumns:"180px 1fr",gap:10,marginBottom:8}}>
                  <Field label="Tipo">
                    <select value={novaMt.tipo} onChange={e=>setNovaMt(f=>({...f,tipo:e.target.value}))} style={inp}>
                      {TIPO_MANUT.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Descrição">
                    <input value={novaMt.descricao} onChange={e=>setNovaMt(f=>({...f,descricao:e.target.value}))} placeholder="Descreva o que foi feito..." style={inp}/>
                  </Field>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:C.slate400}}>Data/hora registrada automaticamente</span>
                  <Btn primary onClick={handleAddManut}>Registrar</Btn>
                </div>
              </div>
              {carregando?(
                <div style={{fontSize:12,color:C.slate400,padding:"8px 0"}}>Carregando...</div>
              ):manutencoes.length===0?(
                <div style={{fontSize:13,color:C.slate400,textAlign:"center",padding:"20px 0"}}>Nenhuma manutenção registrada ainda.</div>
              ):manutencoes.map((m,i)=>{
                const mtc={
                  "Manutenção preventiva":  {bg:C.greenLight, color:C.green},
                  "Manutenção corretiva":   {bg:C.redLight,   color:C.red},
                  "Troca de peça":          {bg:C.amberLight, color:C.amber},
                  "Atualização de software":{bg:"#e8f0fb",    color:C.royalDark},
                  "Configuração":           {bg:"#ede9fe",    color:C.purple},
                  "Observação":             {bg:"#f1f5f9",    color:C.slate600},
                }[m.tipo]||{bg:C.slate100,color:C.slate600};
                return(
                  <div key={m.id} style={{display:"flex",gap:10,marginBottom:12}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:i===0?C.royalMid:C.slate400,flexShrink:0,marginTop:4}}/>
                      {i<manutencoes.length-1&&<div style={{width:1,flex:1,background:C.slate200,margin:"4px 0"}}/>}
                    </div>
                    <div style={{flex:1,paddingBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{fontSize:10,fontWeight:700,color:C.royalLight,fontFamily:"'Montserrat',sans-serif"}}>{fmtDt(m.registrado_em)}</span>
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,background:mtc.bg,color:mtc.color,fontFamily:"'Montserrat',sans-serif"}}>{m.tipo}</span>
                        {m.chamado_id&&<span style={{fontSize:10,color:C.royalMid,fontWeight:600}}>📋 Chamado vinculado</span>}
                      </div>
                      <div style={{fontSize:13,color:C.slate800,lineHeight:1.5}}>{m.descricao}</div>
                    </div>
                    <button onClick={()=>handleDelManut(m.id)} style={{background:"none",border:"none",color:C.slate400,cursor:"pointer",fontSize:14,flexShrink:0,alignSelf:"flex-start",padding:"2px 4px"}}>×</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Chamados vinculados */}
          {!isNovo&&(
            <div style={{padding:"16px 20px"}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:700,color:C.slate400,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>
                Chamados Vinculados {chamados.length>0&&<span style={{color:C.royalDark}}>({chamados.length})</span>}
              </div>
              {carregando?(
                <div style={{fontSize:12,color:C.slate400,padding:"8px 0"}}>Carregando...</div>
              ):chamados.length===0?(
                <div style={{fontSize:13,color:C.slate400,textAlign:"center",padding:"20px 0"}}>Nenhum chamado vinculado a este equipamento.</div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {chamados.map(c=>{
                    const sc=STATUS_CHAMADO_COLOR[c.status]||{bg:"#f1f5f9",color:C.slate400};
                    return(
                      <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",borderRadius:7,border:`1px solid ${C.slate200}`,background:"#fafbfe"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:C.royalMid}}>#{String(c.numero).padStart(4,"0")}</span>
                          <span style={{fontSize:13,color:C.slate800}}>{c.assunto}</span>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                          <span style={{fontSize:10,color:C.slate400}}>{fmtData(c.criado_em)}</span>
                          <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:sc.bg,color:sc.color,fontFamily:"'Montserrat',sans-serif"}}>{c.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── APP INVENTÁRIO ───────────────────────────────────────────────────────────
export default function Inventario(){
  const [equipamentos, setEquipamentos] = useState([]);
  const [carregando,   setCarregando]   = useState(true);
  const [busca,        setBusca]        = useState("");
  const [fTipo,        setFTipo]        = useState("");
  const [fStatus,      setFStatus]      = useState("");
  const [fDept,        setFDept]        = useState("");
  const [modal,        setModal]        = useState(null);

  // Busca equipamentos do banco na inicialização
  useEffect(()=>{
    async function buscarEquipamentos(){
      try {
        const r = await fetch(`${BASE}/equipamentos`);
        const j = await r.json();
        if(j.ok) setEquipamentos(j.data);
        else alert("Erro ao carregar equipamentos: " + j.error);
      } catch {
        alert("Erro ao conectar com a API.");
      }
      setCarregando(false);
    }
    buscarEquipamentos();
  },[]);

  const stats = useMemo(()=>({
    total:      equipamentos.length,
    ativos:     equipamentos.filter(e=>e.status==="Ativo").length,
    disponiveis:equipamentos.filter(e=>e.status==="Disponível").length,
    manutencao: equipamentos.filter(e=>e.status==="Em Manutenção").length,
  }),[equipamentos]);

  const lista = useMemo(()=>equipamentos.filter(e=>{
    if(fTipo   && e.tipo!==fTipo)        return false;
    if(fStatus && e.status!==fStatus)    return false;
    if(fDept   && e.departamento!==fDept)return false;
    if(busca){
      const b=busca.toLowerCase();
      return e.codigo.toLowerCase().includes(b)||
             (e.usuario||"").toLowerCase().includes(b)||
             (e.ip||"").toLowerCase().includes(b)||
             (e.mac||"").toLowerCase().includes(b)||
             (e.departamento||"").toLowerCase().includes(b);
    }
    return true;
  }).sort((a,b)=>a.codigo.localeCompare(b.codigo)),[equipamentos,fTipo,fStatus,fDept,busca]);

  /**
   * Atualiza a lista local após salvar — evita refetch completo.
   * @param {object} eq - Equipamento retornado pela API após salvar.
   */
  const handleSalvo = (eq) => {
    setEquipamentos(p=>{
      const existe = p.find(e=>e.id===eq.id);
      return existe ? p.map(e=>e.id===eq.id?eq:e) : [eq,...p];
    });
    setModal(null);
  };

  const tiposCount = TIPOS.reduce((acc,t)=>({...acc,[t]:equipamentos.filter(e=>e.tipo===t).length}),{});

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:"'Nunito',sans-serif",background:C.royalBg,overflow:"hidden"}}>

      {/* Topbar */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.slate200}`,padding:"0 20px",height:48,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,background:C.royalDark,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🖥</div>
          <div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:13,fontWeight:700,color:C.slate800}}>Inventário · Parque Tecnológico</div>
            <div style={{fontSize:10,color:C.slate400,fontFamily:"'Montserrat',sans-serif"}}>CentralTI</div>
          </div>
        </div>
        <button onClick={()=>setModal({eq:null})} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:6,border:`1px solid ${C.royalDark}`,background:C.royalDark,color:C.white,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>
          + Novo Equipamento
        </button>
      </div>

      {/* Métricas */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",background:C.white,borderBottom:`1px solid ${C.slate200}`,flexShrink:0}}>
        {[
          {label:"Total",        value:stats.total,       color:C.royalDark, bg:"#e8f0fb",    icon:"🖥"},
          {label:"Ativos",       value:stats.ativos,      color:C.green,     bg:C.greenLight, icon:"✅"},
          {label:"Disponíveis",  value:stats.disponiveis, color:C.royalMid,  bg:"#e8f0fb",    icon:"📦"},
          {label:"Em manutenção",value:stats.manutencao,  color:C.amber,     bg:C.amberLight, icon:"🔧"},
        ].map(s=>(
          <div key={s.label} style={{padding:"10px 20px",borderRight:`1px solid ${C.slate200}`,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{s.icon}</div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:C.slate400,textTransform:"uppercase",letterSpacing:".06em",fontFamily:"'Montserrat',sans-serif"}}>{s.label}</div>
              <div style={{fontSize:20,fontWeight:700,color:s.color,fontFamily:"'Montserrat',sans-serif",lineHeight:1.1}}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chips por tipo */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.slate200}`,padding:"8px 20px",display:"flex",gap:6,flexWrap:"wrap",flexShrink:0}}>
        <button onClick={()=>setFTipo("")} style={{fontSize:11,padding:"3px 10px",borderRadius:20,border:`1px solid ${fTipo===""?C.royalDark:C.slate200}`,background:fTipo===""?C.royalDark:"#fff",color:fTipo===""?"#fff":C.slate600,cursor:"pointer",fontWeight:600,fontFamily:"'Nunito',sans-serif"}}>
          Todos ({equipamentos.length})
        </button>
        {TIPOS.filter(t=>tiposCount[t]>0).map(t=>{
          const ativo=fTipo===t;
          return(
            <button key={t} onClick={()=>setFTipo(ativo?"":t)} style={{fontSize:11,padding:"3px 10px",borderRadius:20,border:`1px solid ${ativo?C.royalDark:C.slate200}`,background:ativo?C.royalDark:C.white,color:ativo?"#fff":C.slate600,cursor:"pointer",fontWeight:600,fontFamily:"'Nunito',sans-serif",display:"flex",alignItems:"center",gap:4}}>
              <span>{TIPO_ICON[t]}</span> {t} ({tiposCount[t]})
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.slate200}`,padding:"0 20px",height:36,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{display:"flex",alignItems:"center",gap:6,border:`1px solid ${C.slate200}`,borderRadius:6,padding:"4px 10px",background:C.royalBg,width:200}}>
            <span style={{fontSize:12,color:C.slate400}}>🔍</span>
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Código, usuário, IP, MAC..." style={{border:"none",background:"transparent",fontSize:12,color:C.slate800,width:"100%",outline:"none",fontFamily:"'Nunito',sans-serif"}}/>
          </div>
          <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{fontSize:11,padding:"3px 7px",borderRadius:5,border:`1px solid ${C.slate200}`,background:"#fff",color:C.slate600,fontFamily:"'Nunito',sans-serif",cursor:"pointer"}}>
            <option value="">Status: todos</option>
            {STATUS_EQ.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={fDept} onChange={e=>setFDept(e.target.value)} style={{fontSize:11,padding:"3px 7px",borderRadius:5,border:`1px solid ${C.slate200}`,background:"#fff",color:C.slate600,fontFamily:"'Nunito',sans-serif",cursor:"pointer"}}>
            <option value="">Departamento: todos</option>
            {DEPARTAMENTOS.map(d=><option key={d}>{d}</option>)}
          </select>
          {(busca||fStatus||fDept||fTipo)&&(
            <button onClick={()=>{setBusca("");setFStatus("");setFDept("");setFTipo("");}} style={{fontSize:11,color:C.red,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>✕ Limpar</button>
          )}
        </div>
        <span style={{fontSize:11,color:C.slate400,fontFamily:"'Montserrat',sans-serif"}}>{lista.length} de {equipamentos.length} equipamentos</span>
      </div>

      {/* Cabeçalho da lista */}
      <div style={{display:"grid",gridTemplateColumns:"42px 100px 120px 1fr 100px 130px 110px 80px",alignItems:"center",padding:"0 20px",height:30,background:C.slate100,borderBottom:`1px solid ${C.slate200}`,flexShrink:0}}>
        {["","Código","Tipo","Usuário","IP","MAC","Departamento","Status"].map((c,i)=>(
          <div key={i} style={{fontSize:10,fontWeight:700,color:C.slate400,textTransform:"uppercase",letterSpacing:".06em",fontFamily:"'Montserrat',sans-serif"}}>{c}</div>
        ))}
      </div>

      {/* Lista */}
      <div style={{flex:1,overflowY:"auto",background:C.white}}>
        {carregando?(
          <div style={{textAlign:"center",padding:"48px 16px",color:C.slate400}}>
            <div style={{fontSize:14,fontWeight:600}}>Carregando equipamentos...</div>
          </div>
        ):lista.length===0?(
          <div style={{textAlign:"center",padding:"48px 16px",color:C.slate400}}>
            <div style={{fontSize:32,marginBottom:8}}>🔍</div>
            <div style={{fontSize:14,fontWeight:600}}>Nenhum equipamento encontrado</div>
          </div>
        ):lista.map(e=>{
          const tc=TIPO_COLOR[e.tipo]||TIPO_COLOR.Outro;
          const sc=STATUS_COLOR[e.status]||STATUS_COLOR.Ativo;
          return(
            <div key={e.id} onClick={()=>setModal({eq:e})}
              style={{display:"grid",gridTemplateColumns:"42px 100px 120px 1fr 100px 130px 110px 80px",alignItems:"center",padding:"9px 20px",borderBottom:`1px solid ${C.slate100}`,cursor:"pointer",gap:0,transition:"background .12s"}}
              onMouseEnter={ev=>ev.currentTarget.style.background="#fafbfe"}
              onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
              <div style={{width:28,height:28,borderRadius:6,background:tc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{TIPO_ICON[e.tipo]||"🔧"}</div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,fontWeight:700,color:C.slate800}}>{e.codigo}</div>
              <div style={{fontSize:11,color:tc.color,fontWeight:600}}>{e.tipo}</div>
              <div style={{fontSize:13,fontWeight:600,color:C.slate800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:220}}>{e.usuario||<span style={{color:C.slate400,fontSize:12}}>—</span>}</div>
              <div style={{fontSize:11,color:C.slate600,fontFamily:"'Montserrat',sans-serif"}}>{e.ip&&e.ip!=="NP"&&e.ip!=="0.0.0.0"?e.ip:<span style={{color:C.slate400}}>—</span>}</div>
              <div style={{fontSize:10,color:C.slate400,fontFamily:"'Montserrat',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.mac||"—"}</div>
              <div style={{fontSize:11,color:C.slate600}}>{e.departamento||<span style={{color:C.slate400}}>—</span>}</div>
              <div><span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,background:sc.bg,color:sc.color,fontFamily:"'Montserrat',sans-serif"}}>{e.status}</span></div>
            </div>
          );
        })}
      </div>

      {modal&&(
        <ModalFicha
          eq={modal.eq}
          onClose={()=>setModal(null)}
          onSave={handleSalvo}
        />
      )}
    </div>
  );
}