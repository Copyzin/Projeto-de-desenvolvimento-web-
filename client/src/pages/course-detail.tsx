import { Fragment, useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { Calendar, Clock, Save, Search, User, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useCourse,
  useCourseSubjects,
  useCreateSubject,
  useSubjects,
  useUpdateCourseSubjects,
} from "@/hooks/use-courses";
import { useEnrollments, useUpdateEnrollment } from "@/hooks/use-enrollments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const subjectSchema = z.object({
  name: z.string().min(2, "Nome obrigatorio"),
  description: z.string().optional(),
  workloadHours: z.coerce.number().int().min(0),
});

type SubjectForm = z.infer<typeof subjectSchema>;

export default function CourseDetail() {
  const [, params] = useRoute("/courses/:id");
  const courseId = params ? parseInt(params.id, 10) : 0;

  const { user } = useAuth();
  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrollments({ courseId });
  const classSectionContext = enrollments?.[0]?.classSectionId ?? null;
  const { data: allSubjects } = useSubjects();
  const { data: selectedSubjects } = useCourseSubjects(courseId, classSectionContext);
  const updateCourseSubjects = useUpdateCourseSubjects(courseId);
  const updateEnrollment = useUpdateEnrollment();
  const createSubject = useCreateSubject();

  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [focusedSearch, setFocusedSearch] = useState<"student" | "subject" | null>(null);

  const subjectForm = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: "",
      description: "",
      workloadHours: 60,
    },
  });

  useEffect(() => {
    if (!selectedSubjects) return;
    setSelectedSubjectIds(selectedSubjects.map((subject) => subject.id));
  }, [selectedSubjects]);

  const canEditGrades = user?.role === "teacher";
  const canEditCurriculum = user?.role === "admin";
  const canViewStudentsList = user?.role === "teacher" || user?.role === "admin";

  const enrollmentRows = useMemo(() => enrollments ?? [], [enrollments]);
  const filteredEnrollmentRows = useMemo(() => {
    const normalizedSearch = studentSearch.trim().toLowerCase();
    if (!normalizedSearch) return enrollmentRows;

    return enrollmentRows.filter((enrollment) => {
      return (
        (enrollment.studentName || "").toLowerCase().includes(normalizedSearch) ||
        (enrollment.studentEmail || "").toLowerCase().includes(normalizedSearch) ||
        (enrollment.studentRa || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [enrollmentRows, studentSearch]);

  const curriculumRows = useMemo(() => {
    const selectedById = new Map((selectedSubjects ?? []).map((subject) => [subject.id, subject]));
    const sourceSubjects = canEditCurriculum
      ? (allSubjects ?? []).map((subject) => ({
          ...subject,
          stageNumber: selectedById.get(subject.id)?.stageNumber ?? subject.stageNumber ?? 1,
          teacherNames: selectedById.get(subject.id)?.teacherNames,
          academicStatus: selectedById.get(subject.id)?.academicStatus,
        }))
      : (selectedSubjects ?? []).filter((subject) => selectedSubjectIds.includes(subject.id));

    const normalizedSearch = subjectSearch.trim().toLowerCase();
    if (!canEditCurriculum || !normalizedSearch) return sourceSubjects;

    return sourceSubjects.filter((subject) => {
      return (
        subject.name.toLowerCase().includes(normalizedSearch) ||
        String(subject.workloadHours).includes(normalizedSearch)
      );
    });
  }, [allSubjects, canEditCurriculum, selectedSubjectIds, selectedSubjects, subjectSearch]);

  const curriculumByStage = useMemo(() => {
    const grouped = new Map<number, typeof curriculumRows>();
    for (const subject of curriculumRows) {
      const stage = subject.stageNumber ?? 1;
      grouped.set(stage, [...(grouped.get(stage) ?? []), subject]);
    }
    return Array.from(grouped.entries()).sort(([stageA], [stageB]) => stageA - stageB);
  }, [curriculumRows]);

  if (courseLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!course) {
    return <div className="p-8 text-center">Curso nao encontrado.</div>;
  }

  function toggleSubject(subjectId: number, checked: boolean) {
    setSelectedSubjectIds((current) => {
      if (checked) {
        if (current.includes(subjectId)) return current;
        return [...current, subjectId];
      }
      return current.filter((id) => id !== subjectId);
    });
  }

  function saveCurriculum() {
    const stageNumbers = Object.fromEntries(
      (selectedSubjects ?? []).map((subject) => [subject.id, subject.stageNumber ?? 1]),
    );
    updateCourseSubjects.mutate({ subjectIds: selectedSubjectIds, stageNumbers });
  }

  function handleGradeUpdate(id: number, grade?: number, attendance?: number) {
    updateEnrollment.mutate({
      id,
      grade,
      attendance,
    });
  }

  function onCreateSubject(data: SubjectForm) {
    createSubject.mutate(data, {
      onSuccess: () => {
        setIsSubjectDialogOpen(false);
        subjectForm.reset({ name: "", description: "", workloadHours: 60 });
      },
    });
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-8 border border-border shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                {course.code}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Periodo definido por turma
              </span>
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">{course.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="font-medium">{course.classSectionCount ?? 0} turmas cadastradas</span>
            </div>
          </div>          {user?.role === "admin" && (
            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
              Matriculas realizadas na aba Alunos
            </Badge>
          )}
        </div>
        <p className="mt-6 text-muted-foreground max-w-3xl leading-relaxed">
          {course.description || "Sem descricao cadastrada para este curso."}
        </p>
      </div>

      <Tabs defaultValue={canViewStudentsList ? "students" : "curriculum"} className="space-y-6">
        <TabsList className="bg-white p-1 border border-border rounded-xl">
          {canViewStudentsList && (
            <TabsTrigger value="students" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Users className="w-4 h-4 mr-2" />
              Alunos matriculados
            </TabsTrigger>
          )}
          <TabsTrigger value="curriculum" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Calendar className="w-4 h-4 mr-2" />
            Grade curricular
          </TabsTrigger>
        </TabsList>

        {canViewStudentsList && (
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Alunos e desempenho</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollmentsLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : enrollmentRows.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum aluno matriculado.</p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border-2 border-primary/25 bg-white p-3 shadow-sm">
                    <Label htmlFor="course-student-search" className="text-xs font-semibold uppercase text-muted-foreground">
                      Buscar aluno
                    </Label>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="course-student-search"
                        className="pl-10 bg-white border-primary/30 focus-visible:ring-primary/30"
                        placeholder={focusedSearch === "student" ? "" : "Nome, e-mail ou R.A"}
                        value={studentSearch}
                        onFocus={() => setFocusedSearch("student")}
                        onBlur={() => setFocusedSearch(null)}
                        onChange={(event) => setStudentSearch(event.target.value)}
                      />
                    </div>
                  </div>

                  {filteredEnrollmentRows.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhum aluno encontrado para a pesquisa.</p>
                  ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>R.A</TableHead>
                      <TableHead>Data de matricula</TableHead>
                      <TableHead>Faltas</TableHead>
                      <TableHead>Nota (0-10)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEnrollmentRows.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.studentName}</TableCell>
                        <TableCell>{item.studentRa}</TableCell>
                        <TableCell>
                          {item.enrolledAt ? new Date(item.enrolledAt).toLocaleDateString("pt-BR") : "-"}
                        </TableCell>
                        <TableCell>
                          {canEditGrades ? (
                            <Input
                              type="number"
                              className="w-24 h-8"
                              min={0}
                              max={500}
                              step={1}
                              defaultValue={item.attendance ?? 0}
                              onBlur={(event) => {
                                const attendance = Number(event.target.value);
                                if (Number.isNaN(attendance)) return;
                                handleGradeUpdate(item.id, item.grade ?? undefined, attendance);
                              }}
                            />
                          ) : (
                            <Badge variant="outline">{item.attendance ?? 0}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {canEditGrades ? (
                            <Input
                              type="number"
                              className="w-24 h-8"
                              min={0}
                              max={10}
                              step={0.1}
                              defaultValue={item.grade ?? ""}
                              onBlur={(event) => {
                                const grade = Number(event.target.value);
                                if (Number.isNaN(grade)) return;
                                handleGradeUpdate(item.id, grade, item.attendance ?? undefined);
                              }}
                            />
                          ) : (
                            <span className="font-semibold">{item.grade ?? "-"}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        <TabsContent value="curriculum">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Materias do curso</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {canEditCurriculum
                    ? "Selecione materias da lista existente e salve a grade curricular."
                    : "Visualizacao da grade curricular cadastrada."}
                </p>
              </div>

              {canEditCurriculum && (
                <div className="flex gap-2">
                  <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Nova materia</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cadastrar materia</DialogTitle>
                      </DialogHeader>

                      <form onSubmit={subjectForm.handleSubmit(onCreateSubject)} className="space-y-4 mt-3">
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <Input {...subjectForm.register("name")} />
                          {subjectForm.formState.errors.name && (
                            <p className="text-xs text-destructive">{subjectForm.formState.errors.name.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Carga horaria</Label>
                          <Input type="number" {...subjectForm.register("workloadHours")} />
                        </div>
                        <div className="space-y-2">
                          <Label>Descricao</Label>
                          <Textarea {...subjectForm.register("description")} />
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={createSubject.isPending}>
                            {createSubject.isPending ? "Salvando..." : "Salvar materia"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Button onClick={saveCurriculum} disabled={updateCourseSubjects.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar grade
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {canEditCurriculum && (
                <div className="rounded-lg border-2 border-primary/25 bg-white p-3 shadow-sm">
                  <Label htmlFor="course-subject-search" className="text-xs font-semibold uppercase text-muted-foreground">
                    Buscar materia
                  </Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="course-subject-search"
                      className="pl-10 bg-white border-primary/30 focus-visible:ring-primary/30"
                      placeholder={focusedSearch === "subject" ? "" : "Nome da materia ou carga horaria"}
                      value={subjectSearch}
                      onFocus={() => setFocusedSearch("subject")}
                      onBlur={() => setFocusedSearch(null)}
                      onChange={(event) => setSubjectSearch(event.target.value)}
                    />
                  </div>
                </div>
              )}

              {curriculumRows.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[44%] text-xs sm:text-sm">Materia</TableHead>
                        <TableHead className="w-[18%] text-xs sm:text-sm">Carga horaria</TableHead>
                        <TableHead className="w-[38%] text-xs sm:text-sm">Descricao</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {curriculumByStage.map(([stage, subjects]) => (
                        <Fragment key={`stage-${stage}`}>
                          <TableRow className="bg-slate-50">
                            <TableCell colSpan={3} className="text-xs sm:text-sm font-semibold text-primary">
                              {stage}ª Etapa
                            </TableCell>
                          </TableRow>
                          {subjects.map((subject) => {
                            const checked = selectedSubjectIds.includes(subject.id);

                            return (
                              <TableRow
                                key={subject.id}
                                className={canEditCurriculum ? "cursor-pointer select-none hover:bg-primary/5" : undefined}
                                role={canEditCurriculum ? "button" : undefined}
                                tabIndex={canEditCurriculum ? 0 : undefined}
                                onClick={
                                  canEditCurriculum
                                    ? () => toggleSubject(subject.id, !checked)
                                    : undefined
                                }
                                onKeyDown={
                                  canEditCurriculum
                                    ? (event) => {
                                        if (event.key !== "Enter" && event.key !== " ") return;
                                        event.preventDefault();
                                        toggleSubject(subject.id, !checked);
                                      }
                                    : undefined
                                }
                              >
                                <TableCell className="align-top text-xs sm:text-sm">
                                  <div className="flex items-start gap-3">
                                    {canEditCurriculum && (
                                      <Checkbox
                                        checked={checked}
                                        onClick={(event) => event.stopPropagation()}
                                        onCheckedChange={(value) => toggleSubject(subject.id, Boolean(value))}
                                        aria-label={`Selecionar materia ${subject.name}`}
                                      />
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-medium leading-snug">{subject.name}</p>
                                      <p className="text-[11px] sm:text-xs text-muted-foreground">{subject.code}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="align-top text-xs sm:text-sm whitespace-nowrap">
                                  {subject.workloadHours}h
                                </TableCell>
                                <TableCell className="align-top text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                  <p>{subject.description || "Sem descricao."}</p>
                                  {subject.teacherNames && subject.teacherNames.length > 0 && (
                                    <p className="mt-1 text-[11px] sm:text-xs">
                                      Professores: {subject.teacherNames.join(", ")}
                                    </p>
                                  )}
                                  {subject.academicStatus && (
                                    <Badge variant="outline" className="mt-2">
                                      {subject.academicStatus}
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {canEditCurriculum
                    ? "Nenhuma materia encontrada para a pesquisa."
                    : "Nenhuma materia selecionada para esta grade curricular."}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
