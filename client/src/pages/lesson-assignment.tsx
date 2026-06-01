import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { ArrowRight, Ban, CalendarDays, ChevronDown, Download, Eraser, MapPin, Pencil, Plus, Save, Trash2, Wand2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { getPrintTableColor, printTableDocument, type PrintTableDocument } from "@/lib/print-table";
import { useAuth } from "@/hooks/use-auth";
import { useCourseSubjects } from "@/hooks/use-courses";
import { useUpdateClassSectionStage } from "@/hooks/use-class-sections";
import { StageAdvanceDialog } from "@/components/stage-advance-dialog";
import {
  useAcademicTerms,
  useCreateLessonLocation,
  useDeleteLessonLocation,
  useDeleteLessonScheduleDraft,
  useLessonLocations,
  useLessonSchedule,
  useLessonScheduleDraft,
  useSaveLessonSchedule,
  useSaveLessonScheduleDraft,
  useTeacherBusySlots,
  useTeacherLoads,
  useUpdateLessonLocation,
} from "@/hooks/use-lesson-schedules";
import { useStudentScope } from "@/hooks/use-students";
import { useUsers } from "@/hooks/use-users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PrintTableDialog } from "@/components/print-table-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  DAYS,
  LESSON_NUMBERS,
  PERIOD_ROWS,
  slotKey,
  splitSlotKey,
  type DayOfWeek,
  type Period,
} from "@/lib/schedule-grid";

type LessonBlock = {
  clientId: string;
  subjectId: number;
  teacherId: number;
  locationId: number;
};
type SlotMap = Record<string, string>;
type SlotFeedback = { targetSlot?: string; relocatedSlot?: string };
type DragBlockData = { blockClientId: string; sourceSlot?: string };

const SLOT_SEQUENCE = DAYS.flatMap((day) => LESSON_NUMBERS.map((lessonNumber) => `${day.key}-${lessonNumber}`));

function getRelocationSequence(fromSlotKey: string) {
  const { dayOfWeek, lessonNumber } = splitSlotKey(fromSlotKey);
  const dayIndex = DAYS.findIndex((day) => day.key === dayOfWeek);
  const orderedDays = [...DAYS.slice(dayIndex), ...DAYS.slice(0, dayIndex)];

  return orderedDays.flatMap((day, index) => {
    const firstLesson = index === 0 ? lessonNumber + 1 : 1;
    return LESSON_NUMBERS.filter((currentLesson) => currentLesson >= firstLesson).map((currentLesson) =>
      slotKey(day.key, currentLesson),
    );
  });
}

function makeClientId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}


function DraggableBlock({
  block,
  sourceSlot,
  children,
}: {
  block: LessonBlock;
  sourceSlot?: string;
  children: React.ReactNode;
}) {
  const dragId = sourceSlot ? `${sourceSlot}:${block.clientId}` : `available:${block.clientId}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { blockClientId: block.clientId, sourceSlot } satisfies DragBlockData,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn("touch-none", isDragging && "opacity-0")}
    >
      {children}
    </div>
  );
}

function DroppableSlot({
  id,
  feedback,
  forbidden,
  children,
}: {
  id: string;
  feedback?: "target" | "relocated";
  forbidden?: boolean;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      title={forbidden ? "Indisponivel: professor ja alocado em outra turma" : undefined}
      className={cn(
        "relative min-h-20 h-full rounded-md border border-dashed border-slate-200 bg-white/80 p-1 transition-all md:min-h-24",
        isOver && !forbidden && "border-primary bg-primary/5",
        feedback === "target" && "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-300",
        feedback === "relocated" && "border-amber-500 bg-amber-50/80 ring-2 ring-amber-300",
        // Slot proibido para o professor do bloco em arraste (conflito em outra turma).
        forbidden && "cursor-not-allowed border-red-500 bg-red-50/70 ring-2 ring-red-300",
      )}
    >
      {/* Pista nao-cromatica (alem do vermelho) para indicar slot indisponivel. */}
      {forbidden && (
        <Ban
          role="img"
          aria-label="Slot indisponivel para este professor"
          className="pointer-events-none absolute right-1 top-1 z-10 h-4 w-4 text-red-600"
        />
      )}
      {children}
    </div>
  );
}

function FilteredPicker({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value?: number;
  placeholder: string;
  options: Array<{ id: number; label: string; detail?: string }>;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.id === value);
  const filtered = options.filter((option) =>
    `${option.label} ${option.detail ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  // Combobox: o proprio campo e a busca. Fechado mostra a opcao escolhida; aberto
  // mostra o texto digitado no lugar do placeholder.
  const displayValue = open ? search : selected?.label ?? "";

  return (
    <div className="relative space-y-2">
      <Label>{label}</Label>
      <div className={cn("relative", open && "z-50")}>
        <Input
          value={displayValue}
          placeholder={placeholder}
          className="pr-8"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setSearch(event.target.value);
            if (!open) setOpen(true);
          }}
        />
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60 transition-transform",
            open && "rotate-180",
          )}
        />
      </div>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Fechar seletor"
            onClick={() => {
              setOpen(false);
              setSearch("");
            }}
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
            <div className="max-h-56 overflow-y-auto space-y-1">
              {filtered.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100"
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="block font-medium leading-tight">{option.label}</span>
                  {option.detail && <span className="block text-xs text-muted-foreground">{option.detail}</span>}
                </button>
              ))}
              {filtered.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">Nenhum resultado.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LocationPicker({
  value,
  locations,
  onChange,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  value?: number;
  locations: Array<{ id: number; name: string; blockCount?: number }>;
  onChange: (value: number) => void;
  onCreated: (name: string) => Promise<number | undefined>;
  onUpdated: (id: number, name: string) => Promise<void>;
  onDeleted: (id: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [locationConfirm, setLocationConfirm] = useState<
    | { type: "edit"; id: number; name: string }
    | { type: "delete"; id: number; blockCount: number }
    | null
  >(null);
  const selected = locations.find((location) => location.id === value);
  const filtered = locations.filter((location) => location.name.toLowerCase().includes(search.trim().toLowerCase()));

  async function confirmCreate() {
    const name = draftName.trim();
    if (!name) return;
    const createdId = await onCreated(name);
    if (createdId) onChange(createdId);
    setDraftName("");
    setIsCreating(false);
    setOpen(false);
  }

  function requestEdit(id: number) {
    const name = draftName.trim();
    if (!name) return;
    setLocationConfirm({ type: "edit", id, name });
  }

  return (
    <div className="relative space-y-2">
      <Label>Localizacao</Label>
      <div className={cn("relative flex gap-2", open && "z-50")}>
        <div className="relative min-w-0 flex-1">
          <Input
            value={open ? search : selected?.name ?? ""}
            placeholder="Selecionar local"
            className="pr-8"
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setSearch(event.target.value);
              setIsCreating(false);
              if (!open) setOpen(true);
            }}
          />
          <MapPin className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => {
            setOpen(true);
            setIsCreating(true);
            setDraftName("");
          }}
          aria-label="Criar localizacao"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Fechar seletor de localizacao"
            onClick={() => {
              setOpen(false);
              setSearch("");
              setIsCreating(false);
            }}
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
          {isCreating && (
            <Input
              autoFocus
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "ArrowRight") void confirmCreate();
                if (event.key === "Escape") setIsCreating(false);
              }}
              placeholder="Nova localizacao"
              className="mb-2"
            />
          )}
          <div className="max-h-60 overflow-y-auto space-y-1">
            {filtered.map((location) => (
              <div key={location.id} className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-slate-100">
                {editingId === location.id ? (
                  <Input
                    autoFocus
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === "ArrowRight") requestEdit(location.id);
                      if (event.key === "Escape") {
                        setEditingId(null);
                        setDraftName("");
                      }
                    }}
                    className="h-8"
                  />
                ) : (
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left text-sm"
                    onClick={() => {
                      onChange(location.id);
                      setOpen(false);
                    }}
                  >
                    <span className="block truncate font-medium">{location.name}</span>
                    <span className="text-xs text-muted-foreground">{location.blockCount ?? 0} bloco(s) salvos</span>
                  </button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    setEditingId(location.id);
                    setDraftName(location.name);
                  }}
                  aria-label="Editar localizacao"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  onClick={() => {
                    setLocationConfirm({ type: "delete", id: location.id, blockCount: location.blockCount ?? 0 });
                  }}
                  aria-label="Excluir localizacao"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {filtered.length === 0 && !isCreating && (
              <p className="px-2 py-3 text-sm text-muted-foreground">Nenhuma localizacao encontrada.</p>
            )}
          </div>
          </div>
        </>
      )}

      <AlertDialog open={locationConfirm !== null} onOpenChange={(open) => { if (!open) setLocationConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {locationConfirm?.type === "edit" ? "Renomear localização" : "Excluir localização"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {locationConfirm?.type === "edit"
                ? "O novo nome será aplicado em todos os blocos já salvos que usam esta localização."
                : `Esta localização e seus ${locationConfirm?.blockCount ?? 0} bloco(s) vinculado(s) serão removidos permanentemente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={locationConfirm?.type === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
              onClick={async (e) => {
                e.preventDefault();
                if (!locationConfirm) return;
                if (locationConfirm.type === "edit") {
                  await onUpdated(locationConfirm.id, locationConfirm.name);
                  setEditingId(null);
                  setDraftName("");
                } else {
                  await onDeleted(locationConfirm.id);
                }
                setLocationConfirm(null);
              }}
            >
              {locationConfirm?.type === "edit" ? "Sim, renomear" : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function LessonAssignment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: scope, error: scopeError } = useStudentScope(user?.role === "admin");
  const { data: terms } = useAcademicTerms();
  const { data: teachers } = useUsers("teacher");
  const { data: locations } = useLessonLocations();
  const { data: teacherLoads } = useTeacherLoads(user?.role === "admin");
  const createLocation = useCreateLessonLocation();
  const updateLocation = useUpdateLessonLocation();
  const deleteLocation = useDeleteLessonLocation();
  const saveSchedule = useSaveLessonSchedule();
  const saveDraft = useSaveLessonScheduleDraft();
  const deleteDraft = useDeleteLessonScheduleDraft();
  const updateStage = useUpdateClassSectionStage();

  const [selectedClassSectionId, setSelectedClassSectionId] = useState<number | null>(null);
  const [selectedAcademicTermId, setSelectedAcademicTermId] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>("noturno");
  const [step, setStep] = useState<1 | 2>(1);
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [slots, setSlots] = useState<SlotMap>({});
  const [hydratedKey, setHydratedKey] = useState("");
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [actionConfirm, setActionConfirm] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);
  const [forbiddenFlash, setForbiddenFlash] = useState<string[]>([]);
  const [slotFeedback, setSlotFeedback] = useState<SlotFeedback>({});
  const [blockForm, setBlockForm] = useState<LessonBlock>({
    clientId: "",
    subjectId: 0,
    teacherId: 0,
    locationId: 0,
  });
  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const selectedSection = scope?.classSections.find((section) => section.id === selectedClassSectionId);
  const scopeErrorMessage = scopeError instanceof Error ? scopeError.message : null;
  const selectedAcademicTerm = terms?.find((term) => term.id === selectedAcademicTermId);
  const selectedCourseId = selectedSection?.courseId ?? 0;
  // Mostrar apenas as disciplinas da etapa (semestre) atual da turma selecionada,
  // evitando a lista inteira do curso ao montar os blocos.
  const { data: subjects } = useCourseSubjects(selectedCourseId, selectedClassSectionId, {
    onlyCurrentStage: true,
  });
  const { data: activeSchedule } = useLessonSchedule(selectedClassSectionId, selectedAcademicTermId);
  const { data: serverDraft } = useLessonScheduleDraft(selectedClassSectionId, selectedAcademicTermId);
  // Horarios em que cada professor ja esta ocupado em OUTRAS turmas do mesmo semestre+periodo.
  const { data: teacherBusy } = useTeacherBusySlots(selectedAcademicTermId, period, selectedClassSectionId);
  // teacherId -> (slotKey "dia-aula" -> codigo da turma conflitante)
  const busyByTeacher = useMemo(() => {
    const map = new Map<number, Map<string, string>>();
    for (const entry of teacherBusy ?? []) {
      const slots = map.get(entry.teacherId) ?? new Map<string, string>();
      slots.set(`${entry.dayOfWeek}-${entry.lessonNumber}`, entry.classSectionCode);
      map.set(entry.teacherId, slots);
    }
    return map;
  }, [teacherBusy]);
  const storageKey =
    selectedClassSectionId && selectedAcademicTermId
      ? `lesson-assignment:${selectedClassSectionId}:${selectedAcademicTermId}`
      : "";
  const draftSignature = useMemo(() => {
    if (!storageKey || hydratedKey !== storageKey) return "";
    return JSON.stringify({
      period,
      blocks,
      slots: Object.entries(slots).map(([key, blockClientId]) => ({ ...splitSlotKey(key), blockClientId })),
    });
  }, [blocks, hydratedKey, period, slots, storageKey]);

  const subjectOptions = useMemo(
    () =>
      (subjects ?? []).map((subject) => ({
        id: subject.id,
        label: subject.name,
        detail: `${subject.workloadHours}h`,
      })),
    [subjects],
  );
  const createSubjectOptions = useMemo(() => {
    const usedSubjectIds = new Set(blocks.map((block) => block.subjectId));
    return subjectOptions.filter((option) => !usedSubjectIds.has(option.id));
  }, [blocks, subjectOptions]);
  const editSubjectOptions = useMemo(() => {
    if (!editingBlockId) return subjectOptions;
    const editingBlock = blocks.find((block) => block.clientId === editingBlockId);
    const usedSubjectIds = new Set(
      blocks.filter((block) => block.clientId !== editingBlockId).map((block) => block.subjectId),
    );
    return subjectOptions.filter((option) => option.id === editingBlock?.subjectId || !usedSubjectIds.has(option.id));
  }, [blocks, editingBlockId, subjectOptions]);
  const teacherOptions = useMemo(() => {
    const loadById = new Map((teacherLoads ?? []).map((load) => [load.teacherId, load.classCount]));
    // Priorizar professores com menos turmas vinculadas (ordem crescente de carga).
    return (teachers ?? [])
      .map((teacher) => ({
        id: teacher.id,
        label: teacher.name,
        detail: `${loadById.get(teacher.id) ?? 0} turma(s) vinculada(s)`,
        load: loadById.get(teacher.id) ?? 0,
      }))
      .sort((a, b) => a.load - b.load || a.label.localeCompare(b.label))
      .map(({ load: _load, ...option }) => option);
  }, [teachers, teacherLoads]);
  const sortedLocations = useMemo(
    // Priorizar locais com menos blocos salvos (ordem crescente de uso).
    () =>
      [...(locations ?? [])].sort(
        (a, b) => (a.blockCount ?? 0) - (b.blockCount ?? 0) || a.name.localeCompare(b.name),
      ),
    [locations],
  );
  const blockDetails = useMemo(() => {
    const subjectById = new Map((subjects ?? []).map((subject) => [subject.id, subject]));
    const teacherById = new Map((teachers ?? []).map((teacher) => [teacher.id, teacher]));
    const locationById = new Map((locations ?? []).map((location) => [location.id, location]));
    return new Map(
      blocks.map((block) => [
        block.clientId,
        {
          block,
          subject: subjectById.get(block.subjectId),
          teacher: teacherById.get(block.teacherId),
          location: locationById.get(block.locationId),
        },
      ]),
    );
  }, [blocks, locations, subjects, teachers]);
  const activeDragDetails = activeDragId ? blockDetails.get(activeDragId) : undefined;
  // Slots proibidos para o professor do bloco em arraste (ja ocupado em outra turma).
  const activeForbiddenSlots = useMemo(() => {
    const teacherId = activeDragDetails?.block.teacherId;
    if (!teacherId) return new Set<string>();
    return new Set(busyByTeacher.get(teacherId)?.keys() ?? []);
  }, [activeDragDetails, busyByTeacher]);
  useEffect(() => {
    if (forbiddenFlash.length === 0) return;
    const timeout = window.setTimeout(() => setForbiddenFlash([]), 2200);
    return () => window.clearTimeout(timeout);
  }, [forbiddenFlash]);
  const printBlockColors = useMemo(
    () => new Map(blocks.map((block, index) => [block.clientId, getPrintTableColor(index)])),
    [blocks],
  );
  const lessonPrintDocument = useMemo<PrintTableDocument>(() => {
    const classLabel = selectedSection
      ? `${selectedSection.code} - ${selectedSection.name}`
      : "Turma nao selecionada";
    const termLabel = selectedAcademicTerm
      ? `${selectedAcademicTerm.code} - ${selectedAcademicTerm.name}`
      : "Semestre nao selecionado";

    return {
      title: "Tabela semanal de aulas",
      subtitle: classLabel,
      details: [`Semestre: ${termLabel}`, `Periodo: ${period}`, `Gerado em: ${new Date().toLocaleString("pt-BR")}`],
      columns: DAYS.map((day) => day.label),
      legend: blocks.map((block) => {
        const details = blockDetails.get(block.clientId);
        return {
          label: details?.subject?.name ?? "Materia",
          description: `Prof. ${details?.teacher?.name ?? "Professor"}`,
          meta: details?.location?.name ?? "Localizacao",
          color: printBlockColors.get(block.clientId) ?? getPrintTableColor(0),
        };
      }),
      rows: PERIOD_ROWS[period].map((row) => {
        if (row.kind === "interval") {
          return {
            header: row.label,
            kind: "interval",
            intervalLabel: "Intervalo",
          };
        }

        return {
          header: row.label,
          cells: DAYS.map((day) => {
            const key = slotKey(day.key, row.lessonNumber);
            const blockId = slots[key];
            const details = blockId ? blockDetails.get(blockId) : undefined;
            if (!blockId || !details) return {};

            return {
              title: details.subject?.name ?? "Materia",
              subtitle: `Prof. ${details.teacher?.name ?? "Professor"}`,
              meta: details.location?.name ?? "Localizacao",
              color: printBlockColors.get(blockId) ?? getPrintTableColor(0),
            };
          }),
        };
      }),
    };
  }, [blockDetails, blocks, period, printBlockColors, selectedAcademicTerm, selectedSection, slots]);

  useEffect(() => {
    if (!slotFeedback.targetSlot && !slotFeedback.relocatedSlot) return;
    const timeout = window.setTimeout(() => setSlotFeedback({}), 1200);
    return () => window.clearTimeout(timeout);
  }, [slotFeedback]);

  useEffect(() => {
    if (!selectedClassSectionId && scope?.classSections[0]) {
      const firstSection = scope.classSections[0];
      setSelectedClassSectionId(firstSection.id);
      setSelectedAcademicTermId(firstSection.academicTermId);
      setPeriod(firstSection.period);
    }
  }, [scope?.classSections, selectedClassSectionId]);

  useEffect(() => {
    if (!selectedAcademicTermId && terms?.[0]) {
      setSelectedAcademicTermId(terms[0].id);
    }
  }, [selectedAcademicTermId, terms]);

  useEffect(() => {
    if (!storageKey || hydratedKey === storageKey) return;

    const localPayload = window.localStorage.getItem(storageKey);
    if (localPayload) {
      try {
        const parsed = JSON.parse(localPayload) as { period: Period; blocks: LessonBlock[]; slots: Array<{ dayOfWeek: DayOfWeek; lessonNumber: number; blockClientId: string }> };
        setPeriod(parsed.period);
        setBlocks(parsed.blocks);
        setSlots(Object.fromEntries(parsed.slots.map((slot) => [slotKey(slot.dayOfWeek, slot.lessonNumber), slot.blockClientId])));
        setStep(2);
        setHydratedKey(storageKey);
        return;
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    if (serverDraft) {
      setPeriod(serverDraft.period);
      setBlocks(serverDraft.draftPayload.blocks);
      setSlots(
        Object.fromEntries(
          serverDraft.draftPayload.slots.map((slot) => [slotKey(slot.dayOfWeek, slot.lessonNumber), slot.blockClientId]),
        ),
      );
      setStep(2);
      setHydratedKey(storageKey);
      return;
    }

    if (activeSchedule) {
      const blocksFromSchedule = activeSchedule.blocks.map((block) => ({
        clientId: String(block.id),
        subjectId: block.subjectId,
        teacherId: block.teacherId,
        locationId: block.locationId,
      }));
      const blockIdToClientId = new Map(activeSchedule.blocks.map((block) => [block.id, String(block.id)]));
      setPeriod(activeSchedule.period);
      setBlocks(blocksFromSchedule);
      setSlots(
        Object.fromEntries(
          activeSchedule.slots.map((slot) => [slotKey(slot.dayOfWeek, slot.lessonNumber), blockIdToClientId.get(slot.blockId) ?? ""]),
        ),
      );
      setStep(2);
      setHydratedKey(storageKey);
      return;
    }

    setBlocks([]);
    setSlots({});
    setStep(1);
    setPeriod(selectedSection?.period ?? "noturno");
    setHydratedKey(storageKey);
  }, [activeSchedule, hydratedKey, selectedSection?.period, serverDraft, storageKey]);

  useEffect(() => {
    if (!storageKey || !draftSignature || hydratedKey !== storageKey) return;

    const payload = JSON.parse(draftSignature) as {
      period: Period;
      blocks: LessonBlock[];
      slots: Array<{ dayOfWeek: DayOfWeek; lessonNumber: number; blockClientId: string }>;
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));

    const timeout = window.setTimeout(() => {
      if (selectedClassSectionId && selectedAcademicTermId) {
        saveDraft.mutate({
          classSectionId: selectedClassSectionId,
          academicTermId: selectedAcademicTermId,
          period,
          draftPayload: payload,
        });
      }
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [draftSignature, hydratedKey, selectedAcademicTermId, selectedClassSectionId, storageKey]);

  function resetContext(nextClassSectionId: number) {
    const section = scope?.classSections.find((entry) => entry.id === nextClassSectionId);
    setSelectedClassSectionId(nextClassSectionId);
    setSelectedAcademicTermId(section?.academicTermId ?? terms?.[0]?.id ?? null);
    setPeriod(section?.period ?? "noturno");
    setHydratedKey("");
  }

  function addBlock() {
    if (!blockForm.subjectId || !blockForm.teacherId || !blockForm.locationId) {
      toast({ title: "Bloco incompleto", description: "Selecione materia, professor e localizacao.", variant: "destructive" });
      return;
    }
    if (blocks.some((block) => block.subjectId === blockForm.subjectId)) {
      toast({
        title: "Materia ja atribuida",
        description: "A mesma materia nao pode ter dois blocos na mesma turma e semestre.",
        variant: "destructive",
      });
      return;
    }
    setBlocks((current) => [...current, { ...blockForm, clientId: makeClientId() }]);
    setBlockForm({ clientId: "", subjectId: 0, teacherId: 0, locationId: 0 });
  }

  function updateBlockSubject(clientId: string, subjectId: number) {
    if (blocks.some((block) => block.clientId !== clientId && block.subjectId === subjectId)) {
      toast({
        title: "Materia ja atribuida",
        description: "A mesma materia nao pode ter dois professores na mesma turma e semestre.",
        variant: "destructive",
      });
      return;
    }

    setBlocks((current) => current.map((block) => (block.clientId === clientId ? { ...block, subjectId } : block)));
  }

  function removeBlockCompletely(clientId: string) {
    setActionConfirm({
      title: "Excluir bloco",
      description: "Este bloco será removido da lista lateral e de todos os slots da tabela. Esta ação não pode ser desfeita.",
      onConfirm: () => {
        setBlocks((current) => current.filter((block) => block.clientId !== clientId));
        setSlots((current) => Object.fromEntries(Object.entries(current).filter(([, blockId]) => blockId !== clientId)));
      },
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const overId = String(event.over?.id ?? "");
    const dragData = event.active.data.current as DragBlockData | undefined;
    const blockClientId = dragData?.blockClientId;
    if (!overId || !blockClientId || !blockDetails.has(blockClientId)) return;

    // Impede soltar o bloco em um horario onde o professor ja esta alocado em outra
    // turma (mesmo semestre+periodo): a acao e revertida e os slots proibidos piscam em vermelho.
    const draggedTeacherId = blockDetails.get(blockClientId)?.block.teacherId;
    const conflictCode = draggedTeacherId ? busyByTeacher.get(draggedTeacherId)?.get(overId) : undefined;
    if (conflictCode) {
      const { dayOfWeek, lessonNumber } = splitSlotKey(overId);
      const teacherName = blockDetails.get(blockClientId)?.teacher?.name ?? "Professor";
      const dayLabel = DAYS.find((day) => day.key === dayOfWeek)?.label ?? dayOfWeek;
      toast({
        title: "Conflito de professor",
        description: `${teacherName} ja esta alocado na turma ${conflictCode} nesse horario (${dayLabel}, aula ${lessonNumber}). Bloco nao alocado.`,
        variant: "destructive",
      });
      setForbiddenFlash(Array.from(busyByTeacher.get(draggedTeacherId!)?.keys() ?? []));
      return;
    }

    setSlots((current) => {
      const next = { ...current };
      const sourceSlot = dragData?.sourceSlot;
      const previous = next[overId];
      if (sourceSlot === overId) return current;

      if (sourceSlot) {
        delete next[sourceSlot];
      }

      next[overId] = blockClientId;
      if (previous) {
        const emptySlot = getRelocationSequence(overId).find((key) => !next[key]) ?? sourceSlot;
        if (!emptySlot) {
          toast({
            title: "Tabela sem slots vazios",
            description: "Nao ha espaco livre para realocar o bloco que ja ocupava esse horario.",
            variant: "destructive",
          });
          return current;
        }
        next[emptySlot] = previous;
        setSlotFeedback({ targetSlot: overId, relocatedSlot: emptySlot });
      } else {
        setSlotFeedback({ targetSlot: overId });
      }
      return next;
    });
  }

  function distributeAutomatically() {
    if (blocks.length === 0) return;

    // Um bloco nao pode ocupar um slot onde o seu professor ja esta alocado em
    // OUTRA turma do mesmo semestre+periodo (conflito fisico). busyByTeacher carrega
    // exatamente esses horarios ocupados, os mesmos usados na prevencao do arraste.
    const isBusy = (block: LessonBlock, slot: string) =>
      busyByTeacher.get(block.teacherId)?.has(slot) ?? false;

    const base = Math.floor(SLOT_SEQUENCE.length / blocks.length);
    const remainder = SLOT_SEQUENCE.length % blocks.length;
    const quota = new Map<string, number>();
    const assigned = new Map<string, number>();
    blocks.forEach((block, index) => {
      quota.set(block.clientId, base + (index < remainder ? 1 : 0));
      assigned.set(block.clientId, 0);
    });

    const nextSlots: SlotMap = {};

    // Passo 1: distribuicao equilibrada respeitando a cota de cada bloco e
    // pulando qualquer slot que geraria conflito para o professor do bloco.
    for (const slot of SLOT_SEQUENCE) {
      let chosen: LessonBlock | undefined;
      let chosenNeed = 0;
      for (const block of blocks) {
        const need = (quota.get(block.clientId) ?? 0) - (assigned.get(block.clientId) ?? 0);
        if (need <= 0 || isBusy(block, slot)) continue;
        if (need > chosenNeed) {
          chosen = block;
          chosenNeed = need;
        }
      }
      if (chosen) {
        nextSlots[slot] = chosen.clientId;
        assigned.set(chosen.clientId, (assigned.get(chosen.clientId) ?? 0) + 1);
      }
    }

    // Passo 2: completar os slots ainda vazios com o bloco menos utilizado que
    // nao gere conflito, evitando buracos desnecessarios na tabela.
    for (const slot of SLOT_SEQUENCE) {
      if (nextSlots[slot]) continue;
      let chosen: LessonBlock | undefined;
      let chosenCount = Number.POSITIVE_INFINITY;
      for (const block of blocks) {
        if (isBusy(block, slot)) continue;
        const count = assigned.get(block.clientId) ?? 0;
        if (count < chosenCount) {
          chosen = block;
          chosenCount = count;
        }
      }
      if (chosen) {
        nextSlots[slot] = chosen.clientId;
        assigned.set(chosen.clientId, (assigned.get(chosen.clientId) ?? 0) + 1);
      }
    }

    setSlots(nextSlots);

    // Slots que sobraram vazios so existem quando TODOS os professores disponiveis
    // ja estao alocados em outra turma naquele horario: deixamos vazio e avisamos.
    const emptyCount = SLOT_SEQUENCE.filter((slot) => !nextSlots[slot]).length;
    if (emptyCount > 0) {
      toast({
        title: "Distribuicao automatica parcial",
        description: `${emptyCount} horario(s) ficaram vazios porque os professores ja estao alocados em outra turma nesses horarios. Preencha manualmente ou troque o professor do bloco.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Distribuicao automatica concluida",
        description: "Os horarios foram preenchidos automaticamente sem conflito de professor.",
      });
    }
  }

  function confirmLaunch() {
    if (!selectedClassSectionId || !selectedAcademicTermId) return;
    const filledSlots = Object.values(slots).filter(Boolean);
    if (filledSlots.length !== 20) {
      toast({ title: "Tabela incompleta", description: "Preencha os 20 slots antes de confirmar.", variant: "destructive" });
      return;
    }
    const sectionId = selectedClassSectionId;
    const termId = selectedAcademicTermId;
    setActionConfirm({
      title: "Lançar tabela de horários",
      description: "Esta ação sobrescreverá a tabela ativa desta turma e semestre. A tabela será salva como a fonte oficial.",
      onConfirm: async () => {
        try {
          await saveSchedule.mutateAsync({
            classSectionId: sectionId,
            academicTermId: termId,
            period,
            blocks,
            slots: Object.entries(slots).map(([key, blockClientId]) => ({ ...splitSlotKey(key), blockClientId })),
          });
        } catch {
          // O erro (ex.: conflito de professor) ja e exibido pelo onError da mutation.
          return;
        }
        window.localStorage.removeItem(storageKey);
        deleteDraft.mutate({ classSectionId: sectionId, academicTermId: termId });
      },
    });
  }

  function openPrintDialog() {
    if (blocks.length === 0 || Object.values(slots).filter(Boolean).length === 0) {
      toast({
        title: "Tabela sem dados para impressao",
        description: "Crie blocos e aloque ao menos um horario antes de imprimir em PDF.",
        variant: "destructive",
      });
      return;
    }

    setPrintDialogOpen(true);
  }

  function confirmPrintTable() {
    try {
      printTableDocument(lessonPrintDocument);
      setPrintDialogOpen(false);
    } catch (error) {
      toast({
        title: "Nao foi possivel imprimir",
        description: error instanceof Error ? error.message : "Verifique se o navegador bloqueou a janela de impressao.",
        variant: "destructive",
      });
    }
  }

  const editingBlock = editingBlockId ? blocks.find((block) => block.clientId === editingBlockId) : undefined;

  if (user?.role !== "admin") {
    return (
      <div className="space-y-2">
        <h2 className="font-display text-3xl font-bold">Atribuicao de Aulas</h2>
        <p className="text-muted-foreground">Esta ferramenta e exclusiva para administradores.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6 overflow-x-hidden", activeDragId && "select-none")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">Atribuicao de Aulas</h2>
          <p className="text-muted-foreground">Monte a tabela semanal ativa por turma e semestre letivo.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="bg-white" onClick={openPrintDialog} aria-label="Imprimir tabela em PDF">
            <Download className="h-4 w-4" />
          </Button>
          <Badge variant="outline" className="w-fit bg-white">
            {activeSchedule ? "Tabela existente" : "Nova tabela"}
          </Badge>
        </div>
      </div>

      {scopeErrorMessage && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Nao foi possivel carregar cursos e turmas: {scopeErrorMessage}
        </div>
      )}

      {scope && scope.classSections.length === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Nenhuma turma encontrada. Reinicie o servidor para o seed criar turmas padrao para cursos existentes.
        </div>
      )}

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            Contexto da tabela
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Turma</Label>
            <Select
              value={selectedClassSectionId ? String(selectedClassSectionId) : undefined}
              onValueChange={(value) => resetContext(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar turma" />
              </SelectTrigger>
              <SelectContent>
                {(scope?.classSections ?? []).map((section) => (
                  <SelectItem key={section.id} value={String(section.id)}>
                    {section.code} - {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSection && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-primary">
                  {selectedSection.currentStageNumber}ª etapa (semestre atual da turma)
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setStageDialogOpen(true)}
                >
                  Alterar etapa
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Semestre letivo</Label>
            <Select
              value={selectedAcademicTermId ? String(selectedAcademicTermId) : undefined}
              onValueChange={(value) => {
                setSelectedAcademicTermId(Number(value));
                setHydratedKey("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar semestre" />
              </SelectTrigger>
              <SelectContent>
                {(terms ?? []).map((term) => (
                  <SelectItem key={term.id} value={String(term.id)}>
                    {term.code} - {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Periodo</Label>
            <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="matutino">Matutino</SelectItem>
                <SelectItem value="vespertino">Vespertino</SelectItem>
                <SelectItem value="noturno">Noturno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <StageAdvanceDialog
        open={stageDialogOpen}
        onOpenChange={setStageDialogOpen}
        section={
          selectedSection
            ? {
                code: selectedSection.code,
                name: selectedSection.name,
                currentStageNumber: selectedSection.currentStageNumber,
              }
            : null
        }
        maxStage={selectedSection?.courseMaxStage}
        isPending={updateStage.isPending}
        onConfirm={(newStage) => {
          if (!selectedSection) return;
          updateStage.mutate(
            { classSectionId: selectedSection.id, currentStageNumber: newStage },
            { onSuccess: () => setStageDialogOpen(false) },
          );
        }}
      />

      {step === 1 && (
        <Card className="relative min-h-[34rem] overflow-visible rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg">Criacao de blocos</CardTitle>
            {selectedSection && (
              <p className="text-sm text-muted-foreground">
                Exibindo apenas as disciplinas da {selectedSection.currentStageNumber}ª etapa desta turma.
              </p>
            )}
          </CardHeader>
          <CardContent className="flex min-h-[27rem] flex-col space-y-5 overflow-visible">
            {selectedSection && (subjects?.length ?? 0) === 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                Nenhuma disciplina vinculada a {selectedSection.currentStageNumber}ª etapa desta turma. Ajuste a matriz
                curricular do curso (na pagina do curso, definindo a etapa de cada disciplina) para que ela apareca aqui.
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-4">
              <FilteredPicker
                label="Materia"
                value={blockForm.subjectId || undefined}
                placeholder="Selecionar materia"
                options={createSubjectOptions}
                onChange={(subjectId) => setBlockForm((current) => ({ ...current, subjectId }))}
              />
              <FilteredPicker
                label="Professor"
                value={blockForm.teacherId || undefined}
                placeholder="Selecionar professor"
                options={teacherOptions}
                onChange={(teacherId) => setBlockForm((current) => ({ ...current, teacherId }))}
              />
              <LocationPicker
                value={blockForm.locationId || undefined}
                locations={sortedLocations}
                onChange={(locationId) => setBlockForm((current) => ({ ...current, locationId }))}
                onCreated={async (name) => (await createLocation.mutateAsync({ name })).id}
                onUpdated={async (id, name) => {
                  await updateLocation.mutateAsync({ id, name });
                }}
                onDeleted={async (id) => {
                  await deleteLocation.mutateAsync(id);
                  setBlocks((current) => current.filter((block) => block.locationId !== id));
                  setSlots((current) => {
                    const removed = new Set(blocks.filter((block) => block.locationId === id).map((block) => block.clientId));
                    return Object.fromEntries(Object.entries(current).filter(([, blockId]) => !removed.has(blockId)));
                  });
                }}
              />
              <div className="flex items-end">
                <Button type="button" className="w-full" onClick={addBlock}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar bloco
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {blocks.map((block) => {
                const details = blockDetails.get(block.clientId);
                return (
                  <div key={block.clientId} className="group rounded-md border bg-white p-3 shadow-sm">
                    <p className="font-semibold leading-tight">{details?.subject?.name ?? "Materia"}</p>
                    <p className="text-sm text-muted-foreground">Prof. {details?.teacher?.name ?? "Professor"}</p>
                    <p className="text-xs text-muted-foreground">{details?.location?.name ?? "Localizacao"}</p>
                    <div className="mt-3 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button type="button" variant="ghost" size="icon" aria-label="Editar bloco" onClick={() => setEditingBlockId(block.clientId)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir bloco"
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => removeBlockCompletely(block.clientId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-auto flex justify-end pt-4">
              <Button type="button" disabled={!selectedClassSectionId || !selectedAcademicTermId} onClick={() => setStep(2)}>
                Ir para alocacao
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <DndContext
          sensors={dndSensors}
          onDragStart={(event) => {
            const dragData = event.active.data.current as DragBlockData | undefined;
            setActiveDragId(dragData?.blockClientId ?? null);
            setForbiddenFlash([]);
          }}
          onDragCancel={() => setActiveDragId(null)}
          onDragEnd={handleDragEnd}
        >
          <div className="grid min-w-0 gap-4 overflow-x-hidden xl:grid-cols-[minmax(0,1fr)_17rem] 2xl:grid-cols-[minmax(0,1fr)_18rem]">
            <Card className="rounded-lg">
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="text-lg">Tabela semanal</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={distributeAutomatically} disabled={blocks.length === 0}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Distribuir automaticamente
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setClearDialogOpen(true)}
                    disabled={Object.keys(slots).length === 0}
                  >
                    <Eraser className="mr-2 h-4 w-4" />
                    Limpar tabela
                  </Button>
                  <Button type="button" onClick={confirmLaunch} disabled={saveSchedule.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Confirmar lancamento
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-hidden">
                <div className="w-full">
                  <div className="grid grid-cols-[6.5rem_repeat(5,minmax(0,1fr))] border-t border-l bg-white text-sm">
                    <div className="border-r border-b bg-slate-50 p-2 text-xs font-semibold md:text-sm">Horario</div>
                    {DAYS.map((day) => (
                      <div key={day.key} className="border-r border-b bg-slate-50 p-2 text-center text-xs font-semibold md:text-sm">
                        {day.label}
                      </div>
                    ))}
                    {PERIOD_ROWS[period].map((row) => (
                      <div key={row.label} className="contents">
                        <div className="border-r border-b p-2 text-[0.68rem] font-medium leading-tight text-muted-foreground md:text-xs">{row.label}</div>
                        {row.kind === "interval" ? (
                          <div className="col-span-5 border-r border-b bg-slate-100 p-3 text-center text-xs font-semibold text-muted-foreground md:text-sm">
                            Intervalo
                          </div>
                        ) : (
                          DAYS.map((day) => {
                            const key = slotKey(day.key, row.lessonNumber);
                            const blockId = slots[key];
                            const details = blockId ? blockDetails.get(blockId) : undefined;
                            const feedback =
                              slotFeedback.targetSlot === key
                                ? "target"
                                : slotFeedback.relocatedSlot === key
                                  ? "relocated"
                                  : undefined;
                            const forbidden =
                              (activeDragId != null && activeForbiddenSlots.has(key)) ||
                              forbiddenFlash.includes(key);
                            return (
                              <div key={key} className="min-w-0 border-r border-b p-1.5">
                                <DroppableSlot id={key} feedback={feedback} forbidden={forbidden}>
                                  {details ? (
                                    <DraggableBlock block={details.block} sourceSlot={key}>
                                      <Tooltip delayDuration={200}>
                                        <TooltipTrigger asChild>
                                          <div
                                            className={cn(
                                              "group relative flex h-full min-h-20 cursor-grab flex-col justify-center rounded-md bg-primary/8 p-1.5 text-primary ring-1 ring-primary/15 transition-all active:cursor-grabbing md:min-h-24 md:p-2",
                                              feedback === "target" && "ring-2 ring-emerald-500",
                                              feedback === "relocated" && "ring-2 ring-amber-500",
                                            )}
                                          >
                                            <button
                                              type="button"
                                              className="absolute right-1 top-1 z-10 rounded bg-transparent p-1 text-primary/65 opacity-0 hover:text-red-600 group-hover:opacity-100"
                                              onPointerDown={(event) => event.stopPropagation()}
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                setSlots((current) => {
                                                  const next = { ...current };
                                                  delete next[key];
                                                  return next;
                                                });
                                              }}
                                              aria-label="Remover bloco do slot"
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </button>
                                            <p className="line-clamp-3 break-words text-[0.66rem] font-semibold leading-tight md:text-[0.74rem]">
                                              {details.subject?.name ?? "Materia"}
                                            </p>
                                            <p className="mt-1 break-words text-[0.62rem] leading-tight text-slate-600 md:text-[0.68rem]">
                                              Prof. {details.teacher?.name ?? "Professor"}
                                            </p>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Carga horaria: {details.subject?.workloadHours ?? 0}h
                                        </TooltipContent>
                                      </Tooltip>
                                    </DraggableBlock>
                                  ) : (
                                    <div className="flex h-full min-h-20 items-center justify-center text-[0.68rem] text-muted-foreground md:min-h-24 md:text-xs">
                                      Solte um bloco
                                    </div>
                                  )}
                                </DroppableSlot>
                              </div>
                            );
                          })
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <aside className="min-w-0 space-y-3">
              <div className="rounded-lg border bg-white p-4">
                <h3 className="font-semibold">Blocos disponiveis</h3>
                <p className="text-sm text-muted-foreground">Arraste para os slots de aula.</p>
              </div>
              <div className="space-y-3">
                {blocks.map((block) => {
                  const details = blockDetails.get(block.clientId);
                  return (
                    <DraggableBlock key={block.clientId} block={block}>
                      <div className="group cursor-grab rounded-md border bg-white p-3 shadow-sm active:cursor-grabbing">
                        <p className="break-words text-sm font-semibold leading-tight">{details?.subject?.name ?? "Materia"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Prof. {details?.teacher?.name ?? "Professor"}</p>
                        <div className="mt-3 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button type="button" variant="ghost" size="icon" aria-label="Editar bloco" onClick={() => setEditingBlockId(block.clientId)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir bloco"
                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => removeBlockCompletely(block.clientId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </DraggableBlock>
                  );
                })}
                {blocks.length === 0 && (
                  <p className="rounded-md border border-dashed bg-white p-4 text-sm text-muted-foreground">
                    Volte para criar blocos antes de montar a tabela.
                  </p>
                )}
              </div>
            </aside>
          </div>
          <DragOverlay dropAnimation={null}>
            {activeDragDetails ? (
              <div className="pointer-events-none flex min-h-20 w-[clamp(8.75rem,12vw,11rem)] flex-col justify-center rounded-md border bg-white p-2 text-primary shadow-xl ring-2 ring-primary/25 md:min-h-24">
                <p className="max-h-10 break-words text-[0.66rem] font-semibold leading-tight md:text-[0.74rem]">
                  {activeDragDetails.subject?.name ?? "Materia"}
                </p>
                <p className="mt-1 break-words text-[0.62rem] leading-tight text-slate-600 md:text-[0.68rem]">
                  Prof. {activeDragDetails.teacher?.name ?? "Professor"}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {step === 2 && (
        <Button
          type="button"
          onClick={() => setStep(1)}
          className="fixed bottom-6 left-4 md:left-[calc(18rem+1.5rem)] z-20 shadow-lg"
        >
          <Pencil className="mr-2 h-4 w-4" />
          Editar blocos
        </Button>
      )}

      <Dialog open={!!editingBlock} onOpenChange={(open) => !open && setEditingBlockId(null)}>
        <DialogContent className="backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>Editar bloco</DialogTitle>
          </DialogHeader>
          {editingBlock && (
            <div className="space-y-4">
              <FilteredPicker
                label="Materia"
                value={editingBlock.subjectId}
                placeholder="Selecionar materia"
                options={editSubjectOptions}
                onChange={(subjectId) => updateBlockSubject(editingBlock.clientId, subjectId)}
              />
              <FilteredPicker
                label="Professor"
                value={editingBlock.teacherId}
                placeholder="Selecionar professor"
                options={teacherOptions}
                onChange={(teacherId) =>
                  setBlocks((current) =>
                    current.map((block) => (block.clientId === editingBlock.clientId ? { ...block, teacherId } : block)),
                  )
                }
              />
              <LocationPicker
                value={editingBlock.locationId}
                locations={sortedLocations}
                onChange={(locationId) =>
                  setBlocks((current) =>
                    current.map((block) => (block.clientId === editingBlock.clientId ? { ...block, locationId } : block)),
                  )
                }
                onCreated={async (name) => (await createLocation.mutateAsync({ name })).id}
                onUpdated={async (id, name) => {
                  await updateLocation.mutateAsync({ id, name });
                }}
                onDeleted={async (id) => {
                  await deleteLocation.mutateAsync(id);
                  setBlocks((current) => current.filter((block) => block.locationId !== id));
                  setSlots((current) => {
                    const removed = new Set(blocks.filter((block) => block.locationId === id).map((block) => block.clientId));
                    return Object.fromEntries(Object.entries(current).filter(([, blockId]) => !removed.has(blockId)));
                  });
                }}
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setEditingBlockId(null)}>
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrintTableDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        onConfirm={confirmPrintTable}
        description="Sera gerada a impressao em PDF da tabela semanal atual, incluindo cores dos blocos e legenda. No dialogo do navegador, selecione salvar como PDF."
      />

      <AlertDialog open={actionConfirm !== null} onOpenChange={(open) => { if (!open) setActionConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionConfirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{actionConfirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                await actionConfirm?.onConfirm();
                setActionConfirm(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar tabela?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os slots da grade semanal serão esvaziados. Os blocos de aula permanecem disponíveis para nova alocação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => setSlots({})}
            >
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
