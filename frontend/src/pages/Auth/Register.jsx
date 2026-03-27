import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Lock, UserPlus, AlertCircle, Loader, Shield, Eye, EyeOff } from 'lucide-react';
import { registerUser } from '../../api/authApi';
import { useAuth } from '../../utils/AuthContext';
import { Link, useNavigate } from 'react-router';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function SkeletonLoader() {
  return (
    <div className="w-full max-w-md mx-auto" role="status" aria-label="Creating your account, please wait" aria-live="polite">
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--sb-bg-elevated)', border: '1px solid var(--sb-border)' }}>
        <div className="p-8 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full animate-pulse" style={{ background: 'var(--sb-hover)' }} />
          <div className="w-40 h-6 rounded-lg animate-pulse" style={{ background: 'var(--sb-hover)' }} />
          <div className="w-56 h-4 rounded-lg animate-pulse" style={{ background: 'var(--sb-hover)' }} />
        </div>
        <div className="px-8 pb-8 flex flex-col gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="w-24 h-4 rounded animate-pulse" style={{ background: 'var(--sb-hover)' }} />
              <div className="w-full h-11 rounded-xl animate-pulse" style={{ background: 'var(--sb-hover)' }} />
            </div>
          ))}
          <div className="w-full h-11 rounded-xl animate-pulse mt-2" style={{ background: 'var(--sb-accent-bg)' }} />
          <div className="w-52 h-4 rounded animate-pulse mx-auto" style={{ background: 'var(--sb-hover)' }} />
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'student' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (error && errorRef.current) errorRef.current.focus();
  }, [error]);

  const validateField = (name, value) => {
    if (name === 'username') return value.trim() ? '' : 'Username is required.';
    if (name === 'email') {
      if (!value) return 'Email is required.';
      if (!EMAIL_RE.test(value)) return 'Enter a valid email address (e.g. name@example.com).';
      return '';
    }
    if (name === 'password') {
      if (!value) return 'Password is required.';
      if (value.length < 6) return 'Password must be at least 6 characters.';
      return '';
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'email') setEmailTouched(true);
    const msg = validateField(name, value);
    if (msg) setFieldErrors((prev) => ({ ...prev, [name]: msg }));
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const msg = validateField('email', formData.email);
      if (msg) {
        setEmailTouched(true);
        setFieldErrors((prev) => ({ ...prev, email: msg }));
        return;
      }
      passwordRef.current?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    ['username', 'email', 'password'].forEach((f) => {
      const msg = validateField(f, formData[f]);
      if (msg) errs[f] = msg;
    });
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setEmailTouched(true);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await registerUser(formData);
      localStorage.setItem('token', response.data.token);
      refreshUser();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputBase = 'w-full px-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none border disabled:opacity-50 disabled:cursor-not-allowed';

  const inputStyle = (field) => ({
    background: 'var(--sb-bg)',
    color: 'var(--sb-text)',
    borderColor: fieldErrors[field] ? 'var(--sb-danger)' : 'var(--sb-border-strong)',
    boxShadow: fieldErrors[field] ? '0 0 0 3px var(--sb-danger-focus)' : undefined,
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--app-bg)' }}>
      <SkeletonLoader />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--app-bg)' }}>
      <a
        href="#reg-username"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm font-medium"
        style={{ background: 'var(--sb-accent)', color: 'var(--app-bg)' }}
      >
        Skip to form
      </a>

      <div className="w-full max-w-md">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--sb-bg-elevated)',
            border: '1px solid var(--sb-border)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          }}
        >
          <div className="px-8 pt-10 pb-6 flex flex-col items-center gap-3 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--sb-accent-bg)', color: 'var(--sb-accent)' }}
              aria-hidden="true"
            >
              <UserPlus size={26} />
            </div>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--sb-text)' }}
            >
              Create account
            </h1>
            <p className="text-sm" style={{ color: 'var(--sb-text-secondary)' }}>
              Join and start your learning journey
            </p>
          </div>

          <div className="px-8 pb-10">
            {error && (
              <div
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm"
                style={{ background: 'var(--sb-danger-bg)', border: '1px solid var(--sb-danger-border)', color: 'var(--sb-danger)' }}
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate aria-label="Create a new account">
              <div className="flex flex-col gap-5">

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reg-username"
                    className="flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: 'var(--sb-text-secondary)' }}
                  >
                    <User size={13} aria-hidden="true" />
                    <span>Username</span>
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    name="username"
                    className={inputBase}
                    style={inputStyle('username')}
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                    autoComplete="username"
                    autoFocus
                    aria-required="true"
                    aria-invalid={!!fieldErrors.username}
                    aria-describedby={fieldErrors.username ? 'reg-username-error' : undefined}
                  />
                  {fieldErrors.username && (
                    <span id="reg-username-error" role="alert" className="flex items-center gap-1 text-xs" style={{ color: 'var(--sb-danger)' }}>
                      <AlertCircle size={11} aria-hidden="true" />
                      {fieldErrors.username}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reg-email"
                    className="flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: 'var(--sb-text-secondary)' }}
                  >
                    <Mail size={13} aria-hidden="true" />
                    <span>Email address</span>
                  </label>
                  <input
                    id="reg-email"
                    ref={emailRef}
                    type="email"
                    name="email"
                    className={inputBase}
                    style={inputStyle('email')}
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleEmailKeyDown}
                    required
                    autoComplete="email"
                    aria-required="true"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'reg-email-error' : 'reg-email-hint'}
                  />
                  {fieldErrors.email ? (
                    <span id="reg-email-error" role="alert" className="flex items-center gap-1 text-xs" style={{ color: 'var(--sb-danger)' }}>
                      <AlertCircle size={11} aria-hidden="true" />
                      {fieldErrors.email}
                    </span>
                  ) : (
                    <span id="reg-email-hint" className="text-xs" style={{ color: 'var(--sb-text-dim)' }}>
                      Press Enter to move to password
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reg-password"
                    className="flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: 'var(--sb-text-secondary)' }}
                  >
                    <Lock size={13} aria-hidden="true" />
                    <span>Password</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      ref={passwordRef}
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      className={inputBase + ' pr-11'}
                      style={inputStyle('password')}
                      placeholder="At least 6 characters"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required
                      autoComplete="new-password"
                      minLength={6}
                      aria-required="true"
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? 'reg-password-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-150"
                      style={{ color: 'var(--sb-text-dim)' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <span id="reg-password-error" role="alert" className="flex items-center gap-1 text-xs" style={{ color: 'var(--sb-danger)' }}>
                      <AlertCircle size={11} aria-hidden="true" />
                      {fieldErrors.password}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reg-role"
                    className="flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: 'var(--sb-text-secondary)' }}
                  >
                    <Shield size={13} aria-hidden="true" />
                    <span>Account type</span>
                  </label>
                  <select
                    id="reg-role"
                    name="role"
                    className={inputBase}
                    style={{
                      background: 'var(--sb-bg)',
                      color: 'var(--sb-text)',
                      borderColor: 'var(--sb-border-strong)',
                    }}
                    value={formData.role}
                    onChange={handleChange}
                    required
                    aria-required="true"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: 'var(--sb-accent)', color: 'var(--app-bg)' }}
                >
                  <UserPlus size={16} aria-hidden="true" />
                  <span>Create account</span>
                </button>

              </div>
            </form>

            <p className="mt-6 text-center text-sm" style={{ color: 'var(--sb-text-dim)' }}>
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium transition-colors duration-150 hover:underline"
                style={{ color: 'var(--sb-accent)' }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}