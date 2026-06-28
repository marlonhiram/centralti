-- ══════════════════════════════════════════════════════════════
-- Central TI — Migration inicial para Supabase
-- Execute no SQL Editor do Supabase (supabase.com → seu projeto → SQL Editor)
-- ══════════════════════════════════════════════════════════════

-- ─── CHAMADOS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chamados (
  id               SERIAL PRIMARY KEY,
  numero           INTEGER UNIQUE,
  empresa          TEXT,
  departamento     TEXT,
  solicitante      TEXT,
  assunto          TEXT NOT NULL,
  descricao        TEXT,
  categoria        TEXT,
  prioridade       TEXT,
  status           TEXT NOT NULL DEFAULT 'Aberto',
  previsao         TIMESTAMPTZ,
  tempo_gasto      INTEGER,
  resultado        TEXT,
  solucao_aplicada TEXT,
  equipamento_id   INTEGER,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MOVIMENTAÇÕES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movimentacoes (
  id            SERIAL PRIMARY KEY,
  chamado_id    INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  texto         TEXT NOT NULL,
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EQUIPAMENTOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipamentos (
  id           SERIAL PRIMARY KEY,
  codigo       TEXT UNIQUE NOT NULL,
  tipo         TEXT,
  status       TEXT NOT NULL DEFAULT 'Ativo',
  departamento TEXT,
  usuario      TEXT,
  senha        TEXT,
  so           TEXT,
  chave_so     TEXT,
  office       TEXT,
  chave_office TEXT,
  email        TEXT,
  senha_email  TEXT,
  ip           TEXT,
  mac          TEXT,
  obs          TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MANUTENÇÕES DE EQUIPAMENTO ───────────────────────────────
CREATE TABLE IF NOT EXISTS manutencoes_equipamento (
  id             SERIAL PRIMARY KEY,
  equipamento_id INTEGER NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
  tipo           TEXT,
  descricao      TEXT,
  chamado_id     INTEGER REFERENCES chamados(id) ON DELETE SET NULL,
  registrado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ANEXOS DE CHAMADO ────────────────────────────────────────
-- Nota: uploads de arquivo estão desativados na Vercel (disco local não disponível).
-- Mantenha esta tabela para compatibilidade futura com Supabase Storage.
CREATE TABLE IF NOT EXISTS anexos_chamado (
  id             SERIAL PRIMARY KEY,
  chamado_id     INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  nome_original  TEXT NOT NULL,
  caminho        TEXT,
  tipo           TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ESTOQUE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estoque_itens (
  id           SERIAL PRIMARY KEY,
  nome         TEXT NOT NULL,
  tipo         TEXT,
  unidade      TEXT,
  quantidade   INTEGER NOT NULL DEFAULT 0,
  qtd_minima   INTEGER NOT NULL DEFAULT 0,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estoque_requisicoes (
  id            SERIAL PRIMARY KEY,
  chamado_id    INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  status        TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'finalizada')),
  observacao    TEXT,
  finalizado_em TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estoque_requisicao_itens (
  id               SERIAL PRIMARY KEY,
  requisicao_id    INTEGER NOT NULL REFERENCES estoque_requisicoes(id) ON DELETE CASCADE,
  estoque_item_id  INTEGER NOT NULL REFERENCES estoque_itens(id),
  quantidade       INTEGER NOT NULL
);

-- ─── RLS (Row Level Security) ─────────────────────────────────
-- Para portfólio: permite acesso a usuários autenticados via Supabase Auth.
-- Ative o RLS e crie políticas permissivas para authenticated role.

ALTER TABLE chamados               ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE manutencoes_equipamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE anexos_chamado         ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_itens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_requisicoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_requisicao_itens ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados têm acesso total
CREATE POLICY "Autenticados podem tudo" ON chamados                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados podem tudo" ON movimentacoes           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados podem tudo" ON equipamentos            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados podem tudo" ON manutencoes_equipamento FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados podem tudo" ON anexos_chamado          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados podem tudo" ON estoque_itens           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados podem tudo" ON estoque_requisicoes     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados podem tudo" ON estoque_requisicao_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);
