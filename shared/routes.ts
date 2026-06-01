import { z } from "zod";

const roleSchema = z.enum(["admin", "teacher", "student"]);
const enrollmentStatusSchema = z.enum(["active", "completed", "dropped", "locked", "canceled"]);
const notificationTypeSchema = z.enum(["announcement", "finance", "academic", "system"]);
const classPeriodSchema = z.enum(["matutino", "vespertino", "noturno"]);
const lessonDaySchema = z.enum(["monday", "tuesday", "wednesday", "thursday", "friday"]);
const lessonNumberSchema = z.coerce.number().int().min(1).max(4);
const decimalGradeSchema = z
  .coerce
  .number()
  .min(0)
  .max(10)
  .refine((value) => Number.isFinite(value) && Math.round(value * 100) / 100 === value, {
    message: "Nota deve ter no maximo duas casas decimais",
  });

export const userPreferencesSchema = z.object({
  background: z.enum(["default", "calm-waves", "school-icons"]).default("calm-waves"),
  highContrast: z.boolean().default(false),
  largeText: z.boolean().default(false),
});

export const userPublicSchema = z.object({
  id: z.number(),
  ra: z.string(),
  username: z.string().nullable().optional(),
  role: roleSchema,
  name: z.string(),
  nickname: z.string().nullable().optional(),
  cpf: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().email(),
  avatarUrl: z.string().nullable().optional(),
  preferences: userPreferencesSchema.nullable().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

export const courseSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  classSectionCount: z.number().optional(),
  createdAt: z.string().or(z.date()).optional(),
});

export const subjectSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  workloadHours: z.number(),
  stageNumber: z.number().optional(),
  teacherNames: z.array(z.string()).optional(),
  academicStatus: z.enum(["Aprovado", "Cursando", "A cursar", "Reprovado"]).optional(),
  createdAt: z.string().or(z.date()).optional(),
});

export const classSectionSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  courseId: z.number(),
  academicTermId: z.number(),
  academicTermCode: z.string(),
  period: classPeriodSchema,
  currentStageNumber: z.number(),
  courseMaxStage: z.number().optional(),
  coordinatorTeacherId: z.number().nullable().optional(),
  coordinatorTeacherName: z.string().optional(),
});

export const academicTermSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  startsAt: z.string().or(z.date()),
  endsAt: z.string().or(z.date()),
  isActive: z.boolean(),
  createdAt: z.string().or(z.date()).optional(),
});

export const lessonLocationSchema = z.object({
  id: z.number(),
  name: z.string(),
  blockCount: z.number().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

export const lessonScheduleBlockInputSchema = z.object({
  clientId: z.string().min(1),
  subjectId: z.coerce.number().int().positive(),
  teacherId: z.coerce.number().int().positive(),
  locationId: z.coerce.number().int().positive(),
});

export const lessonScheduleSlotInputSchema = z.object({
  dayOfWeek: lessonDaySchema,
  lessonNumber: lessonNumberSchema,
  blockClientId: z.string().min(1),
});

export const lessonScheduleDraftPayloadSchema = z.object({
  period: classPeriodSchema,
  blocks: z.array(lessonScheduleBlockInputSchema),
  slots: z.array(lessonScheduleSlotInputSchema),
});

export const lessonScheduleBlockSchema = z.object({
  id: z.number(),
  scheduleId: z.number(),
  subjectId: z.number(),
  teacherId: z.number(),
  locationId: z.number(),
  subjectName: z.string(),
  subjectWorkloadHours: z.number(),
  teacherName: z.string(),
  locationName: z.string(),
  clientId: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

export const lessonScheduleSlotSchema = z.object({
  dayOfWeek: lessonDaySchema,
  lessonNumber: z.number(),
  blockId: z.number(),
});

export const lessonScheduleSchema = z.object({
  id: z.number(),
  classSectionId: z.number(),
  academicTermId: z.number(),
  period: classPeriodSchema,
  createdByUserId: z.number().nullable().optional(),
  updatedByUserId: z.number().nullable().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
  blocks: z.array(lessonScheduleBlockSchema),
  slots: z.array(lessonScheduleSlotSchema),
});

export const lessonScheduleDraftSchema = z.object({
  id: z.number(),
  classSectionId: z.number(),
  academicTermId: z.number(),
  userId: z.number(),
  period: classPeriodSchema,
  draftPayload: lessonScheduleDraftPayloadSchema,
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

export const enrollmentSchema = z.object({
  id: z.number(),
  studentId: z.number(),
  courseId: z.number(),
  status: enrollmentStatusSchema,
  classSectionId: z.number().nullable().optional(),
  academicTermId: z.number().nullable().optional(),
  classSectionCode: z.string().optional(),
  classSectionName: z.string().optional(),
  academicTermCode: z.string().optional(),
  classSectionCurrentStageNumber: z.number().optional(),
  classSectionPeriod: classPeriodSchema.optional(),
  coordinatorTeacherName: z.string().optional(),
  enrolledAt: z.string().or(z.date()).optional(),
  createdAt: z.string().or(z.date()).optional(),
  grade: z.number().nullable().optional(),
  attendance: z.number().nullable().optional(),
  studentName: z.string().optional(),
  studentEmail: z.string().optional(),
  studentRa: z.string().optional(),
  courseName: z.string().optional(),
});

export const announcementSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  authorId: z.number(),
  authorName: z.string().optional(),
  isGlobal: z.boolean(),
  expiresAt: z.string().or(z.date()).nullable().optional(),
  createdAt: z.string().or(z.date()).optional(),
  courseIds: z.array(z.number()).optional(),
  classSectionIds: z.array(z.number()).optional(),
});

export const notificationSchema = z.object({
  id: z.number(),
  type: notificationTypeSchema,
  title: z.string(),
  message: z.string(),
  senderId: z.number().nullable().optional(),
  senderName: z.string().optional(),
  destinationRoute: z.string(),
  relatedEntityType: z.string().nullable().optional(),
  relatedEntityId: z.number().nullable().optional(),
  isRead: z.boolean(),
  createdAt: z.string().or(z.date()),
});

export const materialSchema = z.object({
  id: z.number(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  authorId: z.number(),
  authorName: z.string().optional(),
  courseId: z.number(),
  courseName: z.string().optional(),
  classSectionId: z.number().nullable().optional(),
  classSectionCode: z.string().optional(),
  classSectionName: z.string().optional(),
  issuedAt: z.string().or(z.date()),
  createdAt: z.string().or(z.date()),
  isPinned: z.boolean(),
  downloadUrl: z.string(),
});

export const studentListSchema = userPublicSchema.extend({
  enrollmentId: z.number(),
  enrollmentStatus: enrollmentStatusSchema,
  courseId: z.number(),
  courseCode: z.string(),
  courseName: z.string(),
  classSectionId: z.number().nullable(),
  classSectionCode: z.string().optional(),
  classSectionName: z.string().optional(),
  academicTermId: z.number().nullable().optional(),
  academicTermCode: z.string().optional(),
});

export const studentScopeSchema = z.object({
  courses: z.array(
    z.object({
      id: z.number(),
      code: z.string(),
      name: z.string(),
    }),
  ),
  classSections: z.array(classSectionSchema),
});

export const financeBoletoStatusSchema = z.enum(["aberto", "pago", "vencido"]);

export const financeBoletoSchema = z.object({
  id: z.string(),
  competence: z.string(),
  referenceLabel: z.string(),
  description: z.string(),
  dueDate: z.string(),
  baseCents: z.number(),
  discountPercent: z.number(),
  discountCents: z.number(),
  status: financeBoletoStatusSchema,
  paidAt: z.string().nullable(),
  paidAmountCents: z.number().nullable(),
  lateFeePerDayCents: z.number(),
  daysOverdue: z.number(),
  lateFeeCents: z.number(),
  amountDueCents: z.number(),
  receiptNumber: z.string().nullable(),
  linhaDigitavel: z.string(),
  barcodePayload: z.string(),
});

export const financeTotalsSchema = z.object({
  emAbertoCents: z.number(),
  vencidoCents: z.number(),
  multaCents: z.number(),
  pagoCents: z.number(),
  proximoVencimento: z.string().nullable(),
  situacao: z.enum(["em_dia", "inadimplente"]),
});

export const financePayerSchema = z.object({
  name: z.string(),
  ra: z.string(),
  courseName: z.string().nullable().optional(),
  academicTermCode: z.string().nullable().optional(),
});

export const financeInstitutionSchema = z.object({
  name: z.string(),
  cnpj: z.string(),
  beneficiary: z.string(),
  agency: z.string(),
  account: z.string(),
});

export const financeSummarySchema = z.object({
  payer: financePayerSchema,
  institution: financeInstitutionSchema,
  totals: financeTotalsSchema,
  boletos: z.array(financeBoletoSchema),
  lateFeePerDayCents: z.number(),
});

export const financeAdminRowSchema = z.object({
  studentId: z.number(),
  name: z.string(),
  ra: z.string(),
  courseName: z.string().nullable().optional(),
  totals: financeTotalsSchema,
  boletos: z.array(financeBoletoSchema),
});

export const financeAdminOverviewSchema = z.object({
  institution: financeInstitutionSchema,
  aggregates: z.object({
    studentCount: z.number(),
    emitidoCents: z.number(),
    recebidoCents: z.number(),
    emAbertoCents: z.number(),
    vencidoCents: z.number(),
    multaCents: z.number(),
    inadimplentes: z.number(),
  }),
  rows: z.array(financeAdminRowSchema),
});

export type FinanceBoletoResponse = z.infer<typeof financeBoletoSchema>;
export type FinanceSummaryResponse = z.infer<typeof financeSummarySchema>;
export type FinanceAdminOverviewResponse = z.infer<typeof financeAdminOverviewSchema>;

export const errorSchemas = {
  validation: z.object({ message: z.string() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  forbidden: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: "POST" as const,
      path: "/api/login" as const,
      input: z.object({
        identifier: z.string().min(1, "Informe R.A, CPF ou e-mail"),
        password: z.string().min(1, "Informe a senha"),
      }),
      responses: {
        200: userPublicSchema,
        401: errorSchemas.unauthorized,
      },
    },
    changePassword: {
      method: "POST" as const,
      path: "/api/change-password" as const,
      input: z
        .object({
          currentPassword: z.string().min(1, "Senha atual obrigatoria"),
          newPassword: z.string().min(8, "Nova senha deve ter no minimo 8 caracteres"),
          confirmPassword: z.string().min(1, "Confirme a nova senha"),
        })
        .refine((v) => v.newPassword === v.confirmPassword, {
          message: "A confirmacao da senha deve ser identica",
          path: ["confirmPassword"],
        }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    forgotPassword: {
      method: "POST" as const,
      path: "/api/auth/forgot-password" as const,
      input: z.object({
        identifier: z.string().min(1, "Informe R.A, CPF ou e-mail"),
        deviceId: z.string().min(10, "Dispositivo invalido"),
      }),
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    validateResetToken: {
      method: "POST" as const,
      path: "/api/auth/validate-reset-token" as const,
      input: z.object({
        identifier: z.string().min(1),
        token: z.string().regex(/^\d{5}$/, "Token deve conter 5 digitos"),
        deviceId: z.string().min(10),
      }),
      responses: {
        200: z.object({ valid: z.boolean() }),
      },
    },
    resetPassword: {
      method: "POST" as const,
      path: "/api/auth/reset-password" as const,
      input: z
        .object({
          identifier: z.string().min(1),
          token: z.string().regex(/^\d{5}$/, "Token deve conter 5 digitos"),
          deviceId: z.string().min(10),
          newPassword: z.string().min(8, "Senha deve ter no minimo 8 caracteres"),
          confirmPassword: z.string().min(1),
        })
        .refine((v) => v.newPassword === v.confirmPassword, {
          message: "A confirmacao da senha deve ser identica",
          path: ["confirmPassword"],
        }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
    cancelPasswordReset: {
      method: "POST" as const,
      path: "/api/auth/cancel-password-reset" as const,
      input: z.object({
        requestId: z.coerce.number().int().positive(),
        cancelToken: z.string().min(20),
        deviceId: z.string().min(10),
      }),
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/logout" as const,
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/user" as const,
      responses: {
        200: userPublicSchema,
        401: errorSchemas.unauthorized,
      },
    },
  },
  users: {
    list: {
      method: "GET" as const,
      path: "/api/users" as const,
      input: z
        .object({
          role: roleSchema.optional(),
        })
        .optional(),
      responses: {
        200: z.array(userPublicSchema.extend({ courseName: z.string().optional() })),
      },
    },
    updateAvatar: {
      method: "POST" as const,
      path: "/api/users/me/avatar" as const,
      input: z.object({
        avatarUrl: z.string().min(20, "Imagem invalida"),
      }),
      responses: {
        200: userPublicSchema,
      },
    },
    updateProfile: {
      method: "PATCH" as const,
      path: "/api/users/me/profile" as const,
      input: z.object({
        nickname: z.string().trim().max(40, "Apelido muito longo").nullable(),
      }),
      responses: {
        200: userPublicSchema,
      },
    },
    updatePreferences: {
      method: "PUT" as const,
      path: "/api/users/me/preferences" as const,
      input: userPreferencesSchema,
      responses: {
        200: userPublicSchema,
      },
    },
  },
  students: {
    scope: {
      method: "GET" as const,
      path: "/api/students/scope" as const,
      responses: {
        200: studentScopeSchema,
        403: errorSchemas.forbidden,
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/students" as const,
      input: z
        .object({
          courseId: z.coerce.number().optional(),
          classSectionId: z.coerce.number().optional(),
          status: enrollmentStatusSchema.optional(),
        })
        .optional(),
      responses: {
        200: z.array(studentListSchema),
        403: errorSchemas.forbidden,
      },
    },
    enroll: {
      method: "POST" as const,
      path: "/api/students/enroll" as const,
      input: z.object({
        name: z.string().min(3, "Nome completo obrigatorio"),
        cpf: z.string().min(11, "CPF obrigatorio"),
        phone: z.string().min(8, "Telefone obrigatorio"),
        email: z.string().email("E-mail invalido"),
        courseId: z.coerce.number().int().positive("Curso obrigatorio"),
        classSectionId: z.coerce.number().int().positive("Turma obrigatoria"),
      }),
      responses: {
        201: z.object({
          user: userPublicSchema,
          enrollment: enrollmentSchema,
          initialPassword: z.string().min(1),
        }),
      },
    },
    lockEnrollment: {
      method: "POST" as const,
      path: "/api/students/enrollments/:id/lock" as const,
      input: z.object({
        reason: z.string().min(5, "Motivo obrigatorio"),
        approvedSubjectIds: z.array(z.coerce.number().int().positive()).optional(),
      }),
      responses: {
        200: z.object({
          enrollment: enrollmentSchema,
          preservedApprovedSubjects: z.number().int().nonnegative(),
        }),
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
  },
  courses: {
    list: {
      method: "GET" as const,
      path: "/api/courses" as const,
      responses: {
        200: z.array(courseSchema),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/courses/:id" as const,
      responses: {
        200: courseSchema.extend({ subjects: z.array(subjectSchema).optional() }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/courses" as const,
      input: z.object({
        name: z.string().min(2, "Nome do curso obrigatorio"),
        description: z.string().optional(),
      }),
      responses: {
        201: courseSchema,
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/courses/:id" as const,
      input: z
        .object({
          name: z.string().min(2).optional(),
          description: z.string().nullable().optional(),
        })
        .partial(),
      responses: {
        200: courseSchema,
        404: errorSchemas.notFound,
      },
    },
    subjects: {
      list: {
        method: "GET" as const,
        path: "/api/courses/:id/subjects" as const,
        responses: {
          200: z.array(subjectSchema),
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/courses/:id/subjects" as const,
        input: z.object({
          subjectIds: z.array(z.coerce.number().int().positive()),
          stageNumbers: z.record(z.coerce.number().int().positive()).optional(),
        }),
        responses: {
          200: z.object({ message: z.string() }),
        },
      },
    },
  },
  subjects: {
    list: {
      method: "GET" as const,
      path: "/api/subjects" as const,
      responses: {
        200: z.array(subjectSchema),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/subjects" as const,
      input: z.object({
        name: z.string().min(2, "Nome da materia obrigatorio"),
        description: z.string().optional(),
        workloadHours: z.coerce.number().int().min(0),
      }),
      responses: {
        201: subjectSchema,
      },
    },
  },
  enrollments: {
    list: {
      method: "GET" as const,
      path: "/api/enrollments" as const,
      input: z
        .object({
          courseId: z.coerce.number().optional(),
          studentId: z.coerce.number().optional(),
        })
        .optional(),
      responses: {
        200: z.array(enrollmentSchema),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/enrollments" as const,
      input: z.object({
        studentId: z.coerce.number().int().positive(),
        courseId: z.coerce.number().int().positive(),
        classSectionId: z.coerce.number().int().positive().optional(),
        academicTermId: z.coerce.number().int().positive().optional(),
        grade: decimalGradeSchema.nullable().optional(),
        attendance: z.coerce.number().int().min(0).max(500).nullable().optional(),
      }),
      responses: {
        201: enrollmentSchema,
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/enrollments/:id" as const,
      input: z
        .object({
          grade: decimalGradeSchema.optional(),
          attendance: z.coerce.number().int().min(0).max(500).optional(),
          status: enrollmentStatusSchema.optional(),
        })
        .partial(),
      responses: {
        200: enrollmentSchema,
        404: errorSchemas.notFound,
      },
    },
  },
  lessonSchedules: {
    academicTerms: {
      list: {
        method: "GET" as const,
        path: "/api/lesson-schedules/academic-terms" as const,
        responses: {
          200: z.array(academicTermSchema),
        },
      },
    },
    teacherLoads: {
      method: "GET" as const,
      path: "/api/lesson-schedules/teacher-loads" as const,
      responses: {
        200: z.array(z.object({ teacherId: z.number(), classCount: z.number() })),
      },
    },
    teacherBusySlots: {
      method: "GET" as const,
      path: "/api/lesson-schedules/teacher-busy" as const,
      input: z.object({
        academicTermId: z.coerce.number().int().positive(),
        period: classPeriodSchema,
        excludeClassSectionId: z.coerce.number().int().positive().optional(),
      }),
      responses: {
        200: z.array(
          z.object({
            teacherId: z.number(),
            dayOfWeek: lessonDaySchema,
            lessonNumber: z.number(),
            classSectionCode: z.string(),
          }),
        ),
        400: errorSchemas.validation,
      },
    },
    locations: {
      list: {
        method: "GET" as const,
        path: "/api/lesson-schedules/locations" as const,
        responses: {
          200: z.array(lessonLocationSchema),
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/lesson-schedules/locations" as const,
        input: z.object({
          name: z.string().min(2, "Localizacao obrigatoria").max(80),
        }),
        responses: {
          201: lessonLocationSchema,
          400: errorSchemas.validation,
        },
      },
      update: {
        method: "PATCH" as const,
        path: "/api/lesson-schedules/locations/:id" as const,
        input: z.object({
          name: z.string().min(2, "Localizacao obrigatoria").max(80),
        }),
        responses: {
          200: lessonLocationSchema,
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
      remove: {
        method: "DELETE" as const,
        path: "/api/lesson-schedules/locations/:id" as const,
        responses: {
          200: z.object({ message: z.string(), deletedBlocks: z.number() }),
          404: errorSchemas.notFound,
        },
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/lesson-schedules" as const,
      input: z.object({
        classSectionId: z.coerce.number().int().positive(),
        academicTermId: z.coerce.number().int().positive(),
      }),
      responses: {
        200: lessonScheduleSchema.nullable(),
        403: errorSchemas.forbidden,
      },
    },
    save: {
      method: "PUT" as const,
      path: "/api/lesson-schedules" as const,
      input: z.object({
        classSectionId: z.coerce.number().int().positive(),
        academicTermId: z.coerce.number().int().positive(),
        period: classPeriodSchema,
        blocks: z.array(lessonScheduleBlockInputSchema).min(1, "Crie ao menos um bloco"),
        slots: z.array(lessonScheduleSlotInputSchema).length(20, "Preencha os 20 slots de aula"),
      }),
      responses: {
        200: lessonScheduleSchema,
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
      },
    },
    draft: {
      get: {
        method: "GET" as const,
        path: "/api/lesson-schedules/draft" as const,
        input: z.object({
          classSectionId: z.coerce.number().int().positive(),
          academicTermId: z.coerce.number().int().positive(),
        }),
        responses: {
          200: lessonScheduleDraftSchema.nullable(),
          403: errorSchemas.forbidden,
        },
      },
      save: {
        method: "PUT" as const,
        path: "/api/lesson-schedules/draft" as const,
        input: z.object({
          classSectionId: z.coerce.number().int().positive(),
          academicTermId: z.coerce.number().int().positive(),
          period: classPeriodSchema,
          draftPayload: lessonScheduleDraftPayloadSchema,
        }),
        responses: {
          200: lessonScheduleDraftSchema,
          400: errorSchemas.validation,
          403: errorSchemas.forbidden,
        },
      },
      remove: {
        method: "DELETE" as const,
        path: "/api/lesson-schedules/draft" as const,
        input: z.object({
          classSectionId: z.coerce.number().int().positive(),
          academicTermId: z.coerce.number().int().positive(),
        }),
        responses: {
          200: z.object({ message: z.string() }),
          403: errorSchemas.forbidden,
        },
      },
    },
  },
  classSections: {
    updateStage: {
      method: "PATCH" as const,
      path: "/api/class-sections/:id/stage" as const,
      input: z.object({
        currentStageNumber: z.coerce.number().int().min(1, "Etapa deve ser no minimo 1"),
      }),
      responses: {
        200: z.object({
          id: z.number(),
          code: z.string(),
          name: z.string(),
          courseId: z.number(),
          period: classPeriodSchema,
          currentStageNumber: z.number(),
        }),
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
  },
  mySchedule: {
    student: {
      method: "GET" as const,
      path: "/api/my-schedule/student" as const,
      responses: {
        200: z
          .object({
            academicTermCode: z.string(),
            classSection: z.object({
              id: z.number(),
              code: z.string(),
              name: z.string(),
              period: classPeriodSchema,
              currentStageNumber: z.number(),
            }),
            schedule: lessonScheduleSchema.nullable(),
          })
          .nullable(),
      },
    },
    teacher: {
      method: "GET" as const,
      path: "/api/my-schedule/teacher" as const,
      responses: {
        200: z
          .object({
            academicTermCode: z.string(),
            items: z.array(
              z.object({
                dayOfWeek: lessonDaySchema,
                lessonNumber: z.number(),
                period: classPeriodSchema,
                subjectName: z.string(),
                classSectionCode: z.string(),
                classSectionName: z.string(),
                locationName: z.string(),
              }),
            ),
          })
          .nullable(),
      },
    },
  },
  teacherLessons: {
    // Lista as aulas do professor numa data (deriva o dia da semana da data) ja
    // agrupadas por (turma + disciplina), com o registro/faltas existentes para prefill.
    listByDate: {
      method: "GET" as const,
      path: "/api/teacher/lessons" as const,
      input: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida"),
      }),
      responses: {
        200: z.object({
          date: z.string(),
          dayOfWeek: lessonDaySchema.nullable(),
          academicTermCode: z.string(),
          items: z.array(
            z.object({
              key: z.string(),
              classSectionId: z.number(),
              classSectionCode: z.string(),
              classSectionName: z.string(),
              courseId: z.number(),
              academicTermId: z.number(),
              period: classPeriodSchema,
              subjectId: z.number(),
              subjectName: z.string(),
              locationName: z.string(),
              lessonNumbers: z.array(z.number()),
              record: z
                .object({ recordId: z.number(), content: z.string() })
                .nullable(),
              absences: z.array(
                z.object({ studentId: z.number(), lessonNumber: z.number() }),
              ),
            }),
          ),
        }),
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
      },
    },
    // Upsert do registro de uma aula (turma + disciplina + data) cobrindo um ou
    // mais horarios (lessonNumbers), com conteudo obrigatorio e faltas por horario.
    saveRecord: {
      method: "POST" as const,
      path: "/api/teacher/lessons/record" as const,
      input: z.object({
        classSectionId: z.coerce.number().int().positive(),
        subjectId: z.coerce.number().int().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida"),
        lessonNumbers: z.array(lessonNumberSchema).min(1, "Selecione ao menos um horario"),
        content: z.string().trim().min(1, "Descreva o que foi trabalhado na aula"),
        absences: z
          .array(z.object({ studentId: z.coerce.number().int().positive(), lessonNumber: lessonNumberSchema }))
          .default([]),
      }),
      responses: {
        200: z.object({
          recordId: z.number(),
          content: z.string(),
          absences: z.array(z.object({ studentId: z.number(), lessonNumber: z.number() })),
        }),
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
  },
  announcements: {
    list: {
      method: "GET" as const,
      path: "/api/announcements" as const,
      input: z
        .object({
          courseId: z.coerce.number().optional(),
          classSectionId: z.coerce.number().optional(),
        })
        .optional(),
      responses: {
        200: z.array(announcementSchema),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/announcements" as const,
      input: z.object({
        title: z.string().min(3, "Titulo obrigatorio"),
        content: z.string().min(3, "Conteudo obrigatorio"),
        isGlobal: z.boolean(),
        courseIds: z.array(z.coerce.number().int().positive()).optional(),
        classSectionIds: z.array(z.coerce.number().int().positive()).optional(),
        expiresAt: z.string().datetime().optional(),
      }),
      responses: {
        201: announcementSchema,
        400: errorSchemas.validation,
      },
    },
    remove: {
      method: "DELETE" as const,
      path: "/api/announcements/:id" as const,
      responses: {
        200: z.object({ message: z.string() }),
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
  },
  materials: {
    list: {
      method: "GET" as const,
      path: "/api/materials" as const,
      responses: {
        200: z.array(materialSchema),
        403: errorSchemas.forbidden,
      },
    },
    upload: {
      method: "POST" as const,
      path: "/api/materials/upload" as const,
      input: z.object({
        classSectionId: z.coerce.number().int().positive(),
        issuedAt: z.string().datetime().optional(),
      }),
      responses: {
        201: materialSchema,
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
      },
    },
    download: {
      method: "GET" as const,
      path: "/api/materials/:id/download" as const,
      responses: {
        200: z.void(),
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    pin: {
      method: "POST" as const,
      path: "/api/materials/:id/pin" as const,
      responses: {
        200: z.object({ message: z.string() }),
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
    unpin: {
      method: "DELETE" as const,
      path: "/api/materials/:id/pin" as const,
      responses: {
        200: z.object({ message: z.string() }),
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
  },
  notifications: {
    list: {
      method: "GET" as const,
      path: "/api/notifications" as const,
      input: z
        .object({
          unreadOnly: z.coerce.boolean().optional(),
        })
        .optional(),
      responses: {
        200: z.array(notificationSchema),
      },
    },
    markRead: {
      method: "POST" as const,
      path: "/api/notifications/:id/read" as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },
  myDisciplines: {
    list: {
      method: "GET" as const,
      path: "/api/my-disciplines" as const,
      responses: {
        200: z.object({
          role: roleSchema,
          // Para alunos: disciplinas da turma com sala, professor, faltas e estado.
          studentItems: z.array(
            z.object({
              subjectId: z.number(),
              subjectName: z.string(),
              teacherName: z.string(),
              locationName: z.string(),
              classSectionCode: z.string(),
              status: enrollmentStatusSchema,
              absences: z.number(),
            }),
          ),
          // Para professores: disciplinas que leciona, por turma.
          teacherItems: z.array(
            z.object({
              subjectId: z.number(),
              subjectName: z.string(),
              classSectionCode: z.string(),
              classSectionName: z.string(),
              locationName: z.string(),
              period: classPeriodSchema,
            }),
          ),
        }),
      },
    },
  },
  dashboard: {
    get: {
      method: "GET" as const,
      path: "/api/dashboard" as const,
      responses: {
        200: z.object({
          role: roleSchema,
          cards: z.array(
            z.object({
              label: z.string(),
              value: z.string(),
              trend: z.string().optional(),
            }),
          ),
        }),
      },
    },
  },
  finances: {
    summary: {
      method: "GET" as const,
      path: "/api/finances/summary" as const,
      responses: {
        200: financeSummarySchema,
        403: errorSchemas.forbidden,
      },
    },
    adminOverview: {
      method: "GET" as const,
      path: "/api/finances/admin" as const,
      responses: {
        200: financeAdminOverviewSchema,
        403: errorSchemas.forbidden,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, String(value));
    }
  }
  return url;
}

export type TeacherLessonsByDateResponse = z.infer<typeof api.teacherLessons.listByDate.responses[200]>;
export type TeacherLessonSaveInput = z.infer<typeof api.teacherLessons.saveRecord.input>;
export type TeacherLessonSaveResponse = z.infer<typeof api.teacherLessons.saveRecord.responses[200]>;
export type MyDisciplinesResponse = z.infer<typeof api.myDisciplines.list.responses[200]>;
export type StudentDisciplineItem = MyDisciplinesResponse["studentItems"][number];
export type TeacherDisciplineItem = MyDisciplinesResponse["teacherItems"][number];
