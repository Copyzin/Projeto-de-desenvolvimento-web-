import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PrintTableDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function PrintTableDialog({
  open,
  title = "Imprimir tabela em PDF",
  description = "O navegador abrira a janela de impressao. Selecione a opcao de salvar como PDF para gerar o arquivo.",
  confirmLabel = "Confirmar impressao",
  onOpenChange,
  onConfirm,
}: PrintTableDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
