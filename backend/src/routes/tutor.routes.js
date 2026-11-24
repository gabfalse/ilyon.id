import { Router } from "express";
import { z } from "zod";

import {
  listTutors,
  detailTutor,
  storeTutor,
  updateTutorController,
  updateTutorStatusController,
  getMyTutorProfile,
  getMyTutorStudentsController,
  getMyTutorStudentDetailController,
} from "../controllers/tutor.controller.js";

import {
  getMyTutorLearningSubjectsController,
  createMyTutorLearningSessionController,
  getMyTutorDailyAttendanceController,
  updateMyTutorAttendanceController,
} from "../controllers/tutorLearning.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

import {
  verifyOrigin,
  verifyCsrfToken,
} from "../middlewares/csrf.middleware.js";

import {
  createTutorSchema,
  updateTutorSchema,
} from "../validators/tutor.validator.js";

const router = Router();

// ==========================================
// VALIDATION HELPERS
// ==========================================

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Data yang dikirim tidak valid.",
        errors: result.error.issues,
      });
    }

    req.body = result.data;
    next();
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Parameter tidak valid.",
        errors: result.error.issues,
      });
    }

    req.params = result.data;
    next();
  };
}

// ==========================================
// TUTOR LEARNING VALIDATION
// ==========================================

const tutorLearningSessionSchema = z.object({
  sessionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal sesi tidak valid.")
    .optional(),

  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),

  sessionType: z
    .enum(["scheduled", "clinic", "private", "small_group", "makeup", "other"])
    .optional(),

  notes: z.string().nullable().optional(),

  students: z
    .array(
      z.object({
        studentId: z.uuid("ID siswa tidak valid."),

        attendanceStatus: z.enum([
          "present",
          "late",
          "sick",
          "permission",
          "absent",
        ]),

        attendanceNote: z.string().nullable().optional(),
        checkInAt: z.string().nullable().optional(),
        checkOutAt: z.string().nullable().optional(),

        subjectId: z.uuid().nullable().optional(),
        materialId: z.uuid().nullable().optional(),

        topic: z.string().nullable().optional(),
        activityNotes: z.string().nullable().optional(),
        strengths: z.string().nullable().optional(),
        difficulties: z.string().nullable().optional(),
        followUp: z.string().nullable().optional(),

        score: z.number().nonnegative().nullable().optional(),
        maxScore: z.number().positive().nullable().optional(),
      }),
    )
    .min(1, "Minimal satu siswa harus dipilih."),
});

// ==========================================
// TUTOR ATTENDANCE VALIDATOR
// ==========================================

const updateTutorAttendanceSchema = z.object({
  attendanceStatus: z.enum(["present", "late", "sick", "permission", "absent"]),

  attendanceNote: z.string().nullable().optional(),

  report: z
    .object({
      subjectId: z.uuid(),
      materialId: z.uuid().nullable().optional(),
      topic: z.string().trim().min(1),
      activityNotes: z.string().nullable().optional(),
      strengths: z.string().nullable().optional(),
      difficulties: z.string().nullable().optional(),
      followUp: z.string().nullable().optional(),
      score: z.number().min(0).nullable().optional(),
      maxScore: z.number().positive().nullable().optional(),
    })
    .nullable()
    .optional(),
});

// ==========================================
// TUTOR SELF SERVICE
// ==========================================

// GET PROFIL TUTOR
router.get("/me", authenticate, requireRole("tutor"), getMyTutorProfile);

// GET SISWA SAYA
router.get(
  "/me/students",
  authenticate,
  requireRole("tutor"),
  getMyTutorStudentsController,
);

// GET DETAIL SISWA
router.get(
  "/me/students/:id",
  authenticate,
  requireRole("tutor"),
  getMyTutorStudentDetailController,
);

// ==========================================
// TUTOR: KEHADIRAN & LAPORAN BELAJAR
// ==========================================

// GET DAFTAR MATA PELAJARAN AKTIF
router.get(
  "/me/learning/subjects",
  authenticate,
  requireRole("tutor"),
  getMyTutorLearningSubjectsController,
);

// CREATE KEHADIRAN + LAPORAN BELAJAR
router.post(
  "/me/learning/sessions",
  authenticate,
  requireRole("tutor"),
  verifyOrigin,
  verifyCsrfToken,
  validate(tutorLearningSessionSchema),
  createMyTutorLearningSessionController,
);

// ==========================================
// TUTOR DAILY ATTENDANCE
// ==========================================

router.get(
  "/me/attendance/daily",
  authenticate,
  requireRole("tutor"),
  getMyTutorDailyAttendanceController,
);

router.patch(
  "/me/attendance/:attendanceId",
  authenticate,
  requireRole("tutor"),
  verifyOrigin,
  verifyCsrfToken,
  validateParams(
    z.object({
      attendanceId: z.uuid(),
    }),
  ),
  validate(updateTutorAttendanceSchema),
  updateMyTutorAttendanceController,
);

// ==========================================
// ADMIN AUTHORIZATION
// ==========================================

router.use(authenticate, requireRole("super_admin"));

// ==========================================
// GET: DAFTAR TUTOR
// ==========================================

router.get("/", listTutors);

// ==========================================
// GET: DETAIL TUTOR
// ==========================================

router.get(
  "/:id",
  validateParams(
    z.object({
      id: z.uuid("ID tutor tidak valid"),
    }),
  ),
  detailTutor,
);

// ==========================================
// POST: TAMBAH TUTOR + AKUN LOGIN
// ==========================================

router.post(
  "/",
  verifyOrigin,
  verifyCsrfToken,
  validate(createTutorSchema),
  storeTutor,
);

// ==========================================
// PUT: UPDATE TUTOR
// ==========================================

router.put(
  "/:id",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(
    z.object({
      id: z.uuid("ID tutor tidak valid"),
    }),
  ),
  validate(updateTutorSchema),
  updateTutorController,
);

// ==========================================
// PATCH: AKTIFKAN / NONAKTIFKAN TUTOR
// ==========================================

router.patch(
  "/:id/status",
  verifyOrigin,
  verifyCsrfToken,
  validateParams(
    z.object({
      id: z.uuid("ID tutor tidak valid"),
    }),
  ),
  validate(
    z.object({
      isActive: z.boolean({
        error: "Status akun harus berupa boolean.",
      }),
    }),
  ),
  updateTutorStatusController,
);

export default router;
