import { and, asc, count, desc, eq, gt, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";
import {
  academicTerms,
  announcementCourses,
  announcementTargets,
  announcements,
  approvedSubjectRecords,
  blockedDevices,
  classSectionTeachers,
  classSectionSubjectTeachers,
  classSections,
  courseMaterials,
  courseSubjects,
  courses,
  enrollmentStatusHistory,
  enrollments,
  lessonLocations,
  lessonRecordAttendance,
  lessonRecords,
  lessonRecordSlots,
  lessonScheduleBlocks,
  lessonScheduleDrafts,
  lessonSchedules,
  lessonScheduleSlots,
  notificationRecipients,
  notifications,
  passwordResetRequests,
  subjects,
  userPinnedMaterials,
  users,
  type AcademicTerm,
  type AnnouncementResponse,
  type ClassSection,
  type CourseMaterial,
  type CourseMaterialResponse,
  type Course,
  type CourseResponse,
  type Enrollment,
  type EnrollmentResponse,
  type InsertAnnouncement,
  type InsertCourseMaterial,
  type InsertCourse,
  type InsertClassSection,
  type InsertClassSectionSubjectTeacher,
  type InsertEnrollment,
  type InsertLessonLocation,
  type InsertNotification,
  type InsertNotificationRecipient,
  type InsertPasswordResetRequest,
  type InsertSubject,
  type InsertUser,
  type LessonLocationResponse,
  type LessonScheduleDraft,
  type LessonScheduleDraftPayload,
  type LessonScheduleResponse,
  type LessonScheduleSaveBlockInput,
  type LessonScheduleSaveSlotInput,
  type StudentScheduleResponse,
  type TeacherScheduleResponse,
  type Notification,
  type PasswordResetRequest,
  type StudentListResponse,
  type StudentScopeResponse,
  type SubjectResponse,
  type User,
} from "@shared/schema";
import type {
  FinanceSummaryResponse,
  FinanceAdminOverviewResponse,
  TeacherLessonsByDateResponse,
  TeacherLessonSaveInput,
  TeacherLessonSaveResponse,
  MyDisciplinesResponse,
} from "@shared/routes";
import { db } from "./db";
import {
  FINANCE_INSTITUTION,
  LATE_FEE_CENTS_PER_DAY,
  generateBoletos,
  summarizeBoletos,
} from "./finance";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function makeCourseCode(name: string) {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((token) => token[0])
    .join("")
    .padEnd(3, "C");
  return `CUR-${base}-${Math.floor(100 + Math.random() * 900)}`;
}

function makeSubjectCode(name: string) {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((token) => token[0])
    .join("")
    .padEnd(3, "M");
  return `MAT-${base}-${Math.floor(100 + Math.random() * 900)}`;
}

function truncate(value: string, max = 140) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

function uniqueNumbers(values: Array<number | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is number => Number.isInteger(value))));
}

const activeAcademicStatuses: Array<Enrollment["status"]> = ["active", "locked"];
type ClassPeriod = ClassSection["period"];
const LESSON_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const LESSON_NUMBERS = [1, 2, 3, 4] as const;
const LESSON_DAY_LABELS_PT: Record<(typeof LESSON_DAYS)[number], string> = {
  monday: "segunda-feira",
  tuesday: "terca-feira",
  wednesday: "quarta-feira",
  thursday: "quinta-feira",
  friday: "sexta-feira",
};

export interface CreateAnnouncementInput extends InsertAnnouncement {
  courseIds?: number[];
  classSectionIds?: number[];
}

export interface LockEnrollmentInput {
  enrollmentId: number;
  changedByUserId: number;
  reason: string;
  approvedSubjectIds?: number[];
}

export interface StudentsFilterInput {
  courseId?: number;
  classSectionId?: number;
  status?: Enrollment["status"];
}

type NotificationRecipientInput = Pick<
  InsertNotificationRecipient,
  "userId" | "courseId" | "classSectionId"
>;

type NotificationListItem = Notification & {
  userId: number;
  courseId: number | null;
  classSectionId: number | null;
  isRead: boolean;
  readAt: Date | null;
  senderName?: string;
};

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByLoginIdentifier(identifier: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(role?: "admin" | "teacher" | "student"): Promise<Array<User & { courseName?: string }>>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  getStudentFinanceSummary(user: User): Promise<FinanceSummaryResponse>;
  getAdminFinanceOverview(): Promise<FinanceAdminOverviewResponse>;

  getCourses(): Promise<CourseResponse[]>;
  getCoursesForUser(user: User): Promise<CourseResponse[]>;
  getCourse(id: number): Promise<CourseResponse | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: number, updates: Partial<InsertCourse>): Promise<Course>;
  ensureDefaultClassSections(): Promise<void>;
  getOrCreateActiveAcademicTerm(): Promise<AcademicTerm>;
  getAcademicTerms(): Promise<AcademicTerm[]>;
  createClassSection(section: InsertClassSection): Promise<ClassSection>;
  assignClassSectionSubjectTeachers(assignments: InsertClassSectionSubjectTeacher[]): Promise<void>;
  getTeacherCourseIds(teacherId: number): Promise<number[]>;
  getTeacherClassSectionIds(teacherId: number): Promise<number[]>;
  getClassSectionsForUser(user: User, courseId?: number): Promise<StudentScopeResponse["classSections"]>;
  updateClassSectionStage(
    sectionId: number,
    newStage: number,
  ): Promise<{
    id: number;
    code: string;
    name: string;
    courseId: number;
    period: ClassPeriod;
    currentStageNumber: number;
  }>;

  getSubjects(): Promise<SubjectResponse[]>;
  createSubject(subject: InsertSubject): Promise<SubjectResponse>;
  getCourseSubjects(
    courseId: number,
    classSectionId?: number,
    currentStageNumber?: number,
    onlyCurrentStage?: boolean,
  ): Promise<SubjectResponse[]>;
  setCourseSubjects(courseId: number, subjectIds: number[], stageNumbers?: Record<string | number, number>): Promise<void>;

  getLessonLocations(): Promise<LessonLocationResponse[]>;
  createLessonLocation(location: InsertLessonLocation): Promise<LessonLocationResponse>;
  updateLessonLocation(id: number, updates: InsertLessonLocation): Promise<LessonLocationResponse>;
  deleteLessonLocation(id: number): Promise<number>;
  getLessonSchedule(classSectionId: number, academicTermId: number): Promise<LessonScheduleResponse | null>;
  saveLessonSchedule(input: {
    classSectionId: number;
    academicTermId: number;
    period: ClassPeriod;
    blocks: LessonScheduleSaveBlockInput[];
    slots: LessonScheduleSaveSlotInput[];
    userId: number;
  }): Promise<LessonScheduleResponse>;
  getLessonScheduleDraft(
    classSectionId: number,
    academicTermId: number,
    userId: number,
  ): Promise<LessonScheduleDraft | null>;
  saveLessonScheduleDraft(input: {
    classSectionId: number;
    academicTermId: number;
    userId: number;
    period: ClassPeriod;
    draftPayload: LessonScheduleDraftPayload;
  }): Promise<LessonScheduleDraft>;
  deleteLessonScheduleDraft(classSectionId: number, academicTermId: number, userId: number): Promise<void>;
  getStudentActiveSchedule(studentId: number): Promise<StudentScheduleResponse>;
  getStudentDisciplines(studentId: number): Promise<MyDisciplinesResponse["studentItems"]>;
  getTeacherDisciplines(teacherId: number): Promise<MyDisciplinesResponse["teacherItems"]>;
  getTeacherActiveSchedule(teacherId: number): Promise<TeacherScheduleResponse>;
  getTeacherLessonsByDate(teacherId: number, date: string): Promise<TeacherLessonsByDateResponse>;
  saveTeacherLessonRecord(teacherId: number, input: TeacherLessonSaveInput): Promise<TeacherLessonSaveResponse>;
  getTeacherClassLoads(): Promise<Array<{ teacherId: number; classCount: number }>>;
  getTeacherBusySlots(
    academicTermId: number,
    period: ClassPeriod,
    excludeClassSectionId?: number,
  ): Promise<
    Array<{
      teacherId: number;
      dayOfWeek: LessonScheduleSaveSlotInput["dayOfWeek"];
      lessonNumber: number;
      classSectionCode: string;
    }>
  >;

  getEnrollments(courseId?: number, studentId?: number, classSectionId?: number): Promise<EnrollmentResponse[]>;
  getEnrollmentById(id: number): Promise<Enrollment | undefined>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  updateEnrollment(
    id: number,
    updates: Partial<InsertEnrollment>,
    changedByUserId?: number,
    reason?: string,
  ): Promise<Enrollment>;
  lockEnrollment(input: LockEnrollmentInput): Promise<{ enrollment: Enrollment; preservedApprovedSubjects: number }>;

  getStudentScope(user: User): Promise<StudentScopeResponse>;
  getStudentsByScope(user: User, filters?: StudentsFilterInput): Promise<StudentListResponse[]>;

  getAnnouncementsForUser(user: User, courseId?: number, classSectionId?: number): Promise<AnnouncementResponse[]>;
  getAnnouncementById(id: number): Promise<AnnouncementResponse | undefined>;
  createAnnouncement(announcement: CreateAnnouncementInput): Promise<AnnouncementResponse>;
  deleteAnnouncement(id: number): Promise<void>;

  getMaterialsForUser(user: User): Promise<CourseMaterialResponse[]>;
  getMaterialById(id: number): Promise<CourseMaterial | undefined>;
  canUserAccessMaterial(user: User, material: CourseMaterial): Promise<boolean>;
  createMaterial(material: InsertCourseMaterial): Promise<CourseMaterial>;
  pinMaterial(userId: number, materialId: number): Promise<void>;
  unpinMaterial(userId: number, materialId: number): Promise<void>;

  getNotificationsForUser(userId: number, unreadOnly?: boolean): Promise<NotificationListItem[]>;
  markNotificationRead(notificationId: number, userId: number): Promise<void>;

  createPasswordResetRequest(payload: InsertPasswordResetRequest): Promise<PasswordResetRequest>;
  getLatestActivePasswordResetRequest(userId: number, deviceHash: string): Promise<PasswordResetRequest | undefined>;
  getPasswordResetById(id: number): Promise<PasswordResetRequest | undefined>;
  incrementPasswordResetAttempts(id: number): Promise<void>;
  markPasswordResetUsed(id: number): Promise<void>;
  cancelPasswordReset(id: number): Promise<void>;

  blockDevice(deviceHash: string, blockedUntil: Date, reason: string): Promise<void>;
  isDeviceBlocked(deviceHash: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  private async appendEnrollmentStatusHistory(
    enrollmentId: number,
    previousStatus: Enrollment["status"] | null,
    nextStatus: Enrollment["status"],
    changedByUserId?: number,
    reason?: string,
  ) {
    await db.insert(enrollmentStatusHistory).values({
      enrollmentId,
      previousStatus,
      nextStatus,
      changedByUserId,
      reason,
    });
  }

  async getOrCreateActiveAcademicTerm(): Promise<AcademicTerm> {
    const [activeTerm] = await db
      .select()
      .from(academicTerms)
      .where(eq(academicTerms.isActive, true))
      .orderBy(desc(academicTerms.startsAt));

    if (activeTerm) return activeTerm;

    const now = new Date();
    const year = now.getFullYear();
    const isFirstSemester = now.getMonth() < 6;
    const code = `${year}.${isFirstSemester ? "1" : "2"}`;

    const [existingWithCode] = await db.select().from(academicTerms).where(eq(academicTerms.code, code));
    if (existingWithCode) return existingWithCode;

    const [created] = await db
      .insert(academicTerms)
      .values({
        code,
        name: `Periodo letivo ${code}`,
        startsAt: isFirstSemester ? new Date(year, 0, 1) : new Date(year, 6, 1),
        endsAt: isFirstSemester ? new Date(year, 5, 30, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59),
        isActive: true,
      })
      .returning();

    return created;
  }

  async getAcademicTerms(): Promise<AcademicTerm[]> {
    return db.select().from(academicTerms).orderBy(desc(academicTerms.startsAt));
  }

  private buildDefaultSectionCode(courseCode: string, termCode: string) {
    const normalizedTerm = termCode.replace(/[^0-9]/g, "");
    return `${courseCode}-${normalizedTerm}-T1`;
  }

  private async ensureDefaultClassSection(course: Course, classPeriod: ClassPeriod = "noturno") {
    const activeTerm = await this.getOrCreateActiveAcademicTerm();
    const defaultCode = this.buildDefaultSectionCode(course.code, activeTerm.code);
    const [existing] = await db
      .select({ id: classSections.id })
      .from(classSections)
      .where(
        or(
          and(eq(classSections.courseId, course.id), eq(classSections.academicTermId, activeTerm.id)),
          eq(classSections.code, defaultCode),
        ),
      );

    if (existing) {
      return;
    }

    await db
      .insert(classSections)
      .values({
        courseId: course.id,
        academicTermId: activeTerm.id,
        code: defaultCode,
        name: "Turma 1",
        currentStageNumber: 1,
        room: null,
        period: classPeriod,
      })
      .onConflictDoNothing();
  }

  async ensureDefaultClassSections(): Promise<void> {
    const allCourses = await db.select().from(courses);
    for (const course of allCourses) {
      await this.ensureDefaultClassSection(course);
    }
  }

  async getTeacherCourseIds(teacherId: number): Promise<number[]> {
    const coordinatedCourses = await db
      .select({ courseId: classSections.courseId })
      .from(classSections)
      .where(eq(classSections.coordinatorTeacherId, teacherId));

    const legacyCoursesBySection = await db
      .select({ courseId: classSections.courseId })
      .from(classSectionTeachers)
      .innerJoin(classSections, eq(classSections.id, classSectionTeachers.classSectionId))
      .where(eq(classSectionTeachers.teacherId, teacherId));

    const coursesBySubject = await db
      .select({ courseId: classSections.courseId })
      .from(classSectionSubjectTeachers)
      .innerJoin(classSections, eq(classSections.id, classSectionSubjectTeachers.classSectionId))
      .where(eq(classSectionSubjectTeachers.teacherId, teacherId));

    return uniqueNumbers([
      ...coordinatedCourses.map((row) => row.courseId),
      ...legacyCoursesBySection.map((row) => row.courseId),
      ...coursesBySubject.map((row) => row.courseId),
    ]);
  }

  async getTeacherClassSectionIds(teacherId: number): Promise<number[]> {
    const coordinatedSections = await db
      .select({ id: classSections.id })
      .from(classSections)
      .where(eq(classSections.coordinatorTeacherId, teacherId));

    const assignedSections = await db
      .select({ id: classSectionTeachers.classSectionId })
      .from(classSectionTeachers)
      .where(eq(classSectionTeachers.teacherId, teacherId));

    const subjectSections = await db
      .select({ id: classSectionSubjectTeachers.classSectionId })
      .from(classSectionSubjectTeachers)
      .where(eq(classSectionSubjectTeachers.teacherId, teacherId));

    return uniqueNumbers([
      ...coordinatedSections.map((row) => row.id),
      ...assignedSections.map((row) => row.id),
      ...subjectSections.map((row) => row.id),
    ]);
  }

  private async getStudentCourseIds(studentId: number): Promise<number[]> {
    const rows = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          inArray(enrollments.status, ["active", "locked", "completed"]),
        ),
      );

    return uniqueNumbers(rows.map((row) => row.courseId));
  }

  private async getStudentClassSectionIds(studentId: number): Promise<number[]> {
    const rows = await db
      .select({ classSectionId: enrollments.classSectionId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          inArray(enrollments.status, ["active", "locked", "completed"]),
          sql`${enrollments.classSectionId} IS NOT NULL`,
        ),
      );

    return uniqueNumbers(rows.map((row) => row.classSectionId));
  }

  private async getAllowedCourseIdsForUser(user: User): Promise<number[]> {
    if (user.role === "admin") {
      const rows = await db.select({ id: courses.id }).from(courses);
      return rows.map((row) => row.id);
    }

    if (user.role === "teacher") {
      return this.getTeacherCourseIds(user.id);
    }

    return this.getStudentCourseIds(user.id);
  }

  private async getAllowedClassSectionIdsForUser(user: User): Promise<number[]> {
    if (user.role === "admin") {
      const rows = await db.select({ id: classSections.id }).from(classSections);
      return rows.map((row) => row.id);
    }

    if (user.role === "teacher") {
      return this.getTeacherClassSectionIds(user.id);
    }

    return this.getStudentClassSectionIds(user.id);
  }

  private canAccessClassSectionForRole(
    user: User,
    classSectionId: number | null,
    allowedSectionIds: Set<number>,
  ): boolean {
    if (!classSectionId) return true;
    if (user.role === "admin") return true;
    if (user.role === "teacher" && allowedSectionIds.size === 0) return true;
    return allowedSectionIds.has(classSectionId);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByLoginIdentifier(identifier: string): Promise<User | undefined> {
    const raw = identifier.trim();
    const cpf = onlyDigits(raw);
    const email = normalizeEmail(raw);

    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.ra, raw),
          eq(users.cpf, cpf),
          eq(users.email, email),
          eq(users.username, raw),
        ),
      );

    return user;
  }

  private async generateUniqueRa(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = `${year}${Math.floor(100000 + Math.random() * 900000)}`;
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.ra, candidate));
      if (!existing) return candidate;
    }

    return `${year}${Date.now().toString().slice(-6)}`;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const payload = {
      ...insertUser,
      ra: await this.generateUniqueRa(),
      cpf: onlyDigits(insertUser.cpf),
      email: normalizeEmail(insertUser.email),
      username:
        insertUser.username ||
        normalizeEmail(insertUser.email)
          .split("@")[0]
          .slice(0, 20),
      updatedAt: new Date(),
    };

    const [user] = await db.insert(users).values(payload as unknown as typeof users.$inferInsert).returning();
    return user;
  }

  async getUsers(role?: "admin" | "teacher" | "student"): Promise<Array<User & { courseName?: string }>> {
    const userRows = role
      ? await db.select().from(users).where(eq(users.role, role))
      : await db.select().from(users);

    const studentIds = userRows.filter((user) => user.role === "student").map((user) => user.id);

    const courseByStudentId = new Map<number, string>();

    if (studentIds.length > 0) {
      const studentCourses = await db
        .select({
          studentId: enrollments.studentId,
          courseName: courses.name,
        })
        .from(enrollments)
        .innerJoin(courses, eq(courses.id, enrollments.courseId))
        .where(and(inArray(enrollments.studentId, studentIds), eq(enrollments.status, "active")));

      for (const row of studentCourses) {
        if (!courseByStudentId.has(row.studentId)) {
          courseByStudentId.set(row.studentId, row.courseName);
        }
      }
    }

    return userRows.map((user) => ({
      ...user,
      courseName: courseByStudentId.get(user.id),
    }));
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    return user;
  }

  async getStudentFinanceSummary(user: User): Promise<FinanceSummaryResponse> {
    // Curso/termo da matricula ativa (quando houver) para compor o boleto.
    const [enrollment] = await db
      .select({ courseName: courses.name, academicTermCode: academicTerms.code })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .leftJoin(academicTerms, eq(academicTerms.id, enrollments.academicTermId))
      .where(and(eq(enrollments.studentId, user.id), eq(enrollments.status, "active")))
      .limit(1);

    const courseName = enrollment?.courseName;
    const boletos = generateBoletos({ studentId: user.id, courseName, today: new Date() });
    const totals = summarizeBoletos(boletos);

    return {
      payer: {
        name: user.name,
        ra: user.ra,
        courseName: courseName ?? null,
        academicTermCode: enrollment?.academicTermCode ?? null,
      },
      institution: FINANCE_INSTITUTION,
      totals,
      boletos,
      lateFeePerDayCents: LATE_FEE_CENTS_PER_DAY,
    };
  }

  async getAdminFinanceOverview(): Promise<FinanceAdminOverviewResponse> {
    const students = await this.getUsers("student");
    const today = new Date();

    const rows = students.map((student) => {
      const boletos = generateBoletos({
        studentId: student.id,
        courseName: student.courseName,
        today,
      });
      const totals = summarizeBoletos(boletos);
      return {
        studentId: student.id,
        name: student.name,
        ra: student.ra,
        courseName: student.courseName ?? null,
        totals,
        boletos,
      };
    });

    let emitidoCents = 0;
    let recebidoCents = 0;
    let emAbertoCents = 0;
    let vencidoCents = 0;
    let multaCents = 0;
    let inadimplentes = 0;

    for (const row of rows) {
      for (const boleto of row.boletos) {
        emitidoCents += boleto.baseCents - boleto.discountCents;
      }
      recebidoCents += row.totals.pagoCents;
      emAbertoCents += row.totals.emAbertoCents;
      vencidoCents += row.totals.vencidoCents;
      multaCents += row.totals.multaCents;
      if (row.totals.situacao === "inadimplente") inadimplentes += 1;
    }

    return {
      institution: FINANCE_INSTITUTION,
      aggregates: {
        studentCount: rows.length,
        emitidoCents,
        recebidoCents,
        emAbertoCents,
        vencidoCents,
        multaCents,
        inadimplentes,
      },
      rows,
    };
  }

  async getCourses(): Promise<CourseResponse[]> {
    const rows = await db
      .select({
        id: courses.id,
        code: courses.code,
        name: courses.name,
        description: courses.description,
        createdAt: courses.createdAt,
        classSectionCount: count(classSections.id),
      })
      .from(courses)
      .leftJoin(classSections, eq(classSections.courseId, courses.id))
      .groupBy(courses.id);

    return rows;
  }

  async getCoursesForUser(user: User): Promise<CourseResponse[]> {
    const allCourses = await this.getCourses();

    if (user.role === "admin") {
      return allCourses;
    }

    const allowedCourseIds = new Set(await this.getAllowedCourseIdsForUser(user));
    return allCourses.filter((course) => allowedCourseIds.has(course.id));
  }

  async getCourse(id: number): Promise<CourseResponse | undefined> {
    const [course] = await db
      .select({
        id: courses.id,
        code: courses.code,
        name: courses.name,
        description: courses.description,
        createdAt: courses.createdAt,
        classSectionCount: count(classSections.id),
      })
      .from(courses)
      .leftJoin(classSections, eq(classSections.courseId, courses.id))
      .where(eq(courses.id, id))
      .groupBy(courses.id);

    if (!course) return undefined;

    const subjectsByCourse = await this.getCourseSubjects(id);
    return {
      ...course,
      subjects: subjectsByCourse,
    };
  }

  private async generateUniqueCourseCode(name: string): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = makeCourseCode(name);
      const [existing] = await db.select({ id: courses.id }).from(courses).where(eq(courses.code, candidate));
      if (!existing) return candidate;
    }

    return `CUR-${Date.now().toString().slice(-6)}`;
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const [course] = await db
      .insert(courses)
      .values({
        ...insertCourse,
        code: await this.generateUniqueCourseCode(insertCourse.name),
      })
      .returning();

    await this.ensureDefaultClassSection(course);
    return course;
  }

  async updateCourse(id: number, updates: Partial<InsertCourse>): Promise<Course> {
    const [course] = await db.update(courses).set(updates).where(eq(courses.id, id)).returning();
    return course;
  }

  async createClassSection(insertSection: InsertClassSection): Promise<ClassSection> {
    const [section] = await db.insert(classSections).values(insertSection).returning();
    if (section.coordinatorTeacherId) {
      await db
        .insert(classSectionTeachers)
        .values({ classSectionId: section.id, teacherId: section.coordinatorTeacherId })
        .onConflictDoNothing();
    }
    return section;
  }

  async assignClassSectionSubjectTeachers(assignments: InsertClassSectionSubjectTeacher[]): Promise<void> {
    if (assignments.length === 0) return;
    await db.insert(classSectionSubjectTeachers).values(assignments).onConflictDoNothing();
  }

  async getClassSectionsForUser(user: User, courseId?: number): Promise<StudentScopeResponse["classSections"]> {
    const rows = await db
      .select({
        id: classSections.id,
        code: classSections.code,
        name: classSections.name,
        courseId: classSections.courseId,
        academicTermId: classSections.academicTermId,
        academicTermCode: academicTerms.code,
        period: classSections.period,
        currentStageNumber: classSections.currentStageNumber,
        coordinatorTeacherId: classSections.coordinatorTeacherId,
        coordinatorTeacherName: users.name,
      })
      .from(classSections)
      .innerJoin(academicTerms, eq(academicTerms.id, classSections.academicTermId))
      .leftJoin(users, eq(users.id, classSections.coordinatorTeacherId))
      .where(courseId ? eq(classSections.courseId, courseId) : undefined)
      .orderBy(desc(academicTerms.startsAt), classSections.name);

    const normalizedRows = rows.map((row) => ({
      ...row,
      coordinatorTeacherName: row.coordinatorTeacherName ?? undefined,
    }));

    // Busca o numero maximo de etapas de cada curso para limitar o seletor no cliente.
    const uniqueCourseIds = Array.from(new Set(normalizedRows.map((r) => r.courseId)));
    const maxStageMap = new Map<number, number>();
    if (uniqueCourseIds.length > 0) {
      const maxStageRows = await db
        .select({
          courseId: courseSubjects.courseId,
          maxStage: sql<number>`coalesce(max(${courseSubjects.stageNumber}), 0)`,
        })
        .from(courseSubjects)
        .where(inArray(courseSubjects.courseId, uniqueCourseIds))
        .groupBy(courseSubjects.courseId);
      for (const r of maxStageRows) {
        maxStageMap.set(r.courseId, Number(r.maxStage));
      }
    }

    const withMaxStage = normalizedRows.map((row) => ({
      ...row,
      courseMaxStage: maxStageMap.get(row.courseId) ?? 0,
    }));

    if (user.role === "admin") return withMaxStage;

    const allowedCourseIds = new Set(await this.getAllowedCourseIdsForUser(user));
    const allowedSectionIds = new Set(await this.getAllowedClassSectionIdsForUser(user));

    return withMaxStage.filter(
      (row) => allowedCourseIds.has(row.courseId) && (allowedSectionIds.size === 0 || allowedSectionIds.has(row.id)),
    );
  }

  async updateClassSectionStage(
    sectionId: number,
    newStage: number,
  ): Promise<{
    id: number;
    code: string;
    name: string;
    courseId: number;
    period: ClassPeriod;
    currentStageNumber: number;
  }> {
    if (!Number.isInteger(newStage) || newStage < 1) {
      throw new Error("Etapa invalida: informe um numero inteiro maior ou igual a 1");
    }

    const [section] = await db
      .select({ id: classSections.id, courseId: classSections.courseId, currentStageNumber: classSections.currentStageNumber })
      .from(classSections)
      .where(eq(classSections.id, sectionId));
    if (!section) throw new Error("Turma nao encontrada");

    const [{ maxStage }] = await db
      .select({ maxStage: sql<number>`coalesce(max(${courseSubjects.stageNumber}), 0)` })
      .from(courseSubjects)
      .where(eq(courseSubjects.courseId, section.courseId));

    if (maxStage > 0 && newStage > maxStage) {
      throw new Error(
        `Etapa invalida: a matriz do curso possui ${maxStage} etapa(s). Ajuste a matriz curricular antes de avancar para a ${newStage}a etapa.`,
      );
    }

    const oldStage = section.currentStageNumber;

    const [updated] = await db
      .update(classSections)
      .set({ currentStageNumber: newStage })
      .where(eq(classSections.id, sectionId))
      .returning({
        id: classSections.id,
        code: classSections.code,
        name: classSections.name,
        courseId: classSections.courseId,
        period: classSections.period,
        currentStageNumber: classSections.currentStageNumber,
      });

    // Ao avançar de etapa, grava aprovacoes automaticas para alunos com nota >= 6.
    // Alunos com nota < 6 nao recebem registro de aprovacao e permanecem como Reprovado
    // nas disciplinas da etapa anterior.
    if (newStage > oldStage) {
      const stageSubjectRows = await db
        .select({ subjectId: courseSubjects.subjectId })
        .from(courseSubjects)
        .where(and(eq(courseSubjects.courseId, section.courseId), eq(courseSubjects.stageNumber, oldStage)));

      if (stageSubjectRows.length > 0) {
        const stageSubjectIds = stageSubjectRows.map((r) => r.subjectId);

        const passingEnrollments = await db
          .select({
            id: enrollments.id,
            studentId: enrollments.studentId,
            courseId: enrollments.courseId,
            grade: enrollments.grade,
          })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.classSectionId, sectionId),
              inArray(enrollments.status, ["active", "locked"]),
              gte(enrollments.grade, 6),
            ),
          );

        for (const enrollment of passingEnrollments) {
          const existing = await db
            .select({ subjectId: approvedSubjectRecords.subjectId })
            .from(approvedSubjectRecords)
            .where(
              and(
                eq(approvedSubjectRecords.enrollmentId, enrollment.id),
                inArray(approvedSubjectRecords.subjectId, stageSubjectIds),
              ),
            );

          const existingIds = new Set(existing.map((r) => r.subjectId));
          const toInsert = stageSubjectIds.filter((sid) => !existingIds.has(sid));

          if (toInsert.length > 0) {
            const batchId = `stage-advance-${sectionId}-${oldStage}`;
            await db.insert(approvedSubjectRecords).values(
              toInsert.map((subjectId) => ({
                enrollmentId: enrollment.id,
                studentId: enrollment.studentId,
                courseId: enrollment.courseId,
                subjectId,
                approvedGrade: enrollment.grade,
                source: "lock_snapshot" as const,
                snapshotBatchId: batchId,
              })),
            );
          }
        }
      }
    }

    return updated;
  }

  async getSubjects(): Promise<SubjectResponse[]> {
    return db.select().from(subjects).orderBy(subjects.name);
  }

  private async generateUniqueSubjectCode(name: string): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = makeSubjectCode(name);
      const [existing] = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.code, candidate));
      if (!existing) return candidate;
    }

    return `MAT-${Date.now().toString().slice(-6)}`;
  }

  async createSubject(insertSubject: InsertSubject): Promise<SubjectResponse> {
    const [subject] = await db
      .insert(subjects)
      .values({
        ...insertSubject,
        code: await this.generateUniqueSubjectCode(insertSubject.name),
      })
      .returning();

    return subject;
  }

  async getCourseSubjects(
    courseId: number,
    classSectionId?: number,
    currentStageNumber?: number,
    onlyCurrentStage = false,
    studentId?: number,
  ): Promise<SubjectResponse[]> {
    const allRows = await db
      .select({
        id: subjects.id,
        code: subjects.code,
        name: subjects.name,
        description: subjects.description,
        workloadHours: subjects.workloadHours,
        createdAt: subjects.createdAt,
        stageNumber: courseSubjects.stageNumber,
      })
      .from(courseSubjects)
      .innerJoin(subjects, eq(subjects.id, courseSubjects.subjectId))
      .where(eq(courseSubjects.courseId, courseId))
      .orderBy(courseSubjects.stageNumber, subjects.name);

    // Para a montagem de blocos, o admin deve ver apenas as disciplinas da etapa
    // atual da turma. O comportamento padrao (todas as etapas) e mantido para a
    // matriz curricular em course-detail.
    const rows =
      onlyCurrentStage && typeof currentStageNumber === "number"
        ? allRows.filter((row) => row.stageNumber === currentStageNumber)
        : allRows;

    if (!classSectionId) return rows;

    const teacherRows = await db
      .select({
        subjectId: classSectionSubjectTeachers.subjectId,
        teacherName: users.name,
      })
      .from(classSectionSubjectTeachers)
      .innerJoin(users, eq(users.id, classSectionSubjectTeachers.teacherId))
      .where(eq(classSectionSubjectTeachers.classSectionId, classSectionId))
      .orderBy(users.name);

    const teachersBySubject = new Map<number, string[]>();
    for (const row of teacherRows) {
      const current = teachersBySubject.get(row.subjectId) ?? [];
      current.push(row.teacherName);
      teachersBySubject.set(row.subjectId, current);
    }

    // Quando o studentId e fornecido, verifica os registros de aprovacao para
    // exibir "Aprovado" ou "Reprovado" de forma individual por aluno.
    let approvedSubjectIds = new Set<number>();
    if (studentId && typeof currentStageNumber === "number") {
      const approvedRows = await db
        .select({ subjectId: approvedSubjectRecords.subjectId })
        .from(approvedSubjectRecords)
        .where(
          and(
            eq(approvedSubjectRecords.studentId, studentId),
            eq(approvedSubjectRecords.courseId, courseId),
          ),
        );
      approvedSubjectIds = new Set(approvedRows.map((r) => r.subjectId));
    }

    return rows.map((row) => ({
      ...row,
      teacherNames: teachersBySubject.get(row.id) ?? [],
      academicStatus:
        typeof currentStageNumber === "number"
          ? row.stageNumber < currentStageNumber
            ? studentId
              ? approvedSubjectIds.has(row.id)
                ? "Aprovado"
                : "Reprovado"
              : "Aprovado"
            : row.stageNumber === currentStageNumber
              ? "Cursando"
              : "A cursar"
          : undefined,
    }));
  }

  async setCourseSubjects(
    courseId: number,
    subjectIds: number[],
    stageNumbers: Record<string | number, number> = {},
  ): Promise<void> {
    const deduped = Array.from(new Set(subjectIds));

    await db.delete(courseSubjects).where(eq(courseSubjects.courseId, courseId));

    if (deduped.length === 0) return;

    await db.insert(courseSubjects).values(
      deduped.map((subjectId) => ({
        courseId,
        subjectId,
        stageNumber: stageNumbers[subjectId] ?? 1,
        isRequired: true,
      })),
    );
  }

  async getLessonLocations(): Promise<LessonLocationResponse[]> {
    const rows = await db
      .select({
        id: lessonLocations.id,
        name: lessonLocations.name,
        createdAt: lessonLocations.createdAt,
        updatedAt: lessonLocations.updatedAt,
        blockCount: count(lessonScheduleBlocks.id),
      })
      .from(lessonLocations)
      .leftJoin(lessonScheduleBlocks, eq(lessonScheduleBlocks.locationId, lessonLocations.id))
      .groupBy(lessonLocations.id)
      .orderBy(asc(lessonLocations.name));

    return rows.map((row) => ({ ...row, blockCount: Number(row.blockCount) }));
  }

  async createLessonLocation(location: InsertLessonLocation): Promise<LessonLocationResponse> {
    const name = location.name.trim();
    const [created] = await db
      .insert(lessonLocations)
      .values({ name })
      .onConflictDoUpdate({
        target: lessonLocations.name,
        set: { updatedAt: new Date() },
      })
      .returning();

    return { ...created, blockCount: 0 };
  }

  async updateLessonLocation(id: number, updates: InsertLessonLocation): Promise<LessonLocationResponse> {
    const [updated] = await db
      .update(lessonLocations)
      .set({ name: updates.name.trim(), updatedAt: new Date() })
      .where(eq(lessonLocations.id, id))
      .returning();

    if (!updated) throw new Error("Localizacao nao encontrada");

    const [{ blockCount }] = await db
      .select({ blockCount: count(lessonScheduleBlocks.id) })
      .from(lessonScheduleBlocks)
      .where(eq(lessonScheduleBlocks.locationId, id));

    return { ...updated, blockCount: Number(blockCount) };
  }

  async deleteLessonLocation(id: number): Promise<number> {
    const [location] = await db.select({ id: lessonLocations.id }).from(lessonLocations).where(eq(lessonLocations.id, id));
    if (!location) throw new Error("Localizacao nao encontrada");

    const [{ blockCount }] = await db
      .select({ blockCount: count(lessonScheduleBlocks.id) })
      .from(lessonScheduleBlocks)
      .where(eq(lessonScheduleBlocks.locationId, id));

    await db.delete(lessonLocations).where(eq(lessonLocations.id, id));
    return Number(blockCount);
  }

  async getLessonSchedule(classSectionId: number, academicTermId: number): Promise<LessonScheduleResponse | null> {
    const [schedule] = await db
      .select()
      .from(lessonSchedules)
      .where(and(eq(lessonSchedules.classSectionId, classSectionId), eq(lessonSchedules.academicTermId, academicTermId)));

    if (!schedule) return null;

    const blocks = await db
      .select({
        id: lessonScheduleBlocks.id,
        scheduleId: lessonScheduleBlocks.scheduleId,
        subjectId: lessonScheduleBlocks.subjectId,
        teacherId: lessonScheduleBlocks.teacherId,
        locationId: lessonScheduleBlocks.locationId,
        createdAt: lessonScheduleBlocks.createdAt,
        updatedAt: lessonScheduleBlocks.updatedAt,
        subjectName: subjects.name,
        subjectWorkloadHours: subjects.workloadHours,
        teacherName: users.name,
        locationName: lessonLocations.name,
      })
      .from(lessonScheduleBlocks)
      .innerJoin(subjects, eq(subjects.id, lessonScheduleBlocks.subjectId))
      .innerJoin(users, eq(users.id, lessonScheduleBlocks.teacherId))
      .innerJoin(lessonLocations, eq(lessonLocations.id, lessonScheduleBlocks.locationId))
      .where(eq(lessonScheduleBlocks.scheduleId, schedule.id))
      .orderBy(asc(lessonScheduleBlocks.id));

    const slots = await db
      .select({
        dayOfWeek: lessonScheduleSlots.dayOfWeek,
        lessonNumber: lessonScheduleSlots.lessonNumber,
        blockId: lessonScheduleSlots.blockId,
      })
      .from(lessonScheduleSlots)
      .where(eq(lessonScheduleSlots.scheduleId, schedule.id))
      .orderBy(asc(lessonScheduleSlots.lessonNumber), asc(lessonScheduleSlots.dayOfWeek));

    return {
      ...schedule,
      blocks,
      slots: slots.map((slot) => ({
        dayOfWeek: slot.dayOfWeek as LessonScheduleSaveSlotInput["dayOfWeek"],
        lessonNumber: slot.lessonNumber,
        blockId: slot.blockId,
      })),
    };
  }

  private async getActiveAcademicTermOrNull(): Promise<AcademicTerm | null> {
    const [activeTerm] = await db
      .select()
      .from(academicTerms)
      .where(eq(academicTerms.isActive, true))
      .orderBy(desc(academicTerms.startsAt));
    return activeTerm ?? null;
  }

  async getStudentActiveSchedule(studentId: number): Promise<StudentScheduleResponse> {
    const sectionIds = await this.getStudentClassSectionIds(studentId);
    if (sectionIds.length === 0) return null;

    // A turma do aluno esta vinculada a exatamente um semestre letivo. Lemos o
    // horario pelo semestre da propria turma (e nao pelo "semestre ativo" global),
    // garantindo que a tabela lancada pelo admin apareca para o aluno mesmo quando
    // a turma nao pertence ao semestre marcado como ativo.
    const [section] = await db
      .select({
        id: classSections.id,
        code: classSections.code,
        name: classSections.name,
        period: classSections.period,
        currentStageNumber: classSections.currentStageNumber,
        academicTermId: classSections.academicTermId,
      })
      .from(classSections)
      .where(inArray(classSections.id, sectionIds))
      .orderBy(desc(classSections.academicTermId), asc(classSections.id));

    if (!section) return null;

    const [term] = await db
      .select({ code: academicTerms.code })
      .from(academicTerms)
      .where(eq(academicTerms.id, section.academicTermId));

    const schedule = await this.getLessonSchedule(section.id, section.academicTermId);

    const { academicTermId: _academicTermId, ...classSection } = section;

    return {
      academicTermCode: term?.code ?? "",
      classSection,
      schedule,
    };
  }

  // Disciplinas do aluno (turma ativa) com sala, professor, faltas reais e estado.
  async getStudentDisciplines(studentId: number): Promise<MyDisciplinesResponse["studentItems"]> {
    const sectionIds = await this.getStudentClassSectionIds(studentId);
    if (sectionIds.length === 0) return [];

    const [section] = await db
      .select({
        id: classSections.id,
        code: classSections.code,
        academicTermId: classSections.academicTermId,
      })
      .from(classSections)
      .where(inArray(classSections.id, sectionIds))
      .orderBy(desc(classSections.academicTermId), asc(classSections.id));

    if (!section) return [];

    // Estado da matricula do aluno nesta turma (compartilhado pelas disciplinas da turma).
    const [enrollmentRow] = await db
      .select({ status: enrollments.status })
      .from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.classSectionId, section.id)))
      .orderBy(desc(enrollments.id));
    const status = (enrollmentRow?.status ??
      "active") as MyDisciplinesResponse["studentItems"][number]["status"];

    // Disciplinas publicadas no horario da turma (com sala e professor).
    const rows = await db
      .select({
        subjectId: subjects.id,
        subjectName: subjects.name,
        teacherName: users.name,
        locationName: lessonLocations.name,
      })
      .from(lessonScheduleSlots)
      .innerJoin(lessonSchedules, eq(lessonSchedules.id, lessonScheduleSlots.scheduleId))
      .innerJoin(lessonScheduleBlocks, eq(lessonScheduleBlocks.id, lessonScheduleSlots.blockId))
      .innerJoin(subjects, eq(subjects.id, lessonScheduleBlocks.subjectId))
      .innerJoin(users, eq(users.id, lessonScheduleBlocks.teacherId))
      .innerJoin(lessonLocations, eq(lessonLocations.id, lessonScheduleBlocks.locationId))
      .where(
        and(
          eq(lessonSchedules.classSectionId, section.id),
          eq(lessonSchedules.academicTermId, section.academicTermId),
        ),
      )
      .orderBy(asc(subjects.name));

    // Faltas reais por disciplina, a partir dos registros de aula da MESMA turma
    // que estamos listando (escopo por classSectionId evita contar outras turmas
    // que por acaso compartilhem o mesmo semestre).
    const absenceRows = await db
      .select({ subjectId: lessonRecords.subjectId, absences: count() })
      .from(lessonRecordAttendance)
      .innerJoin(lessonRecords, eq(lessonRecords.id, lessonRecordAttendance.lessonRecordId))
      .where(
        and(
          eq(lessonRecordAttendance.studentId, studentId),
          eq(lessonRecordAttendance.status, "absent"),
          eq(lessonRecords.classSectionId, section.id),
        ),
      )
      .groupBy(lessonRecords.subjectId);

    const absencesBySubject = new Map<number, number>();
    for (const row of absenceRows) absencesBySubject.set(row.subjectId, Number(row.absences));

    // Dedupe por disciplina (uma disciplina aparece em varios horarios da semana).
    const bySubject = new Map<number, MyDisciplinesResponse["studentItems"][number]>();
    for (const row of rows) {
      if (bySubject.has(row.subjectId)) continue;
      bySubject.set(row.subjectId, {
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        teacherName: row.teacherName,
        locationName: row.locationName,
        classSectionCode: section.code,
        status,
        absences: absencesBySubject.get(row.subjectId) ?? 0,
      });
    }

    return Array.from(bySubject.values());
  }

  // Disciplinas que o professor leciona, por turma (sala e periodo).
  async getTeacherDisciplines(teacherId: number): Promise<MyDisciplinesResponse["teacherItems"]> {
    const rows = await db
      .select({
        subjectId: subjects.id,
        subjectName: subjects.name,
        classSectionCode: classSections.code,
        classSectionName: classSections.name,
        locationName: lessonLocations.name,
        period: lessonSchedules.period,
      })
      .from(lessonScheduleSlots)
      .innerJoin(lessonScheduleBlocks, eq(lessonScheduleBlocks.id, lessonScheduleSlots.blockId))
      .innerJoin(lessonSchedules, eq(lessonSchedules.id, lessonScheduleSlots.scheduleId))
      .innerJoin(classSections, eq(classSections.id, lessonSchedules.classSectionId))
      .innerJoin(subjects, eq(subjects.id, lessonScheduleBlocks.subjectId))
      .innerJoin(lessonLocations, eq(lessonLocations.id, lessonScheduleBlocks.locationId))
      .where(eq(lessonScheduleBlocks.teacherId, teacherId))
      .orderBy(asc(classSections.code), asc(subjects.name));

    // Dedupe por (turma + disciplina).
    const byKey = new Map<string, MyDisciplinesResponse["teacherItems"][number]>();
    for (const row of rows) {
      const key = `${row.classSectionCode}-${row.subjectId}`;
      if (byKey.has(key)) continue;
      byKey.set(key, {
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        classSectionCode: row.classSectionCode,
        classSectionName: row.classSectionName,
        locationName: row.locationName,
        period: row.period,
      });
    }

    return Array.from(byKey.values());
  }

  async getTeacherActiveSchedule(teacherId: number): Promise<TeacherScheduleResponse> {
    const activeTerm = await this.getActiveAcademicTermOrNull();
    if (!activeTerm) {
      return { academicTermCode: "", items: [] };
    }

    const items = await db
      .select({
        dayOfWeek: lessonScheduleSlots.dayOfWeek,
        lessonNumber: lessonScheduleSlots.lessonNumber,
        period: lessonSchedules.period,
        subjectName: subjects.name,
        classSectionCode: classSections.code,
        classSectionName: classSections.name,
        locationName: lessonLocations.name,
      })
      .from(lessonScheduleSlots)
      .innerJoin(lessonScheduleBlocks, eq(lessonScheduleBlocks.id, lessonScheduleSlots.blockId))
      .innerJoin(lessonSchedules, eq(lessonSchedules.id, lessonScheduleSlots.scheduleId))
      .innerJoin(classSections, eq(classSections.id, lessonSchedules.classSectionId))
      .innerJoin(subjects, eq(subjects.id, lessonScheduleBlocks.subjectId))
      .innerJoin(lessonLocations, eq(lessonLocations.id, lessonScheduleBlocks.locationId))
      // Mostramos as aulas do professor pelo vinculo da turma (cada tabela ja pertence
      // ao semestre da sua turma), sem depender do "semestre ativo" global.
      .where(eq(lessonScheduleBlocks.teacherId, teacherId))
      .orderBy(asc(lessonScheduleSlots.lessonNumber), asc(lessonScheduleSlots.dayOfWeek));

    return {
      academicTermCode: activeTerm.code,
      items: items.map((item) => ({
        dayOfWeek: item.dayOfWeek as LessonScheduleSaveSlotInput["dayOfWeek"],
        lessonNumber: item.lessonNumber,
        period: item.period,
        subjectName: item.subjectName,
        classSectionCode: item.classSectionCode,
        classSectionName: item.classSectionName,
        locationName: item.locationName,
      })),
    };
  }

  // Converte "YYYY-MM-DD" no dia da semana (segunda-sexta) ou null em fim de semana.
  private isoDateToWeekday(
    date: string,
  ): "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match) return null;
    const weekdayIndex = new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    ).getUTCDay();
    const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
    const name = names[weekdayIndex];
    return name === "sunday" || name === "saturday" ? null : name;
  }

  async getTeacherLessonsByDate(teacherId: number, date: string): Promise<TeacherLessonsByDateResponse> {
    const dayOfWeek = this.isoDateToWeekday(date);
    const activeTerm = await this.getActiveAcademicTermOrNull();
    const base: TeacherLessonsByDateResponse = {
      date,
      dayOfWeek,
      academicTermCode: activeTerm?.code ?? "",
      items: [],
    };
    if (!dayOfWeek) return base;

    // Aulas publicadas do professor nesse dia da semana, com os IDs necessarios.
    const slots = await db
      .select({
        classSectionId: classSections.id,
        classSectionCode: classSections.code,
        classSectionName: classSections.name,
        courseId: classSections.courseId,
        academicTermId: lessonSchedules.academicTermId,
        period: lessonSchedules.period,
        subjectId: subjects.id,
        subjectName: subjects.name,
        locationName: lessonLocations.name,
        lessonNumber: lessonScheduleSlots.lessonNumber,
      })
      .from(lessonScheduleSlots)
      .innerJoin(lessonScheduleBlocks, eq(lessonScheduleBlocks.id, lessonScheduleSlots.blockId))
      .innerJoin(lessonSchedules, eq(lessonSchedules.id, lessonScheduleSlots.scheduleId))
      .innerJoin(classSections, eq(classSections.id, lessonSchedules.classSectionId))
      .innerJoin(subjects, eq(subjects.id, lessonScheduleBlocks.subjectId))
      .innerJoin(lessonLocations, eq(lessonLocations.id, lessonScheduleBlocks.locationId))
      .where(and(eq(lessonScheduleBlocks.teacherId, teacherId), eq(lessonScheduleSlots.dayOfWeek, dayOfWeek)))
      .orderBy(asc(classSections.code), asc(subjects.name), asc(lessonScheduleSlots.lessonNumber));

    if (slots.length === 0) return base;

    // Agrupar por (turma + disciplina); um registro do dia pode cobrir varios horarios.
    type Group = {
      key: string;
      classSectionId: number;
      classSectionCode: string;
      classSectionName: string;
      courseId: number;
      academicTermId: number;
      period: (typeof slots)[number]["period"];
      subjectId: number;
      subjectName: string;
      locationName: string;
      lessonNumbers: number[];
    };
    const groups = new Map<string, Group>();
    for (const slot of slots) {
      const key = `${slot.classSectionId}-${slot.subjectId}`;
      const existing = groups.get(key);
      if (existing) {
        if (!existing.lessonNumbers.includes(slot.lessonNumber)) {
          existing.lessonNumbers.push(slot.lessonNumber);
        }
      } else {
        groups.set(key, {
          key,
          classSectionId: slot.classSectionId,
          classSectionCode: slot.classSectionCode,
          classSectionName: slot.classSectionName,
          courseId: slot.courseId,
          academicTermId: slot.academicTermId,
          period: slot.period,
          subjectId: slot.subjectId,
          subjectName: slot.subjectName,
          locationName: slot.locationName,
          lessonNumbers: [slot.lessonNumber],
        });
      }
    }

    // Registros ja salvos (mesmo professor + data) para prefill de conteudo e faltas.
    const records = await db
      .select()
      .from(lessonRecords)
      .where(and(eq(lessonRecords.teacherId, teacherId), eq(lessonRecords.lessonDate, date)));
    const recordByScope = new Map<string, (typeof records)[number]>();
    for (const record of records) {
      recordByScope.set(`${record.classSectionId}-${record.subjectId}`, record);
    }
    const recordIds = records.map((record) => record.id);
    const absenceRows = recordIds.length
      ? await db
          .select()
          .from(lessonRecordAttendance)
          .where(
            and(
              inArray(lessonRecordAttendance.lessonRecordId, recordIds),
              eq(lessonRecordAttendance.status, "absent"),
            ),
          )
      : [];
    const absencesByRecord = new Map<number, Array<{ studentId: number; lessonNumber: number }>>();
    for (const row of absenceRows) {
      const list = absencesByRecord.get(row.lessonRecordId) ?? [];
      list.push({ studentId: row.studentId, lessonNumber: row.lessonNumber });
      absencesByRecord.set(row.lessonRecordId, list);
    }

    const items = Array.from(groups.values()).map((group) => {
      group.lessonNumbers.sort((a, b) => a - b);
      const record = recordByScope.get(group.key);
      return {
        ...group,
        record: record ? { recordId: record.id, content: record.content } : null,
        absences: record ? absencesByRecord.get(record.id) ?? [] : [],
      };
    });

    return { ...base, items };
  }

  async saveTeacherLessonRecord(
    teacherId: number,
    input: TeacherLessonSaveInput,
  ): Promise<TeacherLessonSaveResponse> {
    const dayOfWeek = this.isoDateToWeekday(input.date);
    if (!dayOfWeek) {
      throw new Error("Data invalida para registro de aula");
    }

    // AUTORIZACAO (backend): o professor leciona esta turma+disciplina nesse dia?
    const scheduled = await db
      .select({
        lessonNumber: lessonScheduleSlots.lessonNumber,
        academicTermId: lessonSchedules.academicTermId,
        period: lessonSchedules.period,
      })
      .from(lessonScheduleSlots)
      .innerJoin(lessonScheduleBlocks, eq(lessonScheduleBlocks.id, lessonScheduleSlots.blockId))
      .innerJoin(lessonSchedules, eq(lessonSchedules.id, lessonScheduleSlots.scheduleId))
      .where(
        and(
          eq(lessonScheduleBlocks.teacherId, teacherId),
          eq(lessonScheduleBlocks.subjectId, input.subjectId),
          eq(lessonSchedules.classSectionId, input.classSectionId),
          eq(lessonScheduleSlots.dayOfWeek, dayOfWeek),
        ),
      );

    if (scheduled.length === 0) {
      throw new Error("Turma ou disciplina invalida para este professor nesta data");
    }
    const scheduledNumbers = new Set(scheduled.map((slot) => slot.lessonNumber));
    for (const lessonNumber of input.lessonNumbers) {
      if (!scheduledNumbers.has(lessonNumber)) {
        throw new Error("Horario de aula invalido para este professor");
      }
    }
    const academicTermId = scheduled[0].academicTermId;
    const period = scheduled[0].period;

    // Alunos ativos da turma -> studentId + enrollmentId (a presenca exige enrollment).
    const enrolled = await db
      .select({ studentId: enrollments.studentId, enrollmentId: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.classSectionId, input.classSectionId), eq(enrollments.status, "active")));
    const enrollmentByStudent = new Map<number, number>();
    for (const row of enrolled) enrollmentByStudent.set(row.studentId, row.enrollmentId);

    const coveredNumbers = new Set(input.lessonNumbers);
    for (const absence of input.absences) {
      if (!enrollmentByStudent.has(absence.studentId)) {
        throw new Error("Aluno invalido para a turma");
      }
      if (!coveredNumbers.has(absence.lessonNumber)) {
        throw new Error("Horario de falta invalido");
      }
    }
    const absentSet = new Set(input.absences.map((absence) => `${absence.studentId}-${absence.lessonNumber}`));

    const record = await db.transaction(async (tx) => {
      const [saved] = await tx
        .insert(lessonRecords)
        .values({
          classSectionId: input.classSectionId,
          academicTermId,
          subjectId: input.subjectId,
          teacherId,
          lessonDate: input.date,
          period,
          content: input.content,
          createdByUserId: teacherId,
          updatedByUserId: teacherId,
        })
        .onConflictDoUpdate({
          target: [
            lessonRecords.classSectionId,
            lessonRecords.academicTermId,
            lessonRecords.subjectId,
            lessonRecords.teacherId,
            lessonRecords.lessonDate,
          ],
          set: { content: input.content, period, updatedByUserId: teacherId, updatedAt: new Date() },
        })
        .returning();

      // Substitui os horarios cobertos pelo registro.
      await tx.delete(lessonRecordSlots).where(eq(lessonRecordSlots.lessonRecordId, saved.id));
      await tx
        .insert(lessonRecordSlots)
        .values(input.lessonNumbers.map((lessonNumber) => ({ lessonRecordId: saved.id, lessonNumber })));

      // Substitui a presenca: 1 linha por (aluno, horario coberto) com status explicito.
      await tx.delete(lessonRecordAttendance).where(eq(lessonRecordAttendance.lessonRecordId, saved.id));
      const attendanceRows = [];
      for (const lessonNumber of input.lessonNumbers) {
        for (const enrollment of enrolled) {
          attendanceRows.push({
            lessonRecordId: saved.id,
            lessonNumber,
            studentId: enrollment.studentId,
            enrollmentId: enrollment.enrollmentId,
            status: absentSet.has(`${enrollment.studentId}-${lessonNumber}`)
              ? ("absent" as const)
              : ("present" as const),
          });
        }
      }
      if (attendanceRows.length) await tx.insert(lessonRecordAttendance).values(attendanceRows);

      return saved;
    });

    return {
      recordId: record.id,
      content: record.content,
      absences: input.absences.map((absence) => ({
        studentId: absence.studentId,
        lessonNumber: absence.lessonNumber,
      })),
    };
  }

  async getTeacherClassLoads(): Promise<Array<{ teacherId: number; classCount: number }>> {
    const coordinated = await db
      .select({ teacherId: classSections.coordinatorTeacherId, sectionId: classSections.id })
      .from(classSections);
    const assigned = await db
      .select({ teacherId: classSectionTeachers.teacherId, sectionId: classSectionTeachers.classSectionId })
      .from(classSectionTeachers);
    const subjectAssigned = await db
      .select({ teacherId: classSectionSubjectTeachers.teacherId, sectionId: classSectionSubjectTeachers.classSectionId })
      .from(classSectionSubjectTeachers);

    const sectionsByTeacher = new Map<number, Set<number>>();
    const register = (teacherId: number | null, sectionId: number) => {
      if (teacherId == null) return;
      const set = sectionsByTeacher.get(teacherId) ?? new Set<number>();
      set.add(sectionId);
      sectionsByTeacher.set(teacherId, set);
    };
    for (const row of coordinated) register(row.teacherId, row.sectionId);
    for (const row of assigned) register(row.teacherId, row.sectionId);
    for (const row of subjectAssigned) register(row.teacherId, row.sectionId);

    return Array.from(sectionsByTeacher.entries()).map(([teacherId, sections]) => ({
      teacherId,
      classCount: sections.size,
    }));
  }

  async getTeacherBusySlots(
    academicTermId: number,
    period: ClassPeriod,
    excludeClassSectionId?: number,
  ): Promise<
    Array<{
      teacherId: number;
      dayOfWeek: LessonScheduleSaveSlotInput["dayOfWeek"];
      lessonNumber: number;
      classSectionCode: string;
    }>
  > {
    const conditions = [
      eq(lessonSchedules.academicTermId, academicTermId),
      eq(lessonSchedules.period, period),
    ];
    if (excludeClassSectionId) {
      conditions.push(ne(lessonSchedules.classSectionId, excludeClassSectionId));
    }

    const rows = await db
      .select({
        teacherId: lessonScheduleBlocks.teacherId,
        dayOfWeek: lessonScheduleSlots.dayOfWeek,
        lessonNumber: lessonScheduleSlots.lessonNumber,
        classSectionCode: classSections.code,
      })
      .from(lessonScheduleSlots)
      .innerJoin(lessonScheduleBlocks, eq(lessonScheduleBlocks.id, lessonScheduleSlots.blockId))
      .innerJoin(lessonSchedules, eq(lessonSchedules.id, lessonScheduleSlots.scheduleId))
      .innerJoin(classSections, eq(classSections.id, lessonSchedules.classSectionId))
      .where(and(...conditions));

    return rows.map((row) => ({
      teacherId: row.teacherId,
      dayOfWeek: row.dayOfWeek as LessonScheduleSaveSlotInput["dayOfWeek"],
      lessonNumber: row.lessonNumber,
      classSectionCode: row.classSectionCode,
    }));
  }

  private validateLessonSlots(blocks: LessonScheduleSaveBlockInput[], slots: LessonScheduleSaveSlotInput[]) {
    if (slots.length !== 20) {
      throw new Error("Preencha os 20 slots de aula antes de confirmar");
    }

    const blockIds = new Set(blocks.map((block) => block.clientId));
    const slotKeys = new Set<string>();

    for (const slot of slots) {
      if (!LESSON_DAYS.includes(slot.dayOfWeek)) {
        throw new Error("Dia da semana invalido");
      }

      if (!LESSON_NUMBERS.includes(slot.lessonNumber as 1 | 2 | 3 | 4)) {
        throw new Error("Numero da aula invalido");
      }

      if (!blockIds.has(slot.blockClientId)) {
        throw new Error("Slot referencia um bloco invalido");
      }

      const key = `${slot.dayOfWeek}-${slot.lessonNumber}`;
      if (slotKeys.has(key)) {
        throw new Error("Nao e permitido duplicar slots na tabela");
      }
      slotKeys.add(key);
    }
  }

  private async validateLessonBlocks(courseId: number, blocks: LessonScheduleSaveBlockInput[]) {
    const seenSubjectIds = new Set<number>();
    for (const block of blocks) {
      if (seenSubjectIds.has(block.subjectId)) {
        throw new Error("Esta materia ja possui um bloco nesta turma e semestre");
      }
      seenSubjectIds.add(block.subjectId);
    }

    const subjectIds = Array.from(new Set(blocks.map((block) => block.subjectId)));
    const teacherIds = Array.from(new Set(blocks.map((block) => block.teacherId)));
    const locationIds = Array.from(new Set(blocks.map((block) => block.locationId)));

    const courseSubjectRows =
      subjectIds.length > 0
        ? await db
            .select({ subjectId: courseSubjects.subjectId })
            .from(courseSubjects)
            .where(and(eq(courseSubjects.courseId, courseId), inArray(courseSubjects.subjectId, subjectIds)))
        : [];
    if (courseSubjectRows.length !== subjectIds.length) {
      throw new Error("Materia invalida para o curso da turma");
    }

    const teacherRows =
      teacherIds.length > 0
        ? await db
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.role, "teacher"), inArray(users.id, teacherIds)))
        : [];
    if (teacherRows.length !== teacherIds.length) {
      throw new Error("Professor invalido");
    }

    const locationRows =
      locationIds.length > 0
        ? await db.select({ id: lessonLocations.id }).from(lessonLocations).where(inArray(lessonLocations.id, locationIds))
        : [];
    if (locationRows.length !== locationIds.length) {
      throw new Error("Localizacao invalida");
    }
  }

  // Impede que o mesmo professor seja alocado em duas turmas no mesmo horario real
  // (mesmo semestre + periodo + dia + numero da aula). Validado tanto no rascunho
  // quanto na publicacao. Blocos sem professor definido (rascunho em edicao) sao ignorados.
  private async assertNoTeacherScheduleConflicts(input: {
    classSectionId: number;
    academicTermId: number;
    period: ClassPeriod;
    blocks: LessonScheduleSaveBlockInput[];
    slots: LessonScheduleSaveSlotInput[];
  }): Promise<void> {
    const teacherByClientId = new Map(input.blocks.map((block) => [block.clientId, block.teacherId]));
    const wantedByTeacher = new Map<number, Set<string>>();
    const teacherIds = new Set<number>();

    for (const slot of input.slots) {
      const teacherId = teacherByClientId.get(slot.blockClientId);
      if (!teacherId) continue;
      teacherIds.add(teacherId);
      const key = `${slot.dayOfWeek}-${slot.lessonNumber}`;
      const set = wantedByTeacher.get(teacherId) ?? new Set<string>();
      set.add(key);
      wantedByTeacher.set(teacherId, set);
    }

    if (teacherIds.size === 0) return;

    const rows = await db
      .select({
        classSectionCode: classSections.code,
        teacherId: lessonScheduleBlocks.teacherId,
        teacherName: users.name,
        dayOfWeek: lessonScheduleSlots.dayOfWeek,
        lessonNumber: lessonScheduleSlots.lessonNumber,
      })
      .from(lessonScheduleSlots)
      .innerJoin(lessonScheduleBlocks, eq(lessonScheduleBlocks.id, lessonScheduleSlots.blockId))
      .innerJoin(lessonSchedules, eq(lessonSchedules.id, lessonScheduleSlots.scheduleId))
      .innerJoin(classSections, eq(classSections.id, lessonSchedules.classSectionId))
      .innerJoin(users, eq(users.id, lessonScheduleBlocks.teacherId))
      .where(
        and(
          eq(lessonSchedules.academicTermId, input.academicTermId),
          eq(lessonSchedules.period, input.period),
          ne(lessonSchedules.classSectionId, input.classSectionId),
          inArray(lessonScheduleBlocks.teacherId, Array.from(teacherIds)),
        ),
      );

    for (const row of rows) {
      const key = `${row.dayOfWeek}-${row.lessonNumber}`;
      if (wantedByTeacher.get(row.teacherId)?.has(key)) {
        const dayLabel = LESSON_DAY_LABELS_PT[row.dayOfWeek as (typeof LESSON_DAYS)[number]] ?? row.dayOfWeek;
        throw new Error(
          `Conflito de horario: o professor ${row.teacherName} ja esta alocado na Turma ${row.classSectionCode} nesse mesmo horario (${dayLabel}, aula ${row.lessonNumber}, ${input.period}). Ajuste a alocacao para evitar sobreposicao.`,
        );
      }
    }
  }

  async saveLessonSchedule(input: {
    classSectionId: number;
    academicTermId: number;
    period: ClassPeriod;
    blocks: LessonScheduleSaveBlockInput[];
    slots: LessonScheduleSaveSlotInput[];
    userId: number;
  }): Promise<LessonScheduleResponse> {
    const [section] = await db
      .select({ id: classSections.id, courseId: classSections.courseId })
      .from(classSections)
      .where(eq(classSections.id, input.classSectionId));
    if (!section) throw new Error("Turma invalida");

    const [term] = await db.select({ id: academicTerms.id }).from(academicTerms).where(eq(academicTerms.id, input.academicTermId));
    if (!term) throw new Error("Semestre letivo invalido");

    this.validateLessonSlots(input.blocks, input.slots);
    await this.validateLessonBlocks(section.courseId, input.blocks);
    await this.assertNoTeacherScheduleConflicts({
      classSectionId: input.classSectionId,
      academicTermId: input.academicTermId,
      period: input.period,
      blocks: input.blocks,
      slots: input.slots,
    });

    await db.transaction(async (tx) => {
      await tx.update(classSections).set({ period: input.period }).where(eq(classSections.id, input.classSectionId));
      await tx
        .delete(lessonSchedules)
        .where(
          and(
            eq(lessonSchedules.classSectionId, input.classSectionId),
            eq(lessonSchedules.academicTermId, input.academicTermId),
          ),
        );

      const [schedule] = await tx
        .insert(lessonSchedules)
        .values({
          classSectionId: input.classSectionId,
          academicTermId: input.academicTermId,
          period: input.period,
          createdByUserId: input.userId,
          updatedByUserId: input.userId,
        })
        .returning();

      const blockIdByClientId = new Map<string, number>();
      for (const block of input.blocks) {
        const [createdBlock] = await tx
          .insert(lessonScheduleBlocks)
          .values({
            scheduleId: schedule.id,
            subjectId: block.subjectId,
            teacherId: block.teacherId,
            locationId: block.locationId,
          })
          .returning();
        blockIdByClientId.set(block.clientId, createdBlock.id);
      }

      await tx.insert(lessonScheduleSlots).values(
        input.slots.map((slot) => ({
          scheduleId: schedule.id,
          blockId: blockIdByClientId.get(slot.blockClientId)!,
          dayOfWeek: slot.dayOfWeek,
          lessonNumber: slot.lessonNumber,
        })),
      );

      await tx
        .delete(lessonScheduleDrafts)
        .where(
          and(
            eq(lessonScheduleDrafts.classSectionId, input.classSectionId),
            eq(lessonScheduleDrafts.academicTermId, input.academicTermId),
            eq(lessonScheduleDrafts.userId, input.userId),
          ),
        );
    });

    const saved = await this.getLessonSchedule(input.classSectionId, input.academicTermId);
    if (!saved) throw new Error("Nao foi possivel carregar a tabela salva");
    return saved;
  }

  async getLessonScheduleDraft(
    classSectionId: number,
    academicTermId: number,
    userId: number,
  ): Promise<LessonScheduleDraft | null> {
    const [draft] = await db
      .select()
      .from(lessonScheduleDrafts)
      .where(
        and(
          eq(lessonScheduleDrafts.classSectionId, classSectionId),
          eq(lessonScheduleDrafts.academicTermId, academicTermId),
          eq(lessonScheduleDrafts.userId, userId),
        ),
      );

    return draft ?? null;
  }

  async saveLessonScheduleDraft(input: {
    classSectionId: number;
    academicTermId: number;
    userId: number;
    period: ClassPeriod;
    draftPayload: LessonScheduleDraftPayload;
  }): Promise<LessonScheduleDraft> {
    await this.assertNoTeacherScheduleConflicts({
      classSectionId: input.classSectionId,
      academicTermId: input.academicTermId,
      period: input.period,
      blocks: input.draftPayload.blocks,
      slots: input.draftPayload.slots,
    });

    const [draft] = await db
      .insert(lessonScheduleDrafts)
      .values({
        classSectionId: input.classSectionId,
        academicTermId: input.academicTermId,
        userId: input.userId,
        period: input.period,
        draftPayload: input.draftPayload,
      })
      .onConflictDoUpdate({
        target: [
          lessonScheduleDrafts.classSectionId,
          lessonScheduleDrafts.academicTermId,
          lessonScheduleDrafts.userId,
        ],
        set: {
          period: input.period,
          draftPayload: input.draftPayload,
          updatedAt: new Date(),
        },
      })
      .returning();

    return draft;
  }

  async deleteLessonScheduleDraft(classSectionId: number, academicTermId: number, userId: number): Promise<void> {
    await db
      .delete(lessonScheduleDrafts)
      .where(
        and(
          eq(lessonScheduleDrafts.classSectionId, classSectionId),
          eq(lessonScheduleDrafts.academicTermId, academicTermId),
          eq(lessonScheduleDrafts.userId, userId),
        ),
      );
  }

  async getEnrollments(courseId?: number, studentId?: number, classSectionId?: number): Promise<EnrollmentResponse[]> {
    const clauses = [];

    if (courseId) clauses.push(eq(enrollments.courseId, courseId));
    if (studentId) clauses.push(eq(enrollments.studentId, studentId));
    if (classSectionId) clauses.push(eq(enrollments.classSectionId, classSectionId));

    const rows = await db
      .select({
        id: enrollments.id,
        studentId: enrollments.studentId,
        courseId: enrollments.courseId,
        status: enrollments.status,
        classSectionId: enrollments.classSectionId,
        academicTermId: enrollments.academicTermId,
        enrolledAt: enrollments.enrolledAt,
        createdAt: enrollments.createdAt,
        grade: enrollments.grade,
        attendance: enrollments.attendance,
        studentName: users.name,
        studentEmail: users.email,
        studentRa: users.ra,
        courseName: courses.name,
        classSectionCode: classSections.code,
        classSectionName: classSections.name,
        academicTermCode: academicTerms.code,
        classSectionCurrentStageNumber: classSections.currentStageNumber,
        classSectionPeriod: classSections.period,
      })
      .from(enrollments)
      .innerJoin(users, eq(users.id, enrollments.studentId))
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .leftJoin(classSections, eq(classSections.id, enrollments.classSectionId))
      .leftJoin(academicTerms, eq(academicTerms.id, enrollments.academicTermId))
      .where(clauses.length > 0 ? and(...clauses) : undefined)
      .orderBy(desc(enrollments.createdAt));

    return rows.map((row) => ({
      ...row,
      classSectionCode: row.classSectionCode ?? undefined,
      classSectionName: row.classSectionName ?? undefined,
      academicTermCode: row.academicTermCode ?? undefined,
      classSectionCurrentStageNumber: row.classSectionCurrentStageNumber ?? undefined,
      classSectionPeriod: row.classSectionPeriod ?? undefined,
    }));
  }

  async getEnrollmentById(id: number): Promise<Enrollment | undefined> {
    const [enrollment] = await db.select().from(enrollments).where(eq(enrollments.id, id));
    return enrollment;
  }

  async createEnrollment(insertEnrollment: InsertEnrollment): Promise<Enrollment> {
    const activeTerm = await this.getOrCreateActiveAcademicTerm();

    let classSectionId = insertEnrollment.classSectionId ?? null;
    let academicTermId = insertEnrollment.academicTermId ?? null;

    if (classSectionId) {
      const [section] = await db
        .select({ academicTermId: classSections.academicTermId, courseId: classSections.courseId })
        .from(classSections)
        .where(eq(classSections.id, classSectionId));
      if (!section) {
        throw new Error("Turma nao encontrada");
      }
      if (section.courseId !== insertEnrollment.courseId) {
        throw new Error("Turma nao pertence ao curso informado");
      }
      academicTermId = section.academicTermId;
    }

    if (!classSectionId) {
      const [section] = await db
        .select({ id: classSections.id, academicTermId: classSections.academicTermId })
        .from(classSections)
        .where(eq(classSections.courseId, insertEnrollment.courseId))
        .orderBy(desc(classSections.createdAt));

      if (section) {
        classSectionId = section.id;
        academicTermId = section.academicTermId;
      }
    }

    if (!academicTermId) {
      academicTermId = activeTerm.id;
    }

    const [enrollment] = await db
      .insert(enrollments)
      .values({
        ...insertEnrollment,
        status: insertEnrollment.status ?? "active",
        classSectionId,
        academicTermId,
      })
      .returning();
    await this.appendEnrollmentStatusHistory(enrollment.id, null, enrollment.status, undefined, "Matricula criada");
    return enrollment;
  }

  async updateEnrollment(
    id: number,
    updates: Partial<InsertEnrollment>,
    changedByUserId?: number,
    reason?: string,
  ): Promise<Enrollment> {
    const [current] = await db.select().from(enrollments).where(eq(enrollments.id, id));
    if (!current) {
      throw new Error("Matricula nao encontrada");
    }

    const [enrollment] = await db.update(enrollments).set(updates).where(eq(enrollments.id, id)).returning();

    if (updates.status && updates.status !== current.status) {
      await this.appendEnrollmentStatusHistory(
        id,
        current.status,
        updates.status,
        changedByUserId,
        reason ?? "Atualizacao de status de matricula",
      );
    }

    return enrollment;
  }

  async lockEnrollment(input: LockEnrollmentInput): Promise<{ enrollment: Enrollment; preservedApprovedSubjects: number }> {
    const enrollment = await this.getEnrollmentById(input.enrollmentId);
    if (!enrollment) {
      throw new Error("Matricula nao encontrada");
    }

    const previousStatus = enrollment.status;

    let updatedEnrollment = enrollment;
    if (enrollment.status !== "locked") {
      updatedEnrollment = await this.updateEnrollment(
        enrollment.id,
        { status: "locked" },
        input.changedByUserId,
        input.reason,
      );
    }

    const existingApproved = await db
      .select({ subjectId: approvedSubjectRecords.subjectId })
      .from(approvedSubjectRecords)
      .where(eq(approvedSubjectRecords.enrollmentId, enrollment.id));

    const existingSubjectIds = new Set(existingApproved.map((row) => row.subjectId));

    const requestedSubjectIds = uniqueNumbers(input.approvedSubjectIds ?? []);
    let subjectsToPersist = requestedSubjectIds;

    if (subjectsToPersist.length > 0) {
      const validSubjects = await db
        .select({ subjectId: courseSubjects.subjectId })
        .from(courseSubjects)
        .where(
          and(
            eq(courseSubjects.courseId, enrollment.courseId),
            inArray(courseSubjects.subjectId, subjectsToPersist),
          ),
        );

      subjectsToPersist = validSubjects.map((row) => row.subjectId);
    }

    const toInsert = subjectsToPersist.filter((subjectId) => !existingSubjectIds.has(subjectId));

    if (toInsert.length > 0) {
      const snapshotBatchId = `lock-${enrollment.id}-${Date.now()}`;
      await db.insert(approvedSubjectRecords).values(
        toInsert.map((subjectId) => ({
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          subjectId,
          approvedGrade: enrollment.grade,
          approvedAt: new Date(),
          snapshotBatchId,
          source: "lock_snapshot" as const,
        })),
      );
    }

    if (previousStatus === "locked") {
      return {
        enrollment: updatedEnrollment,
        preservedApprovedSubjects: existingSubjectIds.size,
      };
    }

    return {
      enrollment: updatedEnrollment,
      preservedApprovedSubjects: existingSubjectIds.size + toInsert.length,
    };
  }

  async getStudentScope(user: User): Promise<StudentScopeResponse> {
    const availableCourses = await this.getCoursesForUser(user);
    const sections = await this.getClassSectionsForUser(user);

    return {
      courses: availableCourses.map((course) => ({
        id: course.id,
        code: course.code,
        name: course.name,
      })),
      classSections: sections,
    };
  }

  async getStudentsByScope(user: User, filters?: StudentsFilterInput): Promise<StudentListResponse[]> {
    if (user.role === "student") return [];

    const allowedCourseIds = await this.getAllowedCourseIdsForUser(user);
    if (allowedCourseIds.length === 0) return [];

    const allowedSectionIds = await this.getAllowedClassSectionIdsForUser(user);

    if (filters?.courseId && !allowedCourseIds.includes(filters.courseId)) {
      return [];
    }

    if (
      filters?.classSectionId &&
      user.role !== "admin" &&
      !allowedSectionIds.includes(filters.classSectionId)
    ) {
      return [];
    }

    const clauses = [eq(users.role, "student"), inArray(enrollments.courseId, allowedCourseIds)];

    if (filters?.courseId) {
      clauses.push(eq(enrollments.courseId, filters.courseId));
    }

    if (filters?.classSectionId) {
      clauses.push(eq(enrollments.classSectionId, filters.classSectionId));
    }

    if (filters?.status) {
      clauses.push(eq(enrollments.status, filters.status));
    }

    if (user.role === "teacher" && !filters?.classSectionId && allowedSectionIds.length > 0) {
      clauses.push(
        or(
          inArray(enrollments.classSectionId, allowedSectionIds),
          sql`${enrollments.classSectionId} IS NULL`,
        )!,
      );
    }

    const rows = await db
      .select({
        id: users.id,
        ra: users.ra,
        username: users.username,
        role: users.role,
        name: users.name,
        nickname: users.nickname,
        cpf: users.cpf,
        phone: users.phone,
        email: users.email,
        avatarUrl: users.avatarUrl,
        preferences: users.preferences,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        enrollmentId: enrollments.id,
        enrollmentStatus: enrollments.status,
        courseId: courses.id,
        courseCode: courses.code,
        courseName: courses.name,
        classSectionId: enrollments.classSectionId,
        classSectionCode: classSections.code,
        classSectionName: classSections.name,
        academicTermId: enrollments.academicTermId,
        academicTermCode: academicTerms.code,
        classSectionCurrentStageNumber: classSections.currentStageNumber,
        classSectionPeriod: classSections.period,
      })
      .from(enrollments)
      .innerJoin(users, eq(users.id, enrollments.studentId))
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .leftJoin(classSections, eq(classSections.id, enrollments.classSectionId))
      .leftJoin(academicTerms, eq(academicTerms.id, enrollments.academicTermId))
      .where(and(...clauses))
      .orderBy(users.name);

    return rows.map((row) => ({
      ...row,
      classSectionCode: row.classSectionCode ?? undefined,
      classSectionName: row.classSectionName ?? undefined,
      academicTermCode: row.academicTermCode ?? undefined,
      classSectionCurrentStageNumber: row.classSectionCurrentStageNumber ?? undefined,
      classSectionPeriod: row.classSectionPeriod ?? undefined,
    }));
  }

  async getAnnouncementById(id: number): Promise<AnnouncementResponse | undefined> {
    const rows = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        content: announcements.content,
        authorId: announcements.authorId,
        isGlobal: announcements.isGlobal,
        expiresAt: announcements.expiresAt,
        createdAt: announcements.createdAt,
        authorName: users.name,
        targetType: announcementTargets.targetType,
        targetId: announcementTargets.targetId,
        legacyCourseId: announcementCourses.courseId,
      })
      .from(announcements)
      .leftJoin(users, eq(users.id, announcements.authorId))
      .leftJoin(announcementTargets, eq(announcementTargets.announcementId, announcements.id))
      .leftJoin(announcementCourses, eq(announcementCourses.announcementId, announcements.id))
      .where(eq(announcements.id, id));

    if (rows.length === 0) return undefined;

    const announcement: AnnouncementResponse = {
      id: rows[0].id,
      title: rows[0].title,
      content: rows[0].content,
      authorId: rows[0].authorId,
      isGlobal: rows[0].isGlobal,
      expiresAt: rows[0].expiresAt,
      createdAt: rows[0].createdAt,
      authorName: rows[0].authorName ?? undefined,
      courseIds: [],
      classSectionIds: [],
    };

    for (const row of rows) {
      if (row.legacyCourseId && !announcement.courseIds?.includes(row.legacyCourseId)) {
        announcement.courseIds?.push(row.legacyCourseId);
      }

      if (row.targetType === "course" && row.targetId && !announcement.courseIds?.includes(row.targetId)) {
        announcement.courseIds?.push(row.targetId);
      }

      if (
        row.targetType === "class_section" &&
        row.targetId &&
        !announcement.classSectionIds?.includes(row.targetId)
      ) {
        announcement.classSectionIds?.push(row.targetId);
      }
    }

    return announcement;
  }

  async getAnnouncementsForUser(user: User, courseId?: number, classSectionId?: number): Promise<AnnouncementResponse[]> {
    const now = new Date();

    const announcementRows = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        content: announcements.content,
        authorId: announcements.authorId,
        isGlobal: announcements.isGlobal,
        expiresAt: announcements.expiresAt,
        createdAt: announcements.createdAt,
        authorName: users.name,
        targetType: announcementTargets.targetType,
        targetId: announcementTargets.targetId,
        legacyCourseId: announcementCourses.courseId,
      })
      .from(announcements)
      .leftJoin(users, eq(users.id, announcements.authorId))
      .leftJoin(announcementTargets, eq(announcementTargets.announcementId, announcements.id))
      .leftJoin(announcementCourses, eq(announcementCourses.announcementId, announcements.id))
      .where(or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now)))
      .orderBy(desc(announcements.createdAt));

    const allowedCourseIds = new Set(await this.getAllowedCourseIdsForUser(user));
    const allowedClassSectionIds = new Set(await this.getAllowedClassSectionIdsForUser(user));

    const grouped = new Map<number, AnnouncementResponse>();

    for (const row of announcementRows) {
      const current = grouped.get(row.id) ?? {
        id: row.id,
        title: row.title,
        content: row.content,
        authorId: row.authorId,
        isGlobal: row.isGlobal,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        authorName: row.authorName ?? undefined,
        courseIds: [],
        classSectionIds: [],
      };

      if (row.legacyCourseId) {
        current.courseIds = current.courseIds ?? [];
        if (!current.courseIds.includes(row.legacyCourseId)) {
          current.courseIds.push(row.legacyCourseId);
        }
      }

      if (row.targetType === "course" && row.targetId) {
        current.courseIds = current.courseIds ?? [];
        if (!current.courseIds.includes(row.targetId)) {
          current.courseIds.push(row.targetId);
        }
      }

      if (row.targetType === "class_section" && row.targetId) {
        current.classSectionIds = current.classSectionIds ?? [];
        if (!current.classSectionIds.includes(row.targetId)) {
          current.classSectionIds.push(row.targetId);
        }
      }

      grouped.set(row.id, current);
    }

    return Array.from(grouped.values()).filter((announcement) => {
      if (courseId && !announcement.isGlobal) {
        const hasCourseTarget = announcement.courseIds?.includes(courseId) ?? false;
        if (!hasCourseTarget) return false;
      }

      if (classSectionId && !announcement.isGlobal) {
        const hasSectionTarget = announcement.classSectionIds?.includes(classSectionId) ?? false;
        if (!hasSectionTarget) return false;
      }

      if (announcement.isGlobal) return true;

      const linkedCourses = announcement.courseIds ?? [];
      const linkedClassSections = announcement.classSectionIds ?? [];

      return (
        linkedCourses.some((id) => allowedCourseIds.has(id)) ||
        linkedClassSections.some((id) => allowedClassSectionIds.has(id))
      );
    });
  }

  private async createNotificationWithRecipients(
    notification: InsertNotification,
    recipients: NotificationRecipientInput[],
  ) {
    if (recipients.length === 0) return;

    const [createdNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning({ id: notifications.id });

    await db
      .insert(notificationRecipients)
      .values(
        recipients.map((recipient) => ({
          notificationId: createdNotification.id,
          userId: recipient.userId,
          courseId: recipient.courseId ?? null,
          classSectionId: recipient.classSectionId ?? null,
        })),
      )
      .onConflictDoNothing();
  }

  private async resolveAnnouncementRecipients(input: {
    authorId: number;
    isGlobal: boolean;
    courseIds: number[];
    classSectionIds: number[];
  }): Promise<NotificationRecipientInput[]> {
    const recipients = new Map<number, NotificationRecipientInput>();
    const addRecipient = (recipient: NotificationRecipientInput) => {
      if (recipient.userId === input.authorId) return;

      const current = recipients.get(recipient.userId);
      if (!current) {
        recipients.set(recipient.userId, recipient);
        return;
      }

      if ((!current.courseId && recipient.courseId) || (!current.classSectionId && recipient.classSectionId)) {
        recipients.set(recipient.userId, recipient);
      }
    };

    if (input.isGlobal) {
      const everyone = await db.select({ id: users.id }).from(users).where(sql`${users.id} <> ${input.authorId}`);
      return everyone.map((row) => ({
        userId: row.id,
        courseId: null,
        classSectionId: null,
      }));
    }

    if (input.courseIds.length > 0) {
      const enrolledStudents = await db
        .select({ userId: enrollments.studentId, courseId: enrollments.courseId })
        .from(enrollments)
        .where(
          and(
            inArray(enrollments.courseId, input.courseIds),
            inArray(enrollments.status, activeAcademicStatuses),
          ),
        );

      for (const row of enrolledStudents) {
        addRecipient({ userId: row.userId, courseId: row.courseId, classSectionId: null });
      }

      const courseSectionTeachers = await db
        .select({
          courseId: classSections.courseId,
          coordinatorTeacherId: classSections.coordinatorTeacherId,
          subjectTeacherId: classSectionSubjectTeachers.teacherId,
        })
        .from(classSections)
        .leftJoin(
          classSectionSubjectTeachers,
          eq(classSectionSubjectTeachers.classSectionId, classSections.id),
        )
        .where(inArray(classSections.courseId, input.courseIds));

      for (const row of courseSectionTeachers) {
        if (row.coordinatorTeacherId) {
          addRecipient({ userId: row.coordinatorTeacherId, courseId: row.courseId, classSectionId: null });
        }
        if (row.subjectTeacherId) {
          addRecipient({ userId: row.subjectTeacherId, courseId: row.courseId, classSectionId: null });
        }
      }
    }

    if (input.classSectionIds.length > 0) {
      const sectionStudents = await db
        .select({
          userId: enrollments.studentId,
          courseId: enrollments.courseId,
          classSectionId: enrollments.classSectionId,
        })
        .from(enrollments)
        .where(
          and(
            inArray(enrollments.classSectionId, input.classSectionIds),
            inArray(enrollments.status, activeAcademicStatuses),
          ),
        );

      for (const row of sectionStudents) {
        addRecipient({
          userId: row.userId,
          courseId: row.courseId,
          classSectionId: row.classSectionId ?? null,
        });
      }

      const sectionTeachers = await db
        .select({
          teacherId: classSectionTeachers.teacherId,
          courseId: classSections.courseId,
          classSectionId: classSectionTeachers.classSectionId,
        })
        .from(classSectionTeachers)
        .innerJoin(classSections, eq(classSections.id, classSectionTeachers.classSectionId))
        .where(inArray(classSectionTeachers.classSectionId, input.classSectionIds));

      for (const row of sectionTeachers) {
        addRecipient({
          userId: row.teacherId,
          courseId: row.courseId,
          classSectionId: row.classSectionId,
        });
      }

      const sectionSubjectTeachers = await db
        .select({
          courseId: classSections.courseId,
          classSectionId: classSections.id,
          coordinatorTeacherId: classSections.coordinatorTeacherId,
          subjectTeacherId: classSectionSubjectTeachers.teacherId,
        })
        .from(classSections)
        .leftJoin(
          classSectionSubjectTeachers,
          eq(classSectionSubjectTeachers.classSectionId, classSections.id),
        )
        .where(inArray(classSections.id, input.classSectionIds));

      for (const row of sectionSubjectTeachers) {
        if (row.coordinatorTeacherId) {
          addRecipient({
            userId: row.coordinatorTeacherId,
            courseId: row.courseId,
            classSectionId: row.classSectionId,
          });
        }
        if (row.subjectTeacherId) {
          addRecipient({
            userId: row.subjectTeacherId,
            courseId: row.courseId,
            classSectionId: row.classSectionId,
          });
        }
      }
    }

    return Array.from(recipients.values());
  }

  async createAnnouncement(input: CreateAnnouncementInput): Promise<AnnouncementResponse> {
    const { courseIds = [], classSectionIds = [], ...announcementData } = input;

    const dedupedCourseIds = uniqueNumbers(courseIds);
    const dedupedClassSectionIds = uniqueNumbers(classSectionIds);

    const [announcement] = await db.insert(announcements).values(announcementData).returning();

    if (!announcement.isGlobal) {
      const targetValues = [
        ...dedupedCourseIds.map((courseId) => ({
          announcementId: announcement.id,
          targetType: "course" as const,
          targetId: courseId,
        })),
        ...dedupedClassSectionIds.map((classSectionId) => ({
          announcementId: announcement.id,
          targetType: "class_section" as const,
          targetId: classSectionId,
        })),
      ];

      if (targetValues.length > 0) {
        await db.insert(announcementTargets).values(targetValues);
      }

      if (dedupedCourseIds.length > 0) {
        await db.insert(announcementCourses).values(
          dedupedCourseIds.map((courseId) => ({
            announcementId: announcement.id,
            courseId,
          })),
        );
      }
    }

    const [author] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, announcement.authorId));

    const recipients = await this.resolveAnnouncementRecipients({
      authorId: announcement.authorId,
      isGlobal: announcement.isGlobal,
      courseIds: dedupedCourseIds,
      classSectionIds: dedupedClassSectionIds,
    });

    await this.createNotificationWithRecipients(
      {
        type: "announcement",
        title: `Novo comunicado: ${announcement.title}`,
        message: truncate(announcement.content),
        senderId: announcement.authorId,
        destinationRoute: `/announcements?announcementId=${announcement.id}`,
        relatedEntityType: "announcement",
        relatedEntityId: announcement.id,
      },
      recipients,
    );

    return {
      ...announcement,
      authorName: author?.name,
      courseIds: announcement.isGlobal ? [] : dedupedCourseIds,
      classSectionIds: announcement.isGlobal ? [] : dedupedClassSectionIds,
    };
  }

  async deleteAnnouncement(id: number): Promise<void> {
    const [existingAnnouncement] = await db
      .select({ id: announcements.id })
      .from(announcements)
      .where(eq(announcements.id, id));

    if (!existingAnnouncement) {
      throw new Error("Comunicado nao encontrado");
    }

    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.relatedEntityType, "announcement"),
          eq(notifications.relatedEntityId, id),
        ),
      );

    await db.delete(announcements).where(eq(announcements.id, id));
  }

  async getMaterialsForUser(user: User): Promise<CourseMaterialResponse[]> {
    const allowedCourseIds = await this.getAllowedCourseIdsForUser(user);
    if (allowedCourseIds.length === 0) return [];

    const allowedSectionIds = new Set(await this.getAllowedClassSectionIdsForUser(user));

    const rows = await db
      .select({
        id: courseMaterials.id,
        originalName: courseMaterials.originalName,
        internalName: courseMaterials.internalName,
        storagePath: courseMaterials.storagePath,
        mimeType: courseMaterials.mimeType,
        sizeBytes: courseMaterials.sizeBytes,
        authorId: courseMaterials.authorId,
        courseId: courseMaterials.courseId,
        classSectionId: courseMaterials.classSectionId,
        issuedAt: courseMaterials.issuedAt,
        createdAt: courseMaterials.createdAt,
        authorName: users.name,
        courseName: courses.name,
        classSectionCode: classSections.code,
        classSectionName: classSections.name,
        isPinned: sql<boolean>`${userPinnedMaterials.id} IS NOT NULL`,
      })
      .from(courseMaterials)
      .innerJoin(users, eq(users.id, courseMaterials.authorId))
      .innerJoin(courses, eq(courses.id, courseMaterials.courseId))
      .leftJoin(classSections, eq(classSections.id, courseMaterials.classSectionId))
      .leftJoin(
        userPinnedMaterials,
        and(
          eq(userPinnedMaterials.materialId, courseMaterials.id),
          eq(userPinnedMaterials.userId, user.id),
        ),
      )
      .where(inArray(courseMaterials.courseId, allowedCourseIds))
      .orderBy(desc(courseMaterials.issuedAt), desc(courseMaterials.createdAt));

    return rows
      .filter((row) => this.canAccessClassSectionForRole(user, row.classSectionId ?? null, allowedSectionIds))
      .map((row) => ({
        id: row.id,
        originalName: row.originalName,
        internalName: row.internalName,
        storagePath: row.storagePath,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        authorId: row.authorId,
        courseId: row.courseId,
        classSectionId: row.classSectionId,
        issuedAt: row.issuedAt,
        createdAt: row.createdAt,
        authorName: row.authorName ?? undefined,
        courseName: row.courseName ?? undefined,
        classSectionCode: row.classSectionCode ?? undefined,
        classSectionName: row.classSectionName ?? undefined,
        isPinned: Boolean(row.isPinned),
      }));
  }

  async getMaterialById(id: number): Promise<CourseMaterial | undefined> {
    const [material] = await db.select().from(courseMaterials).where(eq(courseMaterials.id, id));
    return material;
  }

  async canUserAccessMaterial(user: User, material: CourseMaterial): Promise<boolean> {
    const [allowedCourseIds, allowedSectionIds] = await Promise.all([
      this.getAllowedCourseIdsForUser(user),
      this.getAllowedClassSectionIdsForUser(user),
    ]);

    if (!allowedCourseIds.includes(material.courseId)) return false;

    return this.canAccessClassSectionForRole(
      user,
      material.classSectionId ?? null,
      new Set(allowedSectionIds),
    );
  }

  async createMaterial(material: InsertCourseMaterial): Promise<CourseMaterial> {
    const [createdMaterial] = await db.insert(courseMaterials).values(material).returning();
    return createdMaterial;
  }

  async pinMaterial(userId: number, materialId: number): Promise<void> {
    await db
      .insert(userPinnedMaterials)
      .values({ userId, materialId })
      .onConflictDoNothing();
  }

  async unpinMaterial(userId: number, materialId: number): Promise<void> {
    await db
      .delete(userPinnedMaterials)
      .where(
        and(
          eq(userPinnedMaterials.userId, userId),
          eq(userPinnedMaterials.materialId, materialId),
        ),
      );
  }

  async getNotificationsForUser(userId: number, unreadOnly = false): Promise<NotificationListItem[]> {
    const rows = await db
      .select({
        id: notifications.id,
        userId: notificationRecipients.userId,
        courseId: notificationRecipients.courseId,
        classSectionId: notificationRecipients.classSectionId,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        senderId: notifications.senderId,
        senderName: users.name,
        destinationRoute: notifications.destinationRoute,
        relatedEntityType: notifications.relatedEntityType,
        relatedEntityId: notifications.relatedEntityId,
        isRead: notificationRecipients.isRead,
        readAt: notificationRecipients.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notificationRecipients)
      .innerJoin(notifications, eq(notifications.id, notificationRecipients.notificationId))
      .leftJoin(users, eq(users.id, notifications.senderId))
      .where(
        and(
          eq(notificationRecipients.userId, userId),
          unreadOnly ? eq(notificationRecipients.isRead, false) : undefined,
        ),
      )
      .orderBy(desc(notifications.createdAt));

    return rows.map((row) => ({
      ...row,
      senderName: row.senderName ?? undefined,
    }));
  }

  async markNotificationRead(notificationId: number, userId: number): Promise<void> {
    await db
      .update(notificationRecipients)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notificationRecipients.notificationId, notificationId),
          eq(notificationRecipients.userId, userId),
        ),
      );
  }

  async createPasswordResetRequest(payload: InsertPasswordResetRequest): Promise<PasswordResetRequest> {
    await db
      .update(passwordResetRequests)
      .set({ canceledAt: new Date() })
      .where(
        and(
          eq(passwordResetRequests.userId, payload.userId),
          isNull(passwordResetRequests.usedAt),
          isNull(passwordResetRequests.canceledAt),
          gt(passwordResetRequests.expiresAt, new Date()),
        ),
      );

    const [request] = await db.insert(passwordResetRequests).values(payload).returning();
    return request;
  }

  async getLatestActivePasswordResetRequest(
    userId: number,
    deviceHash: string,
  ): Promise<PasswordResetRequest | undefined> {
    const [request] = await db
      .select()
      .from(passwordResetRequests)
      .where(
        and(
          eq(passwordResetRequests.userId, userId),
          eq(passwordResetRequests.deviceHash, deviceHash),
          isNull(passwordResetRequests.usedAt),
          isNull(passwordResetRequests.canceledAt),
          gt(passwordResetRequests.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(passwordResetRequests.createdAt));

    return request;
  }

  async getPasswordResetById(id: number): Promise<PasswordResetRequest | undefined> {
    const [request] = await db.select().from(passwordResetRequests).where(eq(passwordResetRequests.id, id));
    return request;
  }

  async incrementPasswordResetAttempts(id: number): Promise<void> {
    await db
      .update(passwordResetRequests)
      .set({ attempts: sql`${passwordResetRequests.attempts} + 1` })
      .where(eq(passwordResetRequests.id, id));
  }

  async markPasswordResetUsed(id: number): Promise<void> {
    await db.update(passwordResetRequests).set({ usedAt: new Date() }).where(eq(passwordResetRequests.id, id));
  }

  async cancelPasswordReset(id: number): Promise<void> {
    await db
      .update(passwordResetRequests)
      .set({ canceledAt: new Date() })
      .where(eq(passwordResetRequests.id, id));
  }

  async blockDevice(deviceHash: string, blockedUntil: Date, reason: string): Promise<void> {
    await db
      .insert(blockedDevices)
      .values({ deviceHash, blockedUntil, reason })
      .onConflictDoUpdate({
        target: blockedDevices.deviceHash,
        set: {
          blockedUntil,
          reason,
        },
      });
  }

  async isDeviceBlocked(deviceHash: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(blockedDevices)
      .where(and(eq(blockedDevices.deviceHash, deviceHash), gt(blockedDevices.blockedUntil, new Date())));

    return Boolean(row);
  }
}

export const storage = new DatabaseStorage();
