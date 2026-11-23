import { z } from "zod";

// ==========================================
// LIST USERS QUERY VALIDATOR
// ==========================================

export const listUsersQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(150, "Pencarian maksimal 150 karakter")
    .optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ==========================================
// USER ID PARAM VALIDATOR
// ==========================================

export const userIdParamSchema = z.object({
  id: z.uuid("ID pengguna tidak valid"),
});

// ==========================================
// SET BRANCH ADMIN ASSIGNMENTS VALIDATOR
// ==========================================

export const setBranchAdminAssignmentsSchema = z.object({
  branchIds: z
    .array(z.uuid("ID cabang tidak valid"))
    .max(100, "Maksimal 100 cabang dapat dipilih")
    .refine((branchIds) => new Set(branchIds).size === branchIds.length, {
      message: "Tidak boleh ada ID cabang yang duplikat",
    }),
});
