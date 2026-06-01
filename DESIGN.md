# DESIGN.md

Guia de design do EduManage. **Consulte este arquivo antes de qualquer decisão de UI** e siga os padrões já existentes — não invente tokens, fontes ou componentes novos sem necessidade. Tudo aqui descreve o que já está no código ([client/src/index.css](client/src/index.css), [tailwind.config.ts](tailwind.config.ts), páginas em [client/src/pages/](client/src/pages/)).

## Tokens de cor (HSL via CSS variables — `client/src/index.css`)

Use sempre as classes utilitárias do Tailwind mapeadas para estes tokens (`bg-primary`, `text-muted-foreground`, `border-border`, etc.). Não use cores hex soltas em componentes.

| Token | Light | Uso |
|---|---|---|
| `--background` | `206 33% 92%` | Fundo da página |
| `--foreground` | `210 71% 9%` | Texto principal |
| `--card` | `0 0% 100%` | Fundo de cards |
| `--primary` | `207 53% 36%` (azul) | Ações, nav ativo, ícones de destaque, `--ring` |
| `--primary-foreground` | `206 33% 92%` | Texto sobre primary |
| `--muted-foreground` | `214 73% 15%` | Descrições, rótulos secundários |
| `--border` / `--input` | `214 32% 91%` | Bordas e inputs |
| `--destructive` | `0 84% 60%` | Erros, exclusões, ações sensíveis |
| `--radius` | `0.75rem` | Raio base (cards/botões) |

Há tema `.dark` definido com os mesmos tokens — não hardcode cores que quebrem o modo escuro.

## Tipografia

- Fonte de texto: **DM Sans** (`--font-body`, classe `font-body`) — corpo, rótulos, tabelas.
- Fonte de título: **Outfit** (`--font-display`, classe `font-display`) — títulos de página/seção.
- Título de página padrão: `font-display text-3xl font-bold tracking-tight`.
- Subtítulo/descrição: `text-muted-foreground mt-1`.

## Idioma

UI e textos em **português (pt-BR)**. Mensagens de erro/sucesso e rótulos seguem o tom direto já usado (ex.: "Imprimir em PDF", "Nenhum horario publicado..."). Ver [CLAUDE.md](CLAUDE.md).

## Scaffold de página (padrão obrigatório)

Replicar a estrutura de [finances.tsx](client/src/pages/finances.tsx) / [downloads.tsx](client/src/pages/downloads.tsx) / [schedule.tsx](client/src/pages/schedule.tsx):

```tsx
<div className="space-y-6">
  <div>
    <h2 className="font-display text-3xl font-bold tracking-tight">Titulo</h2>
    <p className="text-muted-foreground mt-1">Descricao curta.</p>
  </div>

  <Card className="rounded-lg">
    <CardHeader>
      <CardTitle className="text-lg">Secao</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">{/* conteudo */}</CardContent>
  </Card>
</div>
```

- Espaçamento vertical: `space-y-6` (entre blocos), `space-y-4` (dentro de cards).
- O `LayoutShell` ([client/src/components/layout-shell.tsx](client/src/components/layout-shell.tsx)) já provê sidebar, header e o container `max-w-7xl mx-auto p-4 md:p-8`. Páginas renderizam só o conteúdo.

## Componentes

Usar exclusivamente os componentes shadcn/ui (estilo "new-york") em [client/src/components/ui/](client/src/components/ui/): `Card`, `Button`, `Select`, `Dialog`, `AlertDialog`, `Input`, `Label`, `Badge`, `Skeleton`, `Tooltip`, etc. Ícones: **lucide-react**.

- **Botões:** `variant` `default` | `outline` | `ghost`; ações destrutivas/sensíveis com classes `bg-destructive ...`.
- **Confirmação simples:** `Dialog`. **Ação sensível (ex.: avançar etapa):** dupla confirmação — `Dialog` de configuração + `AlertDialog` de confirmação final (ver [stage-advance-dialog.tsx](client/src/components/stage-advance-dialog.tsx)).
- **Loading:** `<Loader2 className="h-6 w-6 animate-spin text-primary" />` ou `Skeleton`.
- **Estado vazio:** `rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground`.
- **Aviso/atenção:** caixa âmbar `border-amber-300 bg-amber-50 text-amber-800/900`.

## Impressão em PDF (reutilizar — não recriar)

Toda impressão de tabela usa o motor em [client/src/lib/print-table.ts](client/src/lib/print-table.ts):

1. Montar um `PrintTableDocument` (`title`, `subtitle`, `details[]`, `columns[]`, `rows[]`, `legend[]`).
2. Cores por item via `getPrintTableColor(index)` (paleta acessível de 12 cores).
3. Disparar com `printTableDocument(doc)` dentro de um `PrintTableDialog` ([print-table-dialog.tsx](client/src/components/print-table-dialog.tsx)), tratando erro com toast.

Exemplos: [lesson-assignment.tsx](client/src/pages/lesson-assignment.tsx) (admin) e [schedule.tsx](client/src/pages/schedule.tsx) (aluno/professor).

## Grade horária (fonte única)

Dias, períodos e faixas de horário ficam em [client/src/lib/schedule-grid.ts](client/src/lib/schedule-grid.ts) (`DAYS`, `PERIOD_ROWS`, `PERIOD_LABELS`, `slotKey`, `splitSlotKey`, `lessonTimeLabel`). Qualquer tela que exiba grade deve importar daqui — não duplicar horários.
