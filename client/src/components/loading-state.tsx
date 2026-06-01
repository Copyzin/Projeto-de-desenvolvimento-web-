import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface LoadingStateProps {
  // Classe do container (ex.: ajustar padding vertical).
  className?: string;
  // Classe do icone (ex.: "h-8 w-8" para variantes maiores).
  iconClassName?: string;
}

// Indicador de carregamento padrao (ver DESIGN.md): spinner centralizado.
export function LoadingState({ className, iconClassName }: LoadingStateProps) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <Loader2 className={cn("h-6 w-6 animate-spin text-primary", iconClassName)} />
    </div>
  );
}
