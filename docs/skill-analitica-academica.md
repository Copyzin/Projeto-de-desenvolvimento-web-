# Skill Analitica Academica

## Objetivo

Este documento define a base analitica para evoluir o sistema academico com seguranca. Ele deve ser lido antes de implementar funcionalidades novas, principalmente quando a mudanca envolver banco de dados, autenticacao, permissoes, matriculas, notificacoes, materiais ou financeiro.

O papel desta skill e separar claramente:

- fatos observados no codigo;
- decisoes de produto ja confirmadas;
- fluxo de dados por funcionalidade;
- riscos tecnicos antes de editar;
- matriz minima de testes esperados.

## Mapa do sistema

Stack real:

- Frontend: React, Vite, TypeScript, Wouter, React Query, Tailwind, shadcn/ui, Radix, Recharts e Framer Motion.
- Backend: Express, Passport local strategy, express-session, Drizzle ORM, PostgreSQL e Zod.
- Contratos: `shared/routes.ts` define paths, inputs e responses usadas por client e server.
- Schema: `shared/schema.ts` define entidades Drizzle e tipos compartilhados.
- Storage: `server/storage.ts` concentra consultas, escopos e regras de persistencia.

Papeis:

- Admin: gerencia cursos, materias, alunos, turmas, horarios, comunicados globais e futuro financeiro real.
- Professor: lista alunos dentro do proprio escopo, lanca nota/falta, publica comunicados direcionados e envia materiais.
- Aluno: consulta painel, cursos, comunicados, financeiro, downloads e seus dados academicos.

Entidades principais:

- Usuarios: admin, teacher e student, com RA publico, CPF, e-mail, telefone, avatar e senha hash.
- Cursos e materias: cursos funcionam como matriz academica; materias entram em `course_subjects` por etapa.
- Turmas e periodos: `class_sections` ligam curso, periodo letivo, coordenador, etapa atual e turno.
- Matriculas: `enrollments` ligam aluno, curso, turma, periodo, status, nota e faltas.
- Historico academico: `enrollment_status_history` e `approved_subject_records` preservam mudancas e disciplinas aprovadas.
- Aulas: `lesson_schedules`, blocks, slots, locations e drafts montam a tabela semanal oficial.
- Comunicados e notificacoes: comunicados podem ser globais ou direcionados; notificacoes usam destinatarios normalizados.
- Materiais: arquivos ficam em `storage/materials`, com permissao por curso/turma e pin pessoal.
- Recuperacao de senha: token numerico de 5 digitos, expiracao, cancelamento e bloqueio de dispositivo.

## Fluxos de dados

Autenticacao:

- Login aceita RA, CPF, e-mail ou username.
- Backend aplica rate limit em memoria por IP + identificador.
- Sessao Passport guarda o usuario autenticado e todas as rotas sensiveis devem revalidar auth/role no backend.
- Troca e recuperacao de senha devem sempre passar por hash com scrypt.

Matricula:

- Admin envia nome, CPF, telefone, e-mail, curso e turma.
- Backend cria usuario student, gera RA unico e salva senha inicial padronizada `Aluno@<RA>`.
- A resposta de `POST /api/students/enroll` inclui `initialPassword` para exibicao ao admin.
- Backend cria matricula ativa, com turma e periodo letivo derivados da turma selecionada.

Cursos e grade:

- Admin cria cursos e materias.
- Admin vincula materias ao curso com etapa em `course_subjects`.
- Professor e aluno enxergam apenas cursos permitidos pelo escopo academico.
- Quando uma turma e informada, materias podem carregar professores e status academico por etapa.

Alunos, notas e trancamento:

- Admin e professor consultam alunos por curso/turma.
- Professor deve selecionar turma para listar alunos.
- Professor atualiza nota e falta somente de matriculas dentro do proprio curso/turma.
- Admin tranca matricula e pode preservar disciplinas aprovadas para continuidade futura.

Atribuicao de aulas:

- Admin escolhe turma, periodo letivo e turno.
- Admin cria blocos materia/professor/local e distribui em 20 slots semanais.
- Rascunho fica salvo em localStorage e no servidor.
- Confirmar lancamento sobrescreve a tabela ativa daquela turma e periodo.

Comunicados e notificacoes:

- Admin pode publicar comunicado global ou direcionado.
- Professor pode publicar somente em cursos/turmas sob responsabilidade.
- Criacao de comunicado gera notificacao para destinatarios resolvidos pelo escopo.
- Leitura de notificacao e individual por destinatario.

Materiais:

- Professor envia arquivo para turma sob responsabilidade.
- Backend valida permissao, tamanho, extensao e MIME.
- Aluno/professor so baixa material dentro do proprio escopo.
- Pin/despin e pessoal por usuario.

Financeiro:

- Financeiro sera dominio real, nao apenas placeholder.
- Antes de implementar, criar plano especifico para ledger, mensalidades, pagamentos, inadimplencia, descontos, multas e notificacoes.
- Nao criar tabelas financeiras sem definir regras de vencimento, status, competencia, baixa, estorno e permissao.

## Matriz de testes

Validacao minima atual:

- Rodar `npm run check` antes de concluir qualquer mudanca.

Testes futuros por modulo:

- Auth: login por RA/CPF/e-mail, senha errada, rate limit, logout, troca de senha, recuperacao, cancelamento e bloqueio de dispositivo.
- RBAC: aluno bloqueado em rotas administrativas, professor limitado ao proprio escopo e admin com acesso total.
- Matricula: criacao de aluno, RA unico, senha inicial `Aluno@<RA>`, matricula ativa, turma obrigatoria e duplicidade.
- Cursos: criar curso, criar materia, vincular/desvincular materia, etapa correta e visibilidade por papel.
- Alunos: filtro por curso/turma, professor sem turma, atualizacao de nota/falta e trancamento.
- Aulas: criar local, editar local, remover local, salvar rascunho, preencher 20 slots, validar blocos e confirmar lancamento.
- Comunicados: global, direcionado por curso, direcionado por turma, expiracao, delete autorizado e notificacao por destinatario.
- Materiais: upload permitido, MIME recusado, limite de tamanho, acesso negado, download, pin e unpin.
- Financeiro: ledger, geracao de mensalidade, status pendente/pago/atrasado, descontos, multas, baixa, estorno e notificacoes.

## Regras preventivas

- Nunca apagar migrations, tabelas, rotas, componentes ou funcoes sem autorizacao humana.
- Nunca relaxar permissao no backend para facilitar teste.
- Nunca confiar apenas na UI para controle de acesso.
- Toda mudanca de schema deve ser acompanhada por migration nova.
- Migrations historicas devem ser tratadas como historico, nao como modelo automatico para descarte de dados.
- Mudancas em auth, permissoes, banco e storage exigem leitura do fluxo completo antes de editar.
- Mudancas grandes devem ser divididas em etapas pequenas e verificaveis.
- Se houver risco de perda de dados, parar e pedir confirmacao.

## Decisoes confirmadas

- A skill analitica e um documento versionado no repo, nao uma skill Codex formal.
- Primeiro acesso de aluno recem-matriculado usa senha padronizada `Aluno@<RA>`.
- A senha inicial deve ser exibida ao admin apos matricula.
- Financeiro sera dominio real em fase futura, com plano proprio antes da implementacao.

## Pontos ainda ambiguos

- Regras detalhadas do financeiro: valor por curso, bolsas, multas, descontos, vencimentos, competencia e estorno.
- Politica de troca obrigatoria da senha inicial no primeiro login.
- Ciclo completo de rematricula e retorno de matricula trancada.
- Regra de aprovacao por disciplina quando houver notas por materia em vez de nota agregada na matricula.
- Persistencia desejada para ordenacao manual de materiais, que hoje e apenas local da sessao.
