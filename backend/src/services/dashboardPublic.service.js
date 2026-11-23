import { pool } from "../config/database.js";

import {
  getAllPrograms,
  getActiveOfferingsByProgram,
} from "./program.service.js";

// ==========================================
// PUBLIC DASHBOARD STATISTICS
// ==========================================

export async function getPublicDashboardStatistics() {
  const query = `
    WITH
    student_stats AS (
      SELECT
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (
          WHERE status = 'active'
        )::INTEGER AS active
      FROM students
      WHERE deleted_at IS NULL
    ),

    branch_stats AS (
      SELECT
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (
          WHERE is_active = TRUE
        )::INTEGER AS active
      FROM branches
    ),

    tutor_stats AS (
      SELECT
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (
          WHERE tp.employment_status = 'active'
            AND u.is_active = TRUE
        )::INTEGER AS active
      FROM tutor_profiles tp
      INNER JOIN users u ON u.id = tp.user_id
    ),

    staff_stats AS (
      SELECT
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (
          WHERE sp.employment_status = 'active'
            AND u.is_active = TRUE
        )::INTEGER AS active
      FROM staff_profiles sp
      INNER JOIN users u ON u.id = sp.user_id
    ),

    program_stats AS (
      SELECT
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (
          WHERE is_active = TRUE
        )::INTEGER AS active
      FROM programs
    ),

    offering_stats AS (
      SELECT
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (
          WHERE po.is_active = TRUE
            AND p.is_active = TRUE
        )::INTEGER AS active
      FROM program_offerings po
      INNER JOIN programs p ON p.id = po.program_id
    ),

    class_stats AS (
      SELECT
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (
          WHERE status = 'active'
        )::INTEGER AS active,
        COUNT(*) FILTER (
          WHERE status = 'inactive'
        )::INTEGER AS inactive,
        COUNT(*) FILTER (
          WHERE status = 'completed'
        )::INTEGER AS completed
      FROM classes
    )

    SELECT
      (SELECT row_to_json(student_stats)
       FROM student_stats) AS students,

      (SELECT row_to_json(branch_stats)
       FROM branch_stats) AS branches,

      (SELECT row_to_json(tutor_stats)
       FROM tutor_stats) AS tutors,

      (SELECT row_to_json(staff_stats)
       FROM staff_stats) AS staff,

      (SELECT row_to_json(program_stats)
       FROM program_stats) AS programs,

      (SELECT row_to_json(offering_stats)
       FROM offering_stats) AS offerings,

      (SELECT row_to_json(class_stats)
       FROM class_stats) AS classes;
  `;

  const result = await pool.query(query);

  return (
    result.rows[0] || {
      students: { total: 0, active: 0 },
      branches: { total: 0, active: 0 },
      tutors: { total: 0, active: 0 },
      staff: { total: 0, active: 0 },
      programs: { total: 0, active: 0 },
      offerings: { total: 0, active: 0 },
      classes: {
        total: 0,
        active: 0,
        inactive: 0,
        completed: 0,
      },
    }
  );
}

// ==========================================
// PUBLIC PROGRAMS
// ==========================================

export async function getPublicPrograms() {
  const result = await getAllPrograms({
    isActive: true,
    page: 1,
    limit: 1000,
  });

  const programs = await Promise.all(
    result.data.map(async (program) => {
      const offerings = await getActiveOfferingsByProgram(program.id);

      return {
        id: program.id,
        programCode: program.programCode,
        programName: program.programName,
        deliveryType: program.deliveryType,
        programModel: program.programModel,
        description: program.description,
        defaultDurationMinutes: program.defaultDurationMinutes,

        offerings: offerings.map((offering) => ({
          id: offering.id,
          offeringCode: offering.offeringCode,
          offeringName: offering.offeringName,
          deliveryType: offering.deliveryType,
          learningMethod: offering.learningMethod,
          billingPeriod: offering.billingPeriod,
          meetingQuota: offering.meetingQuota,
          isUnlimited: offering.isUnlimited,
          sessionDurationMinutes: offering.sessionDurationMinutes,
          isFlexibleDuration: offering.isFlexibleDuration,
          description: offering.description,
        })),
      };
    }),
  );

  return programs;
}
