import { and, asc, eq, inArray } from "drizzle-orm";
import { hashPassword } from "./auth";
import { db } from "./db";
import { seedTeachingAssignmentDemo } from "./teaching-assignment-demo-seed";
import { teachingAssignmentService } from "./teaching-assignment";
import { teacherSubjectCompatibilityService } from "./teacher-subject-compatibility";
import {
  academicTerms,
  classSections,
  competencyTags,
  courses,
  enrollments,
  subjects,
  teacherAcademicDegrees,
  teacherCompetencies,
  teacherProfessionalExperienceCompetencies,
  teacherProfessionalExperiences,
  teacherSubjectHistory,
  teacherSubjectMatchScores,
  users,
} from "@shared/schema";

const DEMO_TERM_CODE = "DEMO-TA-2026-1";
const DEMO_COURSE_CODE = "DEMO-CC-OPERACIONAL";

type FixedUserSeed = {
  role: "admin" | "teacher" | "student";
  name: string;
  email: string;
  username: string;
  ra: string;
  cpf: string;
  phone: string;
  password: string;
};

type FixtureBlueprint = {
  degreeLevel: "bachelor" | "specialization" | "master" | "doctorate";
  courseName: string;
  institution: string;
  area: string;
  subarea: string;
  competencyKeys: string[];
  historySubjectCode: string;
  historySectionCode: "DEMO-CC-1A" | "DEMO-CC-1B";
  historyTaughtAt: string;
  experience?: {
    companyName: string;
    roleName: string;
    description: string;
    area: string;
    subarea: string;
    startsAt: string;
    endsAt?: string;
    isCurrent: boolean;
    competencyKeys: string[];
  };
  profile: {
    careerTrack: string;
    priorityOrder: number;
    weeklyLoadTargetHours: number;
    notes: string;
  };
};

const primaryUsers = {
  admin: {
    role: "admin",
    name: "Administrador do Sistema",
    email: "admin@academic.local",
    username: "admin",
    ra: "26548998",
    cpf: "10000000001",
    phone: "11900000001",
    password: "Admin@12345",
  } satisfies FixedUserSeed,
  teacher: {
    role: "teacher",
    name: "Professor de Teste",
    email: "professor@academic.local",
    username: "professor",
    ra: "26560877",
    cpf: "11000000099",
    phone: "11910000099",
    password: "Professor@123",
  } satisfies FixedUserSeed,
  student: {
    role: "student",
    name: "Aluno de Teste",
    email: "aluno@academic.local",
    username: "aluno",
    ra: "26711596",
    cpf: "21000000099",
    phone: "11920000099",
    password: "Aluno@12345",
  } satisfies FixedUserSeed,
};

const teacherFixtureTargets: Array<{ email: string; blueprint: FixtureBlueprint }> = [
  {
    email: primaryUsers.teacher.email,
    blueprint: {
      degreeLevel: "master",
      courseName: "Ciencia da Computacao",
      institution: "Universidade Demo",
      area: "Computacao",
      subarea: "Algoritmos",
      competencyKeys: ["demo-tag-algoritmos", "demo-tag-logica", "demo-tag-matematica"],
      historySubjectCode: "DEMO-SUB-ALG",
      historySectionCode: "DEMO-CC-1A",
      historyTaughtAt: "2025-06-01T00:00:00.000Z",
      profile: {
        careerTrack: "Magisterio Superior A",
        priorityOrder: 1,
        weeklyLoadTargetHours: 4,
        notes: "Perfil docente de teste com alta aderencia em algoritmos, logica e fundamentos.",
      },
    },
  },
  {
    email: "rafael.torres@academic.local",
    blueprint: {
      degreeLevel: "master",
      courseName: "Ciencia da Computacao",
      institution: "Universidade Demo",
      area: "Computacao",
      subarea: "Algoritmos",
      competencyKeys: ["demo-tag-algoritmos", "demo-tag-logica", "demo-tag-matematica"],
      historySubjectCode: "DEMO-SUB-LOG",
      historySectionCode: "DEMO-CC-1A",
      historyTaughtAt: "2025-07-01T00:00:00.000Z",
      profile: {
        careerTrack: "Magisterio Superior A",
        priorityOrder: 2,
        weeklyLoadTargetHours: 4,
        notes: "Perfil focado em fundamentos, algoritmos e conteudos introdutorios.",
      },
    },
  },
  {
    email: "camila.nogueira@academic.local",
    blueprint: {
      degreeLevel: "master",
      courseName: "Engenharia de Dados",
      institution: "Instituto Demo de Dados",
      area: "Computacao",
      subarea: "Banco de Dados",
      competencyKeys: ["demo-tag-dados", "demo-tag-arquitetura", "demo-tag-laboratorio"],
      historySubjectCode: "DEMO-SUB-BD1",
      historySectionCode: "DEMO-CC-1B",
      historyTaughtAt: "2025-08-01T00:00:00.000Z",
      experience: {
        companyName: "Laboratorio Demo de Dados",
        roleName: "Arquiteta de Dados",
        description: "Experiencia aplicada com dados, infraestrutura e ambientes de laboratorio.",
        area: "Computacao",
        subarea: "Banco de Dados",
        startsAt: "2021-01-01T00:00:00.000Z",
        isCurrent: true,
        competencyKeys: ["demo-tag-dados", "demo-tag-laboratorio"],
      },
      profile: {
        careerTrack: "Magisterio Superior B",
        priorityOrder: 3,
        weeklyLoadTargetHours: 4,
        notes: "Perfil focado em banco de dados, laboratorios e infraestrutura.",
      },
    },
  },
  {
    email: "marina.souza@academic.local",
    blueprint: {
      degreeLevel: "specialization",
      courseName: "Matematica Aplicada a Computacao",
      institution: "Centro Demo de Tecnologia",
      area: "Computacao",
      subarea: "Matematica",
      competencyKeys: ["demo-tag-matematica", "demo-tag-logica", "demo-tag-algoritmos"],
      historySubjectCode: "DEMO-SUB-MAT",
      historySectionCode: "DEMO-CC-1B",
      historyTaughtAt: "2025-05-15T00:00:00.000Z",
      experience: {
        companyName: "Centro Demo de Matematica Aplicada",
        roleName: "Consultora Academica",
        description: "Experiencia com disciplinas discretas e apoio metodologico.",
        area: "Computacao",
        subarea: "Matematica",
        startsAt: "2020-01-01T00:00:00.000Z",
        isCurrent: true,
        competencyKeys: ["demo-tag-matematica", "demo-tag-logica"],
      },
      profile: {
        careerTrack: "Professor Auxiliar",
        priorityOrder: 4,
        weeklyLoadTargetHours: 4,
        notes: "Perfil de apoio em matematica discreta, logica e disciplinas de base.",
      },
    },
  },
];

async function upsertFixedUser(seed: FixedUserSeed) {
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

async function ensureTeachingAssignmentDemoScenario() {
  const [term, course, teacherA] = await Promise.all([
    db.select().from(academicTerms).where(eq(academicTerms.code, DEMO_TERM_CODE)).then((rows) => rows[0]),
    db.select().from(courses).where(eq(courses.code, DEMO_COURSE_CODE)).then((rows) => rows[0]),
    db.select().from(users).where(eq(users.email, "demo.alice.andrade@academic.local")).then((rows) => rows[0]),
  ]);

  if (term?.isActive && course && teacherA) {
    return;
  }

  await seedTeachingAssignmentDemo();
}

async function ensureStudentEnrollment(studentId: number) {
  const [preferredCourse] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.name, "Ciencia da Computacao"))
    .orderBy(asc(courses.id));
  const [fallbackCourse] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.code, DEMO_COURSE_CODE))
    .orderBy(asc(courses.id));

  const courseId = preferredCourse?.id ?? fallbackCourse?.id;
  if (!courseId) {
    return;
  }

  const [section] = await db
    .select({
      id: classSections.id,
      academicTermId: classSections.academicTermId,
    })
    .from(classSections)
    .where(eq(classSections.courseId, courseId))
    .orderBy(asc(classSections.id));

  if (!section) {
    return;
  }

  await db
    .insert(enrollments)
    .values({
      studentId,
      courseId,
      classSectionId: section.id,
      academicTermId: section.academicTermId,
      status: "active",
      grade: 8.5,
      attendance: 94,
    })
    .onConflictDoUpdate({
      target: [enrollments.studentId, enrollments.courseId, enrollments.academicTermId],
      set: {
        classSectionId: section.id,
        status: "active",
        grade: 8.5,
        attendance: 94,
      },
    });
}

async function getFixtureContext() {
  const [term, sections, fixtureSubjects, tags, allSubjects] = await Promise.all([
    db.select().from(academicTerms).where(eq(academicTerms.code, DEMO_TERM_CODE)).then((rows) => rows[0]),
    db
      .select({
        id: classSections.id,
        code: classSections.code,
      })
      .from(classSections)
      .where(inArray(classSections.code, ["DEMO-CC-1A", "DEMO-CC-1B"])),
    db
      .select({
        id: subjects.id,
        code: subjects.code,
      })
      .from(subjects)
      .where(inArray(subjects.code, ["DEMO-SUB-ALG", "DEMO-SUB-LOG", "DEMO-SUB-BD1", "DEMO-SUB-MAT"])),
    db
      .select({
        id: competencyTags.id,
        key: competencyTags.key,
      })
      .from(competencyTags)
      .where(
        inArray(competencyTags.key, [
          "demo-tag-algoritmos",
          "demo-tag-logica",
          "demo-tag-dados",
          "demo-tag-arquitetura",
          "demo-tag-matematica",
          "demo-tag-laboratorio",
        ]),
      ),
    db.select({ id: subjects.id }).from(subjects),
  ]);

  if (!term) {
    throw new Error("Periodo letivo demonstrativo da atribuicao nao encontrado.");
  }

  return {
    term,
    sectionByCode: new Map(sections.map((section) => [section.code, section])),
    subjectByCode: new Map(fixtureSubjects.map((subject) => [subject.code, subject])),
    tagByKey: new Map(tags.map((tag) => [tag.key, tag])),
    allSubjects,
  };
}

async function applyTeacherFixture(
  teacherId: number,
  blueprint: FixtureBlueprint,
  context: Awaited<ReturnType<typeof getFixtureContext>>,
) {
  const experienceRows = await db
    .select({ id: teacherProfessionalExperiences.id })
    .from(teacherProfessionalExperiences)
    .where(eq(teacherProfessionalExperiences.teacherId, teacherId));

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

  await db.delete(teacherSubjectMatchScores).where(eq(teacherSubjectMatchScores.teacherId, teacherId));
  await db.delete(teacherSubjectHistory).where(eq(teacherSubjectHistory.teacherId, teacherId));
  await db.delete(teacherAcademicDegrees).where(eq(teacherAcademicDegrees.teacherId, teacherId));
  await db.delete(teacherCompetencies).where(eq(teacherCompetencies.teacherId, teacherId));
  await db.delete(teacherProfessionalExperiences).where(eq(teacherProfessionalExperiences.teacherId, teacherId));

  await db.insert(teacherAcademicDegrees).values({
    teacherId,
    degreeLevel: blueprint.degreeLevel,
    courseName: blueprint.courseName,
    institution: blueprint.institution,
    area: blueprint.area,
    subarea: blueprint.subarea,
    completedAt: new Date("2024-12-01T00:00:00.000Z"),
  });

  await db.insert(teacherCompetencies).values(
    blueprint.competencyKeys
      .map((key, index) => {
        const tag = context.tagByKey.get(key);
        if (!tag) return null;
        return {
          teacherId,
          tagId: tag.id,
          weight: Math.max(3, 5 - index),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
  );

  if (blueprint.experience) {
    const [experience] = await db
      .insert(teacherProfessionalExperiences)
      .values({
        teacherId,
        companyName: blueprint.experience.companyName,
        roleName: blueprint.experience.roleName,
        description: blueprint.experience.description,
        area: blueprint.experience.area,
        subarea: blueprint.experience.subarea,
        startsAt: new Date(blueprint.experience.startsAt),
        endsAt: blueprint.experience.endsAt ? new Date(blueprint.experience.endsAt) : null,
        isCurrent: blueprint.experience.isCurrent,
      })
      .returning();

    const experienceCompetencies = blueprint.experience.competencyKeys
      .map((key) => {
        const tag = context.tagByKey.get(key);
        if (!tag) return null;
        return {
          experienceId: experience.id,
          tagId: tag.id,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (experienceCompetencies.length > 0) {
      await db.insert(teacherProfessionalExperienceCompetencies).values(experienceCompetencies);
    }
  }

  const historySubject = context.subjectByCode.get(blueprint.historySubjectCode);
  const historySection = context.sectionByCode.get(blueprint.historySectionCode);

  if (historySubject && historySection) {
    await db.insert(teacherSubjectHistory).values({
      teacherId,
      subjectId: historySubject.id,
      academicTermId: context.term.id,
      classSectionId: historySection.id,
      taughtAt: new Date(blueprint.historyTaughtAt),
    });
  }

  await teachingAssignmentService.upsertTeacherAssignmentProfile({
    teacherId,
    careerTrack: blueprint.profile.careerTrack,
    priorityOrder: blueprint.profile.priorityOrder,
    weeklyLoadTargetHours: blueprint.profile.weeklyLoadTargetHours,
    notes: blueprint.profile.notes,
  });

  for (const subject of context.allSubjects) {
    await teacherSubjectCompatibilityService.calculateForPair({
      teacherId,
      subjectId: subject.id,
      persist: true,
    });
  }
}

export async function ensureReproducibleSeedSupport() {
  const [adminUser, teacherUser, studentUser] = await Promise.all([
    upsertFixedUser(primaryUsers.admin),
    upsertFixedUser(primaryUsers.teacher),
    upsertFixedUser(primaryUsers.student),
  ]);

  await ensureTeachingAssignmentDemoScenario();
  await ensureStudentEnrollment(studentUser.id);

  const context = await getFixtureContext();
  const targetEmails = teacherFixtureTargets.map((target) => target.email);
  const targetTeachers = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(and(eq(users.role, "teacher"), inArray(users.email, targetEmails)));

  for (const target of teacherFixtureTargets) {
    const teacher = targetTeachers.find((row) => row.email === target.email);
    if (!teacher) continue;

    const workspace = await teachingAssignmentService.getTeacherWorkspace(teacher.id);
    if (workspace.eligibleSubjects.length > 0) {
      continue;
    }

    await applyTeacherFixture(teacher.id, target.blueprint, context);
  }

  return {
    primaryUsers: {
      admin: { email: adminUser.email, ra: adminUser.ra },
      teacher: { email: teacherUser.email, ra: teacherUser.ra },
      student: { email: studentUser.email, ra: studentUser.ra },
    },
  };
}
