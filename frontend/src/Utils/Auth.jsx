/**
 * AUTH UTILITIES
 * Ilyon Academy
 */

// ==========================================
// ROLE CONFIGURATION
// ==========================================

export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  BRANCH_ADMIN: "branch_admin",
  TUTOR: "tutor",
  PARENT: "parent",
  USER: "user",
};

export const ROLE_DASHBOARDS = {
  super_admin: "/admin/dashboard",
  branch_admin: "/branch/dashboard",
  tutor: "/tutor/dashboard",
  parent: "/parent/dashboard",
  user: "/user/dashboard",
};

export const ROLE_LABELS = {
  super_admin: "Admin Pusat",
  branch_admin: "Admin Cabang",
  tutor: "Tutor",
  parent: "Orang Tua",
  user: "Pengguna",
};

const ROLE_PRIORITY = [
  "super_admin",
  "branch_admin",
  "tutor",
  "parent",
  "user",
];

// ==========================================
// USER ROLES
// ==========================================

export function getUserRoles(user) {
  if (!user || !Array.isArray(user.roles)) {
    return [];
  }

  return user.roles.map((role) => role?.roleCode).filter(Boolean);
}

export function hasRole(user, roleCode) {
  return getUserRoles(user).includes(roleCode);
}

export function hasAnyRole(user, allowedRoles = []) {
  const roles = getUserRoles(user);

  return allowedRoles.some((role) => roles.includes(role));
}

export function getPrimaryRole(user) {
  const roles = getUserRoles(user);

  return ROLE_PRIORITY.find((role) => roles.includes(role)) || null;
}

// ==========================================
// DASHBOARD
// ==========================================

export function getDashboardPath(user) {
  const role = getPrimaryRole(user);

  return ROLE_DASHBOARDS[role] || "/unauthorized";
}

export function getRoleLabel(user) {
  const role = getPrimaryRole(user);

  return ROLE_LABELS[role] || "Pengguna";
}

// ==========================================
// BRANCH
// ==========================================

export function getUserBranches(user) {
  if (!user || !Array.isArray(user.roles)) {
    return [];
  }

  return user.roles
    .filter((role) => role?.branchId)
    .map((role) => ({
      id: role.branchId,
      code: role.branchCode,
      name: role.branchName,
      roleCode: role.roleCode,
    }));
}

export function hasGlobalAccess(user, roleCode) {
  if (!user || !Array.isArray(user.roles)) {
    return false;
  }

  return user.roles.some(
    (role) => role.roleCode === roleCode && role.branchId === null,
  );
}

export function hasBranchAccess(user, branchId) {
  if (!user || !Array.isArray(user.roles)) {
    return false;
  }

  return user.roles.some((role) => role.branchId === branchId);
}

// ==========================================
// USER INFORMATION
// ==========================================

export function getUserName(user) {
  return user?.fullName || "Pengguna Ilyon";
}

export function getUserContact(user) {
  return user?.email || user?.phone || "-";
}

export function getUserInitials(user) {
  const name = getUserName(user);

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function isUserActive(user) {
  return user?.isActive === true;
}
