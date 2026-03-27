import { useState, useRef, useEffect } from 'react';
import { Mail, Lock, KeyRound, AlertCircle, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { requestReset, resetPassword } from '../../api/authApi';
import { Link, useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────
   Shared CSS
───────────────────────────────────────────────────────────── */
const SHARED_CSS = `
  @keyframes authSlideUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes authFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes authPulse {
    0%, 100% { opacity: 0.35; }
    50%       { opacity: 0.7;  }
  }
  @keyframes authSuccessPop {
    0%   { opacity: 0; transform: scale(0.85); }
    60%  { transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes authStepSlide {
    from { opacity: 0; transform: translateX(24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes progressFill {
    from { width: 50%; }
    to   { width: 100%; }
  }

  .af-1 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.08s both; }
  .af-2 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.16s both; }
  .af-3 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.24s both; }
  .af-4 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.32s both; }
  .af-5 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.40s both; }

  .step-enter { animation: authStepSlide 0.42s cubic-bezier(0.22,1,0.36,1) both; }

  .ul-input {
    width: 100%;
    padding: 10px 32px 10px 0;
    background: transparent;
    border: none;
    border-bottom: 1.5px solid var(--sb-border-strong);
    color: var(--sb-text);
    font-size: 15px;
    font-family: var(--font-body);
    outline: none;
    transition: border-color 0.25s ease;
    caret-color: var(--sb-accent);
  }
  .ul-input:focus    { border-bottom-color: var(--sb-accent); }
  .ul-input.ul-err   { border-bottom-color: var(--sb-danger); }
  .ul-input::placeholder { color: var(--sb-text-dim); font-size: 14px; }
  .ul-input:disabled { opacity: 0.45; cursor: not-allowed; }

  .code-input {
    width: 100%;
    padding: 12px 0;
    background: transparent;
    border: none;
    border-bottom: 2px solid var(--sb-border-strong);
    color: var(--sb-text);
    font-size: 26px;
    font-family: var(--font-body);
    font-weight: 300;
    letter-spacing: 0.4em;
    text-align: center;
    outline: none;
    transition: border-color 0.25s ease;
    caret-color: var(--sb-accent);
  }
  .code-input:focus  { border-bottom-color: var(--sb-accent); }
  .code-input.ul-err { border-bottom-color: var(--sb-danger); }
  .code-input::placeholder { color: var(--sb-border-strong); letter-spacing: 0.4em; }
.ul-input:-webkit-autofill,
						.ul-input:-webkit-autofill:hover,
						.ul-input:-webkit-autofill:focus {
							-webkit-box-shadow: 0 0 0 1000px var(--sb-bg-elevated) inset !important;
							-webkit-text-fill-color: var(--sb-text) !important;
						}
						.ul-input:-webkit-autofill::first-line {
							font-family: var(--font-body);
						}

						.code-input:-webkit-autofill,
						.code-input:-webkit-autofill:hover,
						.code-input:-webkit-autofill:focus {
							-webkit-box-shadow: 0 0 0 1000px var(--sb-bg-elevated) inset !important;
							-webkit-text-fill-color: var(--sb-text) !important;
  .auth-btn {
    position: relative;
    overflow: hidden;
    transition: opacity 0.2s ease, transform 0.15s ease;
  }
  .auth-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.55s ease;
  }
  .auth-btn:hover:not(:disabled)::after { transform: translateX(100%); }
  .auth-btn:active:not(:disabled)       { transform: scale(0.985); }

  .auth-dot-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, var(--sb-border-strong) 1.2px, transparent 1.2px);
    background-size: 22px 22px;
    pointer-events: none;
  }

  .sk-pulse { animation: authPulse 1.6s ease-in-out infinite; }
  .success-pop { animation: authSuccessPop 0.55s cubic-bezier(0.22,1,0.36,1) both; }

  @media (max-width: 660px) {
    .auth-left  { display: none !important; }
    .auth-right { border-radius: 20px !important; }
  }
`;

/* ─────────────────────────────────────────────────────────────
   Layout constants
───────────────────────────────────────────────────────────── */
const cardStyle = {
  display: 'flex',
  width: '100%',
  maxWidth: 860,
  minHeight: 520,
  borderRadius: 22,
  overflow: 'hidden',
  border: '1px solid var(--sb-border)',
  boxShadow: '0 32px 90px rgba(0,0,0,0.28)',
};

const leftStyle = {
  width: '40%',
  minWidth: 210,
  background: 'var(--sb-bg)',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '40px 34px',
  overflow: 'hidden',
};

const glowStyle = {
  position: 'absolute',
  width: 340,
  height: 340,
  borderRadius: '50%',
  background: 'radial-gradient(circle, var(--sb-accent-bg) 0%, transparent 68%)',
  top: -130,
  right: -130,
  pointerEvents: 'none',
};

const rightStyle = {
  flex: 1,
  background: 'var(--sb-bg-elevated)',
  padding: '48px 44px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */
function FieldLabel({ htmlFor, icon: Icon, children }) {
  return (
    <label htmlFor={htmlFor} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--sb-text-dim)',
      marginBottom: 6, userSelect: 'none',
    }}>
      {Icon && <Icon size={11} aria-hidden="true" />}
      {children}
    </label>
  );
}

function FieldError({ id, msg }) {
  if (!msg) return null;
  return (
    <span id={id} role="alert" style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: 11.5, color: 'var(--sb-danger)', marginTop: 5,
    }}>
      <AlertCircle size={11} aria-hidden="true" />
      {msg}
    </span>
  );
}

function LogoMark() {
  return (
    <div style={{
      width: 38, height: 38, borderRadius: 10,
      background: 'var(--sb-accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 34,
    }}>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <polygon points="10,2 18,7 18,13 10,18 2,13 2,7" fill="var(--app-bg)" fillOpacity="0.9" />
      </svg>
    </div>
  );
}

/* Step indicator dots */
function StepDots({ step }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 24 }} aria-label={`Step ${step} of 2`}>
      {[1, 2].map(s => (
        <div key={s} style={{
          height: 3,
          width: step >= s ? 28 : 10,
          borderRadius: 3,
          background: step >= s ? 'var(--sb-accent)' : 'var(--sb-border-strong)',
          transition: 'width 0.35s ease, background 0.35s ease',
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Skeleton
───────────────────────────────────────────────────────────── */
function SkeletonLoader({ step }) {
  return (
    <div className="auth-page" role="status" aria-label="Processing, please wait" aria-live="polite">
      <style>{SHARED_CSS}</style>
      <div style={cardStyle}>
        <div className="auth-left" style={leftStyle}>
          <div className="auth-dot-grid" />
          <div style={glowStyle} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="sk-pulse" style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--sb-accent-bg)', marginBottom: 34 }} />
            <div className="sk-pulse" style={{ width: 115, height: 32, borderRadius: 6, background: 'var(--sb-hover)', marginBottom: 14 }} />
            <div className="sk-pulse" style={{ width: 155, height: 13, borderRadius: 4, background: 'var(--sb-hover)' }} />
          </div>
        </div>
        <div className="auth-right" style={rightStyle}>
          <div className="sk-pulse" style={{ width: 140, height: 22, borderRadius: 5, background: 'var(--sb-hover)', marginBottom: 6 }} />
          <div className="sk-pulse" style={{ width: 185, height: 13, borderRadius: 4, background: 'var(--sb-hover)', marginBottom: 40 }} />
          {Array.from({ length: step === 1 ? 1 : 3 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 28 }}>
              <div className="sk-pulse" style={{ width: 72, height: 10, borderRadius: 3, background: 'var(--sb-hover)', marginBottom: 10 }} />
              <div className="sk-pulse" style={{ width: '100%', height: 1.5, borderRadius: 1, background: 'var(--sb-border-strong)' }} />
            </div>
          ))}
          <div className="sk-pulse" style={{ width: '100%', height: 46, borderRadius: 12, background: 'var(--sb-accent-bg)', marginTop: 8 }} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Email regex
───────────────────────────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ─────────────────────────────────────────────────────────────
   ForgotPassword
───────────────────────────────────────────────────────────── */
export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep]                   = useState(1);
  const [email, setEmail]                 = useState('');
  const [code, setCode]                   = useState('');
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                 = useState('');
  const [fieldErrors, setFieldErrors]     = useState({});
  const [loading, setLoading]             = useState(false);
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [success, setSuccess]             = useState(false);

  const errorRef = useRef(null);
  const codeRef  = useRef(null);

  useEffect(() => { if (error && errorRef.current) errorRef.current.focus(); }, [error]);
  useEffect(() => { if (step === 2) setTimeout(() => codeRef.current?.focus(), 60); }, [step]);

  const clearError = (field) => {
    if (error) setError('');
    if (field && fieldErrors[field]) setFieldErrors(p => ({ ...p, [field]: '' }));
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    if (!email)                   { setFieldErrors({ email: 'Email is required.' }); return; }
    if (!EMAIL_RE.test(email))    { setFieldErrors({ email: 'Enter a valid email address (e.g. name@example.com).' }); return; }
    setLoading(true);
    try {
      await requestReset({ email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code. Try again.');
    } finally { setLoading(false); }
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
      setTimeout(() => navigate('/login'), 2800);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code.');
    } finally { setLoading(false); }
  };

  const goBack = () => {
    setStep(1);
    setError('');
    setFieldErrors({});
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (loading) return <SkeletonLoader step={step} />;

  /* ── Success screen ── */
  if (success) {
    return (
      <div className="auth-page">
        <style>{SHARED_CSS}</style>
        <div style={cardStyle}>
          <div className="auth-left" style={leftStyle}>
            <div className="auth-dot-grid" />
            <div style={glowStyle} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <LogoMark />
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(26px, 3vw, 36px)',
                lineHeight: 1.18,
                color: 'var(--sb-text)',
                marginBottom: 14,
              }}>
                All done.
              </h2>
              <p style={{ fontSize: 13, color: 'var(--sb-text-dim)', lineHeight: 1.65, maxWidth: 195 }}>
                Your password has been securely updated.
              </p>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[32, 8, 8].map((w, i) => (
                  <div key={i} style={{
                    height: 2, width: w, borderRadius: 2,
                    background: i === 0 ? 'var(--sb-accent)' : 'var(--sb-border-strong)',
                  }} />
                ))}
              </div>
            </div>
          </div>

          <div className="auth-right" style={{ ...rightStyle, alignItems: 'center', textAlign: 'center' }}>
            <div className="success-pop" style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'var(--sb-accent-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 24, color: 'var(--sb-accent)',
            }}>
              <CheckCircle size={34} />
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28, color: 'var(--sb-text)',
              marginBottom: 10,
            }}>
              Password reset!
            </h1>
            <p style={{ fontSize: 14, color: 'var(--sb-text-secondary)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
              Your password has been updated. Redirecting you to login…
            </p>
            {/* Animated progress bar */}
            <div style={{
              width: 200, height: 3, borderRadius: 3,
              background: 'var(--sb-border-strong)',
              marginTop: 32, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: '100%',
                background: 'var(--sb-accent)',
                borderRadius: 3,
                animation: 'progressFill 2.8s linear forwards',
                transformOrigin: 'left',
              }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Left panel copy changes per step ── */
  const leftCopy = step === 1
    ? { title: 'Forgot your', italic: 'password?', sub: 'Enter your email and we\'ll send you a reset code instantly.' }
    : { title: 'Almost', italic: 'there.', sub: `Check your inbox for the 6-digit code sent to ${email}` };

  return (
    <div className="auth-page">
      <style>{SHARED_CSS}</style>

      <a href="#fp-form" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm"
        style={{ background: 'var(--sb-accent)', color: 'var(--app-bg)', fontWeight: 600 }}>
        Skip to form
      </a>

      <div style={cardStyle} role="main">
        {/* ── Left panel ── */}
        <div className="auth-left" style={leftStyle}>
          <div className="auth-dot-grid" />
          <div style={glowStyle} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <LogoMark />
            <h2
              key={step}  /* re-mounts on step change to re-trigger animation */
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(26px, 3vw, 36px)',
                lineHeight: 1.18,
                color: 'var(--sb-text)',
                marginBottom: 14,
                animation: 'authFadeIn 0.35s ease both',
              }}>
              {leftCopy.title}<br />
              <em style={{ color: 'var(--sb-accent)', fontStyle: 'italic' }}>{leftCopy.italic}</em>
            </h2>
            <p style={{ fontSize: 13, color: 'var(--sb-text-dim)', lineHeight: 1.65, maxWidth: 200 }}>
              {leftCopy.sub}
            </p>

            <StepDots step={step} />
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[32, 8, 8].map((w, i) => (
                <div key={i} style={{
                  height: 2, width: w, borderRadius: 2,
                  background: i === 0 ? 'var(--sb-accent)' : 'var(--sb-border-strong)',
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: form ── */}
        <div className="auth-right" style={rightStyle}>

          {/* Heading */}
          <div className="af-1" style={{ marginBottom: 32 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--sb-text)', marginBottom: 4 }}>
              {step === 1 ? 'Reset password' : 'Enter your code'}
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--sb-text-dim)' }}>
              {step === 1
                ? <>Remember it?{' '}<Link to="/login" style={{ color: 'var(--sb-accent)', fontWeight: 500, textDecoration: 'none' }}
                    onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.target.style.textDecoration = 'none'}>Back to login</Link></>
                : <>Sent to <strong style={{ color: 'var(--sb-text-secondary)' }}>{email}</strong></>
              }
            </p>
          </div>

          {/* Global error */}
          {error && (
            <div ref={errorRef} tabIndex={-1} role="alert" aria-live="assertive"
              className="af-1"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 9,
                padding: '12px 14px', borderRadius: 10, marginBottom: 22,
                background: 'var(--sb-danger-bg)', border: '1px solid var(--sb-danger-border)',
                color: 'var(--sb-danger)', fontSize: 13,
              }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              {error}
            </div>
          )}

          {/* ── Step 1: Email ── */}
          {step === 1 && (
            <form id="fp-form" key="step1" onSubmit={handleRequestCode} noValidate aria-label="Request password reset">
              <div className="af-2" style={{ marginBottom: 28 }}>
                <FieldLabel htmlFor="fp-email" icon={Mail}>Email address</FieldLabel>
                <input
                  id="fp-email" type="email"
                  className={`ul-input${fieldErrors.email ? ' ul-err' : ''}`}
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearError('email'); }}
                  onBlur={() => {
                    if (!email)                 setFieldErrors(p => ({ ...p, email: 'Email is required.' }));
                    else if (!EMAIL_RE.test(email)) setFieldErrors(p => ({ ...p, email: 'Enter a valid email address (e.g. name@example.com).' }));
                  }}
                  required autoComplete="email" autoFocus
                  aria-required="true" aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'fp-email-error' : undefined}
                />
                <FieldError id="fp-email-error" msg={fieldErrors.email} />
              </div>

              <div className="af-3">
                <button
                  type="submit" aria-busy={loading}
                  className="auth-btn"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '13px 0', borderRadius: 12,
                    background: 'var(--sb-accent)', color: 'var(--app-bg)',
                    fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
                    border: 'none', cursor: 'pointer',
                  }}>
                  <Mail size={15} aria-hidden="true" />
                  Send reset code
                </button>
              </div>
            </form>
          )}

          {/* ── Step 2: Code + new passwords ── */}
          {step === 2 && (
            <form id="fp-form" key="step2" className="step-enter" onSubmit={handleResetPassword} noValidate aria-label="Reset your password">

              {/* Code */}
              <div className="af-2" style={{ marginBottom: 28, textAlign: 'center' }}>
                <FieldLabel htmlFor="fp-code" icon={KeyRound}>6-digit code</FieldLabel>
                <input
                  id="fp-code" ref={codeRef} type="text"
                  className={`code-input${fieldErrors.code ? ' ul-err' : ''}`}
                  placeholder="000000"
                  value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); clearError('code'); }}
                  required autoComplete="one-time-code" inputMode="numeric" maxLength={6}
                  aria-required="true" aria-invalid={!!fieldErrors.code}
                  aria-describedby={fieldErrors.code ? 'fp-code-error' : 'fp-code-hint'}
                />
                {fieldErrors.code
                  ? <FieldError id="fp-code-error" msg={fieldErrors.code} />
                  : <span id="fp-code-hint" style={{ fontSize: 11, color: 'var(--sb-text-dim)', marginTop: 5, display: 'block' }}>
                      Check your inbox
                    </span>
                }
              </div>

              {/* New password */}
              <div className="af-3" style={{ marginBottom: 24 }}>
                <FieldLabel htmlFor="fp-new-password" icon={Lock}>New password</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <input
                    id="fp-new-password"
                    type={showNew ? 'text' : 'password'}
                    className={`ul-input${fieldErrors.newPassword ? ' ul-err' : ''}`}
                    style={{ paddingRight: 32 }}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); clearError('newPassword'); }}
                    required autoComplete="new-password"
                    aria-required="true" aria-invalid={!!fieldErrors.newPassword}
                    aria-describedby={fieldErrors.newPassword ? 'fp-new-pw-error' : undefined}
                  />
                  <button type="button"
                    onClick={() => setShowNew(v => !v)}
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                    aria-pressed={showNew}
                    style={{
                      position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--sb-text-dim)', display: 'flex', padding: 4,
                    }}>
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <FieldError id="fp-new-pw-error" msg={fieldErrors.newPassword} />
              </div>

              {/* Confirm password */}
              <div className="af-4" style={{ marginBottom: 8 }}>
                <FieldLabel htmlFor="fp-confirm-password" icon={Lock}>Confirm password</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <input
                    id="fp-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    className={`ul-input${fieldErrors.confirmPassword ? ' ul-err' : ''}`}
                    style={{ paddingRight: 32 }}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }}
                    required autoComplete="new-password"
                    aria-required="true" aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? 'fp-confirm-error' : undefined}
                  />
                  <button type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    aria-pressed={showConfirm}
                    style={{
                      position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--sb-text-dim)', display: 'flex', padding: 4,
                    }}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <FieldError id="fp-confirm-error" msg={fieldErrors.confirmPassword} />
              </div>

              <div className="af-5" style={{ marginTop: 28 }}>
                <button
                  type="submit" aria-busy={loading}
                  className="auth-btn"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '13px 0', borderRadius: 12,
                    background: 'var(--sb-accent)', color: 'var(--app-bg)',
                    fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
                    border: 'none', cursor: 'pointer',
                  }}>
                  <CheckCircle size={15} aria-hidden="true" />
                  Reset password
                </button>
              </div>

              {/* Back link */}
              <div style={{ marginTop: 18, textAlign: 'center' }}>
                <button type="button" onClick={goBack}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 13, color: 'var(--sb-accent)', fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                  }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                  <ArrowLeft size={13} aria-hidden="true" />
                  Use a different email
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}