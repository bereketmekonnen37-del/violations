import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Logo } from '../components/ui/Logo';

interface FormValues {
  email: string;
  password: string;
}

const DEMO = [
  { label: 'Boss', email: 'boss@demo.com', password: 'boss123' },
  { label: 'Staff', email: 'staff@demo.com', password: 'staff123' },
];

export const LoginPage = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    defaultValues: { email: '', password: '' },
  });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await login(values);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in');
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-white text-ink-900 dark:bg-ink-950 dark:text-ink-100 lg:grid-cols-[1.05fr_1fr]">
      {/* Left visual panel */}
      <section className="relative hidden overflow-hidden border-r border-ink-100 dark:border-ink-800 lg:block">
        <img
          src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1600&q=80"
          alt="Professional truck driver in cabin"
          className="absolute inset-0 h-full w-full object-cover grayscale"
        />
        <div className="absolute inset-0 bg-ink-950/45" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
          <Logo />
          <div className="max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Fleetwatch Platform
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight">
              Driver violations,
              <br />
              under one calm command center.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/75">
              Upload daily reports, surface high-risk drivers, and keep every
              transporter accountable — without spreadsheets, email threads or
              guesswork.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur">
              <ShieldCheck size={14} /> Built for fleet operators
            </div>
          </div>
        </div>
      </section>

      {/* Right form panel */}
      <section className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between p-6 lg:px-10">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-12 lg:px-10">
          <div className="w-full max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
              Welcome back
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
              Sign in to your fleet workspace
            </h2>
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
              Use your operator credentials to access dashboards and uploads.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-700 dark:text-ink-300">
                  Email
                </label>
                <div className="relative mt-1.5">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-3 text-ink-400"
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
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-ink-700 dark:text-ink-300">
                  Password
                </label>
                <div className="relative mt-1.5">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-3 text-ink-400"
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
                    className="absolute right-3 top-2.5 text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
                    aria-label="Toggle password visibility"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="mt-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-400">
                Demo credentials
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {DEMO.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => {
                      setValue('email', d.email);
                      setValue('password', d.password);
                    }}
                    className="rounded-xl border border-ink-200 bg-white p-3 text-left transition hover:border-ink-900 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-white dark:hover:bg-ink-800"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                      {d.label}
                    </p>
                    <p className="mt-1 text-sm font-medium text-ink-900 dark:text-white">
                      {d.email}
                    </p>
                    <p className="font-mono text-[11px] text-ink-500 dark:text-ink-400">
                      {d.password}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer className="px-6 pb-6 text-center text-[11px] text-ink-500 dark:text-ink-400 lg:px-10">
          © {new Date().getFullYear()} Fleetwatch. Internal preview build.
        </footer>
      </section>
    </div>
  );
};
