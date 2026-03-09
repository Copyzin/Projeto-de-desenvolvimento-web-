import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, type ComponentType, useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { LayoutShell } from "@/components/layout-shell";
import { useAuth } from "@/hooks/use-auth";
import { LoginTransition } from "@/components/login-transition";
import { consumeLoginNavigation, consumePanelEntryTransition, markPanelEntryTransition } from "@/lib/auth-navigation";

// Janela curta da microtransicao apos login bem-sucedido.
const LOGIN_TO_DASHBOARD_TRANSITION_MS = 420;

const Login = lazy(() => import("@/pages/login"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const ResetPasswordCancel = lazy(() => import("@/pages/reset-password-cancel"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Courses = lazy(() => import("@/pages/courses"));
const CourseDetail = lazy(() => import("@/pages/course-detail"));
const Students = lazy(() => import("@/pages/students"));
const Announcements = lazy(() => import("@/pages/announcements"));
const Finances = lazy(() => import("@/pages/finances"));
const Downloads = lazy(() => import("@/pages/downloads"));
const NotFound = lazy(() => import("@/pages/not-found"));

function RouteFallback() {
  // Fallback visual unico usado durante carregamentos lazy/redirect.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function RedirectToDashboard() {
  const [, setLocation] = useLocation();

  // Redirecionamento seguro para raiz quando usuario cai em rota sem permissao.
  useEffect(() => {
    setLocation("/");
  }, [setLocation]);

  return <RouteFallback />;
}

function DashboardWithEntryTransition() {
  const { user } = useAuth();
  // O estado inicial ja consulta o marcador para evitar frame incorreto antes da transicao.
  const [showTransition, setShowTransition] = useState(() => {
    if (!user) return false;
    return consumePanelEntryTransition(user.id);
  });

  // Encerra a transicao apos o tempo configurado.
  useEffect(() => {
    if (!showTransition) return;
    const timer = window.setTimeout(() => setShowTransition(false), LOGIN_TO_DASHBOARD_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [showTransition]);

  if (showTransition) {
    return <LoginTransition />;
  }

  return (
    <LayoutShell>
      <Dashboard />
    </LayoutShell>
  );
}

function AuthSessionNavigator() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Se o login acabou de ocorrer nesta sessao, sempre leva para "/" e marca
  // que o dashboard deve mostrar a transicao especial de entrada.
  useEffect(() => {
    if (!user) return;

    const shouldRedirectToDashboard = consumeLoginNavigation(user.id);
    if (!shouldRedirectToDashboard) return;

    markPanelEntryTransition(user.id);
    setLocation("/");
  }, [user, setLocation]);

  return null;
}

function NotFoundOrDashboard() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Usuario autenticado nunca deve ficar preso no 404; volta para painel.
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  if (isLoading) return <RouteFallback />;
  if (user) return <RouteFallback />;
  return <NotFound />;
}

function ProtectedRoute({
  component: Component,
  allowedRoles,
}: {
  component: ComponentType;
  allowedRoles?: Array<"admin" | "teacher" | "student">;
}) {
  const { user, isLoading } = useAuth();

  // Enquanto valida sessao, evita flicker de tela protegida.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Sem autenticacao, volta para login.
    return <Login />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Regra de RBAC no frontend: papel sem permissao e redirecionado.
    return <RedirectToDashboard />;
  }

  return (
    <LayoutShell>
      <Component />
    </LayoutShell>
  );
}

function DashboardRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <RouteFallback />;
  }

  if (!user) {
    return <Login />;
  }

  return <DashboardWithEntryTransition />;
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      {/* Observador global de sessao para decidir redirecionamento pos-login. */}
      <AuthSessionNavigator />
      <Switch>
        {/* Rotas publicas */}
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/reset-password/cancel" component={ResetPasswordCancel} />

        {/* Rotas autenticadas */}
        <Route path="/" component={DashboardRoute} />
        <Route path="/courses" component={() => <ProtectedRoute component={Courses} />} />
        <Route path="/courses/:id" component={() => <ProtectedRoute component={CourseDetail} />} />
        <Route
          path="/students"
          component={() => <ProtectedRoute component={Students} allowedRoles={["admin", "teacher"]} />}
        />
        <Route path="/announcements" component={() => <ProtectedRoute component={Announcements} />} />
        <Route
          path="/finances"
          component={() => <ProtectedRoute component={Finances} allowedRoles={["admin", "student"]} />}
        />
        <Route
          path="/downloads"
          component={() => <ProtectedRoute component={Downloads} allowedRoles={["teacher", "student"]} />}
        />

        {/* Fallback final com tratamento especial para usuario autenticado. */}
        <Route component={NotFoundOrDashboard} />
      </Switch>
    </Suspense>
  );
}

function App() {
  // Providers globais: cache de dados, tooltip e toaster.
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
