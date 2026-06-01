import { Contrast, Type } from "lucide-react";

import { usePreferences } from "@/hooks/use-preferences";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type AccessibilityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AccessibilityDialog({ open, onOpenChange }: AccessibilityDialogProps) {
  const { preferences, setHighContrast, setLargeText } = usePreferences();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acessibilidade</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="flex items-start gap-3 min-w-0">
              <Contrast className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <div className="min-w-0">
                <Label htmlFor="toggle-contrast" className="cursor-pointer">
                  Alto contraste
                </Label>
                <p className="text-xs text-muted-foreground">
                  Reforca o contraste das cores do site.
                </p>
              </div>
            </div>
            <Switch
              id="toggle-contrast"
              checked={preferences.highContrast}
              onCheckedChange={setHighContrast}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="flex items-start gap-3 min-w-0">
              <Type className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <div className="min-w-0">
                <Label htmlFor="toggle-large-text" className="cursor-pointer">
                  Texto maior
                </Label>
                <p className="text-xs text-muted-foreground">
                  Aumenta o tamanho dos textos sem quebrar o layout.
                </p>
              </div>
            </div>
            <Switch
              id="toggle-large-text"
              checked={preferences.largeText}
              onCheckedChange={setLargeText}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
