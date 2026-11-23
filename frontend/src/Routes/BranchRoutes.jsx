import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../Components/ProtectedRoute";
import DashboardLayout from "../Layouts/DashboardLayout";

import BranchAdminDashboard from "../Pages/BranchAdmin/Dashboard";
import ParentPage from "../Pages/Admin/Parents/ParentPage";
import SubjectPage from "../Pages/Admin/Subjects/SubjectPage";

export default function BranchRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute allowedRoles={["branch_admin"]} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<BranchAdminDashboard />} />

          <Route path="parents" element={<ParentPage />} />

          <Route path="subjects" element={<SubjectPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
