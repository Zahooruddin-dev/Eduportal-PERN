import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock, LogIn, AlertCircle, Loader, Eye, EyeOff } from 'lucide-react';
import { loginUser } from '../../api/authApi';
import { useAuth } from '../../utils/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function SkeletonLoader() {
  return (
    <div
      className="w-full max-w-md mx-auto"
      role="status"
      aria-label="Signing you in, please wait"
      aria-live="polite"
    >
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--sb-bg-elevated)', border: '1px solid var(--sb-border)' }}>
        <div className="p-8 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full animate-pulse" style={{ background: 'var(--sb-hover)' }} />
          <div className="w-36 h-6 rounded-lg animate-pulse" style={{ background: 'var(--sb-hover)' }} />
          <div className="w-52 h-4 rounded-lg animate-pulse" style={{ background: 'var(--sb-hover)' }} />
        </div>
        <div className="px-8 pb-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="w-28 h-4 rounded animate-pulse" style={{ background: 'var(--sb-hover)' }} />
            <div className="w-full h-11 rounded-xl animate-pulse" style={{ background: 'var(--sb-hover)' }} />
          </div>
          <div className="flex flex-col gap-2">
            <div className="w-24 h-4 rounded animate-pulse" style={{ background: 'var(--sb-hover)' }} />
            <div className="w-full h-11 rounded-xl animate-pulse" style={{ background: 'var(--sb-hover)' }} />
          </div>
          <div className="w-full h-11 rounded-xl animate-pulse mt-2" style={{ background: 'var(--sb-accent-bg)' }} />
          <div className="w-48 h-4 rounded animate-pulse mx-auto" style={{ background: 'var(--sb-hover)' }} />
        </div>
      </div>
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const passwordRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (error && errorRef.current) errorRef.current.focus();
  }, [error]);

  const validateEmail = (val) => {
    if (!val) return 'Email is required.';
    if (!EMAIL_RE.test(val)) return 'Enter a valid email address (e.g. name@example.com).';
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    const msg = validateEmail(formData.email);
    if (msg) setFieldErrors((prev) => ({ ...prev, email: msg }));
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const msg = validateEmail(formData.email);
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
    const emailErr = validateEmail(formData.email);
    if (emailErr) errs.email = emailErr;
    if (!formData.password) errs.password = 'Password is required.';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setEmailTouched(true);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await loginUser(formData);
      localStorage.setItem('token', response.data.token);
      refreshUser();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  const inputBase = [
    'w-full px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
    'outline-none border',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' ');

  const inputStyle = (field) => ({
    background: 'var(--sb-bg)',
    color: 'var(--sb-text)',
    borderColor: fieldErrors[field] ? 'var(--sb-danger)' : 'var(--sb-border-strong)',
    boxShadow: fieldErrors[field] ? '0 0 0 3px var(--sb-danger-focus)' : undefined,
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--app-bg)' }}>
      <SkeletonLoader />
    </div>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--app-bg)' }}
    >
      <a
        href="#login-email"
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
              <LogIn size={26} />
            </div>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--sb-text)' }}
            >
              Welcome back
            </h1>
            <p className="text-sm" style={{ color: 'var(--sb-text-secondary)' }}>
              Sign in to continue to your account
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
                style={{
                  background: 'var(--sb-danger-bg)',
                  border: '1px solid var(--sb-danger-border)',
                  color: 'var(--sb-danger)',
                }}
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate aria-label="Sign in to your account">
              <div className="flex flex-col gap-5">

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="login-email"
                    className="flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: 'var(--sb-text-secondary)' }}
                  >
                    <Mail size={13} aria-hidden="true" />
                    <span>Email address</span>
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    className={inputBase}
                    style={inputStyle('email')}
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleEmailBlur}
                    onKeyDown={handleEmailKeyDown}
                    required
                    autoComplete="email"
                    autoFocus
                    aria-required="true"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'login-email-error' : 'login-email-hint'}
                  />
                  {fieldErrors.email ? (
                    <span
                      id="login-email-error"
                      role="alert"
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--sb-danger)' }}
                    >
                      <AlertCircle size={11} aria-hidden="true" />
                      {fieldErrors.email}
                    </span>
                  ) : (
                    <span
                      id="login-email-hint"
                      className="text-xs"
                      style={{ color: 'var(--sb-text-dim)' }}
                    >
                      Press Enter to move to password
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: 'var(--sb-text-secondary)' }}
                    >
                      <Lock size={13} aria-hidden="true" />
                      <span>Password</span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs transition-colors duration-150 hover:underline"
                      style={{ color: 'var(--sb-accent)' }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      ref={passwordRef}
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      className={inputBase + ' pr-11'}
                      style={inputStyle('password')}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      autoComplete="current-password"
                      aria-required="true"
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
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
                    <span
                      id="login-password-error"
                      role="alert"
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--sb-danger)' }}
                    >
                      <AlertCircle size={11} aria-hidden="true" />
                      {fieldErrors.password}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: 'var(--sb-accent)',
                    color: 'var(--app-bg)',
                  }}
                >
                  <LogIn size={16} aria-hidden="true" />
                  <span>Sign in</span>
                </button>

              </div>
            </form>

            <p className="mt-6 text-center text-sm" style={{ color: 'var(--sb-text-dim)' }}>
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium transition-colors duration-150 hover:underline"
                style={{ color: 'var(--sb-accent)' }}
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}