// Profile.jsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { updateUsername, changePassword, deleteUser } from '../../../../../api/authApi';
import { SpinnerIcon, EyeIcon } from '../../../../Icons/Icon';
import { AlertTriangle, CheckCircle, XCircle, User, Key, Trash2, Camera } from 'lucide-react';

export default function Profile() {
  const { user, login, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    image: null,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.profile || null);
  const fileInputRef = useRef(null);

  // Update avatar preview when user profile changes
  useEffect(() => {
    if (user?.profile) {
      setAvatarPreview(user.profile);
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      const file = files[0];
      setProfileForm((prev) => ({ ...prev, image: file }));
      if (file) {
        const reader = new FileReader();
        reader.onload = () => setAvatarPreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setAvatarPreview(user?.profile || null);
      }
    } else {
      setProfileForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    const formData = new FormData();
    formData.append('newUsername', profileForm.username);
    if (profileForm.image) {
      formData.append('image', profileForm.image);
    }
    try {
      const res = await updateUsername(formData);
      login(res.data.token); // update context
      setSuccess('Profile updated successfully');
      // Clear file input
      if (fileInputRef.current) fileInputRef.current.value = '';
      setProfileForm((prev) => ({ ...prev, image: null }));
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await changePassword(passwordForm);
      setSuccess('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      '⚠️ WARNING: This action is permanent! Your account and all associated data will be deleted. This cannot be undone. Are you absolutely sure?'
    );
    if (!confirmDelete) return;
    setLoading(true);
    setError('');
    try {
      await deleteUser({ email: user.email, password: passwordForm.currentPassword });
      logout();
    } catch (err) {
      setError(err.response?.data?.message || 'Deletion failed');
      setLoading(false);
    }
  };

  // Auto‑clear success/error after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
          Profile Settings
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Manage your account information and security preferences
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
        >
          <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div
          role="status"
          className="mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-400"
        >
          <CheckCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Profile update card */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <h2 className="text-lg font-medium text-[var(--color-text-primary)] flex items-center gap-2">
              <User size={20} className="text-[var(--color-primary)]" />
              Profile Information
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Update your username and profile picture
            </p>

            <form onSubmit={handleProfileSubmit} className="mt-6 space-y-6">
              {/* Avatar preview */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center overflow-hidden ring-2 ring-[var(--color-border)]">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-medium text-[var(--color-primary)]">
                        {profileForm.username.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <label
                    htmlFor="image"
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-sm transition-colors hover:bg-[var(--color-primary-hover)]"
                    aria-label="Upload profile picture"
                  >
                    <Camera size={16} />
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="image"
                      name="image"
                      accept="image/*"
                      onChange={handleProfileChange}
                      className="hidden"
                      aria-describedby="avatar-hint"
                    />
                  </label>
                </div>
                <div className="text-sm text-[var(--color-text-muted)]" id="avatar-hint">
                  Click the camera icon to upload a new picture.
                </div>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-[var(--color-text-secondary)]">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={profileForm.username}
                  onChange={handleProfileChange}
                  className="mt-1 block w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  required
                  aria-required="true"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-50"
                  aria-busy={loading}
                >
                  {loading && <SpinnerIcon />}
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Password change card */}
          <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <h2 className="text-lg font-medium text-[var(--color-text-primary)] flex items-center gap-2">
              <Key size={20} className="text-[var(--color-primary)]" />
              Change Password
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Ensure your account is using a strong password
            </p>

            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-[var(--color-text-secondary)]">
                  Current Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className="block w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 pr-10 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    required
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-[var(--color-text-secondary)]">
                  New Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id="newPassword"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="block w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-4 py-2.5 pr-10 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    required
                    minLength={6}
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    <EyeIcon open={showNewPassword} />
                  </button>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Password must be at least 6 characters.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-50"
                  aria-busy={loading}
                >
                  {loading && <SpinnerIcon />}
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Danger Zone sidebar */}
        <div>
          <div className="rounded-2xl border border-red-200 bg-red-50/30 p-6 dark:border-red-900/40 dark:bg-red-950/20">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle size={20} />
              <h2 className="text-lg font-medium">Danger Zone</h2>
            </div>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={loading}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
              aria-label="Delete account permanently"
            >
              <Trash2 size={16} />
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}