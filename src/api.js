// ============================================================
// api.js — Cliente da API local (substitui supabase.js)
// Todas as requisições vão para http://localhost:3001
// ============================================================

const BASE = "http://localhost:3001";

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erro na API");
  return json.data;
}

// ─── CHAMADOS ─────────────────────────────────────────────────────────────────
export const api = {
  chamados: {
    listar:  ()       => req("GET",    "/chamados"),
    criar:   (data)   => req("POST",   "/chamados", data),
    atualizar:(id, d) => req("PUT",    `/chamados/${id}`, d),
    excluir: (id)     => req("DELETE", `/chamados/${id}`),
  },

  movimentacoes: {
    listar:  ()       => req("GET",    "/movimentacoes"),
    criar:   (data)   => req("POST",   "/movimentacoes", data),
    excluir: (id)     => req("DELETE", `/movimentacoes/${id}`),
  },

  equipamentos: {
    listar:   ()      => req("GET",    "/equipamentos"),
    criar:    (data)  => req("POST",   "/equipamentos", data),
    atualizar:(id, d) => req("PUT",    `/equipamentos/${id}`, d),
    excluir:  (id)    => req("DELETE", `/equipamentos/${id}`),
  },

  manutencoes: {
    listar:  ()       => req("GET",    "/manutencoes"),
    criar:   (data)   => req("POST",   "/manutencoes", data),
    excluir: (id)     => req("DELETE", `/manutencoes/${id}`),
  },
};
