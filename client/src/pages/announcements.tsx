import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Clock, Megaphone, Plus, Trash2, User } from "lucide-react";
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from "@/hooks/use-announcements";
import { useAuth } from "@/hooks/use-auth";
import { useCourses } from "@/hooks/use-courses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DateTimeLocalInput } from "@/components/date-time-local-input";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

const schema = z.object({
  title: z.string().min(3, "Titulo obrigatorio"),
  content: z.string().min(3, "Conteudo obrigatorio"),
  isGlobal: z.boolean(),
  expiresAt: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Announcements() {
  const { user } = useAuth();
  const { data: announcements, isLoading } = useAnnouncements();
  const { courses } = useCourses();
  const createMutation = useCreateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      content: "",
      isGlobal: true,
      expiresAt: "",
    },
  });

  const isGlobal = form.watch("isGlobal");
  const canPost = user?.role === "admin" || user?.role === "teacher";
  const canDelete = user?.role === "admin" || user?.role === "teacher";

  function toggleCourse(courseId: number, checked: boolean) {
    setSelectedCourseIds((current) => {
      if (checked) {
        if (current.includes(courseId)) return current;
        return [...current, courseId];
      }

      return current.filter((id) => id !== courseId);
    });
  }

  const sortedAnnouncements = useMemo(
    () => {
      const highlightedId = Number(new URLSearchParams(window.location.search).get("announcementId") || "0");
      return (announcements ?? []).slice().sort((a, b) => {
        if (highlightedId && a.id === highlightedId) return -1;
        if (highlightedId && b.id === highlightedId) return 1;
        const dateA = new Date(a.createdAt ?? 0).getTime();
        const dateB = new Date(b.createdAt ?? 0).getTime();
        return dateB - dateA;
      });
    },
    [announcements],
  );

  const onSubmit = (data: FormData) => {
    createMutation.mutate(
      {
        title: data.title,
        content: data.content,
        isGlobal: data.isGlobal,
        courseIds: data.isGlobal ? [] : selectedCourseIds,
        classSectionIds: [],
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          setIsOpen(false);
          setSelectedCourseIds([]);
          form.reset({ title: "", content: "", isGlobal: true, expiresAt: "" });
        },
      },
    );
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <PageHeader
        title="Comunicados"
        description="Anuncios gerais e direcionados por curso."
        actions={
          canPost && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo comunicado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar comunicado</DialogTitle>
              </DialogHeader>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Titulo</Label>
                  <Input {...form.register("title")} placeholder="Ex: Alteracao no calendario de provas" />
                  {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Conteudo</Label>
                  <Textarea {...form.register("content")} className="min-h-[120px]" />
                  {form.formState.errors.content && (
                    <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Comunicado geral</p>
                    <p className="text-xs text-muted-foreground">Quando ativo, o aviso aparece para todos os usuarios.</p>
                  </div>
                  <Switch
                    checked={isGlobal}
                    onCheckedChange={(checked) => {
                      form.setValue("isGlobal", checked);
                      if (checked) setSelectedCourseIds([]);
                    }}
                    aria-label="Definir comunicado geral"
                  />
                </div>

                {!isGlobal && (
                  <div className="space-y-2">
                    <Label>Cursos de destino</Label>
                    <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                      {courses?.map((course) => (
                        <div key={course.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedCourseIds.includes(course.id)}
                            onCheckedChange={(checked) => toggleCourse(course.id, Boolean(checked))}
                          />
                          <span className="text-sm">{course.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tempo limite (opcional)</Label>
                  <DateTimeLocalInput {...form.register("expiresAt")} />
                  <p className="text-xs text-muted-foreground">Ao atingir o tempo limite o comunicado desaparece automaticamente.</p>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Publicando..." : "Publicar comunicado"}
                  </Button>
                </DialogFooter>
              </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map((item) => <Skeleton key={item} className="h-32 w-full rounded-xl" />)
        ) : sortedAnnouncements.length === 0 ? (
          <EmptyState
            message="Nenhum comunicado publicado no momento."
            icon={<Megaphone className="w-12 h-12 opacity-20" />}
            className="rounded-xl bg-white py-12 px-0 text-base"
          />
        ) : (
          sortedAnnouncements.map((post) => {
            const highlightedId = Number(new URLSearchParams(window.location.search).get("announcementId") || "0");
            const isHighlighted = highlightedId === post.id;

            return (
            <Card
              key={post.id}
              className={`overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow ${
                isHighlighted ? "ring-2 ring-primary/40" : ""
              }`}
            >
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <h3 className="text-xl font-bold text-foreground">{post.title}</h3>
                  <div className="flex gap-2 items-center">
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir comunicado ${post.title}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => setPendingDeleteId(post.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                    <Badge variant={post.isGlobal ? "secondary" : "outline"}>
                      {post.isGlobal ? "Geral" : "Direcionado"}
                    </Badge>
                    <div className="flex items-center text-xs text-muted-foreground gap-1 bg-slate-100 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString("pt-BR") : "-"}
                    </div>
                  </div>
                </div>

                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{post.content}</p>

                <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>
                      Postado por <span className="font-medium text-foreground">{post.authorName || "Equipe"}</span>
                    </span>
                  </div>
                  {post.expiresAt && (
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                      Expira em {new Date(post.expiresAt).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )})
        )}
      </div>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comunicado</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O comunicado será removido permanentemente para todos os usuários.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteId === null) return;
                deleteMutation.mutate(pendingDeleteId, { onSettled: () => setPendingDeleteId(null) });
              }}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
