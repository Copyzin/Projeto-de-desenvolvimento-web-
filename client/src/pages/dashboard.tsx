import { motion } from "framer-motion";

import { useAuth } from "@/hooks/use-auth";
import { useDashboard } from "@/hooks/use-dashboard";
import { getDisplayName } from "@/lib/display-name";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { ScheduleMiniWidget } from "@/components/dashboard/schedule-mini-widget";
import { LatestAnnouncementCard } from "@/components/dashboard/latest-announcement-card";
import { DisciplinesGrid } from "@/components/dashboard/disciplines-grid";
import { ShortcutsRow } from "@/components/dashboard/shortcuts-row";
import { ManagementSummary } from "@/components/dashboard/management-summary";
import { Eyebrow } from "@/components/dashboard/bento";

const staggered = {
  animate: {
    transition: { staggerChildren: 0.08 },
  },
};

const fadeInUp = {
  initial: { y: 16, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.32, 0.72, 0, 1] },
  },
};

const ROLE_LABEL: Record<"admin" | "teacher" | "student", string> = {
  admin: "Administracao",
  teacher: "Professor",
  student: "Aluno",
};

const ROLE_SUBTITLE: Record<"admin" | "teacher" | "student", string> = {
  admin: "Panorama da instituicao, comunicados e gestao em um so lugar.",
  teacher: "Sua semana, suas disciplinas e os avisos mais recentes.",
  student: "Seus horarios, disciplinas e comunicados reunidos aqui.",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard();

  if (!user) return null;

  const role = user.role;
  // Em telas que usam disciplinas/horario (aluno e professor), reduzimos ao literal certo.
  const scheduleRole = role === "teacher" ? "teacher" : "student";

  return (
    <motion.div variants={staggered} initial="initial" animate="animate" className="space-y-8">
      <motion.header variants={fadeInUp} className="space-y-3">
        <Eyebrow>Painel · {ROLE_LABEL[role]}</Eyebrow>
        <div className="space-y-1">
          <h2 className="font-display text-4xl font-bold tracking-tight">
            {greeting()}, {firstName(getDisplayName(user))}.
          </h2>
          <p className="text-lg text-muted-foreground">{ROLE_SUBTITLE[role]}</p>
        </div>
      </motion.header>

      <motion.div variants={fadeInUp}>
        <KpiStrip cards={dashboard?.cards} isLoading={dashboardLoading} />
      </motion.div>

      {role === "admin" ? (
        <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ManagementSummary />
          </div>
          <LatestAnnouncementCard />
        </motion.div>
      ) : (
        <>
          <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ScheduleMiniWidget role={scheduleRole} />
            </div>
            <LatestAnnouncementCard />
          </motion.div>

          <motion.section variants={fadeInUp} className="space-y-4">
            <div className="space-y-1.5">
              <Eyebrow>Minhas disciplinas</Eyebrow>
              <h3 className="font-display text-xl font-semibold tracking-tight">
                {role === "teacher" ? "Disciplinas que voce leciona" : "Suas disciplinas"}
              </h3>
            </div>
            <DisciplinesGrid role={scheduleRole} />
          </motion.section>
        </>
      )}

      <motion.section variants={fadeInUp} className="space-y-4">
        <div className="space-y-1.5">
          <Eyebrow>Atalhos</Eyebrow>
          <h3 className="font-display text-xl font-semibold tracking-tight">Acoes rapidas</h3>
        </div>
        <ShortcutsRow role={role} />
      </motion.section>
    </motion.div>
  );
}
