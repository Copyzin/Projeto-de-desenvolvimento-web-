import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, Mail, Plus, Search, ShieldAlert, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEnrollStudent } from "@/hooks/use-enrollments";
import { useCourseSubjects } from "@/hooks/use-courses";
import { useLockEnrollment, useStudentScope, useStudents } from "@/hooks/use-students";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  name: z.string().min(3, "Nome completo obrigatorio"),
  cpf: z.string().min(11, "CPF obrigatorio"),
  phone: z.string().min(8, "Telefone obrigatorio"),
  email: z.string().email("E-mail invalido"),
  courseId: z.coerce.number().int().positive("Curso obrigatorio"),
  classSectionId: z.coerce.number().int().positive("Turma obrigatoria"),
});

type FormData = z.infer<typeof formSchema>;

function enrollmentStatusBadge(status: string) {
  if (status === "active") return { label: "Ativa", className: "text-green-700 bg-green-50 border-green-200" };
  if (status === "locked") return { label: "Trancada", className: "text-amber-700 bg-amber-50 border-amber-200" };
  if (status === "completed") return { label: "Concluida", className: "text-blue-700 bg-blue-50 border-blue-200" };
  return { label: status, className: "text-muted-foreground bg-slate-50 border-border" };
}

function periodLabel(period: string) {
  if (period === "matutino") return "Matutino";
  if (period === "vespertino") return "Vespertino";
  return "Noturno";
}

function sectionLabel(section: {
  code: string;
  name: string;
  period: string;
  currentStageNumber: number;
  coordinatorTeacherName?: string;
}) {
  const coordinator = section.coordinatorTeacherName ? ` - Coord.: ${section.coordinatorTeacherName}` : "";
  return `${section.code} - ${section.name} - ${periodLabel(section.period)} - ${section.currentStageNumber}ª etapa${coordinator}`;
}

export default function Students() {
  const { user } = useAuth();
  const { data: scope, isLoading: scopeLoading } = useStudentScope();
  const enrollStudent = useEnrollStudent();
  const lockEnrollment = useLockEnrollment();

  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>();
  const [selectedClassSectionId, setSelectedClassSectionId] = useState<number | undefined>();

  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [lockTarget, setLockTarget] = useState<{ enrollmentId: number; name: string; courseId: number } | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [approvedSubjectIds, setApprovedSubjectIds] = useState<number[]>([]);

  const lockCourseId = lockTarget?.courseId ?? 0;
  const { data: lockCourseSubjects } = useCourseSubjects(lockCourseId);

  const shouldFetchStudents = Boolean(selectedCourseId && selectedClassSectionId);
  const { data: students, isLoading } = useStudents(
    {
      courseId: selectedCourseId,
      classSectionId: selectedClassSectionId,
    },
    shouldFetchStudents,
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      cpf: "",
      phone: "",
      email: "",
      courseId: 0,
      classSectionId: 0,
    },
  });

  const enrollmentCourseId = form.watch("courseId");
  const sectionsBySelectedCourse = useMemo(() => {
    if (!scope?.classSections) return [];
    if (!selectedCourseId) return [];
    return scope.classSections.filter((section) => section.courseId === selectedCourseId);
  }, [scope?.classSections, selectedCourseId]);

  const sectionsForEnrollment = useMemo(() => {
    if (!scope?.classSections || !enrollmentCourseId) return [];
    return scope.classSections.filter((section) => section.courseId === enrollmentCourseId);
  }, [scope?.classSections, enrollmentCourseId]);

  const filteredStudents = useMemo(() => {
    const normalized = search.toLowerCase();
    return (
      students?.filter((student) => {
        return (
          student.name.toLowerCase().includes(normalized) ||
          student.email.toLowerCase().includes(normalized) ||
          student.ra.toLowerCase().includes(normalized) ||
          (student.phone || "").toLowerCase().includes(normalized)
        );
      }) ?? []
    );
  }, [students, search]);

  if (!user) return null;

  if (user.role === "student") {
    return (
      <div className="max-w-3xl mx-auto py-16">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <ShieldAlert className="h-10 w-10 text-amber-600 mx-auto" />
            <h2 className="text-xl font-semibold">Acesso restrito</h2>
            <p className="text-muted-foreground">A rota de alunos e exclusiva para administradores e professores.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = (data: FormData) => {
    enrollStudent.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      },
    });
  };

  const canLockEnrollment = user.role === "admin";

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">Diretorio de Alunos</h2>
          <p className="text-muted-foreground mt-1">Selecione curso e turma para listar matriculas permitidas.</p>
        </div>

        {user.role === "admin" && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Matricular aluno
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Matricular aluno</DialogTitle>
                <DialogDescription>O cadastro gera uma matricula ativa com vinculo de curso e turma.</DialogDescription>
              </DialogHeader>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input {...form.register("name")} />
                  {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input {...form.register("cpf")} />
                    {form.formState.errors.cpf && <p className="text-xs text-destructive">{form.formState.errors.cpf.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input {...form.register("phone")} />
                    {form.formState.errors.phone && <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" {...form.register("email")} />
                  {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Curso</Label>
                  <Select
                    onValueChange={(value) => {
                      form.setValue("courseId", Number(value), { shouldValidate: true });
                      form.setValue("classSectionId", 0);
                    }}
                    value={form.watch("courseId") ? String(form.watch("courseId")) : undefined}
                  >
                    <SelectTrigger className={!form.watch("courseId") ? "border-amber-400 ring-2 ring-amber-100" : ""}>
                      <SelectValue placeholder="Selecione um curso" />
                    </SelectTrigger>
                    <SelectContent>
                      {scope?.courses.map((course) => (
                        <SelectItem key={course.id} value={String(course.id)}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.courseId && <p className="text-xs text-destructive">{form.formState.errors.courseId.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Select
                    onValueChange={(value) => form.setValue("classSectionId", Number(value), { shouldValidate: true })}
                    value={form.watch("classSectionId") ? String(form.watch("classSectionId")) : undefined}
                    disabled={!form.watch("courseId")}
                  >
                    <SelectTrigger className={!form.watch("classSectionId") ? "border-amber-400 ring-2 ring-amber-100" : ""}>
                      <SelectValue placeholder="Selecione uma turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionsForEnrollment.map((section) => (
                        <SelectItem key={section.id} value={String(section.id)}>
                          {sectionLabel(section)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.classSectionId && (
                    <p className="text-xs text-destructive">{form.formState.errors.classSectionId.message}</p>
                  )}
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={enrollStudent.isPending}>
                    {enrollStudent.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Matriculando...
                      </>
                    ) : (
                      "Confirmar matricula"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Selecionar curso</Label>
              <Select
                onValueChange={(value) => {
                  setSelectedCourseId(Number(value));
                  setSelectedClassSectionId(undefined);
                }}
                value={selectedCourseId ? String(selectedCourseId) : undefined}
                disabled={scopeLoading}
              >
                <SelectTrigger className={!selectedCourseId ? "border-amber-400 ring-2 ring-amber-100" : ""}>
                  <SelectValue placeholder="Escolha um curso" />
                </SelectTrigger>
                <SelectContent>
                  {scope?.courses.map((course) => (
                    <SelectItem key={course.id} value={String(course.id)}>
                      {course.code} - {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Selecionar turma</Label>
              <Select
                onValueChange={(value) => setSelectedClassSectionId(Number(value))}
                value={selectedClassSectionId ? String(selectedClassSectionId) : undefined}
                disabled={!selectedCourseId}
              >
                <SelectTrigger className={!selectedClassSectionId ? "border-amber-400 ring-2 ring-amber-100" : ""}>
                  <SelectValue placeholder="Escolha uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {sectionsBySelectedCourse.map((section) => (
                    <SelectItem key={section.id} value={String(section.id)}>
                      {sectionLabel(section)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Buscar aluno</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, e-mail, telefone ou R.A"
                  className="pl-10 bg-white"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            A listagem respeita o escopo do seu papel. Professores visualizam apenas cursos/turmas sob responsabilidade.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {!shouldFetchStudents ? (
            <div className="text-center py-12 text-muted-foreground">Selecione curso e turma para carregar os alunos.</div>
          ) : isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhum aluno encontrado para o filtro selecionado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]" />
                  <TableHead>RA</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  {canLockEnrollment && <TableHead className="text-right">Acoes</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => {
                  const status = enrollmentStatusBadge(student.enrollmentStatus);
                  return (
                    <TableRow key={`${student.id}-${student.enrollmentId}`} className="hover:bg-slate-50/50">
                      <TableCell>
                        <Avatar className="h-9 w-9 border">
                          <AvatarImage src={student.avatarUrl || undefined} alt={`Foto de ${student.name}`} />
                          <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                            {student.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{student.ra}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Smartphone className="w-3 h-3" />
                          <span>{student.phone || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          <span>{student.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.className}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      {canLockEnrollment && (
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={student.enrollmentStatus === "locked"}
                            onClick={() => {
                              setLockTarget({
                                enrollmentId: student.enrollmentId,
                                name: student.name,
                                courseId: student.courseId,
                              });
                              setLockReason("");
                              setApprovedSubjectIds([]);
                              setLockDialogOpen(true);
                            }}
                          >
                            <Lock className="h-3.5 w-3.5 mr-1.5" />
                            Trancar
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trancar matricula</DialogTitle>
            <DialogDescription>
              Registra historico de status e preserva disciplinas aprovadas para continuidade futura.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Aluno: <strong className="text-foreground">{lockTarget?.name ?? "-"}</strong>
            </div>

            <div className="space-y-2">
              <Label>Motivo do trancamento</Label>
              <Textarea
                value={lockReason}
                onChange={(event) => setLockReason(event.target.value)}
                placeholder="Informe o motivo para auditoria academica."
              />
            </div>

            <div className="space-y-2">
              <Label>Disciplinas aprovadas (opcional)</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-auto space-y-2">
                {lockCourseSubjects?.map((subject) => {
                  const checked = approvedSubjectIds.includes(subject.id);
                  return (
                    <label key={subject.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          setApprovedSubjectIds((current) => {
                            if (value) return [...current, subject.id];
                            return current.filter((id) => id !== subject.id);
                          });
                        }}
                      />
                      <span>
                        {subject.code} - {subject.name}
                      </span>
                    </label>
                  );
                })}
                {lockCourseSubjects && lockCourseSubjects.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma disciplina cadastrada para este curso.</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                if (!lockTarget) return;
                lockEnrollment.mutate(
                  {
                    enrollmentId: lockTarget.enrollmentId,
                    reason: lockReason,
                    approvedSubjectIds,
                  },
                  {
                    onSuccess: () => {
                      setLockDialogOpen(false);
                      setLockTarget(null);
                      setLockReason("");
                      setApprovedSubjectIds([]);
                    },
                  },
                );
              }}
              disabled={lockEnrollment.isPending || !lockReason.trim()}
            >
              {lockEnrollment.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar trancamento"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
