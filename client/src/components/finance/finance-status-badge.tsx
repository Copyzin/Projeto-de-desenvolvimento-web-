import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FinanceBoletoResponse } from "@shared/routes";

const STATUS_STYLES: Record<FinanceBoletoResponse["status"], { label: string; className: string }> = {
  aberto: { label: "Em aberto", className: "text-amber-700 bg-amber-50 border-amber-200" },
  pago: { label: "Pago", className: "text-green-700 bg-green-50 border-green-200" },
  vencido: { label: "Vencido", className: "text-red-700 bg-red-50 border-red-200" },
};

export function FinanceStatusBadge({
  status,
  className,
}: {
  status: FinanceBoletoResponse["status"];
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.aberto;
  return (
    <Badge variant="outline" className={cn(style.className, className)}>
      {style.label}
    </Badge>
  );
}

export function SituacaoBadge({
  situacao,
  className,
}: {
  situacao: "em_dia" | "inadimplente";
  className?: string;
}) {
  if (situacao === "inadimplente") {
    return (
      <Badge variant="outline" className={cn("text-red-700 bg-red-50 border-red-200", className)}>
        Inadimplente
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("text-green-700 bg-green-50 border-green-200", className)}>
      Em dia
    </Badge>
  );
}
