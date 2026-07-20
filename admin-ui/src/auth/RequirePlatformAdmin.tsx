import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { PageLoader } from "@/components/ui/PageLoader";

export function RequirePlatformAdmin() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-sm text-muted text-center max-w-md">
          Platform administrator access required. Sign in with a Rain platform
          admin account.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
