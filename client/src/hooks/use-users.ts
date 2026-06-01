import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type z } from "zod";
import { api } from "@shared/routes";
import { useToast } from "./use-toast";

type UpdatePreferencesInput = z.infer<typeof api.users.updatePreferences.input>;

export function useUsers(role?: "teacher" | "student" | "admin") {
  return useQuery({
    queryKey: [api.users.list.path, role],
    queryFn: async () => {
      const url = new URL(api.users.list.path, window.location.origin);
      if (role) url.searchParams.append("role", role);

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ message: "Falha ao buscar usuarios" }));
        throw new Error(payload.message || "Falha ao buscar usuarios");
      }

      return api.users.list.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (avatarUrl: string) => {
      const res = await fetch(api.users.updateAvatar.path, {
        method: api.users.updateAvatar.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl }),
        credentials: "include",
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Falha ao atualizar foto");
      return api.users.updateAvatar.responses[200].parse(payload);
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
      toast({ title: "Foto atualizada", description: "Sua foto de perfil foi atualizada." });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar foto",
        description: error instanceof Error ? error.message : "Falha ao atualizar foto",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (nickname: string | null) => {
      const res = await fetch(api.users.updateProfile.path, {
        method: api.users.updateProfile.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
        credentials: "include",
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Falha ao atualizar perfil");
      return api.users.updateProfile.responses[200].parse(payload);
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
      toast({ title: "Perfil atualizado", description: "Seu apelido foi atualizado." });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error instanceof Error ? error.message : "Falha ao atualizar perfil",
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (preferences: UpdatePreferencesInput) => {
      const res = await fetch(api.users.updatePreferences.path, {
        method: api.users.updatePreferences.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
        credentials: "include",
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Falha ao salvar preferencias");
      return api.users.updatePreferences.responses[200].parse(payload);
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar preferencias",
        description: error instanceof Error ? error.message : "Falha ao salvar preferencias",
        variant: "destructive",
      });
    },
  });
}
