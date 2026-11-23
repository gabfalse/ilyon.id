// src/Components/RoleRedirect.jsx

import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getDashboardPath } from "../utils/auth";

export default function RoleRedirect() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div className="p-6 text-center">Memuat dashboard...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return <Navigate to={getDashboardPath(user)} replace />;
}