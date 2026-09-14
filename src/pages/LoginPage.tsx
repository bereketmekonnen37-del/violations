import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, PartyPopper } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/ui/Logo';
import { EnkutatashHero } from '../components/branding/EnkutatashHero';

interface FormValues {
  email: string;
  password: string;
}

export const LoginPage = () => {
  const { isAuthenticated, login } = useAuth();
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
      {/* Left visual panel — cinematic Ethiopian New Year (Enkutatash) showcase */}
      <section
        className="enku-panel relative hidden overflow-hidden lg:block"
        style={{ borderRight: '1px solid var(--color-brand-blue-line)' }}
      >
        {/* Dusk-to-gold gradient sky, slowly breathing */}
        <div className="enku-sky absolute inset-0" />
        {/* Ethiopian flag-color glow orbs, drifting */}
        <div className="enku-orb enku-orb-green absolute" />
        <div className="enku-orb enku-orb-yellow absolute" />
        <div className="enku-orb enku-orb-red absolute" />
        {/* Slow rotating light sweep for a cinematic spotlight feel */}
        <div className="enku-sweep absolute inset-0" />
        {/* Falling Adey Abeba (Meskel daisy) petals */}
        <EnkutatashHero />
        {/* Bottom vignette so copy stays legible over the animation */}
        <div className="enku-vignette absolute inset-0" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
          <Logo variant="primary" />
          <div className="max-w-md">
            <div
              className="enku-badge inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur"
              style={{
                background: 'rgba(255, 255, 255, 0.14)',
                border: '1px solid rgba(255, 255, 255, 0.24)',
                color: '#ffffff',
              }}
            >
              <PartyPopper size={14} /> Enkutatash · Ethiopian New Year
            </div>
            <h1 className="enku-title mt-4 text-5xl font-semibold leading-[1.05] tracking-tight">
              Happy New Year
              <br />
              <span className="enku-year">2019</span>
            </h1>
            <p className="mt-3 text-lg font-medium text-white/90">
              እንኳን ለ2019 ዓ.ም አደረሳችሁ
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/85">
              From every one of us at Fleetwatch — wishing our partners and
              investors a bright, prosperous Enkutatash and a safer year of
              the road ahead.
            </p>
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
          </div>
        </div>

        <footer
          className="px-6 pb-6 text-center text-[11px] lg:px-10"
          style={{ color: 'var(--color-text-muted)' }}
        >
          © {new Date().getFullYear()} Fleetwatch. Internal preview build.
        </footer>
      </section>

      <style>{`
        .enku-sky {
          background: linear-gradient(
            160deg,
            #1a1035 0%,
            #2a1b52 22%,
            #5a2a63 45%,
            #a5432f 68%,
            #d98a2b 88%,
            #f4b942 100%
          );
          background-size: 180% 180%;
          animation: enku-sky-shift 18s ease-in-out infinite;
        }
        @keyframes enku-sky-shift {
          0%, 100% { background-position: 0% 30%; }
          50% { background-position: 100% 70%; }
        }
        .enku-orb {
          border-radius: 9999px;
          filter: blur(60px);
          opacity: 0.55;
          mix-blend-mode: screen;
        }
        .enku-orb-green {
          width: 260px; height: 260px; left: -60px; top: 10%;
          background: #078930;
          animation: enku-float-a 14s ease-in-out infinite;
        }
        .enku-orb-yellow {
          width: 320px; height: 320px; right: -80px; top: 35%;
          background: #fcdd09;
          animation: enku-float-b 16s ease-in-out infinite;
        }
        .enku-orb-red {
          width: 240px; height: 240px; left: 20%; bottom: -80px;
          background: #da121a;
          animation: enku-float-a 20s ease-in-out infinite reverse;
        }
        @keyframes enku-float-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -25px) scale(1.08); }
        }
        @keyframes enku-float-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, 20px) scale(1.05); }
        }
        .enku-sweep {
          background: conic-gradient(
            from 0deg at 50% 50%,
            transparent 0deg,
            rgba(255, 240, 200, 0.12) 40deg,
            transparent 90deg,
            transparent 360deg
          );
          animation: enku-sweep-rotate 22s linear infinite;
          opacity: 0.8;
        }
        @keyframes enku-sweep-rotate {
          to { transform: rotate(360deg); }
        }
        .enku-vignette {
          background: linear-gradient(
            180deg,
            rgba(15, 10, 30, 0.15) 0%,
            rgba(15, 10, 30, 0.1) 45%,
            rgba(10, 8, 20, 0.65) 100%
          );
        }
        .enku-badge {
          animation: enku-badge-in 0.8s ease-out both;
        }
        .enku-title {
          animation: enku-rise-in 0.9s 0.1s ease-out both;
          text-shadow: 0 2px 30px rgba(252, 221, 9, 0.35);
        }
        .enku-year {
          background: linear-gradient(90deg, #fcdd09, #ffe98a, #f4b942, #fcdd09);
          background-size: 300% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: enku-shine 5s linear infinite;
          filter: drop-shadow(0 0 18px rgba(252, 221, 9, 0.45));
        }
        @keyframes enku-shine {
          to { background-position: 300% center; }
        }
        @keyframes enku-rise-in {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes enku-badge-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .enku-sky, .enku-orb, .enku-sweep, .enku-year, .enku-title, .enku-badge {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
