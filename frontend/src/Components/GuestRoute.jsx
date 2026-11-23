import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../Contexts/AuthContext";``
import { getDashboardPath } from "../Utils/Auth";

export default function GuestRoute() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Memeriksa sesi...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(user)} replace />;
  }

  return <Outlet />;
}
