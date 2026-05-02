import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";
import { usePasswordRecovery } from "@/hooks/use-password-recovery";
import { getDeviceId } from "@/lib/device-id";
import {
  evaluatePasswordStrength,
  getPasswordStrengthClass,
  getPasswordStrengthLabel,
} from "@/lib/password-strength";
import { InternalBackground } from "@/components/internal-background";

// Formulario completo; a UI usa apenas os campos da etapa ativa.
const schema = z
  .object({
    identifier: z.string().min(1, "Informe R.A, CPF ou e-mail"),
    token: z.string().regex(/^\d{5}$/, "Token deve conter 5 digitos"),
    newPassword: z.string().min(8, "Senha deve conter no minimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "A confirmacao da senha deve ser identica",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { validateToken, resetPassword } = usePasswordRecovery();
  // Quando preenchido, libera a etapa de definicao da nova senha.
  const [validatedAccess, setValidatedAccess] = useState<{ identifier: string; token: string } | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      identifier: "",
      token: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const passwordValue = form.watch("newPassword");
  const strength = useMemo(() => evaluatePasswordStrength(passwordValue || ""), [passwordValue]);
  const tokenValidated = validatedAccess !== null;

  // Etapa 1: valida o token e guarda os dados fora da UI.
  async function validateAccess() {
    const identifier = form.getValues("identifier");
    const token = form.getValues("token");

    if (!identifier || !/^\d{5}$/.test(token)) {
      form.setError("token", { message: "Informe token valido de 5 digitos" });
      return;
    }

    validateToken.mutate(
      {
        identifier,
        token,
        deviceId: getDeviceId(),
      },
      {
        onSuccess: (payload) => {
          if (!payload.valid) {
            setValidatedAccess(null);
            form.setError("token", { message: "Token invalido ou expirado" });
            return;
          }

          // Depois da validacao, guardamos os dados de acesso fora da UI
          // para que a segunda etapa mostre apenas os campos de nova senha.
          setValidatedAccess({ identifier, token });
          form.clearErrors(["identifier", "token"]);
          form.reset(
            {
              identifier,
              token,
              newPassword: "",
              confirmPassword: "",
            },
            {
              keepDefaultValues: true,
            },
          );
        },
      },
    );
  }

  // Etapa 2: redefine a senha usando o token validado.
  function onSubmit(data: FormData) {
    if (!validatedAccess) {
      form.setError("token", { message: "Valide o token antes de alterar a senha" });
      return;
    }

    resetPassword.mutate(
      {
        identifier: validatedAccess.identifier,
        token: validatedAccess.token,
        deviceId: getDeviceId(),
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      },
      {
        onSuccess: () => {
          setTimeout(() => setLocation("/login"), 600);
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
            <CardTitle className="text-2xl">Mudanca de senha</CardTitle>
            <p className="text-sm text-muted-foreground">
              {tokenValidated ? "Defina a nova senha para concluir a recuperacao." : "Acesso liberado apenas com token valido."}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!tokenValidated ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="identifier">R.A, CPF ou e-mail</Label>
                    <Input id="identifier" className="h-11 bg-background/70" {...form.register("identifier")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="token">Token numerico (5 digitos)</Label>
                    <Input
                      id="token"
                      maxLength={5}
                      inputMode="numeric"
                      className="h-11 bg-background/70"
                      {...form.register("token")}
                    />
                    {form.formState.errors.token && (
                      <p className="text-xs text-destructive" role="alert">
                        {form.formState.errors.token.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full text-base font-medium"
                    onClick={validateAccess}
                    disabled={validateToken.isPending}
                  >
                    {validateToken.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validando token...
                      </>
                    ) : (
                      "Validar token"
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      className="h-11 bg-background/70"
                      {...form.register("newPassword")}
                    />
                    <p className={`text-xs font-semibold ${getPasswordStrengthClass(strength)}`}>
                      Senha {getPasswordStrengthLabel(strength)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      className="h-11 bg-background/70"
                      {...form.register("confirmPassword")}
                    />
                    {form.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive" role="alert">
                        {form.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="h-11 w-full text-base font-medium" disabled={resetPassword.isPending}>
                    {resetPassword.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Atualizando senha...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Salvar nova senha
                      </>
                    )}
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
