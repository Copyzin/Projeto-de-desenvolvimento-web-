import { useEffect, useMemo, useState } from "react";
import { Bot, GraduationCap, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useAcademicRecordSheet,
  useCreateScheduleEntry,
  useDeleteScheduleEntry,
  usePublishTeachingAssignments,
  useSaveLocationCategory,
  useSaveTeacherAssignmentProfile,
  useSaveTeacherPreferences,
  useSaveTeachingAssignment,
  useTeachingAssignmentAiAssist,
  useTeachingAssignmentsAdminWorkspace,
  useTeachingAssignmentsTeacherWorkspace,
  useUpsertAcademicRecord,
  useValidateTeachingAssignments,
} from "@/hooks/use-teaching-assignment";
import { AcademicWeeklySchedule } from "@/components/schedule/academic-weekly-schedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Segunda",
  tuesday: "Terca",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
};

function formatCompatibilityBand(value: string) {
  if (value === "high") return "Alta";
  if (value === "medium") return "Media";
  if (value === "low") return "Baixa";
  return "Inapta";
}

function formatScheduleTitle(section?: { code: string; name: string; courseName: string } | null) {
  if (!section) {
    return {
      title: "Quadro semanal",
      subtitle: "Calendario semanal academico",
      sheetId: "SCHEDULE-DRAFT",
    };
  }

  return {
    title: "Quadro semanal",
    subtitle: `${section.courseName} | Turma: ${section.code} - ${section.name}`,
    sheetId: `${section.code}-${section.name}`.replace(/\s+/g, "-").toUpperCase(),
  };
}

function formatPreferenceStatus(value: "draft" | "submitted") {
  return value === "submitted" ? "Enviada" : "Rascunho";
}

function formatConflictType(value: string) {
  if (value === "teacher") return "Conflito de professor";
  if (value === "class_section") return "Conflito de turma";
  if (value === "location") return "Conflito de local";
  if (value === "capacity") return "Capacidade insuficiente";
  if (value === "location_kind") return "Tipo de local";
  if (value === "availability") return "Indisponibilidade";
  if (value === "integrity") return "Lacuna de cobertura";
  if (value === "coordinator") return "Coordenador pendente";
  return value;
}

type WorkflowStepStatus = "done" | "current" | "pending";

type WorkflowGuideStep = {
  label: string;
  description: string;
  status: WorkflowStepStatus;
};

type WorkflowGuideMetric = {
  label: string;
  value: string;
};

function workflowBadgeVariant(status: WorkflowStepStatus): "secondary" | "outline" | "destructive" {
  if (status === "done") return "secondary";
  if (status === "current") return "outline";
  return "destructive";
}

function workflowStatusLabel(status: WorkflowStepStatus) {
  if (status === "done") return "Concluido";
  if (status === "current") return "Em foco";
  return "Pendente";
}

function WorkflowGuideCard(props: {
  title: string;
  description: string;
  nextAction: string;
  steps: WorkflowGuideStep[];
  metrics: WorkflowGuideMetric[];
  footer: string;
}) {
  return (
    <Card className="border-primary/15 bg-slate-50/80">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl">{props.title}</CardTitle>
            <CardDescription className="max-w-3xl">{props.description}</CardDescription>
          </div>
          <div className="rounded-xl border bg-white px-4 py-3 text-sm shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Proximo passo</p>
            <p className="mt-1 font-medium text-foreground">{props.nextAction}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 xl:grid-cols-4">
          {props.metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {props.steps.map((step, index) => (
            <div key={step.label} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                  {index + 1}
                </div>
                <Badge variant={workflowBadgeVariant(step.status)}>{workflowStatusLabel(step.status)}</Badge>
              </div>
              <p className="mt-3 font-medium text-foreground">{step.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-dashed bg-white/90 p-4 text-sm text-muted-foreground">
          {props.footer}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeachingAssignmentPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";

  const adminWorkspace = useTeachingAssignmentsAdminWorkspace(isAdmin);
  const teacherWorkspace = useTeachingAssignmentsTeacherWorkspace(isTeacher);
  const saveAssignment = useSaveTeachingAssignment();
  const saveLocationCategory = useSaveLocationCategory();
  const saveTeacherProfile = useSaveTeacherAssignmentProfile();
  const createScheduleEntry = useCreateScheduleEntry();
  const deleteScheduleEntry = useDeleteScheduleEntry();
  const validateSchedule = useValidateTeachingAssignments();
  const publishSchedule = usePublishTeachingAssignments();
  const saveTeacherPreferences = useSaveTeacherPreferences();
  const aiAssist = useTeachingAssignmentAiAssist();

  const [selectedSectionId, setSelectedSectionId] = useState<number | undefined>();
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>();
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | undefined>();
  const [validationState, setValidationState] = useState<Awaited<
    ReturnType<typeof validateSchedule.mutateAsync>
  > | null>(null);

  const [assignmentForm, setAssignmentForm] = useState({
    classSectionId: "",
    subjectId: "",
    teacherId: "",
    weeklySlotTarget: "2",
    coordinatorTeacherId: "",
    notes: "",
  });
  const [slotForm, setSlotForm] = useState({
    assignmentId: "",
    weekday: "monday" as Weekday,
    timeSlotId: "",
    spanSlots: "1",
    locationId: "",
  });
  const [locationForm, setLocationForm] = useState({
    name: "",
    kind: "classroom" as "classroom" | "laboratory",
    maxCapacity: "40",
    quantity: "1",
    unitPrefix: "Sala",
    defaultEquipment: "",
  });
  const [profileForm, setProfileForm] = useState({
    teacherId: "",
    careerTrack: "",
    priorityOrder: "100",
    weeklyLoadTargetHours: "0",
    notes: "",
  });

  const [teacherNotes, setTeacherNotes] = useState("");
  const [preferredSubjectIds, setPreferredSubjectIds] = useState<number[]>([]);
  const [preferredSectionPairs, setPreferredSectionPairs] = useState<Array<{ subjectId: number; classSectionId: number }>>([]);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean>>({});
  const [recordSelectionKey, setRecordSelectionKey] = useState("");

  useEffect(() => {
    if (!adminWorkspace.data?.classSections.length) return;

    const scopedSections = selectedCourseId
      ? adminWorkspace.data.classSections.filter((section) => section.courseId === selectedCourseId)
      : adminWorkspace.data.classSections;

    if (!scopedSections.length) return;

    if (!selectedSectionId || !scopedSections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(scopedSections[0].id);
    }
  }, [adminWorkspace.data, selectedCourseId, selectedSectionId]);

  useEffect(() => {
    if (!teacherWorkspace.data?.preferences) return;

    setTeacherNotes(teacherWorkspace.data.preferences.notes);
    setPreferredSubjectIds(teacherWorkspace.data.preferences.subjectIds);
    setPreferredSectionPairs(
      teacherWorkspace.data.preferences.sectionPreferences.map((item) => ({
        subjectId: item.subjectId,
        classSectionId: item.classSectionId,
      })),
    );

    const nextMap: Record<string, boolean> = {};
    for (const slot of teacherWorkspace.data.preferences.availability) {
      nextMap[`${slot.weekday}:${slot.timeSlotId}`] = slot.isAvailable;
    }
    setAvailabilityMap(nextMap);
  }, [teacherWorkspace.data]);

  const adminSelectedSection = useMemo(
    () => adminWorkspace.data?.classSections.find((section) => section.id === selectedSectionId) ?? null,
    [adminWorkspace.data, selectedSectionId],
  );

  const adminCourseOptions = useMemo(() => {
    if (!adminWorkspace.data) return [];

    const byCourse = new Map<number, { id: number; name: string }>();
    for (const section of adminWorkspace.data.classSections) {
      if (!byCourse.has(section.courseId)) {
        byCourse.set(section.courseId, { id: section.courseId, name: section.courseName });
      }
    }
    return Array.from(byCourse.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [adminWorkspace.data]);

  const filteredAdminSections = useMemo(() => {
    if (!adminWorkspace.data) return [];
    return selectedCourseId
      ? adminWorkspace.data.classSections.filter((section) => section.courseId === selectedCourseId)
      : adminWorkspace.data.classSections;
  }, [adminWorkspace.data, selectedCourseId]);

  const adminSectionEntries = useMemo(() => {
    if (!adminWorkspace.data || !selectedSectionId) return [];
    return adminWorkspace.data.draftEntries.filter((entry) => entry.classSectionId === selectedSectionId);
  }, [adminWorkspace.data, selectedSectionId]);

  const adminPublishedSectionEntries = useMemo(() => {
    if (!adminWorkspace.data || !selectedSectionId) return [];
    return adminWorkspace.data.publishedEntries.filter((entry) => entry.classSectionId === selectedSectionId);
  }, [adminWorkspace.data, selectedSectionId]);

  const adminScheduleMeta = formatScheduleTitle(adminSelectedSection);

  const filteredAssignments = useMemo(() => {
    if (!adminWorkspace.data) return [];

    return adminWorkspace.data.assignments.filter((assignment) => {
      const matchesTeacher = selectedTeacherId ? assignment.teacherId === selectedTeacherId : true;
      const matchesSection = selectedSectionId ? assignment.classSectionId === selectedSectionId : true;
      const matchesCourse = selectedCourseId
        ? adminWorkspace.data.classSections.some(
            (section) => section.id === assignment.classSectionId && section.courseId === selectedCourseId,
          )
        : true;
      return matchesTeacher && matchesSection && matchesCourse;
    });
  }, [adminWorkspace.data, selectedCourseId, selectedSectionId, selectedTeacherId]);

  const filteredPreferenceSummaries = useMemo(() => {
    if (!adminWorkspace.data) return [];

    return adminWorkspace.data.teacherPreferenceSummaries.filter((summary) => {
      const matchesTeacher = selectedTeacherId ? summary.teacherId === selectedTeacherId : true;
      const matchesCourse = selectedCourseId
        ? summary.preferredClassSections.some((item) => item.courseId === selectedCourseId) ||
          adminWorkspace.data.assignments.some(
            (assignment) =>
              assignment.teacherId === summary.teacherId &&
              adminWorkspace.data.classSections.some(
                (section) => section.id === assignment.classSectionId && section.courseId === selectedCourseId,
              ),
          )
        : true;
      return matchesTeacher && matchesCourse;
    });
  }, [adminWorkspace.data, selectedCourseId, selectedTeacherId]);

  const assignmentCoverageRows = useMemo(() => {
    if (!adminWorkspace.data) return [];

    return filteredAssignments.map((assignment) => {
      const draftSlots = adminWorkspace.data.draftEntries
        .filter((entry) => entry.assignmentId === assignment.id)
        .reduce((sum, entry) => sum + entry.spanSlots, 0);
      const publishedSlots = adminWorkspace.data.publishedEntries
        .filter((entry) => entry.assignmentId === assignment.id)
        .reduce((sum, entry) => sum + entry.spanSlots, 0);
      const classSection = adminWorkspace.data.classSections.find((section) => section.id === assignment.classSectionId);
      return {
        ...assignment,
        classSection,
        draftSlots,
        publishedSlots,
        draftGap: Math.max(0, assignment.weeklySlotTarget - draftSlots),
        publishedGap: Math.max(0, assignment.weeklySlotTarget - publishedSlots),
      };
    });
  }, [adminWorkspace.data, filteredAssignments]);

  const gapRows = useMemo(
    () =>
      assignmentCoverageRows.filter(
        (row) => row.draftGap > 0 || row.publishedGap > 0 || !row.classSection?.coordinatorTeacherId,
      ),
    [assignmentCoverageRows],
  );

  const activeConflictState = useMemo(() => {
    if (validationState) return validationState;
    if (!adminWorkspace.data?.latestRun) return null;

    return {
      runId: adminWorkspace.data.latestRun.id,
      status: adminWorkspace.data.latestRun.status,
      hardConflictCount: Number(adminWorkspace.data.latestRun.summary?.hardConflictCount ?? 0),
      softConflictCount: Number(adminWorkspace.data.latestRun.summary?.softConflictCount ?? 0),
      conflicts: adminWorkspace.data.latestConflicts,
    };
  }, [adminWorkspace.data, validationState]);

  const teacherSectionOptions = useMemo(() => {
    if (!teacherWorkspace.data) return [];

    return teacherWorkspace.data.classSections.filter((section) =>
      preferredSubjectIds.some((subjectId) =>
        teacherWorkspace.data.eligibleSubjects.some(
          (subject) => subject.subjectId === subjectId && subject.compatibilityBand !== "ineligible",
        ),
      ),
    );
  }, [teacherWorkspace.data, preferredSubjectIds]);

  const teacherRecordOptions = useMemo(() => {
    if (!teacherWorkspace.data) return [];

    const byKey = new Map<
      string,
      {
        classSectionId: number;
        classSectionName: string;
        classSectionCode: string;
        courseName: string;
        subjectId: number;
        subjectName: string;
      }
    >();

    for (const entry of teacherWorkspace.data.publishedEntries) {
      const key = `${entry.classSectionId}:${entry.subjectId}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          classSectionId: entry.classSectionId,
          classSectionName: entry.classSectionName,
          classSectionCode: entry.classSectionCode,
          courseName: entry.courseName,
          subjectId: entry.subjectId,
          subjectName: entry.subjectName,
        });
      }
    }

    return Array.from(byKey.values()).sort((left, right) => {
      const courseDiff = left.courseName.localeCompare(right.courseName);
      if (courseDiff !== 0) return courseDiff;
      const classDiff = left.classSectionCode.localeCompare(right.classSectionCode);
      if (classDiff !== 0) return classDiff;
      return left.subjectName.localeCompare(right.subjectName);
    });
  }, [teacherWorkspace.data]);

  useEffect(() => {
    if (!teacherRecordOptions.length) {
      setRecordSelectionKey("");
      return;
    }

    if (!recordSelectionKey) {
      setRecordSelectionKey(`${teacherRecordOptions[0].classSectionId}:${teacherRecordOptions[0].subjectId}`);
    }
  }, [teacherRecordOptions, recordSelectionKey]);

  const selectedRecordOption = useMemo(
    () => teacherRecordOptions.find((item) => `${item.classSectionId}:${item.subjectId}` === recordSelectionKey),
    [teacherRecordOptions, recordSelectionKey],
  );

  const recordSheet = useAcademicRecordSheet(
    selectedRecordOption?.classSectionId,
    selectedRecordOption?.subjectId,
    Boolean(selectedRecordOption),
  );
  const saveAcademicRecord = useUpsertAcademicRecord(
    selectedRecordOption?.classSectionId,
    selectedRecordOption?.subjectId,
  );

  if (!user) return null;

  if (!isAdmin && !isTeacher) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atribuicao de Aulas</CardTitle>
          <CardDescription>Esta area e exclusiva para administradores e professores.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isLoading = (isAdmin && adminWorkspace.isLoading) || (isTeacher && teacherWorkspace.isLoading);
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const teacherPublishedSchedule = teacherWorkspace.data
    ? {
        title: "Quadro semanal",
        subtitle: `${teacherWorkspace.data.teacher.name} | Grade publicada`,
        semesterLabel: teacherWorkspace.data.activeTerm.name,
        timeSlots: teacherWorkspace.data.timeSlots,
        weekdays: teacherWorkspace.data.weekdays,
        entries: teacherWorkspace.data.publishedEntries,
        generatedAt: new Date().toLocaleDateString("pt-BR"),
        institutionLabel: "Academic Suite Official Data",
        sheetId: `TEACHER-${teacherWorkspace.data.teacher.id}-${teacherWorkspace.data.activeTerm.code}`,
      }
    : null;

  const adminSubmittedCount = adminWorkspace.data
    ? adminWorkspace.data.teacherPreferenceSummaries.filter((summary) => summary.status === "submitted").length
    : 0;
  const adminPendingCount = adminWorkspace.data
    ? adminWorkspace.data.teacherPreferenceSummaries.filter((summary) => summary.status !== "submitted").length
    : 0;
  const adminHardConflictCount = activeConflictState?.hardConflictCount ?? 0;
  const adminSoftConflictCount = activeConflictState?.softConflictCount ?? 0;
  const adminReadyToPublish =
    isAdmin &&
    Boolean(adminWorkspace.data) &&
    adminPendingCount === 0 &&
    adminHardConflictCount === 0 &&
    gapRows.length === 0 &&
    filteredAssignments.length > 0;
  const adminNextAction =
    adminPendingCount > 0
      ? `Cobrar ou revisar ${adminPendingCount} envio(s) docente(s) antes de fechar a grade.`
      : adminHardConflictCount > 0
        ? `Resolver ${adminHardConflictCount} conflito(s) hard antes da publicacao.`
        : gapRows.length > 0
          ? `Fechar ${gapRows.length} lacuna(s) de cobertura e coordenacao.`
          : "Validar a grade final e publicar os horarios oficiais.";

  const teacherEligibleCount = teacherWorkspace.data?.eligibleSubjects.length ?? 0;
  const teacherSelectedSubjectCount = preferredSubjectIds.length;
  const teacherSelectedSectionCount = preferredSectionPairs.length;
  const teacherAvailabilityDefinedCount = Object.keys(availabilityMap).length;
  const teacherSubmissionStatus = teacherWorkspace.data?.preferences.status ?? "draft";
  const teacherCanSubmit =
    teacherEligibleCount > 0 && teacherSelectedSubjectCount > 0 && teacherSelectedSectionCount > 0;
  const teacherNextAction =
    teacherEligibleCount === 0
      ? "Revise formacao, competencias e historico para liberar elegibilidade real."
      : teacherSelectedSubjectCount === 0
        ? "Escolha primeiro as materias com maior afinidade."
        : teacherSelectedSectionCount === 0
          ? "Associe agora as turmas desejadas para cada materia escolhida."
          : teacherAvailabilityDefinedCount === 0
            ? "Registre a disponibilidade semanal antes de salvar."
            : teacherSubmissionStatus === "submitted"
            ? "Aguarde a consolidacao do admin; seu envio ja entrou no fluxo de atribuicao."
              : "Salve suas preferencias para enviar sua intencao ao admin.";

  const adminScheduleManagementSection = adminWorkspace.data ? (
    <div className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Tabelas semanais da turma</CardTitle>
            <CardDescription>
              Escolha a turma que deseja acompanhar. Os resumos ficam aqui em cima e a leitura detalhada da grade fica logo abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preview-class">Turma exibida</Label>
              <select
                id="preview-class"
                value={selectedSectionId ?? ""}
                onChange={(event) => setSelectedSectionId(Number(event.target.value))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {filteredAdminSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.code} - {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Publicado: {adminPublishedSectionEntries.length}</Badge>
              <Badge variant="secondary">Rascunho: {adminSectionEntries.length}</Badge>
              {adminWorkspace.data.latestPublication ? (
                <Badge variant="outline">
                  Publicado em {new Date(adminWorkspace.data.latestPublication.createdAt).toLocaleDateString("pt-BR")}
                </Badge>
              ) : (
                <Badge variant="outline">Sem publicacao oficial</Badge>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Turma selecionada</p>
                <p className="mt-2 font-semibold text-foreground">
                  {adminSelectedSection ? `${adminSelectedSection.code} - ${adminSelectedSection.name}` : "Nenhuma turma"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{adminSelectedSection?.courseName ?? "Sem curso selecionado"}</p>
              </div>
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Grade oficial</p>
                <p className="mt-2 font-semibold text-foreground">
                  {adminPublishedSectionEntries.length > 0 ? "Publicada para consulta" : "Ainda nao publicada"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {adminPublishedSectionEntries.length > 0
                    ? "Use a tabela abaixo para comparar o publicado com o novo rascunho."
                    : "Monte o rascunho e valide antes de publicar."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:self-start">
          <CardHeader>
            <CardTitle>Slots de aula</CardTitle>
            <CardDescription>Crie o encontro oficial entre turma, materia, professor e local.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">
              Primeiro selecione a atribuicao. Depois defina dia, bloco, duracao e local. O slot entra no
              rascunho da turma e so vira operacional depois da validacao e publicacao.
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-assignment">Atribuicao</Label>
              <select
                id="slot-assignment"
                value={slotForm.assignmentId}
                onChange={(event) => setSlotForm((current) => ({ ...current, assignmentId: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecione</option>
                {filteredAssignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.classSectionCode} | {assignment.subjectName} | {assignment.teacherName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slot-weekday">Dia</Label>
                <select
                  id="slot-weekday"
                  value={slotForm.weekday}
                  onChange={(event) =>
                    setSlotForm((current) => ({ ...current, weekday: event.target.value as Weekday }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {adminWorkspace.data.weekdays.map((weekday) => (
                    <option key={weekday} value={weekday}>
                      {WEEKDAY_LABELS[weekday]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot-time">Bloco inicial</Label>
                <select
                  id="slot-time"
                  value={slotForm.timeSlotId}
                  onChange={(event) => setSlotForm((current) => ({ ...current, timeSlotId: event.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione</option>
                  {adminWorkspace.data.timeSlots
                    .filter((slot) => !slot.isBreak)
                    .map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slot-span">Duracao em blocos</Label>
                <Input
                  id="slot-span"
                  type="number"
                  min={1}
                  value={slotForm.spanSlots}
                  onChange={(event) => setSlotForm((current) => ({ ...current, spanSlots: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot-location">Local</Label>
                <select
                  id="slot-location"
                  value={slotForm.locationId}
                  onChange={(event) => setSlotForm((current) => ({ ...current, locationId: event.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione</option>
                  {adminWorkspace.data.locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.kind})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() =>
                createScheduleEntry.mutate({
                  assignmentId: Number(slotForm.assignmentId),
                  weekday: slotForm.weekday,
                  timeSlotId: Number(slotForm.timeSlotId),
                  spanSlots: Number(slotForm.spanSlots),
                  locationId: Number(slotForm.locationId),
                })
              }
              disabled={
                !slotForm.assignmentId || !slotForm.timeSlotId || !slotForm.locationId || createScheduleEntry.isPending
              }
            >
              {createScheduleEntry.isPending ? "Salvando..." : "Adicionar slot"}
            </Button>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Rascunho da turma selecionada</p>
                <Badge variant="outline">{adminSectionEntries.length} slot(s)</Badge>
              </div>
              {adminSectionEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum slot em rascunho para a turma selecionada.</p>
              ) : (
                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {adminSectionEntries.map((entry) => (
                    <div key={entry.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-medium">
                          {entry.subjectName} | {entry.teacherName}
                        </p>
                        <p className="mt-1 break-words text-sm text-muted-foreground">
                          {WEEKDAY_LABELS[entry.weekday]} | {entry.timeSlotLabel} | {entry.locationName}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => deleteScheduleEntry.mutate(entry.id)}
                        disabled={deleteScheduleEntry.isPending}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tabela semanal da turma</CardTitle>
          <CardDescription>
            Area principal de leitura da grade. O publicado e o rascunho ficam abaixo, separados dos controles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Grade oficial publicada</p>
                <p className="text-sm text-muted-foreground">
                  Fonte operacional real de materiais, notas e faltas.
                </p>
              </div>
              <Badge variant="outline">{adminPublishedSectionEntries.length} slots</Badge>
            </div>
            {adminPublishedSectionEntries.length > 0 ? (
              <AcademicWeeklySchedule
                title={adminScheduleMeta.title}
                subtitle={adminScheduleMeta.subtitle}
                semesterLabel={adminWorkspace.data.activeTerm.name}
                timeSlots={adminWorkspace.data.timeSlots}
                weekdays={adminWorkspace.data.weekdays}
                entries={adminPublishedSectionEntries}
                generatedAt={new Date().toLocaleDateString("pt-BR")}
                institutionLabel="Academic Suite Official Data"
                sheetId={`${adminScheduleMeta.sheetId}-PUBLISHED`}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Ainda nao existe grade publicada para a turma filtrada.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Rascunho atual</p>
                <p className="text-sm text-muted-foreground">
                  Espaco de trabalho do admin para conflitos, lacunas e consolidacao da proxima publicacao.
                </p>
              </div>
              <Badge variant="secondary">{adminSectionEntries.length} slots</Badge>
            </div>
            {adminSectionEntries.length > 0 ? (
              <AcademicWeeklySchedule
                title={adminScheduleMeta.title}
                subtitle={adminScheduleMeta.subtitle}
                semesterLabel={adminWorkspace.data.activeTerm.name}
                timeSlots={adminWorkspace.data.timeSlots}
                weekdays={adminWorkspace.data.weekdays}
                entries={adminSectionEntries}
                generatedAt={new Date().toLocaleDateString("pt-BR")}
                institutionLabel="Academic Suite Official Data"
                sheetId={`${adminScheduleMeta.sheetId}-DRAFT`}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum slot em rascunho para a turma filtrada.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  ) : null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="font-display text-4xl font-bold tracking-tight">Atribuicao de Aulas</h2>
        <p className="text-muted-foreground max-w-4xl">
          Ferramenta central para atribuir professor, materia, turma, horario, local, coordenacao por turma e
          publicar a grade oficial que habilita materiais, notas e faltas.
        </p>
      </div>

      <Tabs defaultValue={isAdmin ? "admin" : "teacher"} className="space-y-6">
        <TabsList className="bg-white border border-border rounded-xl p-1">
          {isAdmin && (
            <TabsTrigger value="admin" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Administracao
            </TabsTrigger>
          )}
          {isTeacher && (
            <TabsTrigger value="teacher" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <GraduationCap className="mr-2 h-4 w-4" />
              Professor
            </TabsTrigger>
          )}
        </TabsList>

        {isAdmin && adminWorkspace.data && (
          <TabsContent value="admin" className="space-y-6">
            {adminScheduleManagementSection}

            <WorkflowGuideCard
              title="Fechamento da grade em 4 etapas"
              description="A leitura ideal do admin e: conferir envios docentes, fechar lacunas, montar os slots e so depois validar e publicar."
              nextAction={adminNextAction}
              metrics={[
                { label: "Envios recebidos", value: `${adminSubmittedCount}/${adminWorkspace.data.teacherPreferenceSummaries.length}` },
                { label: "Pendencias", value: String(adminPendingCount) },
                { label: "Conflitos hard", value: String(adminHardConflictCount) },
                { label: "Lacunas abertas", value: String(gapRows.length) },
              ]}
              steps={[
                {
                  label: "Conferir envios dos professores",
                  description: "Use preferencias e afinidades para ver quem enviou, quem esta pendente e o que cada docente priorizou.",
                  status: adminPendingCount === 0 ? "done" : "current",
                },
                {
                  label: "Fechar lacunas e coordenacao",
                  description: "Observe cobertura por turma, pendencias de coordenador e cargas ainda nao atendidas.",
                  status: gapRows.length === 0 ? "done" : adminPendingCount === 0 ? "current" : "pending",
                },
                {
                  label: "Montar os slots da grade",
                  description: "Crie e revise os encontros de aula na grade publicada e no rascunho por turma.",
                  status:
                    filteredAssignments.length > 0 && adminSectionEntries.length > 0
                      ? "done"
                      : adminPendingCount === 0 && gapRows.length === 0
                        ? "current"
                        : "pending",
                },
                {
                  label: "Validar e publicar",
                  description: "Publice apenas quando nao houver conflito hard e a cobertura estiver consistente.",
                  status: adminReadyToPublish ? "done" : adminHardConflictCount === 0 ? "current" : "pending",
                },
              ]}
              footer="Depois da publicacao, materiais, notas e faltas passam a obedecer a grade oficial. O rascunho continua sendo apenas area de trabalho administrativa."
            />

            <Card>
              <CardHeader>
                <CardTitle>Filtros operacionais</CardTitle>
                <CardDescription>
                  Recorte a visao por curso, turma e professor para acompanhar a demonstracao e operar o rascunho.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="filter-course">Curso</Label>
                  <select
                    id="filter-course"
                    value={selectedCourseId ?? ""}
                    onChange={(event) =>
                      setSelectedCourseId(event.target.value ? Number(event.target.value) : undefined)
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Todos</option>
                    {adminCourseOptions.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-section">Turma</Label>
                  <select
                    id="filter-section"
                    value={selectedSectionId ?? ""}
                    onChange={(event) =>
                      setSelectedSectionId(event.target.value ? Number(event.target.value) : undefined)
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Todas</option>
                    {filteredAdminSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.code} - {section.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-teacher">Professor</Label>
                  <select
                    id="filter-teacher"
                    value={selectedTeacherId ?? ""}
                    onChange={(event) =>
                      setSelectedTeacherId(event.target.value ? Number(event.target.value) : undefined)
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Todos</option>
                    {adminWorkspace.data.teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Panorama administrativo</CardTitle>
                  <CardDescription>
                    Consolidacao por turma, prioridade docente, conflitos de horario, locais e publicacao final.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Professores filtrados</p>
                    <p className="mt-2 text-3xl font-bold">
                      {selectedTeacherId ? filteredPreferenceSummaries.length : adminWorkspace.data.teachers.length}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Turmas em foco</p>
                    <p className="mt-2 text-3xl font-bold">{filteredAdminSections.length}</p>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Atribuicoes em foco</p>
                    <p className="mt-2 text-3xl font-bold">{filteredAssignments.length}</p>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lacunas mapeadas</p>
                    <p className="mt-2 text-3xl font-bold">{gapRows.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Validacao e publicacao</CardTitle>
                  <CardDescription>
                    Hard constraints bloqueiam publicacao. Soft constraints aparecem como observacao auditavel.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className={`rounded-xl border p-4 text-sm ${
                      adminReadyToPublish
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    <p className="font-medium">
                      {adminReadyToPublish ? "Grade pronta para publicacao." : "Ainda existem bloqueios antes da publicacao."}
                    </p>
                    <p className="mt-1">
                      {adminNextAction}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        validateSchedule.mutate(undefined, {
                          onSuccess: (payload) => setValidationState(payload),
                        });
                      }}
                      disabled={validateSchedule.isPending}
                    >
                      {validateSchedule.isPending ? "Validando..." : "Validar grade"}
                    </Button>
                    <Button
                      onClick={() => publishSchedule.mutate({ notes: "Publicacao administrativa da grade oficial" })}
                      disabled={publishSchedule.isPending || (activeConflictState?.hardConflictCount ?? 0) > 0}
                    >
                      {publishSchedule.isPending ? "Publicando..." : "Publicar horarios"}
                    </Button>
                  </div>

                  <div className="rounded-xl border bg-slate-50 p-4 text-sm">
                    <p>
                      Ultima execucao:{" "}
                      <strong>{adminWorkspace.data.latestRun?.status ?? "sem validacao ainda"}</strong>
                    </p>
                    <p className="text-muted-foreground">
                      Ultima publicacao:{" "}
                      {adminWorkspace.data.latestPublication
                        ? new Date(adminWorkspace.data.latestPublication.createdAt).toLocaleString("pt-BR")
                        : "nao publicada"}
                    </p>
                  </div>

                  {activeConflictState && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={activeConflictState.hardConflictCount > 0 ? "destructive" : "secondary"}>
                          Hard: {activeConflictState.hardConflictCount}
                        </Badge>
                        <Badge variant="outline">Soft: {activeConflictState.softConflictCount}</Badge>
                      </div>
                      <div className="max-h-52 space-y-2 overflow-y-auto">
                        {activeConflictState.conflicts.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhum conflito encontrado.</p>
                        ) : (
                          activeConflictState.conflicts.map((conflict, index) => (
                            <div key={`${conflict.conflictType}-${index}`} className="rounded-lg border p-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant={conflict.severity === "hard" ? "destructive" : "outline"}>
                                  {conflict.severity}
                                </Badge>
                                <span className="font-medium">{formatConflictType(conflict.conflictType)}</span>
                              </div>
                              <p className="mt-2 text-muted-foreground">{conflict.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Preferencias e afinidades</CardTitle>
                  <CardDescription>
                    Visao administrativa das preferencias registradas, cargas semanais e materias elegiveis persistidas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filteredPreferenceSummaries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma preferencia encontrada para o filtro atual.
                    </p>
                  ) : (
                    filteredPreferenceSummaries.map((summary) => (
                      <div key={summary.teacherId} className="rounded-xl border p-4 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{summary.teacherName}</p>
                            <p className="text-sm text-muted-foreground">
                              {summary.careerTrack || "Carreira nao definida"} | prioridade {summary.priorityOrder}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{formatPreferenceStatus(summary.status)}</Badge>
                            <Badge variant="secondary">
                              Carga {summary.assignedSlotCount}/{summary.weeklyLoadTargetHours}
                            </Badge>
                            <Badge variant="outline">Restante {summary.remainingLoadHours}</Badge>
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              Materias preferidas
                            </p>
                            {summary.preferredSubjects.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Professor ainda nao registrou materias.</p>
                            ) : (
                              summary.preferredSubjects.map((subject) => (
                                <div
                                  key={`${summary.teacherId}-${subject.subjectId}`}
                                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {subject.priority}. {subject.subjectName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {subject.compatibilityBand
                                        ? `Afinidade ${formatCompatibilityBand(subject.compatibilityBand)}`
                                        : "Afinidade ainda nao persistida"}
                                    </p>
                                  </div>
                                  {subject.finalScore !== null && subject.finalScore !== undefined && (
                                    <Badge variant="outline">{subject.finalScore}</Badge>
                                  )}
                                </div>
                              ))
                            )}
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              Turmas desejadas
                            </p>
                            {summary.preferredClassSections.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Nenhuma turma preferida informada.</p>
                            ) : (
                              summary.preferredClassSections.map((item) => (
                                <div
                                  key={`${summary.teacherId}-${item.subjectId}-${item.classSectionId}`}
                                  className="rounded-lg border p-3 text-sm"
                                >
                                  <p className="font-medium">
                                    {item.priority}. {item.courseName} | {item.classSectionCode}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{item.subjectName}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Materias elegiveis em destaque
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {summary.topEligibleSubjects.length === 0 ? (
                              <span className="text-sm text-muted-foreground">
                                Execute a seed demo ou persista o calculo de compatibilidade para ver os destaques.
                              </span>
                            ) : (
                              summary.topEligibleSubjects.map((item) => (
                                <Badge key={`${summary.teacherId}-${item.subjectId}`} variant="outline">
                                  {item.subjectName} {item.finalScore}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>

                        {summary.notes && (
                          <div className="rounded-lg bg-slate-50 p-3 text-sm text-muted-foreground">
                            {summary.notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lacunas e cobertura</CardTitle>
                  <CardDescription>
                    Diferenca entre blocos exigidos, grade publicada e novo rascunho em aberto para intervencao.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {gapRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma lacuna encontrada para o filtro atual.</p>
                  ) : (
                    gapRows.map((row) => (
                      <div key={row.id} className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">
                          {row.classSectionCode} | {row.subjectName}
                        </p>
                        <p className="text-muted-foreground">{row.teacherName}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={row.publishedGap > 0 ? "destructive" : "secondary"}>
                            Publicado {row.publishedSlots}/{row.weeklySlotTarget}
                          </Badge>
                          <Badge variant={row.draftGap > 0 ? "destructive" : "outline"}>
                            Rascunho {row.draftSlots}/{row.weeklySlotTarget}
                          </Badge>
                          <Badge variant={row.classSection?.coordinatorTeacherId ? "outline" : "destructive"}>
                            {row.classSection?.coordinatorTeacherId ? "Coordenador ok" : "Coordenador pendente"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Perfil docente e fila</CardTitle>
                  <CardDescription>Carreira, prioridade e carga semanal para ordenar a etapa de preferencia.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="profile-teacher">Professor</Label>
                    <select
                      id="profile-teacher"
                      value={profileForm.teacherId}
                      onChange={(event) => {
                        const teacher = adminWorkspace.data?.teachers.find((item) => item.id === Number(event.target.value));
                        setProfileForm({
                          teacherId: event.target.value,
                          careerTrack: teacher?.careerTrack ?? "",
                          priorityOrder: String(teacher?.priorityOrder ?? 100),
                          weeklyLoadTargetHours: String(teacher?.weeklyLoadTargetHours ?? 0),
                          notes: "",
                        });
                      }}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Selecione</option>
                      {adminWorkspace.data.teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="career-track">Estrutura da carreira</Label>
                    <Input
                      id="career-track"
                      value={profileForm.careerTrack}
                      onChange={(event) => setProfileForm((current) => ({ ...current, careerTrack: event.target.value }))}
                      placeholder="Magisterio Superior, visitante, etc."
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="priority-order">Prioridade</Label>
                      <Input
                        id="priority-order"
                        type="number"
                        min={1}
                        value={profileForm.priorityOrder}
                        onChange={(event) => setProfileForm((current) => ({ ...current, priorityOrder: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weekly-load">Carga semanal alvo</Label>
                      <Input
                        id="weekly-load"
                        type="number"
                        min={0}
                        value={profileForm.weeklyLoadTargetHours}
                        onChange={(event) =>
                          setProfileForm((current) => ({ ...current, weeklyLoadTargetHours: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-notes">Observacoes</Label>
                    <Textarea
                      id="profile-notes"
                      value={profileForm.notes}
                      onChange={(event) => setProfileForm((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() =>
                      saveTeacherProfile.mutate({
                        teacherId: Number(profileForm.teacherId),
                        careerTrack: profileForm.careerTrack || undefined,
                        priorityOrder: Number(profileForm.priorityOrder),
                        weeklyLoadTargetHours: Number(profileForm.weeklyLoadTargetHours),
                        notes: profileForm.notes || undefined,
                      })
                    }
                    disabled={!profileForm.teacherId || saveTeacherProfile.isPending}
                  >
                    {saveTeacherProfile.isPending ? "Salvando..." : "Salvar perfil docente"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Categorias de local</CardTitle>
                  <CardDescription>Mapeie salas e laboratorios por capacidade, quantidade e equipamento base.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="location-name">Categoria</Label>
                    <Input
                      id="location-name"
                      value={locationForm.name}
                      onChange={(event) => setLocationForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Sala 100 max"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="location-kind">Tipo</Label>
                      <select
                        id="location-kind"
                        value={locationForm.kind}
                        onChange={(event) =>
                          setLocationForm((current) => ({
                            ...current,
                            kind: event.target.value as "classroom" | "laboratory",
                          }))
                        }
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="classroom">Sala</option>
                        <option value="laboratory">Laboratorio</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location-capacity">Capacidade maxima</Label>
                      <Input
                        id="location-capacity"
                        type="number"
                        min={1}
                        value={locationForm.maxCapacity}
                        onChange={(event) =>
                          setLocationForm((current) => ({ ...current, maxCapacity: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="location-quantity">Quantidade</Label>
                      <Input
                        id="location-quantity"
                        type="number"
                        min={1}
                        value={locationForm.quantity}
                        onChange={(event) => setLocationForm((current) => ({ ...current, quantity: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location-prefix">Prefixo das unidades</Label>
                      <Input
                        id="location-prefix"
                        value={locationForm.unitPrefix}
                        onChange={(event) =>
                          setLocationForm((current) => ({ ...current, unitPrefix: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location-equip">Equipamento base</Label>
                    <Input
                      id="location-equip"
                      value={locationForm.defaultEquipment}
                      onChange={(event) =>
                        setLocationForm((current) => ({ ...current, defaultEquipment: event.target.value }))
                      }
                      placeholder="Projetor, bancada, computadores..."
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() =>
                      saveLocationCategory.mutate({
                        name: locationForm.name,
                        kind: locationForm.kind,
                        maxCapacity: Number(locationForm.maxCapacity),
                        quantity: Number(locationForm.quantity),
                        unitPrefix: locationForm.unitPrefix,
                        defaultEquipment: locationForm.defaultEquipment || undefined,
                      })
                    }
                    disabled={!locationForm.name || saveLocationCategory.isPending}
                  >
                    {saveLocationCategory.isPending ? "Sincronizando..." : "Salvar categoria"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Professor por turma/materia</CardTitle>
                  <CardDescription>
                    A permissao operacional so nasce depois da atribuicao e da publicacao oficial do calendario.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="assignment-class">Turma</Label>
                    <select
                      id="assignment-class"
                      value={assignmentForm.classSectionId}
                      onChange={(event) => setAssignmentForm((current) => ({ ...current, classSectionId: event.target.value }))}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Selecione</option>
                      {filteredAdminSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.code} - {section.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignment-subject">Materia</Label>
                    <select
                      id="assignment-subject"
                      value={assignmentForm.subjectId}
                      onChange={(event) => setAssignmentForm((current) => ({ ...current, subjectId: event.target.value }))}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Selecione</option>
                      {adminWorkspace.data.subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignment-teacher">Professor</Label>
                    <select
                      id="assignment-teacher"
                      value={assignmentForm.teacherId}
                      onChange={(event) => setAssignmentForm((current) => ({ ...current, teacherId: event.target.value }))}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Selecione</option>
                      {adminWorkspace.data.teachers
                        .filter((teacher) => (selectedTeacherId ? teacher.id === selectedTeacherId : true))
                        .map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                        ))}
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="assignment-target">Blocos semanais</Label>
                      <Input
                        id="assignment-target"
                        type="number"
                        min={1}
                        value={assignmentForm.weeklySlotTarget}
                        onChange={(event) =>
                          setAssignmentForm((current) => ({ ...current, weeklySlotTarget: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignment-coordinator">Coordenador da turma</Label>
                      <select
                        id="assignment-coordinator"
                        value={assignmentForm.coordinatorTeacherId}
                        onChange={(event) =>
                          setAssignmentForm((current) => ({ ...current, coordinatorTeacherId: event.target.value }))
                        }
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Manter atual</option>
                        {adminWorkspace.data.teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignment-notes">Observacoes</Label>
                    <Textarea
                      id="assignment-notes"
                      value={assignmentForm.notes}
                      onChange={(event) => setAssignmentForm((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() =>
                      saveAssignment.mutate({
                        classSectionId: Number(assignmentForm.classSectionId),
                        subjectId: Number(assignmentForm.subjectId),
                        teacherId: Number(assignmentForm.teacherId),
                        weeklySlotTarget: Number(assignmentForm.weeklySlotTarget),
                        coordinatorTeacherId: assignmentForm.coordinatorTeacherId
                          ? Number(assignmentForm.coordinatorTeacherId)
                          : null,
                        notes: assignmentForm.notes || undefined,
                      })
                    }
                    disabled={
                      !assignmentForm.classSectionId ||
                      !assignmentForm.subjectId ||
                      !assignmentForm.teacherId ||
                      saveAssignment.isPending
                    }
                  >
                    {saveAssignment.isPending ? "Salvando..." : "Salvar atribuicao"}
                  </Button>
                </CardContent>
              </Card>
            </div>

          </TabsContent>
        )}
        {isTeacher && teacherWorkspace.data && (
          <TabsContent value="teacher" className="space-y-6">
            <WorkflowGuideCard
              title="Seu envio em 4 etapas"
              description="A leitura ideal do professor e: conferir elegibilidade, escolher materias, indicar turmas e registrar disponibilidade antes de salvar."
              nextAction={teacherNextAction}
              metrics={[
                { label: "Materias elegiveis", value: String(teacherEligibleCount) },
                { label: "Materias escolhidas", value: String(teacherSelectedSubjectCount) },
                { label: "Turmas marcadas", value: String(teacherSelectedSectionCount) },
                {
                  label: "Carga oficial",
                  value: `${teacherWorkspace.data.teacher.assignedSlotCount}/${teacherWorkspace.data.teacher.weeklyLoadTargetHours}`,
                },
              ]}
              steps={[
                {
                  label: "Revisar sua elegibilidade",
                  description: "Veja as materias ranqueadas e use o topo da lista como referencia de maior afinidade.",
                  status: teacherEligibleCount > 0 ? "done" : "pending",
                },
                {
                  label: "Escolher materias",
                  description: "Marque as disciplinas que deseja assumir neste periodo.",
                  status: teacherSelectedSubjectCount > 0 ? "done" : teacherEligibleCount > 0 ? "current" : "pending",
                },
                {
                  label: "Associar turmas",
                  description: "Depois de escolher as materias, indique em quais turmas voce prefere atuar.",
                  status:
                    teacherSelectedSectionCount > 0
                      ? "done"
                      : teacherSelectedSubjectCount > 0
                        ? "current"
                        : "pending",
                },
                {
                  label: "Salvar preferencias",
                  description: "Ao salvar, o admin usa seu envio para montar o rascunho. Isso nao publica sua grade automaticamente.",
                  status: teacherSubmissionStatus === "submitted" ? "done" : teacherCanSubmit ? "current" : "pending",
                },
              ]}
              footer={`Carga restante para cobertura oficial: ${teacherWorkspace.data.teacher.remainingLoadHours}. Se o ranking estiver vazio, revise formacao, competencias e historico docente.`}
            />

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Fila e carga semanal</CardTitle>
                  <CardDescription>
                    Transparencia da prioridade parametrizada e da carga atual ja ocupada na grade publicada.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Professor</p>
                    <p className="mt-2 text-lg font-semibold">{teacherWorkspace.data.teacher.name}</p>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Carreira</p>
                    <p className="mt-2 text-lg font-semibold">{teacherWorkspace.data.teacher.careerTrack || "Nao definida"}</p>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Prioridade</p>
                    <p className="mt-2 text-3xl font-bold">{teacherWorkspace.data.teacher.priorityOrder}</p>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Carga restante</p>
                    <p className="mt-2 text-3xl font-bold">{teacherWorkspace.data.teacher.remainingLoadHours}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Apoio assistivo controlado</CardTitle>
                  <CardDescription>
                    A IA e apenas assistiva. O sistema continua usando validacoes deterministicas para decidir.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={teacherWorkspace.data.aiAssistance.available ? "secondary" : "outline"}>
                      {teacherWorkspace.data.aiAssistance.available ? "Google AI disponivel" : "Fallback deterministico ativo"}
                    </Badge>
                    <Badge variant="outline">Sem permissao automatica</Badge>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => aiAssist.mutate(teacherWorkspace.data.teacher.id)}
                    disabled={aiAssist.isPending}
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    {aiAssist.isPending ? "Consultando..." : "Gerar sugestao assistiva"}
                  </Button>
                  {aiAssist.data && (
                    <div className="space-y-2 rounded-xl border bg-slate-50 p-4 text-sm">
                      {aiAssist.data.suggestions.map((item, index) => (
                        <p key={index}>{item.summary}</p>
                      ))}
                      <div className="space-y-1">
                        {aiAssist.data.deterministicFallback.map((item) => (
                          <div key={item.subjectId} className="flex items-center justify-between gap-3">
                            <span>{item.subjectName}</span>
                            <Badge variant="outline">
                              {item.finalScore} / {formatCompatibilityBand(item.compatibilityBand)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Preferencias do professor</CardTitle>
                  <CardDescription>
                    Escolha materias, turmas desejadas e disponibilidade semanal. Isso registra preferencia, nao atribuicao final.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-xl border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">
                    Fluxo recomendado: 1) revise o ranking de afinidade, 2) marque as materias desejadas, 3) escolha
                    as turmas correspondentes, 4) registre sua disponibilidade e salve. O envio orienta o admin, mas
                    nao cria atribuicao oficial automaticamente.
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">Materias elegiveis ranqueadas</h3>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {teacherWorkspace.data.eligibleSubjects.length === 0 ? (
                        <div className="rounded-xl border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground md:col-span-2">
                          Nenhuma materia elegivel foi encontrada para este professor. Cadastre formacao,
                          competencias, historico docente ou ajustes manuais para habilitar o ranking real.
                        </div>
                      ) : (
                        teacherWorkspace.data.eligibleSubjects.slice(0, 8).map((subject) => {
                          const checked = preferredSubjectIds.includes(subject.subjectId);
                          return (
                            <label key={subject.subjectId} className="rounded-xl border p-4 text-sm cursor-pointer bg-white">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) => {
                                    const nextChecked = Boolean(value);
                                    setPreferredSubjectIds((current) =>
                                      nextChecked
                                        ? current.includes(subject.subjectId)
                                          ? current
                                          : [...current, subject.subjectId]
                                        : current.filter((item) => item !== subject.subjectId),
                                    );
                                    if (!nextChecked) {
                                      setPreferredSectionPairs((current) =>
                                        current.filter((item) => item.subjectId !== subject.subjectId),
                                      );
                                    }
                                  }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium">{subject.subjectName}</p>
                                    <Badge variant="outline">{subject.finalScore}</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Faixa: {formatCompatibilityBand(subject.compatibilityBand)}
                                  </p>
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">Turmas pretendidas</h3>
                    </div>
                    <div className="space-y-3">
                      {preferredSubjectIds.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Selecione ao menos uma materia para listar turmas pretendidas.</p>
                      ) : (
                        preferredSubjectIds.map((subjectId) => {
                          const subject = teacherWorkspace.data?.eligibleSubjects.find((item) => item.subjectId === subjectId);
                          if (!subject) return null;

                          return (
                            <div key={subjectId} className="rounded-xl border p-4">
                              <p className="font-medium">{subject.subjectName}</p>
                              <div className="mt-3 grid gap-2 md:grid-cols-2">
                                {teacherSectionOptions.map((section) => {
                                  const checked = preferredSectionPairs.some(
                                    (item) => item.subjectId === subjectId && item.classSectionId === section.id,
                                  );

                                  return (
                                    <label key={`${subjectId}-${section.id}`} className="flex items-start gap-3 rounded-lg border p-3">
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(value) => {
                                          const nextChecked = Boolean(value);
                                          setPreferredSectionPairs((current) => {
                                            const exists = current.some(
                                              (item) => item.subjectId === subjectId && item.classSectionId === section.id,
                                            );
                                            if (nextChecked && !exists) {
                                              return [...current, { subjectId, classSectionId: section.id }];
                                            }
                                            if (!nextChecked) {
                                              return current.filter(
                                                (item) =>
                                                  !(item.subjectId === subjectId && item.classSectionId === section.id),
                                              );
                                            }
                                            return current;
                                          });
                                        }}
                                      />
                                      <div className="text-sm">
                                        <p className="font-medium">
                                          {section.code} - {section.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{section.courseName}</p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold">Disponibilidade semanal</h3>
                    <div className="overflow-x-auto rounded-xl border">
                      <table className="min-w-[760px] w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="border p-2 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              Bloco
                            </th>
                            {teacherWorkspace.data.weekdays.map((weekday) => (
                              <th
                                key={weekday}
                                className="border p-2 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground"
                              >
                                {WEEKDAY_LABELS[weekday]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {teacherWorkspace.data.timeSlots
                            .filter((slot) => !slot.isBreak)
                            .map((timeSlot) => (
                              <tr key={timeSlot.id}>
                                <td className="border p-2 text-sm font-medium">{timeSlot.label}</td>
                                {teacherWorkspace.data.weekdays.map((weekday) => {
                                  const key = `${weekday}:${timeSlot.id}`;
                                  const checked = availabilityMap[key] ?? true;
                                  return (
                                    <td key={key} className="border p-2 text-center">
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(value) =>
                                          setAvailabilityMap((current) => ({
                                            ...current,
                                            [key]: Boolean(value),
                                          }))
                                        }
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacher-notes">Observacoes do professor</Label>
                    <Textarea
                      id="teacher-notes"
                      value={teacherNotes}
                      onChange={(event) => setTeacherNotes(event.target.value)}
                      placeholder="Preferencias de turno, restricoes pedagogicas, observacoes de disponibilidade..."
                    />
                  </div>

                  <div
                    className={`rounded-xl border p-4 text-sm ${
                      teacherCanSubmit
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    <p className="font-medium">
                      {teacherCanSubmit ? "Seu envio esta consistente para salvar." : "Seu envio ainda precisa de etapas basicas."}
                    </p>
                    <p className="mt-1">
                      {teacherNextAction}
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() =>
                      saveTeacherPreferences.mutate({
                        notes: teacherNotes || undefined,
                        subjectIds: preferredSubjectIds,
                        sectionPreferences: preferredSectionPairs.map((item, index) => ({
                          subjectId: item.subjectId,
                          classSectionId: item.classSectionId,
                          priority: index + 1,
                        })),
                        availability: Object.entries(availabilityMap).map(([key, isAvailable]) => {
                          const [weekday, timeSlotId] = key.split(":");
                          return {
                            weekday: weekday as Weekday,
                            timeSlotId: Number(timeSlotId),
                            isAvailable,
                          };
                        }),
                      })
                    }
                    disabled={saveTeacherPreferences.isPending}
                  >
                    {saveTeacherPreferences.isPending ? "Salvando..." : "Salvar preferencias"}
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Grade oficial publicada</CardTitle>
                    <CardDescription>Esta e a fonte operacional para materiais, notas e faltas.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {teacherPublishedSchedule && teacherPublishedSchedule.entries.length > 0 ? (
                      <AcademicWeeklySchedule
                        title={teacherPublishedSchedule.title}
                        subtitle={teacherPublishedSchedule.subtitle}
                        semesterLabel={teacherPublishedSchedule.semesterLabel}
                        timeSlots={teacherPublishedSchedule.timeSlots}
                        weekdays={teacherPublishedSchedule.weekdays}
                        entries={teacherPublishedSchedule.entries}
                        generatedAt={teacherPublishedSchedule.generatedAt}
                        institutionLabel={teacherPublishedSchedule.institutionLabel}
                        sheetId={teacherPublishedSchedule.sheetId}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Ainda nao existe grade publicada vinculada ao seu usuario neste periodo.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Diario oficial por turma/materia</CardTitle>
                    <CardDescription>
                      O professor so consegue lancar nota e faltas quando existe slot oficial publicado para a combinacao.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="record-target">Turma e materia</Label>
                      <select
                        id="record-target"
                        value={recordSelectionKey}
                        onChange={(event) => setRecordSelectionKey(event.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Selecione</option>
                        {teacherRecordOptions.map((option) => (
                          <option key={`${option.classSectionId}:${option.subjectId}`} value={`${option.classSectionId}:${option.subjectId}`}>
                            {option.courseName} | {option.classSectionCode} | {option.subjectName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {recordSheet.isLoading ? (
                      <Skeleton className="h-56 w-full rounded-xl" />
                    ) : !recordSheet.data ? (
                      <p className="text-sm text-muted-foreground">Selecione uma turma/materia oficial para abrir o diario.</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-xl border bg-slate-50 p-4 text-sm">
                          <p className="font-medium">
                            {recordSheet.data.classSection.courseName} | {recordSheet.data.classSection.code} - {recordSheet.data.classSection.name}
                          </p>
                          <p className="text-muted-foreground">Materia: {recordSheet.data.subject.name}</p>
                        </div>
                        <div className="overflow-x-auto rounded-xl border">
                          <table className="w-full min-w-[720px] border-collapse">
                            <thead>
                              <tr className="bg-slate-50">
                                <th className="border p-3 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">Aluno</th>
                                <th className="border p-3 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">R.A.</th>
                                <th className="border p-3 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">Nota</th>
                                <th className="border p-3 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">Faltas</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recordSheet.data.students.map((student) => (
                                <tr key={student.studentId}>
                                  <td className="border p-3">{student.studentName}</td>
                                  <td className="border p-3">{student.studentRa}</td>
                                  <td className="border p-3">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={10}
                                      step={0.1}
                                      defaultValue={student.grade ?? ""}
                                      disabled={!recordSheet.data?.canEdit || saveAcademicRecord.isPending}
                                      onBlur={(event) => {
                                        const value = event.target.value.trim();
                                        if (!value) return;
                                        saveAcademicRecord.mutate({
                                          studentId: student.studentId,
                                          grade: Number(value),
                                        });
                                      }}
                                    />
                                  </td>
                                  <td className="border p-3">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={99}
                                      step={1}
                                      defaultValue={student.absences}
                                      disabled={!recordSheet.data?.canEdit || saveAcademicRecord.isPending}
                                      onBlur={(event) => {
                                        const value = event.target.value.trim();
                                        if (!value) return;
                                        saveAcademicRecord.mutate({
                                          studentId: student.studentId,
                                          absences: Number(value),
                                        });
                                      }}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
