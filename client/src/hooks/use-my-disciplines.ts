import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

// Disciplinas do usuario logado (aluno: com sala/professor/faltas/estado;
// professor: disciplinas que leciona). Admin recebe listas vazias.
export function useMyDisciplines(enabled = true) {
  return useQuery({
    queryKey: [api.myDisciplines.list.path],
    enabled,
    queryFn: async () => {
      const res = await fetch(api.myDisciplines.list.path, { credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Falha ao carregar disciplinas" }));
        throw new Error(payload.message || "Falha ao carregar disciplinas");
      }
      return api.myDisciplines.list.responses[200].parse(await res.json());
    },
  });
}
