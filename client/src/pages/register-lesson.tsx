import { useEffect, useMemo, useState } from "react";
import { type z } from "zod";
import { CalendarX, Flag } from "lucide-react";

import { api } from "@shared/routes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useStudents } from "@/hooks/use-students";
import { useTeacherDayLessons, useSaveLessonRecord } from "@/hooks/use-teacher-lessons";
import { DAYS, PERIOD_LABELS, lessonTimeLabel, type DayOfWeek } from "@/lib/schedule-grid";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type DayLessonsResponse = z.infer<typeof api.teacherLessons.listByDate.responses[200]>;
type LessonItem = DayLessonsResponse["items"][number];

// Coordenacao academica (reportar aluno via WhatsApp): 55 14 99629-5522.
const REPORT_PHONE = "5514996295522";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toISODate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function buildReportUrl(student: { ra: string; name: string; phone?: string | null }, turma: string) {
  const message =
    "Ocorrencia de aluno para a coordenacao:\n" +
    `Nome: ${student.name}\n` +
    `RA: ${student.ra}\n` +
    `Turma: ${turma}\n` +
    `Telefone: ${student.phone ?? "nao informado"}`;
  return `https://wa.me/${REPORT_PHONE}?text=${encodeURIComponent(message)}`;
}

export default function RegisterLesson() {
  const { user } = useAuth();

  // Datas da semana atual (segunda a sexta) — modo demonstrativo permite escolher
  // qualquer dia util. Em producao, o dia ficaria travado no dia atual.
  const { weekDates, defaultDay } = useMemo(() => {
    const today = new Date();
    const dow = today.getDay(); // 0=Dom..6=Sab
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const dates = {} as Record<DayOfWeek, string>;
    DAYS.forEach((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      dates[day.key] = toISODate(date);
    });
    const fallback: DayOfWeek = dow >= 1 && dow <= 5 ? DAYS[dow - 1].key : "monday";
    return { weekDates: dates, defaultDay: fallback };
  }, []);

  const [dayKey, setDayKey] = useState<DayOfWeek>(defaultDay);
  const selectedDate = weekDates[dayKey];

  const { data, isLoading, error } = useTeacherDayLessons(selectedDate);
  const saveMutation = useSaveLessonRecord(selectedDate);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [absences, setAbsences] = useState<Record<string, Set<string>>>({});

  // Chave local namespaceada por data (o mesmo turma+disciplina ocorre em varios dias).
  const lk = (itemKey: string) => `${selectedDate}:${itemKey}`;

  // Semeia conteudo/faltas a partir do servidor apenas para chaves ainda nao tocadas,
  // preservando edicoes em andamento de outras aulas/dias.
  useEffect(() => {
    if (!data) return;
    setContents((prev) => {
      const next = { ...prev };
      for (const item of data.items) {
        const key = `${data.date}:${item.key}`;
        if (!(key in next)) next[key] = item.record?.content ?? "";
      }
      return next;
    });
    setAbsences((prev) => {
      const next = { ...prev };
      for (const item of data.items) {
        const key = `${data.date}:${item.key}`;
        if (!(key in next)) {
          next[key] = new Set(item.absences.map((absence) => `${absence.studentId}-${absence.lessonNumber}`));
        }
      }
      return next;
    });
  }, [data]);

  useEffect(() => {
    if (!data || data.items.length === 0) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey((current) =>
      current && data.items.some((item) => item.key === current) ? current : data.items[0].key,
    );
  }, [data]);

  function toggleAbsence(itemKey: string, studentId: number, lessonNumber: number) {
    setAbsences((prev) => {
      const key = lk(itemKey);
      const set = new Set(prev[key] ?? []);
      const id = `${studentId}-${lessonNumber}`;
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, [key]: set };
    });
  }

  // Faltou o dia todo: marca/desmarca o aluno em todas as aulas desta turma no dia.
  function toggleAllDay(classSectionId: number, studentId: number) {
    if (!data) return;
    const sectionItems = data.items.filter((item) => item.classSectionId === classSectionId);
    setAbsences((prev) => {
      const fullyAbsent = sectionItems.every((item) => {
        const set = prev[lk(item.key)] ?? new Set<string>();
        return item.lessonNumbers.every((ln) => set.has(`${studentId}-${ln}`));
      });
      const next = { ...prev };
      for (const item of sectionItems) {
        const set = new Set(next[lk(item.key)] ?? prev[lk(item.key)] ?? []);
        for (const ln of item.lessonNumbers) {
          const id = `${studentId}-${ln}`;
          if (fullyAbsent) set.delete(id);
          else set.add(id);
        }
        next[lk(item.key)] = set;
      }
      return next;
    });
  }

  function handleSave(item: LessonItem) {
    const set = absences[lk(item.key)] ?? new Set<string>();
    const absencesList = Array.from(set).map((entry) => {
      const [studentId, lessonNumber] = entry.split("-");
      return { studentId: Number(studentId), lessonNumber: Number(lessonNumber) };
    });
    saveMutation.mutate({
      classSectionId: item.classSectionId,
      subjectId: item.subjectId,
      date: selectedDate,
      lessonNumbers: item.lessonNumbers,
      content: (contents[lk(item.key)] ?? "").trim(),
      absences: absencesList,
    });
  }

  if (!user || user.role !== "teacher") {
    return (
      <div className="space-y-6">
        <PageHeader title="Registrar Aula" description="Area exclusiva do professor." />
        <EmptyState message="Esta ferramenta e exclusiva para professores." />
      </div>
    );
  }

  const items = data?.items ?? [];
  const selectedItem = items.find((item) => item.key === selectedKey) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registrar Aula"
        description="Registre o conteudo trabalhado e a presenca das suas turmas, por dia."
      />

      <Card className="rounded-lg">
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {DAYS.map((day) => (
              <Button
                key={day.key}
                type="button"
                size="sm"
                variant={day.key === dayKey ? "default" : "outline"}
                onClick={() => setDayKey(day.key)}
              >
                {day.label}
              </Button>
            ))}
            <span className="ml-1 text-sm text-muted-foreground">{formatBR(selectedDate)}</span>
          </div>
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Modo demonstracao: qualquer dia util pode ser escolhido. Em producao, o dia ficaria travado no dia atual.
          </p>
        </CardContent>
      </Card>

      {isLoading && <LoadingState />}
      {error && (
        <EmptyState message={error instanceof Error ? error.message : "Falha ao carregar as aulas do dia."} />
      )}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState message="Nenhuma aula encontrada para este dia." />
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
          {/* Lista (mestre) */}
          <Card className="rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Aulas do dia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {items.map((item) => {
                const active = item.key === selectedKey;
                const saved = item.record !== null;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedKey(item.key)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                      active
                        ? "border-primary/30 bg-primary/10 ring-1 ring-primary/20"
                        : "border-transparent hover:bg-muted/60",
                    )}
                  >
                    <p className="text-sm font-semibold leading-tight">{item.subjectName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.classSectionCode} - {item.classSectionName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {item.lessonNumbers.map((ln) => (
                        <Badge key={ln} variant="outline" className="text-[10px]">
                          {lessonTimeLabel(item.period, ln)}
                        </Badge>
                      ))}
                      {saved && <Badge className="text-[10px]">Registrada</Badge>}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Painel (detalhe) */}
          {selectedItem ? (
            <LessonPanel
              key={`${selectedDate}:${selectedItem.key}`}
              item={selectedItem}
              content={contents[lk(selectedItem.key)] ?? ""}
              absentSet={absences[lk(selectedItem.key)] ?? new Set<string>()}
              saving={saveMutation.isPending}
              onContentChange={(value) =>
                setContents((prev) => ({ ...prev, [lk(selectedItem.key)]: value }))
              }
              onToggleAbsence={(studentId, lessonNumber) =>
                toggleAbsence(selectedItem.key, studentId, lessonNumber)
              }
              onToggleAllDay={(studentId) => toggleAllDay(selectedItem.classSectionId, studentId)}
              onSave={() => handleSave(selectedItem)}
            />
          ) : (
            <Card className="rounded-lg">
              <CardContent className="py-10">
                <EmptyState message="Selecione uma aula a esquerda." />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function LessonPanel({
  item,
  content,
  absentSet,
  saving,
  onContentChange,
  onToggleAbsence,
  onToggleAllDay,
  onSave,
}: {
  item: LessonItem;
  content: string;
  absentSet: Set<string>;
  saving: boolean;
  onContentChange: (value: string) => void;
  onToggleAbsence: (studentId: number, lessonNumber: number) => void;
  onToggleAllDay: (studentId: number) => void;
  onSave: () => void;
}) {
  const { data: students, isLoading } = useStudents(
    { classSectionId: item.classSectionId, status: "active" },
    true,
  );
  const roster = students ?? [];
  const turma = `${item.classSectionCode} - ${item.classSectionName}`;
  const multiLesson = item.lessonNumbers.length > 1;

  return (
    <Card className="rounded-lg">
      <CardHeader className="flex flex-col gap-2 pb-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle className="text-lg">{item.subjectName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {turma} - {PERIOD_LABELS[item.period]} - {item.locationName}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {item.lessonNumbers.map((ln) => (
              <Badge key={ln} variant="outline" className="text-[11px]">
                Aula {ln} - {lessonTimeLabel(item.period, ln)}
              </Badge>
            ))}
          </div>
        </div>
        <Button type="button" onClick={onSave} disabled={!content.trim() || saving}>
          {saving ? "Salvando..." : "Salvar registro"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor={`content-${item.key}`}>
            O que foi trabalhado <span className="text-destructive">*</span>
          </label>
          <Textarea
            id={`content-${item.key}`}
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            placeholder="Descreva o conteudo trabalhado nesta aula (obrigatorio)."
            className="min-h-[96px]"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Presenca</p>
            <p className="text-xs text-muted-foreground">
              Todos presentes por padrao - marque apenas as faltas.
            </p>
          </div>

          {isLoading ? (
            <LoadingState />
          ) : roster.length === 0 ? (
            <EmptyState message="Nenhum aluno ativo nesta turma." />
          ) : (
            <div className="divide-y rounded-lg border">
              {roster.map((student) => {
                const allDay = item.lessonNumbers.every((ln) => absentSet.has(`${student.id}-${ln}`));
                return (
                  <div key={student.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">RA {student.ra}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.lessonNumbers.map((ln) => {
                        const id = `${student.id}-${ln}`;
                        return (
                          <label key={ln} className="flex items-center gap-1.5 text-xs">
                            <Checkbox
                              checked={absentSet.has(id)}
                              onCheckedChange={() => onToggleAbsence(student.id, ln)}
                              aria-label={`Falta de ${student.name} na aula ${ln}`}
                            />
                            <span className="text-muted-foreground">{multiLesson ? `Aula ${ln}` : "Falta"}</span>
                          </label>
                        );
                      })}

                      {multiLesson && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Marcar falta de ${student.name} no dia todo`}
                              className={cn("h-8 w-8", allDay && "text-primary")}
                              onClick={() => onToggleAllDay(student.id)}
                            >
                              <CalendarX className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Faltou o dia todo (todas as aulas desta turma)</TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Reportar ${student.name} a coordenacao`}
                            className="h-8 w-8 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() =>
                              window.open(buildReportUrl(student, turma), "_blank", "noopener")
                            }
                          >
                            <Flag className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reportar a coordenacao (WhatsApp)</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
