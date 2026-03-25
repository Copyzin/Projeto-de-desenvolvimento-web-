import { hashPassword } from "./auth";
import { ensureReproducibleSeedSupport } from "./reproducible-seed";
import { storage } from "./storage";

type SubjectSeed = {
  name: string;
  workloadHours: number;
  description?: string;
};

type CourseSeed = {
  name: string;
  description: string;
  schedule: string;
  teacherEmail: string;
  subjects: SubjectSeed[];
};

type TeacherSeed = {
  name: string;
  email: string;
};

type EnrollmentStatus = "active" | "completed" | "dropped" | "locked" | "canceled";

// Referencias de grades curriculares reais usadas para compor esta massa de testes (consultadas em 2026-03-08):
// - UFJF (Ciencia da Computacao): https://www2.ufjf.br/cursocomputacao/sobre-o-curso/nova-grade/
// - Planilha da matriz UFJF 2023: https://docs.google.com/spreadsheets/d/1Kq8B6cbJIjUPTCW9AT8E6oN69Axi0YMY/edit
// - Mackenzie (Sistemas de Informacao): https://www.mackenzie.br/graduacao/sao-paulo-higienopolis/sistemas-de-informacao/matriz-curricular
// - UCB (Engenharia de Software EAD): https://ucb.catolica.edu.br/cursos/ead/engenharia-software
// - Mackenzie (Administracao): https://www.mackenzie.br/graduacao/sao-paulo-higienopolis/administracao/matriz-curricular

const teacherSeeds: TeacherSeed[] = [
  { name: "Rafael Torres", email: "rafael.torres@academic.local" },
  { name: "Camila Nogueira", email: "camila.nogueira@academic.local" },
  { name: "Marina Souza", email: "marina.souza@academic.local" },
  { name: "Bruno Azevedo", email: "bruno.azevedo@academic.local" },
  { name: "Aline Rocha", email: "aline.rocha@academic.local" },
  { name: "Felipe Mendes", email: "felipe.mendes@academic.local" },
];

const courseSeeds: CourseSeed[] = [
  {
    name: "Ciencia da Computacao",
    description: "Grade inspirada na matriz 2023 de Ciencia da Computacao da UFJF.",
    schedule: "Seg/Qua 19:00-22:00",
    teacherEmail: "rafael.torres@academic.local",
    subjects: [
      { name: "Algoritmos", workloadHours: 90 },
      { name: "Algoritmos II", workloadHours: 90 },
      { name: "Estrutura de Dados", workloadHours: 60 },
      { name: "Orientacao a Objetos", workloadHours: 60 },
      { name: "Banco de Dados", workloadHours: 60 },
      { name: "Engenharia de Software", workloadHours: 60 },
      { name: "Sistemas Operacionais", workloadHours: 60 },
      { name: "Redes de Computadores", workloadHours: 60 },
      { name: "Inteligencia Artificial", workloadHours: 60 },
      { name: "Sistemas Distribuidos", workloadHours: 60 },
      { name: "Seguranca em Sistemas de Computacao", workloadHours: 60 },
      { name: "Teoria dos Compiladores", workloadHours: 60 },
    ],
  },
  {
    name: "Sistemas de Informacao",
    description: "Grade inspirada na matriz curricular de Sistemas de Informacao do Mackenzie.",
    schedule: "Ter/Qui 19:00-22:00",
    teacherEmail: "camila.nogueira@academic.local",
    subjects: [
      { name: "Fundamentos de Sistemas de Informacao", workloadHours: 60 },
      { name: "Algoritmos e Programacao I", workloadHours: 60 },
      { name: "Fundamentos de Web", workloadHours: 60 },
      { name: "Introducao a Engenharia de Software", workloadHours: 60 },
      { name: "Programacao de Sistemas I", workloadHours: 60 },
      { name: "Programacao de Sistemas II", workloadHours: 60 },
      { name: "Estrutura de Dados", workloadHours: 60 },
      { name: "Banco de Dados", workloadHours: 60 },
      { name: "Teste de Software", workloadHours: 60 },
      { name: "Ciencia de Dados", workloadHours: 60 },
      { name: "Governanca de TI", workloadHours: 60 },
      { name: "Infraestrutura Distribuida", workloadHours: 60 },
    ],
  },
  {
    name: "Engenharia de Software",
    description: "Grade inspirada no curso de Engenharia de Software EAD da UCB.",
    schedule: "Sab 08:00-12:00",
    teacherEmail: "marina.souza@academic.local",
    subjects: [
      { name: "Teoria Geral da Computacao", workloadHours: 80 },
      { name: "Algoritmos e Programacao", workloadHours: 80 },
      { name: "Engenharia de Software e Requisitos", workloadHours: 80 },
      { name: "Programacao Orientada a Objetos", workloadHours: 80 },
      { name: "Programacao Web", workloadHours: 80 },
      { name: "Arquitetura de Computadores e Sistemas Operacionais", workloadHours: 80 },
      { name: "Gestao de Projetos", workloadHours: 80 },
      { name: "Estrutura DevOps e Hiperautomacao", workloadHours: 80 },
      { name: "Seguranca Computacional", workloadHours: 80 },
      { name: "Qualidade de Testes de Softwares", workloadHours: 80 },
      { name: "Computacao em Nuvem", workloadHours: 80 },
      { name: "Tecnologias para Gestao de Dados", workloadHours: 80 },
    ],
  },
  {
    name: "Administracao",
    description: "Grade inspirada na matriz curricular de Administracao do Mackenzie.",
    schedule: "Seg/Ter 19:00-22:00",
    teacherEmail: "bruno.azevedo@academic.local",
    subjects: [
      { name: "Ambiente Profissional do Administrador", workloadHours: 60 },
      { name: "Comunicacao e Expressao", workloadHours: 60 },
      { name: "Elementos de Matematica", workloadHours: 60 },
      { name: "Microeconomia Aplicada aos Negocios", workloadHours: 60 },
      { name: "Teorias da Administracao", workloadHours: 60 },
      { name: "Contabilidade e Analise de Balancos", workloadHours: 60 },
      { name: "Matematica Financeira", workloadHours: 60 },
      { name: "Administracao Estrategica e Sustentabilidade", workloadHours: 60 },
      { name: "Gestao de Operacoes I", workloadHours: 60 },
      { name: "Comportamento Organizacional", workloadHours: 60 },
      { name: "Pesquisa Operacional I", workloadHours: 60 },
      { name: "Processos Organizacionais", workloadHours: 60 },
      { name: "Marketing I", workloadHours: 60 },
    ],
  },
];

const firstNames = [
  "Ana",
  "Bruno",
  "Carla",
  "Daniel",
  "Eduarda",
  "Felipe",
  "Gabriela",
  "Henrique",
  "Isabela",
  "Joao",
  "Karina",
  "Leonardo",
  "Mariana",
  "Nicolas",
  "Olivia",
  "Paulo",
  "Renata",
  "Samuel",
  "Talita",
  "Vitor",
];

const familyNames = [
  "Almeida",
  "Barbosa",
  "Cardoso",
  "Duarte",
  "Esteves",
  "Ferreira",
  "Gomes",
  "Lima",
  "Moura",
  "Nunes",
  "Oliveira",
  "Pereira",
  "Queiroz",
  "Ribeiro",
  "Silva",
  "Teixeira",
  "Vieira",
  "Costa",
];

function toUsernameFromEmail(email: string) {
  return email.split("@")[0];
}

function makeCpf(base: number, index: number) {
  return String(base + index).padStart(11, "0");
}

function makePhone(base: number, index: number) {
  return `11${String(base + index).padStart(8, "0")}`;
}

function makeStudentName(index: number) {
  const first = firstNames[index % firstNames.length];
  const middle = familyNames[Math.floor(index / firstNames.length) % familyNames.length];
  const last = familyNames[(index * 3 + 7) % familyNames.length];
  return `${first} ${middle} ${last}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function enrollmentStatusFor(index: number): EnrollmentStatus {
  if (index % 19 === 0) return "locked";
  if (index % 13 === 0) return "completed";
  if (index % 17 === 0) return "dropped";
  if (index % 23 === 0) return "canceled";
  return "active";
}

function gradeFor(status: EnrollmentStatus, index: number) {
  if (status === "canceled") return null;
  if (status === "dropped") return 2 + (index % 4);
  if (status === "completed") return 8 + (index % 3);
  if (status === "locked") return 6 + (index % 4);
  return 5 + (index % 6);
}

function attendanceFor(status: EnrollmentStatus, index: number) {
  if (status === "canceled") return null;
  if (status === "dropped") return 15 + (index % 12);
  if (status === "completed") return index % 6;
  if (status === "locked") return 3 + (index % 8);
  return 2 + (index % 10);
}

export async function seedDatabase() {
  const existingUsers = await storage.getUsers();
  if (existingUsers.length > 0) {
    await ensureReproducibleSeedSupport();
    return;
  }

  console.log("Iniciando seed do banco com massa de dados estendida...");

  const adminPassword = await hashPassword("Admin@12345");
  const teacherPassword = await hashPassword("Professor@123");
  const studentPassword = await hashPassword("Aluno@12345");

  const admin = await storage.createUser({
    username: "admin",
    password: adminPassword,
    role: "admin",
    name: "Administrador do Sistema",
    cpf: makeCpf(10000000000, 1),
    phone: makePhone(90000000, 1),
    email: "admin@academic.local",
    avatarUrl: null,
  });

  const teacherByEmail = new Map<string, Awaited<ReturnType<typeof storage.createUser>>>();
  for (let index = 0; index < teacherSeeds.length; index += 1) {
    const teacherSeed = teacherSeeds[index];
    const teacher = await storage.createUser({
      username: toUsernameFromEmail(teacherSeed.email),
      password: teacherPassword,
      role: "teacher",
      name: teacherSeed.name,
      cpf: makeCpf(11000000000, index + 1),
      phone: makePhone(91000000, index + 1),
      email: teacherSeed.email,
      avatarUrl: null,
    });
    teacherByEmail.set(teacher.email, teacher);
  }

  const createdCourses: Array<Awaited<ReturnType<typeof storage.createCourse>>> = [];
  const subjectByName = new Map<string, Awaited<ReturnType<typeof storage.createSubject>>>();
  const subjectIdsByCourseId = new Map<number, number[]>();

  for (const courseSeed of courseSeeds) {
    const teacher = teacherByEmail.get(courseSeed.teacherEmail);
    if (!teacher) {
      throw new Error(`Professor nao encontrado para o curso: ${courseSeed.name}`);
    }

    const course = await storage.createCourse({
      name: courseSeed.name,
      description: courseSeed.description,
      schedule: courseSeed.schedule,
      teacherId: teacher.id,
    });
    createdCourses.push(course);

    const subjectIds: number[] = [];
    for (const subjectSeed of courseSeed.subjects) {
      const cached = subjectByName.get(subjectSeed.name);
      if (cached) {
        subjectIds.push(cached.id);
        continue;
      }

      const subject = await storage.createSubject({
        name: subjectSeed.name,
        description:
          subjectSeed.description ||
          `Disciplina da grade de ${courseSeed.name} para composicao da massa de testes.`,
        workloadHours: subjectSeed.workloadHours,
      });

      subjectByName.set(subject.name, subject);
      subjectIds.push(subject.id);
    }

    await storage.setCourseSubjects(course.id, subjectIds);
    subjectIdsByCourseId.set(course.id, subjectIds);
  }

  const students: Array<Awaited<ReturnType<typeof storage.createUser>>> = [];
  const totalStudents = 96;

  for (let index = 0; index < totalStudents; index += 1) {
    const name = makeStudentName(index);
    const email = `${slugify(name)}.${String(index + 1).padStart(3, "0")}@aluno.academic.local`;

    const student = await storage.createUser({
      username: `aluno${String(index + 1).padStart(3, "0")}`,
      password: studentPassword,
      role: "student",
      name,
      cpf: makeCpf(20000000000, index + 1),
      phone: makePhone(92000000, index + 1),
      email,
      avatarUrl: null,
    });

    students.push(student);
  }

  const statusCounters: Record<EnrollmentStatus, number> = {
    active: 0,
    completed: 0,
    dropped: 0,
    locked: 0,
    canceled: 0,
  };

  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    const course = createdCourses[index % createdCourses.length];
    const status = enrollmentStatusFor(index);

    const enrollment = await storage.createEnrollment({
      studentId: student.id,
      courseId: course.id,
      grade: gradeFor(status, index),
      attendance: attendanceFor(status, index),
      status,
    });

    statusCounters[status] += 1;

    if (status === "locked") {
      const courseSubjectIds = subjectIdsByCourseId.get(course.id) ?? [];
      await storage.lockEnrollment({
        enrollmentId: enrollment.id,
        changedByUserId: admin.id,
        reason: "Travamento de matricula para simular fechamento de periodo letivo.",
        approvedSubjectIds: courseSubjectIds.slice(0, 3),
      });
    }
  }

  await storage.createAnnouncement({
    title: "Boas-vindas ao periodo letivo",
    content:
      "Bem-vindos ao ambiente academico. Confiram o painel inicial, cronogramas e comunicados por curso/turma.",
    authorId: admin.id,
    isGlobal: true,
    expiresAt: null,
    courseIds: [],
    classSectionIds: [],
  });

  for (const course of createdCourses) {
    await storage.createAnnouncement({
      title: `Aviso inicial - ${course.name}`,
      content:
        "As atividades avaliativas da unidade 1 serao liberadas nesta semana. Verifiquem prazos, rubricas e horarios.",
      authorId: course.teacherId ?? admin.id,
      isGlobal: false,
      expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      courseIds: [course.id],
      classSectionIds: [],
    });
  }

  const classSections = await storage.getClassSectionsForUser(admin);
  if (classSections.length > 0) {
    await storage.createAnnouncement({
      title: "Comunicado de turma",
      content:
        "Este comunicado foi direcionado apenas para algumas turmas para validar filtros por classSection.",
      authorId: admin.id,
      isGlobal: false,
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      courseIds: [],
      classSectionIds: classSections.slice(0, 2).map((section) => section.id),
    });
  }

  const firstTeacher = teacherByEmail.values().next().value;
  const firstCourse = createdCourses[0];
  const firstStudent = students[0];

  const reproducibleSupport = await ensureReproducibleSeedSupport();

  console.log(
    [
      "Seed concluido com sucesso.",
      `Admin RA: ${admin.ra}`,
      firstTeacher ? `Professor RA (exemplo): ${firstTeacher.ra}` : undefined,
      firstStudent ? `Aluno RA (exemplo): ${firstStudent.ra}` : undefined,
      `Cursos: ${createdCourses.length}`,
      `Materias unicas: ${subjectByName.size}`,
      `Alunos: ${students.length}`,
      `Matriculas [active/completed/dropped/locked/canceled]: ${statusCounters.active}/${statusCounters.completed}/${statusCounters.dropped}/${statusCounters.locked}/${statusCounters.canceled}`,
      firstCourse ? `Curso exemplo: ${firstCourse.name}` : undefined,
      `Professor de teste operacional: ${reproducibleSupport.primaryUsers.teacher.email}`,
      "Credenciais padrao: Admin@12345 | Professor@123 | Aluno@12345",
    ]
      .filter(Boolean)
      .join(" | "),
  );
}
