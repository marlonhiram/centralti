/**
 * @fileoverview Componentes visuais reutilizáveis (Buttons, Badges, Inputs).
 * Contém estilos globais e componentes de interface padronizados.
 */
import React from "react";
import { slaStatus, slaLabel } from "../utils/helpers";

// ─── ESTILOS GLOBAIS (Design Tokens) ──────────────────────────────────────────

/** Objeto de cores do sistema (Design Tokens). */
export const C = {
  royalDark: "#1a3a6b", royalMid: "#2d5aa0", royalLight: "#5b9bd5",
  royalBg: "#f0f4f8", royalGhost: "#e8f0fb", royalPale: "#c8dff5",
  white: "#ffffff", slate800: "#1e293b", slate600: "#475569",
  slate400: "#94a3b8", slate200: "#e2e8f0", slate100: "#f1f5f9",
  green: "#22c55e", greenDark: "#15803d", red: "#dc2626",
  redLight: "#fee2e2", amber: "#d97706", amberLight: "#fef3c7",
};

/** Estilo padrão para campos de input de texto/select. */
export const inputStyle = {
  width: "100%", padding: "7px 10px", border: `1.5px solid ${C.slate200}`,
  borderRadius: 6, fontSize: 13, color: C.slate800, outline: "none",
  fontFamily: "'Nunito',sans-serif", background: C.white, boxSizing: "border-box",
};

// ─── COMPONENTES DE BADGE/STATUS ───────────────────────────────────────────────

/**
 * Exibe um badge colorido indicando a prioridade do chamado.
 * @param {object} props - Propriedades do componente.
 * @param {string} props.p - Nível de prioridade ("Crítica", "Alta", "Média", "Baixa").
 */
export function BadgePrioridade({ p }) {
  const map = { 
    Crítica: { bg: C.redLight, color: "#c53030" }, 
    Alta: { bg: C.amberLight, color: "#b45309" }, 
    Média: { bg: "#dbeafe", color: "#1d4ed8" }, 
    Baixa: { bg: "#dcfce7", color: C.greenDark } 
  };
  const s = map[p] || { bg: C.slate100, color: C.slate600 };
  return (
    <span style={{ 
      background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, 
      padding: "2px 7px", borderRadius: 4, fontFamily: "'Montserrat',sans-serif", 
      whiteSpace: "nowrap" 
    }}>
      {p}
    </span>
  );
}

/**
 * Exibe um botão/badge clicável com o status atual do chamado.
 * @param {object} props - Propriedades do componente.
 * @param {string} props.s - Status do chamado ("Aberto", "Fechado", etc).
 * @param {function} props.onClick - Função chamada ao clicar no badge.
 */
export function BadgeStatus({ s, onClick }) {
  const map = { 
    "Aberto": { bg: C.royalGhost, color: C.royalDark }, 
    "Em Análise": { bg: C.amberLight, color: "#b45309" }, 
    "Fechado": { bg: "#dcfce7", color: C.greenDark }, 
    "Sem Solução": { bg: C.redLight, color: "#c53030" } 
  };
  const st = map[s] || { bg: C.slate100, color: C.slate600 };
  return (
    <button 
      onClick={onClick} 
      style={{ 
        background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, 
        padding: "4px 9px", borderRadius: 5, fontFamily: "'Montserrat',sans-serif", 
        border: "none", cursor: "pointer", display: "inline-flex", 
        alignItems: "center", gap: 3, whiteSpace: "nowrap" 
      }}
    >
      {s} <span style={{ fontSize: 10 }}>▾</span>
    </button>
  );
}

/**
 * Exibe o indicador visual do SLA (Vencido, Atenção, OK).
 * @param {object} props - Propriedades do componente.
 * @param {object} props.chamado - Objeto completo do chamado para análise.
 */
export function SLAPill({ chamado }) {
  const st = slaStatus(chamado);
  const label = slaLabel(chamado);
  const map = { 
    vencido: { bg: C.redLight, color: C.red }, 
    atencao: { bg: C.amberLight, color: C.amber }, 
    ok: { bg: "#dcfce7", color: C.greenDark }, 
    encerrado: { bg: C.slate100, color: C.slate400 } 
  };
  const s = map[st] || map.ok;
  return (
    <span style={{ 
      background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, 
      padding: "3px 8px", borderRadius: 4, fontFamily: "'Montserrat',sans-serif", 
      whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 3 
    }}>
      {st === "vencido" && "⚠ "}{label}
    </span>
  );
}

// ─── COMPONENTES DE FORMULÁRIO ────────────────────────────────────────────────

/**
 * Wrapper padrão para campos de formulário (Label + Input).
 * @param {object} props - Propriedades do componente.
 * @param {string} props.label - Texto do label.
 * @param {React.ReactNode} props.children - Campo de input/select.
 */
export function Field({ label, children }) {
  return (
    <div>
      <div style={{ 
        fontSize: 11, fontWeight: 700, color: C.slate800, textTransform: "uppercase", 
        letterSpacing: ".06em", fontFamily: "'Montserrat',sans-serif", marginBottom: 4 
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

/**
 * Botão padrão do sistema.
 * @param {object} props - Propriedades do componente.
 * @param {React.ReactNode} props.children - Conteúdo do botão.
 * @param {function} props.onClick - Função de clique.
 * @param {boolean} [props.primary] - Se true, exibe estilo primário (azul escuro).
 */
export function Btn({ children, onClick, primary, style: extraStyle }) {
  return (
    <button 
      onClick={onClick} 
      style={{ 
        padding: "6px 13px", borderRadius: 6, 
        border: primary ? `1px solid ${C.royalDark}` : `1px solid ${C.slate200}`, 
        background: primary ? C.royalDark : C.white, 
        color: primary ? C.white : C.slate600, 
        fontSize: 12, fontWeight: 600, cursor: "pointer", 
        fontFamily: "'Nunito',sans-serif", whiteSpace: "nowrap", ...extraStyle 
      }}
    >
      {children}
    </button>
  );
}

/**
 * Componente de filtro por intervalo de datas.
 * @param {object} props - Propriedades do componente.
 * @param {string} props.de - Data inicial.
 * @param {string} props.ate - Data final.
 * @param {function} props.onChange - Callback ao alterar datas (key, value).
 */
export function FiltroDatas({ de, ate, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 11, color: C.slate600, fontWeight: 600 }}>Período:</span>
      <input 
        type="date" value={de} 
        onChange={e => onChange("de", e.target.value)} 
        style={{ ...inputStyle, width: 130, padding: "4px 8px" }} 
      />
      <span style={{ fontSize: 11, color: C.slate400 }}>até</span>
      <input 
        type="date" value={ate} 
        onChange={e => onChange("ate", e.target.value)} 
        style={{ ...inputStyle, width: 130, padding: "4px 8px" }} 
      />
    </div>
  );
}