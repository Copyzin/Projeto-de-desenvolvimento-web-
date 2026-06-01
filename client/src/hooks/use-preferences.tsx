import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { UserPreferences } from "@shared/schema";
import { useAuth } from "./use-auth";
import { useUpdatePreferences } from "./use-users";

// Calm Waves e o fundo padrao; contraste e texto maior comecam desligados.
export const DEFAULT_PREFERENCES: UserPreferences = {
  background: "calm-waves",
  highContrast: false,
  largeText: false,
};

type PreferencesContextValue = {
  preferences: UserPreferences;
  setBackground: (background: UserPreferences["background"]) => void;
  setHighContrast: (value: boolean) => void;
  setLargeText: (value: boolean) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function normalizePreferences(value: UserPreferences | null | undefined): UserPreferences {
  return {
    background: value?.background ?? DEFAULT_PREFERENCES.background,
    highContrast: value?.highContrast ?? DEFAULT_PREFERENCES.highContrast,
    largeText: value?.largeText ?? DEFAULT_PREFERENCES.largeText,
  };
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const updatePreferences = useUpdatePreferences();
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    normalizePreferences(user?.preferences),
  );

  // Sincroniza o estado local com o usuario carregado (login/refetch/troca de sessao).
  useEffect(() => {
    setPreferences(normalizePreferences(user?.preferences));
  }, [user?.id, user?.preferences]);

  // Aplica/remova as classes de acessibilidade no elemento raiz do documento.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("high-contrast", preferences.highContrast);
    root.classList.toggle("text-large", preferences.largeText);
  }, [preferences.highContrast, preferences.largeText]);

  // Aplica imediatamente (feedback instantaneo) e persiste no banco em segundo plano.
  function persist(next: UserPreferences) {
    setPreferences(next);
    if (user) {
      updatePreferences.mutate(next);
    }
  }

  const value: PreferencesContextValue = {
    preferences,
    setBackground: (background) => persist({ ...preferences, background }),
    setHighContrast: (highContrast) => persist({ ...preferences, highContrast }),
    setLargeText: (largeText) => persist({ ...preferences, largeText }),
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences deve ser usado dentro de PreferencesProvider");
  }
  return ctx;
}
