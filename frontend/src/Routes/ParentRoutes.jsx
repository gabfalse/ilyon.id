import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../Components/ProtectedRoute";
import DashboardLayout from "../Layouts/DashboardLayout";

import ParentDashboard from "../Pages/Parent/ParentDashboard";
import DataAnak from "../Pages/Parent/DataAnak";
import StudentRegistration from "../Pages/Parent/StudentRegistration";
import AccountSettings from "../Pages/Account/AccountSettings";

export default function ParentRoutes() {
  return (
    <Routes>
      {/* ROUTE KHUSUS PARENT */}
      <Route element={<ProtectedRoute allowedRoles={["parent"]} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<ParentDashboard />} />
          <Route path="data-anak" element={<DataAnak />} />
          <Route path="pendaftaran-anak" element={<StudentRegistration />} />
        </Route>
      </Route>

      {/* PENGATURAN AKUN: PARENT DAN USER */}
      <Route element={<ProtectedRoute allowedRoles={["parent", "user"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="pengaturan-akun" element={<AccountSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
