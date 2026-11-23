import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../Components/ProtectedRoute";
import AuthLayout from "../Layouts/AuthLayout";

export default function TutorRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute allowedRoles={["tutor"]} />}>
        <Route element={<AuthLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<div>Dashboard Tutor</div>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
