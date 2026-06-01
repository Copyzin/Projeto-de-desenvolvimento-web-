# Design: Botão "Limpar tabela" — Aba Alocação de Aulas

**Data:** 2026-05-31
**Arquivo alvo:** `client/src/pages/lesson-assignment.tsx`

---

## Contexto

A aba de Alocação de Aulas do administrador tem um fluxo de dois passos:

- **Passo 1:** Criação de blocos de aula (disciplina + professor + local).
- **Passo 2:** Alocação dos blocos em slots do grade semanal via drag-and-drop.

O estado do grade é o `SlotMap` (tipo `Record<string, string>`): mapeia chaves de slot (`"dia-numero"`) para `clientId` de blocos. Esse estado é persistido automaticamente no servidor via `useSaveLessonScheduleDraft()` (debounce 900 ms).

---

## Requisito

Adicionar um botão **"Limpar tabela"** no Passo 2 que:

1. Limpa somente os slots do grade (`SlotMap`), mantendo os blocos intactos.
2. Exige confirmação via `AlertDialog` antes de agir.

---

## Design

### Posicionamento

Na barra de ações do `CardHeader` da seção "Tabela semanal" (Passo 2), entre o botão "Distribuir automaticamente" e o botão "Confirmar lançamento" — linha ~1150 de `lesson-assignment.tsx`.

### Botão

| Propriedade | Valor |
|---|---|
| Texto | "Limpar tabela" |
| Variante | `outline` |
| Ícone | `Eraser` (lucide-react) |
| Desabilitado quando | `Object.keys(slots).length === 0` |

### AlertDialog (confirmação)

| Campo | Conteúdo |
|---|---|
| Título | "Limpar tabela?" |
| Descrição | "Todos os slots da grade semanal serão esvaziados. Os blocos de aula permanecem disponíveis para nova alocação." |
| Botão cancelar | Secundário, fecha sem ação |
| Botão confirmar | `variant="destructive"`, texto "Limpar" |

### Lógica ao confirmar

```ts
setSlots({});
setClearDialogOpen(false);
```

O auto-save existente (debounce 900 ms via `useSaveLessonScheduleDraft`) persiste o `SlotMap` vazio no servidor automaticamente. Nenhuma chamada de API adicional é necessária.

### Estado extra

```ts
const [clearDialogOpen, setClearDialogOpen] = useState(false);
```

---

## Mudanças necessárias

1. **Importar** `Eraser` de `lucide-react` (adicionar à linha de import existente).
2. **Importar** componentes `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle` de `@/components/ui/alert-dialog`.
3. **Adicionar** `useState` para `clearDialogOpen`.
4. **Inserir** o botão "Limpar tabela" na barra de ações do Passo 2.
5. **Inserir** o `AlertDialog` no JSX do componente.

---

## O que NÃO muda

- Os blocos (`blocks`) não são afetados.
- Nenhuma nova rota ou mutation de API é criada.
- O mecanismo de auto-save não é alterado.
- O comportamento do draft no servidor é o mesmo (o auto-save persiste `slots: {}` normalmente).
