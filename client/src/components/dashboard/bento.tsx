import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

// "Eyebrow": rotulo microscopico em pill acima dos titulos de secao (estetica premium,
// dentro dos tokens do DESIGN.md).
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}

interface BentoCardProps {
  children: ReactNode;
  className?: string;
}

// Card "bento" com leve profundidade aninhada (hairline + sombra difusa suave),
// mantendo os tokens do tema claro.
export function BentoCard({ children, className }: BentoCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-5 shadow-sm ring-1 ring-black/[0.02]",
        "transition-shadow duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-md",
        className,
      )}
    >
      {children}
    </section>
  );
}

interface BentoHeaderProps {
  eyebrow: string;
  title: string;
  // Link opcional "ver tudo" no canto direito.
  linkHref?: string;
  linkLabel?: string;
}

// Cabecalho padrao de um bloco bento: eyebrow + titulo + link discreto opcional.
export function BentoHeader({ eyebrow, title, linkHref, linkLabel }: BentoHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="space-y-1.5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
      </div>
      {linkHref && (
        <Link
          href={linkHref}
          className="group inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-muted-foreground transition-colors duration-300 hover:text-primary"
        >
          {linkLabel ?? "Ver tudo"}
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px">
            <ArrowUpRight className="h-3 w-3 text-primary" />
          </span>
        </Link>
      )}
    </div>
  );
}
