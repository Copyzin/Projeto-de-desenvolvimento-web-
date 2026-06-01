import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type z } from "zod";
import { api } from "@shared/routes";
import { useToast } from "./use-toast";

type SaveLessonRecordInput = z.infer<typeof api.teacherLessons.saveRecord.input>;

// Aulas do professor numa data (ja agrupadas por turma+disciplina, com prefill).
export function useTeacherDayLessons(date: string | null) {
  return useQuery({
    queryKey: [api.teacherLessons.listByDate.path, date],
    enabled: !!date,
    queryFn: async () => {
      const url = new URL(api.teacherLessons.listByDate.path, window.location.origin);
      url.searchParams.set("date", date as string);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Falha ao carregar aulas" }));
        throw new Error(payload.message || "Falha ao carregar aulas");
      }
      return api.teacherLessons.listByDate.responses[200].parse(await res.json());
    },
  });
}

export function useSaveLessonRecord(date: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: SaveLessonRecordInput) => {
      const res = await fetch(api.teacherLessons.saveRecord.path, {
        method: api.teacherLessons.saveRecord.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Falha ao registrar aula");
      return api.teacherLessons.saveRecord.responses[200].parse(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.teacherLessons.listByDate.path, date] });
      toast({ title: "Aula registrada", description: "Conteudo e presencas foram salvos." });
    },
    onError: (error) =>
      toast({
        title: "Erro ao registrar aula",
        description: error instanceof Error ? error.message : "Falha ao registrar aula",
        variant: "destructive",
      }),
  });
}
