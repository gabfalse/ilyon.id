import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../Components/ProtectedRoute";
import DashboardLayout from "../Layouts/DashboardLayout";

import Dashboard from "../Pages/Admin/Dashboard";
import BranchPage from "../Pages/Admin/Branches/BranchPage";
import StudentPage from "../Pages/Admin/Students/StudentPage";
import EnrollmentPage from "../Pages/Admin/Enrollments/EnrollmentPage";
import EnrollmentContractPage from "../Pages/Admin/EnrollmentContracts/EnrollmentContractPage";
import ParentPage from "../Pages/Admin/Parents/ParentPage";
import TutorPage from "../Pages/Admin/Tutors/TutorPage";
import StaffPage from "../Pages/Admin/Staff/StaffPage";
import RecruitmentPage from "../Pages/Admin/Recruitment/RecruitmentPage";
import UserManagementPage from "../Pages/Admin/UserManagement/UserManagementPage";
import ProgramPage from "../Pages/Admin/Programs/ProgramPage";
import SubjectPage from "../Pages/Admin/Subjects/SubjectPage";
import ParentStudentClaimsPage from "../Pages/Admin/Parents/ParentStudentClaimsPage";

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute allowedRoles={["super_admin"]} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<Dashboard />} />

          <Route path="branches" element={<BranchPage />} />

          <Route path="students" element={<StudentPage />} />

          <Route path="enrollments" element={<EnrollmentPage />} />

          <Route
            path="enrollment-contracts"
            element={<EnrollmentContractPage />}
          />

          <Route path="parents" element={<ParentPage />} />

          <Route path="tutors" element={<TutorPage />} />

          <Route path="staff" element={<StaffPage />} />

          <Route path="subjects" element={<SubjectPage />} />

          <Route path="recruitment" element={<RecruitmentPage />} />

          <Route path="programs" element={<ProgramPage />} />

          <Route path="users" element={<UserManagementPage />} />

          <Route
            path="parent-student-claims"
            element={<ParentStudentClaimsPage />}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
