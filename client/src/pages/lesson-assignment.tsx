import { useEffect, useMemo, useState } from "react";
import { DndContext, DragOverlay, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { ArrowRight, CalendarDays, ChevronDown, MapPin, Pencil, Plus, Save, Trash2, Wand2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useCourseSubjects } from "@/hooks/use-courses";
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
  useUpdateLessonLocation,
} from "@/hooks/use-lesson-schedules";
import { useStudentScope } from "@/hooks/use-students";
import { useUsers } from "@/hooks/use-users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

type Period = "matutino" | "vespertino" | "noturno";
type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
type LessonBlock = {
  clientId: string;
  subjectId: number;
  teacherId: number;
  locationId: number;
};
type SlotMap = Record<string, string>;
type SlotFeedback = { targetSlot?: string; relocatedSlot?: string };
type DragBlockData = { blockClientId: string; sourceSlot?: string };

const DAYS: Array<{ key: DayOfWeek; label: string }> = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terca" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
];

const PERIOD_ROWS = {
  matutino: [
    { kind: "lesson" as const, label: "07:30 - 08:30", lessonNumber: 1 },
    { kind: "lesson" as const, label: "08:30 - 09:30", lessonNumber: 2 },
    { kind: "interval" as const, label: "09:30 - 10:00" },
    { kind: "lesson" as const, label: "10:00 - 11:00", lessonNumber: 3 },
    { kind: "lesson" as const, label: "11:00 - 12:00", lessonNumber: 4 },
  ],
  vespertino: [
    { kind: "lesson" as const, label: "13:30 - 14:30", lessonNumber: 1 },
    { kind: "lesson" as const, label: "14:30 - 15:30", lessonNumber: 2 },
    { kind: "interval" as const, label: "15:30 - 16:00" },
    { kind: "lesson" as const, label: "16:00 - 17:00", lessonNumber: 3 },
    { kind: "lesson" as const, label: "17:00 - 18:00", lessonNumber: 4 },
  ],
  noturno: [
    { kind: "lesson" as const, label: "18:30 - 19:30", lessonNumber: 1 },
    { kind: "lesson" as const, label: "19:30 - 20:30", lessonNumber: 2 },
    { kind: "interval" as const, label: "20:30 - 21:00" },
    { kind: "lesson" as const, label: "21:00 - 22:00", lessonNumber: 3 },
    { kind: "lesson" as const, label: "22:00 - 23:00", lessonNumber: 4 },
  ],
};

const LESSON_NUMBERS = [1, 2, 3, 4];
const SLOT_SEQUENCE = DAYS.flatMap((day) => LESSON_NUMBERS.map((lessonNumber) => `${day.key}-${lessonNumber}`));

function slotKey(dayOfWeek: DayOfWeek, lessonNumber: number) {
  return `${dayOfWeek}-${lessonNumber}`;
}

function splitSlotKey(key: string) {
  const [dayOfWeek, lessonNumber] = key.split("-");
  return { dayOfWeek: dayOfWeek as DayOfWeek, lessonNumber: Number(lessonNumber) };
}

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

function confirmTwice(firstMessage: string, secondMessage: string) {
  return window.confirm(firstMessage) && window.confirm(secondMessage);
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { blockClientId: block.clientId, sourceSlot } satisfies DragBlockData,
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn(isDragging && "opacity-60")}>
      {children}
    </div>
  );
}

function DroppableSlot({ id, feedback, children }: { id: string; feedback?: "target" | "relocated"; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-20 h-full rounded-md border border-dashed border-slate-200 bg-white/80 p-1 transition-all md:min-h-24",
        isOver && "border-primary bg-primary/5",
        feedback === "target" && "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-300",
        feedback === "relocated" && "border-amber-500 bg-amber-50/80 ring-2 ring-amber-300",
      )}
    >
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

  return (
    <div className="relative space-y-2">
      <Label>{label}</Label>
      <Button type="button" variant="outline" className="w-full justify-between" onClick={() => setOpen((current) => !current)}>
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 opacity-60 transition-transform", open && "rotate-180")} />
      </Button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Fechar seletor"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar" className="mb-2" />
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

  async function confirmEdit(id: number) {
    const name = draftName.trim();
    if (!name) return;
    if (
      !confirmTwice(
        "Atualizar esta localizacao alterara o nome em todos os blocos ja salvos.",
        "Confirme novamente para aplicar a mudanca global.",
      )
    ) {
      return;
    }
    await onUpdated(id, name);
    setEditingId(null);
    setDraftName("");
  }

  return (
    <div className="relative space-y-2">
      <Label>Localizacao</Label>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="min-w-0 flex-1 justify-between" onClick={() => setOpen((current) => !current)}>
          <span className="truncate">{selected ? selected.name : "Selecionar local"}</span>
          <MapPin className="h-4 w-4 opacity-60" />
        </Button>
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
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
          {isCreating ? (
            <Input
              autoFocus
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "ArrowRight") void confirmCreate();
                if (event.key === "Escape") setIsCreating(false);
              }}
              placeholder="Nova localizacao"
            />
          ) : (
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar local" />
          )}
          <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
            {filtered.map((location) => (
              <div key={location.id} className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-slate-100">
                {editingId === location.id ? (
                  <Input
                    autoFocus
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === "ArrowRight") void confirmEdit(location.id);
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
                    if (
                      confirmTwice(
                        `Excluir esta localizacao removera ${location.blockCount ?? 0} bloco(s) salvo(s).`,
                        "Confirme novamente para excluir a localizacao e os blocos vinculados.",
                      )
                    ) {
                      void onDeleted(location.id);
                    }
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
    </div>
  );
}

export default function LessonAssignment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: scope } = useStudentScope(user?.role === "admin");
  const { data: terms } = useAcademicTerms();
  const { data: teachers } = useUsers("teacher");
  const { data: locations } = useLessonLocations();
  const createLocation = useCreateLessonLocation();
  const updateLocation = useUpdateLessonLocation();
  const deleteLocation = useDeleteLessonLocation();
  const saveSchedule = useSaveLessonSchedule();
  const saveDraft = useSaveLessonScheduleDraft();
  const deleteDraft = useDeleteLessonScheduleDraft();

  const [selectedClassSectionId, setSelectedClassSectionId] = useState<number | null>(null);
  const [selectedAcademicTermId, setSelectedAcademicTermId] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>("noturno");
  const [step, setStep] = useState<1 | 2>(1);
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [slots, setSlots] = useState<SlotMap>({});
  const [hydratedKey, setHydratedKey] = useState("");
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [slotFeedback, setSlotFeedback] = useState<SlotFeedback>({});
  const [blockForm, setBlockForm] = useState<LessonBlock>({
    clientId: "",
    subjectId: 0,
    teacherId: 0,
    locationId: 0,
  });

  const selectedSection = scope?.classSections.find((section) => section.id === selectedClassSectionId);
  const selectedCourseId = selectedSection?.courseId ?? 0;
  const { data: subjects } = useCourseSubjects(selectedCourseId);
  const { data: activeSchedule } = useLessonSchedule(selectedClassSectionId, selectedAcademicTermId);
  const { data: serverDraft } = useLessonScheduleDraft(selectedClassSectionId, selectedAcademicTermId);
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
  const teacherOptions = useMemo(
    () => (teachers ?? []).map((teacher) => ({ id: teacher.id, label: teacher.name, detail: teacher.email })),
    [teachers],
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
    if (
      !confirmTwice(
        "Excluir este bloco remove o bloco da lista lateral e de todos os slots.",
        "Confirme novamente para excluir completamente este bloco.",
      )
    ) {
      return;
    }
    setBlocks((current) => current.filter((block) => block.clientId !== clientId));
    setSlots((current) => Object.fromEntries(Object.entries(current).filter(([, blockId]) => blockId !== clientId)));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const overId = String(event.over?.id ?? "");
    const dragData = event.active.data.current as DragBlockData | undefined;
    const blockClientId = dragData?.blockClientId;
    if (!overId || !blockClientId || !blockDetails.has(blockClientId)) return;

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
    const base = Math.floor(SLOT_SEQUENCE.length / blocks.length);
    const remainder = SLOT_SEQUENCE.length % blocks.length;
    const nextSlots: SlotMap = {};
    let slotIndex = 0;
    blocks.forEach((block, index) => {
      const amount = base + (index < remainder ? 1 : 0);
      for (let count = 0; count < amount; count += 1) {
        nextSlots[SLOT_SEQUENCE[slotIndex]] = block.clientId;
        slotIndex += 1;
      }
    });
    setSlots(nextSlots);
  }

  async function confirmLaunch() {
    if (!selectedClassSectionId || !selectedAcademicTermId) return;
    const filledSlots = Object.values(slots).filter(Boolean);
    if (filledSlots.length !== 20) {
      toast({ title: "Tabela incompleta", description: "Preencha os 20 slots antes de confirmar.", variant: "destructive" });
      return;
    }
    if (
      !confirmTwice(
        "Confirmar lancamento sobrescrevera a tabela ativa desta turma e semestre.",
        "Confirme novamente para salvar esta tabela como fonte oficial.",
      )
    ) {
      return;
    }

    await saveSchedule.mutateAsync({
      classSectionId: selectedClassSectionId,
      academicTermId: selectedAcademicTermId,
      period,
      blocks,
      slots: Object.entries(slots).map(([key, blockClientId]) => ({ ...splitSlotKey(key), blockClientId })),
    });
    window.localStorage.removeItem(storageKey);
    deleteDraft.mutate({ classSectionId: selectedClassSectionId, academicTermId: selectedAcademicTermId });
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">Atribuicao de Aulas</h2>
          <p className="text-muted-foreground">Monte a tabela semanal ativa por turma e semestre letivo.</p>
        </div>
        <Badge variant="outline" className="w-fit bg-white">
          {activeSchedule ? "Tabela existente" : "Nova tabela"}
        </Badge>
      </div>

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

      {step === 1 && (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg">Criacao de blocos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
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
                locations={locations ?? []}
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
                      <Button type="button" variant="ghost" size="icon" onClick={() => setEditingBlockId(block.clientId)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
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
            <div className="flex justify-end">
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
          onDragStart={(event) => {
            const dragData = event.active.data.current as DragBlockData | undefined;
            setActiveDragId(dragData?.blockClientId ?? null);
          }}
          onDragCancel={() => setActiveDragId(null)}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17rem] 2xl:grid-cols-[minmax(0,1fr)_18rem]">
            <Card className="rounded-lg">
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="text-lg">Tabela semanal</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Editar blocos
                  </Button>
                  <Button type="button" variant="outline" onClick={distributeAutomatically} disabled={blocks.length === 0}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Distribuir automaticamente
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
                            return (
                              <div key={key} className="min-w-0 border-r border-b p-1.5">
                                <DroppableSlot id={key} feedback={feedback}>
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
                                            <p className="max-h-10 break-words text-[0.66rem] font-semibold leading-tight md:text-[0.74rem]">
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

            <aside className="space-y-3">
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
                          <Button type="button" variant="ghost" size="icon" onClick={() => setEditingBlockId(block.clientId)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
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
          <DragOverlay>
            {activeDragDetails ? (
              <div className="flex min-h-20 w-36 flex-col justify-center rounded-md border bg-white p-2 text-primary shadow-xl ring-2 ring-primary/25 md:min-h-24 md:w-40">
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
                locations={locations ?? []}
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
    </div>
  );
}
