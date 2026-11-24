import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../Components/ProtectedRoute";
import UserDashboardLayout from "../Layouts/UserDashboardLayout";
import UserDashboard from "../Pages/User/Dashboard";
import AccountSettings from "../Pages/Account/AccountSettings";

export default function UserRoutes() {
  return (
    <Routes>
      {/* ROUTE KHUSUS USER */}
      <Route element={<ProtectedRoute allowedRoles={["user"]} />}>
        <Route element={<UserDashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<UserDashboard />} />
        </Route>
      </Route>

      {/* PENGATURAN AKUN: USER DAN PARENT */}
      <Route element={<ProtectedRoute allowedRoles={["user", "parent"]} />}>
        <Route element={<UserDashboardLayout />}>
          <Route path="pengaturan-akun" element={<AccountSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/user/dashboard" replace />} />
    </Routes>
  );
}
