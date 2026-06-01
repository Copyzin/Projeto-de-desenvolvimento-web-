import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useFinanceSummary(enabled = true) {
  return useQuery({
    queryKey: [api.finances.summary.path],
    enabled,
    queryFn: async () => {
      const res = await fetch(api.finances.summary.path, { credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Falha ao carregar financeiro" }));
        throw new Error(payload.message || "Falha ao carregar financeiro");
      }
      return api.finances.summary.responses[200].parse(await res.json());
    },
  });
}

export function useFinanceAdminOverview(enabled = true) {
  return useQuery({
    queryKey: [api.finances.adminOverview.path],
    enabled,
    queryFn: async () => {
      const res = await fetch(api.finances.adminOverview.path, { credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Falha ao carregar financeiro" }));
        throw new Error(payload.message || "Falha ao carregar financeiro");
      }
      return api.finances.adminOverview.responses[200].parse(await res.json());
    },
  });
}
