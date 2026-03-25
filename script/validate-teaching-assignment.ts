import "dotenv/config";
import { and, eq, inArray, like } from "drizzle-orm";
import { hashPassword } from "../server/auth";
import { db, pool } from "../server/db";
import { storage } from "../server/storage";
import { teachingAssignmentService } from "../server/teaching-assignment";
import {
  academicTerms,
  attendanceEntries,
  classScheduleEntries,
  classSectionSubjectAssignments,
  classSectionTeachers,
  classSections,
  classSlotConflicts,
  competencyTags,
  courseMaterials,
  courseSubjects,
  courses,
  enrollments,
  gradeEntries,
  locationCategories,
  locations,
  scheduleGenerationRuns,
  schedulePublications,
  subjectCompetencies,
  subjects,
  teacherAcademicDegrees,
  teacherAssignmentProfiles,
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
  type User,
} from "../shared/schema";

const namespace = (process.env.TEACHING_ASSIGNMENT_TEST_NAMESPACE ?? `ta-${Date.now()}`).toLowerCase();
const namespaceToken = namespace.replace(/[^a-z0-9]+/g, "-");
const dbUrl = process.env.DATABASE_URL ?? "";

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function pass(message: string) {
  console.log(`[PASS] ${message}`);
}

function info(message: string) {
  console.log(`[INFO] ${message}`);
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectFailure(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pass(`${label}: ${message}`);
    return message;
  }

  throw new Error(`${label}: a operacao deveria falhar`);
}

function makeDigits(seed: number, length: number) {
  return String(seed).padStart(length, "0").slice(-length);
}

function prefixed(value: string) {
  return `${namespaceToken}-${value}`;
}

async function cleanupNamespace() {
  const subjectRows = await db.select({ id: subjects.id }).from(subjects).where(like(subjects.code, `${namespaceToken}%`));
  const courseRows = await db.select({ id: courses.id }).from(courses).where(like(courses.code, `${namespaceToken}%`));
  const userRows = await db.select({ id: users.id }).from(users).where(like(users.email, `%${namespaceToken}%`));
  const termRows = await db.select({ id: academicTerms.id }).from(academicTerms).where(like(academicTerms.code, `${namespaceToken}%`));
  const categoryRows = await db.select({ id: locationCategories.id }).from(locationCategories).where(like(locationCategories.name, `%${namespaceToken}%`));
  const submissionRows =
    userRows.length > 0
      ? await db
          .select({ id: teacherPreferenceSubmissions.id })
          .from(teacherPreferenceSubmissions)
          .where(inArray(teacherPreferenceSubmissions.teacherId, userRows.map((row) => row.id)))
      : [];
  const experienceRows =
    userRows.length > 0
      ? await db
          .select({ id: teacherProfessionalExperiences.id })
          .from(teacherProfessionalExperiences)
          .where(inArray(teacherProfessionalExperiences.teacherId, userRows.map((row) => row.id)))
      : [];
  const runRows =
    termRows.length > 0
      ? await db
          .select({ id: scheduleGenerationRuns.id })
          .from(scheduleGenerationRuns)
          .where(inArray(scheduleGenerationRuns.academicTermId, termRows.map((row) => row.id)))
      : [];

  if (runRows.length > 0) {
    await db.delete(classSlotConflicts).where(inArray(classSlotConflicts.generationRunId, runRows.map((row) => row.id)));
  }

  if (submissionRows.length > 0) {
    await db.delete(teacherPreferenceSubjects).where(inArray(teacherPreferenceSubjects.submissionId, submissionRows.map((row) => row.id)));
    await db
      .delete(teacherPreferenceClassSections)
      .where(inArray(teacherPreferenceClassSections.submissionId, submissionRows.map((row) => row.id)));
  }

  if (experienceRows.length > 0) {
    await db
      .delete(teacherProfessionalExperienceCompetencies)
      .where(
        inArray(
          teacherProfessionalExperienceCompetencies.experienceId,
          experienceRows.map((row) => row.id),
        ),
      );
  }

  if (termRows.length > 0) {
    await db.delete(schedulePublications).where(inArray(schedulePublications.academicTermId, termRows.map((row) => row.id)));
    await db.delete(scheduleGenerationRuns).where(inArray(scheduleGenerationRuns.academicTermId, termRows.map((row) => row.id)));
  }

  if (userRows.length > 0) {
    await db.delete(teacherAvailabilitySlots).where(inArray(teacherAvailabilitySlots.teacherId, userRows.map((row) => row.id)));
    await db.delete(teacherAssignmentProfiles).where(inArray(teacherAssignmentProfiles.teacherId, userRows.map((row) => row.id)));
    await db.delete(teacherAcademicDegrees).where(inArray(teacherAcademicDegrees.teacherId, userRows.map((row) => row.id)));
    await db.delete(teacherCompetencies).where(inArray(teacherCompetencies.teacherId, userRows.map((row) => row.id)));
    await db.delete(teacherProfessionalExperiences).where(inArray(teacherProfessionalExperiences.teacherId, userRows.map((row) => row.id)));
    await db.delete(teacherSubjectHistory).where(inArray(teacherSubjectHistory.teacherId, userRows.map((row) => row.id)));
    await db
      .delete(teacherSubjectManualOverrides)
      .where(inArray(teacherSubjectManualOverrides.teacherId, userRows.map((row) => row.id)));
  }

  if (subjectRows.length > 0) {
    await db.delete(subjectCompetencies).where(inArray(subjectCompetencies.subjectId, subjectRows.map((row) => row.id)));
    await db.delete(courseSubjects).where(inArray(courseSubjects.subjectId, subjectRows.map((row) => row.id)));
    await db.delete(teacherSubjectMatchScores).where(inArray(teacherSubjectMatchScores.subjectId, subjectRows.map((row) => row.id)));
  }

  if (courseRows.length > 0) {
    await db.delete(courseMaterials).where(inArray(courseMaterials.courseId, courseRows.map((row) => row.id)));
    await db.delete(enrollments).where(inArray(enrollments.courseId, courseRows.map((row) => row.id)));
    await db.delete(classSections).where(inArray(classSections.courseId, courseRows.map((row) => row.id)));
    await db.delete(courses).where(inArray(courses.id, courseRows.map((row) => row.id)));
  }

  if (categoryRows.length > 0) {
    await db.delete(locations).where(inArray(locations.categoryId, categoryRows.map((row) => row.id)));
    await db.delete(locationCategories).where(inArray(locationCategories.id, categoryRows.map((row) => row.id)));
  }

  if (subjectRows.length > 0) {
    await db.delete(subjects).where(inArray(subjects.id, subjectRows.map((row) => row.id)));
  }

  if (userRows.length > 0) {
    await db.delete(users).where(inArray(users.id, userRows.map((row) => row.id)));
  }

  if (termRows.length > 0) {
    await db.delete(academicTerms).where(inArray(academicTerms.id, termRows.map((row) => row.id)));
  }

  await db.delete(competencyTags).where(like(competencyTags.key, `${namespaceToken}%`));
}

async function createUser(input: {
  role: "admin" | "teacher" | "student";
  name: string;
  email: string;
  username: string;
  ra: string;
  cpf: string;
}) {
  const [user] = await db
    .insert(users)
    .values({
      role: input.role,
      name: input.name,
      email: input.email,
      username: input.username,
      ra: input.ra,
      cpf: input.cpf,
      phone: "11999999999",
      password: await hashPassword("password123"),
      updatedAt: new Date(),
    })
    .returning();

  return user;
}

async function main() {
  if (!dbUrl) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  if (!/test/i.test(dbUrl) && process.env.ALLOW_ASSIGNMENT_TEST_DATABASE !== "true") {
    throw new Error(
      "Recusei executar em banco nao marcado como teste. Use DATABASE_URL de teste ou ALLOW_ASSIGNMENT_TEST_DATABASE=true.",
    );
  }

  section("Preparacao");
  info(`Namespace isolado: ${namespaceToken}`);
  info(`Banco alvo: ${dbUrl.replace(/:[^:@/]+@/, ":***@")}`);

  const previousTerms = await db.select({ id: academicTerms.id, isActive: academicTerms.isActive }).from(academicTerms);

  try {
    await cleanupNamespace();

    await db.update(academicTerms).set({ isActive: false });

    const numericSeed = Number(makeDigits(Date.now(), 9));
    const [term] = await db
      .insert(academicTerms)
      .values({
        code: prefixed("term"),
        name: `Periodo ${prefixed("atribuicao")}`,
        startsAt: new Date("2026-02-01T00:00:00.000Z"),
        endsAt: new Date("2026-06-30T23:59:59.000Z"),
        isActive: true,
      })
      .returning();

    const admin = await createUser({
      role: "admin",
      name: "Admin Teste Atribuicao",
      email: `${namespaceToken}.admin@assignment.test`,
      username: `${namespaceToken}.admin`,
      ra: prefixed("adm"),
      cpf: makeDigits(numericSeed + 1, 11),
    });
    const teacherA = await createUser({
      role: "teacher",
      name: "Professor Teste A",
      email: `${namespaceToken}.teacher.a@assignment.test`,
      username: `${namespaceToken}.teacher.a`,
      ra: prefixed("tea"),
      cpf: makeDigits(numericSeed + 2, 11),
    });
    const teacherB = await createUser({
      role: "teacher",
      name: "Professor Teste B",
      email: `${namespaceToken}.teacher.b@assignment.test`,
      username: `${namespaceToken}.teacher.b`,
      ra: prefixed("teb"),
      cpf: makeDigits(numericSeed + 3, 11),
    });
    const teacherC = await createUser({
      role: "teacher",
      name: "Professor Teste C",
      email: `${namespaceToken}.teacher.c@assignment.test`,
      username: `${namespaceToken}.teacher.c`,
      ra: prefixed("tec"),
      cpf: makeDigits(numericSeed + 4, 11),
    });

    const studentT1A = await createUser({
      role: "student",
      name: "Aluno Teste T1 A",
      email: `${namespaceToken}.student.t1a@assignment.test`,
      username: `${namespaceToken}.student.t1a`,
      ra: prefixed("s1a"),
      cpf: makeDigits(numericSeed + 5, 11),
    });
    const studentT1B = await createUser({
      role: "student",
      name: "Aluno Teste T1 B",
      email: `${namespaceToken}.student.t1b@assignment.test`,
      username: `${namespaceToken}.student.t1b`,
      ra: prefixed("s1b"),
      cpf: makeDigits(numericSeed + 6, 11),
    });
    const studentT2A = await createUser({
      role: "student",
      name: "Aluno Teste T2 A",
      email: `${namespaceToken}.student.t2a@assignment.test`,
      username: `${namespaceToken}.student.t2a`,
      ra: prefixed("s2a"),
      cpf: makeDigits(numericSeed + 7, 11),
    });
    const studentT2B = await createUser({
      role: "student",
      name: "Aluno Teste T2 B",
      email: `${namespaceToken}.student.t2b@assignment.test`,
      username: `${namespaceToken}.student.t2b`,
      ra: prefixed("s2b"),
      cpf: makeDigits(numericSeed + 8, 11),
    });
    pass("Usuarios de teste criados");

    const [course] = await db
      .insert(courses)
      .values({
        code: prefixed("course"),
        name: "Curso Teste Atribuicao",
        description: "Curso sintetico para validacao automatizada da atribuicao de aulas.",
        teacherId: teacherA.id,
        schedule: "Seg a Qui 19:25-23:00",
      })
      .returning();

    const subjectRows = await db
      .insert(subjects)
      .values([
        {
          code: prefixed("sub-x"),
          name: "Materia Teste X",
          description: "Algoritmos avancados",
          area: "Computacao",
          subarea: "Algoritmos",
          workloadHours: 60,
        },
        {
          code: prefixed("sub-y"),
          name: "Materia Teste Y",
          description: "Banco de dados distribuidos",
          area: "Computacao",
          subarea: "Banco de Dados",
          workloadHours: 60,
        },
        {
          code: prefixed("sub-z"),
          name: "Materia Teste Z",
          description: "Redes aplicadas em laboratorio",
          area: "Computacao",
          subarea: "Redes",
          requiredLocationKind: "laboratory",
          requiredEquipment: "computadores",
          workloadHours: 60,
        },
      ])
      .returning();

    await db.insert(courseSubjects).values(
      subjectRows.map((subject, index) => ({
        courseId: course.id,
        subjectId: subject.id,
        semester: String(index + 1),
        isRequired: true,
      })),
    );

    const [sectionT1, sectionT2] = await db
      .insert(classSections)
      .values([
        {
          code: prefixed("t1"),
          name: "Turma T1",
          courseId: course.id,
          academicTermId: term.id,
          scheduleSummary: "Noite",
        },
        {
          code: prefixed("t2"),
          name: "Turma T2",
          courseId: course.id,
          academicTermId: term.id,
          scheduleSummary: "Noite",
        },
      ])
      .returning();

    await db.insert(enrollments).values([
      { studentId: studentT1A.id, courseId: course.id, classSectionId: sectionT1.id, academicTermId: term.id, status: "active" },
      { studentId: studentT1B.id, courseId: course.id, classSectionId: sectionT1.id, academicTermId: term.id, status: "active" },
      { studentId: studentT2A.id, courseId: course.id, classSectionId: sectionT2.id, academicTermId: term.id, status: "active" },
      { studentId: studentT2B.id, courseId: course.id, classSectionId: sectionT2.id, academicTermId: term.id, status: "active" },
    ]);
    pass("Curso, turmas, materias e alunos preparados");

    const [tagAlgo, tagDb, tagNet, tagLab] = await db
      .insert(competencyTags)
      .values([
        { key: prefixed("tag-algo"), label: "Algoritmos", area: "Computacao", subarea: "Algoritmos" },
        { key: prefixed("tag-db"), label: "Banco de Dados", area: "Computacao", subarea: "Banco de Dados" },
        { key: prefixed("tag-net"), label: "Redes", area: "Computacao", subarea: "Redes" },
        { key: prefixed("tag-lab"), label: "Laboratorio", area: "Computacao", subarea: "Infraestrutura" },
      ])
      .returning();

    await db.insert(subjectCompetencies).values([
      { subjectId: subjectRows[0].id, tagId: tagAlgo.id, weight: 5 },
      { subjectId: subjectRows[1].id, tagId: tagDb.id, weight: 5 },
      { subjectId: subjectRows[2].id, tagId: tagNet.id, weight: 4 },
      { subjectId: subjectRows[2].id, tagId: tagLab.id, weight: 3 },
    ]);

    await db.insert(teacherAcademicDegrees).values([
      { teacherId: teacherA.id, degreeLevel: "master", courseName: "Ciencia da Computacao", area: "Computacao", subarea: "Algoritmos" },
      { teacherId: teacherB.id, degreeLevel: "master", courseName: "Engenharia de Dados", area: "Computacao", subarea: "Banco de Dados" },
      { teacherId: teacherC.id, degreeLevel: "bachelor", courseName: "Sistemas de Informacao", area: "Computacao", subarea: "Infraestrutura" },
    ]);

    await db.insert(teacherCompetencies).values([
      { teacherId: teacherA.id, tagId: tagAlgo.id, weight: 5 },
      { teacherId: teacherA.id, tagId: tagDb.id, weight: 4 },
      { teacherId: teacherB.id, tagId: tagDb.id, weight: 5 },
      { teacherId: teacherB.id, tagId: tagNet.id, weight: 5 },
      { teacherId: teacherC.id, tagId: tagNet.id, weight: 2 },
      { teacherId: teacherC.id, tagId: tagLab.id, weight: 2 },
    ]);

    const [experienceB] = await db
      .insert(teacherProfessionalExperiences)
      .values({
        teacherId: teacherB.id,
        companyName: prefixed("empresa-redes"),
        roleName: "Especialista em Infraestrutura",
        area: "Computacao",
        subarea: "Redes",
        isCurrent: true,
      })
      .returning();
    await db.insert(teacherProfessionalExperienceCompetencies).values([
      { experienceId: experienceB.id, tagId: tagNet.id },
      { experienceId: experienceB.id, tagId: tagDb.id },
    ]);
    await db.insert(teacherSubjectHistory).values({
      teacherId: teacherA.id,
      subjectId: subjectRows[0].id,
      academicTermId: term.id,
      classSectionId: sectionT1.id,
    });
    pass("Dados de compatibilidade professor ↔ materia preparados");

    await teachingAssignmentService.upsertTeacherAssignmentProfile({
      teacherId: teacherA.id,
      careerTrack: "Magisterio Superior A",
      priorityOrder: 1,
      weeklyLoadTargetHours: 4,
      notes: "Alta prioridade por senioridade",
    });
    await teachingAssignmentService.upsertTeacherAssignmentProfile({
      teacherId: teacherB.id,
      careerTrack: "Magisterio Superior B",
      priorityOrder: 2,
      weeklyLoadTargetHours: 4,
      notes: "Especialista em dados e redes",
    });
    await teachingAssignmentService.upsertTeacherAssignmentProfile({
      teacherId: teacherC.id,
      careerTrack: "Professor Substituto",
      priorityOrder: 3,
      weeklyLoadTargetHours: 2,
      notes: "Carga parcial",
    });

    const { activeTerm, timeSlots } = await teachingAssignmentService.ensureFoundationalData();
    assertCondition(activeTerm.id === term.id, "A ferramenta nao esta usando o periodo letivo isolado do teste.");
    const slot1 = timeSlots.find((slot) => slot.sequence === 1 && !slot.isBreak);
    const slot4 = timeSlots.find((slot) => slot.sequence === 4 && !slot.isBreak);
    assertCondition(slot1 && slot4, "Blocos fixos de horario nao encontrados.");
    pass("Perfis docentes e blocos fixos carregados");

    const [roomA, roomB] = await teachingAssignmentService.upsertLocationCategory({
      name: prefixed("categoria-sala-grande"),
      kind: "classroom",
      maxCapacity: 40,
      quantity: 2,
      unitPrefix: prefixed("sala"),
      defaultEquipment: "projetor",
    });
    const [labMain] = await teachingAssignmentService.upsertLocationCategory({
      name: prefixed("categoria-lab"),
      kind: "laboratory",
      maxCapacity: 30,
      quantity: 1,
      unitPrefix: prefixed("lab"),
      defaultEquipment: "computadores",
    });
    const [labSmall] = await teachingAssignmentService.upsertLocationCategory({
      name: prefixed("categoria-lab-pequeno"),
      kind: "laboratory",
      maxCapacity: 1,
      quantity: 1,
      unitPrefix: prefixed("lab-pequeno"),
      defaultEquipment: "computadores",
    });
    pass("Locais administrativos criados");

    section("Elegibilidade e preferencias");
    const workspaceA = await teachingAssignmentService.getTeacherWorkspace(teacherA.id);
    const workspaceB = await teachingAssignmentService.getTeacherWorkspace(teacherB.id);
    const workspaceC = await teachingAssignmentService.getTeacherWorkspace(teacherC.id);
    assertCondition(workspaceA.eligibleSubjects.some((item) => item.subjectId === subjectRows[0].id), "Professor A deveria ser elegivel para a materia X.");
    assertCondition(workspaceA.eligibleSubjects.some((item) => item.subjectId === subjectRows[1].id), "Professor A deveria ser elegivel para a materia Y.");
    assertCondition(workspaceB.eligibleSubjects.some((item) => item.subjectId === subjectRows[1].id), "Professor B deveria ser elegivel para a materia Y.");
    assertCondition(workspaceB.eligibleSubjects.some((item) => item.subjectId === subjectRows[2].id), "Professor B deveria ser elegivel para a materia Z.");
    assertCondition(workspaceC.eligibleSubjects.some((item) => item.subjectId === subjectRows[2].id), "Professor C deveria possuir aderencia parcial para a materia Z.");
    pass("Professores carregados com multiplas materias elegiveis");

    const defaultAvailability = timeSlots
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
      notes: "Prefere X na T1 e Y na T2",
      subjectIds: [subjectRows[0].id, subjectRows[1].id],
      sectionPreferences: [
        { subjectId: subjectRows[0].id, classSectionId: sectionT1.id, priority: 1 },
        { subjectId: subjectRows[1].id, classSectionId: sectionT2.id, priority: 2 },
      ],
      availability: defaultAvailability,
    });
    await teachingAssignmentService.upsertTeacherPreferences({
      teacherId: teacherB.id,
      notes: "Prefere Y na T1 e Z na T2",
      subjectIds: [subjectRows[1].id, subjectRows[2].id],
      sectionPreferences: [
        { subjectId: subjectRows[1].id, classSectionId: sectionT1.id, priority: 1 },
        { subjectId: subjectRows[2].id, classSectionId: sectionT2.id, priority: 2 },
      ],
      availability: defaultAvailability,
    });
    await teachingAssignmentService.upsertTeacherPreferences({
      teacherId: teacherC.id,
      notes: "Aceita lacuna em Z com carga parcial",
      subjectIds: [subjectRows[2].id],
      sectionPreferences: [{ subjectId: subjectRows[2].id, classSectionId: sectionT2.id, priority: 1 }],
      availability: defaultAvailability,
    });
    pass("Preferencias de materias e turmas registradas");

    section("Orquestracao administrativa");
    const assignmentT1X = await teachingAssignmentService.upsertAssignment({
      classSectionId: sectionT1.id,
      subjectId: subjectRows[0].id,
      teacherId: teacherA.id,
      weeklySlotTarget: 2,
      coordinatorTeacherId: teacherA.id,
      createdByUserId: admin.id,
    });
    const assignmentT1Y = await teachingAssignmentService.upsertAssignment({
      classSectionId: sectionT1.id,
      subjectId: subjectRows[1].id,
      teacherId: teacherB.id,
      weeklySlotTarget: 2,
      createdByUserId: admin.id,
    });
    const assignmentT2Y = await teachingAssignmentService.upsertAssignment({
      classSectionId: sectionT2.id,
      subjectId: subjectRows[1].id,
      teacherId: teacherA.id,
      weeklySlotTarget: 2,
      createdByUserId: admin.id,
    });
    const assignmentT2Z = await teachingAssignmentService.upsertAssignment({
      classSectionId: sectionT2.id,
      subjectId: subjectRows[2].id,
      teacherId: teacherC.id,
      weeklySlotTarget: 2,
      createdByUserId: admin.id,
    });
    await db.insert(classSectionTeachers).values([
      { classSectionId: sectionT1.id, teacherId: teacherA.id },
      { classSectionId: sectionT1.id, teacherId: teacherB.id },
      { classSectionId: sectionT2.id, teacherId: teacherA.id },
      { classSectionId: sectionT2.id, teacherId: teacherC.id },
    ]);
    pass("Atribuicoes administrativas criadas");

    await teachingAssignmentService.createScheduleEntry({
      assignmentId: assignmentT1X.id,
      weekday: "monday",
      timeSlotId: slot1.id,
      spanSlots: 1,
      locationId: roomA.id,
      createdByUserId: admin.id,
    });
    await expectFailure("Conflito de professor detectado", async () =>
      teachingAssignmentService.createScheduleEntry({
        assignmentId: assignmentT2Y.id,
        weekday: "monday",
        timeSlotId: slot1.id,
        spanSlots: 1,
        locationId: roomB.id,
        createdByUserId: admin.id,
      }),
    );
    await expectFailure("Conflito de turma detectado", async () =>
      teachingAssignmentService.createScheduleEntry({
        assignmentId: assignmentT1Y.id,
        weekday: "monday",
        timeSlotId: slot1.id,
        spanSlots: 1,
        locationId: roomB.id,
        createdByUserId: admin.id,
      }),
    );
    await teachingAssignmentService.createScheduleEntry({
      assignmentId: assignmentT2Y.id,
      weekday: "monday",
      timeSlotId: slot4.id,
      spanSlots: 1,
      locationId: roomA.id,
      createdByUserId: admin.id,
    });
    await expectFailure("Conflito de local detectado", async () =>
      teachingAssignmentService.createScheduleEntry({
        assignmentId: assignmentT1Y.id,
        weekday: "monday",
        timeSlotId: slot4.id,
        spanSlots: 1,
        locationId: roomA.id,
        createdByUserId: admin.id,
      }),
    );

    const capacityValidation = await teachingAssignmentService.validateScheduleEntry({
      assignmentId: assignmentT2Z.id,
      weekday: "tuesday",
      timeSlotId: slot4.id,
      spanSlots: 1,
      locationId: labSmall.id,
    });
    assertCondition(
      capacityValidation.conflicts.some((conflict) => conflict.conflictType === "capacity"),
      "Era esperado conflito de capacidade no laboratorio pequeno.",
    );
    pass("Capacidade de local validada");

    await teachingAssignmentService.createScheduleEntry({
      assignmentId: assignmentT1X.id,
      weekday: "wednesday",
      timeSlotId: slot1.id,
      spanSlots: 1,
      locationId: roomA.id,
      createdByUserId: admin.id,
    });
    await teachingAssignmentService.createScheduleEntry({
      assignmentId: assignmentT1Y.id,
      weekday: "tuesday",
      timeSlotId: slot1.id,
      spanSlots: 1,
      locationId: roomB.id,
      createdByUserId: admin.id,
    });
    await teachingAssignmentService.createScheduleEntry({
      assignmentId: assignmentT1Y.id,
      weekday: "thursday",
      timeSlotId: slot1.id,
      spanSlots: 1,
      locationId: roomB.id,
      createdByUserId: admin.id,
    });
    await teachingAssignmentService.createScheduleEntry({
      assignmentId: assignmentT2Y.id,
      weekday: "wednesday",
      timeSlotId: slot4.id,
      spanSlots: 1,
      locationId: roomA.id,
      createdByUserId: admin.id,
    });
    await teachingAssignmentService.createScheduleEntry({
      assignmentId: assignmentT2Z.id,
      weekday: "tuesday",
      timeSlotId: slot4.id,
      spanSlots: 1,
      locationId: labMain.id,
      createdByUserId: admin.id,
    });
    await teachingAssignmentService.createScheduleEntry({
      assignmentId: assignmentT2Z.id,
      weekday: "thursday",
      timeSlotId: slot4.id,
      spanSlots: 1,
      locationId: labMain.id,
      createdByUserId: admin.id,
    });
    pass("Grade valida montada em rascunho");

    const validationWithoutCoordinator = await teachingAssignmentService.validateDraftSchedule(admin.id);
    assertCondition(
      validationWithoutCoordinator.conflicts.some((conflict) => conflict.conflictType === "coordinator"),
      "Era esperado bloqueio por turma sem coordenador.",
    );
    pass("Bloqueio de coordenador por turma confirmado");

    await teachingAssignmentService.upsertAssignment({
      id: assignmentT2Y.id,
      classSectionId: sectionT2.id,
      subjectId: subjectRows[1].id,
      teacherId: teacherA.id,
      weeklySlotTarget: 2,
      coordinatorTeacherId: teacherB.id,
      createdByUserId: admin.id,
    });
    pass("Coordenador da segunda turma definido");

    const finalValidation = await teachingAssignmentService.validateDraftSchedule(admin.id);
    assertCondition(finalValidation.hardConflictCount === 0, "A grade final ainda possui conflitos hard.");
    assertCondition(finalValidation.softConflictCount === 0, "A grade final ainda possui conflitos soft.");
    pass("Conflitos resolvidos e grade validada");

    await teachingAssignmentService.publishDraftSchedule({
      notes: "Publicacao automatizada do teste de atribuicao",
      publishedByUserId: admin.id,
    });
    pass("Horarios publicados");

    section("Calendario final e permissoes");
    const adminWorkspace = await teachingAssignmentService.getAdminWorkspace();
    assertCondition(Boolean(adminWorkspace.latestPublication), "A publicacao final nao foi persistida.");
    assertCondition(adminWorkspace.publishedEntries.length === 8, "A grade publicada deveria conter 8 slots finais.");
    assertCondition(adminWorkspace.classSections.every((section) => Boolean(section.coordinatorTeacherId)), "Existe turma publicada sem coordenador.");
    pass("Calendario final gerado e coerente");

    const teacherSchedule = await teachingAssignmentService.getScheduleForUser(teacherA);
    const studentSchedule = await teachingAssignmentService.getScheduleForUser(studentT1A);
    assertCondition(teacherSchedule.entries.length === 4, "Professor A deveria receber 4 slots publicados.");
    assertCondition(studentSchedule.entries.length === 4, "Aluno da T1 deveria receber 4 slots publicados.");
    assertCondition(
      studentSchedule.entries.every((entry) => Boolean(entry.subjectName) && Boolean(entry.teacherName) && Boolean(entry.locationName)),
      "O calendario final retornou entrada inconsistente.",
    );
    pass("Integracao com calendario final confirmada");

    assertCondition(
      await teachingAssignmentService.teacherHasOperationalAssignment(teacherA.id, sectionT1.id, subjectRows[0].id),
      "Professor A deveria possuir permissao operacional em T1/X.",
    );
    assertCondition(
      !(await teachingAssignmentService.teacherHasOperationalAssignment(teacherA.id, sectionT1.id, subjectRows[1].id)),
      "Professor A nao deveria possuir permissao operacional em T1/Y.",
    );
    pass("Permissoes operacionais por turma/materia validadas");

    const allowedSheet = await teachingAssignmentService.upsertAcademicRecord({
      requesterId: teacherA.id,
      requesterRole: "teacher",
      classSectionId: sectionT1.id,
      subjectId: subjectRows[0].id,
      studentId: studentT1A.id,
      grade: 9.4,
      absences: 2,
    });
    assertCondition(
      allowedSheet.students.some((student) => student.studentId === studentT1A.id && student.grade === 9.4),
      "Nota oficial nao foi persistida para a atribuicao valida.",
    );
    await expectFailure("Professor sem permissao nao pode lancar diario", async () =>
      teachingAssignmentService.upsertAcademicRecord({
        requesterId: teacherA.id,
        requesterRole: "teacher",
        classSectionId: sectionT1.id,
        subjectId: subjectRows[1].id,
        studentId: studentT1A.id,
        grade: 7.2,
      }),
    );
    pass("Lancamento de notas e faltas protegido pela atribuicao oficial");

    const allowedMaterial = await teachingAssignmentService.createMaterialBatch({
      requesterId: teacherA.id,
      subjectId: subjectRows[0].id,
      classSectionIds: [sectionT1.id],
      file: {
        originalName: "material-x.pdf",
        internalName: prefixed("material-x.pdf"),
        storagePath: `materials/${prefixed("material-x.pdf")}`,
        mimeType: "application/pdf",
        sizeBytes: 1024,
      },
      issuedAt: new Date(),
    });
    const teacherBMaterial = await teachingAssignmentService.createMaterialBatch({
      requesterId: teacherB.id,
      subjectId: subjectRows[1].id,
      classSectionIds: [sectionT1.id],
      file: {
        originalName: "material-y.pdf",
        internalName: prefixed("material-y.pdf"),
        storagePath: `materials/${prefixed("material-y.pdf")}`,
        mimeType: "application/pdf",
        sizeBytes: 1024,
      },
      issuedAt: new Date(),
    });
    await expectFailure("Professor sem atribuicao nao pode enviar material", async () =>
      teachingAssignmentService.createMaterialBatch({
        requesterId: teacherA.id,
        subjectId: subjectRows[1].id,
        classSectionIds: [sectionT1.id],
        file: {
          originalName: "material-bloqueado.pdf",
          internalName: prefixed("material-bloqueado.pdf"),
          storagePath: `materials/${prefixed("material-bloqueado.pdf")}`,
          mimeType: "application/pdf",
          sizeBytes: 1024,
        },
        issuedAt: new Date(),
      }),
    );
    assertCondition(await storage.canUserAccessMaterial(teacherA as User, allowedMaterial[0]), "Professor A deveria acessar o proprio material valido.");
    assertCondition(!(await storage.canUserAccessMaterial(teacherA as User, teacherBMaterial[0])), "Professor A nao deveria acessar material de T1/Y.");
    const teacherAMaterials = await storage.getMaterialsForUser(teacherA as User);
    assertCondition(
      teacherAMaterials.every((material) => material.subjectId === subjectRows[0].id || material.subjectId === subjectRows[1].id),
      "Lista de materiais do professor retornou itens inconsistentes.",
    );
    assertCondition(
      teacherAMaterials.some((material) => material.id === allowedMaterial[0].id) &&
        !teacherAMaterials.some((material) => material.id === teacherBMaterial[0].id),
      "A listagem final de materiais nao respeitou o filtro operacional por materia/turma.",
    );
    pass("Upload e acesso a materiais protegidos pela atribuicao oficial");

    section("Resumo");
    info(`Professores carregados: ${[teacherA, teacherB, teacherC].map((teacher) => teacher.name).join(", ")}`);
    info(`Materias elegiveis identificadas: ${workspaceA.eligibleSubjects.length + workspaceB.eligibleSubjects.length + workspaceC.eligibleSubjects.length}`);
    info("Preferencias registradas: A(X,Y), B(Y,Z), C(Z)");
    info("Conflitos encontrados: professor, turma, local, capacidade, coordenador");
    info("Conflitos resolvidos: coordenacao por turma e grade final sem hard/soft");
    info(`Horarios publicados: ${adminWorkspace.publishedEntries.length}`);
    info(`Calendario final aluno T1: ${studentSchedule.entries.map((entry) => `${entry.weekday}/${entry.subjectName}`).join(", ")}`);
    pass("Ferramenta de atribuicao de aulas validada ponta a ponta via servicos reais");
  } finally {
    await cleanupNamespace();
    await db.update(academicTerms).set({ isActive: false });
    for (const term of previousTerms) {
      await db.update(academicTerms).set({ isActive: term.isActive }).where(eq(academicTerms.id, term.id));
    }
    await pool.end();
  }
}

main()
  .then(() => {
    console.log("\nTeste finalizado com sucesso.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nTeste finalizado com falha.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
