import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../Components/ProtectedRoute";
import TutorLayout from "../Layouts/TutorLayout";
import TutorDashboard from "../Pages/Tutor/TutorDashboard";
import TutorStudents from "../Pages/Tutor/TutorStudents";

export default function TutorRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute allowedRoles={["tutor"]} />}>
        <Route element={<TutorLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<TutorDashboard />} />

          <Route path="siswa" element={<TutorStudents />} />

          <Route
            path="laporan-belajar"
            element={<div>Kehadiran & Laporan Belajar</div>}
          />

          <Route path="profil" element={<div>Profil Saya</div>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
