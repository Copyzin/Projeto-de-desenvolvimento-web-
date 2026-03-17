import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { usePasswordRecovery } from "@/hooks/use-password-recovery";
import { getDeviceId } from "@/lib/device-id";
import { InternalBackground } from "@/components/internal-background";

// Formulario simples: apenas identificador para solicitar o token.
const schema = z.object({
  identifier: z.string().min(1, "Informe R.A, CPF ou e-mail"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { forgotPassword } = usePasswordRecovery();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "" },
  });

  // Dispara a solicitacao do token e redireciona para a etapa seguinte.
  function onSubmit(data: FormData) {
    forgotPassword.mutate(
      {
        identifier: data.identifier,
        deviceId: getDeviceId(),
      },
      {
        onSuccess: () => {
          // Pequena transicao antes de ir para a tela de validacao do token.
          setTimeout(() => setLocation("/reset-password"), 200);
        },
      },
    );
  }

  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-background p-4">
      <InternalBackground />

      <div className="relative z-10 flex min-h-[calc(100svh-2rem)] w-full items-center justify-center">
        <Card className="w-full max-w-md overflow-hidden border-border/50 bg-background/80 shadow-2xl backdrop-blur-sm">
          <CardHeader className="space-y-3 pt-8 pb-4">
            <CardTitle className="text-2xl">Recuperacao de senha</CardTitle>
            <p className="text-sm text-muted-foreground">
              Informe seu R.A, CPF ou e-mail para receber o token numerico de 5 digitos.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Identificacao</Label>
                <Input
                  id="identifier"
                  placeholder="R.A, CPF ou e-mail"
                  className="h-11 bg-background/70"
                  {...form.register("identifier")}
                />
                {form.formState.errors.identifier && (
                  <p className="text-xs text-destructive" role="alert">
                    {form.formState.errors.identifier.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="h-11 w-full text-base font-medium" disabled={forgotPassword.isPending}>
                {forgotPassword.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar token
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full text-base"
                onClick={() => setLocation("/login")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para o login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
