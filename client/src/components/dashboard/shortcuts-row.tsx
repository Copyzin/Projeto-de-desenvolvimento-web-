import { Link } from "wouter";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Download,
  LayoutGrid,
  type LucideIcon,
  Megaphone,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type Role = "admin" | "teacher" | "student";
type Shortcut = { label: string; href: string; icon: LucideIcon };

// Atalhos por papel, alinhados as rotas protegidas existentes (ver App.tsx).
const SHORTCUTS: Record<Role, Shortcut[]> = {
  admin: [
    { label: "Cursos", href: "/courses", icon: BookOpen },
    { label: "Atribuir aulas", href: "/lesson-assignment", icon: LayoutGrid },
    { label: "Alunos", href: "/students", icon: Users },
    { label: "Comunicados", href: "/announcements", icon: Megaphone },
    { label: "Financeiro", href: "/finances", icon: Wallet },
  ],
  teacher: [
    { label: "Registrar aula", href: "/register-lesson", icon: ClipboardCheck },
    { label: "Horario", href: "/schedule", icon: CalendarDays },
    { label: "Alunos", href: "/students", icon: Users },
    { label: "Comunicados", href: "/announcements", icon: Megaphone },
    { label: "Downloads", href: "/downloads", icon: Download },
  ],
  student: [
    { label: "Horario", href: "/schedule", icon: CalendarDays },
    { label: "Comunicados", href: "/announcements", icon: Megaphone },
    { label: "Cursos", href: "/courses", icon: BookOpen },
    { label: "Financeiro", href: "/finances", icon: Wallet },
    { label: "Downloads", href: "/downloads", icon: Download },
  ],
};

// Linha de atalhos em pills (estetica premium, dentro dos tokens do tema).
export function ShortcutsRow({ role }: { role: Role }) {
  const items = SHORTCUTS[role];

  return (
    <div className="flex flex-wrap gap-3">
      {items.map(({ label, href, icon: Icon }) => (
        <Link key={href} href={href}>
          <Button
            variant="outline"
            className="group h-auto gap-2 rounded-full border-border/60 bg-card px-4 py-2.5 text-sm font-medium shadow-sm ring-1 ring-black/[0.02] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-md active:scale-[0.98]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105">
              <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
            </span>
            {label}
          </Button>
        </Link>
      ))}
    </div>
  );
}
