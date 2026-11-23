import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../Components/ProtectedRoute";
import UserDashboardLayout from "../Layouts/UserDashboardLayout";
import UserDashboard from "../Pages/User/Dashboard";

export default function UserRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute allowedRoles={["user"]} />}>
        <Route element={<UserDashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<UserDashboard />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/user/dashboard" replace />} />
    </Routes>
  );
}
