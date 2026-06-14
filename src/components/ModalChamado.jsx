/**
 * @fileoverview Modal completo para criação, edição e movimentação de chamados.
 */
import React, { useState, useEffect, useRef } from "react";
import { EMPRESAS, DEPARTAMENTOS, CATEGORIAS, PRIORIDADES, STATUS_LISTA, STATUS_ATIVOS, calcPrevisao, fmtDatetimeFull, BASE } from "../utils/helpers";
import { C, inputStyle, Field, Btn } from "./UI";

/**
 * Modal de Chamado para criar, editar, movimentar e encerrar.
 * @param {object} props - Propriedades.
 * @param {object|null} props.chamado - Dados do chamado (null se novo).
 * @param {Array} props.movimentacoes - Lista de movimentações.
 * @param {function} props.onClose - Fechar modal.
 * @param {function} props.onSave - Salvar alterações/criar.
 * @param {function} props.onAddMov - Adicionar movimentação.
 * @param {function} props.onFechar - Encerrar chamado.
 */

// ─── TIPOS FIXOS DE PRODUTO(espelho das constantes do estoque) ─────────────────────────────────────────────────────
const TIPOS_PRODUTO_REQ = ["Mouse", "Teclado", "Cabo", "Toner", "Memória RAM", "Fonte", "Adaptador", "Outro"];

/**
 * Modal para geração de requisição de estoque vinculada a um chamado.
 * Permite selecionar tipo (entrada/saida), produtos e quantidades.
 * @param {object} props
 * @param {object} props.chamado - Chamado ao qual a requisicao será vinculada
 * @param {function} props.onClose - Fecha modal
 * @param {function} props.onCriada - Callback após a criação bem-sucedida
 */
function modalRequisicao({ chamado, onClose, onCriada }){
  const [tipo,        setTipo]      = useState(null); //'entrada' || 'saida'
  const [produtos,    setProdutos]  = useState([]);
  const [itens,       setItens]     = useState([{ estoque_item_id: "", quantidade: 1}]);
  const [salvando,    setSalvando]  = useState([false]);
  const [carregando, setCarregando] = useState(false);

  // Carrega lista de produtos ao montar

  useEffect(() => {
    async function buscar(){
      setCarregando(true);
      try{
        const r = await fetch(`${BASE}/estoque/itens`);
        const j = await r.json();
        if(j.ok) setProdutos(j.data);
      } catch {}
      setCarregando(false);
    }
    buscar();
  }, []);

  const addLinha = () => setItens(p => [...p, { estoque_item_id: "", quantidade: 1 }]);
  const remLinha = (i) => setItens(p => p.filter((_, idx) => idx !== i));
  const updLinha = (i, k, v) => setItens(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const handleCriar = async () => {
    if (!tipo) return alert("Selecione o tipo da requisição.");
    const linhasValidas = itens.filter(it => it.estoque_item_id && it.quantidade > 0);
    if (linhasValidas.length === 0) return alert("Adicione ao menos um produto.");
    setSalvando(true);
    try {
      const r = await fetch(`${BASE}/estoque/requisicoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chamado_id: chamado.id, tipo, itens: linhasValidas }),
      });
      const j = await r.json();
      if (j.ok) { alert(`Requisição de ${tipo} criada com sucesso.`); onCriada(); }
      else alert("Erro ao criar requisição: " + j.error);
    } catch { alert("Erro ao criar requisição."); }
    setSalvando(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 350, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.white, borderRadius: 12, width: "min(560px,96vw)", overflow: "hidden", border: `1px solid ${C.slate200}` }}>
        <div style={{ background: C.royalDark, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13, color: C.white }}>
            Gerar Requisição — Chamado #{String(chamado.numero).padStart(4, "0")}
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: C.white, width: 30, height: 30, borderRadius: 6, cursor: "pointer", fontSize: 16 }}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Seleção de tipo */}
          {!tipo ? (
            <div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700, color: C.slate800, marginBottom: 14, textAlign: "center" }}>Qual o tipo da requisição?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { id: "entrada", label: "↓ Requisição de Entrada", desc: "Produto chegando ao estoque", bg: "#dcfce7", color: "#166534", border: "#86efac" },
                  { id: "saida",   label: "↑ Requisição de Saída",   desc: "Produto saindo do estoque",  bg: C.redLight, color: C.red, border: "#fca5a5" },
                ].map(t => (
                  <div key={t.id} onClick={() => setTipo(t.id)} style={{ padding: 16, borderRadius: 10, border: `2px solid ${t.border}`, background: t.bg, cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14, color: t.color, marginBottom: 4 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: t.color, opacity: .8 }}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {/* Indicador do tipo selecionado */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ background: tipo === "entrada" ? "#dcfce7" : C.redLight, color: tipo === "entrada" ? "#166534" : C.red, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, fontFamily: "'Montserrat',sans-serif" }}>
                  {tipo === "entrada" ? "↓ Entrada" : "↑ Saída"}
                </span>
                <button onClick={() => setTipo(null)} style={{ fontSize: 11, color: C.slate400, background: "none", border: "none", cursor: "pointer" }}>← Alterar tipo</button>
              </div>

              {/* Linhas de produto */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, color: C.slate400, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Produtos</div>
                {carregando ? (
                  <div style={{ fontSize: 12, color: C.slate400, padding: "8px 0" }}>Carregando produtos...</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {itens.map((it, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 32px", gap: 8, alignItems: "center" }}>
                        <select
                          value={it.estoque_item_id}
                          onChange={e => updLinha(i, "estoque_item_id", e.target.value)}
                          style={inputStyle}>
                          <option value="">Selecione o produto...</option>
                          {produtos.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.nome} ({p.quantidade} {p.unidade} em estoque)
                            </option>
                          ))}
                        </select>
                        <input
                          type="number" min={1}
                          value={it.quantidade}
                          onChange={e => updLinha(i, "quantidade", parseInt(e.target.value) || 1)}
                          style={inputStyle}
                          placeholder="Qtd"
                        />
                        <button onClick={() => remLinha(i)} disabled={itens.length === 1}
                          style={{ background: "none", border: "none", color: C.slate400, cursor: itens.length === 1 ? "not-allowed" : "pointer", fontSize: 18, padding: 0 }}>×</button>
                      </div>
                    ))}
                    <button onClick={addLinha} style={{ alignSelf: "flex-start", fontSize: 12, color: C.royalMid, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                      + Adicionar produto
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <Btn onClick={onClose}>Cancelar</Btn>
                <Btn primary disabled={salvando} onClick={handleCriar}>
                  {salvando ? "Criando..." : "Criar Requisição"}
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ModalChamado({ chamado, movimentacoes, onClose, onSave, onAddMov, onFechar }) {
  const isNovo = !chamado?.id;

  const [form, setForm] = useState(chamado || { empresa: "Empresa Principal", departamento: "", solicitante: "", assunto: "", descricao: "", categoria: "Suporte ao Usuário", prioridade: "Média", status: "Aberto", previsao: "" });
  const [novaMov, setNovaMov] = useState("");
  const [fechando, setFechando] = useState(false);
  const [fechForm, setFechForm] = useState({ tempo_gasto: "", resultado: "", solucao_aplicada: "" });

  // ── Estados de requisição de estoque ──
  const [modalReq,     setModalReq]     = useState(false);
  const [tipoReq,      setTipoReq]      = useState(null); // 'entrada' | 'saida'
  
  // ── Estados de vinculação de equipamento ──
  const [buscaEq,      setBuscaEq]      = useState("");
  const [equipamentos, setEquipamentos] = useState([]);
  const [buscandoEq,   setBuscandoEq]   = useState(false);
  const [eqVinculado,  setEqVinculado]  = useState(chamado?.equipamento_id ? { id: chamado.equipamento_id, codigo: chamado.equipamento_codigo || "", usuario: chamado.equipamento_usuario || "" } : null);

  // ── Estados de anexos ──
  const [anexos, setAnexos]             = useState([]);
  const [carregandoAnexos, setCarregandoAnexos] = useState(false);
  const [enviandoAnexo, setEnviandoAnexo]       = useState(false);
  const [lightbox, setLightbox]                 = useState(null); // índice do anexo em foco
  const inputFileRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Atualiza previsão ao mudar prioridade
  useEffect(() => {
    if (!isNovo && form.prioridade !== chamado.prioridade) {
      const prev = calcPrevisao(form.prioridade, chamado.criado_em);
      set("previsao", prev.toISOString().slice(0, 16));
    }
  }, [form.prioridade]);

  // Carrega anexos ao abrir modal (sob demanda)
  useEffect(() => {
    if (isNovo) return;
    async function buscarAnexos() {
      setCarregandoAnexos(true);
      try {
        const r = await fetch(`${BASE}/chamados/${chamado.id}/anexos`);
        const j = await r.json();
        if (j.ok) setAnexos(j.data);
      } catch {
        // falha silenciosa — seção fica vazia
      }
      setCarregandoAnexos(false);
    }
    buscarAnexos();
  }, [chamado?.id]);

  const handleSave = () => {
    if (!form.assunto?.trim()) return alert("Informe o assunto.");
    if (!form.departamento) return alert("Selecione o departamento.");
    if (!form.solicitante?.trim()) return alert("Informe o solicitante.");
    const previsao = form.previsao ? new Date(form.previsao).toISOString() : calcPrevisao(form.prioridade).toISOString();
    onSave({ ...form, previsao });
  };

  const handleAddMov = () => {
    if (!novaMov.trim()) return;
    onAddMov(chamado.id, novaMov.trim());
    setNovaMov("");
  };

  const handleFechar = () => {
    if (!fechForm.resultado?.trim()) return alert("Descreva o resultado.");
    if (!fechForm.solucao_aplicada?.trim()) return alert("Informe a solução aplicada.");
    onFechar(chamado.id, fechForm);
    setFechando(false);
  };

  /**
   * Faz upload dos arquivos selecionados para o chamado atual.
   * @param {FileList} files - Arquivos selecionados pelo input.
   */
  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    setEnviandoAnexo(true);
    try {
      const data = new FormData();
      Array.from(files).forEach(f => data.append("arquivos", f));
      const r = await fetch(`${BASE}/chamados/${chamado.id}/anexos`, { method: "POST", body: data });
      const j = await r.json();
      if (j.ok) setAnexos(prev => [...prev, ...j.data]);
      else alert("Erro ao enviar anexo: " + j.error);
    } catch {
      alert("Erro ao enviar anexo.");
    }
    setEnviandoAnexo(false);
    // Limpa input para permitir reenvio do mesmo arquivo
    if (inputFileRef.current) inputFileRef.current.value = "";
  };

  /**
   * Remove um anexo do chamado após confirmação do usuário.
   * @param {object} anexo - Objeto do anexo a ser removido.
   */
  const handleRemoverAnexo = async (anexo) => {
    if (!confirm(`Remover "${anexo.nome_original}"?`)) return;
    try {
      const r = await fetch(`${BASE}/anexos/${anexo.id}`, { method: "DELETE" });
      const j = await r.json();
      if (j.ok) setAnexos(prev => prev.filter(a => a.id !== anexo.id));
      else alert("Erro ao remover anexo.");
    } catch {
      alert("Erro ao remover anexo.");
    }
  };

  /**
   * Busca equipamentos pelo código ou usuário para vinculação ao chamado.
   */
  const handleBuscarEq = async (termo = buscaEq) => {
    if (!termo.trim()) return;
    setBuscandoEq(true);
    try {
      const r = await fetch(`${BASE}/equipamentos?busca=${encodeURIComponent(termo.trim())}`);
      const j = await r.json();
      if (j.ok) setEquipamentos(j.data);
      else setEquipamentos([]);
    } catch {
      setEquipamentos([]);
    }
    setBuscandoEq(false);
  };

  const ehImagem = (tipo) => tipo?.startsWith("image/");

  const anexosImagem = anexos.filter(a => ehImagem(a.tipo));

  const movs = (movimentacoes || []).filter(m => m.chamado_id === chamado?.id).sort((a, b) => new Date(b.registrado_em) - new Date(a.registrado_em));

  return (
    <>
      {/* ── LIGHTBOX ── */}
      {lightbox !== null && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}
        >
          <img
            src={`${BASE}/anexos/${anexosImagem[lightbox].id}/arquivo`}
            alt={anexosImagem[lightbox].nome_original}
            style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: 8, objectFit: "contain" }}
            onClick={e => e.stopPropagation()}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {lightbox > 0 && (
              <button onClick={e => { e.stopPropagation(); setLightbox(l => l - 1); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>← Anterior</button>
            )}
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{anexosImagem[lightbox].nome_original}</span>
            {lightbox < anexosImagem.length - 1 && (
              <button onClick={e => { e.stopPropagation(); setLightbox(l => l + 1); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Próxima →</button>
            )}
          </div>
          <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>
      )}

      {/* ── MODAL PRINCIPAL ── */}
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: C.white, borderRadius: 12, width: "min(700px, 96vw)", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", border: `1px solid ${C.slate200}` }}>

          {/* Cabeçalho */}
          <div style={{ background: C.royalDark, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 700, color: C.white }}>{isNovo ? "Novo Chamado" : `Chamado #${String(chamado.numero || "").padStart(4, "0")}`}</div>
              {!isNovo && <div style={{ fontSize: 11, color: C.royalLight, marginTop: 2 }}>{chamado.empresa} · {chamado.departamento}</div>}
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: C.white, width: 30, height: 30, borderRadius: 6, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>

            {/* Formulário Principal */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.slate200}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <Field label="Empresa">
                  <select value={form.empresa} onChange={e => set("empresa", e.target.value)} style={inputStyle}>{EMPRESAS.map(e => <option key={e}>{e}</option>)}</select>
                </Field>
                <Field label="Departamento">
                  <select value={form.departamento} onChange={e => set("departamento", e.target.value)} style={inputStyle}><option value="">Selecione...</option>{DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}</select>
                </Field>
              </div>
              <div style={{ marginBottom: 12 }}><Field label="Solicitante"><input value={form.solicitante} onChange={e => set("solicitante", e.target.value)} placeholder="Nome do usuário" style={inputStyle} /></Field></div>
              <div style={{ marginBottom: 12 }}><Field label="Assunto"><input value={form.assunto} onChange={e => set("assunto", e.target.value)} placeholder="Descreva brevemente o problema" style={inputStyle} /></Field></div>
              <div style={{ marginBottom: 12 }}><Field label="Descrição"><textarea value={form.descricao || ""} onChange={e => set("descricao", e.target.value)} placeholder="Detalhes adicionais..." style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} /></Field></div>

              {/* Vinculação de equipamento */}
              <div style={{ marginBottom: 12 }}>
                <Field label="Equipamento vinculado">
                  {eqVinculado ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", border: `1.5px solid ${C.slate200}`, borderRadius: 7, background: "#f0f4f8" }}>
                      <span style={{ fontSize: 16 }}>🖥</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700, color: C.royalMid, fontSize: 13 }}>{eqVinculado.codigo}</span>
                        {eqVinculado.usuario && <span style={{ color: C.slate400, fontSize: 12, marginLeft: 8 }}>{eqVinculado.usuario}</span>}
                      </div>
                      <button onClick={() => { setEqVinculado(null); set("equipamento_id", null); }} style={{ background: "none", border: "none", color: C.slate400, cursor: "pointer", fontSize: 16 }}>×</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={buscaEq}
                        onChange={e => {
                          const v = e.target.value;
                          setBuscaEq(v);
                          // Dispara busca automática a partir de 2 caracteres
                          if (v.trim().length >= 2) handleBuscarEq(v);
                          else setEquipamentos([]);
                        }}
                        onKeyDown={e => e.key === "Enter" && handleBuscarEq()}
                        placeholder="Buscar por código ou usuário..."
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button onClick={handleBuscarEq} disabled={buscandoEq} style={{ padding: "0 14px", borderRadius: 7, border: `1px solid ${C.slate200}`, background: C.white, color: C.slate600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                        {buscandoEq ? "..." : "🔍"}
                      </button>
                    </div>
                  )}
                  {/* Lista de resultados da busca */}
                  {!eqVinculado && equipamentos.length > 0 && (
                    <div style={{ border: `1px solid ${C.slate200}`, borderRadius: 6, marginTop: 4, overflow: "hidden", maxHeight: 160, overflowY: "auto" }}>
                      {equipamentos.slice(0, 8).map((eq, i) => (
                        <div key={eq.id} onClick={() => { setEqVinculado(eq); set("equipamento_id", eq.id); setEquipamentos([]); setBuscaEq(""); }}
                          style={{ padding: "8px 12px", background: i % 2 === 0 ? C.white : "#f8fafc", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.slate200}` }}
                          onMouseEnter={ev => ev.currentTarget.style.background = "#eff6ff"}
                          onMouseLeave={ev => ev.currentTarget.style.background = i % 2 === 0 ? C.white : "#f8fafc"}>
                          <div>
                            <span style={{ fontWeight: 700, color: C.royalMid, fontSize: 12 }}>{eq.codigo}</span>
                            {eq.usuario && <span style={{ color: C.slate600, fontSize: 12, marginLeft: 8 }}>{eq.usuario}</span>}
                          </div>
                          <span style={{ fontSize: 11, color: C.slate400 }}>{eq.tipo}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                <Field label="Categoria"><select value={form.categoria} onChange={e => set("categoria", e.target.value)} style={inputStyle}>{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Prioridade"><select value={form.prioridade} onChange={e => set("prioridade", e.target.value)} style={inputStyle}>{PRIORIDADES.map(p => <option key={p}>{p}</option>)}</select></Field>
                <Field label="Status"><select value={form.status} onChange={e => set("status", e.target.value)} style={inputStyle}>{STATUS_LISTA.map(s => <option key={s}>{s}</option>)}</select></Field>
                <Field label="Previsão (manual)"><input type="datetime-local" value={form.previsao ? form.previsao.slice(0, 16) : ""} onChange={e => set("previsao", e.target.value)} style={inputStyle} /></Field>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Btn onClick={onClose}>Cancelar</Btn>
                <Btn primary onClick={handleSave}>{isNovo ? "Criar chamado" : "Salvar alterações"}</Btn>
              </div>
            </div>

            {/* ── SEÇÃO DE ANEXOS (apenas chamados existentes) ── */}
            {!isNovo && (
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.slate200}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, color: C.slate400, textTransform: "uppercase", letterSpacing: ".06em" }}>
                    Anexos {anexos.length > 0 && <span style={{ color: C.royalDark }}>({anexos.length})</span>}
                  </div>
                  <div>
                    <input
                      ref={inputFileRef}
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.gif,.pdf"
                      style={{ display: "none" }}
                      onChange={e => handleUpload(e.target.files)}
                    />
                    <Btn onClick={() => inputFileRef.current?.click()} primary={false}>
                      {enviandoAnexo ? "Enviando..." : "+ Adicionar anexo"}
                    </Btn>
                  </div>
                </div>

                {carregandoAnexos ? (
                  <div style={{ fontSize: 12, color: C.slate400, padding: "8px 0" }}>Carregando anexos...</div>
                ) : anexos.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.slate400, padding: "8px 0" }}>Nenhum anexo adicionado.</div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {anexos.map((anexo, idx) => {
                      const isImg = ehImagem(anexo.tipo);
                      const imgIdx = anexosImagem.findIndex(a => a.id === anexo.id);
                      return (
                        <div
                          key={anexo.id}
                          style={{ position: "relative", width: 90, borderRadius: 8, border: `1px solid ${C.slate200}`, overflow: "hidden", background: C.royalBg, cursor: isImg ? "zoom-in" : "pointer" }}
                          onClick={() => {
                            if (isImg) setLightbox(imgIdx);
                            else window.open(`${BASE}/anexos/${anexo.id}/arquivo`, "_blank");
                          }}
                          title={anexo.nome_original}
                        >
                          {/* Miniatura */}
                          {isImg ? (
                            <img
                              src={`${BASE}/anexos/${anexo.id}/arquivo`}
                              alt={anexo.nome_original}
                              style={{ width: "100%", height: 70, objectFit: "cover", display: "block" }}
                            />
                          ) : (
                            <div style={{ width: "100%", height: 70, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                              📄
                            </div>
                          )}
                          {/* Nome */}
                          <div style={{ padding: "4px 6px", fontSize: 10, color: C.slate600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {anexo.nome_original}
                          </div>
                          {/* Botão remover */}
                          <button
                            onClick={e => { e.stopPropagation(); handleRemoverAnexo(anexo); }}
                            style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 18, height: 18, borderRadius: "50%", cursor: "pointer", fontSize: 11, lineHeight: "18px", textAlign: "center", padding: 0 }}
                            title="Remover anexo"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Área de Movimentações */}
            {!isNovo && (
              <div style={{ padding: "16px 20px" }}>
                <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, color: C.slate400, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Movimentações</div>

                <div style={{ background: C.royalBg, borderRadius: 8, border: `1px solid ${C.slate200}`, padding: 12, marginBottom: 14 }}>
                  <textarea value={novaMov} onChange={e => setNovaMov(e.target.value)} placeholder="Registrar o que foi feito..." style={{ ...inputStyle, minHeight: 60, resize: "vertical", marginBottom: 8, background: C.white }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: C.slate400 }}>Data/hora registrada automaticamente</span>
                    <Btn primary onClick={handleAddMov}>Registrar</Btn>
                  </div>
                </div>

                {STATUS_ATIVOS.includes(form.status) && (
                  <div style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Btn onClick={() => { setFechando(true); setFechForm({ tempo_gasto: "", resultado: "", solucao_aplicada: "" }); }}>Encerrar chamado</Btn>
                    <Btn onClick={() => setModalReq(true)}>📦 Gerar Requisição</Btn>
                  </div>
                )}
                {STATUS_ATIVOS.includes(form.status) && fechando && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ background: C.royalBg, borderRadius: 8, border: `1px solid ${C.slate200}`, padding: 14 }}>
                      <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 700, color: C.slate600, marginBottom: 10 }}>Encerramento do chamado</div>
                      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, marginBottom: 10 }}>
                        <Field label="Tempo gasto (min)"><input type="number" min={0} value={fechForm.tempo_gasto} onChange={e => setFechForm(f => ({ ...f, tempo_gasto: e.target.value }))} placeholder="Ex: 45" style={inputStyle} /></Field>
                        <Field label="O que foi feito / por que não resolveu"><input value={fechForm.resultado} onChange={e => setFechForm(f => ({ ...f, resultado: e.target.value }))} placeholder="Descreva o resultado..." style={inputStyle} /></Field>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <Field label="Solução Aplicada *">
                          <textarea
                            value={fechForm.solucao_aplicada}
                            onChange={e => setFechForm(f => ({ ...f, solucao_aplicada: e.target.value }))}
                            placeholder="Descreva detalhadamente a solução que resolveu o problema..."
                            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                          />
                        </Field>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn onClick={() => setFechando(false)}>Cancelar</Btn>
                        <Btn onClick={() => { setFechForm(f => ({ ...f, sem_solucao: false })); handleFechar(); }}>Fechar — Resolvido</Btn>
                        <Btn style={{ background: C.redLight, color: "#c53030", borderColor: "#fca5a5" }} onClick={() => { setFechForm(f => ({ ...f, sem_solucao: true })); handleFechar(); }}>Fechar — Sem solução</Btn>
                      </div>
                    </div>
                  </div>
                )}

                {movs.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.slate400, textAlign: "center", padding: "20px 0" }}>Nenhuma movimentação registrada ainda.</div>
                ) : movs.map((m, i) => (
                  <div key={m.id} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: i === 0 ? C.royalMid : C.slate400, flexShrink: 0, marginTop: 4 }} />
                      {i < movs.length - 1 && <div style={{ width: 1, flex: 1, background: C.slate200, margin: "4px 0" }} />}
                    </div>
                    <div style={{ paddingBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.royalLight, fontFamily: "'Montserrat',sans-serif", marginBottom: 3 }}>{fmtDatetimeFull(m.registrado_em)}</div>
                      <div style={{ fontSize: 13, color: C.slate800, lineHeight: 1.5 }}>{m.texto}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    {/* ── MODAL REQUISIÇÃO ── */}
      {modalReq && (
        <ModalRequisicao
          chamado={chamado}
          onClose={() => { setModalReq(false); setTipoReq(null); }}
          onCriada={() => setModalReq(false)}
        />
      )}
    </>
  );
}