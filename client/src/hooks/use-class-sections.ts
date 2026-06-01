import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "./use-toast";

export function useUpdateClassSectionStage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { classSectionId: number; currentStageNumber: number }) => {
      const url = buildUrl(api.classSections.updateStage.path, { id: input.classSectionId });
      const res = await fetch(url, {
        method: api.classSections.updateStage.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStageNumber: input.currentStageNumber }),
        credentials: "include",
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Falha ao atualizar etapa da turma");
      return api.classSections.updateStage.responses[200].parse(payload);
    },
    onSuccess: (section) => {
      // A etapa altera o escopo de disciplinas e o painel de turmas/alunos.
      queryClient.invalidateQueries({ queryKey: [api.students.scope.path] });
      queryClient.invalidateQueries({ queryKey: [api.courses.subjects.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.students.list.path] });
      toast({
        title: "Etapa atualizada",
        description: `${section.code} agora esta na ${section.currentStageNumber}a etapa.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar etapa",
        description: error instanceof Error ? error.message : "Falha ao atualizar etapa da turma",
        variant: "destructive",
      });
    },
  });
}
