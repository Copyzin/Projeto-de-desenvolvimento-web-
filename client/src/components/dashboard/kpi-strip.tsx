import { BarChart3, Bell, BookOpen, Calendar, DollarSign, TrendingUp, Users } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export interface KpiCard {
  label: string;
  value: string;
  trend?: string;
}

// Escolhe o icone do indicador a partir do rotulo (heuristica simples por palavra-chave).
export function pickIcon(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("financeiro") || lower.includes("r$")) return DollarSign;
  if (lower.includes("presenca") || lower.includes("falta")) return TrendingUp;
  if (lower.includes("curso")) return BookOpen;
  if (lower.includes("aluno")) return Users;
  if (lower.includes("nota")) return BarChart3;
  if (lower.includes("turma") || lower.includes("periodo")) return Calendar;
  return Bell;
}

interface KpiStripProps {
  cards?: KpiCard[];
  isLoading?: boolean;
}

// Faixa compacta de indicadores no topo do painel (substitui os cards grandes).
export function KpiStrip({ cards, isLoading }: KpiStripProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-[4.75rem] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!cards?.length) return null;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = pickIcon(card.label);
        return (
          <div
            key={card.label}
            className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm ring-1 ring-black/[0.02] transition-shadow duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-muted-foreground">{card.label}</p>
                <p className="font-display text-2xl font-bold leading-tight">{card.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
