# CentralTI

Sistema de gestão de TI desenvolvido para controle completo do ambiente tecnológico corporativo. Reúne em uma única aplicação o gerenciamento de chamados, inventário do parque tecnológico, estoque de suprimentos, impressão de etiquetas e geração de relatórios.

## Demo

**Acesso online:** https://centralti.vercel.app/

| Campo | Valor |
|-------|-------|
| E-mail | centralti@centralti.com |
| Senha | 1234 |

> Deploy: React + Express na Vercel · Banco de dados: Supabase PostgreSQL

---

## Funcionalidades

### Chamados
- Abertura, edição e encerramento de tickets de suporte
- Classificação por prioridade (Crítica, Alta, Média, Baixa) com cálculo automático de SLA
- Controle de status (Aberto, Em Análise, Fechado, Sem Solução)
- Histórico de movimentações por chamado
- Anexos de imagens e PDFs vinculados ao ticket
- Filtros por status, departamento, prioridade, categoria e período

### Dashboard
- KPIs em tempo real: abertos, fechados, sem solução, SLA cumprido
- Gráfico de chamados por dia (linha)
- Gráfico SLA cumprido vs. violado (rosca)
- Chamados por departamento (barra horizontal)
- Tempo médio de resolução por prioridade
- Seletor de período: hoje, semana, mês e ano

### Inventário
- Cadastro de equipamentos com ficha técnica por tipo
- Tipos suportados: Computador, Impressora, Roteador, Smartphone, Câmera, Servidor, Switch, Outro
- Campos adaptativos por tipo — ex: Roteador exibe SSID/Rede e Senha Wi-Fi; Computador exibe SO, chave de licença e Office
- Modo de visualização com senhas mascaradas e toggle para revelar
- Histórico de manutenções por equipamento com linha do tempo
- Vinculação de chamados a equipamentos
- Filtros por tipo, status e departamento

### Estoque
- Cadastro de produtos com quantidade mínima e alerta de reposição
- Requisições de entrada (recebimento) e saída (uso em chamados)
- Desconto automático do estoque ao encerrar um chamado
- Controle de status das requisições (pendente / finalizada)

### Etiquetas
- Impressão de etiquetas de identificação para equipamentos
- Comunicação via PowerShell com impressora Zebra TLP 2844
- Preview da etiqueta antes de imprimir

### Relatórios
- Listagem de chamados com filtros avançados
- Ficha detalhada de chamado em PDF com histórico de movimentações
- Ficha de equipamento em PDF com histórico de manutenções
- Exportação de inventário e chamados para Excel (via SheetJS)

---

## Stack Técnica

| Camada | Tecnologia |
| :--- | :--- |
| **Frontend** | React 18 + Vite 5 |
| **Estilo** | CSS inline — sem framework de UI |
| **Gráficos** | Chart.js 4.4 |
| **Exportação Excel** | SheetJS (xlsx) |
| **Ícones** | Tabler Icons (CDN) |
| **Fontes** | Nunito + Montserrat (Google Fonts) |
| **Backend** | Node.js + Express 5 |
| **Banco de dados** | PostgreSQL (local) |
| **Upload de arquivos** | Multer |
| **Impressão** | PowerShell via `child_process` do Node |
| **Variáveis de ambiente** | dotenv |

---

## Arquitetura

```
Browser (React SPA)
       │  HTTP REST (localhost:3001)
       ▼
  Express API (server.js)
       │
       ├── PostgreSQL (porta 5432)
       ├── Sistema de arquivos (uploads/)
       └── PowerShell (impressão de etiquetas)
```

A aplicação roda **100% local** na máquina do técnico de TI. Não há tráfego externo, autenticação em nuvem ou dependência de terceiros — decisão arquitetural para garantir privacidade total dos dados corporativos e funcionamento sem internet.

O backend é um servidor Express monolítico que expõe rotas REST para o banco PostgreSQL e para operações do sistema (upload de arquivos e impressão). O frontend é uma SPA React que consome essa API.

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/) 14+
- Windows 10/11 (para impressão de etiquetas via PowerShell)

---

## Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/centralti.git
cd centralti
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chamados_ti
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui
PRINTER_NAME=Nome da sua impressora aqui
```

### 4. Crie o banco de dados

```bash
psql -U postgres -c "CREATE DATABASE chamados_ti;"
psql -U postgres -d chamados_ti -f _documentacao/Banco/schema.sql
psql -U postgres -d chamados_ti -f _documentacao/Banco/schema_equipamentos.sql
```

Opcionalmente, insira dados de exemplo:

```bash
psql -U postgres -d chamados_ti -f _documentacao/Banco/dados_equipamentos.sql
```

### 5. Inicie a aplicação

**Desenvolvimento:**
```bash
# Terminal 1 — API
node server.js

# Terminal 2 — Frontend
npm run dev
```

**Produção:**
```bash
npm run build
node server.js        # API na porta 3001
node start-front.js   # Frontend na porta 5173
```

Acesse: `http://localhost:5173`

### 6. Inicialização automática com o Windows (opcional)

Execute o script como Administrador para configurar o Agendador de Tarefas:

```powershell
.\ConfigurarInicioAutomatico.ps1
```

---

## Estrutura do Projeto

```
centralti/
├── src/
│   ├── components/
│   │   ├── UI.jsx              # Design tokens, botões, badges, inputs
│   │   ├── TicketRow.jsx       # Linha da lista de chamados
│   │   └── ModalChamado.jsx    # Modal de chamado (form + anexos + movimentações)
│   ├── pages/
│   │   ├── Dashboard.jsx       # Métricas e gráficos
│   │   └── Estoque.jsx         # Módulo de estoque
│   ├── utils/
│   │   └── helpers.js          # Constantes, cálculo de SLA, formatadores
│   ├── Inventario.jsx          # Módulo de inventário
│   ├── Relatorios.jsx          # Módulo de relatórios (PDF + Excel)
│   ├── Etiquetas.jsx           # Módulo de impressão de etiquetas
│   └── App.jsx                 # Orquestrador principal e navegação
├── _documentacao/
│   └── Banco/
│       ├── schema.sql              # Schema principal (chamados, movimentações, anexos)
│       └── schema_equipamentos.sql # Schema do inventário e manutenções
├── server.js                   # API Express (backend)
├── start-front.js              # Servidor estático para produção
├── .env.example                # Template de variáveis de ambiente
└── package.json
```

---

## Decisões Técnicas

**Por que sem framework de UI (Tailwind, MUI, etc.)?**
Controle total sobre o visual e ausência de dependências externas volumosas. Todo o estilo é CSS inline em objetos JavaScript, o que facilita a co-localização de lógica e aparência nos componentes.

**Por que PostgreSQL local em vez de Supabase ou outro BaaS?**
Os dados gerenciados incluem senhas de equipamentos, chaves de licença e credenciais corporativas — informações que não devem trafegar pela internet. O banco local garante privacidade total.

**Por que Express monolítico?**
Sistema single-user com escopo bem definido. Um único arquivo de rotas é mais simples de operar e entender do que uma arquitetura modular que adicionaria complexidade sem benefício real neste contexto.

**Por que Agendador de Tarefas do Windows em vez de PM2?**
PM2 apresentou comportamento inconsistente no ambiente Windows 11 durante os testes. O Agendador de Tarefas é nativo, estável e não requer dependências adicionais.

---

## Licença

MIT — veja o arquivo [LICENSE](LICENSE) para detalhes.
