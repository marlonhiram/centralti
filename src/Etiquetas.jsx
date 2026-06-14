import React, { useState } from "react";
// Importando as cores do nosso arquivo de UI
import { C } from "./components/UI";

export default function Etiquetas() {
  const [maquina, setMaquina] = useState("");
  const [senha, setSenha] = useState("");
  const [status, setStatus] = useState("idle"); 
  const [erro, setErro] = useState("");

  async function handleImprimir() {
    if (!maquina.trim()) {
      window.alert("Informe o nome da máquina."); // Usando window.alert
      return;
    }
    
    setStatus("printing");
    setErro("");

    try {
      // 1. Imprimir Nome da Máquina
      const res1 = await fetch("http://localhost:3001/imprimir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: maquina.trim() })
      });
      if (!res1.ok) throw new Error("Falha ao imprimir etiqueta da máquina");

      // 2. Imprimir Senha
      if (senha.trim()) {
        const res2 = await fetch("http://localhost:3001/imprimir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto: senha.trim() })
        });
        if (!res2.ok) throw new Error("Falha ao imprimir etiqueta da senha");
      }

      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      setErro(e.message);
      setStatus("error");
    }
  }

  // Estilos locais para simplificar
  const inputStyleLocal = {
    width: "100%", padding: "10px 12px", border: `1.5px solid ${C.slate200}`, 
    borderRadius: 6, fontSize: 14, fontFamily: "'Nunito',sans-serif", 
    boxSizing: "border-box"
  };

  return (
    <div style={{ padding: 24, maxWidth: 500, margin: "0 auto" }}>
      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.slate200}`, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        
        {/* Header */}
        <div style={{ background: C.royalDark, padding: "14px 20px", borderRadius: "10px 10px 0 0", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏷️</span>
          <div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, color: C.white, fontSize: 15 }}>Impressão de Etiquetas</div>
            <div style={{ fontSize: 11, color: C.royalLight }}>Zebra TLP 2844 · 4,4cm x 1,4cm</div>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.slate800, marginBottom: 6, fontFamily: "'Montserrat',sans-serif" }}>
              01 — Nome da Máquina
            </label>
            <input 
              value={maquina} 
              onChange={e => setMaquina(e.target.value)} 
              placeholder="Ex: MQ40"
              style={inputStyleLocal}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.slate800, marginBottom: 6, fontFamily: "'Montserrat',sans-serif" }}>
              02 — Senha (Opcional)
            </label>
            <input 
              value={senha} 
              onChange={e => setSenha(e.target.value)} 
              placeholder="Ex: 123456"
              style={inputStyleLocal}
            />
          </div>

          {/* Preview */}
          <div style={{ background: C.royalBg, border: `1px dashed ${C.slate200}`, borderRadius: 6, padding: 12, marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.slate400, marginBottom: 6 }}>PREVIEW (Etiqueta 1)</div>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 18, color: C.royalDark }}>
              {maquina.toUpperCase() || "—"}
            </div>
            {senha && (
              <>
                <div style={{ fontSize: 10, color: C.slate400, margin: "10px 0 6px" }}>PREVIEW (Etiqueta 2)</div>
                <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 18, color: C.royalDark }}>
                  {senha.toUpperCase() || "—"}
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <button 
            onClick={handleImprimir} 
            disabled={status === "printing" || !maquina.trim()}
            style={{ 
              width: "100%", padding: "12px", borderRadius: 6, border: "none", 
              background: status === "success" ? "#22c55e" : C.royalDark, 
              color: C.white, fontWeight: 700, fontSize: 13, cursor: "pointer", 
              opacity: (!maquina.trim() || status === "printing") ? 0.6 : 1,
              transition: "background 0.2s"
            }}
          >
            {status === "printing" && "⏳ Imprimindo..."}
            {status === "success" && "✓ Impresso com Sucesso!"}
            {status === "error" && "↺ Tentar Novamente"}
            {status === "idle" && "▶ Imprimir Etiquetas"}
          </button>

          {status === "error" && (
            <div style={{ marginTop: 12, padding: 10, background: "#fee2e2", color: "#b91c1c", borderRadius: 6, fontSize: 12 }}>
              <strong>Erro:</strong> {erro}<br/>
              <span style={{ fontSize: 11, opacity: 0.8 }}>Verifique se a impressora está ligada e o nome no server.js está correto.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}