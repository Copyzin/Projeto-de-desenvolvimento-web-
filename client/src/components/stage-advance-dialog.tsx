import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type StageAdvanceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: { code: string; name: string; currentStageNumber: number } | null;
  maxStage?: number;
  isPending?: boolean;
  onConfirm: (newStage: number) => void;
};

// Controle sensivel: alterar a etapa muda o semestre vigente da turma. Por isso o
// fluxo exige DUAS confirmacoes explicitas e um aviso destacado das consequencias.
export function StageAdvanceDialog({
  open,
  onOpenChange,
  section,
  maxStage,
  isPending = false,
  onConfirm,
}: StageAdvanceDialogProps) {
  const currentStage = section?.currentStageNumber ?? 1;
  const effectiveMax = maxStage && maxStage > 0 ? maxStage : undefined;
  const [newStage, setNewStage] = useState(currentStage + 1);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Ao (re)abrir ou trocar de turma, propor a proxima etapa como padrao.
  useEffect(() => {
    if (open) {
      const proposed = currentStage + 1;
      setNewStage(effectiveMax ? Math.min(proposed, effectiveMax) : proposed);
      setConfirmOpen(false);
    }
  }, [open, currentStage, effectiveMax]);

  const isValid =
    Number.isInteger(newStage) &&
    newStage >= 1 &&
    newStage !== currentStage &&
    (effectiveMax === undefined || newStage <= effectiveMax);

  function handleConfirm() {
    if (!isValid) return;
    setConfirmOpen(false);
    onConfirm(newStage);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir etapa (semestre) da turma</DialogTitle>
            <DialogDescription>
              {section ? `${section.code} - ${section.name}` : "Turma"} — etapa atual: {currentStage}ª.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="space-y-1">
                <p className="font-semibold">Atenção: esta ação muda o semestre vigente da turma.</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>O seletor de disciplinas passará a mostrar as disciplinas da nova etapa.</li>
                  <li>
                  O status acadêmico é recalculado: alunos com nota ≥ 6 nas disciplinas da etapa atual ficam
                  com status <strong>Aprovado</strong>; alunos com nota {"<"} 6 ficam como <strong>Reprovado</strong>.
                  A nova etapa fica como <strong>Cursando</strong> para toda a turma.
                </li>
                  <li>Muda o que os alunos da turma veem como semestre atual.</li>
                  <li>
                    <span className="font-semibold">Não</span> apaga os horários já publicados de semestres anteriores.
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-stage">
                Nova etapa{effectiveMax ? ` (máx. ${effectiveMax}ª)` : ""}
              </Label>
              <Input
                id="new-stage"
                type="number"
                min={1}
                max={effectiveMax}
                value={Number.isNaN(newStage) ? "" : newStage}
                onChange={(event) => setNewStage(Number.parseInt(event.target.value, 10))}
              />
              {!isValid && (
                <p className="text-xs text-destructive">
                  {effectiveMax && newStage > effectiveMax
                    ? `A matriz curricular tem no máximo ${effectiveMax} etapa(s).`
                    : "Informe um número inteiro maior ou igual a 1 e diferente da etapa atual."}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={!isValid} onClick={() => setConfirmOpen(true)}>
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar mudança de etapa</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a mover a turma {section?.code} da {currentStage}ª para a {newStage}ª etapa. Esta é uma
              ação sensível e afeta disciplinas, status acadêmico e a visão dos alunos. Deseja realmente continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                handleConfirm();
              }}
            >
              {isPending ? "Alterando..." : "Sim, alterar etapa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
