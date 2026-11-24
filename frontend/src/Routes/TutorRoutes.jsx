import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../Components/ProtectedRoute";
import TutorLayout from "../Layouts/TutorLayout";

import TutorDashboard from "../Pages/Tutor/TutorDashboard";
import TutorStudents from "../Pages/Tutor/TutorStudents";
import StudentDetail from "../Pages/Tutor/StudentDetail";
import TutorLearningReport from "../Pages/Tutor/TutorLearningReport";
import TutorDailyAttendance from "../Pages/Tutor/TutorDailyAttendance";

export default function TutorRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute allowedRoles={["tutor"]} />}>
        <Route element={<TutorLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<TutorDashboard />} />

          <Route path="siswa" element={<TutorStudents />} />

          <Route path="siswa/:id" element={<StudentDetail />} />

          <Route path="laporan-belajar" element={<TutorLearningReport />} />

          <Route path="kehadiran-harian" element={<TutorDailyAttendance />} />

          <Route path="profil" element={<div>Profil Saya</div>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
