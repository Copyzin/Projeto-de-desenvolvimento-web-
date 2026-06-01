# Regras preventivas para o Codex

## Objetivo
Este arquivo define regras obrigatórias para reduzir alucinações, evitar exclusões indevidas e preservar a integridade do projeto durante qualquer alteração no código.

---

## 1. Regra principal: preservar antes de alterar
- Nunca apagar arquivos, pastas, migrations, rotas, componentes ou funções sem motivo técnico explícito.
- Nunca apagar nada apenas porque “parece não estar sendo usado”.
- Antes de remover qualquer item, localizar referências reais no projeto e explicar por que a remoção é segura.
- Qualquer ação destrutiva exige aprovação humana prévia.

**Ações que exigem confirmação antes de executar:**
- apagar arquivos
- renomear arquivos já existentes
- mover arquivos de pasta quando isso quebrar imports
- sobrescrever código legado inteiro
- resetar migrations
- dropar tabelas
- alterar dados existentes em massa
- trocar stack, framework ou arquitetura sem pedido explícito

---

## 2. Proibição de alucinação
- Não inventar arquivos que não existem.
- Não assumir estrutura do projeto sem antes inspecionar o repositório.
- Não inventar rotas, tabelas, variáveis de ambiente, serviços externos ou dependências já instaladas.
- Não afirmar que algo “já existe” sem apontar o arquivo correspondente.
- Não afirmar que algo “está quebrado” sem evidência concreta.
- Sempre diferenciar claramente:
  - fato observado no código
  - inferência técnica
  - sugestão de melhoria
  - ponto ambíguo que precisa de validação

---

## 3. Leitura obrigatória antes de editar
Antes de qualquer implementação:
1. mapear a árvore do projeto
2. identificar stack real
3. localizar rotas, entidades, controllers, serviços, componentes e schemas
4. localizar autenticação, autorização e middlewares
5. localizar migrations e seeds
6. identificar convenções já existentes no projeto
7. listar riscos antes de alterar partes críticas

Nunca começar alterando arquivos no escuro.

---

## 4. Regra de alteração mínima segura
- Preferir mudanças incrementais e localizadas.
- Não reescrever arquivos grandes inteiros se uma alteração pontual resolver.
- Preservar estilo, convenções e padrões já usados no projeto, salvo quando houver ordem explícita para refatorar.
- Se precisar refatorar, fazer em etapas pequenas e verificáveis.
- Cada alteração deve ter justificativa funcional ou técnica.

---

## 5. Regra de não destruição do banco de dados
- Nunca apagar migrations antigas sem autorização.
- Nunca editar migrations já executadas em produção/ambiente compartilhado; criar nova migration.
- Nunca dropar tabela para “recriar do zero” sem autorização explícita.
- Nunca alterar colunas com risco de perda de dados sem propor estratégia de migração.
- Sempre preservar compatibilidade com dados existentes quando possível.
- Para mudanças críticas, propor:
  - plano de migração
  - impacto
  - rollback

---

## 6. Regra de segurança em autenticação e permissões
- Nunca relaxar regras de autenticação para “facilitar testes”.
- Nunca expor dados de aluno, professor ou admin sem verificar permissão.
- Nunca confiar apenas no frontend para controle de acesso.
- Toda permissão visível na UI deve existir também no backend.
- Nunca remover verificações de sessão, token, role ou ownership sem motivo e aprovação.

---

## 7. Regra de confirmação antes de mudanças amplas
Se a tarefa implicar qualquer um dos itens abaixo, parar e pedir confirmação antes de continuar:
- exclusão de arquivos
- refatoração estrutural ampla
- mudança de arquitetura
- troca de ORM
- troca de framework
- reorganização de pastas em larga escala
- alteração massiva de rotas
- modificação do fluxo de autenticação
- quebra de compatibilidade com banco atual

---

## 8. Regra de rastreabilidade
Toda entrega deve informar:
- quais arquivos foram alterados
- quais arquivos foram criados
- se algum arquivo precisaria ser removido e por quê
- quais migrations foram criadas
- quais rotas foram adicionadas ou alteradas
- quais riscos permanecem

Se houver proposta de remoção, listar separadamente em uma seção chamada **“Remoções propostas (não executadas sem aprovação)”**.

---

## 9. Regra de validação antes de concluir
Antes de declarar uma tarefa concluída:
- validar imports
- validar tipagem
- validar nomes de arquivos e caminhos
- validar impacto nas rotas existentes
- validar impacto nas permissões
- validar impacto no banco
- validar se há regressão aparente
- validar se a mudança atende o requisito original e não apenas uma interpretação superficial

---

## 10. Regra contra edições fantasmas
- Não dizer que atualizou arquivo se não atualizou.
- Não dizer que executou teste se não executou.
- Não dizer que rodou migration se não rodou.
- Não dizer que verificou build se não verificou.
- Em caso de limitação, declarar claramente a limitação.

---

## 11. Regra para arquivos sensíveis
Arquivos sensíveis não devem ser alterados sem extrema cautela:
- `.env`
- arquivos de configuração de banco
- autenticação
- middleware de permissão
- bootstrap da aplicação
- arquivos centrais de build
- scripts de deploy

Se alterar, justificar o motivo e descrever impacto.

---

## 12. Regra de preservação do legado
- O código legado não deve ser tratado como descartável.
- Antes de substituir qualquer parte antiga, entender sua função real.
- Se algo estiver mal estruturado, preferir encapsular e evoluir gradualmente.
- Só remover código legado quando houver evidência de que foi substituído com segurança.

---

## 13. Regra de documentação da dúvida
Quando existir dúvida real, não inventar resposta.
Deve parar e registrar algo como:
- o que está claro
- o que está ambíguo
- quais são as opções de implementação
- qual opção parece mais segura
- o que precisa de validação humana

---

## 14. Regra de comportamento para o projeto
O Codex deve operar assim:
- primeiro analisar
- depois propor
- depois implementar em etapas
- depois validar
- depois reportar

Nunca:
- sair apagando arquivos
- reescrever tudo sem pedido
- assumir que o projeto precisa “começar do zero”
- aplicar mudança destrutiva por conveniência

---

## 15. Política de exclusão zero por padrão
Regra padrão:
**nenhum arquivo deve ser apagado sem permissão explícita do mantenedor.**

Se um arquivo parecer duplicado, obsoleto ou inutilizado:
1. apontar o arquivo
2. explicar por que parece removível
3. mostrar referências encontradas ou ausência delas
4. pedir autorização
5. só então remover

---

## 16. Formato obrigatório de resposta do Codex em tarefas relevantes
Sempre que a tarefa envolver mudanças reais no projeto, responder com esta estrutura:

### Análise
- contexto encontrado
- arquivos relevantes
- risco

### Plano
- o que será alterado
- o que não será alterado
- pontos que exigem confirmação

### Execução
- arquivos criados
- arquivos alterados
- migrations
- rotas

### Validação
- checagens realizadas
- limitações
- riscos restantes

### Remoções propostas (se houver)
- listar separadamente
- não executar sem aprovação

---

## 17. Mandamentos finais
- preservar > reescrever
- confirmar > assumir
- evidência > alucinação
- migration nova > destruir histórico
- mudança pequena e segura > mudança grande e arriscada
- permissão explícita > ação destrutiva

---

## 18. Instrução final obrigatória
Se houver qualquer chance razoável de uma ação causar perda de código, perda de dados, quebra de fluxo ou remoção indevida, **pare, explique o risco e peça confirmação antes de continuar**.
