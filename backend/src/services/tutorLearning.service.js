import { pool } from "../config/database.js";

// ==========================================
// CONSTANTS
// ==========================================

const ATTENDANCE_STATUSES = ["present", "late", "sick", "permission", "absent"];

const SESSION_TYPES = [
  "scheduled",
  "clinic",
  "private",
  "small_group",
  "makeup",
  "other",
];

const REPORT_REQUIRED_STATUSES = ["present", "late"];

// ==========================================
// GET ACTIVE SUBJECTS
// ==========================================

export async function getActiveTutorLearningSubjects() {
  const result = await pool.query(
    `
      SELECT
        id,
        subject_code AS "subjectCode",
        subject_name AS "subjectName",
        description
      FROM subjects
      WHERE is_active = TRUE
      ORDER BY subject_name ASC
    `,
  );

  return result.rows;
}

// ==========================================
// CREATE TUTOR LEARNING SESSION
// ==========================================

export async function createMyTutorLearningSession(userId, payload) {
  const {
    sessionDate,
    startTime = null,
    endTime = null,
    sessionType = "other",
    notes = null,
    students = [],
  } = payload;

  if (!Array.isArray(students) || students.length === 0) {
    throw new Error("Minimal satu siswa harus dipilih.");
  }

  if (!SESSION_TYPES.includes(sessionType)) {
    throw new Error("Jenis sesi pembelajaran tidak valid.");
  }

  const studentIds = students.map((student) => student.studentId);

  if (
    studentIds.some((id) => !id) ||
    new Set(studentIds).size !== studentIds.length
  ) {
    throw new Error("Daftar siswa tidak valid atau mengandung duplikasi.");
  }

  for (const student of students) {
    if (!ATTENDANCE_STATUSES.includes(student.attendanceStatus)) {
      throw new Error("Status kehadiran siswa tidak valid.");
    }

    if (
      REPORT_REQUIRED_STATUSES.includes(student.attendanceStatus) &&
      (!student.subjectId || !String(student.topic || "").trim())
    ) {
      throw new Error(
        "Mata pelajaran dan topik wajib diisi untuk siswa yang hadir.",
      );
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------
    // 1. VALIDATE TUTOR AND STUDENT BRANCH
    // --------------------------------------

    const accessResult = await client.query(
      `
        SELECT DISTINCT
          tp.id AS "tutorId",
          s.id AS "studentId",
          s.primary_branch_id AS "branchId"
        FROM tutor_profiles tp
        JOIN tutor_branch_assignments tba
          ON tba.tutor_id = tp.id
         AND tba.assigned_from <= CURRENT_DATE
         AND (
           tba.assigned_until IS NULL
           OR tba.assigned_until >= CURRENT_DATE
         )
        JOIN students s
          ON s.primary_branch_id = tba.branch_id
        WHERE tp.user_id = $1
          AND s.id = ANY($2::uuid[])
          AND s.status = 'active'
          AND s.deleted_at IS NULL
      `,
      [userId, studentIds],
    );

    const accessibleStudents = accessResult.rows;

    if (accessibleStudents.length !== studentIds.length) {
      throw new Error(
        "Ada siswa yang tidak aktif atau tidak termasuk cabang penugasan Anda.",
      );
    }

    const branchIds = [
      ...new Set(accessibleStudents.map((student) => student.branchId)),
    ];

    if (branchIds.length !== 1) {
      throw new Error(
        "Satu sesi pembelajaran hanya boleh berisi siswa dari cabang yang sama.",
      );
    }

    const tutorId = accessibleStudents[0].tutorId;
    const branchId = branchIds[0];

    // --------------------------------------
    // 2. VALIDATE ACTIVE SUBJECTS
    // --------------------------------------

    const subjectIds = [
      ...new Set(
        students
          .filter((student) =>
            REPORT_REQUIRED_STATUSES.includes(student.attendanceStatus),
          )
          .map((student) => student.subjectId),
      ),
    ];

    if (subjectIds.length > 0) {
      const subjectResult = await client.query(
        `
          SELECT id
          FROM subjects
          WHERE id = ANY($1::uuid[])
            AND is_active = TRUE
        `,
        [subjectIds],
      );

      if (subjectResult.rows.length !== subjectIds.length) {
        throw new Error(
          "Ada mata pelajaran yang tidak aktif atau tidak valid.",
        );
      }
    }

    // --------------------------------------
    // 3. CREATE ATTENDANCE SESSION
    // --------------------------------------

    const sessionResult = await client.query(
      `
        INSERT INTO attendance_sessions (
          branch_id,
          session_date,
          start_time,
          end_time,
          session_type,
          status,
          notes,
          created_by
        )
        VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, 'completed', $6, $7)
        RETURNING id
      `,
      [
        branchId,
        sessionDate || null,
        startTime,
        endTime,
        sessionType,
        notes,
        userId,
      ],
    );

    const sessionId = sessionResult.rows[0].id;

    // --------------------------------------
    // 4. SAVE ATTENDANCE AND LEARNING REPORTS
    // --------------------------------------

    let reportCount = 0;

    for (const student of students) {
      const {
        studentId,
        attendanceStatus,
        attendanceNote = null,
        checkInAt = null,
        checkOutAt = null,
        subjectId = null,
        materialId = null,
        topic = null,
        activityNotes = null,
        strengths = null,
        difficulties = null,
        followUp = null,
        score = null,
        maxScore = null,
      } = student;

      // Save attendance
      await client.query(
        `
          INSERT INTO student_attendance (
            session_id,
            student_id,
            status,
            check_in_at,
            check_out_at,
            note,
            recorded_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          sessionId,
          studentId,
          attendanceStatus,
          checkInAt,
          checkOutAt,
          attendanceNote,
          userId,
        ],
      );

      // Absent, sick, and permission students
      // do not receive learning records.
      if (!REPORT_REQUIRED_STATUSES.includes(attendanceStatus)) {
        continue;
      }

      // Save individual learning report
      await client.query(
        `
          INSERT INTO learning_records (
            branch_id,
            student_id,
            tutor_id,
            session_id,
            subject_id,
            material_id,
            learning_date,
            topic,
            activity_notes,
            strengths,
            difficulties,
            follow_up,
            score,
            max_score
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE),
$8, $9, $10, $11, $12, $13, $14
          )
        `,
        [
          branchId,
          studentId,
          tutorId,
          sessionId,
          subjectId,
          materialId,
          sessionDate || null,
          String(topic).trim(),
          activityNotes,
          strengths,
          difficulties,
          followUp,
          score,
          maxScore,
        ],
      );

      reportCount += 1;
    }

    await client.query("COMMIT");

    return {
      sessionId,
      branchId,
      tutorId,
      studentCount: students.length,
      reportCount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// GET MY TUTOR DAILY ATTENDANCE
// ==========================================

export async function getMyTutorDailyAttendance(userId, date) {
  const result = await pool.query(
    `
      SELECT
        sa.id AS "attendanceId",
        ats.id AS "sessionId",
        ats.session_date AS "sessionDate",
        ats.session_type AS "sessionType",
        ats.start_time AS "startTime",
        ats.end_time AS "endTime",

        s.id AS "studentId",
        s.student_code AS "studentCode",
        s.full_name AS "studentName",

        b.id AS "branchId",
        b.branch_name AS "branchName",

        sa.status AS "attendanceStatus",
        sa.note AS "attendanceNote",
        sa.check_in_at AS "checkInAt",
        sa.check_out_at AS "checkOutAt",
        sa.created_at AS "recordedAt",

        lr.id AS "learningRecordId",
        lr.subject_id AS "subjectId",
        sub.subject_name AS "subjectName",
        lr.material_id AS "materialId",
        cm.material_title AS "materialTitle",
        lr.topic,
        lr.activity_notes AS "activityNotes",
        lr.strengths,
        lr.difficulties,
        lr.follow_up AS "followUp",
        lr.score,
        lr.max_score AS "maxScore",

        (ats.created_by = $1) AS "canEdit"

      FROM student_attendance sa

      JOIN attendance_sessions ats
        ON ats.id = sa.session_id

      JOIN students s
        ON s.id = sa.student_id

      JOIN branches b
        ON b.id = ats.branch_id

      LEFT JOIN LATERAL (
        SELECT *
        FROM learning_records
        WHERE session_id = ats.id
          AND student_id = s.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lr ON TRUE

      LEFT JOIN subjects sub
        ON sub.id = lr.subject_id

      LEFT JOIN curriculum_materials cm
        ON cm.id = lr.material_id

      WHERE ats.session_date = $2::date

        AND EXISTS (
          SELECT 1
          FROM tutor_profiles tp
          JOIN tutor_branch_assignments tba
            ON tba.tutor_id = tp.id
          WHERE tp.user_id = $1
            AND tba.branch_id = ats.branch_id
            AND tba.assigned_from <= ats.session_date
            AND (
              tba.assigned_until IS NULL
              OR tba.assigned_until >= ats.session_date
            )
        )

      ORDER BY
        ats.created_at DESC,
        s.full_name ASC
    `,
    [userId, date],
  );

  return result.rows;
}

// ==========================================
// UPDATE MY TUTOR ATTENDANCE
// ==========================================

export async function updateMyTutorAttendance(userId, attendanceId, payload) {
  const { attendanceStatus, attendanceNote = null, report } = payload;

  if (!ATTENDANCE_STATUSES.includes(attendanceStatus)) {
    throw new Error("Status kehadiran tidak valid.");
  }

  const requiresReport = REPORT_REQUIRED_STATUSES.includes(attendanceStatus);

  if (!requiresReport && report !== undefined && report !== null) {
    throw new Error(
      "Laporan belajar tidak boleh diisi untuk status Sakit, Izin, atau Alfa.",
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------
    // 1. VALIDATE ATTENDANCE OWNERSHIP
    // --------------------------------------

    const attendanceResult = await client.query(
      `
        SELECT
          sa.id AS "attendanceId",
          sa.session_id AS "sessionId",
          sa.student_id AS "studentId",
          sa.status AS "oldStatus",
          sa.note AS "oldNote",

          ats.branch_id AS "branchId",
          ats.session_date AS "sessionDate",
          ats.created_by AS "createdBy"

        FROM student_attendance sa

        JOIN attendance_sessions ats
          ON ats.id = sa.session_id

        WHERE sa.id = $1

        FOR UPDATE OF sa, ats
      `,
      [attendanceId],
    );

    if (attendanceResult.rows.length === 0) {
      throw new Error("Data kehadiran tidak ditemukan.");
    }

    const attendance = attendanceResult.rows[0];

    if (attendance.createdBy !== userId) {
      throw new Error(
        "Anda hanya dapat mengedit kehadiran yang dibuat oleh akun Anda.",
      );
    }

    // Pastikan tutor masih memiliki hak akses
    // historis ke cabang tempat sesi berlangsung.
    const accessResult = await client.query(
      `
        SELECT tp.id AS "tutorId"
        FROM tutor_profiles tp

        JOIN tutor_branch_assignments tba
          ON tba.tutor_id = tp.id

        WHERE tp.user_id = $1
          AND tba.branch_id = $2
          AND tba.assigned_from <= $3::date
          AND (
            tba.assigned_until IS NULL
            OR tba.assigned_until >= $3::date
          )

        LIMIT 1
      `,
      [userId, attendance.branchId, attendance.sessionDate],
    );

    if (accessResult.rows.length === 0) {
      throw new Error(
        "Anda tidak memiliki akses ke cabang pada tanggal sesi tersebut.",
      );
    }

    const tutorId = accessResult.rows[0].tutorId;

    // --------------------------------------
    // 2. GET EXISTING LEARNING REPORTS
    // --------------------------------------

    const reportResult = await client.query(
      `
        SELECT *
        FROM learning_records
        WHERE session_id = $1
          AND student_id = $2
        ORDER BY created_at DESC
        FOR UPDATE
      `,
      [attendance.sessionId, attendance.studentId],
    );

    const existingReports = reportResult.rows;

    if (existingReports.length > 1) {
      throw new Error(
        "Ditemukan lebih dari satu laporan belajar untuk sesi ini. Hubungi administrator sebelum mengedit.",
      );
    }

    const existingReport = existingReports[0] || null;

    // --------------------------------------
    // 3. UPDATE ATTENDANCE
    // --------------------------------------

    await client.query(
      `
        UPDATE student_attendance
        SET
          status = $2,
          note = $3
        WHERE id = $1
      `,
      [attendanceId, attendanceStatus, attendanceNote],
    );

    // Audit perubahan kehadiran.
    const attendanceChanged =
      attendance.oldStatus !== attendanceStatus ||
      attendance.oldNote !== attendanceNote;

    if (attendanceChanged) {
      await client.query(
        `
          INSERT INTO audit_logs (
            user_id,
            branch_id,
            action,
            entity_table,
            entity_id,
            old_values,
            new_values
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
        `,
        [
          userId,
          attendance.branchId,
          "UPDATE",
          "student_attendance",
          attendanceId,
          JSON.stringify({
            status: attendance.oldStatus,
            note: attendance.oldNote,
          }),
          JSON.stringify({
            status: attendanceStatus,
            note: attendanceNote,
          }),
        ],
      );
    }

    // --------------------------------------
    // 4. HANDLE NON-REPORT ATTENDANCE
    // --------------------------------------

    if (!requiresReport) {
      if (existingReport) {
        await client.query(
          `
            DELETE FROM learning_records
            WHERE session_id = $1
              AND student_id = $2
          `,
          [attendance.sessionId, attendance.studentId],
        );

        await client.query(
          `
            INSERT INTO audit_logs (
              user_id,
              branch_id,
              action,
              entity_table,
              entity_id,
              old_values,
              new_values
            )
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
          `,
          [
            userId,
            attendance.branchId,
            "DELETE",
            "learning_records",
            existingReport.id,
            JSON.stringify(existingReport),
            JSON.stringify({
              reason: "attendance_status_changed",
              attendanceStatus,
            }),
          ],
        );
      }

      await client.query("COMMIT");

      return {
        attendanceId,
        attendanceStatus,
        reportAction: existingReport ? "deleted" : "none",
      };
    }

    // --------------------------------------
    // 5. VALIDATE REQUIRED LEARNING REPORT
    // --------------------------------------

    const reportData =
      report ||
      (existingReport
        ? {
            subjectId: existingReport.subject_id,
            materialId: existingReport.material_id,
            topic: existingReport.topic,
            activityNotes: existingReport.activity_notes,
            strengths: existingReport.strengths,
            difficulties: existingReport.difficulties,
            followUp: existingReport.follow_up,
            score: existingReport.score,
            maxScore: existingReport.max_score,
          }
        : null);

    if (
      !reportData ||
      !reportData.subjectId ||
      !String(reportData.topic || "").trim()
    ) {
      throw new Error(
        "Mata pelajaran dan topik wajib diisi untuk status Hadir atau Terlambat.",
      );
    }

    // Pastikan mata pelajaran aktif.
    const subjectResult = await client.query(
      `
        SELECT id
        FROM subjects
        WHERE id = $1
          AND is_active = TRUE
      `,
      [reportData.subjectId],
    );

    if (subjectResult.rows.length === 0) {
      throw new Error("Mata pelajaran tidak aktif atau tidak valid.");
    }

    // Pastikan materi benar-benar milik mata pelajaran.
    if (reportData.materialId) {
      const materialResult = await client.query(
        `
          SELECT cm.id
          FROM curriculum_materials cm

          JOIN curriculum_levels cl
            ON cl.id = cm.level_id

          WHERE cm.id = $1
            AND cl.subject_id = $2
            AND cm.is_active = TRUE
            AND cl.is_active = TRUE
        `,
        [reportData.materialId, reportData.subjectId],
      );

      if (materialResult.rows.length === 0) {
        throw new Error(
          "Materi tidak valid atau tidak sesuai dengan mata pelajaran.",
        );
      }
    }

    const normalizedReport = {
      subjectId: reportData.subjectId,
      materialId: reportData.materialId || null,
      topic: String(reportData.topic).trim(),
      activityNotes: reportData.activityNotes ?? null,
      strengths: reportData.strengths ?? null,
      difficulties: reportData.difficulties ?? null,
      followUp: reportData.followUp ?? null,
      score: reportData.score ?? null,
      maxScore: reportData.maxScore ?? null,
    };

    // --------------------------------------
    // 6. UPDATE OR CREATE LEARNING REPORT
    // --------------------------------------

    let reportAction;

    if (existingReport) {
      await client.query(
        `
          UPDATE learning_records
          SET
            subject_id = $2,
            material_id = $3,
            topic = $4,
            activity_notes = $5,
            strengths = $6,
            difficulties = $7,
            follow_up = $8,
            score = $9,
            max_score = $10,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          existingReport.id,
          normalizedReport.subjectId,
          normalizedReport.materialId,
          normalizedReport.topic,
          normalizedReport.activityNotes,
          normalizedReport.strengths,
          normalizedReport.difficulties,
          normalizedReport.followUp,
          normalizedReport.score,
          normalizedReport.maxScore,
        ],
      );

      await client.query(
        `
          INSERT INTO audit_logs (
            user_id,
            branch_id,
            action,
            entity_table,
            entity_id,
            old_values,
            new_values
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
        `,
        [
          userId,
          attendance.branchId,
          "UPDATE",
          "learning_records",
          existingReport.id,
          JSON.stringify(existingReport),
          JSON.stringify(normalizedReport),
        ],
      );

      reportAction = "updated";
    } else {
      const insertResult = await client.query(
        `
          INSERT INTO learning_records (
            branch_id,
            student_id,
            tutor_id,
            session_id,
            subject_id,
            material_id,
            learning_date,
            topic,
            activity_notes,
            strengths,
            difficulties,
            follow_up,
            score,
            max_score
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14
          )
          RETURNING id
        `,
        [
          attendance.branchId,
          attendance.studentId,
          tutorId,
          attendance.sessionId,
          normalizedReport.subjectId,
          normalizedReport.materialId,
          attendance.sessionDate,
          normalizedReport.topic,
          normalizedReport.activityNotes,
          normalizedReport.strengths,
          normalizedReport.difficulties,
          normalizedReport.followUp,
          normalizedReport.score,
          normalizedReport.maxScore,
        ],
      );

      const newReportId = insertResult.rows[0].id;

      await client.query(
        `
          INSERT INTO audit_logs (
            user_id,
            branch_id,
            action,
            entity_table,
            entity_id,
            old_values,
            new_values
          )
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
        `,
        [
          userId,
          attendance.branchId,
          "INSERT",
          "learning_records",
          newReportId,
          JSON.stringify({}),
          JSON.stringify(normalizedReport),
        ],
      );

      reportAction = "created";
    }

    await client.query("COMMIT");

    return {
      attendanceId,
      attendanceStatus,
      reportAction,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
