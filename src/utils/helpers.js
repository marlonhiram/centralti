/**
 * @fileoverview Constantes e funções puras de lógica de negócio e formatação.
 * Não dependem de interface visual (React), podendo ser testadas isoladamente.
 */

// ─── CONSTANTES DE DOMÍNIO ────────────────────────────────────────────────────

/** Lista de empresas atendidas pelo sistema. */
export const EMPRESAS = ["Empresa Principal", "Filial"];

/** Lista de departamentos disponíveis para seleção. */
export const DEPARTAMENTOS = [
  "Almoxarifado", "Comercial", "Compras", "Contabilidade", "Diretoria",
  "Elétrica", "Expedição", "Fábrica", "Financeiro", "Jurídico", "Logística",
  "Portaria", "PPCP", "Qualidade", "Recursos Humanos", "Segurança do Trabalho", "TI"
];

/** Categorias de classificação dos chamados. */
export const CATEGORIAS = ["Impressoras", "Suporte ao Usuário", "Manutenções"];

/** Níveis de prioridade disponíveis. */
export const PRIORIDADES = ["Crítica", "Alta", "Média", "Baixa"];

/** Lista de status possíveis para um chamado. */
export const STATUS_LISTA = ["Aberto", "Em Análise", "Fechado", "Sem Solução"];

/**
 * Mapeamento de tempo de SLA (em horas) para cada nível de prioridade.
 * Crítica: 30min (0.5h), Alta: 4h, Média: 48h (2 dias), Baixa: 168h (1 semana).
 */
export const SLA_HORAS = { Crítica: 0.5, Alta: 4, Média: 48, Baixa: 168 };

/** Ordem de classificação das prioridades (menor número = mais urgente). */
export const PRIORIDADE_ORDEM = { Crítica: 1, Alta: 2, Média: 3, Baixa: 4 };

/** Status considerados 'ativos' (em andamento). */
export const STATUS_ATIVOS = ["Aberto", "Em Análise"];

/** Status considerados 'encerrados' (finalizados). */
export const STATUS_ENCERRADOS = ["Fechado", "Sem Solução"];

/** URL base da API backend. */
export const BASE = "http://localhost:3001";

// ─── FUNÇÕES AUXILIARES ────────────────────────────────────────────────────────

/**
 * Calcula a data prevista de atendimento baseada na prioridade.
 * @param {string} prioridade - Nível de prioridade (ex: "Crítica", "Alta").
 * @param {Date|string} [criadoEm=new Date()] - Data de criação do chamado.
 * @returns {Date} Data prevista de conclusão.
 */
export function calcPrevisao(prioridade, criadoEm = new Date()) {
  const horas = SLA_HORAS[prioridade] || 24;
  return new Date(new Date(criadoEm).getTime() + horas * 3600000);
}

/**
 * Determina o status atual do SLA (vencido, atenção, ok).
 * @param {object} chamado - Objeto do chamado contendo status e previsao.
 * @returns {string} 'vencido', 'atencao', 'ok' ou 'encerrado'.
 */
export function slaStatus(chamado) {
  if (STATUS_ENCERRADOS.includes(chamado.status)) return "encerrado";
  if (!chamado.previsao) return "ok";
  
  const diff = new Date(chamado.previsao) - new Date();
  
  if (diff < 0) return "vencido";
  if (diff < 2 * 3600000) return "atencao"; // Alerta de atenção: 2h antes de vencer
  return "ok";
}

/**
 * Gera um label legível para o status do SLA (ex: "Vencido 2h", "5h 10min").
 * @param {object} chamado - Objeto do chamado.
 * @returns {string} Texto formatado para exibição.
 */
export function slaLabel(chamado) {
  if (STATUS_ENCERRADOS.includes(chamado.status)) return "Encerrado";
  if (!chamado.previsao) return "—";

  const diff = new Date(chamado.previsao) - new Date();

  if (diff < 0) {
    const h = Math.abs(Math.floor(diff / 3600000));
    const m = Math.abs(Math.floor((diff % 3600000) / 60000));
    return `Vencido ${h}h${m > 0 ? m + "m" : ""}`;
  }

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

/**
 * Formata timestamp para exibição curta (DD/MM HH:MM).
 * @param {string|Date} ts - Timestamp a ser formatado.
 * @returns {string} Data formatada ou "—" se vazio.
 */
export function fmtDatetime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Formata timestamp para exibição completa (DD/MM/AAAA HH:MM).
 * @param {string|Date} ts - Timestamp a ser formatado.
 * @returns {string} Data formatada ou "—" se vazio.
 */
export function fmtDatetimeFull(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR") + " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}