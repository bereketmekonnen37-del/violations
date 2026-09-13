import { useForm } from 'react-hook-form';
import { Camera, CheckCircle2, Loader2, Moon, Sun, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/store';
import { PageHeader } from '../components/layout/PageHeader';
import { Avatar } from '../components/ui/Avatar';
import { setPhoto, setPreferredTheme } from '../features/settings/profileSlice';
import { changeOwnPassword, updateOwnProfile } from '../features/settings/profileApi';
import { setTheme } from '../features/theme/themeSlice';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import type { Theme } from '../types';

interface ProfileForm {
  name: string;
  email: string;
}

interface PasswordForm {
  current: string;
  next: string;
  confirm: string;
}

export const SettingsPage = () => {
  const dispatch = useAppDispatch();
  const { user, updateProfile } = useAuth();
  const photo = useAppSelector((s) => s.profile.photo);
  const themeMode = useAppSelector((s) => s.theme.mode);
  const preferredTheme = useAppSelector((s) => s.profile.preferences.theme);
  const fileInput = useRef<HTMLInputElement>(null);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedPassword, setSavedPassword] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const profileForm = useForm<ProfileForm>({
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });
  const passwordForm = useForm<PasswordForm>({
    defaultValues: { current: '', next: '', confirm: '' },
  });

  // Seed the local photo cache from the synced profile (e.g. after signing
  // in on a new device) so Settings/Topbar show the same avatar everywhere.
  useEffect(() => {
    if (!photo && user?.avatar) {
      dispatch(setPhoto(user.avatar));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.avatar]);

  const onProfileSubmit = async (v: ProfileForm) => {
    if (!user) return;
    setProfileError(null);
    setSavingProfile(true);
    const name = v.name.trim();
    const email = v.email.trim();
    try {
      await updateOwnProfile(user.id, {
        name,
        email: email !== user.email ? email : undefined,
      });
      updateProfile({ name, email });
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 2500);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Could not save your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (v: PasswordForm) => {
    if (!user) return;
    if (v.next !== v.confirm) {
      passwordForm.setError('confirm', { message: 'Passwords do not match.' });
      return;
    }
    setPasswordError(null);
    setSavingPassword(true);
    try {
      await changeOwnPassword(user.email, v.current, v.next);
      setSavedPassword(true);
      passwordForm.reset({ current: '', next: '', confirm: '' });
      setTimeout(() => setSavedPassword(false), 2500);
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Could not update your password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const onPickPhoto = (file: File | null) => {
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return;
      dispatch(setPhoto(result));
      updateProfile({ avatar: result });
      setPhotoBusy(true);
      updateOwnProfile(user.id, { avatarUrl: result })
        .catch(() => {
          // Local state already reflects the new photo; sync will retry
          // implicitly the next time the profile is saved.
        })
        .finally(() => setPhotoBusy(false));
    };
    reader.readAsDataURL(file);
  };

  const onRemovePhoto = () => {
    dispatch(setPhoto(null));
    if (user) {
      updateOwnProfile(user.id, { avatarUrl: null }).catch(() => {
        // Non-fatal — see onPickPhoto.
      });
    }
  };

  const setThemeChoice = (t: Theme) => {
    dispatch(setTheme(t));
    dispatch(setPreferredTheme(t));
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Manage your profile, security and visual preferences."
      />

      <section className="surface rounded-2xl p-5 sm:p-7">
        <h2 className="text-base font-semibold text-ink-900 dark:text-white">
          Profile photo
        </h2>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Upload a square image. PNG or JPG up to 2 MB.
        </p>
        <div className="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar name={user?.name ?? ''} src={photo} size={72} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="btn-secondary"
              disabled={photoBusy}
            >
              {photoBusy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Camera size={15} />
              )}
              Upload photo
            </button>
            {photo && (
              <button
                type="button"
                onClick={onRemovePhoto}
                className="btn-ghost text-red-600 dark:text-red-400"
              >
                <Trash2 size={15} /> Remove
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              hidden
              accept="image/png,image/jpeg"
              onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      </section>

      <section className="surface rounded-2xl p-5 sm:p-7">
        <h2 className="text-base font-semibold text-ink-900 dark:text-white">
          Personal information
        </h2>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Update the name and email associated with your account.
        </p>
        <form
          onSubmit={profileForm.handleSubmit(onProfileSubmit)}
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
              Full name
            </span>
            <input
              {...profileForm.register('name', { required: 'Name is required' })}
              className="input-base mt-1.5"
            />
            {profileForm.formState.errors.name && (
              <p className="mt-1 text-xs text-red-600">
                {profileForm.formState.errors.name.message}
              </p>
            )}
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
              Email
            </span>
            <input
              type="email"
              {...profileForm.register('email', { required: 'Email is required' })}
              className="input-base mt-1.5"
            />
            {profileForm.formState.errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {profileForm.formState.errors.email.message}
              </p>
            )}
          </label>
          {profileError && (
            <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {profileError}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 sm:col-span-2">
            {savedProfile && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={14} /> Profile updated
              </span>
            )}
            <button type="submit" className="btn-primary" disabled={savingProfile}>
              {savingProfile && <Loader2 size={14} className="animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
      </section>

      <section className="surface rounded-2xl p-5 sm:p-7">
        <h2 className="text-base font-semibold text-ink-900 dark:text-white">Password</h2>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Use a strong password unique to this workspace.
        </p>
        <form
          onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
          className="mt-5 grid gap-4 sm:grid-cols-3"
        >
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
              Current
            </span>
            <input
              type="password"
              {...passwordForm.register('current', { required: 'Required' })}
              className="input-base mt-1.5"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
              New
            </span>
            <input
              type="password"
              {...passwordForm.register('next', {
                required: 'Required',
                minLength: { value: 6, message: 'Minimum 6 characters' },
              })}
              className="input-base mt-1.5"
            />
            {passwordForm.formState.errors.next && (
              <p className="mt-1 text-xs text-red-600">
                {passwordForm.formState.errors.next.message}
              </p>
            )}
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
              Confirm
            </span>
            <input
              type="password"
              {...passwordForm.register('confirm', { required: 'Required' })}
              className="input-base mt-1.5"
            />
            {passwordForm.formState.errors.confirm && (
              <p className="mt-1 text-xs text-red-600">
                {passwordForm.formState.errors.confirm.message}
              </p>
            )}
          </label>
          {passwordError && (
            <div className="sm:col-span-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {passwordError}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 sm:col-span-3">
            {savedPassword && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={14} /> Password updated
              </span>
            )}
            <button type="submit" className="btn-primary" disabled={savingPassword}>
              {savingPassword && <Loader2 size={14} className="animate-spin" />}
              Update password
            </button>
          </div>
        </form>
      </section>

      <section className="surface rounded-2xl p-5 sm:p-7">
        <h2 className="text-base font-semibold text-ink-900 dark:text-white">
          Theme preferences
        </h2>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Choose how Fleetwatch looks in this browser. Active theme:{' '}
          <span className="font-medium text-ink-700 dark:text-ink-200">{themeMode}</span>.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(['light', 'dark'] as Theme[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setThemeChoice(t)}
              className={cn(
                'flex items-start gap-4 rounded-2xl border p-5 text-left transition',
                preferredTheme === t
                  ? 'border-ink-900 bg-ink-50 dark:border-white dark:bg-ink-900'
                  : 'border-ink-200 bg-white hover:border-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-white',
              )}
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                {t === 'light' ? <Sun size={18} /> : <Moon size={18} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold capitalize text-ink-900 dark:text-white">
                  {t} theme
                </p>
                <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                  {t === 'light'
                    ? 'Crisp, daytime-friendly interface.'
                    : 'Calmer surface for long evening reviews.'}
                </p>
              </div>
              {preferredTheme === t && (
                <CheckCircle2
                  size={18}
                  className="text-ink-900 dark:text-white"
                  aria-hidden
                />
              )}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
