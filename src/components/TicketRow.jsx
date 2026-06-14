/**
 * @fileoverview Componente que representa uma linha na lista de chamados.
 * Exibe informações resumidas, SLA e permite interações rápidas.
 */
import React from "react";
import { slaStatus, fmtDatetime } from "../utils/helpers";
import { C, BadgeStatus, SLAPill, BadgePrioridade } from "./UI";

/**
 * Componente de linha de chamado para listagem.
 * @param {object} props - Propriedades do componente.
 * @param {object} props.chamado - Objeto de dados do chamado.
 * @param {Array} props.movimentacoes - Lista de movimentações para contagem.
 * @param {function} props.onOpen - Callback ao clicar para abrir detalhes.
 * @param {function} props.onStatusChange - Callback ao clicar no badge de status.
 */
export default function TicketRow({ chamado, movimentacoes, onOpen, onStatusChange }) {
  const st = slaStatus(chamado);
  const movs = movimentacoes.filter(m => m.chamado_id === chamado.id);
  
  // Define cor da borda esquerda baseada no SLA
  const borderColor = st === "vencido" ? C.red : st === "atencao" ? "#f59e0b" : "transparent";
  
  // Ícones e cores baseadas na prioridade
  const iconMap = { 
    Crítica: { bg: C.redLight, color: C.red, icon: "🔥" }, 
    Alta: { bg: C.amberLight, color: C.amber, icon: "⚡" }, 
    Média: { bg: "#dbeafe", color: "#1d4ed8", icon: "💻" }, 
    Baixa: { bg: "#dcfce7", color: C.greenDark, icon: "🖨" } 
  };
  const ic = iconMap[chamado.prioridade] || iconMap.Média;

  return (
    <div 
      onClick={() => onOpen(chamado)} 
      style={{ 
        borderBottom: `1px solid ${C.slate100}`, cursor: "pointer", padding: "0 16px", 
        transition: "background .12s", borderLeft: `3px solid ${borderColor}` 
      }} 
      onMouseEnter={e => e.currentTarget.style.background = "#fafbfe"} 
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {/* Linha Principal */}
      <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 130px 130px 96px 110px 100px", alignItems: "center", padding: "9px 0 3px", gap: 0 }}>
        <div onClick={e => e.stopPropagation()}>
          <div style={{ width: 14, height: 14, border: `1.5px solid ${C.slate200}`, borderRadius: 3, cursor: "pointer" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, paddingRight: 12 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: ic.bg, color: ic.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>{ic.icon}</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.slate800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chamado.assunto}</span>
        </div>
        <div style={{ fontSize: 12, color: C.slate600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 8 }}>{chamado.departamento}</div>
        <div style={{ fontSize: 12, color: C.slate600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 8 }}>{chamado.categoria}</div>
        <div style={{ fontSize: 11, color: C.slate400 }}>{fmtDatetime(chamado.criado_em)}</div>
        <div><SLAPill chamado={chamado} /></div>
        <div style={{ display: "flex", justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
          <BadgeStatus s={chamado.status} onClick={() => onStatusChange(chamado)} />
        </div>
      </div>

      {/* Linha Secundária (Metadados) */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "2px 0 8px 35px", flexWrap: "wrap" }}>
        {[{ icon: "🏢", text: chamado.empresa }, { icon: "👤", text: chamado.solicitante }, { icon: "💬", text: movs.length > 0 ? `${movs.length} movimentação${movs.length > 1 ? "ões" : ""}` : "Sem movimentações" }, { icon: "📅", text: `Previsão: ${fmtDatetime(chamado.previsao)}` }, ...(chamado.tem_anexo ? [{ icon: "📎", text: "Com anexos" }] : [])].map((item, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.slate400, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 11 }}>{item.icon}</span> {item.text}
          </span>
        ))}
        <BadgePrioridade p={chamado.prioridade} />
      </div>
    </div>
  );
}