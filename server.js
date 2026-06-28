// ============================================================
// Central de Chamados TI
// API Local — server.js
// Roda em: http://localhost:3001
// ============================================================

require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const cors    = require("cors");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

const app  = express();
const PORT = process.env.API_PORT || 3001;

// ─── CONEXÃO COM O BANCO ──────────────────────────────────────────────────────
// Em produção (Vercel), usa DATABASE_URL do Supabase (connection pooler).
// Em desenvolvimento local, usa as variáveis individuais.
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.DB_HOST     || "localhost",
        port:     parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME     || "chamados_ti",
        user:     process.env.DB_USER     || "postgres",
        password: process.env.DB_PASSWORD || "",
      }
);

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
const origensPermitidas = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:5173"];
app.use(cors({ origin: origensPermitidas }));
app.use(express.json());

// Testa a conexão ao subir
pool.connect((err) => {
  if (err) {
    console.error("❌  Erro ao conectar no banco:", err.message);
  } else {
    console.log(`✅  Conectado ao PostgreSQL — banco: ${process.env.DB_NAME || "chamados_ti"}`);
  }
});

// ─── CONFIGURAÇÃO DE UPLOAD ───────────────────────────────────────────────────

/**
 * Configura o multer para salvar arquivos em C:\chamados\uploads\{chamado_id}\.
 * O diretório é criado automaticamente se não existir.
 */
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, String(req.params.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Prefixo timestamp evita colisão de nomes
    const nome = `${Date.now()}-${file.originalname}`;
    cb(null, nome);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB por arquivo
  fileFilter: (req, file, cb) => {
    const permitidos = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
    if (permitidos.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Tipo de arquivo não permitido. Use JPG, PNG, GIF ou PDF."));
  },
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const ok  = (res, data)         => res.json({ ok: true, data });
const err = (res, e, status=500) => res.status(status).json({ ok: false, error: e.message || e });

// ============================================================
// CHAMADOS
// ============================================================

// GET /chamados
app.get("/chamados", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*,
        EXISTS (
          SELECT 1 FROM anexos_chamado a WHERE a.chamado_id = c.id
        ) AS tem_anexo
      FROM chamados c
      ORDER BY c.criado_em DESC
    `);
    ok(res, rows);
  } catch (e) { err(res, e); }
});

// POST /chamados
app.post("/chamados", async (req, res) => {
  try {
    const b = req.body;
    // Próximo número
    const { rows: cnt } = await pool.query("SELECT COUNT(*) FROM chamados");
    const numero = parseInt(cnt[0].count) + 1;

    const { rows } = await pool.query(
      `INSERT INTO chamados
        (empresa, departamento, solicitante, assunto, descricao,
         categoria, prioridade, status, previsao, numero)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [b.empresa, b.departamento, b.solicitante, b.assunto, b.descricao||null,
       b.categoria, b.prioridade, b.status||"Aberto", b.previsao||null, numero]
    );
    ok(res, rows[0]);
  } catch (e) { err(res, e); }
});

// PUT /chamados/:id
app.put("/chamados/:id", async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await pool.query(
      `UPDATE chamados SET
        empresa=$1, departamento=$2, solicitante=$3, assunto=$4,
        descricao=$5, categoria=$6, prioridade=$7, status=$8,
        previsao=$9, tempo_gasto=$10, resultado=$11,
        solucao_aplicada=$12, atualizado_em=NOW()
       WHERE id=$13
       RETURNING *`,
      [b.empresa, b.departamento, b.solicitante, b.assunto, b.descricao||null,
       b.categoria, b.prioridade, b.status, b.previsao||null,
       b.tempo_gasto||null, b.resultado||null, b.solucao_aplicada||null,
       req.params.id]
    );
    ok(res, rows[0]);
  } catch (e) { err(res, e); }
});

// DELETE /chamados/:id
app.delete("/chamados/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM chamados WHERE id=$1", [req.params.id]);
    ok(res, { deleted: req.params.id });
  } catch (e) { err(res, e); }
});

// ============================================================
// MOVIMENTAÇÕES
// ============================================================

// GET /movimentacoes?chamado_id=xxx
app.get("/movimentacoes", async (req, res) => {
  try {
    const { chamado_id } = req.query;
    const query = chamado_id
      ? "SELECT * FROM movimentacoes WHERE chamado_id=$1 ORDER BY registrado_em DESC"
      : "SELECT * FROM movimentacoes ORDER BY registrado_em DESC";
    const params = chamado_id ? [chamado_id] : [];
    const { rows } = await pool.query(query, params);
    ok(res, rows);
  } catch (e) { err(res, e); }
});

// POST /movimentacoes
app.post("/movimentacoes", async (req, res) => {
  try {
    const { chamado_id, texto } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO movimentacoes (chamado_id, texto) VALUES ($1,$2) RETURNING *",
      [chamado_id, texto]
    );
    ok(res, rows[0]);
  } catch (e) { err(res, e); }
});

// DELETE /movimentacoes/:id
app.delete("/movimentacoes/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM movimentacoes WHERE id=$1", [req.params.id]);
    ok(res, { deleted: req.params.id });
  } catch (e) { err(res, e); }
});

// ============================================================
// EQUIPAMENTOS
// ============================================================

// GET /equipamentos
app.get("/equipamentos", async (req, res) => {
  try {
    const { busca } = req.query;
    // Com filtro de busca: retorna até 20 resultados por código ou usuário
    if (busca) {
      const { rows } = await pool.query(
        `SELECT id, codigo, tipo, usuario, status, departamento
         FROM equipamentos
         WHERE codigo ILIKE $1 OR usuario ILIKE $1
         ORDER BY codigo
         LIMIT 20`,
        [`%${busca}%`]
      );
      return ok(res, rows);
    }
    // Sem filtro: retorna todos (usado pelo Inventário)
    const { rows } = await pool.query(
      "SELECT * FROM equipamentos ORDER BY codigo"
    );
    ok(res, rows);
  } catch (e) { err(res, e); }
});

// POST /equipamentos
app.post("/equipamentos", async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await pool.query(
      `INSERT INTO equipamentos
        (codigo, tipo, status, departamento, usuario, senha,
         so, chave_so, office, chave_office,
         email, senha_email, ip, mac, obs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [b.codigo, b.tipo, b.status||"Ativo", b.departamento||null,
       b.usuario||null, b.senha||null, b.so||null, b.chave_so||null,
       b.office||null, b.chave_office||null, b.email||null,
       b.senha_email||null, b.ip||null, b.mac||null, b.obs||null]
    );
    ok(res, rows[0]);
  } catch (e) { err(res, e); }
});

// PUT /equipamentos/:id
app.put("/equipamentos/:id", async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await pool.query(
      `UPDATE equipamentos SET
        codigo=$1, tipo=$2, status=$3, departamento=$4,
        usuario=$5, senha=$6, so=$7, chave_so=$8,
        office=$9, chave_office=$10, email=$11, senha_email=$12,
        ip=$13, mac=$14, obs=$15, atualizado_em=NOW()
       WHERE id=$16
       RETURNING *`,
      [b.codigo, b.tipo, b.status, b.departamento||null,
       b.usuario||null, b.senha||null, b.so||null, b.chave_so||null,
       b.office||null, b.chave_office||null, b.email||null,
       b.senha_email||null, b.ip||null, b.mac||null, b.obs||null,
       req.params.id]
    );
    ok(res, rows[0]);
  } catch (e) { err(res, e); }
});

// DELETE /equipamentos/:id
app.delete("/equipamentos/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM equipamentos WHERE id=$1", [req.params.id]);
    ok(res, { deleted: req.params.id });
  } catch (e) { err(res, e); }
});

// ============================================================
// MANUTENÇÕES DE EQUIPAMENTO
// ============================================================

// GET /manutencoes?equipamento_id=xxx
app.get("/manutencoes", async (req, res) => {
  try {
    const { equipamento_id } = req.query;
    const query = equipamento_id
      ? "SELECT * FROM manutencoes_equipamento WHERE equipamento_id=$1 ORDER BY registrado_em DESC"
      : "SELECT * FROM manutencoes_equipamento ORDER BY registrado_em DESC";
    const params = equipamento_id ? [equipamento_id] : [];
    const { rows } = await pool.query(query, params);
    ok(res, rows);
  } catch (e) { err(res, e); }
});

// POST /manutencoes
app.post("/manutencoes", async (req, res) => {
  try {
    const { equipamento_id, tipo, descricao, chamado_id } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO manutencoes_equipamento
        (equipamento_id, tipo, descricao, chamado_id)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [equipamento_id, tipo, descricao, chamado_id||null]
    );
    ok(res, rows[0]);
  } catch (e) { err(res, e); }
});

// DELETE /manutencoes/:id
app.delete("/manutencoes/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM manutencoes_equipamento WHERE id=$1", [req.params.id]
    );
    ok(res, { deleted: req.params.id });
  } catch (e) { err(res, e); }
});

// ══════════════════════════════════════════════════════════════
//  ROTAS DE RELATÓRIOS — adicionar no server.js
//  Cole este bloco ANTES da linha: app.listen(3001, ...)
// ══════════════════════════════════════════════════════════════

// ── Listagem de Chamados por status + período ─────────────────
app.get("/relatorios/chamados/listagem", async (req, res) => {
  try {
    const { status, de_inicio, de_fim, departamento, categoria, prioridade } = req.query;

    let where = [];
    let params = [];
    let i = 1;

    if (status)      { where.push(`c.status = $${i++}`);       params.push(status); }
    if (de_inicio)   { where.push(`c.criado_em >= $${i++}`);   params.push(de_inicio); }
    if (de_fim)      { where.push(`c.criado_em < ($${i++}::date + interval '1 day')`); params.push(de_fim); }
    if (departamento){ where.push(`c.departamento = $${i++}`);  params.push(departamento); }
    if (categoria)   { where.push(`c.categoria = $${i++}`);     params.push(categoria); }
    if (prioridade)  { where.push(`c.prioridade = $${i++}`);    params.push(prioridade); }

    const sql = `
      SELECT c.id, c.numero, c.empresa, c.departamento, c.solicitante,
             c.assunto, c.descricao, c.categoria, c.prioridade, c.status,
             c.previsao, c.tempo_gasto, c.resultado,
             c.criado_em, c.atualizado_em
      FROM chamados c
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY c.criado_em DESC
    `;
    const { rows } = await pool.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Busca de chamados por texto (número, solicitante, assunto) ─
app.get("/relatorios/chamados/busca", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ ok: true, data: [] });

    const num = parseInt(q);
    const sql = `
      SELECT id, numero, solicitante, assunto, status, criado_em
      FROM chamados
      WHERE ($1::int IS NOT NULL AND numero = $1::int)
         OR solicitante ILIKE $2
         OR assunto ILIKE $2
      ORDER BY criado_em DESC
      LIMIT 20
    `;
    const { rows } = await pool.query(sql, [isNaN(num) ? null : num, `%${q}%`]);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Detalhe completo de um chamado + movimentações ────────────
app.get("/relatorios/chamados/:id/detalhado", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: [chamado] } = await pool.query(
      `SELECT * FROM chamados WHERE id = $1`, [id]
    );
    if (!chamado) return res.status(404).json({ ok: false, error: "Chamado não encontrado" });

    const { rows: movs } = await pool.query(
      `SELECT * FROM movimentacoes WHERE chamado_id = $1 ORDER BY registrado_em ASC`, [id]
    );

    // Inclui anexos para permitir geração da segunda folha no PDF
    const { rows: anexos } = await pool.query(
      `SELECT id, nome_original, tipo FROM anexos_chamado WHERE chamado_id = $1 ORDER BY criado_em ASC`, [id]
    );

    res.json({ ok: true, data: { ...chamado, movimentacoes: movs, anexos } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Inventário de Equipamentos com filtros ────────────────────
app.get("/relatorios/equipamentos/inventario", async (req, res) => {
  try {
    const { tipo, status, departamento, de_inicio, de_fim } = req.query;

    let where = [];
    let params = [];
    let i = 1;

    if (tipo)        { where.push(`tipo = $${i++}`);        params.push(tipo); }
    if (status)      { where.push(`status = $${i++}`);      params.push(status); }
    if (departamento){ where.push(`departamento = $${i++}`);params.push(departamento); }
    if (de_inicio)   { where.push(`criado_em >= $${i++}`);  params.push(de_inicio); }
    if (de_fim)      { where.push(`criado_em < ($${i++}::date + interval '1 day')`); params.push(de_fim); }

    const sql = `
      SELECT id, codigo, tipo, status, departamento, usuario,
             ip, mac, so, chave_so, office, chave_office,
             email, senha_email, obs, criado_em
      FROM equipamentos
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY codigo ASC
    `;
    const { rows } = await pool.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Busca de equipamento por texto ────────────────────────────
app.get("/relatorios/equipamentos/busca", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ ok: true, data: [] });

    const sql = `
      SELECT id, codigo, tipo, status, departamento, usuario, ip, mac
      FROM equipamentos
      WHERE codigo ILIKE $1
         OR usuario ILIKE $1
         OR ip ILIKE $1
         OR mac ILIKE $1
      ORDER BY codigo ASC
      LIMIT 20
    `;
    const { rows } = await pool.query(sql, [`%${q}%`]);
    res.json({ ok: true, data: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Ficha completa de equipamento + histórico manutenções ─────
app.get("/relatorios/equipamentos/:id/ficha", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: [eq] } = await pool.query(
      `SELECT * FROM equipamentos WHERE id = $1`, [id]
    );
    if (!eq) return res.status(404).json({ ok: false, error: "Equipamento não encontrado" });

    const { rows: mans } = await pool.query(`
      SELECT m.*, c.numero AS chamado_numero
      FROM manutencoes_equipamento m
      LEFT JOIN chamados c ON c.id = m.chamado_id
      WHERE m.equipamento_id = $1
      ORDER BY m.registrado_em DESC
    `, [id]);

    res.json({ ok: true, data: { ...eq, manutencoes: mans } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================
// ANEXOS DE CHAMADO
// ============================================================

// POST /chamados/:id/anexos — upload de um ou mais arquivos
app.post("/chamados/:id/anexos", upload.array("arquivos", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ ok: false, error: "Nenhum arquivo enviado." });
    }

    const chamadoId = req.params.id;
    const inseridos = [];

    for (const file of req.files) {
      const { rows } = await pool.query(
        `INSERT INTO anexos_chamado (chamado_id, nome_original, caminho, tipo)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [chamadoId, file.originalname, file.path, file.mimetype]
      );
      inseridos.push(rows[0]);
    }

    ok(res, inseridos);
  } catch (e) { err(res, e); }
});

// GET /chamados/:id/anexos — listar anexos de um chamado
app.get("/chamados/:id/anexos", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM anexos_chamado WHERE chamado_id = $1 ORDER BY criado_em ASC",
      [req.params.id]
    );
    ok(res, rows);
  } catch (e) { err(res, e); }
});

// GET /anexos/:id/arquivo — serve o arquivo físico para o browser
app.get("/anexos/:id/arquivo", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM anexos_chamado WHERE id = $1", [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, error: "Anexo não encontrado." });

    // Path absoluto do Windows — não usar { root } pois causa concatenação inválida
    if (!fs.existsSync(rows[0].caminho)) {
      return res.status(404).json({ ok: false, error: "Arquivo não encontrado no disco." });
    }
    res.sendFile(rows[0].caminho);
  } catch (e) { err(res, e); }
});

// DELETE /anexos/:id — remove registro do banco e arquivo do disco
app.delete("/anexos/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM anexos_chamado WHERE id = $1", [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ ok: false, error: "Anexo não encontrado." });

    // Remove arquivo do disco (falha silenciosa se já não existir)
    fs.unlink(rows[0].caminho, () => {});

    await pool.query("DELETE FROM anexos_chamado WHERE id = $1", [req.params.id]);
    ok(res, { deleted: req.params.id });
  } catch (e) { err(res, e); }
});

// ─── ROTA DE IMPRESSÃO DE ETIQUETAS ───────────────────────────────────────────

// ─── ROTA DE IMPRESSÃO DE ETIQUETAS ───────────────────────────────────────
app.post('/imprimir', async (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ ok: false, error: 'Texto vazio' });

  // Configure o nome da impressora no arquivo .env (variável PRINTER_NAME)
  // Deve ser exatamente o nome que aparece no Gerenciador de Dispositivos do Windows.
  const printerName = process.env.PRINTER_NAME || "Nome da sua impressora aqui";
  
  const psFile = join('C:\\Windows\\Temp', `print_${Date.now()}.ps1`);

  // Script PowerShell: Cria imagem 350x113 pixels, centraliza o texto e imprime
  const psScript = `
Add-Type -AssemblyName System.Drawing
 $bmp = New-Object System.Drawing.Bitmap(350, 113)
 $g = [System.Drawing.Graphics]::FromImage($bmp)
 $g.Clear([System.Drawing.Color]::White)

# Configura fonte (Arial, Negrito, Tamanho adequado para etiqueta)
 $font = New-Object System.Drawing.Font("Arial", 22, [System.Drawing.FontStyle]::Bold)
 $brush = [System.Drawing.Brushes]::Black

# Centralizar texto
 $format = New-Object System.Drawing.StringFormat
 $format.Alignment = [System.Drawing.StringAlignment]::Center
 $format.LineAlignment = [System.Drawing.StringAlignment]::Center
 $rect = New-Object System.Drawing.RectangleF(0, 0, 350, 113)
 $g.DrawString("${texto.toUpperCase()}", $font, $brush, $rect, $format)
 $g.Dispose()

# Enviar para impressora
 $pd = New-Object System.Drawing.Printing.PrintDocument
 $pd.PrinterSettings.PrinterName = "${printerName}"
 $bmp_ref = $bmp
 $pd.add_PrintPage({ $_.Graphics.DrawImage($bmp_ref, 0, 0) })
 $pd.Print()
 $bmp.Dispose()
  `.trim();

  try {
    await writeFile(psFile, psScript, 'utf8');
    
    await new Promise((resolve, reject) => {
      exec(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, (err, stdout, stderr) => {
        // Tenta apagar o arquivo temporário após a execução
        unlink(psFile).catch(() => {}); 
        if (err) reject(new Error(stderr || err.message));
        else resolve();
      });
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("Erro ao imprimir:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================
// DASHBOARD — Métricas
// ============================================================

/**
 * Calcula o intervalo de datas com base no período solicitado.
 * @param {string} periodo - 'dia' | 'semana' | 'mes' | 'ano'
 * @returns {{ inicio: string, fim: string }} Datas no formato ISO
 */
function intervaloPeriodo(periodo) {
  const agora = new Date();
  let inicio;
  switch (periodo) {
    case "dia":
      inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      break;
    case "semana": {
      const diaSemana = agora.getDay(); // 0=dom
      inicio = new Date(agora);
      inicio.setDate(agora.getDate() - diaSemana);
      inicio.setHours(0, 0, 0, 0);
      break;
    }
    case "ano":
      inicio = new Date(agora.getFullYear(), 0, 1);
      break;
    case "mes":
    default:
      inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  }
  return { inicio: inicio.toISOString(), fim: agora.toISOString() };
}

// GET /dashboard/resumo?periodo=dia|semana|mes|ano
// Retorna: abertos, fechados e sem_solucao por dia/semana/mes/ano no período
app.get("/dashboard/resumo", async (req, res) => {
  try {
    const { inicio, fim } = intervaloPeriodo(req.query.periodo);

    // Agrupamento por data truncada (dia) dentro do período
    const { rows } = await pool.query(`
      SELECT
        DATE_TRUNC('day', criado_em)::date AS data,
        COUNT(*) FILTER (WHERE status NOT IN ('Fechado','Sem Solução')) AS abertos,
        COUNT(*) FILTER (WHERE status = 'Fechado')                      AS fechados,
        COUNT(*) FILTER (WHERE status = 'Sem Solução')                  AS sem_solucao
      FROM chamados
      WHERE criado_em >= $1 AND criado_em <= $2
      GROUP BY 1
      ORDER BY 1 ASC
    `, [inicio, fim]);

    ok(res, rows);
  } catch (e) { err(res, e); }
});

// GET /dashboard/sla?periodo=dia|semana|mes|ano
// Retorna: total, cumpridos e violados no período
app.get("/dashboard/sla", async (req, res) => {
  try {
    const { inicio, fim } = intervaloPeriodo(req.query.periodo);

    // SLA violado = atualizado_em > previsao (para encerrados) 
    // ou NOW() > previsao (para abertos)
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                                        AS total,
        COUNT(*) FILTER (
          WHERE previsao IS NOT NULL
            AND CASE
              WHEN status IN ('Fechado','Sem Solução') THEN atualizado_em <= previsao
              ELSE NOW() <= previsao
            END
        )                                                               AS cumpridos,
        COUNT(*) FILTER (
          WHERE previsao IS NOT NULL
            AND CASE
              WHEN status IN ('Fechado','Sem Solução') THEN atualizado_em > previsao
              ELSE NOW() > previsao
            END
        )                                                               AS violados,
        COUNT(*) FILTER (WHERE previsao IS NULL)                        AS sem_previsao
      FROM chamados
      WHERE criado_em >= $1 AND criado_em <= $2
    `, [inicio, fim]);

    ok(res, rows[0]);
  } catch (e) { err(res, e); }
});

// GET /dashboard/por-departamento?periodo=dia|semana|mes|ano
// Retorna: contagem de chamados agrupada por departamento
app.get("/dashboard/por-departamento", async (req, res) => {
  try {
    const { inicio, fim } = intervaloPeriodo(req.query.periodo);

    const { rows } = await pool.query(`
      SELECT
        COALESCE(departamento, 'Não informado') AS departamento,
        COUNT(*)                                AS total
      FROM chamados
      WHERE criado_em >= $1 AND criado_em <= $2
      GROUP BY 1
      ORDER BY 2 DESC
    `, [inicio, fim]);

    ok(res, rows);
  } catch (e) { err(res, e); }
});

// GET /dashboard/tempo-medio?periodo=dia|semana|mes|ano
// Retorna: tempo médio de resolução (min) por prioridade, apenas chamados fechados
app.get("/dashboard/tempo-medio", async (req, res) => {
  try {
    const { inicio, fim } = intervaloPeriodo(req.query.periodo);

    const { rows } = await pool.query(`
      SELECT
        prioridade,
        ROUND(AVG(tempo_gasto))            AS media_minutos,
        COUNT(*)                           AS total_fechados
      FROM chamados
      WHERE criado_em >= $1
        AND criado_em <= $2
        AND status IN ('Fechado','Sem Solução')
        AND tempo_gasto IS NOT NULL
      GROUP BY prioridade
      ORDER BY
        CASE prioridade
          WHEN 'Crítica' THEN 1
          WHEN 'Alta'    THEN 2
          WHEN 'Média'   THEN 3
          WHEN 'Baixa'   THEN 4
          ELSE 5
        END
    `, [inicio, fim]);

    ok(res, rows);
  } catch (e) { err(res, e); }
});

// GET /equipamentos/:id/chamados — chamados vinculados ao equipamento
app.get("/equipamentos/:id/chamados", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, numero, assunto, status, prioridade, criado_em
       FROM chamados
       WHERE equipamento_id = $1
       ORDER BY criado_em DESC`,
      [req.params.id]
    );
    ok(res, rows);
  } catch (e) { err(res, e); }
});

// ============================================================
// ESTOQUE
// ============================================================

// GET /estoque/itens — lista todos os produtos
app.get("/estoque/itens", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM estoque_itens ORDER BY name ASC`
    );
    ok(res, rows);
  } catch (e) { err(res, e); }
});

// POST /estoque/itens - Cadastra novo produto
app.post("/estoque/itens", async (req, res) => {
  try{
    const { nome, tipo, unidade, qunatidade, qtd_minima } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO estoque_itens (nome, tipo, unidade, quantidade, qtd_minima)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
       [nome, tipo, unidade, quantidade || 0, qtd_minima || 0]
    );
    ok(res, rows[0]);
  } catch (e) { err(res, e); }
});

// PUT /estoque/itens/:id - edita produto
app.put("/estoque/itens/:id", async (req, res) => {
  try{
  const { nome, tipo, unidade, qtd_minima } = req.body;
  const quantidade = req.body.quantidade ?? 0;
  const { rows } = await pool.query(
    `UPDATE estoque_itens SET
      nome=$1, tipo=$2, unidade=$3, quantidade=$4, qtd_minima=$5,
      atualizado_em=NOW()
    WHERE id=$6 RETURNING *`,
    [nome, tipo, unidade, Number(quantidade), Number(qtd_minima) || 0, req.params.id]
  );
  ok(res, rows[0]);
  } catch (e) { err(res, e); }
});

//DELETE /estoque/itens/:id - remove produto(só se sem movimentacoes)
app.delete("/estoque/itens/:id", async (req, res) => {
  try{
    const { rows: refs } = await pool.query(
      `SELECT 1 FROM estoque_requisicao_itens WHERE estoque_item_id=$1 LIMIT 1`,
      [req.params.id]
    );
    if (refs.length > 0) {
      return res.status(400).json({ ok: false, error: "Produto possui requisições vinculadas e não pode ser removido."});
    }
    await pool.query("DELETE FROM estoque_itens WHERE id=$1", [req.params.id]);
    ok(res, {deleted: req.params.id });
  } catch (e) { err(res, e); }
});

// GET /estoque/requisicoes - lista requisições com dados do chamado
app.get("/estoque/requisicoes", async (req, res) => {
  try{
    const { rows } = await pool.query(`
      SELECT r.*,
        c.numero AS chamado_numero,
        c.assunto AS chamado_assunto,
        c.status AS chamado_status
      FROM estoque_requisicoes r
      JOIN chamados c ON c.id = r.chamado_id
      ORDER BY r.criado_em DESC
      `);
      // Busca itens de cada requisicao
      const ids = rows.map(r => r.id);
      let itens = [];
      if (ids.length > 0) {
        const { rows: ri } = await pool.query(`
          SELECT ri.*, ei.nome, ei.tipo, ei.unidade
          FROM estoque_requisicao_itens ri
          JOIN estoque_itens ei ON ei.id = ri.estoque_item_id
          WHERE ri.requisicao_id = ANY($1)
          `, [ids]);
          itens = ri;
      }
      // Agrupa itens por requisicao
      const resultado = rows.map(r => ({
        ...r,
        itens: itens.filter(i => i.requisicao_id == r.id)
      }));
      ok(res, resultado);
  } catch (e) {err(res, e); }
});

// POST /estoque/requisicoes - cria requisicao com itens
app.post("/estoque/requisicoes", async (req, res) => {
  const client = await pool.connect();
  try{
    await client.query("BEGIN");
    const { chamado_id, tipo, itens } = req.body;

    if (!itens || itens.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, error: "Informe ao menos um produto."});
    }

    //Cria cabeçalho
    const { rows: [req_] } = await Client.query(
      `INSERT INTO estoque_requisicoes (chamado_id, tipo, status)
       VALUES ($1, $2, 'pendente') RETURNING *`,
       [chamado_id, tipo]
    );

    // insere linhas
    for (const item of itens) {
      await ClientRequest.query(
      `INSERT INTO estoque_requisicao_itens (requisicao_id, estoque_item_id, quantidade)
       VALUES ($1, $2, $3)`
       [req_.id, item.estoque_item_id, item.quantidade]
      );
    }

    await client.query("COMMIT");
    ok(res, req_);
  } catch (e) {
    await client.query("ROLLBACK");
    err(res, e);
  } finally {
    client.release();
  }
});

// POST /estoque/requisicoes/:id/finalizar - finaliza a requisicao de entrada
//Acrescenta quantidade no estoque e marca como finalizada 
app.post("/estoque/requisicoes/:id/finalizar", async (req, res) =>{
  const client = await pool.connect();
  try{
    await client.query("BEGIN");
    const { observacao } = req.body;

    const { rows: [req_]} = await client.query(
      `SELECT * FROM estoque_requisicoes WHERE id=$1`, [req.params.id]
    );
    if(!req_) {await client.query("ROLLBACK"); return res.status(404).json({ ok: false, error: "Requisição não encontrada."}); }
    if ( req_.tipo !== "entrada") { await client.query("ROLLBACK"); return res.status(400).json({ ok: false, error: "Apenas requisições de entrada podem ser finalizadas por aqui."}); }
    //Busca itens
    const { rows: itens } = await client.query(
      `SELECT * FROM estoque_requisicao_itens WHERE requisicao_id=$1`, [req.params.id]
    );

    // Acrescenta no estoque
    for (const item of itens) {
      await client.query(
        `UPDATE estoque_itens SET quantidade = quantidade + $1, atualizado_em=NOW() WHERE id=$2`,
        [item.quantidade, item.estoque_item_id]
      );
    }

    //Finaliza requisicao
    const { rows: [finalizada]} = await client.query(
      `UPDATE estoque_requisicoes SET status='finalizada', observacao=$1, finalizado_em=NOW()
       WHERE id=$2 RETURNING`
       [observacao || null, req.params.id]
    );

    await client.query("COMMIT");
    ok(res, finalizada);
  } catch (e) {
    await client.query("ROLLBACK");
    err(res, e);
  } finally {
    client.release();
  }
});

// POST /estoque/requisicoes/descontar-saida - chamado ao encerrar chamado
// desconta do estoque todas as requisicoes de saída pendentes do chamado
app.post("/estoque/requisicoes/descontar-saida", async (req, res) => {
  const client = await pool.connect();
  try{
    await client.query("BEGIN");
    const { chamado_id } = req.body;

    // Busca requisicoes de saída pendentes do chamado
    const { rows: reqs } = await client.query(
      `SELECT * FROM estoque_requisicoes
       WHERE chamado_id=$1 AND tipo='saida' AND status='pendente'`
       [chamado_id]
    );

    for (const req_ of reqs) {
      const { rows: itens } = await client.query(
        `SELECT * FROM estoque_requisicao_itens WHERE requisicao_id=$1`, [req_.id]
      );
      for (const item of itens){
        await client.query(
          `UPDATE estoque_itens SET quantidade = GREATEST(quantidade - $1, 0), atualizado_em=NOW() WHERE id=$2`,
           [item.quantidade, item.estoque_item_id]
        );
      }
      await client.query(
        `UPDATE estoque_requisicoes SET status='finalizada', finalizado_em=NOW() WHERE id=$1`,
        [req_.id]
      );
    }

    await client.query("COMMIT");
    ok(res, { descontadas: reqs.length });
  } catch (e) {
    await client.query("ROLLBACK");
    err(res, e);
  } finally {
    client.release();
  }
});




// ─── START ────────────────────────────────────────────────────────────────────
// Em desenvolvimento local: inicia o servidor normalmente.
// Em produção (Vercel Function): exporta o app para ser chamado pela função.
if (require.main === module) {
  app.listen(PORT, "127.0.0.1", () => {
    console.log(`\n🚀  API rodando em http://localhost:${PORT}`);
    console.log(`    Frontend esperado em http://localhost:5173`);
    console.log(`    Pressione Ctrl+C para parar\n`);
  });
}

module.exports = app;
