import { and, eq, inArray } from "drizzle-orm";
import { hashPassword } from "./auth";
import { db } from "./db";
import { teachingAssignmentService } from "./teaching-assignment";
import { teacherSubjectCompatibilityService } from "./teacher-subject-compatibility";
import {
  academicTerms,
  attendanceEntries,
  classScheduleEntries,
  classSlotConflicts,
  classSectionSubjectAssignments,
  classSectionTeachers,
  classSections,
  competencyTags,
  courseMaterials,
  courseSubjects,
  courses,
  enrollments,
  gradeEntries,
  locationCategories,
  scheduleGenerationRuns,
  schedulePublications,
  subjectCompetencies,
  subjects,
  teacherAcademicDegrees,
  teacherAvailabilitySlots,
  teacherCompetencies,
  teacherPreferenceClassSections,
  teacherPreferenceSubmissions,
  teacherPreferenceSubjects,
  teacherProfessionalExperienceCompetencies,
  teacherProfessionalExperiences,
  teacherSubjectHistory,
  teacherSubjectManualOverrides,
  teacherSubjectMatchScores,
  users,
} from "@shared/schema";

type DemoUserSeed = {
  role: "admin" | "teacher" | "student";
  name: string;
  email: string;
  username: string;
  ra: string;
  cpf: string;
  phone: string;
  password: string;
};

const DEMO_TERM_CODE = "DEMO-TA-2026-1";
const DEMO_TERM_NAME = "Periodo demonstracao atribuicao 2026/1";
const DEMO_COURSE_CODE = "DEMO-CC-OPERACIONAL";

type DemoSubjectSeed = {
  code: string;
  name: string;
  description: string;
  area: string;
  subarea: string;
  workloadHours: number;
  requiredLocationKind?: "classroom" | "laboratory";
  requiredEquipment?: string;
};

const demoUsers = {
  admin: {
    role: "admin",
    name: "Admin Demonstracao Atribuicao",
    email: "demo.assignment.admin@academic.local",
    username: "demo.assignment.admin",
    ra: "DEMOADM001",
    cpf: "95000000001",
    phone: "11950000001",
    password: "DemoAdmin@123",
  } satisfies DemoUserSeed,
  teacherA: {
    role: "teacher",
    name: "Prof. Demo Alice Andrade",
    email: "demo.alice.andrade@academic.local",
    username: "demo.alice.andrade",
    ra: "DEMOTEA001",
    cpf: "95000000002",
    phone: "11950000002",
    password: "DemoTeacher@123",
  } satisfies DemoUserSeed,
  teacherB: {
    role: "teacher",
    name: "Prof. Demo Bruno Borges",
    email: "demo.bruno.borges@academic.local",
    username: "demo.bruno.borges",
    ra: "DEMOTEA002",
    cpf: "95000000003",
    phone: "11950000003",
    password: "DemoTeacher@123",
  } satisfies DemoUserSeed,
  teacherC: {
    role: "teacher",
    name: "Prof. Demo Clara Campos",
    email: "demo.clara.campos@academic.local",
    username: "demo.clara.campos",
    ra: "DEMOTEA003",
    cpf: "95000000004",
    phone: "11950000004",
    password: "DemoTeacher@123",
  } satisfies DemoUserSeed,
  students: [
    {
      role: "student",
      name: "Aluno Demo Caio Costa",
      email: "demo.caio.costa@academic.local",
      username: "demo.caio.costa",
      ra: "DEMOSTU001",
      cpf: "95000000005",
      phone: "11950000005",
      password: "DemoStudent@123",
    },
    {
      role: "student",
      name: "Aluno Demo Elisa Esteves",
      email: "demo.elisa.esteves@academic.local",
      username: "demo.elisa.esteves",
      ra: "DEMOSTU002",
      cpf: "95000000006",
      phone: "11950000006",
      password: "DemoStudent@123",
    },
    {
      role: "student",
      name: "Aluno Demo Fabio Farias",
      email: "demo.fabio.farias@academic.local",
      username: "demo.fabio.farias",
      ra: "DEMOSTU003",
      cpf: "95000000007",
      phone: "11950000007",
      password: "DemoStudent@123",
    },
    {
      role: "student",
      name: "Aluno Demo Giovana Gomes",
      email: "demo.giovana.gomes@academic.local",
      username: "demo.giovana.gomes",
      ra: "DEMOSTU004",
      cpf: "95000000008",
      phone: "11950000008",
      password: "DemoStudent@123",
    },
    {
      role: "student",
      name: "Aluno Demo Heitor Henriques",
      email: "demo.heitor.henriques@academic.local",
      username: "demo.heitor.henriques",
      ra: "DEMOSTU005",
      cpf: "95000000009",
      phone: "11950000009",
      password: "DemoStudent@123",
    },
    {
      role: "student",
      name: "Aluno Demo Iris Inacio",
      email: "demo.iris.inacio@academic.local",
      username: "demo.iris.inacio",
      ra: "DEMOSTU006",
      cpf: "95000000010",
      phone: "11950000010",
      password: "DemoStudent@123",
    },
  ] satisfies DemoUserSeed[],
};

const demoSubjects: DemoSubjectSeed[] = [
  {
    code: "DEMO-SUB-ALG",
    name: "Algoritmos",
    description: "Disciplina demonstrativa focada em algoritmos e resolucao de problemas.",
    area: "Computacao",
    subarea: "Algoritmos",
    workloadHours: 60,
  },
  {
    code: "DEMO-SUB-LOG",
    name: "Logica de Programacao",
    description: "Disciplina demonstrativa de logica e fundamentos de programacao.",
    area: "Computacao",
    subarea: "Logica",
    workloadHours: 60,
  },
  {
    code: "DEMO-SUB-BD1",
    name: "Banco de Dados I",
    description: "Disciplina demonstrativa de modelagem relacional e SQL.",
    area: "Computacao",
    subarea: "Banco de Dados",
    requiredLocationKind: "laboratory" as const,
    requiredEquipment: "computadores",
    workloadHours: 60,
  },
  {
    code: "DEMO-SUB-ARQ",
    name: "Arquitetura de Computadores",
    description: "Disciplina demonstrativa de hardware, memoria e organizacao.",
    area: "Computacao",
    subarea: "Arquitetura",
    workloadHours: 60,
  },
  {
    code: "DEMO-SUB-MAT",
    name: "Matematica Discreta",
    description: "Disciplina demonstrativa de logica formal e estruturas discretas.",
    area: "Computacao",
    subarea: "Matematica",
    workloadHours: 60,
  },
];

const demoTags = [
  { key: "demo-tag-algoritmos", label: "Algoritmos", area: "Computacao", subarea: "Algoritmos" },
  { key: "demo-tag-logica", label: "Logica", area: "Computacao", subarea: "Logica" },
  { key: "demo-tag-dados", label: "Banco de Dados", area: "Computacao", subarea: "Banco de Dados" },
  { key: "demo-tag-arquitetura", label: "Arquitetura", area: "Computacao", subarea: "Arquitetura" },
  { key: "demo-tag-matematica", label: "Matematica", area: "Computacao", subarea: "Matematica" },
  { key: "demo-tag-laboratorio", label: "Laboratorio", area: "Computacao", subarea: "Infraestrutura" },
] as const;

async function upsertDemoUser(seed: DemoUserSeed) {
  const passwordHash = await hashPassword(seed.password);
  const [existing] = await db.select().from(users).where(eq(users.email, seed.email));

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        role: seed.role,
        name: seed.name,
        email: seed.email,
        username: seed.username,
        ra: seed.ra,
        cpf: seed.cpf,
        phone: seed.phone,
        password: passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      role: seed.role,
      name: seed.name,
      email: seed.email,
      username: seed.username,
      ra: seed.ra,
      cpf: seed.cpf,
      phone: seed.phone,
      password: passwordHash,
      updatedAt: new Date(),
    })
    .returning();

  return created;
}

async function upsertDemoTerm() {
  const [existing] = await db.select().from(academicTerms).where(eq(academicTerms.code, DEMO_TERM_CODE));
  const payload = {
    code: DEMO_TERM_CODE,
    name: DEMO_TERM_NAME,
    startsAt: new Date("2026-02-01T00:00:00.000Z"),
    endsAt: new Date("2026-06-30T23:59:59.000Z"),
    isActive: true,
  };

  const term = existing
    ? (
        await db
          .update(academicTerms)
          .set(payload)
          .where(eq(academicTerms.id, existing.id))
          .returning()
      )[0]
    : (
        await db
          .insert(academicTerms)
          .values(payload)
          .returning()
      )[0];

  await db.update(academicTerms).set({ isActive: false });
  const [activated] = await db
    .update(academicTerms)
    .set({ isActive: true })
    .where(eq(academicTerms.id, term.id))
    .returning();

  return activated;
}

async function upsertDemoCourse(teacherId: number) {
  const [existing] = await db.select().from(courses).where(eq(courses.code, DEMO_COURSE_CODE));
  const payload = {
    code: DEMO_COURSE_CODE,
    name: "Ciencia da Computacao [DEMO]",
    description:
      "Curso persistente de demonstracao para a ferramenta de atribuicao de aulas, com conflitos, lacunas e grade publicada.",
    teacherId,
    schedule: "Seg a Sex 19:25-23:00",
  };

  return existing
    ? (
        await db
          .update(courses)
          .set(payload)
          .where(eq(courses.id, existing.id))
          .returning()
      )[0]
    : (
        await db
          .insert(courses)
          .values(payload)
          .returning()
      )[0];
}

async function upsertDemoSubject(seed: (typeof demoSubjects)[number]) {
  const [existing] = await db.select().from(subjects).where(eq(subjects.code, seed.code));
  const payload = {
    code: seed.code,
    name: seed.name,
    description: seed.description,
    area: seed.area,
    subarea: seed.subarea,
    requiredLocationKind: seed.requiredLocationKind ?? null,
    requiredEquipment: seed.requiredEquipment ?? null,
    workloadHours: seed.workloadHours,
  };

  return existing
    ? (
        await db
          .update(subjects)
          .set(payload)
          .where(eq(subjects.id, existing.id))
          .returning()
      )[0]
    : (
        await db
          .insert(subjects)
          .values(payload)
          .returning()
      )[0];
}

async function upsertDemoSection(input: {
  code: string;
  name: string;
  courseId: number;
  academicTermId: number;
}) {
  const [existing] = await db.select().from(classSections).where(eq(classSections.code, input.code));
  const payload = {
    code: input.code,
    name: input.name,
    courseId: input.courseId,
    academicTermId: input.academicTermId,
    room: null,
    scheduleSummary: "Calendario semanal noturno de demonstracao",
  };

  return existing
    ? (
        await db
          .update(classSections)
          .set(payload)
          .where(eq(classSections.id, existing.id))
          .returning()
      )[0]
    : (
        await db
          .insert(classSections)
          .values(payload)
          .returning()
      )[0];
}

async function upsertDemoTag(seed: (typeof demoTags)[number]) {
  const [existing] = await db.select().from(competencyTags).where(eq(competencyTags.key, seed.key));
  const payload = {
    key: seed.key,
    label: seed.label,
    area: seed.area,
    subarea: seed.subarea,
  };

  return existing
    ? (
        await db
          .update(competencyTags)
          .set(payload)
          .where(eq(competencyTags.id, existing.id))
          .returning()
      )[0]
    : (
        await db
          .insert(competencyTags)
          .values(payload)
          .returning()
      )[0];
}

async function cleanupDemoScenario(input: {
  academicTermId: number;
  courseId: number;
  classSectionIds: number[];
  teacherIds: number[];
  subjectIds: number[];
}) {
  const [submissionRows, publicationRows, runRows, experienceRows] = await Promise.all([
    db
      .select({ id: teacherPreferenceSubmissions.id })
      .from(teacherPreferenceSubmissions)
      .where(
        and(
          eq(teacherPreferenceSubmissions.academicTermId, input.academicTermId),
          inArray(teacherPreferenceSubmissions.teacherId, input.teacherIds),
        ),
      ),
    db
      .select({ id: schedulePublications.id })
      .from(schedulePublications)
      .where(eq(schedulePublications.academicTermId, input.academicTermId)),
    db
      .select({ id: scheduleGenerationRuns.id })
      .from(scheduleGenerationRuns)
      .where(eq(scheduleGenerationRuns.academicTermId, input.academicTermId)),
    db
      .select({ id: teacherProfessionalExperiences.id })
      .from(teacherProfessionalExperiences)
      .where(inArray(teacherProfessionalExperiences.teacherId, input.teacherIds)),
  ]);

  const submissionIds = submissionRows.map((row) => row.id);
  const publicationIds = publicationRows.map((row) => row.id);
  const runIds = runRows.map((row) => row.id);
  const experienceIds = experienceRows.map((row) => row.id);

  if (runIds.length > 0) {
    await db.delete(classSlotConflicts).where(inArray(classSlotConflicts.generationRunId, runIds));
  }

  if (publicationIds.length > 0) {
    await db.delete(classScheduleEntries).where(inArray(classScheduleEntries.publicationId, publicationIds));
  }

  if (input.classSectionIds.length > 0) {
    await db.delete(classScheduleEntries).where(inArray(classScheduleEntries.classSectionId, input.classSectionIds));
    await db.delete(gradeEntries).where(inArray(gradeEntries.classSectionId, input.classSectionIds));
    await db.delete(attendanceEntries).where(inArray(attendanceEntries.classSectionId, input.classSectionIds));
    await db
      .delete(classSectionSubjectAssignments)
      .where(inArray(classSectionSubjectAssignments.classSectionId, input.classSectionIds));
    await db.delete(classSectionTeachers).where(inArray(classSectionTeachers.classSectionId, input.classSectionIds));
  }

  if (publicationIds.length > 0) {
    await db.delete(schedulePublications).where(inArray(schedulePublications.id, publicationIds));
  }
  if (runIds.length > 0) {
    await db.delete(scheduleGenerationRuns).where(inArray(scheduleGenerationRuns.id, runIds));
  }

  if (submissionIds.length > 0) {
    await db.delete(teacherPreferenceSubjects).where(inArray(teacherPreferenceSubjects.submissionId, submissionIds));
    await db
      .delete(teacherPreferenceClassSections)
      .where(inArray(teacherPreferenceClassSections.submissionId, submissionIds));
    await db.delete(teacherPreferenceSubmissions).where(inArray(teacherPreferenceSubmissions.id, submissionIds));
  }

  await db.delete(teacherAvailabilitySlots).where(inArray(teacherAvailabilitySlots.teacherId, input.teacherIds));
  await db.delete(teacherSubjectMatchScores).where(
    and(
      inArray(teacherSubjectMatchScores.teacherId, input.teacherIds),
      inArray(teacherSubjectMatchScores.subjectId, input.subjectIds),
    ),
  );
  await db.delete(teacherSubjectManualOverrides).where(
    and(
      inArray(teacherSubjectManualOverrides.teacherId, input.teacherIds),
      inArray(teacherSubjectManualOverrides.subjectId, input.subjectIds),
    ),
  );
  await db.delete(teacherSubjectHistory).where(
    and(
      inArray(teacherSubjectHistory.teacherId, input.teacherIds),
      inArray(teacherSubjectHistory.subjectId, input.subjectIds),
    ),
  );
  await db.delete(teacherAcademicDegrees).where(inArray(teacherAcademicDegrees.teacherId, input.teacherIds));
  await db.delete(teacherCompetencies).where(inArray(teacherCompetencies.teacherId, input.teacherIds));

  if (experienceIds.length > 0) {
    await db
      .delete(teacherProfessionalExperienceCompetencies)
      .where(inArray(teacherProfessionalExperienceCompetencies.experienceId, experienceIds));
  }
  await db
    .delete(teacherProfessionalExperiences)
    .where(inArray(teacherProfessionalExperiences.teacherId, input.teacherIds));

  await db.delete(subjectCompetencies).where(inArray(subjectCompetencies.subjectId, input.subjectIds));
  await db.delete(courseSubjects).where(eq(courseSubjects.courseId, input.courseId));
  await db.delete(courseMaterials).where(eq(courseMaterials.courseId, input.courseId));
  await db
    .delete(enrollments)
    .where(and(eq(enrollments.courseId, input.courseId), eq(enrollments.academicTermId, input.academicTermId)));
}

async function markPreferencesSubmitted(teacherIds: number[], academicTermId: number) {
  if (teacherIds.length === 0) return;

  await db
    .update(teacherPreferenceSubmissions)
    .set({
      status: "submitted",
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(teacherPreferenceSubmissions.academicTermId, academicTermId),
        inArray(teacherPreferenceSubmissions.teacherId, teacherIds),
      ),
    );
}

async function upsertDemoLocationCategory(input: {
  name: string;
  kind: "classroom" | "laboratory";
  maxCapacity: number;
  quantity: number;
  unitPrefix: string;
  defaultEquipment?: string;
}) {
  const [existing] = await db.select().from(locationCategories).where(eq(locationCategories.name, input.name));
  return teachingAssignmentService.upsertLocationCategory({
    id: existing?.id,
    name: input.name,
    kind: input.kind,
    maxCapacity: input.maxCapacity,
    quantity: input.quantity,
    unitPrefix: input.unitPrefix,
    defaultEquipment: input.defaultEquipment,
  });
}

export async function seedTeachingAssignmentDemo() {
  const term = await upsertDemoTerm();
  const demoAdmin = await upsertDemoUser(demoUsers.admin);
  const teacherA = await upsertDemoUser(demoUsers.teacherA);
  const teacherB = await upsertDemoUser(demoUsers.teacherB);
  const teacherC = await upsertDemoUser(demoUsers.teacherC);
  const students = await Promise.all(demoUsers.students.map((student) => upsertDemoUser(student)));

  const course = await upsertDemoCourse(teacherA.id);
  const [algoritmos, logica, banco, arquitetura, matematica] = await Promise.all(
    demoSubjects.map((subject) => upsertDemoSubject(subject)),
  );
  const sectionA = await upsertDemoSection({
    code: "DEMO-CC-1A",
    name: "CC-1A [DEMO]",
    courseId: course.id,
    academicTermId: term.id,
  });
  const sectionB = await upsertDemoSection({
    code: "DEMO-CC-1B",
    name: "CC-1B [DEMO]",
    courseId: course.id,
    academicTermId: term.id,
  });

  await cleanupDemoScenario({
    academicTermId: term.id,
    courseId: course.id,
    classSectionIds: [sectionA.id, sectionB.id],
    teacherIds: [teacherA.id, teacherB.id, teacherC.id],
    subjectIds: [algoritmos.id, logica.id, banco.id, arquitetura.id, matematica.id],
  });

  await db.insert(courseSubjects).values([
    { courseId: course.id, subjectId: algoritmos.id, semester: "1", isRequired: true },
    { courseId: course.id, subjectId: logica.id, semester: "1", isRequired: true },
    { courseId: course.id, subjectId: banco.id, semester: "1", isRequired: true },
    { courseId: course.id, subjectId: arquitetura.id, semester: "1", isRequired: true },
    { courseId: course.id, subjectId: matematica.id, semester: "1", isRequired: true },
  ]);

  await db.insert(enrollments).values([
    { studentId: students[0].id, courseId: course.id, classSectionId: sectionA.id, academicTermId: term.id, status: "active" },
    { studentId: students[1].id, courseId: course.id, classSectionId: sectionA.id, academicTermId: term.id, status: "active" },
    { studentId: students[2].id, courseId: course.id, classSectionId: sectionA.id, academicTermId: term.id, status: "active" },
    { studentId: students[3].id, courseId: course.id, classSectionId: sectionB.id, academicTermId: term.id, status: "active" },
    { studentId: students[4].id, courseId: course.id, classSectionId: sectionB.id, academicTermId: term.id, status: "active" },
    { studentId: students[5].id, courseId: course.id, classSectionId: sectionB.id, academicTermId: term.id, status: "active" },
  ]);

  const [tagAlgoritmos, tagLogica, tagDados, tagArquitetura, tagMatematica, tagLaboratorio] =
    await Promise.all(demoTags.map((tag) => upsertDemoTag(tag)));

  await db.insert(subjectCompetencies).values([
    { subjectId: algoritmos.id, tagId: tagAlgoritmos.id, weight: 5 },
    { subjectId: logica.id, tagId: tagLogica.id, weight: 4 },
    { subjectId: logica.id, tagId: tagMatematica.id, weight: 2 },
    { subjectId: banco.id, tagId: tagDados.id, weight: 5 },
    { subjectId: banco.id, tagId: tagLaboratorio.id, weight: 3 },
    { subjectId: arquitetura.id, tagId: tagArquitetura.id, weight: 5 },
    { subjectId: matematica.id, tagId: tagMatematica.id, weight: 5 },
    { subjectId: matematica.id, tagId: tagLogica.id, weight: 3 },
  ]);

  await db.insert(teacherAcademicDegrees).values([
    {
      teacherId: teacherA.id,
      degreeLevel: "master",
      courseName: "Ciencia da Computacao",
      institution: "Universidade Demo",
      area: "Computacao",
      subarea: "Algoritmos",
      completedAt: new Date("2024-12-01T00:00:00.000Z"),
    },
    {
      teacherId: teacherB.id,
      degreeLevel: "master",
      courseName: "Sistemas de Informacao",
      institution: "Universidade Demo",
      area: "Computacao",
      subarea: "Banco de Dados",
      completedAt: new Date("2023-12-01T00:00:00.000Z"),
    },
    {
      teacherId: teacherC.id,
      degreeLevel: "specialization",
      courseName: "Matematica Aplicada",
      institution: "Universidade Demo",
      area: "Computacao",
      subarea: "Matematica",
      completedAt: new Date("2022-12-01T00:00:00.000Z"),
    },
  ]);

  await db.insert(teacherCompetencies).values([
    { teacherId: teacherA.id, tagId: tagAlgoritmos.id, weight: 5 },
    { teacherId: teacherA.id, tagId: tagLogica.id, weight: 5 },
    { teacherId: teacherA.id, tagId: tagMatematica.id, weight: 3 },
    { teacherId: teacherB.id, tagId: tagDados.id, weight: 5 },
    { teacherId: teacherB.id, tagId: tagArquitetura.id, weight: 5 },
    { teacherId: teacherB.id, tagId: tagLaboratorio.id, weight: 4 },
    { teacherId: teacherC.id, tagId: tagMatematica.id, weight: 5 },
    { teacherId: teacherC.id, tagId: tagLogica.id, weight: 4 },
    { teacherId: teacherC.id, tagId: tagAlgoritmos.id, weight: 2 },
  ]);

  const [experienceB] = await db
    .insert(teacherProfessionalExperiences)
    .values({
      teacherId: teacherB.id,
      companyName: "Laboratorio Demo de Dados",
      roleName: "Arquiteto de Dados",
      description: "Experiencia demonstrativa em dados, infraestrutura e laboratorios.",
      area: "Computacao",
      subarea: "Banco de Dados",
      startsAt: new Date("2021-01-01T00:00:00.000Z"),
      isCurrent: true,
    })
    .returning();
  const [experienceC] = await db
    .insert(teacherProfessionalExperiences)
    .values({
      teacherId: teacherC.id,
      companyName: "Centro Demo de Matematica Aplicada",
      roleName: "Consultora Academica",
      description: "Experiencia demonstrativa com conteudos discretos e apoio pedagogico.",
      area: "Computacao",
      subarea: "Matematica",
      startsAt: new Date("2020-01-01T00:00:00.000Z"),
      isCurrent: true,
    })
    .returning();

  await db.insert(teacherProfessionalExperienceCompetencies).values([
    { experienceId: experienceB.id, tagId: tagDados.id },
    { experienceId: experienceB.id, tagId: tagArquitetura.id },
    { experienceId: experienceB.id, tagId: tagLaboratorio.id },
    { experienceId: experienceC.id, tagId: tagMatematica.id },
    { experienceId: experienceC.id, tagId: tagLogica.id },
  ]);

  await db.insert(teacherSubjectHistory).values([
    {
      teacherId: teacherA.id,
      subjectId: algoritmos.id,
      academicTermId: term.id,
      classSectionId: sectionA.id,
      taughtAt: new Date("2025-06-01T00:00:00.000Z"),
    },
    {
      teacherId: teacherB.id,
      subjectId: banco.id,
      academicTermId: term.id,
      classSectionId: sectionA.id,
      taughtAt: new Date("2025-06-01T00:00:00.000Z"),
    },
    {
      teacherId: teacherC.id,
      subjectId: matematica.id,
      academicTermId: term.id,
      classSectionId: sectionB.id,
      taughtAt: new Date("2025-06-01T00:00:00.000Z"),
    },
  ]);

  await teachingAssignmentService.upsertTeacherAssignmentProfile({
    teacherId: teacherA.id,
    careerTrack: "Magisterio Superior A",
    priorityOrder: 1,
    weeklyLoadTargetHours: 4,
    notes: "Alta aderencia em algoritmos, logica e fundamentos.",
  });
  await teachingAssignmentService.upsertTeacherAssignmentProfile({
    teacherId: teacherB.id,
    careerTrack: "Magisterio Superior B",
    priorityOrder: 2,
    weeklyLoadTargetHours: 4,
    notes: "Foco em banco de dados, arquitetura e laboratorios.",
  });
  await teachingAssignmentService.upsertTeacherAssignmentProfile({
    teacherId: teacherC.id,
    careerTrack: "Professor Auxiliar",
    priorityOrder: 3,
    weeklyLoadTargetHours: 4,
    notes: "Carga parcial com boa aderencia em matematica discreta e logica.",
  });

  const { timeSlots } = await teachingAssignmentService.ensureFoundationalData();
  const firstSlot = timeSlots.find((slot) => slot.sequence === 1 && !slot.isBreak);
  const fourthSlot = timeSlots.find((slot) => slot.sequence === 4 && !slot.isBreak);
  if (!firstSlot || !fourthSlot) {
    throw new Error("Blocos padrao de horario nao encontrados para a seed de demonstracao.");
  }

  const [roomA, roomB] = await upsertDemoLocationCategory({
    name: "DEMO Sala Aula 45",
    kind: "classroom",
    maxCapacity: 45,
    quantity: 2,
    unitPrefix: "Sala Demo",
    defaultEquipment: "projetor",
  });
  const [labMain] = await upsertDemoLocationCategory({
    name: "DEMO Laboratorio 30",
    kind: "laboratory",
    maxCapacity: 30,
    quantity: 1,
    unitPrefix: "Lab Demo",
    defaultEquipment: "computadores",
  });
  await upsertDemoLocationCategory({
    name: "DEMO Laboratorio Compacto 2",
    kind: "laboratory",
    maxCapacity: 2,
    quantity: 1,
    unitPrefix: "Lab Compacto",
    defaultEquipment: "computadores",
  });

  const compatibilityPairs = [teacherA.id, teacherB.id, teacherC.id].flatMap((teacherId) =>
    [algoritmos.id, logica.id, banco.id, arquitetura.id, matematica.id].map((subjectId) => ({
      teacherId,
      subjectId,
    })),
  );

  await Promise.all(
    compatibilityPairs.map((pair) =>
      teacherSubjectCompatibilityService.calculateForPair({
        teacherId: pair.teacherId,
        subjectId: pair.subjectId,
        persist: true,
        calculatedByUserId: demoAdmin.id,
      }),
    ),
  );

  const fullAvailability = timeSlots
    .filter((slot) => !slot.isBreak)
    .flatMap((slot) => [
      { weekday: "monday" as const, timeSlotId: slot.id, isAvailable: true },
      { weekday: "tuesday" as const, timeSlotId: slot.id, isAvailable: true },
      { weekday: "wednesday" as const, timeSlotId: slot.id, isAvailable: true },
      { weekday: "thursday" as const, timeSlotId: slot.id, isAvailable: true },
      { weekday: "friday" as const, timeSlotId: slot.id, isAvailable: true },
    ]);

  await teachingAssignmentService.upsertTeacherPreferences({
    teacherId: teacherA.id,
    notes: "Prefere assumir Algoritmos na 1A e Logica na 1B.",
    subjectIds: [algoritmos.id, logica.id, matematica.id],
    sectionPreferences: [
      { subjectId: algoritmos.id, classSectionId: sectionA.id, priority: 1 },
      { subjectId: logica.id, classSectionId: sectionB.id, priority: 2 },
      { subjectId: matematica.id, classSectionId: sectionA.id, priority: 3 },
    ],
    availability: fullAvailability,
  });
  await teachingAssignmentService.upsertTeacherPreferences({
    teacherId: teacherB.id,
    notes: "Prefere Banco de Dados I e Arquitetura, com foco em laboratorios.",
    subjectIds: [banco.id, arquitetura.id, logica.id],
    sectionPreferences: [
      { subjectId: banco.id, classSectionId: sectionA.id, priority: 1 },
      { subjectId: arquitetura.id, classSectionId: sectionB.id, priority: 2 },
      { subjectId: banco.id, classSectionId: sectionB.id, priority: 3 },
    ],
    availability: fullAvailability,
  });
  await teachingAssignmentService.upsertTeacherPreferences({
    teacherId: teacherC.id,
    notes: "Aceita lacunas em Matematica Discreta e Logica com carga restante.",
    subjectIds: [matematica.id, logica.id, banco.id],
    sectionPreferences: [
      { subjectId: matematica.id, classSectionId: sectionA.id, priority: 1 },
      { subjectId: matematica.id, classSectionId: sectionB.id, priority: 2 },
      { subjectId: logica.id, classSectionId: sectionA.id, priority: 3 },
    ],
    availability: fullAvailability,
  });
  await markPreferencesSubmitted([teacherA.id, teacherB.id, teacherC.id], term.id);

  const assignmentA1 = await teachingAssignmentService.upsertAssignment({
    classSectionId: sectionA.id,
    subjectId: algoritmos.id,
    teacherId: teacherA.id,
    weeklySlotTarget: 2,
    coordinatorTeacherId: teacherA.id,
    notes: "Alta aderencia e prioridade maxima.",
    createdByUserId: demoAdmin.id,
  });
  const assignmentA2 = await teachingAssignmentService.upsertAssignment({
    classSectionId: sectionA.id,
    subjectId: banco.id,
    teacherId: teacherB.id,
    weeklySlotTarget: 2,
    notes: "Laboratorio e modelagem relacional.",
    createdByUserId: demoAdmin.id,
  });
  const assignmentB1 = await teachingAssignmentService.upsertAssignment({
    classSectionId: sectionB.id,
    subjectId: logica.id,
    teacherId: teacherA.id,
    weeklySlotTarget: 2,
    coordinatorTeacherId: teacherB.id,
    notes: "Preferencia confirmada pelo professor A.",
    createdByUserId: demoAdmin.id,
  });
  const assignmentB2 = await teachingAssignmentService.upsertAssignment({
    classSectionId: sectionB.id,
    subjectId: arquitetura.id,
    teacherId: teacherB.id,
    weeklySlotTarget: 2,
    notes: "Cobertura de hardware e organizacao.",
    createdByUserId: demoAdmin.id,
  });

  await db.insert(classSectionTeachers).values([
    { classSectionId: sectionA.id, teacherId: teacherA.id },
    { classSectionId: sectionA.id, teacherId: teacherB.id },
    { classSectionId: sectionA.id, teacherId: teacherC.id },
    { classSectionId: sectionB.id, teacherId: teacherA.id },
    { classSectionId: sectionB.id, teacherId: teacherB.id },
    { classSectionId: sectionB.id, teacherId: teacherC.id },
  ]);

  await teachingAssignmentService.createScheduleEntry({
    assignmentId: assignmentA1.id,
    weekday: "monday",
    timeSlotId: firstSlot.id,
    spanSlots: 1,
    locationId: roomA.id,
    createdByUserId: demoAdmin.id,
  });
  await teachingAssignmentService.createScheduleEntry({
    assignmentId: assignmentA1.id,
    weekday: "wednesday",
    timeSlotId: firstSlot.id,
    spanSlots: 1,
    locationId: roomA.id,
    createdByUserId: demoAdmin.id,
  });
  await teachingAssignmentService.createScheduleEntry({
    assignmentId: assignmentA2.id,
    weekday: "tuesday",
    timeSlotId: firstSlot.id,
    spanSlots: 1,
    locationId: labMain.id,
    createdByUserId: demoAdmin.id,
  });
  await teachingAssignmentService.createScheduleEntry({
    assignmentId: assignmentA2.id,
    weekday: "thursday",
    timeSlotId: firstSlot.id,
    spanSlots: 1,
    locationId: labMain.id,
    createdByUserId: demoAdmin.id,
  });
  await teachingAssignmentService.createScheduleEntry({
    assignmentId: assignmentB1.id,
    weekday: "monday",
    timeSlotId: fourthSlot.id,
    spanSlots: 1,
    locationId: roomB.id,
    createdByUserId: demoAdmin.id,
  });
  await teachingAssignmentService.createScheduleEntry({
    assignmentId: assignmentB1.id,
    weekday: "wednesday",
    timeSlotId: fourthSlot.id,
    spanSlots: 1,
    locationId: roomB.id,
    createdByUserId: demoAdmin.id,
  });
  await teachingAssignmentService.createScheduleEntry({
    assignmentId: assignmentB2.id,
    weekday: "tuesday",
    timeSlotId: fourthSlot.id,
    spanSlots: 1,
    locationId: roomA.id,
    createdByUserId: demoAdmin.id,
  });
  await teachingAssignmentService.createScheduleEntry({
    assignmentId: assignmentB2.id,
    weekday: "thursday",
    timeSlotId: fourthSlot.id,
    spanSlots: 1,
    locationId: roomA.id,
    createdByUserId: demoAdmin.id,
  });

  await teachingAssignmentService.publishDraftSchedule({
    notes: "Publicacao persistente da grade oficial de demonstracao.",
    publishedByUserId: demoAdmin.id,
  });

  const draftAssignmentA = await teachingAssignmentService.upsertAssignment({
    classSectionId: sectionA.id,
    subjectId: matematica.id,
    teacherId: teacherC.id,
    weeklySlotTarget: 2,
    notes: "Lacuna proposital para demonstracao de intervencao administrativa.",
    createdByUserId: demoAdmin.id,
  });
  const draftAssignmentB = await teachingAssignmentService.upsertAssignment({
    classSectionId: sectionB.id,
    subjectId: matematica.id,
    teacherId: teacherC.id,
    weeklySlotTarget: 2,
    notes: "Competicao de horario com a outra turma para evidenciar conflito de professor/local.",
    createdByUserId: demoAdmin.id,
  });
  const draftAssignmentC = await teachingAssignmentService.upsertAssignment({
    classSectionId: sectionA.id,
    subjectId: logica.id,
    teacherId: teacherA.id,
    weeklySlotTarget: 1,
    notes: "Rascunho em disputa com Matematica na mesma turma.",
    createdByUserId: demoAdmin.id,
  });

  await teachingAssignmentService.createScheduleEntry({
    assignmentId: draftAssignmentA.id,
    weekday: "friday",
    timeSlotId: firstSlot.id,
    spanSlots: 1,
    locationId: roomA.id,
    createdByUserId: demoAdmin.id,
  });
  await teachingAssignmentService.createScheduleEntry({
    assignmentId: draftAssignmentB.id,
    weekday: "friday",
    timeSlotId: firstSlot.id,
    spanSlots: 1,
    locationId: roomA.id,
    createdByUserId: demoAdmin.id,
  });
  await teachingAssignmentService.createScheduleEntry({
    assignmentId: draftAssignmentC.id,
    weekday: "friday",
    timeSlotId: firstSlot.id,
    spanSlots: 1,
    locationId: roomB.id,
    createdByUserId: demoAdmin.id,
  });

  const latestRun = await teachingAssignmentService.validateDraftSchedule(demoAdmin.id);

  return {
    activeTerm: {
      id: term.id,
      code: term.code,
      name: term.name,
    },
    course: {
      id: course.id,
      code: course.code,
      name: course.name,
    },
    classSections: [
      { id: sectionA.id, code: sectionA.code, name: sectionA.name },
      { id: sectionB.id, code: sectionB.code, name: sectionB.name },
    ],
    users: {
      admin: { email: demoUsers.admin.email, password: demoUsers.admin.password },
      teachers: [
        { name: demoUsers.teacherA.name, email: demoUsers.teacherA.email, password: demoUsers.teacherA.password },
        { name: demoUsers.teacherB.name, email: demoUsers.teacherB.email, password: demoUsers.teacherB.password },
        { name: demoUsers.teacherC.name, email: demoUsers.teacherC.email, password: demoUsers.teacherC.password },
      ],
    },
    summary: {
      publishedSlots: 8,
      draftConflictCount: latestRun.hardConflictCount,
      draftObservationCount: latestRun.softConflictCount,
      route: "/teaching-assignment",
    },
  };
}
