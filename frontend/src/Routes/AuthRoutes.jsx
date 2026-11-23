import { Routes, Route } from "react-router-dom";

import AuthLayout from "../Layouts/AuthLayout";
import GuestRoute from "../Components/GuestRoute";

import Login from "../Pages/Auth/Login";
import Register from "../Pages/Auth/Register";
import VerifyEmail from "../Pages/Auth/VerifyEmail";

export default function AuthRoutes() {
  return (
    <Routes>
      {/* Halaman Login dan Register */}
      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route index element={<Login />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
      </Route>

      {/* Verifikasi email sebelum akun aktif */}
      <Route element={<AuthLayout />}>
        <Route path="verify-email" element={<VerifyEmail />} />
      </Route>
    </Routes>
  );
}
