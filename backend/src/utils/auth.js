
// Mengambil daftar role pengguna
export function getUserRoles(user) {
  if (!user || !Array.isArray(user.roles)) {
    return [];
  }

  return user.roles
    .map((role) => role.roleCode)
    .filter(Boolean);
}

// Menentukan halaman dashboard berdasarkan prioritas role
export function getDashboardPath(user) {
  const roles = getUserRoles(user);

  if (roles.includes("super_admin")) {
    return "/admin/dashboard";
  }

  if (roles.includes("branch_admin")) {
    return "/branch/dashboard";
  }

  if (roles.includes("tutor")) {
    return "/tutor/dashboard";
  }

  if (roles.includes("parent")) {
    return "/parent/dashboard";
  }

  return "/unauthorized";
}
