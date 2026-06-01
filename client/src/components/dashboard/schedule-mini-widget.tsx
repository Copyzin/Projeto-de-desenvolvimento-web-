import { useStudentSchedule, useTeacherSchedule } from "@/hooks/use-my-schedule";
import {
  DAYS,
  LESSON_NUMBERS,
  lessonTimeLabel,
  PERIOD_LABELS,
  type DayOfWeek,
  type Period,
} from "@/lib/schedule-grid";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { cn } from "@/lib/utils";

import { BentoCard, BentoHeader } from "./bento";

type Cell = { title: string; subtitle?: string } | null;
type PeriodGrid = { period: Period; cellAt: (day: DayOfWeek, lessonNumber: number) => Cell };

// Retorna as 3 palavras mais longas do titulo, ordenadas pela posicao original,
// seguidas de "…" se o titulo original era mais longo.
function condenseName(title: string): string {
  const words = title.trim().split(/\s+/);
  if (words.length <= 3) return title;
  const indexed = words.map((w, i) => ({ w, i }));
  const top3 = indexed
    .slice()
    .sort((a, b) => b.w.length - a.w.length)
    .slice(0, 3)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.w);
  return top3.join(" ") + " …";
}

const WEEKDAY_INDEX_TO_DAY: Record<number, DayOfWeek | undefined> = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
};

// Dia util "de hoje" (demonstrativo): usa o relogio do navegador para destacar a coluna.
function todayDay(): DayOfWeek | null {
  return WEEKDAY_INDEX_TO_DAY[new Date().getDay()] ?? null;
}

interface ScheduleMiniWidgetProps {
  role: "student" | "teacher";
}

// Grade compacta da semana (Seg-Sex x 4 aulas) reutilizando a fonte unica schedule-grid.
export function ScheduleMiniWidget({ role }: ScheduleMiniWidgetProps) {
  const studentQuery = useStudentSchedule(role === "student");
  const teacherQuery = useTeacherSchedule(role === "teacher");

  const isLoading = role === "student" ? studentQuery.isLoading : teacherQuery.isLoading;
  const today = todayDay();

  const periods: PeriodGrid[] = [];

  if (role === "student" && studentQuery.data?.schedule) {
    const schedule = studentQuery.data.schedule;
    const blockById = new Map(schedule.blocks.map((block) => [block.id, block]));
    periods.push({
      period: studentQuery.data.classSection.period,
      cellAt: (day, lessonNumber) => {
        const slot = schedule.slots.find((s) => s.dayOfWeek === day && s.lessonNumber === lessonNumber);
        if (!slot) return null;
        const block = blockById.get(slot.blockId);
        if (!block) return null;
        return { title: block.subjectName, subtitle: block.locationName };
      },
    });
  }

  if (role === "teacher" && teacherQuery.data?.items.length) {
    const items = teacherQuery.data.items;
    const presentPeriods = Array.from(new Set(items.map((item) => item.period))) as Period[];
    for (const period of presentPeriods) {
      periods.push({
        period,
        cellAt: (day, lessonNumber) => {
          const item = items.find(
            (i) => i.period === period && i.dayOfWeek === day && i.lessonNumber === lessonNumber,
          );
          if (!item) return null;
          return { title: item.subjectName, subtitle: item.classSectionCode };
        },
      });
    }
  }

  return (
    <BentoCard className="h-full">
      <BentoHeader
        eyebrow="Calendario de horarios"
        title="Sua semana"
        linkHref="/schedule"
        linkLabel="Horario completo"
      />

      {isLoading ? (
        <LoadingState className="py-10" />
      ) : periods.length === 0 ? (
        <EmptyState message="Nenhum horario publicado ainda." />
      ) : (
        <div className="space-y-5">
          {periods.map(({ period, cellAt }) => (
            <div key={period}>
              {periods.length > 1 && (
                <p className="mb-2 text-xs font-medium text-muted-foreground">{PERIOD_LABELS[period]}</p>
              )}
              <table className="w-full table-fixed border-separate border-spacing-0.5 text-xs">
                  <colgroup>
                    {/* coluna de horario estreita; 5 colunas de dia dividem o restante */}
                    <col className="w-[4.5rem]" />
                    <col /><col /><col /><col /><col />
                  </colgroup>
                  <thead>
                    <tr>
                      <th />
                      {DAYS.map((day) => (
                        <th
                          key={day.key}
                          className={cn(
                            "rounded-md px-0.5 py-1 text-center text-[10px] font-medium text-muted-foreground",
                            day.key === today && "bg-primary/10 text-primary",
                          )}
                        >
                          {day.label.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {LESSON_NUMBERS.map((lessonNumber) => (
                      <tr key={lessonNumber}>
                        <td className="pr-1 text-right text-[9px] leading-tight text-muted-foreground">
                          {lessonTimeLabel(period, lessonNumber).replace(" - ", "–")}
                        </td>
                        {DAYS.map((day) => {
                          const cell = cellAt(day.key, lessonNumber);
                          return (
                            <td key={day.key} className="align-top">
                              {cell ? (
                                <div
                                  className={cn(
                                    "min-h-[2.6rem] overflow-hidden rounded-md border border-border/60 bg-muted/40 px-1.5 py-1.5",
                                    day.key === today && "ring-1 ring-primary/30",
                                  )}
                                >
                                  <p
                                    className="break-words text-[10px] font-medium leading-[1.3]"
                                    title={cell.title}
                                  >
                                    {condenseName(cell.title)}
                                  </p>
                                  {cell.subtitle && (
                                    <p className="truncate text-[9px] text-muted-foreground">{cell.subtitle}</p>
                                  )}
                                </div>
                              ) : (
                                <div className="min-h-[2.6rem] rounded-md border border-dashed border-border/40" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          ))}
        </div>
      )}
    </BentoCard>
  );
}
