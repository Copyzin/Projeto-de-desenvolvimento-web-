import type { Express, Request, Response, NextFunction } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { type Server } from "http";
import multer from "multer";
import { z } from "zod";
import { api } from "@shared/routes";
import { User } from "@shared/schema";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import {
  generateCancelToken,
  generateFiveDigitToken,
  hashValue,
  isPasswordStrongEnough,
  normalizeCpf,
} from "./password-reset";
import { sendPasswordResetEmail } from "./notify";

function sanitizeUser(user: User) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function getAuthUser(req: Request) {
  return req.user as User;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Nao autenticado" });
  return next();
}

function requireRoles(...roles: Array<User["role"]>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Nao autenticado" });

    const user = getAuthUser(req);
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    return next();
  };
}

function parseOptionalPositiveInt(value: unknown) {
  if (!value) return undefined;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return undefined;
  return numberValue;
}

async function canTeacherManageCourse(userId: number, courseId: number) {
  const allowedCourses = await storage.getTeacherCourseIds(userId);
  return allowedCourses.includes(courseId);
}

async function canTeacherManageClassSection(userId: number, classSectionId: number) {
  const allowedSections = await storage.getTeacherClassSectionIds(userId);
  return allowedSections.includes(classSectionId);
}

function getFirstZodErrorMessage(error: z.ZodError) {
  return error.errors[0]?.message ?? "Dados invalidos";
}

function handleRouteError(res: Response, error: unknown, internalMessage = "Erro interno do servidor") {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: getFirstZodErrorMessage(error) });
  }

  if (error instanceof Error) {
    if (error.message.includes("nao encontrada")) {
      return res.status(404).json({ message: error.message });
    }

    if (error.message.includes("Turma") || error.message.includes("invalida")) {
      return res.status(400).json({ message: error.message });
    }
  }

  return res.status(500).json({ message: internalMessage });
}

const MATERIAL_UPLOAD_MAX_SIZE = Number(process.env.MATERIAL_UPLOAD_MAX_SIZE_BYTES ?? 15 * 1024 * 1024);
const MATERIAL_STORAGE_DIR = path.resolve(process.cwd(), "storage", "materials");
const allowedMaterialMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "image/png",
  "image/jpeg",
]);

const allowedMaterialExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".zip",
  ".rar",
  ".png",
  ".jpg",
  ".jpeg",
]);

const materialUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MATERIAL_UPLOAD_MAX_SIZE,
  },
});

function sanitizeOriginalFileName(fileName: string) {
  const normalized = fileName.trim().replace(/[\r\n]/g, "");
  return normalized.replace(/[^\w.\-()\s]/g, "_").slice(0, 180) || "arquivo";
}

function buildMaterialApiResponse(material: {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  authorId: number;
  authorName?: string;
  courseId: number;
  courseName?: string;
  classSectionId?: number | null;
  classSectionCode?: string;
  classSectionName?: string;
  issuedAt: Date;
  createdAt: Date;
  isPinned?: boolean;
}) {
  return {
    id: material.id,
    originalName: material.originalName,
    mimeType: material.mimeType,
    sizeBytes: material.sizeBytes,
    authorId: material.authorId,
    authorName: material.authorName,
    courseId: material.courseId,
    courseName: material.courseName,
    classSectionId: material.classSectionId ?? null,
    classSectionCode: material.classSectionCode,
    classSectionName: material.classSectionName,
    issuedAt: material.issuedAt,
    createdAt: material.createdAt,
    isPinned: Boolean(material.isPinned),
    downloadUrl: `/api/materials/${material.id}/download`,
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupAuth(app);
  await seedDatabase();

  app.post(api.auth.changePassword.path, requireAuth, async (req, res) => {
    try {
      const input = api.auth.changePassword.input.parse(req.body);
      const user = getAuthUser(req);

      const fullUser = await storage.getUser(user.id);
      if (!fullUser) return res.status(401).json({ message: "Nao autenticado" });

      const currentMatches = await comparePasswords(input.currentPassword, fullUser.password);
      if (!currentMatches) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }

      if (!isPasswordStrongEnough(input.newPassword)) {
        return res.status(400).json({ message: "Senha fraca. Use pelo menos 8 caracteres e variedade." });
      }

      const passwordHash = await hashPassword(input.newPassword);
      await storage.updateUser(fullUser.id, { password: passwordHash });

      return res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      return handleRouteError(res, error);
    }
  });

  app.post(api.auth.forgotPassword.path, async (req, res) => {
    try {
      const input = api.auth.forgotPassword.input.parse(req.body);
      const deviceHash = hashValue(input.deviceId);

      const blocked = await storage.isDeviceBlocked(deviceHash);
      if (blocked) {
        return res.json({ message: "Se o usuario existir, enviaremos instrucoes por e-mail." });
      }

      const user = await storage.getUserByLoginIdentifier(input.identifier);
      if (!user) {
        return res.json({ message: "Se o usuario existir, enviaremos instrucoes por e-mail." });
      }

      const token = generateFiveDigitToken();
      const cancelToken = generateCancelToken();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const request = await storage.createPasswordResetRequest({
        userId: user.id,
        tokenHash: hashValue(token),
        cancelTokenHash: hashValue(cancelToken),
        requestIp: req.ip,
        deviceHash,
        expiresAt,
      });

      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const cancelUrl = `${appUrl}/reset-password/cancel?requestId=${request.id}&cancelToken=${cancelToken}&deviceId=${encodeURIComponent(
        input.deviceId,
      )}`;

      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        token,
        expiresInMinutes: 10,
        cancelUrl,
      });

      return res.json({ message: "Se o usuario existir, enviaremos instrucoes por e-mail." });
    } catch (error) {
      return handleRouteError(res, error);
    }
  });

  app.post(api.auth.validateResetToken.path, async (req, res) => {
    try {
      const input = api.auth.validateResetToken.input.parse(req.body);
      const deviceHash = hashValue(input.deviceId);

      if (await storage.isDeviceBlocked(deviceHash)) {
        return res.json({ valid: false });
      }

      const user = await storage.getUserByLoginIdentifier(input.identifier);
      if (!user) return res.json({ valid: false });

      const request = await storage.getLatestActivePasswordResetRequest(user.id, deviceHash);
      if (!request) return res.json({ valid: false });

      const incomingHash = hashValue(input.token);
      if (incomingHash !== request.tokenHash) {
        await storage.incrementPasswordResetAttempts(request.id);

        if ((request.attempts ?? 0) + 1 >= 5) {
          await storage.cancelPasswordReset(request.id);
          await storage.blockDevice(deviceHash, new Date(Date.now() + 24 * 60 * 60 * 1000), "Muitas tentativas de token");
        }

        return res.json({ valid: false });
      }

      return res.json({ valid: true });
    } catch (error) {
      return handleRouteError(res, error);
    }
  });

  app.post(api.auth.resetPassword.path, async (req, res) => {
    try {
      const input = api.auth.resetPassword.input.parse(req.body);
      const deviceHash = hashValue(input.deviceId);

      if (await storage.isDeviceBlocked(deviceHash)) {
        return res.status(403).json({ message: "Dispositivo bloqueado para redefinicao" });
      }

      const user = await storage.getUserByLoginIdentifier(input.identifier);
      if (!user) {
        return res.status(400).json({ message: "Token invalido ou expirado" });
      }

      const request = await storage.getLatestActivePasswordResetRequest(user.id, deviceHash);
      if (!request) {
        return res.status(400).json({ message: "Token invalido ou expirado" });
      }

      const tokenMatches = hashValue(input.token) === request.tokenHash;
      if (!tokenMatches) {
        await storage.incrementPasswordResetAttempts(request.id);

        if ((request.attempts ?? 0) + 1 >= 5) {
          await storage.cancelPasswordReset(request.id);
          await storage.blockDevice(deviceHash, new Date(Date.now() + 24 * 60 * 60 * 1000), "Muitas tentativas de token");
        }

        return res.status(400).json({ message: "Token invalido" });
      }

      if (!isPasswordStrongEnough(input.newPassword)) {
        return res.status(400).json({ message: "Senha fraca. Reforce a senha." });
      }

      const hashedPassword = await hashPassword(input.newPassword);
      await storage.updateUser(user.id, { password: hashedPassword });
      await storage.markPasswordResetUsed(request.id);

      return res.json({ message: "Senha redefinida com sucesso" });
    } catch (error) {
      return handleRouteError(res, error);
    }
  });

  app.post(api.auth.cancelPasswordReset.path, async (req, res) => {
    try {
      const input = api.auth.cancelPasswordReset.input.parse(req.body);
      const request = await storage.getPasswordResetById(input.requestId);

      if (!request) {
        return res.json({ message: "Solicitacao cancelada com seguranca" });
      }

      if (request.canceledAt || request.usedAt) {
        return res.json({ message: "Solicitacao cancelada com seguranca" });
      }

      if (hashValue(input.cancelToken) !== request.cancelTokenHash) {
        return res.status(400).json({ message: "Token de cancelamento invalido" });
      }

      await storage.cancelPasswordReset(request.id);
      await storage.blockDevice(
        request.deviceHash,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        "Usuario cancelou redefinicao de senha",
      );

      return res.json({ message: "Solicitacao cancelada e dispositivo bloqueado" });
    } catch (error) {
      return handleRouteError(res, error);
    }
  });

  app.get(api.users.list.path, requireAuth, async (req, res) => {
    const user = getAuthUser(req);

    if (user.role === "student") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const role = req.query.role as "admin" | "teacher" | "student" | undefined;
    if (user.role === "teacher" && role && role !== "student") {
      return res.status(403).json({ message: "Professor pode listar apenas alunos" });
    }

    const users = await storage.getUsers(role);
    return res.json(users.map((entry) => sanitizeUser(entry)));
  });

  app.post(api.users.updateAvatar.path, requireAuth, async (req, res) => {
    try {
      const input = api.users.updateAvatar.input.parse(req.body);
      const user = getAuthUser(req);

      if (input.avatarUrl.length > 2_000_000) {
        return res.status(400).json({ message: "Imagem excede tamanho maximo permitido" });
      }

      const updatedUser = await storage.updateUser(user.id, { avatarUrl: input.avatarUrl });
      return res.json(sanitizeUser(updatedUser));
    } catch (error) {
      return handleRouteError(res, error);
    }
  });

  app.get(api.students.scope.path, requireAuth, async (req, res) => {
    const user = getAuthUser(req);

    if (user.role === "student") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const scope = await storage.getStudentScope(user);
    return res.json(scope);
  });

  app.get(api.students.list.path, requireAuth, async (req, res) => {
    const user = getAuthUser(req);

    if (user.role === "student") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const input = api.students.list.input.parse(req.query);

    if (user.role === "teacher" && !input?.classSectionId) {
      return res.status(400).json({ message: "Professor deve selecionar turma para listar alunos" });
    }

    const students = await storage.getStudentsByScope(user, input);
    return res.json(students);
  });

  app.post(api.students.enroll.path, requireRoles("admin"), async (req, res) => {
    try {
      const input = api.students.enroll.input.parse(req.body);

      const temporaryPassword = generateCancelToken().slice(0, 12);
      const passwordHash = await hashPassword(temporaryPassword);

      const student = await storage.createUser({
        username: normalizeCpf(input.cpf),
        password: passwordHash,
        role: "student",
        name: input.name,
        cpf: normalizeCpf(input.cpf),
        phone: input.phone,
        email: input.email,
        avatarUrl: null,
      });

      const enrollment = await storage.createEnrollment({
        studentId: student.id,
        courseId: input.courseId,
        classSectionId: input.classSectionId,
        grade: null,
        attendance: 0,
        status: "active",
      });

      return res.status(201).json({
        user: sanitizeUser(student),
        enrollment,
      });
    } catch (error) {
      return handleRouteError(res, error, "Nao foi possivel matricular o aluno");
    }
  });

  app.post(api.students.lockEnrollment.path, requireRoles("admin"), async (req, res) => {
    try {
      const enrollmentId = Number(req.params.id);
      if (!Number.isFinite(enrollmentId)) {
        return res.status(400).json({ message: "Matricula invalida" });
      }

      const input = api.students.lockEnrollment.input.parse(req.body);
      const user = getAuthUser(req);

      const result = await storage.lockEnrollment({
        enrollmentId,
        changedByUserId: user.id,
        reason: input.reason,
        approvedSubjectIds: input.approvedSubjectIds,
      });

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Matricula nao encontrada")) {
        return res.status(404).json({ message: error.message });
      }
      return handleRouteError(res, error, "Nao foi possivel trancar a matricula");
    }
  });

  app.get(api.courses.list.path, requireAuth, async (req, res) => {
    const user = getAuthUser(req);
    const courses = await storage.getCoursesForUser(user);
    return res.json(courses);
  });

  app.get(api.courses.get.path, requireAuth, async (req, res) => {
    const courseId = Number(req.params.id);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ message: "Curso invalido" });
    }

    const user = getAuthUser(req);
    if (user.role !== "admin") {
      const allowedCourses = await storage.getCoursesForUser(user);
      if (!allowedCourses.some((course) => course.id === courseId)) {
        return res.status(403).json({ message: "Acesso negado ao curso solicitado" });
      }
    }

    const course = await storage.getCourse(courseId);
    if (!course) return res.status(404).json({ message: "Curso nao encontrado" });

    return res.json(course);
  });

  app.post(api.courses.create.path, requireRoles("admin"), async (req, res) => {
    try {
      const input = api.courses.create.input.parse(req.body);
      const course = await storage.createCourse({
        name: input.name,
        description: input.description,
      });

      return res.status(201).json(course);
    } catch (error) {
      return handleRouteError(res, error, "Erro ao criar curso");
    }
  });

  app.patch(api.courses.update.path, requireRoles("admin"), async (req, res) => {
    try {
      const courseId = Number(req.params.id);
      if (!Number.isFinite(courseId)) {
        return res.status(400).json({ message: "Curso invalido" });
      }

      const input = api.courses.update.input.parse(req.body);
      const course = await storage.updateCourse(courseId, input);
      return res.json(course);
    } catch (error) {
      return handleRouteError(res, error, "Erro ao atualizar curso");
    }
  });

  app.get(api.subjects.list.path, requireAuth, async (_req, res) => {
    const subjects = await storage.getSubjects();
    return res.json(subjects);
  });

  app.post(api.subjects.create.path, requireRoles("admin"), async (req, res) => {
    try {
      const input = api.subjects.create.input.parse(req.body);
      const subject = await storage.createSubject(input);
      return res.status(201).json(subject);
    } catch (error) {
      return handleRouteError(res, error, "Erro ao criar materia");
    }
  });

  app.get(api.courses.subjects.list.path, requireAuth, async (req, res) => {
    const courseId = Number(req.params.id);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ message: "Curso invalido" });
    }

    const user = getAuthUser(req);
    if (user.role !== "admin") {
      const allowedCourses = await storage.getCoursesForUser(user);
      if (!allowedCourses.some((course) => course.id === courseId)) {
        return res.status(403).json({ message: "Acesso negado ao curso solicitado" });
      }
    }

    const classSectionId = parseOptionalPositiveInt(req.query.classSectionId);
    let currentStageNumber: number | undefined;
    if (classSectionId) {
      const sections = await storage.getClassSectionsForUser(user, courseId);
      const section = sections.find((entry) => entry.id === classSectionId);
      if (!section) return res.status(403).json({ message: "Acesso negado a turma solicitada" });
      currentStageNumber = section.currentStageNumber;
    }

    const subjects = await storage.getCourseSubjects(courseId, classSectionId, currentStageNumber);
    return res.json(subjects);
  });

  app.put(api.courses.subjects.update.path, requireRoles("admin"), async (req, res) => {
    try {
      const courseId = Number(req.params.id);
      if (!Number.isFinite(courseId)) {
        return res.status(400).json({ message: "Curso invalido" });
      }

      const input = api.courses.subjects.update.input.parse(req.body);
      await storage.setCourseSubjects(courseId, input.subjectIds, input.stageNumbers);
      return res.json({ message: "Grade curricular atualizada" });
    } catch (error) {
      return handleRouteError(res, error, "Erro ao atualizar grade");
    }
  });

  app.get(api.enrollments.list.path, requireAuth, async (req, res) => {
    const user = getAuthUser(req);

    const requestedCourseId = parseOptionalPositiveInt(req.query.courseId);
    const requestedStudentId = parseOptionalPositiveInt(req.query.studentId);

    let studentId = requestedStudentId;
    if (user.role === "student") {
      studentId = user.id;
    }

    if (user.role === "teacher" && requestedCourseId) {
      const teacherCanManage = await canTeacherManageCourse(user.id, requestedCourseId);
      if (!teacherCanManage) {
        return res.status(403).json({ message: "Professor nao possui acesso a este curso" });
      }
    }

    let enrollments = await storage.getEnrollments(requestedCourseId, studentId);

    if (user.role === "teacher") {
      const [teacherCourseIds, teacherClassSectionIds] = await Promise.all([
        storage.getTeacherCourseIds(user.id),
        storage.getTeacherClassSectionIds(user.id),
      ]);
      const courseSet = new Set(teacherCourseIds);
      const sectionSet = new Set(teacherClassSectionIds);
      enrollments = enrollments.filter(
        (entry) =>
          courseSet.has(entry.courseId) &&
          (!entry.classSectionId || sectionSet.size === 0 || sectionSet.has(entry.classSectionId)),
      );
    }

    return res.json(enrollments);
  });

  app.post(api.enrollments.create.path, requireRoles("admin"), async (req, res) => {
    try {
      const input = api.enrollments.create.input.parse(req.body);
      const enrollment = await storage.createEnrollment({
        studentId: input.studentId,
        courseId: input.courseId,
        classSectionId: input.classSectionId,
        academicTermId: input.academicTermId,
        grade: input.grade ?? null,
        attendance: input.attendance ?? 0,
        status: "active",
      });

      return res.status(201).json(enrollment);
    } catch (error) {
      return handleRouteError(res, error, "Erro ao criar matricula");
    }
  });

  app.patch(api.enrollments.update.path, requireRoles("teacher"), async (req, res) => {
    try {
      const enrollmentId = Number(req.params.id);
      if (!Number.isFinite(enrollmentId)) {
        return res.status(400).json({ message: "Matricula invalida" });
      }

      const user = getAuthUser(req);
      const existingEnrollment = await storage.getEnrollmentById(enrollmentId);
      if (!existingEnrollment) {
        return res.status(404).json({ message: "Matricula nao encontrada" });
      }

      if (user.role === "teacher") {
        const hasCourseAccess = await canTeacherManageCourse(user.id, existingEnrollment.courseId);
        const hasSectionAccess = existingEnrollment.classSectionId
          ? await canTeacherManageClassSection(user.id, existingEnrollment.classSectionId)
          : true;

        if (!hasCourseAccess || !hasSectionAccess) {
          return res.status(403).json({ message: "Professor nao possui acesso para editar esta matricula" });
        }
      }

      const input = api.enrollments.update.input.parse(req.body);
      const enrollment = await storage.updateEnrollment(
        enrollmentId,
        input,
        user.id,
        "Atualizacao de matricula via painel",
      );
      return res.json(enrollment);
    } catch (error) {
      return handleRouteError(res, error, "Erro ao atualizar matricula");
    }
  });

  app.get(api.announcements.list.path, requireAuth, async (req, res) => {
    const user = getAuthUser(req);
    const courseId = parseOptionalPositiveInt(req.query.courseId);
    const classSectionId = parseOptionalPositiveInt(req.query.classSectionId);

    const announcements = await storage.getAnnouncementsForUser(user, courseId, classSectionId);
    return res.json(announcements);
  });

  app.post(api.announcements.create.path, requireRoles("admin", "teacher"), async (req, res) => {
    try {
      const user = getAuthUser(req);
      const input = api.announcements.create.input.parse(req.body);

      if (
        !input.isGlobal &&
        (!input.courseIds || input.courseIds.length === 0) &&
        (!input.classSectionIds || input.classSectionIds.length === 0)
      ) {
        return res.status(400).json({ message: "Selecione ao menos um curso ou turma para anuncio direcionado" });
      }

      if (user.role === "teacher" && input.isGlobal) {
        return res.status(403).json({ message: "Professor nao pode publicar comunicado global" });
      }

      const dedupedCourseIds = Array.from(new Set(input.courseIds ?? []));
      const dedupedClassSectionIds = Array.from(new Set(input.classSectionIds ?? []));

      if (user.role === "teacher") {
        const [teacherCourseIds, teacherSectionIds] = await Promise.all([
          storage.getTeacherCourseIds(user.id),
          storage.getTeacherClassSectionIds(user.id),
        ]);

        const teacherCourseSet = new Set(teacherCourseIds);
        const teacherSectionSet = new Set(teacherSectionIds);

        const hasInvalidCourse = dedupedCourseIds.some((courseId) => !teacherCourseSet.has(courseId));
        const hasInvalidSection = dedupedClassSectionIds.some((sectionId) => !teacherSectionSet.has(sectionId));

        if (hasInvalidCourse || hasInvalidSection) {
          return res
            .status(403)
            .json({ message: "Professor so pode publicar comunicado em cursos/turmas sob sua responsabilidade" });
        }
      }

      const announcement = await storage.createAnnouncement({
        title: input.title,
        content: input.content,
        authorId: user.id,
        isGlobal: input.isGlobal,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        courseIds: input.isGlobal ? [] : dedupedCourseIds,
        classSectionIds: input.isGlobal ? [] : dedupedClassSectionIds,
      });

      return res.status(201).json(announcement);
    } catch (error) {
      return handleRouteError(res, error, "Erro ao criar comunicado");
    }
  });

  app.delete(api.announcements.remove.path, requireRoles("admin", "teacher"), async (req, res) => {
    try {
      const announcementId = Number(req.params.id);
      if (!Number.isFinite(announcementId)) {
        return res.status(400).json({ message: "Comunicado invalido" });
      }

      const user = getAuthUser(req);
      const announcement = await storage.getAnnouncementById(announcementId);
      if (!announcement) {
        return res.status(404).json({ message: "Comunicado nao encontrado" });
      }

      if (user.role === "teacher") {
        if (announcement.isGlobal) {
          return res.status(403).json({ message: "Professor nao pode excluir comunicado global" });
        }

        const [teacherCourseIds, teacherSectionIds] = await Promise.all([
          storage.getTeacherCourseIds(user.id),
          storage.getTeacherClassSectionIds(user.id),
        ]);

        const teacherCourseSet = new Set(teacherCourseIds);
        const teacherSectionSet = new Set(teacherSectionIds);

        const hasInvalidCourse = (announcement.courseIds ?? []).some((courseId) => !teacherCourseSet.has(courseId));
        const hasInvalidSection = (announcement.classSectionIds ?? []).some(
          (sectionId) => !teacherSectionSet.has(sectionId),
        );

        if (hasInvalidCourse || hasInvalidSection) {
          return res.status(403).json({ message: "Professor so pode excluir comunicados do proprio escopo" });
        }
      }

      await storage.deleteAnnouncement(announcementId);
      return res.json({ message: "Comunicado excluido com sucesso" });
    } catch (error) {
      return handleRouteError(res, error, "Erro ao excluir comunicado");
    }
  });

  app.get(api.materials.list.path, requireRoles("student", "teacher"), async (req, res) => {
    try {
      const user = getAuthUser(req);
      const materials = await storage.getMaterialsForUser(user);
      return res.json(materials.map((material) => buildMaterialApiResponse(material)));
    } catch (error) {
      return handleRouteError(res, error, "Erro ao listar materiais");
    }
  });

  app.post(api.materials.upload.path, requireRoles("teacher"), (req, res) => {
    materialUpload.single("file")(req, res, async (uploadError) => {
      if (uploadError instanceof multer.MulterError) {
        if (uploadError.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "Arquivo excede o tamanho maximo permitido" });
        }
        return res.status(400).json({ message: "Falha no upload do arquivo" });
      }

      if (uploadError) {
        return handleRouteError(res, uploadError, "Erro ao enviar material");
      }

      try {
        const user = getAuthUser(req);
        const input = api.materials.upload.input.parse(req.body);
        const file = req.file;

        if (!file) {
          return res.status(400).json({ message: "Arquivo obrigatorio" });
        }

        const originalName = sanitizeOriginalFileName(file.originalname);
        const fileExtension = path.extname(originalName).toLowerCase();

        if (!allowedMaterialMimeTypes.has(file.mimetype) || !allowedMaterialExtensions.has(fileExtension)) {
          return res.status(400).json({ message: "Tipo de arquivo nao permitido" });
        }

        const canManageSection = await canTeacherManageClassSection(user.id, input.classSectionId);
        if (!canManageSection) {
          return res.status(403).json({ message: "Professor nao possui acesso para enviar arquivo nesta turma" });
        }

        const allowedSections = await storage.getClassSectionsForUser(user);
        const selectedSection = allowedSections.find((section) => section.id === input.classSectionId);
        const allowedCourses = await storage.getCoursesForUser(user);
        const selectedCourse = allowedCourses.find((course) => course.id === selectedSection?.courseId);

        if (!selectedSection) {
          return res.status(403).json({ message: "Turma invalida para upload" });
        }

        await fs.mkdir(MATERIAL_STORAGE_DIR, { recursive: true });

        const internalName = `${Date.now()}-${randomUUID()}${fileExtension}`;
        const storagePath = path.join("materials", internalName);
        const absolutePath = path.join(MATERIAL_STORAGE_DIR, internalName);
        await fs.writeFile(absolutePath, file.buffer);

        const createdMaterial = await storage.createMaterial({
          originalName,
          internalName,
          storagePath,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          authorId: user.id,
          courseId: selectedSection.courseId,
          classSectionId: selectedSection.id,
          issuedAt: input.issuedAt ? new Date(input.issuedAt) : new Date(),
        });

        const response = buildMaterialApiResponse({
          ...createdMaterial,
          authorName: user.name,
          courseName: selectedCourse?.name,
          classSectionCode: selectedSection.code,
          classSectionName: selectedSection.name,
          isPinned: false,
        });

        return res.status(201).json(response);
      } catch (error) {
        return handleRouteError(res, error, "Erro ao enviar material");
      }
    });
  });

  app.get(api.materials.download.path, requireRoles("student", "teacher"), async (req, res) => {
    try {
      const materialId = Number(req.params.id);
      if (!Number.isFinite(materialId)) {
        return res.status(400).json({ message: "Material invalido" });
      }

      const user = getAuthUser(req);
      const material = await storage.getMaterialById(materialId);
      if (!material) {
        return res.status(404).json({ message: "Material nao encontrado" });
      }

      const authorized = await storage.canUserAccessMaterial(user, material);
      if (!authorized) {
        return res.status(403).json({ message: "Acesso negado ao material solicitado" });
      }

      const safeInternalName = path.basename(material.internalName);
      const absolutePath = path.resolve(MATERIAL_STORAGE_DIR, safeInternalName);

      if (!absolutePath.startsWith(MATERIAL_STORAGE_DIR)) {
        return res.status(403).json({ message: "Caminho de arquivo invalido" });
      }

      await fs.access(absolutePath);
      return res.download(absolutePath, material.originalName);
    } catch (error) {
      if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
        return res.status(404).json({ message: "Arquivo nao encontrado no storage" });
      }

      return handleRouteError(res, error, "Erro ao baixar material");
    }
  });

  app.post(api.materials.pin.path, requireRoles("student", "teacher"), async (req, res) => {
    try {
      const materialId = Number(req.params.id);
      if (!Number.isFinite(materialId)) {
        return res.status(400).json({ message: "Material invalido" });
      }

      const user = getAuthUser(req);
      const material = await storage.getMaterialById(materialId);
      if (!material) {
        return res.status(404).json({ message: "Material nao encontrado" });
      }

      const authorized = await storage.canUserAccessMaterial(user, material);
      if (!authorized) {
        return res.status(403).json({ message: "Acesso negado ao material solicitado" });
      }

      await storage.pinMaterial(user.id, materialId);
      return res.json({ message: "Material fixado com sucesso" });
    } catch (error) {
      return handleRouteError(res, error, "Erro ao fixar material");
    }
  });

  app.delete(api.materials.unpin.path, requireRoles("student", "teacher"), async (req, res) => {
    try {
      const materialId = Number(req.params.id);
      if (!Number.isFinite(materialId)) {
        return res.status(400).json({ message: "Material invalido" });
      }

      const user = getAuthUser(req);
      const material = await storage.getMaterialById(materialId);
      if (!material) {
        return res.status(404).json({ message: "Material nao encontrado" });
      }

      const authorized = await storage.canUserAccessMaterial(user, material);
      if (!authorized) {
        return res.status(403).json({ message: "Acesso negado ao material solicitado" });
      }

      await storage.unpinMaterial(user.id, materialId);
      return res.json({ message: "Material desfixado com sucesso" });
    } catch (error) {
      return handleRouteError(res, error, "Erro ao desfixar material");
    }
  });

  app.get(api.notifications.list.path, requireAuth, async (req, res) => {
    const user = getAuthUser(req);
    const unreadOnly = String(req.query.unreadOnly ?? "").toLowerCase() === "true";
    const notifications = await storage.getNotificationsForUser(user.id, unreadOnly);
    return res.json(notifications);
  });

  app.post(api.notifications.markRead.path, requireAuth, async (req, res) => {
    const notificationId = Number(req.params.id);
    if (!Number.isFinite(notificationId)) {
      return res.status(400).json({ message: "Notificacao invalida" });
    }

    const user = getAuthUser(req);
    await storage.markNotificationRead(notificationId, user.id);
    return res.json({ message: "Notificacao marcada como lida" });
  });

  app.get(api.dashboard.get.path, requireAuth, async (req, res) => {
    const user = getAuthUser(req);

    if (user.role === "admin") {
      const [allCourses, allEnrollments, announcements, students] = await Promise.all([
        storage.getCourses(),
        storage.getEnrollments(),
        storage.getAnnouncementsForUser(user),
        storage.getUsers("student"),
      ]);

      const activeStudents = students.length;
      const estimatedRevenue = activeStudents * 850;
      const avgAbsences =
        allEnrollments.length > 0
          ? Math.round(
              allEnrollments.reduce((sum, item) => sum + (item.attendance ?? 0), 0) / allEnrollments.length,
            )
          : 0;

      return res.json({
        role: user.role,
        cards: [
          { label: "Feedback financeiro", value: `R$ ${estimatedRevenue.toLocaleString("pt-BR")}` },
          { label: "Faltas medias", value: String(avgAbsences) },
          { label: "Cursos ativos", value: String(allCourses.length) },
          { label: "Comunicados ativos", value: String(announcements.length) },
        ],
      });
    }

    if (user.role === "teacher") {
      const [teacherCourses, allEnrollments, announcements] = await Promise.all([
        storage.getCoursesForUser(user),
        storage.getEnrollments(),
        storage.getAnnouncementsForUser(user),
      ]);
      const teacherCourseIds = new Set(teacherCourses.map((course) => course.id));

      let gradeSum = 0;
      let gradeCount = 0;
      let teacherEnrollmentCount = 0;

      for (const enrollment of allEnrollments) {
        if (!teacherCourseIds.has(enrollment.courseId)) continue;
        teacherEnrollmentCount += 1;

        if (typeof enrollment.grade === "number") {
          gradeSum += enrollment.grade;
          gradeCount += 1;
        }
      }

      const avgGrade = gradeCount > 0 ? Number((gradeSum / gradeCount).toFixed(1)) : 0;

      return res.json({
        role: user.role,
        cards: [
          { label: "Turmas vinculadas", value: String(teacherCourses.length) },
          { label: "Alunos acompanhados", value: String(teacherEnrollmentCount) },
          { label: "Media de notas (0-10)", value: String(avgGrade) },
          { label: "Comunicados", value: String(announcements.length) },
        ],
      });
    }

    const [studentEnrollments, announcements] = await Promise.all([
      storage.getEnrollments(undefined, user.id),
      storage.getAnnouncementsForUser(user),
    ]);

    const topGrade = Math.max(...studentEnrollments.map((item) => item.grade ?? 0), 0);
    const avgAbsences =
      studentEnrollments.length > 0
        ? Math.round(
            studentEnrollments.reduce((sum, item) => sum + (item.attendance ?? 0), 0) / studentEnrollments.length,
          )
        : 0;

    return res.json({
      role: user.role,
      cards: [
        { label: "Turmas cadastradas", value: String(studentEnrollments.length) },
        { label: "Faltas medias", value: String(avgAbsences) },
        { label: "Melhor nota (0-10)", value: String(topGrade) },
        { label: "Comunicados", value: String(announcements.length) },
      ],
    });
  });

  return httpServer;
}
