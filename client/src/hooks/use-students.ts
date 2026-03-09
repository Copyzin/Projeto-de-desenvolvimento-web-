import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "./use-toast";

export function useStudentScope(enabled = true) {
  return useQuery({
    queryKey: [api.students.scope.path],
    queryFn: async () => {
      const res = await fetch(api.students.scope.path, { credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Falha ao carregar escopo de alunos" }));
        throw new Error(payload.message || "Falha ao carregar escopo de alunos");
      }

      return api.students.scope.responses[200].parse(await res.json());
    },
    enabled,
  });
}

export function useStudents(
  filters?: { courseId?: number; classSectionId?: number; status?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: [api.students.list.path, filters],
    queryFn: async () => {
      const url = new URL(api.students.list.path, window.location.origin);
      if (filters?.courseId) url.searchParams.append("courseId", String(filters.courseId));
      if (filters?.classSectionId) url.searchParams.append("classSectionId", String(filters.classSectionId));
      if (filters?.status) url.searchParams.append("status", filters.status);

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Falha ao carregar alunos" }));
        throw new Error(payload.message || "Falha ao carregar alunos");
      }

      return api.students.list.responses[200].parse(await res.json());
    },
    enabled,
  });
}

export function useLockEnrollment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: { enrollmentId: number; reason: string; approvedSubjectIds?: number[] }) => {
      const url = api.students.lockEnrollment.path.replace(":id", String(payload.enrollmentId));
      const res = await fetch(url, {
        method: api.students.lockEnrollment.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: payload.reason,
          approvedSubjectIds: payload.approvedSubjectIds ?? [],
        }),
        credentials: "include",
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || "Falha ao trancar matricula");
      }

      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.students.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.enrollments.list.path] });
      toast({
        title: "Matricula trancada",
        description: "Status atualizado com historico academico preservado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao trancar matricula",
        description: error instanceof Error ? error.message : "Falha ao trancar matricula",
        variant: "destructive",
      });
    },
  });
}
