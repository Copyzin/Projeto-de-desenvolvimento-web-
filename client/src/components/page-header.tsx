import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  // Slot opcional alinhado a direita (botoes, dialogs de acao).
  actions?: ReactNode;
  className?: string;
}

// Cabecalho de pagina padrao (ver DESIGN.md). Reproduz exatamente as classes
// ja repetidas nas paginas para manter a aparencia identica.
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4", className)}>
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight">{title}</h2>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
