import { useState, useEffect, useMemo } from "react";
import { api } from "./api.js";

const TIPOS      = ["Computador","Impressora","Roteador","Smartphone","Câmera","Servidor","Switch","Outro"];
const STATUS_EQ  = ["Ativo","Disponível","Em Manutenção","Desativado"];
const TIPO_MANUT = ["Manutenção preventiva","Manutenção corretiva","Troca de peça","Atualização de software","Configuração","Observação"];
const DEPARTAMENTOS = ["Almoxarifado","Comercial","Compras","Contabilidade","Diretoria","Elétrica","Expedição","Fábrica","Financeiro","Jurídico","Logística","Portaria","PPCP","Qualidade","Recursos Humanos","Segurança do Trabalho","TI"];

const TIPO_ICON  = {Computador:"🖥",Impressora:"🖨",Roteador:"📡",Smartphone:"📱",Câmera:"📷",Servidor:"🗄",Switch:"🔀",Outro:"🔧"};
const TIPO_COLOR = {
  Computador:{bg:"#e8f0fb",color:"#1a3a6b"},Impressora:{bg:"#fef3c7",color:"#d97706"},
  Roteador:{bg:"#dcfce7",color:"#16a34a"},Smartphone:{bg:"#ede9fe",color:"#7c3aed"},
  Câmera:{bg:"#fee2e2",color:"#dc2626"},Servidor:{bg:"#1e293b",color:"#fff"},
  Switch:{bg:"#f1f5f9",color:"#475569"},Outro:{bg:"#f1f5f9",color:"#475569"}
};
const STATUS_COLOR = {
  "Ativo":{bg:"#dcfce7",color:"#16a34a"},"Disponível":{bg:"#e8f0fb",color:"#1a3a6b"},
  "Em Manutenção":{bg:"#fef3c7",color:"#d97706"},"Desativado":{bg:"#f1f5f9",color:"#94a3b8"}
};

// Quais seções de campos exibir por tipo de equipamento
const CAMPOS_TIPO = {
  Computador: {acesso:true,  so:true,  office:true,  email:true,  rede:true },
  Impressora: {acesso:true,  so:false, office:false, email:false, rede:true },
  Roteador:   {acesso:true,  so:false, office:false, email:false, rede:true },
  Smartphone: {acesso:true,  so:false, office:false, email:true,  rede:false},
  Câmera:     {acesso:true,  so:false, office:false, email:false, rede:true },
  Servidor:   {acesso:true,  so:true,  office:false, email:false, rede:true },
  Switch:     {acesso:true,  so:false, office:false, email:false, rede:true },
  Outro:      {acesso:true,  so:true,  office:true,  email:true,  rede:true },
};

// Labels do campo usuário/senha variam por tipo
const LABEL_ACESSO = {
  Computador: ["Usuário",         "Senha"],
  Impressora: ["Admin / Usuário", "Senha de Acesso"],
  Roteador:   ["SSID / Rede",     "Senha Wi-Fi"],
  Smartphone: ["Usuário",         "PIN / Senha"],
  Câmera:     ["Usuário Admin",   "Senha Admin"],
  Servidor:   ["Usuário Admin",   "Senha"],
  Switch:     ["Usuário Admin",   "Senha"],
  Outro:      ["Usuário",         "Senha"],
};

const C = {
  royalDark:"#1a3a6b",royalMid:"#2d5aa0",royalLight:"#5b9bd5",
  royalBg:"#f0f4f8",royalGhost:"#e8f0fb",white:"#ffffff",
  slate800:"#1e293b",slate600:"#475569",slate400:"#94a3b8",
  slate200:"#e2e8f0",slate100:"#f1f5f9",
  green:"#16a34a",greenLight:"#dcfce7",
  red:"#dc2626",redLight:"#fee2e2",
  amber:"#d97706",amberLight:"#fef3c7"
};

const inp = {
  width:"100%",padding:"7px 10px",border:`1.5px solid ${C.slate200}`,
  borderRadius:6,fontSize:13,color:C.slate800,fontFamily:"'Nunito',sans-serif",
  background:C.white,boxSizing:"border-box",outline:"none"
};

function fmtDt(ts) {
  if(!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR")+" "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}

function Field({label,children}) {
  return(
    <div>
      <div style={{fontSize:10,fontWeight:700,color:C.slate600,textTransform:"uppercase",letterSpacing:".06em",fontFamily:"'Montserrat',sans-serif",marginBottom:4}}>{label}</div>
      {children}
    </div>
  );
}

function Btn({children,onClick,primary,danger,style:s}) {
  return(
    <button onClick={onClick} style={{padding:"6px 13px",borderRadius:6,cursor:"pointer",fontFamily:"'Nunito',sans-serif",whiteSpace:"nowrap",fontSize:12,fontWeight:600,border:danger?`1px solid ${C.red}`:primary?`1px solid ${C.royalDark}`:`1px solid ${C.slate200}`,background:danger?C.redLight:primary?C.royalDark:C.white,color:danger?C.red:primary?C.white:C.slate600,...s}}>
      {children}
    </button>
  );
}

function ModalFicha({eq,manutencoes,onClose,onSave,onAddManut,onDelManut}) {
  const isNovo = !eq?.id;
  const [modo, setModo] = useState(isNovo ? "editar" : "ver");
  const [form, setForm] = useState(eq || {codigo:"",tipo:"Computador",usuario:"",senha:"",so:"",chave_so:"",office:"",chave_office:"",email:"",senha_email:"",ip:"",mac:"",obs:"",status:"Ativo",departamento:""});
  const [mostrarSenhas, setMostrarSenhas] = useState(false);
  const [novaMt, setNovaMt] = useState({tipo:"Manutenção corretiva",descricao:""});
  const [salvando, setSalvando] = useState(false);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const campos = CAMPOS_TIPO[form.tipo] || CAMPOS_TIPO.Outro;
  const [lblUsr, lblSnh] = LABEL_ACESSO[form.tipo] || LABEL_ACESSO.Outro;
  const tc = TIPO_COLOR[form.tipo] || TIPO_COLOR.Outro;
  const movs = (manutencoes||[]).filter(m=>m.equipamento_id===eq?.id).sort((a,b)=>new Date(b.registrado_em)-new Date(a.registrado_em));

  const handleSave = async () => {
    if(!form.codigo.trim()) return alert("Informe o código.");
    setSalvando(true);
    await onSave(form);
    setSalvando(false);
    if(!isNovo) setModo("ver");
  };

  const handleAddManut = async () => {
    if(!novaMt.descricao.trim()) return alert("Descreva a manutenção.");
    await onAddManut(eq.id, novaMt);
    setNovaMt({tipo:"Manutenção corretiva",descricao:""});
  };

  // Verifica quais seções têm conteúdo (para modo leitura)
  const ipValido = form.ip && form.ip!=="NP" && form.ip!=="0.0.0.0";
  const secoes = {
    acesso: campos.acesso  && !!(form.usuario || form.senha),
    so:     campos.so      && !!(form.so      || form.chave_so),
    office: campos.office  && !!(form.office  || form.chave_office),
    email:  campos.email   && !!(form.email   || form.senha_email),
    rede:   campos.rede    && !!(ipValido      || form.mac),
  };
  const temSenha = (campos.acesso && form.senha) || (campos.email && form.senha_email) || (campos.so && form.chave_so) || (campos.office && form.chave_office);

  // ── MODO LEITURA ──────────────────────────────────────────────────────────────
  const renderVer = () => {
    const Par = ({label, value, isSenha}) => {
      if(!value) return null;
      return(
        <div style={{minWidth:160,flex:1,marginBottom:6}}>
          <div style={{fontSize:10,fontWeight:700,color:C.slate400,textTransform:"uppercase",letterSpacing:".06em",fontFamily:"'Montserrat',sans-serif",marginBottom:3}}>{label}</div>
          <div style={{fontSize:13,color:C.slate800,fontWeight:600,wordBreak:"break-all",lineHeight:1.4}}>
            {isSenha ? (mostrarSenhas ? value : "••••••") : value}
          </div>
        </div>
      );
    };

    const Secao = ({titulo,children}) => (
      <div style={{marginBottom:18}}>
        <div style={{fontSize:10,fontWeight:700,color:C.royalMid,textTransform:"uppercase",letterSpacing:".08em",fontFamily:"'Montserrat',sans-serif",marginBottom:8,paddingBottom:5,borderBottom:`1px solid ${C.slate200}`}}>{titulo}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"8px 32px"}}>{children}</div>
      </div>
    );

    return(
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.slate200}`}}>
        {temSenha&&(
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
            <button onClick={()=>setMostrarSenhas(s=>!s)} style={{fontSize:11,color:C.royalMid,background:C.royalGhost,border:`1px solid ${C.royalLight}`,borderRadius:5,padding:"4px 12px",cursor:"pointer",fontFamily:"'Nunito',sans-serif",fontWeight:600}}>
              {mostrarSenhas?"🔒 Ocultar senhas":"👁 Mostrar senhas"}
            </button>
          </div>
        )}

        <Secao titulo="Identificação">
          <Par label="Código"      value={form.codigo}/>
          <Par label="Tipo"        value={form.tipo}/>
          <Par label="Status"      value={form.status}/>
          <Par label="Departamento" value={form.departamento}/>
        </Secao>

        {secoes.acesso&&(
          <Secao titulo="Acesso">
            <Par label={lblUsr} value={form.usuario}/>
            <Par label={lblSnh} value={form.senha} isSenha/>
          </Secao>
        )}

        {secoes.so&&(
          <Secao titulo="Sistema Operacional">
            <Par label="Sistema"  value={form.so}/>
            <Par label="Chave SO" value={form.chave_so} isSenha/>
          </Secao>
        )}

        {secoes.office&&(
          <Secao titulo="Office">
            <Par label="Suite Office"  value={form.office}/>
            <Par label="Chave Office"  value={form.chave_office} isSenha/>
          </Secao>
        )}

        {secoes.email&&(
          <Secao titulo="E-mail">
            <Par label="E-mail"      value={form.email}/>
            <Par label="Senha E-mail" value={form.senha_email} isSenha/>
          </Secao>
        )}

        {secoes.rede&&(
          <Secao titulo="Rede">
            <Par label="IP"  value={ipValido ? form.ip : null}/>
            <Par label="MAC" value={form.mac}/>
          </Secao>
        )}

        {form.obs&&(
          <Secao titulo="Observações">
            <div style={{fontSize:13,color:C.slate800,lineHeight:1.6,width:"100%"}}>{form.obs}</div>
          </Secao>
        )}
      </div>
    );
  };

  // ── MODO EDIÇÃO ───────────────────────────────────────────────────────────────
  const renderEditar = () => (
    <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.slate200}`}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
        <Field label="Código">
          <input value={form.codigo} onChange={e=>set("codigo",e.target.value)} style={inp} placeholder="Ex: MQ65"/>
        </Field>
        <Field label="Tipo">
          <select value={form.tipo} onChange={e=>set("tipo",e.target.value)} style={inp}>
            {TIPOS.map(t=><option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={e=>set("status",e.target.value)} style={inp}>
            {STATUS_EQ.map(s=><option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Departamento">
          <select value={form.departamento||""} onChange={e=>set("departamento",e.target.value)} style={inp}>
            <option value="">—</option>
            {DEPARTAMENTOS.map(d=><option key={d}>{d}</option>)}
          </select>
        </Field>
      </div>

      {campos.acesso&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <Field label={lblUsr}><input value={form.usuario||""} onChange={e=>set("usuario",e.target.value)} style={inp}/></Field>
          <Field label={lblSnh}><input value={form.senha||""}   onChange={e=>set("senha",e.target.value)}   style={inp}/></Field>
        </div>
      )}

      {campos.so&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <Field label="Sistema Op."><input value={form.so||""}       onChange={e=>set("so",e.target.value)}       style={inp}/></Field>
          <Field label="Chave SO">   <input value={form.chave_so||""} onChange={e=>set("chave_so",e.target.value)} style={inp}/></Field>
        </div>
      )}

      {campos.office&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <Field label="Office">      <input value={form.office||""}       onChange={e=>set("office",e.target.value)}       style={inp}/></Field>
          <Field label="Chave Office"><input value={form.chave_office||""} onChange={e=>set("chave_office",e.target.value)} style={inp}/></Field>
        </div>
      )}

      {campos.email&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <Field label="E-mail">      <input value={form.email||""}       onChange={e=>set("email",e.target.value)}       style={inp}/></Field>
          <Field label="Senha E-mail"><input value={form.senha_email||""} onChange={e=>set("senha_email",e.target.value)} style={inp}/></Field>
        </div>
      )}

      {campos.rede&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <Field label="IP"> <input value={form.ip||""}  onChange={e=>set("ip",e.target.value)}  style={inp} placeholder="192.168.0.X"/></Field>
          <Field label="MAC"><input value={form.mac||""} onChange={e=>set("mac",e.target.value)} style={inp}/></Field>
        </div>
      )}

      <div style={{marginBottom:12}}>
        <Field label="Observações">
          <textarea value={form.obs||""} onChange={e=>set("obs",e.target.value)} style={{...inp,minHeight:52,resize:"vertical"}} placeholder="Observações, rede, etc."/>
        </Field>
      </div>

      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
        <Btn onClick={isNovo ? onClose : ()=>setModo("ver")}>Cancelar</Btn>
        <Btn primary onClick={handleSave} style={{opacity:salvando?0.7:1}}>
          {salvando?"Salvando...":isNovo?"Cadastrar equipamento":"Salvar alterações"}
        </Btn>
      </div>
    </div>
  );

  // ── HISTÓRICO DE MANUTENÇÕES ──────────────────────────────────────────────────
  const renderHistorico = () => {
    if(isNovo) return null;
    return(
      <div style={{padding:"16px 20px"}}>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:700,color:C.slate400,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>Histórico de Manutenções</div>
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
        {movs.length===0
          ?<div style={{fontSize:13,color:C.slate400,textAlign:"center",padding:"20px 0"}}>Nenhuma manutenção registrada ainda.</div>
          :movs.map((m,i)=>{
            const mtc={"Manutenção preventiva":{bg:C.greenLight,color:C.green},"Manutenção corretiva":{bg:C.redLight,color:C.red},"Troca de peça":{bg:C.amberLight,color:C.amber},"Atualização de software":{bg:"#e8f0fb",color:C.royalDark},"Configuração":{bg:"#ede9fe",color:"#7c3aed"},"Chamado vinculado":{bg:C.amberLight,color:C.amber},"Observação":{bg:C.slate100,color:C.slate600}}[m.tipo]||{bg:C.slate100,color:C.slate600};
            return(
              <div key={m.id} style={{display:"flex",gap:10,marginBottom:12}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:i===0?C.royalMid:C.slate400,flexShrink:0,marginTop:4}}/>
                  {i<movs.length-1&&<div style={{width:1,flex:1,background:C.slate200,margin:"4px 0"}}/>}
                </div>
                <div style={{flex:1,paddingBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                    <span style={{fontSize:10,fontWeight:700,color:C.royalLight,fontFamily:"'Montserrat',sans-serif"}}>{fmtDt(m.registrado_em)}</span>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,background:mtc.bg,color:mtc.color,fontFamily:"'Montserrat',sans-serif"}}>{m.tipo}</span>
                  </div>
                  <div style={{fontSize:13,color:C.slate800,lineHeight:1.5}}>{m.descricao}</div>
                </div>
                <button onClick={()=>onDelManut(m.id)} style={{background:"none",border:"none",color:C.slate400,cursor:"pointer",fontSize:14,flexShrink:0,alignSelf:"flex-start",padding:"2px 4px"}}>×</button>
              </div>
            );
          })
        }
      </div>
    );
  };

  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.white,borderRadius:12,width:"min(740px,96vw)",maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",border:`1px solid ${C.slate200}`}}>

        {/* CABEÇALHO */}
        <div style={{background:C.royalDark,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:8,background:tc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{TIPO_ICON[form.tipo]||"🔧"}</div>
            <div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:13,fontWeight:700,color:C.white}}>{isNovo?"Novo Equipamento":form.codigo}</div>
              <div style={{fontSize:11,color:C.royalLight}}>{form.tipo}{form.departamento?" · "+form.departamento:""}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {modo==="ver"&&!isNovo&&(
              <button onClick={()=>setModo("editar")} style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",color:C.white,padding:"4px 12px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"'Nunito',sans-serif"}}>
                ✏ Editar
              </button>
            )}
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:C.white,width:30,height:30,borderRadius:6,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div style={{overflowY:"auto",flex:1}}>
          {modo==="ver" ? renderVer() : renderEditar()}
          {renderHistorico()}
        </div>
      </div>
    </div>
  );
}

export default function Inventario() {
  const [equipamentos,setEquipamentos] = useState([]);
  const [manutencoes,setManutencoes]   = useState([]);
  const [carregando,setCarregando]     = useState(true);
  const [erro,setErro]                 = useState(null);
  const [busca,setBusca]               = useState("");
  const [fTipo,setFTipo]               = useState("");
  const [fStatus,setFStatus]           = useState("");
  const [fDept,setFDept]               = useState("");
  const [modal,setModal]               = useState(null);

  useEffect(()=>{carregarTudo();},[]);

  async function carregarTudo() {
    setCarregando(true); setErro(null);
    try {
      const [eqs,mts] = await Promise.all([api.equipamentos.listar(),api.manutencoes.listar()]);
      setEquipamentos(eqs||[]); setManutencoes(mts||[]);
    } catch(e) { setErro("Erro ao carregar: "+e.message); }
    finally { setCarregando(false); }
  }

  async function salvar(form) {
    if(form.id) {
      const data = await api.equipamentos.atualizar(form.id,form);
      setEquipamentos(prev=>prev.map(e=>e.id===form.id?data:e));
    } else {
      const data = await api.equipamentos.criar(form);
      setEquipamentos(prev=>[...prev,data].sort((a,b)=>a.codigo.localeCompare(b.codigo)));
      setModal(null);
    }
  }

  async function addManut(eqId,mt) {
    const data = await api.manutencoes.criar({equipamento_id:eqId,...mt});
    setManutencoes(prev=>[data,...prev]);
  }

  async function delManut(id) {
    await api.manutencoes.excluir(id);
    setManutencoes(prev=>prev.filter(m=>m.id!==id));
  }

  const stats = useMemo(()=>({
    total:       equipamentos.length,
    ativos:      equipamentos.filter(e=>e.status==="Ativo").length,
    disponiveis: equipamentos.filter(e=>e.status==="Disponível").length,
    manutencao:  equipamentos.filter(e=>e.status==="Em Manutenção").length,
  }),[equipamentos]);

  const lista = useMemo(()=>equipamentos.filter(e=>{
    if(fTipo   && e.tipo!==fTipo)     return false;
    if(fStatus && e.status!==fStatus) return false;
    if(fDept   && e.departamento!==fDept) return false;
    if(busca) {
      const b = busca.toLowerCase();
      return (e.codigo||"").toLowerCase().includes(b)
          || (e.usuario||"").toLowerCase().includes(b)
          || (e.ip||"").toLowerCase().includes(b)
          || (e.mac||"").toLowerCase().includes(b)
          || (e.departamento||"").toLowerCase().includes(b);
    }
    return true;
  }),[equipamentos,fTipo,fStatus,fDept,busca]);

  const tiposCount = useMemo(()=>TIPOS.reduce((acc,t)=>({...acc,[t]:equipamentos.filter(e=>e.tipo===t).length}),{}),[equipamentos]);

  if(carregando) return(
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:C.royalBg,flexDirection:"column",gap:12}}>
      <div style={{fontSize:32}}>⏳</div>
      <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:13,color:C.slate400}}>Carregando inventário...</div>
    </div>
  );
  if(erro) return(
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:C.royalBg,flexDirection:"column",gap:12}}>
      <div style={{fontSize:32}}>⚠️</div>
      <div style={{fontSize:13,color:C.red,maxWidth:400,textAlign:"center"}}>{erro}</div>
      <Btn onClick={carregarTudo}>Tentar novamente</Btn>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",fontFamily:"'Nunito',sans-serif",background:C.royalBg,overflow:"hidden"}}>

      {/* TOPBAR */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.slate200}`,padding:"0 20px",height:48,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,background:C.royalDark,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🖥</div>
          <div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:13,fontWeight:700,color:C.slate800}}>Inventário · Parque Tecnológico</div>
            <div style={{fontSize:10,color:C.slate400,fontFamily:"'Montserrat',sans-serif"}}>CentralTI</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Btn onClick={carregarTudo}>↻ Atualizar</Btn>
          <Btn primary onClick={()=>setModal({eq:null})}>+ Novo Equipamento</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",background:C.white,borderBottom:`1px solid ${C.slate200}`,flexShrink:0}}>
        {[
          {label:"Total",       value:stats.total,       color:C.royalDark, bg:"#e8f0fb",    icon:"🖥"},
          {label:"Ativos",      value:stats.ativos,      color:C.green,     bg:C.greenLight, icon:"✅"},
          {label:"Disponíveis", value:stats.disponiveis, color:C.royalMid,  bg:"#e8f0fb",    icon:"📦"},
          {label:"Manutenção",  value:stats.manutencao,  color:C.amber,     bg:C.amberLight, icon:"🔧"},
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

      {/* FILTROS POR TIPO */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.slate200}`,padding:"8px 20px",display:"flex",gap:6,flexWrap:"wrap",flexShrink:0}}>
        <button onClick={()=>setFTipo("")} style={{fontSize:11,padding:"3px 10px",borderRadius:20,cursor:"pointer",fontWeight:600,fontFamily:"'Nunito',sans-serif",border:`1px solid ${fTipo===""?C.royalDark:C.slate200}`,background:fTipo===""?C.royalDark:"#fff",color:fTipo===""?"#fff":C.slate600}}>
          Todos ({equipamentos.length})
        </button>
        {TIPOS.filter(t=>tiposCount[t]>0).map(t=>{
          const ativo = fTipo===t;
          return(
            <button key={t} onClick={()=>setFTipo(ativo?"":t)} style={{fontSize:11,padding:"3px 10px",borderRadius:20,cursor:"pointer",fontWeight:600,fontFamily:"'Nunito',sans-serif",border:`1px solid ${ativo?C.royalDark:C.slate200}`,background:ativo?C.royalDark:C.white,color:ativo?"#fff":C.slate600,display:"flex",alignItems:"center",gap:4}}>
              <span>{TIPO_ICON[t]}</span>{t} ({tiposCount[t]})
            </button>
          );
        })}
      </div>

      {/* BARRA DE BUSCA E FILTROS */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.slate200}`,padding:"0 20px",height:36,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{display:"flex",alignItems:"center",gap:6,border:`1px solid ${C.slate200}`,borderRadius:6,padding:"4px 10px",background:C.royalBg,width:220}}>
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

      {/* CABEÇALHO DA TABELA */}
      <div style={{display:"grid",gridTemplateColumns:"42px 100px 120px 1fr 110px 140px 110px 80px",alignItems:"center",padding:"0 20px",height:30,background:C.slate100,borderBottom:`1px solid ${C.slate200}`,flexShrink:0,gap:0}}>
        {["","Código","Tipo","Usuário","IP","MAC","Departamento","Status"].map((c,i)=>(
          <div key={i} style={{fontSize:10,fontWeight:700,color:C.slate400,textTransform:"uppercase",letterSpacing:".06em",fontFamily:"'Montserrat',sans-serif"}}>{c}</div>
        ))}
      </div>

      {/* LISTA */}
      <div style={{flex:1,overflowY:"auto",background:C.white}}>
        {lista.length===0
          ?<div style={{textAlign:"center",padding:"48px 16px",color:C.slate400}}>
            <div style={{fontSize:32,marginBottom:8}}>🔍</div>
            <div style={{fontSize:14,fontWeight:600}}>Nenhum equipamento encontrado</div>
          </div>
          :lista.map(e=>{
            const tc  = TIPO_COLOR[e.tipo]||TIPO_COLOR.Outro;
            const sc  = STATUS_COLOR[e.status]||STATUS_COLOR.Ativo;
            const mts = manutencoes.filter(m=>m.equipamento_id===e.id);
            return(
              <div key={e.id} onClick={()=>setModal({eq:e})}
                style={{display:"grid",gridTemplateColumns:"42px 100px 120px 1fr 110px 140px 110px 80px",alignItems:"center",padding:"9px 20px",borderBottom:`1px solid ${C.slate100}`,cursor:"pointer",gap:0,transition:"background .12s"}}
                onMouseEnter={ev=>ev.currentTarget.style.background="#fafbfe"}
                onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                <div style={{width:28,height:28,borderRadius:6,background:tc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{TIPO_ICON[e.tipo]||"🔧"}</div>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,fontWeight:700,color:C.slate800}}>{e.codigo}</div>
                <div style={{fontSize:11,color:tc.color,fontWeight:600}}>{e.tipo}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.slate800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:220}}>{e.usuario||<span style={{color:C.slate400,fontSize:12}}>—</span>}</div>
                  {mts.length>0&&<div style={{fontSize:10,color:C.royalMid,fontWeight:600,marginTop:1}}>🔧 {mts.length} manutenção{mts.length>1?"ões":""}</div>}
                </div>
                <div style={{fontSize:11,color:C.slate600,fontFamily:"'Montserrat',sans-serif"}}>{e.ip&&e.ip!=="NP"&&e.ip!=="0.0.0.0"?e.ip:<span style={{color:C.slate400}}>—</span>}</div>
                <div style={{fontSize:10,color:C.slate400,fontFamily:"'Montserrat',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.mac||"—"}</div>
                <div style={{fontSize:11,color:C.slate600}}>{e.departamento||<span style={{color:C.slate400}}>—</span>}</div>
                <div><span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,background:sc.bg,color:sc.color,fontFamily:"'Montserrat',sans-serif"}}>{e.status}</span></div>
              </div>
            );
          })
        }
      </div>

      {modal&&(
        <ModalFicha
          eq={modal.eq}
          manutencoes={manutencoes}
          onClose={()=>setModal(null)}
          onSave={salvar}
          onAddManut={addManut}
          onDelManut={delManut}
        />
      )}
    </div>
  );
}
