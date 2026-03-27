// Profile.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUsername, changePassword, deleteUser } from '../api/authApi';
import { SpinnerIcon, EyeIcon } from './Icon';

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

  const handleProfileChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setProfileForm((prev) => ({ ...prev, image: files[0] }));
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
      login(res.data.token); // update context with new user data and token
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
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
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">
        Profile Settings
      </h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/40 text-green-700 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleProfileSubmit} className="mb-8 space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={profileForm.username}
            onChange={handleProfileChange}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            required
          />
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Profile Picture
          </label>
          <input
            type="file"
            id="image"
            name="image"
            accept="image/*"
            onChange={handleProfileChange}
            className="w-full text-sm text-[var(--color-text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)] file:text-white hover:file:bg-[var(--color-primary-hover)]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
        >
          {loading ? <SpinnerIcon /> : 'Update Profile'}
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="mb-8 space-y-4">
        <h2 className="text-lg font-medium text-[var(--color-text-primary)]">Change Password</h2>

        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="currentPassword"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 pr-10 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-text-muted)]"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              id="newPassword"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 pr-10 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-text-muted)]"
            >
              <EyeIcon open={showNewPassword} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
        >
          {loading ? <SpinnerIcon /> : 'Change Password'}
        </button>
      </form>

      <div>
        <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">Danger Zone</h2>
        <button
          onClick={handleDeleteAccount}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}