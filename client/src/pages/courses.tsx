import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Loader2, Plus, Search, Users } from "lucide-react";
import { api } from "@shared/routes";
import { useAuth } from "@/hooks/use-auth";
import { useCourses } from "@/hooks/use-courses";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const courseSchema = api.courses.create.input;

type CourseForm = z.infer<typeof courseSchema>;

export default function Courses() {
  const { user } = useAuth();
  const { courses, isLoading, createCourse } = useCourses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const form = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const canCreate = user?.role === "admin";

  const filteredCourses = courses?.filter((course) => {
    const normalizedSearch = search.toLowerCase();
    return (
      course.name.toLowerCase().includes(normalizedSearch) ||
      (course.description || "").toLowerCase().includes(normalizedSearch)
    );
  });

  const onSubmit = (data: CourseForm) => {
    createCourse.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      },
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">Cursos</h2>
          <p className="text-muted-foreground mt-1">Catalogo de cursos e acessos para grade curricular.</p>
        </div>

        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Criar curso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo curso</DialogTitle>
              </DialogHeader>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-3">
                <div className="space-y-2">
                  <Label>Nome do curso</Label>
                  <Input {...form.register("name")} placeholder="Ex: Analise e Desenvolvimento de Sistemas" />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Descricao</Label>
                  <Textarea {...form.register("description")} placeholder="Resumo objetivo do curso" />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={createCourse.isPending}>
                    {createCourse.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar curso"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="max-w-md rounded-lg border-2 border-primary/25 bg-white p-3 shadow-sm">
        <Label htmlFor="course-search" className="text-xs font-semibold uppercase text-muted-foreground">
          Pesquisar cursos
        </Label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="course-search"
            className="pl-10 bg-white border-primary/30 focus-visible:ring-primary/30"
            placeholder={isSearchFocused ? "" : "Nome ou descricao do curso"}
            value={search}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {user?.role === "admin" && (
        <div className="rounded-lg border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">
          Matricula de alunos centralizada na aba <strong>Alunos</strong>. Nesta tela voce gerencia cursos e grade curricular.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading
          ? [1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-56 w-full rounded-xl" />)
          : filteredCourses?.map((course) => (
              <Card key={course.id} className="group hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
                <CardHeader className="bg-gradient-to-br from-slate-800 to-slate-700 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-white/20 text-white border-none">
                      {course.code}
                    </Badge>
                    <Badge variant="secondary" className="bg-emerald-500/90 text-white border-none">
                      Ativo
                    </Badge>
                  </div>
                  <CardTitle className="text-xl text-white">{course.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex-1 space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                          <Users className="w-4 h-4" />
                          <span>
                            {course.classSectionCount ?? 0} {(course.classSectionCount ?? 0) === 1 ? "turma" : "turmas"}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>quantidade de turmas cadastradas nesse curso</TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {course.description || "Sem descricao cadastrada."}
                  </p>
                </CardContent>
                <CardFooter className="p-6 pt-0 mt-auto">
                  <Link href={`/courses/${course.id}`} className="w-full">
                    <Button className="w-full">Abrir curso</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
      </div>

      {!isLoading && filteredCourses?.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-xl bg-slate-50">
          <p className="text-muted-foreground">Nenhum curso encontrado.</p>
        </div>
      )}
    </div>
  );
}
