import type { ReactNode } from "react";
import { BookOpen, CalendarX, MapPin, UserRound } from "lucide-react";

import { useMyDisciplines } from "@/hooks/use-my-disciplines";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PERIOD_LABELS, type Period } from "@/lib/schedule-grid";
import { cn } from "@/lib/utils";
import type { StudentDisciplineItem, TeacherDisciplineItem } from "@shared/routes";

// Rotulo/cor de estado da matricula, alinhado ao padrao da pagina de alunos.
function statusBadge(status: string) {
  if (status === "active") return { label: "Ativa", className: "text-green-700 bg-green-50 border-green-200" };
  if (status === "locked") return { label: "Trancada", className: "text-amber-700 bg-amber-50 border-amber-200" };
  if (status === "completed") return { label: "Concluida", className: "text-blue-700 bg-blue-50 border-blue-200" };
  if (status === "dropped") return { label: "Evadida", className: "text-muted-foreground bg-slate-50 border-border" };
  if (status === "canceled") return { label: "Cancelada", className: "text-muted-foreground bg-slate-50 border-border" };
  return { label: status, className: "text-muted-foreground bg-slate-50 border-border" };
}

function absenceTone(absences: number) {
  if (absences === 0) return "text-muted-foreground";
  if (absences <= 2) return "text-amber-700";
  return "text-destructive";
}

function HoverRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

function StudentDisciplineCard({ item }: { item: StudentDisciplineItem }) {
  const badge = statusBadge(item.status);
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="group w-full rounded-xl border border-border/60 bg-card p-4 text-left shadow-sm ring-1 ring-black/[0.02] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium leading-tight">{item.subjectName}</p>
            <Badge variant="outline" className="shrink-0">
              {item.classSectionCode}
            </Badge>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className={cn("text-xs font-medium", absenceTone(item.absences))}>
              {item.absences === 0 ? "Sem faltas" : `${item.absences} falta${item.absences > 1 ? "s" : ""}`}
            </span>
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", badge.className)}>
              {badge.label}
            </span>
          </div>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 space-y-2.5">
        <p className="font-display text-sm font-semibold tracking-tight">{item.subjectName}</p>
        <div className="space-y-2 border-t border-border/60 pt-2.5">
          <HoverRow icon={<MapPin className="h-3.5 w-3.5" />} label="Sala" value={item.locationName} />
          <HoverRow icon={<UserRound className="h-3.5 w-3.5" />} label="Professor" value={item.teacherName} />
          <HoverRow
            icon={<CalendarX className="h-3.5 w-3.5" />}
            label="Frequencia"
            value={item.absences === 0 ? "Sem faltas" : `${item.absences} falta${item.absences > 1 ? "s" : ""}`}
          />
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Estado</span>
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", badge.className)}>
              {badge.label}
            </span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function TeacherDisciplineCard({ item }: { item: TeacherDisciplineItem }) {
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="group w-full rounded-xl border border-border/60 bg-card p-4 text-left shadow-sm ring-1 ring-black/[0.02] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium leading-tight">{item.subjectName}</p>
            <Badge variant="outline" className="shrink-0">
              {item.classSectionCode}
            </Badge>
          </div>
          <p className="mt-3 truncate text-xs text-muted-foreground">{item.classSectionName}</p>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 space-y-2.5">
        <p className="font-display text-sm font-semibold tracking-tight">{item.subjectName}</p>
        <div className="space-y-2 border-t border-border/60 pt-2.5">
          <HoverRow icon={<BookOpen className="h-3.5 w-3.5" />} label="Turma" value={item.classSectionName} />
          <HoverRow icon={<MapPin className="h-3.5 w-3.5" />} label="Sala" value={item.locationName} />
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Periodo</span>
            <span className="font-medium">{PERIOD_LABELS[item.period as Period]}</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

interface DisciplinesGridProps {
  role: "student" | "teacher";
}

// Grade de "Minhas disciplinas" com hover detalhado (sala/professor/faltas/estado).
export function DisciplinesGrid({ role }: DisciplinesGridProps) {
  const { data, isLoading } = useMyDisciplines(true);

  if (isLoading) return <LoadingState />;

  const studentItems = data?.studentItems ?? [];
  const teacherItems = data?.teacherItems ?? [];
  const isEmpty = role === "student" ? studentItems.length === 0 : teacherItems.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        message="Nenhuma disciplina vinculada ainda."
        icon={<BookOpen className="h-5 w-5" strokeWidth={1.75} />}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {role === "student"
        ? studentItems.map((item) => <StudentDisciplineCard key={item.subjectId} item={item} />)
        : teacherItems.map((item) => (
            <TeacherDisciplineCard key={`${item.classSectionCode}-${item.subjectId}`} item={item} />
          ))}
    </div>
  );
}
