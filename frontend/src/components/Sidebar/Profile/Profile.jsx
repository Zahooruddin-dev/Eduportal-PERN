import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { updateUsername, changePassword, deleteUser } from '../../../api/authApi';
import { SpinnerIcon, EyeIcon } from '../../Icons/Icon';
import { User, Key, Trash2, Camera, CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
import ConfirmModal from '../../../components/ConfirmModal';

function Toast({ type = 'success', message, isOpen, onClose }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  const startExit = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setExiting(false);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(startExit, 4000);
    }
    return () => clearTimeout(timerRef.current);
  }, [isOpen, message, startExit]);

  if (!visible) return null;

  const configs = {
    success: { icon: <CheckCircle2 size={16} aria-hidden="true" />, bar: 'bg-[var(--color-primary)]', iconColor: 'text-[var(--color-primary)]', label: 'Success' },
    error:   { icon: <XCircle size={16} aria-hidden="true" />,       bar: 'bg-red-500',                iconColor: 'text-red-500',                label: 'Error'   },
    warning: { icon: <AlertTriangle size={16} aria-hidden="true" />, bar: 'bg-amber-500',              iconColor: 'text-amber-500',              label: 'Warning' },
  };
  const cfg = configs[type] ?? configs.success;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`${cfg.label}: ${message}`}
      className={[
        'fixed bottom-5 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-xs flex-col overflow-hidden',
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl',
        'transition-all duration-300',
        exiting ? 'translate-y-3 opacity-0 scale-95' : 'translate-y-0 opacity-100 scale-100',
      ].join(' ')}
    >
      <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-3">
        <span className={`shrink-0 ${cfg.iconColor}`}>{cfg.icon}</span>
        <p className="flex-1 text-sm font-medium text-[var(--color-text-primary)] leading-snug">{message}</p>
        <button
          type="button"
          onClick={startExit}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-md p-1 text-[var(--color-text-muted)] transition hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <X size={13} aria-hidden="true" />
        </button>
      </div>
      <div
        aria-hidden="true"
        className={`h-0.5 w-full origin-left ${cfg.bar}`}
        style={{ animation: 'toast-shrink 4s linear forwards' }}
      />
      <style>{`@keyframes toast-shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
    </div>
  );
}

function FieldRow({ label, htmlFor, hint, children }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4 sm:items-start py-5 border-b border-[var(--color-border)] last:border-0">
      <div className="sm:pt-2.5">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--color-text-secondary)]">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{hint}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

function TextInput({ id, name, value, onChange, required, type = 'text', className = '', ...rest }) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      aria-required={required}
      className={`block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 ${className}`}
      {...rest}
    />
  );
}

function PasswordInput({ id, name, value, onChange, show, onToggle, label, minLength }) {
  return (
    <div className="relative">
      <TextInput
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required
        minLength={minLength}
        className="pr-10"
        aria-label={label}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? `Hide ${label}` : `Show ${label}`}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] focus:outline-none focus:text-[var(--color-primary)]"
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

function PrimaryButton({ loading, loadingText, children, ...rest }) {
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-50"
      {...rest}
    >
      {loading && <SpinnerIcon />}
      {loading ? loadingText : children}
    </button>
  );
}

const TABS = [
  { id: 'profile',  label: 'Profile',  Icon: User   },
  { id: 'security', label: 'Security', Icon: Key    },
  { id: 'account',  label: 'Account',  Icon: Trash2 },
];

export default function Profile() {
  const { user, login, logout } = useAuth();
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({ username: user?.username || '', image: null });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [avatarPreview, setAvatarPreview] = useState(user?.profile || null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, type: 'success', message: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.profile) setAvatarPreview(user.profile);
  }, [user]);

  const showToast = (type, message) => setToast({ isOpen: true, type, message });

  const handleProfileChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      const file = files[0];
      setProfileForm((p) => ({ ...p, image: file }));
      if (file) {
        const reader = new FileReader();
        reader.onload = () => setAvatarPreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setAvatarPreview(user?.profile || null);
      }
    } else {
      setProfileForm((p) => ({ ...p, [name]: value }));
    }
  };

  const handlePasswordChange = (e) =>
    setPasswordForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('newUsername', profileForm.username);
    if (profileForm.image) formData.append('image', profileForm.image);
    try {
      const res = await updateUsername(formData);
      login(res.data.token);
      showToast('success', 'Profile updated successfully');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setProfileForm((p) => ({ ...p, image: null }));
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      showToast('error', 'New password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await changePassword(passwordForm);
      showToast('success', 'Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await deleteUser({ email: user.email, password: passwordForm.currentPassword });
      logout();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Deletion failed');
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6">

      <div className="flex items-center gap-4 mb-7">
        <div className="h-12 w-12 rounded-full shrink-0 bg-[var(--color-primary)]/10 flex items-center justify-center overflow-hidden ring-2 ring-[var(--color-border)]">
          {avatarPreview ? (
            <img src={avatarPreview} alt="" aria-hidden="true" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden="true" className="text-lg font-semibold text-[var(--color-primary)]">
              {(profileForm.username.charAt(0) || '?').toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold text-[var(--color-text-primary)] truncate">
            {profileForm.username || 'Your account'}
          </p>
          <p className="text-sm text-[var(--color-text-muted)] truncate">{user?.email}</p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 mb-5"
      >
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={[
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
              tab === id
                ? 'bg-[var(--color-bg)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
            ].join(' ')}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div
        id="panel-profile"
        role="tabpanel"
        aria-labelledby="tab-profile"
        hidden={tab !== 'profile'}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6"
      >
        <form onSubmit={handleProfileSubmit} noValidate>
          <FieldRow label="Photo" htmlFor="image" hint="JPG, PNG or GIF">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="h-11 w-11 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center overflow-hidden ring-2 ring-[var(--color-border)]">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" aria-hidden="true" className="h-full w-full object-cover" />
                  ) : (
                    <span aria-hidden="true" className="text-sm font-semibold text-[var(--color-primary)]">
                      {(profileForm.username.charAt(0) || '?').toUpperCase()}
                    </span>
                  )}
                </div>
                <label
                  htmlFor="image"
                  className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow transition hover:bg-[var(--color-primary-hover)] focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:ring-offset-1"
                >
                  <Camera size={10} aria-hidden="true" />
                  <span className="sr-only">Upload profile picture</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="image"
                    name="image"
                    accept="image/*"
                    onChange={handleProfileChange}
                    className="sr-only"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                Change photo
              </button>
            </div>
          </FieldRow>

          <FieldRow label="Username" htmlFor="username">
            <TextInput
              id="username"
              name="username"
              value={profileForm.username}
              onChange={handleProfileChange}
              required
              autoComplete="username"
            />
          </FieldRow>

          <div className="flex justify-end py-4">
            <PrimaryButton loading={loading} loadingText="Saving…">
              Save changes
            </PrimaryButton>
          </div>
        </form>
      </div>

      <div
        id="panel-security"
        role="tabpanel"
        aria-labelledby="tab-security"
        hidden={tab !== 'security'}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6"
      >
        <form onSubmit={handlePasswordSubmit} noValidate>
          <FieldRow label="Current password" htmlFor="currentPassword">
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              label="Current password"
            />
          </FieldRow>

          <FieldRow label="New password" htmlFor="newPassword" hint="At least 6 characters">
            <PasswordInput
              id="newPassword"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              show={showNewPassword}
              onToggle={() => setShowNewPassword((v) => !v)}
              label="New password"
              minLength={6}
            />
          </FieldRow>

          <div className="flex justify-end py-4">
            <PrimaryButton loading={loading} loadingText="Changing…">
              Update password
            </PrimaryButton>
          </div>
        </form>
      </div>

      <div
        id="panel-account"
        role="tabpanel"
        aria-labelledby="tab-account"
        hidden={tab !== 'account'}
        className="rounded-xl border border-red-200 bg-red-50/30 dark:border-red-900/40 dark:bg-red-950/20 p-6"
      >
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
            <Trash2 size={16} className="text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">Delete account</h2>
            <p className="mt-1 text-sm text-red-600/80 dark:text-red-400/80 leading-relaxed">
              This permanently removes your account and all associated data. This action cannot be reversed.
            </p>
            <button
              type="button"
              onClick={() => setConfirmModalOpen(true)}
              disabled={loading}
              aria-label="Delete account permanently"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:border-red-800 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete my account
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you absolutely sure? This action cannot be undone and all your data will be permanently removed."
        confirmText="Yes, delete my account"
        cancelText="Cancel"
        type="danger"
      />

      <Toast
        type={toast.type}
        message={toast.message}
        isOpen={toast.isOpen}
        onClose={() => setToast((t) => ({ ...t, isOpen: false }))}
      />
    </main>
  );
}