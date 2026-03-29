import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { updateUsername, changePassword, deleteUser } from '../../../api/authApi';
import { SpinnerIcon, EyeIcon } from '../../Icons/Icon';
import { User, Key, Camera, Trash2, CheckCircle2, XCircle, X, AlertTriangle } from 'lucide-react';
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
    success: {
      icon: <CheckCircle2 size={18} aria-hidden="true" />,
      bar: 'bg-[var(--color-primary)]',
      iconColor: 'text-[var(--color-primary)]',
      label: 'Success',
    },
    error: {
      icon: <XCircle size={18} aria-hidden="true" />,
      bar: 'bg-red-500',
      iconColor: 'text-red-500',
      label: 'Error',
    },
    warning: {
      icon: <AlertTriangle size={18} aria-hidden="true" />,
      bar: 'bg-amber-500',
      iconColor: 'text-amber-500',
      label: 'Warning',
    },
  };

  const cfg = configs[type] ?? configs.success;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`${cfg.label}: ${message}`}
      className={[
        'fixed bottom-6 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden',
        'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl',
        'transition-all duration-300',
        exiting
          ? 'translate-y-4 opacity-0 scale-95'
          : 'translate-y-0 opacity-100 scale-100',
      ].join(' ')}
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <span className={`mt-0.5 shrink-0 ${cfg.iconColor}`}>{cfg.icon}</span>
        <p className="flex-1 text-sm font-medium text-[var(--color-text-primary)] leading-snug">
          {message}
        </p>
        <button
          type="button"
          onClick={startExit}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-lg p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <div
        className={`h-1 w-full origin-left ${cfg.bar}`}
        style={{ animation: 'toast-progress 4s linear forwards' }}
        aria-hidden="true"
      />
      <style>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}

function AvatarCircle({ preview, username }) {
  return (
    <div className="h-20 w-20 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center overflow-hidden ring-2 ring-[var(--color-border)]">
      {preview ? (
        <img src={preview} alt="" aria-hidden="true" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true" className="text-2xl font-semibold text-[var(--color-primary)]">
          {(username.charAt(0) || '?').toUpperCase()}
        </span>
      )}
    </div>
  );
}

function SectionCard({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function FieldLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--color-text-secondary)]">
      {children}
    </label>
  );
}

function TextInput({ id, name, value, onChange, required, type = 'text', minLength, className = '', ...rest }) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      aria-required={required}
      minLength={minLength}
      className={`block w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 ${className}`}
      {...rest}
    />
  );
}

function PasswordInput({ id, name, value, onChange, show, onToggle, label }) {
  return (
    <div className="relative">
      <TextInput
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required
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
      className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-50"
      {...rest}
    >
      {loading && <SpinnerIcon />}
      {loading ? loadingText : children}
    </button>
  );
}

export default function Profile() {
  const { user, login, logout } = useAuth();
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
    <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
          Profile Settings
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Manage your account information and security preferences
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard>
            <div className="flex items-center gap-2 mb-1">
              <User size={20} className="text-[var(--color-primary)]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Profile Information
              </h2>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              Update your username and profile picture
            </p>

            <form onSubmit={handleProfileSubmit} className="space-y-6" noValidate>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="relative shrink-0">
                  <AvatarCircle preview={avatarPreview} username={profileForm.username} />
                  <label
                    htmlFor="image"
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-md transition-colors hover:bg-[var(--color-primary-hover)] focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:ring-offset-2"
                  >
                    <Camera size={15} aria-hidden="true" />
                    <span className="sr-only">Upload profile picture</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="image"
                      name="image"
                      accept="image/*"
                      onChange={handleProfileChange}
                      className="sr-only"
                      aria-describedby="avatar-hint"
                    />
                  </label>
                </div>
                <p id="avatar-hint" className="text-sm text-[var(--color-text-muted)]">
                  Click the camera icon to upload a new profile picture. JPG, PNG or GIF accepted.
                </p>
              </div>

              <div>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <TextInput
                  id="username"
                  name="username"
                  value={profileForm.username}
                  onChange={handleProfileChange}
                  required
                  className="mt-1"
                  autoComplete="username"
                />
              </div>

              <div className="flex justify-end">
                <PrimaryButton loading={loading} loadingText="Saving…">
                  Save Changes
                </PrimaryButton>
              </div>
            </form>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center gap-2 mb-1">
              <Key size={20} className="text-[var(--color-primary)]" aria-hidden="true" />
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Change Password
              </h2>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              Ensure your account is protected with a strong password
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-6" noValidate>
              <div>
                <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
                <div className="mt-1">
                  <PasswordInput
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    show={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    label="Current password"
                  />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                <div className="mt-1">
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
                </div>
                <p id="new-password-hint" className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                  Must be at least 6 characters.
                </p>
              </div>

              <div className="flex justify-end">
                <PrimaryButton loading={loading} loadingText="Changing…">
                  Change Password
                </PrimaryButton>
              </div>
            </form>
          </SectionCard>
        </div>

        <aside>
          <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6 dark:border-red-900/40 dark:bg-red-950/20">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
              <Trash2 size={20} aria-hidden="true" />
              <h2 className="text-base font-semibold">Danger Zone</h2>
            </div>
            <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4 leading-relaxed">
              Deleting your account is permanent and cannot be undone. All your data will be removed.
            </p>
            <button
              type="button"
              onClick={() => setConfirmModalOpen(true)}
              disabled={loading}
              aria-label="Delete account permanently"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
            >
              <Trash2 size={15} aria-hidden="true" />
              Delete Account
            </button>
          </div>
        </aside>
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