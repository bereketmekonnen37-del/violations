import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
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
    <div
      className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]"
      style={{
        background: 'var(--color-bg-page)',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Left visual panel */}
      <section
        className="relative hidden overflow-hidden lg:block"
        style={{ borderRight: '1px solid var(--color-brand-blue-line)' }}
      >
        <img
          src="/loginimg.jpg"
          alt="Professional truck driver in cabin"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(42, 58, 114, 0.72) 0%, rgba(15, 20, 40, 0.55) 100%)',
          }}
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
          <Logo variant="primary" />
          <div className="max-w-md">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-brand-accent)' }}
            >
              Fleetwatch Platform
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight">
              Driver violations,
              <br />
              <span style={{ color: 'var(--color-brand-accent)' }}>
                under one calm command center.
              </span>
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/85">
              Upload daily reports, surface high-risk drivers, and keep every
              transporter accountable — without spreadsheets, email threads or
              guesswork.
            </p>
            <div
              className="mt-8 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur"
              style={{
                background: 'rgba(255, 255, 255, 0.14)',
                border: '1px solid rgba(255, 255, 255, 0.24)',
                color: '#ffffff',
              }}
            >
              <ShieldCheck size={14} /> Built for fleet operators
            </div>
          </div>
        </div>
      </section>

      {/* Right form panel */}
      <section
        className="flex min-h-screen flex-col"
        style={{ background: '#ffffff' }}
      >
        <header className="flex items-center justify-between p-6 lg:px-10">
          <div className="lg:hidden">
            <Logo variant="primary" />
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-12 lg:px-10">
          <div className="w-full max-w-md">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--color-brand-accent)' }}
            >
              Welcome back
            </p>
            <h2
              className="mt-2 font-display text-3xl font-semibold tracking-tight"
              style={{ color: 'var(--color-brand-blue-dark)' }}
            >
              Sign in to your fleet workspace
            </h2>
            <p
              className="mt-2 text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Use your operator credentials to access dashboards and uploads.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
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

            <div className="mt-8">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: 'var(--color-brand-accent)' }}
              >
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
                    className="rounded-xl p-3 text-left transition"
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--color-brand-blue-line)',
                      color: 'var(--color-text-primary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        'var(--color-brand-blue)';
                      e.currentTarget.style.background =
                        'var(--color-brand-blue-soft)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        'var(--color-brand-blue-line)';
                      e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    <p
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-brand-blue)' }}
                    >
                      {d.label}
                    </p>
                    <p
                      className="mt-1 text-sm font-medium"
                      style={{ color: 'var(--color-brand-blue-dark)' }}
                    >
                      {d.email}
                    </p>
                    <p
                      className="font-mono text-[11px]"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {d.password}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer
          className="px-6 pb-6 text-center text-[11px] lg:px-10"
          style={{ color: 'var(--color-text-muted)' }}
        >
          © {new Date().getFullYear()} Fleetwatch. Internal preview build.
        </footer>
      </section>
    </div>
  );
};
