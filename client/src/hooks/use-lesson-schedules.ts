import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type z } from "zod";
import { useToast } from "./use-toast";

type CreateLocationInput = z.infer<typeof api.lessonSchedules.locations.create.input>;
type UpdateLocationInput = z.infer<typeof api.lessonSchedules.locations.update.input>;
type SaveScheduleInput = z.infer<typeof api.lessonSchedules.save.input>;
type SaveDraftInput = z.infer<typeof api.lessonSchedules.draft.save.input>;

function scheduleSearchParams(classSectionId?: number | null, academicTermId?: number | null) {
  const params = new URLSearchParams();
  if (classSectionId) params.set("classSectionId", String(classSectionId));
  if (academicTermId) params.set("academicTermId", String(academicTermId));
  return params;
}

export function useAcademicTerms() {
  return useQuery({
    queryKey: [api.lessonSchedules.academicTerms.list.path],
    queryFn: async () => {
      const res = await fetch(api.lessonSchedules.academicTerms.list.path, { credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Falha ao buscar semestres" }));
        throw new Error(payload.message || "Falha ao buscar semestres");
      }
      return api.lessonSchedules.academicTerms.list.responses[200].parse(await res.json());
    },
  });
}

export function useLessonLocations() {
  return useQuery({
    queryKey: [api.lessonSchedules.locations.list.path],
    queryFn: async () => {
      const res = await fetch(api.lessonSchedules.locations.list.path, { credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Falha ao buscar localizacoes" }));
        throw new Error(payload.message || "Falha ao buscar localizacoes");
      }
      return api.lessonSchedules.locations.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateLessonLocation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateLocationInput) => {
      const res = await fetch(api.lessonSchedules.locations.create.path, {
        method: api.lessonSchedules.locations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Falha ao criar localizacao");
      return api.lessonSchedules.locations.create.responses[201].parse(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lessonSchedules.locations.list.path] });
      toast({ title: "Localizacao criada", description: "O local foi adicionado ao dropdown." });
    },
  });
}

export function useUpdateLessonLocation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateLocationInput & { id: number }) => {
      const res = await fetch(buildUrl(api.lessonSchedules.locations.update.path, { id }), {
        method: api.lessonSchedules.locations.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Falha ao atualizar localizacao");
      return api.lessonSchedules.locations.update.responses[200].parse(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lessonSchedules.locations.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.lessonSchedules.get.path] });
      toast({ title: "Localizacao atualizada", description: "Os blocos salvos passam a usar o novo nome." });
    },
  });
}

export function useDeleteLessonLocation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.lessonSchedules.locations.remove.path, { id }), {
        method: api.lessonSchedules.locations.remove.method,
        credentials: "include",
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Falha ao excluir localizacao");
      return api.lessonSchedules.locations.remove.responses[200].parse(payload);
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: [api.lessonSchedules.locations.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.lessonSchedules.get.path] });
      toast({
        title: "Localizacao excluida",
        description: `${payload.deletedBlocks} bloco(s) vinculado(s) foram removidos.`,
      });
    },
  });
}

export function useLessonSchedule(classSectionId?: number | null, academicTermId?: number | null) {
  return useQuery({
    queryKey: [api.lessonSchedules.get.path, classSectionId, academicTermId],
    queryFn: async () => {
      const params = scheduleSearchParams(classSectionId, academicTermId);
      const res = await fetch(`${api.lessonSchedules.get.path}?${params.toString()}`, { credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Falha ao buscar tabela" }));
        throw new Error(payload.message || "Falha ao buscar tabela");
      }
      return api.lessonSchedules.get.responses[200].parse(await res.json());
    },
    enabled: !!classSectionId && !!academicTermId,
  });
}

export function useLessonScheduleDraft(classSectionId?: number | null, academicTermId?: number | null) {
  return useQuery({
    queryKey: [api.lessonSchedules.draft.get.path, classSectionId, academicTermId],
    queryFn: async () => {
      const params = scheduleSearchParams(classSectionId, academicTermId);
      const res = await fetch(`${api.lessonSchedules.draft.get.path}?${params.toString()}`, { credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Falha ao buscar rascunho" }));
        throw new Error(payload.message || "Falha ao buscar rascunho");
      }
      return api.lessonSchedules.draft.get.responses[200].parse(await res.json());
    },
    enabled: !!classSectionId && !!academicTermId,
  });
}

export function useSaveLessonSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: SaveScheduleInput) => {
      const res = await fetch(api.lessonSchedules.save.path, {
        method: api.lessonSchedules.save.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Falha ao confirmar lancamento");
      return api.lessonSchedules.save.responses[200].parse(payload);
    },
    onSuccess: (_payload, input) => {
      queryClient.invalidateQueries({ queryKey: [api.lessonSchedules.get.path, input.classSectionId, input.academicTermId] });
      queryClient.invalidateQueries({ queryKey: [api.lessonSchedules.draft.get.path, input.classSectionId, input.academicTermId] });
      queryClient.invalidateQueries({ queryKey: [api.students.scope.path] });
      toast({ title: "Lancamento confirmado", description: "A tabela semanal foi salva como ativa." });
    },
  });
}

export function useSaveLessonScheduleDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveDraftInput) => {
      const res = await fetch(api.lessonSchedules.draft.save.path, {
        method: api.lessonSchedules.draft.save.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Falha ao salvar rascunho");
      return api.lessonSchedules.draft.save.responses[200].parse(payload);
    },
    onSuccess: (_payload, input) => {
      queryClient.invalidateQueries({ queryKey: [api.lessonSchedules.draft.get.path, input.classSectionId, input.academicTermId] });
    },
  });
}

export function useDeleteLessonScheduleDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { classSectionId: number; academicTermId: number }) => {
      const params = scheduleSearchParams(input.classSectionId, input.academicTermId);
      const res = await fetch(`${api.lessonSchedules.draft.remove.path}?${params.toString()}`, {
        method: api.lessonSchedules.draft.remove.method,
        credentials: "include",
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Falha ao remover rascunho");
      return api.lessonSchedules.draft.remove.responses[200].parse(payload);
    },
    onSuccess: (_payload, input) => {
      queryClient.invalidateQueries({ queryKey: [api.lessonSchedules.draft.get.path, input.classSectionId, input.academicTermId] });
    },
  });
}
