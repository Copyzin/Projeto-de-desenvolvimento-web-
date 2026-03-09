import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Finances() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === "teacher") {
    return null;
  }

  if (user.role === "student") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">Financeiro</h2>
          <p className="text-muted-foreground mt-1">Mensalidades, descontos, multas e historico de pagamentos.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo de mensalidades</CardTitle>
            <CardDescription>Estrutura financeira em evolucao incremental.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between border rounded-lg p-3">
              <span>Fevereiro/2026</span>
              <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">Pendente</Badge>
            </div>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <span>Janeiro/2026</span>
              <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">Pago</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Proxima fase adiciona boletos reais, ledger financeiro e notificacoes de inadimplencia.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight">Gestao Financeira</h2>
        <p className="text-muted-foreground mt-1">Controle administrativo de mensalidades e pendencias.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Painel administrativo</CardTitle>
          <CardDescription>Base pronta para ledger de mensalidades por aluno.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border rounded-lg p-4 bg-slate-50">
              <p className="text-xs text-muted-foreground">Pendencias abertas</p>
              <p className="text-2xl font-semibold">12</p>
            </div>
            <div className="border rounded-lg p-4 bg-slate-50">
              <p className="text-xs text-muted-foreground">Pagamentos no mes</p>
              <p className="text-2xl font-semibold">38</p>
            </div>
            <div className="border rounded-lg p-4 bg-slate-50">
              <p className="text-xs text-muted-foreground">Descontos aplicados</p>
              <p className="text-2xl font-semibold">7</p>
            </div>
          </div>

          <Button disabled>Gerenciar faturas (fase seguinte)</Button>
        </CardContent>
      </Card>
    </div>
  );
}
