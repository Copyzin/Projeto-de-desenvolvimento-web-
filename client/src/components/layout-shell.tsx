import { ReactNode, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, useReducedMotion } from "framer-motion";
import {
  Accessibility,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  LayoutDashboard,
  Lock,
  LogOut,
  Palette,
  Settings,
  User,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  evaluatePasswordStrength,
  getPasswordStrengthClass,
  getPasswordStrengthLabel,
} from "@/lib/password-strength";
import { useAuth } from "@/hooks/use-auth";
import { useEnrollments } from "@/hooks/use-enrollments";
import { useMarkNotificationRead, useNotifications } from "@/hooks/use-notifications";
import { getDisplayName } from "@/lib/display-name";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "./ui/logo";
import { AppBackground } from "./app-background";
import { ProfileEditDialog } from "./settings/profile-edit-dialog";
import { BackgroundDialog } from "./settings/background-dialog";
import { AccessibilityDialog } from "./settings/accessibility-dialog";

interface LayoutShellProps {
  children: ReactNode;
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Senha atual obrigatoria"),
    newPassword: z.string().min(8, "A nova senha deve ter no minimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "A confirmacao deve ser identica",
    path: ["confirmPassword"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

function getRoleLabel(role: string) {
  if (role === "admin") return "Administrador";
  if (role === "teacher") return "Professor";
  return "Aluno";
}

// Microtransicao do conteudo principal entre abas.
// O objetivo aqui nao e "animar a pagina", e sim evitar um flick seco
// quando o conteudo muda mantendo a interface fixa (sidebar/header) estavel.
const CONTENT_ENTER_TRANSITION = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
};

export function LayoutShell({ children }: LayoutShellProps) {
  const shouldReduceMotion = useReducedMotion();
  const { user, logout, changePassword } = useAuth();
  const [location, setLocation] = useLocation();
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isBasicProfileOpen, setIsBasicProfileOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const { data: notifications } = useNotifications(true);
  const markNotificationRead = useMarkNotificationRead();

  const { data: studentEnrollments } = useEnrollments(
    user?.role === "student" ? { studentId: user.id } : undefined,
  );

  const currentCourse = useMemo(() => {
    if (!user || user.role !== "student") return undefined;
    return studentEnrollments?.[0]?.courseName;
  }, [user, studentEnrollments]);

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const newPasswordValue = passwordForm.watch("newPassword") || "";
  const passwordStrength = evaluatePasswordStrength(newPasswordValue);
  const unreadCount = notifications?.length ?? 0;
  const topActionClasses =
    "h-10 w-10 rounded-full border border-transparent bg-transparent text-muted-foreground hover:bg-white/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30";

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">{children}</div>;
  }

  const navItems = [
    { label: "Painel", href: "/", icon: LayoutDashboard, roles: ["admin", "teacher", "student"] },
    { label: "Cursos", href: "/courses", icon: BookOpen, roles: ["admin", "teacher", "student"] },
    { label: "Atribuicao de Aulas", href: "/lesson-assignment", icon: CalendarDays, roles: ["admin"] },
    { label: "Alunos", href: "/students", icon: Users, roles: ["admin", "teacher"] },
    { label: "Horario", href: "/schedule", icon: CalendarClock, roles: ["teacher", "student"] },
    { label: "Registrar Aula", href: "/register-lesson", icon: ClipboardCheck, roles: ["teacher"] },
    { label: "Comunicados", href: "/announcements", icon: Bell, roles: ["admin", "teacher", "student"] },
    { label: "Financeiro", href: "/finances", icon: CircleDollarSign, roles: ["admin", "student"] },
    { label: "Downloads", href: "/downloads", icon: Download, roles: ["teacher", "student"] },
  ];

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

  function openNotification(notificationId: number, destinationRoute: string) {
    markNotificationRead.mutate(notificationId, {
      onSettled: () => {
        setLocation(destinationRoute);
      },
    });
  }

  return (
    <div className="relative isolate min-h-screen bg-background flex flex-col md:flex-row font-body text-foreground">
      <AppBackground />

      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white p-2 rounded shadow">
        Pular para o conteudo
      </a>

      <aside className="relative z-20 w-full md:w-72 bg-white/90 backdrop-blur-[1px] border-r border-border flex flex-col sticky top-0 md:h-screen">
        <div className="p-6 border-b border-border/50">
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="flex items-center gap-3 text-left w-full rounded-lg p-1 transition-colors hover:bg-primary/5 cursor-pointer"
              aria-label="Ir para a pagina inicial"
            >
              <div className="bg-primary/10 p-2 rounded-lg">
                <Logo className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl tracking-tight leading-none text-primary">Academic Suite</h1>
                <p className="text-xs text-muted-foreground mt-1 font-medium tracking-wide uppercase">Sistema academico</p>
              </div>
            </motion.button>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1" aria-label="Menu principal">
          {filteredNav.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer font-medium text-sm",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                      : "text-muted-foreground hover:bg-white/80 hover:text-foreground",
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <button
            type="button"
            onClick={() => setIsBasicProfileOpen(true)}
            aria-label="Abrir perfil e configuracoes basicas"
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg bg-white/75 border min-w-0 text-left transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Avatar className="h-9 w-9 border">
              <AvatarImage src={user.avatarUrl || undefined} alt={`Foto de ${getDisplayName(user)}`} />
              <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                {getDisplayName(user).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{getDisplayName(user)}</p>
              <p className="text-xs text-muted-foreground truncate">{getRoleLabel(user.role)}</p>
            </div>
          </button>
        </div>
      </aside>

      <main
        id="main-content"
        className="relative z-10 flex-1 overflow-auto flex flex-col"
        tabIndex={-1}
      >
        <div className="sticky top-0 z-30 border-b border-border/60 bg-background/88 backdrop-blur shadow-sm shadow-slate-900/10">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-end gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={cn(topActionClasses, "relative")} aria-label="Notificacoes">
                  <motion.div
                    animate={
                      unreadCount > 0
                        ? {
                            rotate: [0, 9, -8, 6, -4, 0],
                            transition: {
                              duration: 1,
                              repeat: Infinity,
                              repeatDelay: 3.5,
                              ease: "easeInOut",
                            },
                          }
                        : { rotate: 0 }
                    }
                  >
                    <Bell className="w-5 h-5" />
                  </motion.div>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold leading-5 text-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Pendencias e avisos</DropdownMenuLabel>
                {(notifications ?? []).slice(0, 8).map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="cursor-pointer flex-col items-start"
                    onClick={() => openNotification(notification.id, notification.destinationRoute)}
                  >
                    <p className="text-sm font-medium leading-tight">{notification.title}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-1">{notification.message}</p>
                  </DropdownMenuItem>
                ))}
                {(!notifications || notifications.length === 0) && (
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    Nenhuma notificacao pendente.
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={topActionClasses} aria-label="Configuracoes">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Configuracoes</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => setIsProfileEditOpen(true)}>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setIsBackgroundOpen(true)}>
                  <Palette className="mr-2 h-4 w-4" />
                  Plano de fundo
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setIsAccessibilityOpen(true)}>
                  <Accessibility className="mr-2 h-4 w-4" />
                  Acessibilidade
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Sair"
              className={cn(topActionClasses, "hover:text-destructive hover:bg-destructive/10")}
              onClick={() => setIsLogoutConfirmOpen(true)}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <motion.section
          key={location}
          className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8 flex-1"
          initial={shouldReduceMotion ? { opacity: 1, y: 0 } : CONTENT_ENTER_TRANSITION.initial}
          animate={CONTENT_ENTER_TRANSITION.animate}
          transition={
            shouldReduceMotion
              ? { duration: 0.01 }
              : CONTENT_ENTER_TRANSITION.transition
          }
        >
          {children}
        </motion.section>

        <footer className="border-t border-border/60 bg-background/60">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Academic Suite &mdash; Sistema academico</p>
            <p>Plataforma de gestao escolar</p>
          </div>
        </footer>

        <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar senha</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={passwordForm.handleSubmit((data) => {
                changePassword.mutate(data, {
                  onSuccess: () => {
                    setIsPasswordOpen(false);
                    passwordForm.reset();
                  },
                });
              })}
              className="space-y-4 mt-2"
            >
              <div className="space-y-2">
                <Label>Senha atual</Label>
                <Input type="password" {...passwordForm.register("currentPassword")} />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Nova senha</Label>
                <Input type="password" {...passwordForm.register("newPassword")} />
                <p className={`text-xs font-semibold ${getPasswordStrengthClass(passwordStrength)}`}>
                  Senha {getPasswordStrengthLabel(passwordStrength)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Confirmar senha</Label>
                <Input type="password" {...passwordForm.register("confirmPassword")} />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={changePassword.isPending}>
                  {changePassword.isPending ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isBasicProfileOpen} onOpenChange={setIsBasicProfileOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Meu perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border">
                  <AvatarImage src={user.avatarUrl || undefined} alt={`Foto de ${getDisplayName(user)}`} />
                  <AvatarFallback className="bg-primary/5 text-primary text-lg font-bold">
                    {getDisplayName(user).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{getDisplayName(user)}</p>
                  <p className="text-sm text-muted-foreground">{getRoleLabel(user.role)}</p>
                  <p className="text-xs text-muted-foreground truncate">Nome: {user.name}</p>
                  <p className="text-xs text-muted-foreground">R.A: {user.ra}</p>
                  {user.role === "student" && currentCourse && (
                    <p className="text-xs text-muted-foreground truncate">Curso: {currentCourse}</p>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setIsBasicProfileOpen(false);
                  setIsProfileEditOpen(true);
                }}
              >
                <User className="w-4 h-4 mr-2" />
                Editar perfil
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setIsBasicProfileOpen(false);
                  setIsPasswordOpen(true);
                }}
              >
                <Lock className="w-4 h-4 mr-2" />
                Mudar senha
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <ProfileEditDialog open={isProfileEditOpen} onOpenChange={setIsProfileEditOpen} />
        <BackgroundDialog open={isBackgroundOpen} onOpenChange={setIsBackgroundOpen} />
        <AccessibilityDialog open={isAccessibilityOpen} onOpenChange={setIsAccessibilityOpen} />

        <Dialog open={isLogoutConfirmOpen} onOpenChange={setIsLogoutConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deseja sair?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Voce sera desconectado e voltara para a tela de login.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLogoutConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  logout.mutate();
                }}
              >
                Sair
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
