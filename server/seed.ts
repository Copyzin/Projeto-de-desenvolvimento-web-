import { hashPassword } from "./auth";
import { storage } from "./storage";

type ClassPeriod = "matutino" | "vespertino" | "noturno";

type MatrixSubjectSeed = {
  stage: number;
  name: string;
  workloadHours: number;
  teachers?: string[];
};

type CourseSeed = {
  name: string;
  description: string;
  subjects: MatrixSubjectSeed[];
};

type SectionSeed = {
  code: string;
  name: string;
  period: ClassPeriod;
  currentStageNumber: number;
  coordinatorName: string;
};

type EnrollmentStatus = "active" | "completed" | "dropped" | "locked" | "canceled";

const ccMatrix: MatrixSubjectSeed[] = [
  { stage: 1, name: "Projeto de Jogos", workloadHours: 40, teachers: ["Luis Hilario Tobler Garcia"] },
  {
    stage: 1,
    name: "Fundamentos de Computacao e Logica Digital",
    workloadHours: 80,
    teachers: ["Ildeberto de Genova Bugatti", "Luis Hilario Tobler Garcia", "Ricardo Zanni Mendes da Silveira"],
  },
  {
    stage: 1,
    name: "Matematica Computacional",
    workloadHours: 40,
    teachers: ["Aislan Totti Bernardo", "Luis Augusto Garcia Sepulveda"],
  },
  { stage: 1, name: "Introducao a Programacao de Computadores", workloadHours: 80 },
  {
    stage: 1,
    name: "Tecnologia da Informacao e Transformacao Digital",
    workloadHours: 40,
    teachers: ["Adriano Sunao Nakamura"],
  },
  { stage: 1, name: "Analise e Projeto de Algoritmos", workloadHours: 80, teachers: ["Gustavo Camossi", "Mauricio Duarte"] },
  { stage: 2, name: "Sistemas Embarcados e IoT", workloadHours: 80, teachers: ["Luis Hilario Tobler Garcia"] },
  { stage: 2, name: "Algebra Linear e Geometria Analitica", workloadHours: 80, teachers: ["Aislan Totti Bernardo"] },
  { stage: 2, name: "Programacao de Computadores", workloadHours: 80, teachers: ["Renata Aparecida de Carvalho Paschoal"] },
  { stage: 2, name: "Projeto de Web-Crawler", workloadHours: 40, teachers: ["Luis Hilario Tobler Garcia"] },
  { stage: 2, name: "Laboratorio de Circuitos Digitais", workloadHours: 80, teachers: ["Ricardo Zanni Mendes da Silveira"] },
  { stage: 2, name: "Comunicacao e Pensamento Critico", workloadHours: 40 },
  {
    stage: 3,
    name: "Introducao ao Desenvolvimento Front-End",
    workloadHours: 80,
    teachers: ["Ricardo Zanni Mendes da Silveira"],
  },
  {
    stage: 3,
    name: "Analise e Modelagem de Sistemas de Informacao",
    workloadHours: 40,
    teachers: ["Adriano Sunao Nakamura"],
  },
  { stage: 3, name: "Estrutura de Dados e Recuperacao de Informacao", workloadHours: 80 },
  {
    stage: 3,
    name: "Modelagem de Banco de Dados",
    workloadHours: 80,
    teachers: ["Everton Simoes da Motta", "Guilherme Fernando de Oliveira"],
  },
  { stage: 3, name: "Programacao Orientada a Objetos", workloadHours: 80 },
  { stage: 3, name: "Inovacao e Empreendedorismo", workloadHours: 40, teachers: ["Leonardo de Oliveira Simoes"] },
  { stage: 4, name: "Introducao ao Desenvolvimento Back-End", workloadHours: 80, teachers: ["Joao Ricardo Favan"] },
  { stage: 4, name: "Engenharia de Software", workloadHours: 80, teachers: ["Adriano Sunao Nakamura"] },
  { stage: 4, name: "Teoria dos Grafos e Complexidade", workloadHours: 40, teachers: ["Ligia Garcia Hermosilla"] },
  { stage: 4, name: "Sistemas Operacionais", workloadHours: 80 },
  {
    stage: 4,
    name: "Organizacao e Arquitetura de Computadores",
    workloadHours: 80,
    teachers: ["Guilherme Fernando de Oliveira"],
  },
  { stage: 4, name: "Direitos Humanos, Etica e Desafios do Mundo Contemporaneo", workloadHours: 40 },
  {
    stage: 5,
    name: "Gestao de Pessoas e Mediacao de Conflitos",
    workloadHours: 40,
    teachers: ["Celia de Oliveira de Santana"],
  },
  {
    stage: 5,
    name: "Desenvolvimento de Sistemas de Informacao",
    workloadHours: 40,
    teachers: ["Ligia Garcia Hermosilla"],
  },
  {
    stage: 5,
    name: "Projeto de Arquitetura de Processadores",
    workloadHours: 80,
    teachers: ["Ricardo Zanni Mendes da Silveira"],
  },
  { stage: 5, name: "Projeto de Desenvolvimento Web", workloadHours: 40, teachers: ["Adriano Sunao Nakamura"] },
  {
    stage: 5,
    name: "Desenvolvimento e Administracao de Banco de Dados",
    workloadHours: 40,
    teachers: ["Guilherme Fernando de Oliveira"],
  },
  { stage: 5, name: "Calculo Diferencial e Integral", workloadHours: 80 },
  { stage: 5, name: "Linguagens Formais e Automatos", workloadHours: 80, teachers: ["Luis Hilario Tobler Garcia"] },
  { stage: 6, name: "Projeto de Aplicativos Moveis I", workloadHours: 40 },
  { stage: 6, name: "Desenvolvimento de Aplicativos Moveis", workloadHours: 80 },
  { stage: 6, name: "Compiladores", workloadHours: 80 },
  { stage: 6, name: "Estatistica Aplicada", workloadHours: 80 },
  { stage: 6, name: "Metodos e Analise de Investigacao", workloadHours: 40 },
  { stage: 6, name: "Redes de Computadores", workloadHours: 80 },
  { stage: 7, name: "Computacao Grafica e Processamento de Imagens", workloadHours: 80 },
  { stage: 7, name: "Projeto de Aplicativos Moveis II", workloadHours: 40 },
  { stage: 7, name: "Inteligencia Artificial", workloadHours: 80 },
  { stage: 7, name: "Calculo Numerico", workloadHours: 80 },
  { stage: 7, name: "Seguranca da Informacao e Auditoria", workloadHours: 80 },
  { stage: 7, name: "Estagio Supervisionado I", workloadHours: 80 },
  { stage: 8, name: "Aprendizado de Maquina e Redes Neurais", workloadHours: 80 },
  { stage: 8, name: "Projeto de Negocios Digitais", workloadHours: 40 },
  { stage: 8, name: "Inteligencia de Negocios", workloadHours: 80 },
  { stage: 8, name: "Ciencia de Dados e Big Data", workloadHours: 40 },
  { stage: 8, name: "Sistemas Distribuidos e Computacao de Alto Desempenho", workloadHours: 40 },
  { stage: 8, name: "Realidade Virtual e Aumentada", workloadHours: 80 },
  { stage: 8, name: "Estagio Supervisionado II", workloadHours: 80 },
];

const courseSeeds: CourseSeed[] = [
  {
    name: "Ciencia da Computacao",
    description: "Matriz curricular de Ciencia da Computacao organizada em 8 etapas.",
    subjects: ccMatrix,
  },
  {
    name: "Sistemas de Informacao",
    description: "Curso para validacao de multiplas matrizes no catalogo academico.",
    subjects: [
      { stage: 1, name: "Fundamentos de Sistemas de Informacao", workloadHours: 60 },
      { stage: 1, name: "Algoritmos e Programacao I", workloadHours: 60 },
      { stage: 2, name: "Banco de Dados", workloadHours: 60 },
      { stage: 2, name: "Teste de Software", workloadHours: 60 },
    ],
  },
  {
    name: "Engenharia de Software",
    description: "Curso de apoio para testar listagens e filtros.",
    subjects: [
      { stage: 1, name: "Engenharia de Software e Requisitos", workloadHours: 80 },
      { stage: 1, name: "Programacao Web", workloadHours: 80 },
      { stage: 2, name: "Gestao de Projetos", workloadHours: 80 },
      { stage: 2, name: "Qualidade de Testes de Softwares", workloadHours: 80 },
    ],
  },
];

const ccSections: SectionSeed[] = [
  { code: "CC-2024-A", name: "Turma A", period: "noturno", currentStageNumber: 5, coordinatorName: "Adriano Sunao Nakamura" },
  { code: "CC-2025-B", name: "Turma B", period: "matutino", currentStageNumber: 3, coordinatorName: "Ligia Garcia Hermosilla" },
  { code: "CC-2026-C", name: "Turma C", period: "vespertino", currentStageNumber: 1, coordinatorName: "Ricardo Zanni Mendes da Silveira" },
];

const firstNames = ["Ana", "Bruno", "Carla", "Daniel", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "Joao", "Karina", "Leonardo", "Mariana", "Nicolas", "Olivia", "Paulo", "Renata", "Samuel", "Talita", "Vitor"];
const familyNames = ["Almeida", "Barbosa", "Cardoso", "Duarte", "Esteves", "Ferreira", "Gomes", "Lima", "Moura", "Nunes", "Oliveira", "Pereira", "Queiroz", "Ribeiro", "Silva", "Teixeira", "Vieira", "Costa"];

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

function emailFromName(name: string) {
  return `${slugify(name)}@academic.local`;
}

function enrollmentStatusFor(index: number): EnrollmentStatus {
  if (index % 23 === 0) return "locked";
  if (index % 17 === 0) return "completed";
  if (index % 29 === 0) return "dropped";
  return "active";
}

function gradeFor(status: EnrollmentStatus, index: number) {
  if (status === "dropped") return 3 + (index % 4);
  if (status === "completed") return 8 + (index % 3);
  if (status === "locked") return 6 + (index % 4);
  return 5 + (index % 6);
}

function attendanceFor(status: EnrollmentStatus, index: number) {
  if (status === "dropped") return 18 + (index % 8);
  if (status === "completed") return index % 5;
  return 2 + (index % 10);
}

function uniqueTeacherNames() {
  const names = new Set<string>();
  ccMatrix.forEach((subject) => subject.teachers?.forEach((teacher) => names.add(teacher)));
  ccSections.forEach((section) => names.add(section.coordinatorName));
  return Array.from(names).sort();
}

export async function seedDatabase() {
  console.log("Sincronizando seed academico com turmas, coordenadores e matriz por etapas...");

  const adminPassword = await hashPassword("Admin@12345");
  const teacherPassword = await hashPassword("Professor@123");
  const studentPassword = await hashPassword("Aluno@12345");

  async function ensureUser(input: {
    username: string;
    password: string;
    role: "admin" | "teacher" | "student";
    name: string;
    cpf: string;
    phone: string;
    email: string;
  }) {
    const existingByEmail = await storage.getUserByLoginIdentifier(input.email);
    if (existingByEmail) return existingByEmail;

    const existingByCpf = await storage.getUserByLoginIdentifier(input.cpf);
    if (existingByCpf) return existingByCpf;

    return storage.createUser({
      username: input.username,
      password: input.password,
      role: input.role,
      name: input.name,
      cpf: input.cpf,
      phone: input.phone,
      email: input.email,
      avatarUrl: null,
    });
  }

  async function ensureCourse(courseSeed: CourseSeed) {
    const existing = (await storage.getCourses()).find((course) => course.name === courseSeed.name);
    if (existing) return existing;

    return storage.createCourse({
      name: courseSeed.name,
      description: courseSeed.description,
    });
  }

  async function ensureSubject(subjectSeed: MatrixSubjectSeed, courseName: string) {
    const existing = (await storage.getSubjects()).find((subject) => subject.name === subjectSeed.name);
    if (existing) return existing;

    return storage.createSubject({
      name: subjectSeed.name,
      description: `Disciplina da ${subjectSeed.stage} etapa de ${courseName}.`,
      workloadHours: subjectSeed.workloadHours,
    });
  }

  async function ensureSection(
    courseId: number,
    academicTermId: number,
    sectionSeed: SectionSeed,
    coordinatorTeacherId: number | null,
  ) {
    const existing = (await storage.getClassSectionsForUser(admin)).find((section) => section.code === sectionSeed.code);
    if (existing) return existing;

    return storage.createClassSection({
      code: sectionSeed.code,
      name: sectionSeed.name,
      courseId,
      academicTermId,
      coordinatorTeacherId,
      currentStageNumber: sectionSeed.currentStageNumber,
      period: sectionSeed.period,
      room: null,
    });
  }

  const admin = await ensureUser({
    username: "admin",
    password: adminPassword,
    role: "admin",
    name: "Administrador do Sistema",
    cpf: makeCpf(10000000000, 1),
    phone: makePhone(90000000, 1),
    email: "admin@academic.local",
  });

  const teacherByName = new Map<string, Awaited<ReturnType<typeof storage.createUser>>>();
  for (let index = 0; index < uniqueTeacherNames().length; index += 1) {
    const name = uniqueTeacherNames()[index];
    const email = emailFromName(name);
    const teacher = await ensureUser({
      username: toUsernameFromEmail(email),
      password: teacherPassword,
      role: "teacher",
      name,
      cpf: makeCpf(11000000000, index + 1),
      phone: makePhone(91000000, index + 1),
      email,
    });
    teacherByName.set(name, teacher);
  }

  const academicTerm = await storage.getOrCreateActiveAcademicTerm();
  const createdCourses: Array<Awaited<ReturnType<typeof storage.createCourse>>> = [];
  const subjectByCourseName = new Map<string, Array<{ subjectId: number; stage: number; seed: MatrixSubjectSeed }>>();

  for (const courseSeed of courseSeeds) {
    const course = await ensureCourse(courseSeed);
    createdCourses.push(course);

    const courseSubjects: Array<{ subjectId: number; stage: number; seed: MatrixSubjectSeed }> = [];
    const stageBySubjectId: Record<number, number> = {};

    for (const subjectSeed of courseSeed.subjects) {
      const subject = await ensureSubject(subjectSeed, courseSeed.name);
      courseSubjects.push({ subjectId: subject.id, stage: subjectSeed.stage, seed: subjectSeed });
      stageBySubjectId[subject.id] = subjectSeed.stage;
    }

    await storage.setCourseSubjects(
      course.id,
      courseSubjects.map((entry) => entry.subjectId),
      stageBySubjectId,
    );
    subjectByCourseName.set(course.name, courseSubjects);
  }

  const ccCourse = createdCourses.find((course) => course.name === "Ciencia da Computacao");
  if (!ccCourse) throw new Error("Curso de Ciencia da Computacao nao encontrado no seed");

  const ccCreatedSections = [];
  for (const sectionSeed of ccSections) {
    const coordinator = teacherByName.get(sectionSeed.coordinatorName);
    const section = await ensureSection(
      ccCourse.id,
      academicTerm.id,
      sectionSeed,
      coordinator?.id ?? null,
    );
    ccCreatedSections.push(section);
  }

  const ccSubjects = subjectByCourseName.get("Ciencia da Computacao") ?? [];
  const turmaA = ccCreatedSections[0];
  const teacherAssignments = ccSubjects.flatMap((entry) => {
    return (entry.seed.teachers ?? [])
      .map((teacherName) => teacherByName.get(teacherName))
      .filter((teacher): teacher is Awaited<ReturnType<typeof storage.createUser>> => Boolean(teacher))
      .map((teacher) => ({
        classSectionId: turmaA.id,
        subjectId: entry.subjectId,
        teacherId: teacher.id,
      }));
  });
  await storage.assignClassSectionSubjectTeachers(teacherAssignments);

  const statusCounters: Record<EnrollmentStatus, number> = {
    active: 0,
    completed: 0,
    dropped: 0,
    locked: 0,
    canceled: 0,
  };

  const sectionsForEnrollment = ccCreatedSections;
  for (let index = 0; index < 72; index += 1) {
    const name = makeStudentName(index);
    const email = `${slugify(name)}.${String(index + 1).padStart(3, "0")}@aluno.academic.local`;
    const student = await ensureUser({
      username: `aluno${String(index + 1).padStart(3, "0")}`,
      password: studentPassword,
      role: "student",
      name,
      cpf: makeCpf(20000000000, index + 1),
      phone: makePhone(92000000, index + 1),
      email,
    });

    const section = sectionsForEnrollment[index % sectionsForEnrollment.length];
    const status = enrollmentStatusFor(index);
    const existingEnrollment = (await storage.getEnrollments(ccCourse.id, student.id)).find(
      (entry) => entry.classSectionId === section.id,
    );

    const enrollment =
      existingEnrollment ??
      (await storage.createEnrollment({
        studentId: student.id,
        courseId: ccCourse.id,
        classSectionId: section.id,
        grade: gradeFor(status, index),
        attendance: attendanceFor(status, index),
        status,
      }));

    statusCounters[status] += 1;
    if (status === "locked" && !existingEnrollment) {
      await storage.lockEnrollment({
        enrollmentId: enrollment.id,
        changedByUserId: admin.id,
        reason: "Trancamento simulado para validar historico academico.",
        approvedSubjectIds: ccSubjects
          .filter((entry) => entry.stage < section.currentStageNumber)
          .slice(0, 3)
          .map((entry) => entry.subjectId),
      });
    }
  }

  const existingAnnouncements = await storage.getAnnouncementsForUser(admin);
  if (!existingAnnouncements.some((announcement) => announcement.title === "Boas-vindas ao periodo letivo")) {
    await storage.createAnnouncement({
      title: "Boas-vindas ao periodo letivo",
      content: "Bem-vindos ao ambiente academico. Confiram turmas, matriz curricular e comunicados.",
      authorId: admin.id,
      isGlobal: true,
      expiresAt: null,
      courseIds: [],
      classSectionIds: [],
    });
  }

  if (!existingAnnouncements.some((announcement) => announcement.title === "Comunicado Turma A - 5 etapa")) {
    await storage.createAnnouncement({
      title: "Comunicado Turma A - 5 etapa",
      content: "A Turma A esta cursando a 5 etapa de Ciencia da Computacao neste periodo.",
      authorId: teacherByName.get("Adriano Sunao Nakamura")?.id ?? admin.id,
      isGlobal: false,
      expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      courseIds: [],
      classSectionIds: [turmaA.id],
    });
  }

  const firstStudentRa = (await storage.getUsers("student"))[0]?.ra;
  console.log(
    [
      "Seed concluido.",
      `Admin RA: ${admin.ra}`,
      `Aluno RA exemplo: ${firstStudentRa}`,
      `Cursos: ${createdCourses.length}`,
      `Turmas CC: ${ccCreatedSections.length}`,
      `Disciplinas CC: ${ccSubjects.length}`,
      `Matriculas [active/completed/dropped/locked/canceled]: ${statusCounters.active}/${statusCounters.completed}/${statusCounters.dropped}/${statusCounters.locked}/${statusCounters.canceled}`,
      "Credenciais padrao: Admin@12345 | Professor@123 | Aluno@12345",
    ].join(" | "),
  );
}
