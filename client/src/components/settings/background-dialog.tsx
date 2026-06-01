import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePreferences } from "@/hooks/use-preferences";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserPreferences } from "@shared/schema";
import calmWaves from "@backgrounds/calm-waves.png";
import schoolIcons from "@backgrounds/school-icons-loop.png";

type BackgroundDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type BackgroundOption = {
  key: UserPreferences["background"];
  label: string;
  description: string;
  previewStyle: React.CSSProperties;
};

const OPTIONS: BackgroundOption[] = [
  {
    key: "default",
    label: "Padrao",
    description: "Fundo original do sistema.",
    previewStyle: {
      background:
        "radial-gradient(120% 84% at 50% 0%, hsl(var(--primary) / 0.18), transparent 58%), linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background)))",
    },
  },
  {
    key: "calm-waves",
    label: "Calm Waves",
    description: "Ondas suaves (padrao).",
    previewStyle: {
      backgroundImage: `url(${calmWaves})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  },
  {
    key: "school-icons",
    label: "Icones escolares",
    description: "Grade de icones lado a lado.",
    previewStyle: {
      backgroundImage: `url(${schoolIcons})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  },
];

export function BackgroundDialog({ open, onOpenChange }: BackgroundDialogProps) {
  const { preferences, setBackground } = usePreferences();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Plano de fundo</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          {OPTIONS.map((option) => {
            const isSelected = preferences.background === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setBackground(option.key)}
                aria-pressed={isSelected}
                className={cn(
                  "group rounded-lg border p-1.5 text-left transition-all",
                  isSelected
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="relative h-24 w-full overflow-hidden rounded-md bg-muted">
                  <div className="absolute inset-0" style={option.previewStyle} />
                  {isSelected && (
                    <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-semibold leading-none">{option.label}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-tight">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
