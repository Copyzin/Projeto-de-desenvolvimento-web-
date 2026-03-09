import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "./use-toast";

export function useNotifications(unreadOnly = true) {
  return useQuery({
    queryKey: [api.notifications.list.path, unreadOnly],
    queryFn: async () => {
      const url = new URL(api.notifications.list.path, window.location.origin);
      if (unreadOnly) {
        url.searchParams.append("unreadOnly", "true");
      }

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Falha ao carregar notificacoes" }));
        throw new Error(payload.message || "Falha ao carregar notificacoes");
      }

      return api.notifications.list.responses[200].parse(await res.json());
    },
    refetchInterval: 20_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      const url = buildUrl(api.notifications.markRead.path, { id: notificationId });
      const res = await fetch(url, {
        method: api.notifications.markRead.method,
        credentials: "include",
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.message || "Falha ao marcar notificacao");
      }

      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao abrir notificacao",
        description: error instanceof Error ? error.message : "Falha ao abrir notificacao",
        variant: "destructive",
      });
    },
  });
}
