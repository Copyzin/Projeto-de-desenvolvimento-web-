import { Link } from "wouter";
import { BookOpen, GraduationCap, Layers, Users } from "lucide-react";

import { useCourses } from "@/hooks/use-courses";
import { useEnrollments } from "@/hooks/use-enrollments";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";

import { BentoCard, BentoHeader } from "./bento";

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-2xl font-bold leading-none">{value}</p>
    </div>
  );
}

// Bloco-resumo de gestao para o admin (cursos, matriculas e alunos distintos).
export function ManagementSummary() {
  const { courses, isLoading: coursesLoading } = useCourses();
  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrollments();

  const isLoading = coursesLoading || enrollmentsLoading;
  const courseList = courses ?? [];
  const enrollmentList = enrollments ?? [];
  const distinctStudents = new Set(enrollmentList.map((item) => item.studentId)).size;

  return (
    <BentoCard className="h-full">
      <BentoHeader eyebrow="Visao de gestao" title="Panorama academico" linkHref="/courses" linkLabel="Ver cursos" />

      {isLoading ? (
        <LoadingState className="py-10" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatTile icon={BookOpen} label="Cursos" value={courseList.length} />
            <StatTile icon={Layers} label="Matriculas" value={enrollmentList.length} />
            <StatTile icon={GraduationCap} label="Alunos" value={distinctStudents} />
          </div>

          {courseList.length === 0 ? (
            <EmptyState message="Nenhum curso cadastrado ainda." />
          ) : (
            <ul className="space-y-2">
              {courseList.slice(0, 5).map((course) => (
                <li key={course.id}>
                  <Link
                    href={`/courses/${course.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5 text-sm transition-colors duration-300 hover:border-primary/30 hover:text-primary"
                  >
                    <span className="truncate font-medium">{course.name}</span>
                    <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </BentoCard>
  );
}
