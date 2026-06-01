import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  message: string;
  // Icone opcional acima da mensagem.
  icon?: ReactNode;
  // CTA opcional (botao/link) abaixo da mensagem.
  children?: ReactNode;
  className?: string;
}

// Estado vazio padrao (ver DESIGN.md): caixa tracejada, texto secundario.
export function EmptyState({ message, icon, children, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {icon && <div className="mb-2 flex justify-center text-muted-foreground">{icon}</div>}
      <p>{message}</p>
      {children && <div className="mt-3 flex justify-center">{children}</div>}
    </div>
  );
}
