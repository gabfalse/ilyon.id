
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../Contexts/AuthContext";

export default function ProtectedRoute({
  allowedRoles = [],
}) {
  const {
    loading,
    isAuthenticated,
    hasAnyRole,
  } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Memeriksa sesi...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth/login"
        replace
      />
    );
  }

  if (
    allowedRoles.length > 0 &&
    !hasAnyRole(allowedRoles)
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return <Outlet />;
}
