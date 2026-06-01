import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Download, FileText, Filter, Receipt, Search } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useFinanceSummary, useFinanceAdminOverview } from "@/hooks/use-finances";
import { formatCurrencyCents, formatDateBR } from "@/lib/format";
import { buildBoletoHtml, buildReceiptHtml, printHtmlDocument } from "@/lib/print-finance";
import type {
  FinanceAdminOverviewResponse,
  FinanceBoletoResponse,
  FinanceSummaryResponse,
} from "@shared/routes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FinanceDocumentDialog,
  type FinanceDocument,
} from "@/components/finance/finance-document-dialog";
import { FinanceStatusBadge, SituacaoBadge } from "@/components/finance/finance-status-badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";

type FinanceMeta = {
  payer: FinanceSummaryResponse["payer"];
  institution: FinanceSummaryResponse["institution"];
};

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "danger" | "success";
}) {
  const valueClass =
    tone === "danger" ? "text-red-700" : tone === "success" ? "text-green-700" : "text-foreground";
  return (
    <div className="border rounded-lg p-4 bg-white/70">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${valueClass}`}>{value}</p>
      {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
    </div>
  );
}

function SimulatedNotice() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>
        Ambiente acadêmico: os boletos, descontos e recibos abaixo são <strong>simulados</strong> e
        não possuem valor fiscal nem registro bancário. A multa por atraso é calculada em tempo real
        ({formatCurrencyCents(200)} por dia).
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visão do ALUNO
// ---------------------------------------------------------------------------
function StudentFinance() {
  const { data, isLoading, isError, error } = useFinanceSummary();
  const [doc, setDoc] = useState<FinanceDocument | null>(null);

  const meta: FinanceMeta | null = useMemo(
    () => (data ? { payer: data.payer, institution: data.institution } : null),
    [data],
  );

  const pendentes = useMemo(
    () =>
      (data?.boletos ?? [])
        .filter((b) => b.status !== "pago")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [data],
  );
  const pagos = useMemo(
    () =>
      (data?.boletos ?? [])
        .filter((b) => b.status === "pago")
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
    [data],
  );

  function openBoleto(boleto: FinanceBoletoResponse) {
    if (!meta) return;
    setDoc({ title: `Boleto — ${boleto.referenceLabel}`, html: buildBoletoHtml(boleto, meta) });
  }
  function downloadBoleto(boleto: FinanceBoletoResponse) {
    if (!meta) return;
    printHtmlDocument(buildBoletoHtml(boleto, meta));
  }
  function openReceipt(boleto: FinanceBoletoResponse) {
    if (!meta) return;
    setDoc({ title: `Recibo — ${boleto.referenceLabel}`, html: buildReceiptHtml(boleto, meta) });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Mensalidades, descontos, multas e histórico de pagamentos."
      />

      <SimulatedNotice />

      {isLoading ? (
        <Card className="rounded-lg">
          <CardContent className="p-0">
            <LoadingState className="py-16" />
          </CardContent>
        </Card>
      ) : isError || !data ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error instanceof Error ? error.message : "Não foi possível carregar o financeiro."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total em aberto" value={formatCurrencyCents(data.totals.emAbertoCents)} />
            <StatCard
              label="Vencido"
              value={formatCurrencyCents(data.totals.vencidoCents)}
              hint={
                data.totals.multaCents > 0
                  ? `Inclui multa de ${formatCurrencyCents(data.totals.multaCents)}`
                  : "Sem atrasos"
              }
              tone={data.totals.vencidoCents > 0 ? "danger" : "default"}
            />
            <StatCard
              label="Pago no período"
              value={formatCurrencyCents(data.totals.pagoCents)}
              tone="success"
            />
            <StatCard
              label="Próximo vencimento"
              value={formatDateBR(data.totals.proximoVencimento)}
            />
          </div>

          {data.totals.vencidoCents > 0 ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Você possui mensalidade(s) em atraso. A multa acumulada é de{" "}
                <strong>{formatCurrencyCents(data.totals.multaCents)}</strong> (
                {formatCurrencyCents(data.lateFeePerDayCents)} por dia de atraso).
              </span>
            </div>
          ) : null}

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Boletos a pagar</CardTitle>
              <CardDescription>Abra o boleto para ver valor, desconto e multa, ou baixe em PDF.</CardDescription>
            </CardHeader>
            <CardContent>
              {pendentes.length === 0 ? (
                <EmptyState message="Nenhum boleto em aberto. Você está em dia!" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Desconto</TableHead>
                      <TableHead className="text-right">Multa</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendentes.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.referenceLabel}</TableCell>
                        <TableCell>{formatDateBR(b.dueDate)}</TableCell>
                        <TableCell className="text-right">{formatCurrencyCents(b.baseCents)}</TableCell>
                        <TableCell className="text-right text-green-700">
                          − {formatCurrencyCents(b.discountCents)}
                          <span className="block text-[11px] text-muted-foreground">{b.discountPercent}%</span>
                        </TableCell>
                        <TableCell className="text-right text-red-700">
                          {b.lateFeeCents > 0 ? (
                            <>
                              + {formatCurrencyCents(b.lateFeeCents)}
                              <span className="block text-[11px] text-muted-foreground">
                                {b.daysOverdue} dia(s)
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrencyCents(b.amountDueCents)}
                        </TableCell>
                        <TableCell>
                          <FinanceStatusBadge status={b.status} />
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="outline" size="sm" onClick={() => openBoleto(b)}>
                            <FileText className="mr-1.5 h-3.5 w-3.5" />
                            Ver
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-1"
                            aria-label={`Baixar boleto de ${b.referenceLabel}`}
                            onClick={() => downloadBoleto(b)}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Pagamentos anteriores</CardTitle>
              <CardDescription>Histórico de mensalidades quitadas, com recibo para download.</CardDescription>
            </CardHeader>
            <CardContent>
              {pagos.length === 0 ? (
                <EmptyState message="Nenhum pagamento registrado ainda." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead>Pago em</TableHead>
                      <TableHead className="text-right">Valor pago</TableHead>
                      <TableHead>Recibo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagos.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.referenceLabel}</TableCell>
                        <TableCell>{formatDateBR(b.paidAt)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrencyCents(b.paidAmountCents ?? 0)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{b.receiptNumber}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openReceipt(b)}>
                            <Receipt className="mr-1.5 h-3.5 w-3.5" />
                            Recibo
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <FinanceDocumentDialog document={doc} onOpenChange={(open) => !open && setDoc(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visão do ADMIN
// ---------------------------------------------------------------------------
type AdminRow = FinanceAdminOverviewResponse["rows"][number];
type SortKey = "name" | "ra" | "courseName" | "emAberto" | "vencido" | "multa";

function SortableHead({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
  filterActive,
  onFilter,
  align = "left",
}: {
  label: string;
  colKey: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  filterActive?: boolean;
  onFilter?: () => void;
  align?: "left" | "right";
}) {
  const isActive = sortKey === colKey;
  const SortIcon = isActive ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={align === "right" ? "text-right" : ""}>
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        <button
          onClick={() => onSort(colKey)}
          className={`flex items-center gap-1 rounded px-1 py-0.5 text-sm hover:bg-muted transition-colors ${
            isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
          <SortIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : ""}`} />
        </button>
        {onFilter !== undefined && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onFilter}
                className={`rounded p-0.5 transition-colors ${
                  filterActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted"
                }`}
              >
                <Filter className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[180px] text-center text-xs leading-snug">
              {filterActive
                ? "Filtro ativo — clique para exibir todos os alunos"
                : "Exibir apenas alunos com valor nesta coluna"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TableHead>
  );
}

function AdminStudentBoletosDialog({
  row,
  institution,
  onOpenChange,
  onOpenDocument,
}: {
  row: AdminRow | null;
  institution: FinanceAdminOverviewResponse["institution"];
  onOpenChange: (open: boolean) => void;
  onOpenDocument: (doc: FinanceDocument) => void;
}) {
  const meta: FinanceMeta | null = row
    ? {
        payer: { name: row.name, ra: row.ra, courseName: row.courseName ?? null, academicTermCode: null },
        institution,
      }
    : null;

  const boletos = useMemo(
    () => (row?.boletos ?? []).slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [row],
  );

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Boletos — {row?.name} (RA {row?.ra})
          </DialogTitle>
        </DialogHeader>
        {row ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Documento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boletos.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.referenceLabel}</TableCell>
                  <TableCell>{formatDateBR(b.dueDate)}</TableCell>
                  <TableCell className="text-right">{formatCurrencyCents(b.amountDueCents)}</TableCell>
                  <TableCell>
                    <FinanceStatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {b.status === "pago" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          meta &&
                          onOpenDocument({
                            title: `Recibo — ${b.referenceLabel}`,
                            html: buildReceiptHtml(b, meta),
                          })
                        }
                      >
                        <Receipt className="mr-1.5 h-3.5 w-3.5" />
                        Recibo
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          meta &&
                          onOpenDocument({
                            title: `Boleto — ${b.referenceLabel}`,
                            html: buildBoletoHtml(b, meta),
                          })
                        }
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Boleto
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AdminFinance() {
  const { data, isLoading, isError, error } = useFinanceAdminOverview();
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [situacaoFilter, setSituacaoFilter] = useState("all");
  const [selectedRow, setSelectedRow] = useState<AdminRow | null>(null);
  const [doc, setDoc] = useState<FinanceDocument | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterAberto, setFilterAberto] = useState(false);
  const [filterVencido, setFilterVencido] = useState(false);
  const [filterMulta, setFilterMulta] = useState(false);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const courseOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of data?.rows ?? []) {
      if (row.courseName) set.add(row.courseName);
    }
    return Array.from(set).sort();
  }, [data]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.rows ?? [])
      .filter((row) => {
        if (courseFilter !== "all" && row.courseName !== courseFilter) return false;
        if (situacaoFilter !== "all" && row.totals.situacao !== situacaoFilter) return false;
        if (term && !row.name.toLowerCase().includes(term) && !row.ra.toLowerCase().includes(term)) return false;
        if (filterAberto && row.totals.emAbertoCents === 0) return false;
        if (filterVencido && row.totals.vencidoCents === 0) return false;
        if (filterMulta && row.totals.multaCents === 0) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "name") cmp = a.name.localeCompare(b.name);
        else if (sortKey === "ra") cmp = a.ra.localeCompare(b.ra);
        else if (sortKey === "courseName") cmp = (a.courseName ?? "").localeCompare(b.courseName ?? "");
        else if (sortKey === "emAberto") cmp = a.totals.emAbertoCents - b.totals.emAbertoCents;
        else if (sortKey === "vencido") cmp = a.totals.vencidoCents - b.totals.vencidoCents;
        else if (sortKey === "multa") cmp = a.totals.multaCents - b.totals.multaCents;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [data, search, courseFilter, situacaoFilter, sortKey, sortDir, filterAberto, filterVencido, filterMulta]);

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-6">
      <PageHeader
        title="Gestão Financeira"
        description="Situação de mensalidades por aluno, descontos, multas e inadimplência."
      />

      <SimulatedNotice />

      {isLoading ? (
        <Card className="rounded-lg">
          <CardContent className="p-0">
            <LoadingState className="py-16" />
          </CardContent>
        </Card>
      ) : isError || !data ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error instanceof Error ? error.message : "Não foi possível carregar o financeiro."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="Total emitido" value={formatCurrencyCents(data.aggregates.emitidoCents)} />
            <StatCard
              label="Recebido"
              value={formatCurrencyCents(data.aggregates.recebidoCents)}
              tone="success"
            />
            <StatCard label="Em aberto" value={formatCurrencyCents(data.aggregates.emAbertoCents)} />
            <StatCard
              label="Vencido"
              value={formatCurrencyCents(data.aggregates.vencidoCents)}
              hint={`Multa: ${formatCurrencyCents(data.aggregates.multaCents)}`}
              tone="danger"
            />
            <StatCard
              label="Inadimplentes"
              value={`${data.aggregates.inadimplentes}/${data.aggregates.studentCount}`}
              tone={data.aggregates.inadimplentes > 0 ? "danger" : "success"}
            />
          </div>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Alunos</CardTitle>
              <CardDescription>Filtre por curso, situação ou busque por nome/RA.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou RA"
                    className="pl-9"
                  />
                </div>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger className="md:w-56">
                    <SelectValue placeholder="Curso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os cursos</SelectItem>
                    {courseOptions.map((course) => (
                      <SelectItem key={course} value={course}>
                        {course}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={situacaoFilter} onValueChange={setSituacaoFilter}>
                  <SelectTrigger className="md:w-48">
                    <SelectValue placeholder="Situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as situações</SelectItem>
                    <SelectItem value="em_dia">Em dia</SelectItem>
                    <SelectItem value="inadimplente">Inadimplente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredRows.length === 0 ? (
                <EmptyState message="Nenhum aluno encontrado para os filtros selecionados." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableHead label="Aluno" colKey="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                        <SortableHead label="RA" colKey="ra" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                        <SortableHead label="Curso" colKey="courseName" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                        <SortableHead label="Em aberto" colKey="emAberto" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} filterActive={filterAberto} onFilter={() => setFilterAberto((f) => !f)} align="right" />
                        <SortableHead label="Vencido" colKey="vencido" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} filterActive={filterVencido} onFilter={() => setFilterVencido((f) => !f)} align="right" />
                        <SortableHead label="Multa" colKey="multa" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} filterActive={filterMulta} onFilter={() => setFilterMulta((f) => !f)} align="right" />
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={row.studentId}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell className="text-muted-foreground">{row.ra}</TableCell>
                          <TableCell className="text-muted-foreground">{row.courseName ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrencyCents(row.totals.emAbertoCents)}
                          </TableCell>
                          <TableCell className="text-right text-red-700">
                            {formatCurrencyCents(row.totals.vencidoCents)}
                          </TableCell>
                          <TableCell className="text-right text-red-700">
                            {formatCurrencyCents(row.totals.multaCents)}
                          </TableCell>
                          <TableCell>
                            <SituacaoBadge situacao={row.totals.situacao} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => setSelectedRow(row)}>
                              Ver boletos
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AdminStudentBoletosDialog
        row={selectedRow}
        institution={data?.institution ?? { name: "", cnpj: "", beneficiary: "", agency: "", account: "" }}
        onOpenChange={(open) => !open && setSelectedRow(null)}
        onOpenDocument={(d) => setDoc(d)}
      />
      <FinanceDocumentDialog document={doc} onOpenChange={(open) => !open && setDoc(null)} />
    </div>
    </TooltipProvider>
  );
}

export default function Finances() {
  const { user } = useAuth();

  if (!user) return null;
  if (user.role === "teacher") return null;
  if (user.role === "student") return <StudentFinance />;
  return <AdminFinance />;
}
