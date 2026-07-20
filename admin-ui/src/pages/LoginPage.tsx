import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/PageLoader";
import { Input, RainMark } from "@/components/ui/primitives";
import { clearSession, getSession } from "@/lib/session";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user?.isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await login({ email: email.trim(), password });
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!getSession()?.user.isPlatformAdmin) {
        clearSession();
        setError("Platform administrator access required.");
        window.location.reload();
        return;
      }
      navigate("/dashboard", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="relative h-screen flex overflow-hidden bg-[#0e0c0d]">
      <div className="absolute -inset-3.5 halftone" aria-hidden />

      <div className="relative flex-1 flex p-2 sm:p-2.5 min-w-0">
        <div className="flex-1 flex flex-col min-w-0 bg-surface rounded-2xl border border-line shadow-[0_1px_2px_rgba(20,10,15,0.03),0_12px_32px_-12px_rgba(20,10,15,0.08)] overflow-y-auto px-6 sm:px-12 py-8 sm:py-10 animate-fade-in">
          <div className="w-full max-w-[400px] mx-auto flex items-center gap-2.5">
            <RainMark className="h-8 w-8" />
            <span className="text-xl font-semibold tracking-tight text-ink">
              Rain Admin
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center w-full max-w-[400px] mx-auto py-10">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
              Sign in
            </h1>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              Platform operations console. Use your platform admin credentials.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@userain.co"
                required
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              {error && (
                <p className="text-sm text-bad-fg bg-bad-bg rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full h-11" loading={submitting}>
                Log in
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div
        className="hidden lg:block flex-1 relative overflow-hidden"
        aria-hidden
      />
    </div>
  );
}
