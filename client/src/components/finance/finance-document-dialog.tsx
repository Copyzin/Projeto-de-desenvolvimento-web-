import { Download } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { printHtmlDocument } from "@/lib/print-finance";

export type FinanceDocument = { title: string; html: string };

type Props = {
  document: FinanceDocument | null;
  onOpenChange: (open: boolean) => void;
};

// Preview fiel (iframe com o mesmo HTML que e impresso) + botao de download/impressao.
export function FinanceDocumentDialog({ document, onOpenChange }: Props) {
  return (
    <Dialog open={!!document} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{document?.title ?? "Documento"}</DialogTitle>
        </DialogHeader>

        {document ? (
          <iframe
            title={document.title}
            srcDoc={document.html}
            className="w-full h-[62vh] rounded-md border bg-white"
          />
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={() => document && printHtmlDocument(document.html)} disabled={!document}>
            <Download className="mr-2 h-4 w-4" />
            Baixar / Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
