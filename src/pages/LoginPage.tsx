import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/ui/Logo';

interface FormValues {
  email: string;
  password: string;
}

export const LoginPage = () => {
  const { isAuthenticated, user, login } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    defaultValues: { email: '', password: '' },
  });

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'superadmin' ? '/admin' : '/dashboard'} replace />;
  }

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const signedIn = await login(values);
      const role = signedIn?.role ?? user?.role;
      navigate(role === 'superadmin' ? '/admin' : '/dashboard', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in');
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* ── Full-bleed background image ───────────────────────── */}
      <img
        src="/loginimg.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      />

      {/* ── Depth gradients: directional + radial vignette ────── */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(115deg, rgba(5,8,22,0.82) 0%, rgba(5,8,22,0.55) 38%, rgba(5,8,22,0.35) 62%, rgba(5,8,22,0.78) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(5,8,22,0) 0%, rgba(5,8,22,0.35) 60%, rgba(5,8,22,0.9) 100%)',
        }}
      />

      {/* ── Logo + brand strip (top-left) ─────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-6 sm:px-10">
        <Logo variant="primary" />
        <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70 sm:inline">
          Fleetwatch · Operator Portal
        </span>
      </header>

      {/* ── Centered glass login card ─────────────────────────── */}
      <main className="relative z-10 flex min-h-[calc(100vh-96px)] items-center justify-center px-4 py-10 sm:px-6">
        <div
          className="w-full max-w-xl rounded-3xl border px-8 py-11 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] sm:px-14 sm:py-14"
          style={{
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderColor: 'rgba(255,255,255,0.65)',
          }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--color-brand-accent)' }}
          >
            Welcome back
          </p>
          <h2
            className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-[2.5rem]"
            style={{ color: 'var(--color-brand-blue-dark)' }}
          >
            Sign in to your fleet workspace
          </h2>
          <p className="mt-3 text-base" style={{ color: 'var(--color-text-muted)' }}>
            Use your operator credentials to access dashboards and uploads.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-9 space-y-5">
            <div>
              <label
                className="text-xs font-semibold"
                style={{ color: 'var(--color-brand-blue)' }}
              >
                Email
              </label>
              <div className="relative mt-1.5">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-3"
                  style={{ color: 'var(--color-brand-blue)' }}
                />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="input-base pl-10"
                  {...register('email', { required: 'Email is required' })}
                />
              </div>
              {errors.email && (
                <p
                  className="mt-1 text-xs font-medium"
                  style={{ color: 'var(--color-brand-accent-dark)' }}
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                className="text-xs font-semibold"
                style={{ color: 'var(--color-brand-blue)' }}
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-3"
                  style={{ color: 'var(--color-brand-blue)' }}
                />
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-base pl-10 pr-10"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-2.5 transition"
                  style={{ color: 'var(--color-brand-blue)' }}
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p
                  className="mt-1 text-xs font-medium"
                  style={{ color: 'var(--color-brand-accent-dark)' }}
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div
                className="rounded-xl px-3.5 py-2.5 text-xs font-medium"
                style={{
                  background: 'var(--color-brand-accent-soft)',
                  border: '1px solid var(--color-brand-accent-line)',
                  color: 'var(--color-brand-accent-dark)',
                }}
              >
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="relative z-10 px-6 pb-6 text-center text-[11px] text-white/70 sm:px-10">
        © {new Date().getFullYear()} Fleetwatch. Internal preview build.
      </footer>
    </div>
  );
};
