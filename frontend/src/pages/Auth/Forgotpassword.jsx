import { useState, useRef, useEffect } from 'react';
import { Mail, Lock, KeyRound, AlertCircle, Loader, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { requestReset, resetPassword } from '../../api/authApi';
import { Link, useNavigate } from 'react-router-dom';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function SkeletonLoader({ step }) {
  return (
    <div className="w-full max-w-md mx-auto" role="status" aria-label="Processing, please wait" aria-live="polite">
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--sb-bg-elevated)', border: '1px solid var(--sb-border)' }}>
        <div className="p-8 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full animate-pulse" style={{ background: 'var(--sb-hover)' }} />
          <div className="w-40 h-6 rounded-lg animate-pulse" style={{ background: 'var(--sb-hover)' }} />
          <div className="w-56 h-4 rounded-lg animate-pulse" style={{ background: 'var(--sb-hover)' }} />
        </div>
        <div className="px-8 pb-8 flex flex-col gap-5">
          {Array.from({ length: step === 1 ? 1 : 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="w-24 h-4 rounded animate-pulse" style={{ background: 'var(--sb-hover)' }} />
              <div className="w-full h-11 rounded-xl animate-pulse" style={{ background: 'var(--sb-hover)' }} />
            </div>
          ))}
          <div className="w-full h-11 rounded-xl animate-pulse mt-2" style={{ background: 'var(--sb-accent-bg)' }} />
        </div>
      </div>
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const errorRef = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    if (error && errorRef.current) errorRef.current.focus();
  }, [error]);

  useEffect(() => {
    if (step === 2) setTimeout(() => codeRef.current?.focus(), 50);
  }, [step]);

  const clearError = (field) => {
    if (error) setError('');
    if (field && fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) { setFieldErrors({ email: 'Email is required.' }); return; }
    if (!EMAIL_RE.test(email)) { setFieldErrors({ email: 'Enter a valid email address (e.g. name@example.com).' }); return; }
    setLoading(true);
    try {
      await requestReset({ email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    const errs = {};
    if (!code || code.length !== 6) errs.code = 'Enter the 6-digit code.';
    if (!newPassword || newPassword.length < 6) errs.newPassword = 'Password must be at least 6 characters.';
    if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setLoading(true);
    try {
      await resetPassword({ email, code, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep(1);
    setError('');
    setFieldErrors({});
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const inputBase = 'w-full px-4 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none border disabled:opacity-50 disabled:cursor-not-allowed';

  const inputStyle = (field) => ({
    background: 'var(--sb-bg)',
    color: 'var(--sb-text)',
    borderColor: fieldErrors[field] ? 'var(--sb-danger)' : 'var(--sb-border-strong)',
    boxShadow: fieldErrors[field] ? '0 0 0 3px var(--sb-danger-focus)' : undefined,
  });

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center px-4 overflow-y-auto" style={{ background: 'var(--app-bg)', zIndex: 9999 }}>
      <SkeletonLoader step={step} />
    </div>
  );

  if (success) return (
    <div className="fixed inset-0 flex items-center justify-center px-4 overflow-y-auto" style={{ background: 'var(--app-bg)', zIndex: 9999 }}>
      <div className="w-full max-w-md">
        <div
          className="rounded-2xl overflow-hidden"
          role="main"
          aria-labelledby="success-heading"
          style={{ background: 'var(--sb-bg-elevated)', border: '1px solid var(--sb-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
        >
          <div className="px-8 py-14 flex flex-col items-center gap-4 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--sb-accent-bg)', color: 'var(--sb-accent)' }}
              aria-hidden="true"
            >
              <CheckCircle size={32} />
            </div>
            <h1
              id="success-heading"
              className="text-2xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--sb-text)' }}
            >
              Password reset!
            </h1>
            <p className="text-sm" style={{ color: 'var(--sb-text-secondary)' }}>
              Your password has been updated. Redirecting you to login…
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 py-12 overflow-y-auto" style={{ background: 'var(--app-bg)', zIndex: 9999 }}>
      <a
        href="#fp-form"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm font-medium"
        style={{ background: 'var(--sb-accent)', color: 'var(--app-bg)' }}
      >
        Skip to form
      </a>

      <div className="w-full max-w-md">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--sb-bg-elevated)', border: '1px solid var(--sb-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
        >
          <div className="px-8 pt-10 pb-6 flex flex-col items-center gap-3 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--sb-accent-bg)', color: 'var(--sb-accent)' }}
              aria-hidden="true"
            >
              <KeyRound size={26} />
            </div>
            <h1
              id="fp-heading"
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--sb-text)' }}
            >
              {step === 1 ? 'Forgot password' : 'Reset password'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--sb-text-secondary)' }}>
              {step === 1
                ? "Enter your email and we'll send you a reset code"
                : `Enter the code sent to ${email}`}
            </p>

            {step === 2 && (
              <div
                className="flex items-center gap-2 mt-1"
                aria-label="Step 2 of 2"
              >
                <div className="w-8 h-1 rounded-full" style={{ background: 'var(--sb-accent)' }} />
                <div className="w-8 h-1 rounded-full" style={{ background: 'var(--sb-accent)' }} />
              </div>
            )}
            {step === 1 && (
              <div className="flex items-center gap-2 mt-1" aria-label="Step 1 of 2">
                <div className="w-8 h-1 rounded-full" style={{ background: 'var(--sb-accent)' }} />
                <div className="w-8 h-1 rounded-full" style={{ background: 'var(--sb-border-strong)' }} />
              </div>
            )}
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

            {step === 1 ? (
              <form id="fp-form" onSubmit={handleRequestCode} noValidate aria-labelledby="fp-heading">
                <div className="flex flex-col gap-5">

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="fp-email"
                      className="flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: 'var(--sb-text-secondary)' }}
                    >
                      <Mail size={13} aria-hidden="true" />
                      <span>Email address</span>
                    </label>
                    <input
                      id="fp-email"
                      type="email"
                      className={inputBase}
                      style={inputStyle('email')}
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                      onBlur={() => {
                        if (!email) setFieldErrors((p) => ({ ...p, email: 'Email is required.' }));
                        else if (!EMAIL_RE.test(email)) setFieldErrors((p) => ({ ...p, email: 'Enter a valid email address (e.g. name@example.com).' }));
                      }}
                      required
                      autoComplete="email"
                      autoFocus
                      aria-required="true"
                      aria-invalid={!!fieldErrors.email}
                      aria-describedby={fieldErrors.email ? 'fp-email-error' : undefined}
                    />
                    {fieldErrors.email && (
                      <span id="fp-email-error" role="alert" className="flex items-center gap-1 text-xs" style={{ color: 'var(--sb-danger)' }}>
                        <AlertCircle size={11} aria-hidden="true" />
                        {fieldErrors.email}
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    aria-busy={loading}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 mt-1"
                    style={{ background: 'var(--sb-accent)', color: 'var(--app-bg)' }}
                  >
                    <Mail size={16} aria-hidden="true" />
                    <span>Send reset code</span>
                  </button>

                  <p className="text-center text-sm" style={{ color: 'var(--sb-text-dim)' }}>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1 transition-colors duration-150 hover:underline"
                      style={{ color: 'var(--sb-accent)' }}
                    >
                      <ArrowLeft size={13} aria-hidden="true" />
                      Back to login
                    </Link>
                  </p>

                </div>
              </form>
            ) : (
              <form id="fp-form" onSubmit={handleResetPassword} noValidate aria-labelledby="fp-heading">
                <div className="flex flex-col gap-5">

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="fp-code"
                      className="flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: 'var(--sb-text-secondary)' }}
                    >
                      <KeyRound size={13} aria-hidden="true" />
                      <span>Reset code</span>
                    </label>
                    <input
                      id="fp-code"
                      ref={codeRef}
                      type="text"
                      className={inputBase + ' tracking-widest text-center font-mono text-lg'}
                      style={inputStyle('code')}
                      placeholder="000000"
                      value={code}
                      onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); clearError('code'); }}
                      required
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                      aria-required="true"
                      aria-invalid={!!fieldErrors.code}
                      aria-describedby={fieldErrors.code ? 'fp-code-error' : 'fp-code-hint'}
                    />
                    {fieldErrors.code ? (
                      <span id="fp-code-error" role="alert" className="flex items-center gap-1 text-xs" style={{ color: 'var(--sb-danger)' }}>
                        <AlertCircle size={11} aria-hidden="true" />
                        {fieldErrors.code}
                      </span>
                    ) : (
                      <span id="fp-code-hint" className="text-xs" style={{ color: 'var(--sb-text-dim)' }}>
                        Check your inbox for the 6-digit code
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="fp-new-password"
                      className="flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: 'var(--sb-text-secondary)' }}
                    >
                      <Lock size={13} aria-hidden="true" />
                      <span>New password</span>
                    </label>
                    <div className="relative">
                      <input
                        id="fp-new-password"
                        type={showNew ? 'text' : 'password'}
                        className={inputBase + ' pr-11'}
                        style={inputStyle('newPassword')}
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); clearError('newPassword'); }}
                        required
                        autoComplete="new-password"
                        aria-required="true"
                        aria-invalid={!!fieldErrors.newPassword}
                        aria-describedby={fieldErrors.newPassword ? 'fp-new-pw-error' : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        aria-label={showNew ? 'Hide password' : 'Show password'}
                        aria-pressed={showNew}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-150"
                        style={{ color: 'var(--sb-text-dim)' }}
                      >
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {fieldErrors.newPassword && (
                      <span id="fp-new-pw-error" role="alert" className="flex items-center gap-1 text-xs" style={{ color: 'var(--sb-danger)' }}>
                        <AlertCircle size={11} aria-hidden="true" />
                        {fieldErrors.newPassword}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="fp-confirm-password"
                      className="flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: 'var(--sb-text-secondary)' }}
                    >
                      <Lock size={13} aria-hidden="true" />
                      <span>Confirm password</span>
                    </label>
                    <div className="relative">
                      <input
                        id="fp-confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        className={inputBase + ' pr-11'}
                        style={inputStyle('confirmPassword')}
                        placeholder="Repeat new password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }}
                        required
                        autoComplete="new-password"
                        aria-required="true"
                        aria-invalid={!!fieldErrors.confirmPassword}
                        aria-describedby={fieldErrors.confirmPassword ? 'fp-confirm-error' : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                        aria-pressed={showConfirm}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-150"
                        style={{ color: 'var(--sb-text-dim)' }}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <span id="fp-confirm-error" role="alert" className="flex items-center gap-1 text-xs" style={{ color: 'var(--sb-danger)' }}>
                        <AlertCircle size={11} aria-hidden="true" />
                        {fieldErrors.confirmPassword}
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    aria-busy={loading}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 mt-1"
                    style={{ background: 'var(--sb-accent)', color: 'var(--app-bg)' }}
                  >
                    <CheckCircle size={16} aria-hidden="true" />
                    <span>Reset password</span>
                  </button>

                  <p className="text-center text-sm" style={{ color: 'var(--sb-text-dim)' }}>
                    <button
                      type="button"
                      onClick={goBack}
                      className="inline-flex items-center gap-1 transition-colors duration-150 hover:underline"
                      style={{ color: 'var(--sb-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <ArrowLeft size={13} aria-hidden="true" />
                      Use a different email
                    </button>
                  </p>

                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}