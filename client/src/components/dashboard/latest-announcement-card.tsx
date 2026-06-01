import { UserRound } from "lucide-react";

import { useAnnouncements } from "@/hooks/use-announcements";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";

import { BentoCard, BentoHeader } from "./bento";

function toTime(value: string | Date | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatDate(value: string | Date | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

// Mostra o comunicado mais recente visivel ao usuario (escopo resolvido no backend).
export function LatestAnnouncementCard() {
  const { data, isLoading } = useAnnouncements();

  const latest = (data ?? [])
    .slice()
    .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))[0];

  return (
    <BentoCard className="h-full">
      <BentoHeader
        eyebrow="Ultimo comunicado"
        title="Avisos recentes"
        linkHref="/announcements"
        linkLabel="Ver comunicados"
      />

      {isLoading ? (
        <LoadingState className="py-10" />
      ) : !latest ? (
        <EmptyState message="Nenhum comunicado por aqui ainda." />
      ) : (
        <article className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={latest.isGlobal ? "default" : "outline"}>
              {latest.isGlobal ? "Geral" : "Direcionado"}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDate(latest.createdAt)}</span>
          </div>

          <h4 className="font-display text-base font-semibold leading-snug tracking-tight">{latest.title}</h4>
          <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">{latest.content}</p>

          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <UserRound className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>{latest.authorName}</span>
          </div>
        </article>
      )}
    </BentoCard>
  );
}
