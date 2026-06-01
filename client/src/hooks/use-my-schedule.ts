import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useStudentSchedule(enabled: boolean) {
  return useQuery({
    queryKey: [api.mySchedule.student.path],
    queryFn: async () => {
      const res = await fetch(api.mySchedule.student.path, { credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Falha ao buscar horario" }));
        throw new Error(payload.message || "Falha ao buscar horario");
      }
      return api.mySchedule.student.responses[200].parse(await res.json());
    },
    enabled,
  });
}

export function useTeacherSchedule(enabled: boolean) {
  return useQuery({
    queryKey: [api.mySchedule.teacher.path],
    queryFn: async () => {
      const res = await fetch(api.mySchedule.teacher.path, { credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Falha ao buscar horario" }));
        throw new Error(payload.message || "Falha ao buscar horario");
      }
      return api.mySchedule.teacher.responses[200].parse(await res.json());
    },
    enabled,
  });
}
