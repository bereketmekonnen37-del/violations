/**
 * Admin login page.
 *
 * Accepts any email plus a password of at least 8 characters. The mock
 * session service infers the resulting role from the email local-part.
 */

import { useState } from 'react';
import { AdminButton } from '../components/Button';
import { AdminCard } from '../components/Card';
import { AdminInput } from '../components/Input';
import { ADMIN_PRODUCT_NAME } from '../utils/constants';
import { useAdminSession } from '../hooks/useAdminSession';
import { useAdminToasts } from '../hooks/useAdminToasts';

interface AdminLoginPageProps {
  onSuccess?: () => void;
}

export function AdminLoginPage({ onSuccess }: AdminLoginPageProps) {
  const { login } = useAdminSession();
  const { push } = useAdminToasts();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfa, setMfa] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.includes('@') && password.length >= 8;

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(undefined);
    const result = await login({ email, password, mfaCode: mfa || undefined });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    push({ kind: 'success', title: 'Signed in', message: `Welcome ${result.session.displayName}` });
    onSuccess?.();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0F1116',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      }}
    >
      <div style={{ width: 360 }}>
        <div style={{ textAlign: 'center', color: '#EFF1F5', marginBottom: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{ADMIN_PRODUCT_NAME}</div>
          <div style={{ color: '#7B7F8A', fontSize: 12 }}>
            Sign in to manage staff and boss accounts.
          </div>
        </div>
        <AdminCard title="Sign in">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <AdminInput
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
            />
            <AdminInput
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              helper="Minimum 8 characters."
            />
            <AdminInput
              label="Two-factor code (optional)"
              value={mfa}
              onChange={(event) => setMfa(event.target.value)}
              helper="6-digit code from your authenticator app."
            />
            {error ? (
              <div
                style={{
                  color: '#FF9AB4',
                  background: '#3B0E23',
                  border: '1px solid #FF3D77',
                  padding: '8px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            ) : null}
            <AdminButton type="submit" disabled={!canSubmit} loading={submitting} block>
              Sign in
            </AdminButton>
          </form>
        </AdminCard>
        <p
          style={{
            color: '#7B7F8A',
            fontSize: 11,
            marginTop: 12,
            textAlign: 'center',
          }}
        >
          Use an email starting with <code>super</code>, <code>admin</code>, or{' '}
          <code>boss</code> to preview each role.
        </p>
      </div>
    </div>
  );
}
