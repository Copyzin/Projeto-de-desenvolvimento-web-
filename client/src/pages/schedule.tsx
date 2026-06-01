import { useMemo, useState } from "react";
import { CalendarClock, Printer } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useStudentSchedule, useTeacherSchedule } from "@/hooks/use-my-schedule";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PrintTableDialog } from "@/components/print-table-dialog";
import {
  getPrintTableColor,
  printTableDocument,
  type PrintTableColor,
  type PrintTableDocument,
} from "@/lib/print-table";
import {
  DAYS,
  PERIOD_LABELS,
  PERIOD_ROWS,
  lessonTimeLabel,
  type DayOfWeek,
  type Period,
} from "@/lib/schedule-grid";

const PERIOD_ORDER: Period[] = ["matutino", "vespertino", "noturno"];

function buildColorMap(subjectNames: string[]) {
  const map = new Map<string, PrintTableColor>();
  let index = 0;
  for (const name of subjectNames) {
    if (!map.has(name)) {
      map.set(name, getPrintTableColor(index));
      index += 1;
    }
  }
  return map;
}

function LoadingCard() {
  return (
    <Card className="rounded-lg">
      <CardContent className="p-0">
        <LoadingState className="py-16" />
      </CardContent>
    </Card>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="py-10">
        <EmptyState message={message} />
      </CardContent>
    </Card>
  );
}

function ScheduleCell({ color, title, subtitle, meta }: { color?: PrintTableColor; title: string; subtitle?: string; meta?: string }) {
  return (
    <div
      className="h-full rounded-md border-l-4 p-2 text-left"
      style={{ borderColor: color?.accent, background: color?.background }}
    >
      <p className="font-semibold leading-tight">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      {meta && <p className="text-[11px] text-muted-foreground">{meta}</p>}
    </div>
  );
}

export default function Schedule() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "teacher") return <TeacherSchedule userName={user.name} />;
  if (user.role === "student") return <StudentSchedule />;
  return null;
}

function StudentSchedule() {
  const { toast } = useToast();
  const { data, isLoading, error } = useStudentSchedule(true);
  const [printOpen, setPrintOpen] = useState(false);

  const view = useMemo(() => {
    if (!data || !data.schedule) return null;
    const period = data.classSection.period as Period;
    const blockById = new Map(data.schedule.blocks.map((block) => [block.id, block]));
    const blockKeyToId = new Map(data.schedule.slots.map((slot) => [`${slot.dayOfWeek}-${slot.lessonNumber}`, slot.blockId]));
    const colorMap = buildColorMap(data.schedule.blocks.map((block) => block.subjectName));
    const blockAt = (day: DayOfWeek, lessonNumber: number) => {
      const blockId = blockKeyToId.get(`${day}-${lessonNumber}`);
      return blockId ? blockById.get(blockId) ?? null : null;
    };
    return { period, colorMap, blockAt, blocks: data.schedule.blocks };
  }, [data]);

  const printDocument = useMemo<PrintTableDocument | null>(() => {
    if (!data || !view) return null;
    return {
      title: "Horario escolar",
      subtitle: `${data.classSection.code} - ${data.classSection.name}`,
      details: [
        `Semestre: ${data.academicTermCode}`,
        `Periodo: ${PERIOD_LABELS[view.period]}`,
        `Etapa: ${data.classSection.currentStageNumber}a`,
        `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
      ],
      columns: DAYS.map((day) => day.label),
      rows: PERIOD_ROWS[view.period].map((row) => {
        if (row.kind === "interval") {
          return { header: row.label, kind: "interval" as const, intervalLabel: "Intervalo" };
        }
        return {
          header: row.label,
          kind: "data" as const,
          cells: DAYS.map((day) => {
            const block = view.blockAt(day.key, row.lessonNumber);
            if (!block) return {};
            return {
              title: block.subjectName,
              subtitle: block.teacherName,
              meta: block.locationName,
              color: view.colorMap.get(block.subjectName),
            };
          }),
        };
      }),
      legend: view.blocks.map((block) => ({
        label: block.subjectName,
        description: block.teacherName,
        meta: block.locationName,
        color: view.colorMap.get(block.subjectName)!,
      })),
    };
  }, [data, view]);

  function handlePrint() {
    if (!printDocument) return;
    try {
      printTableDocument(printDocument);
      setPrintOpen(false);
    } catch (err) {
      toast({
        title: "Nao foi possivel imprimir",
        description: err instanceof Error ? err.message : "Verifique se o navegador bloqueou a janela de impressao.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Horario escolar" description="Consulte o horario de aulas da sua turma e imprima em PDF." />

      {isLoading && <LoadingCard />}
      {error && <EmptyCard message={error instanceof Error ? error.message : "Falha ao carregar o horario."} />}
      {!isLoading && !error && (!data || !view) && (
        <EmptyCard message="Nenhum horario publicado para a sua turma no semestre ativo." />
      )}

      {!isLoading && !error && data && view && (
        <Card className="rounded-lg">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-5 w-5 text-primary" />
                {data.classSection.code} - {data.classSection.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {data.academicTermCode} · {PERIOD_LABELS[view.period]} · {data.classSection.currentStageNumber}a etapa
              </p>
            </div>
            <Button type="button" onClick={() => setPrintOpen(true)}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir em PDF
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="w-28 p-2 text-left font-medium text-muted-foreground">Horario</th>
                    {DAYS.map((day) => (
                      <th key={day.key} className="p-2 text-left font-medium text-muted-foreground">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIOD_ROWS[view.period].map((row, rowIndex) => {
                    if (row.kind === "interval") {
                      return (
                        <tr key={`interval-${rowIndex}`} className="border-b bg-muted/40">
                          <td colSpan={DAYS.length + 1} className="p-2 text-center text-xs font-medium text-muted-foreground">
                            Intervalo · {row.label}
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={`lesson-${row.lessonNumber}`} className="border-b align-top">
                        <td className="p-2 text-xs font-medium text-muted-foreground">{row.label}</td>
                        {DAYS.map((day) => {
                          const block = view.blockAt(day.key, row.lessonNumber);
                          return (
                            <td key={day.key} className="p-1.5">
                              {block ? (
                                <ScheduleCell
                                  color={view.colorMap.get(block.subjectName)}
                                  title={block.subjectName}
                                  subtitle={`Prof. ${block.teacherName}`}
                                  meta={block.locationName}
                                />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <PrintTableDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        onConfirm={handlePrint}
        description="Sera gerada a impressao em PDF do seu horario. No dialogo do navegador, selecione salvar como PDF."
      />
    </div>
  );
}

function TeacherSchedule({ userName }: { userName: string }) {
  const { toast } = useToast();
  const { data, isLoading, error } = useTeacherSchedule(true);
  const [printOpen, setPrintOpen] = useState(false);

  const view = useMemo(() => {
    if (!data || data.items.length === 0) return null;
    const itemByKey = new Map(
      data.items.map((item) => [`${item.period}-${item.lessonNumber}-${item.dayOfWeek}`, item]),
    );
    const rowKeys = new Map<string, { period: Period; lessonNumber: number }>();
    for (const item of data.items) {
      rowKeys.set(`${item.period}-${item.lessonNumber}`, {
        period: item.period as Period,
        lessonNumber: item.lessonNumber,
      });
    }
    const rows = Array.from(rowKeys.values()).sort((a, b) => {
      const periodDiff = PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period);
      return periodDiff !== 0 ? periodDiff : a.lessonNumber - b.lessonNumber;
    });
    const colorMap = buildColorMap(data.items.map((item) => item.subjectName));
    const itemAt = (period: Period, lessonNumber: number, day: DayOfWeek) =>
      itemByKey.get(`${period}-${lessonNumber}-${day}`) ?? null;
    return { rows, colorMap, itemAt };
  }, [data]);

  const printDocument = useMemo<PrintTableDocument | null>(() => {
    if (!data || !view) return null;
    return {
      title: "Horario do professor",
      subtitle: userName,
      details: [`Semestre: ${data.academicTermCode}`, `Gerado em: ${new Date().toLocaleString("pt-BR")}`],
      columns: DAYS.map((day) => day.label),
      rows: view.rows.map((row) => ({
        header: `${PERIOD_LABELS[row.period]} · ${lessonTimeLabel(row.period, row.lessonNumber)}`,
        kind: "data" as const,
        cells: DAYS.map((day) => {
          const item = view.itemAt(row.period, row.lessonNumber, day.key);
          if (!item) return {};
          return {
            title: item.subjectName,
            subtitle: `${item.classSectionCode} - ${item.classSectionName}`,
            meta: item.locationName,
            color: view.colorMap.get(item.subjectName),
          };
        }),
      })),
      legend: Array.from(new Set(data.items.map((item) => item.subjectName))).map((subjectName) => ({
        label: subjectName,
        color: view.colorMap.get(subjectName)!,
      })),
    };
  }, [data, view, userName]);

  function handlePrint() {
    if (!printDocument) return;
    try {
      printTableDocument(printDocument);
      setPrintOpen(false);
    } catch (err) {
      toast({
        title: "Nao foi possivel imprimir",
        description: err instanceof Error ? err.message : "Verifique se o navegador bloqueou a janela de impressao.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Horario escolar" description="Consulte os horarios em que voce tem aula e imprima em PDF." />

      {isLoading && <LoadingCard />}
      {error && <EmptyCard message={error instanceof Error ? error.message : "Falha ao carregar o horario."} />}
      {!isLoading && !error && !view && (
        <EmptyCard message="Voce nao possui aulas alocadas no semestre ativo." />
      )}

      {!isLoading && !error && data && view && (
        <Card className="rounded-lg">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarClock className="h-5 w-5 text-primary" />
                Minhas aulas
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {data.academicTermCode} · apenas os horarios com aula sao exibidos.
              </p>
            </div>
            <Button type="button" onClick={() => setPrintOpen(true)}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir em PDF
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="w-44 p-2 text-left font-medium text-muted-foreground">Horario</th>
                    {DAYS.map((day) => (
                      <th key={day.key} className="p-2 text-left font-medium text-muted-foreground">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.rows.map((row) => (
                    <tr key={`${row.period}-${row.lessonNumber}`} className="border-b align-top">
                      <td className="p-2 text-xs font-medium text-muted-foreground">
                        {PERIOD_LABELS[row.period]}
                        <br />
                        {lessonTimeLabel(row.period, row.lessonNumber)}
                      </td>
                      {DAYS.map((day) => {
                        const item = view.itemAt(row.period, row.lessonNumber, day.key);
                        return (
                          <td key={day.key} className="p-1.5">
                            {item ? (
                              <ScheduleCell
                                color={view.colorMap.get(item.subjectName)}
                                title={item.subjectName}
                                subtitle={`${item.classSectionCode} - ${item.classSectionName}`}
                                meta={item.locationName}
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <PrintTableDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        onConfirm={handlePrint}
        description="Sera gerada a impressao em PDF do seu horario. No dialogo do navegador, selecione salvar como PDF."
      />
    </div>
  );
}
