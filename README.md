# Sistema de Gestão Acadêmica

Sistema web fullstack para gestão de cursos, alunos, professores e grade horária — desenvolvido como projeto acadêmico de desenvolvimento web (Sprint 3).

---

## Tecnologias

| Camada | Stack |
|--------|-------|
| **Frontend** | React 18, Vite, Wouter, TanStack Query, shadcn/ui, Tailwind CSS |
| **Backend** | Node.js, Express v5, Passport.js (sessões), Multer |
| **Banco de dados** | PostgreSQL, Drizzle ORM |
| **Validação** | Zod (compartilhado entre client e server) |
| **Linguagem** | TypeScript (fullstack) |

---

## Funcionalidades

- **Autenticação** — login por R.A., CPF ou e-mail; rate-limiting embutido; recuperação de senha via token de 5 dígitos (expira em 10 min)
- **Controle de acesso por papel** — `admin`, `professor`, `aluno`; todas as regras de negócio aplicadas no backend
- **Gerenciamento de cursos e disciplinas** — CRUD completo com matriz curricular
- **Grade horária** — visualização e edição de horários por turma
- **Alunos e matrículas** — cadastro, vínculos e histórico
- **Financeiro** — controle de cobranças e pagamentos
- **Materiais de aula** — upload e download de arquivos por disciplina
- **Anúncios** — globais ou direcionados a cursos específicos, com expiração automática
- **Notificações** — sistema interno de avisos
- **Registro de aulas** — diário de frequência e conteúdo ministrado

---

## Pré-requisitos

- **Node.js 18+**
- **PostgreSQL** rodando localmente (ou via variável `DATABASE_URL`)

---

## Instalação e execução local

### 1. Clone o repositório

```bash
git clone https://github.com/Copyzin/Projeto-de-desenvolvimento-web-.git
cd Projeto-de-desenvolvimento-web-
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o banco de dados

Crie o banco e o usuário no PostgreSQL:

```sql
CREATE DATABASE academic_system;
CREATE USER academic_user WITH PASSWORD 'strongpwd';
GRANT ALL PRIVILEGES ON DATABASE academic_system TO academic_user;

\c academic_system
GRANT ALL PRIVILEGES ON SCHEMA public TO academic_user;
GRANT ALL PRIVILEGES ON ALL TABLES AND SEQUENCES IN SCHEMA public TO academic_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO academic_user;
```

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgresql://academic_user:strongpwd@localhost:5432/academic_system
SESSION_SECRET=uma-string-longa-e-segura
APP_URL=http://localhost:5000
```

### 5. Aplique o schema

```bash
npm run db:push
```

### 6. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

O app estará disponível em **http://localhost:5000** (API + frontend no mesmo servidor).

---

## Comandos disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor unificado Express + Vite (HMR) na porta 5000 |
| `npm run build` | Build de produção (Vite → `dist/public`, esbuild → `dist/index.cjs`) |
| `npm start` | Executa o build de produção |
| `npm run check` | Verificação de tipos TypeScript (sem emissão) |
| `npm run db:push` | Sincroniza `shared/schema.ts` com o banco via Drizzle |

---

## Usuários de teste (seed automático)

Na primeira execução, o `seedDatabase()` popula o banco com usuários iniciais:

| Papel | R.A. | Senha |
|-------|------|-------|
| **Admin** | `26548998` | `Admin@12345` |
| **Professor** | `26560877` | `Professor@123` |
| **Aluno** | `26711596` | `Aluno@12345` |

> **Recomendação:** altere as senhas após o primeiro acesso em ambientes não-locais.

---

## Arquitetura

```
.
├── client/          # React SPA (Vite, Wouter, TanStack Query, shadcn/ui)
│   └── src/
│       ├── pages/   # Páginas por papel (dashboard, cursos, horários…)
│       ├── components/
│       ├── hooks/   # Data fetching via TanStack Query
│       └── lib/
├── server/          # Express v5 (rotas, auth, storage, seed)
├── shared/          # Contratos compartilhados
│   ├── schema.ts    # Drizzle ORM + Zod — fonte única de verdade do schema
│   └── routes.ts    # Definição type-safe de todos os endpoints
├── storage/         # Arquivos enviados por upload (ignorado pelo Git)
└── migrations/      # Histórico de migrações Drizzle
```

### Convenções principais

- **Servidor unificado**: API (`/api/*`) e SPA (tudo mais) no mesmo processo na porta 5000.
- **Contrato compartilhado**: `shared/routes.ts` define método, path e schemas Zod de cada endpoint — client e server importam do mesmo lugar.
- **Data access layer**: todo acesso ao banco passa pelo singleton `storage` (`IStorage` / `DatabaseStorage` em `server/storage.ts`).
- **Sem testes, sem linter**: a única verificação estática é `npm run check` (tsc).

---

## Licença

MIT
