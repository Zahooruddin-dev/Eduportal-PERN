import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Lock, UserPlus, AlertCircle, Shield, Eye, EyeOff } from 'lucide-react';
import { registerUser } from '../../api/authApi';
import { useAuth } from '../../utils/AuthContext';
import { Link, useNavigate } from 'react-router';

/* ─────────────────────────────────────────────────────────────
   Shared CSS (same tokens as Login — copied for standalone use)
───────────────────────────────────────────────────────────── */
const SHARED_CSS = `
  @keyframes authSlideUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes authPulse {
    0%, 100% { opacity: 0.35; }
    50%       { opacity: 0.7;  }
  }
  .af-1 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.08s both; }
  .af-2 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.16s both; }
  .af-3 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.24s both; }
  .af-4 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.32s both; }
  .af-5 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.40s both; }
  .af-6 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.48s both; }

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

  .ul-select {
    width: 100%;
    padding: 10px 0;
    background: transparent;
    border: none;
    border-bottom: 1.5px solid var(--sb-border-strong);
    color: var(--sb-text);
    font-size: 15px;
    font-family: var(--font-body);
    outline: none;
    cursor: pointer;
    transition: border-color 0.25s ease;
    appearance: none;
    -webkit-appearance: none;
  }
  .ul-select:focus { border-bottom-color: var(--sb-accent); }
  .ul-select option { background: var(--sb-bg-elevated); }

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
  minHeight: 580,
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
  width: 360,
  height: 360,
  borderRadius: '50%',
  background: 'radial-gradient(circle, var(--sb-accent-bg) 0%, transparent 68%)',
  top: -140,
  right: -140,
  pointerEvents: 'none',
};

const rightStyle = {
  flex: 1,
  background: 'var(--sb-bg-elevated)',
  padding: '40px 44px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  overflowY: 'auto',
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

/* ─────────────────────────────────────────────────────────────
   Skeleton
───────────────────────────────────────────────────────────── */
function SkeletonLoader() {
  return (
    <div className="auth-page" role="status" aria-label="Creating your account, please wait" aria-live="polite">
      <style>{SHARED_CSS}</style>
      <div style={cardStyle}>
        <div className="auth-left" style={leftStyle}>
          <div className="auth-dot-grid" />
          <div style={glowStyle} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="sk-pulse" style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--sb-accent-bg)', marginBottom: 34 }} />
            <div className="sk-pulse" style={{ width: 130, height: 34, borderRadius: 6, background: 'var(--sb-hover)', marginBottom: 14 }} />
            <div className="sk-pulse" style={{ width: 165, height: 13, borderRadius: 4, background: 'var(--sb-hover)' }} />
          </div>
        </div>
        <div className="auth-right" style={{ ...rightStyle }}>
          <div className="sk-pulse" style={{ width: 130, height: 22, borderRadius: 5, background: 'var(--sb-hover)', marginBottom: 6 }} />
          <div className="sk-pulse" style={{ width: 180, height: 13, borderRadius: 4, background: 'var(--sb-hover)', marginBottom: 36 }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ marginBottom: 26 }}>
              <div className="sk-pulse" style={{ width: 72, height: 10, borderRadius: 3, background: 'var(--sb-hover)', marginBottom: 10 }} />
              <div className="sk-pulse" style={{ width: '100%', height: 1.5, borderRadius: 1, background: 'var(--sb-border-strong)' }} />
            </div>
          ))}
          <div className="sk-pulse" style={{ width: '100%', height: 46, borderRadius: 12, background: 'var(--sb-accent-bg)', marginTop: 6 }} />
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
   Register
───────────────────────────────────────────────────────────── */
export default function Register() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [formData, setFormData]     = useState({ username: '', email: '', password: '', role: 'student' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailRef    = useRef(null);
  const passwordRef = useRef(null);
  const errorRef    = useRef(null);

  useEffect(() => { if (error && errorRef.current) errorRef.current.focus(); }, [error]);

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
    setFormData(p => ({ ...p, [name]: value }));
    if (error) setError('');
    if (fieldErrors[name]) setFieldErrors(p => ({ ...p, [name]: '' }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const msg = validateField(name, value);
    if (msg) setFieldErrors(p => ({ ...p, [name]: msg }));
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const msg = validateField('email', formData.email);
      if (msg) { setFieldErrors(p => ({ ...p, email: msg })); return; }
      passwordRef.current?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    ['username', 'email', 'password'].forEach(f => {
      const msg = validateField(f, formData[f]);
      if (msg) errs[f] = msg;
    });
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setError('');
    setLoading(true);
    try {
      const response = await registerUser(formData);
      localStorage.setItem('token', response.data.token);
      refreshUser();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  if (loading) return <SkeletonLoader />;

  const roleColors = {
    student: 'var(--sb-badge-student-color)',
    teacher: 'var(--sb-badge-teacher-color)',
  };

  return (
    <div className="auth-page">
      <style>{SHARED_CSS}</style>

      <a href="#reg-username" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm"
        style={{ background: 'var(--sb-accent)', color: 'var(--app-bg)', fontWeight: 600 }}>
        Skip to form
      </a>

      <div style={cardStyle} role="main">
        {/* ── Left panel ── */}
        <div className="auth-left" style={leftStyle}>
          <div className="auth-dot-grid" />
          <div style={glowStyle} />

          {/* Second glow — bottom-left accent */}
          <div style={{
            position: 'absolute',
            width: 220, height: 220, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(167,141,245,0.08) 0%, transparent 68%)',
            bottom: -80, left: -60, pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <LogoMark />
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(26px, 3vw, 36px)',
              lineHeight: 1.18,
              color: 'var(--sb-text)',
              marginBottom: 14,
            }}>
              Begin your<br />
              <em style={{ color: 'var(--sb-accent)', fontStyle: 'italic' }}>journey.</em>
            </h2>
            <p style={{ fontSize: 13, color: 'var(--sb-text-dim)', lineHeight: 1.65, maxWidth: 195 }}>
              Join thousands of learners and educators on the platform.
            </p>
          </div>

          {/* Role badges preview */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 11, color: 'var(--sb-text-dim)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Join as
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Student', 'Teacher'].map(r => (
                <span key={r} style={{
                  fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                  background: r === 'Student' ? 'var(--sb-badge-student-bg)' : 'var(--sb-badge-teacher-bg)',
                  color: r === 'Student' ? 'var(--sb-badge-student-color)' : 'var(--sb-badge-teacher-color)',
                  border: `1px solid ${r === 'Student' ? 'var(--sb-badge-student-border)' : 'var(--sb-badge-teacher-border)'}`,
                }}>
                  {r}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 20 }}>
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
              Create account
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--sb-text-dim)' }}>
              Already have an account?{' '}
              <Link to="/login"
                style={{ color: 'var(--sb-accent)', fontWeight: 500, textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                onMouseLeave={e => e.target.style.textDecoration = 'none'}>
                Sign in
              </Link>
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

          <form onSubmit={handleSubmit} noValidate aria-label="Create a new account">

            {/* Username */}
            <div className="af-2" style={{ marginBottom: 24 }}>
              <FieldLabel htmlFor="reg-username" icon={User}>Username</FieldLabel>
              <input
                id="reg-username" type="text" name="username"
                className={`ul-input${fieldErrors.username ? ' ul-err' : ''}`}
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange} onBlur={handleBlur}
                required autoComplete="username" autoFocus
                aria-required="true" aria-invalid={!!fieldErrors.username}
                aria-describedby={fieldErrors.username ? 'reg-username-error' : undefined}
              />
              <FieldError id="reg-username-error" msg={fieldErrors.username} />
            </div>

            {/* Email */}
            <div className="af-3" style={{ marginBottom: 24 }}>
              <FieldLabel htmlFor="reg-email" icon={Mail}>Email address</FieldLabel>
              <input
                id="reg-email" ref={emailRef} type="email" name="email"
                className={`ul-input${fieldErrors.email ? ' ul-err' : ''}`}
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange} onBlur={handleBlur} onKeyDown={handleEmailKeyDown}
                required autoComplete="email"
                aria-required="true" aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'reg-email-error' : 'reg-email-hint'}
              />
              {fieldErrors.email
                ? <FieldError id="reg-email-error" msg={fieldErrors.email} />
                : <span id="reg-email-hint" style={{ fontSize: 11, color: 'var(--sb-text-dim)', marginTop: 4, display: 'block' }}>
                    Press Enter to move to password
                  </span>
              }
            </div>

            {/* Password */}
            <div className="af-4" style={{ marginBottom: 24 }}>
              <FieldLabel htmlFor="reg-password" icon={Lock}>Password</FieldLabel>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password" ref={passwordRef}
                  type={showPassword ? 'text' : 'password'} name="password"
                  className={`ul-input${fieldErrors.password ? ' ul-err' : ''}`}
                  style={{ paddingRight: 32 }}
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange} onBlur={handleBlur}
                  required autoComplete="new-password" minLength={6}
                  aria-required="true" aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'reg-password-error' : undefined}
                />
                <button type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  style={{
                    position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--sb-text-dim)', display: 'flex', padding: 4,
                  }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <FieldError id="reg-password-error" msg={fieldErrors.password} />
            </div>

            {/* Role */}
            <div className="af-5" style={{ marginBottom: 8 }}>
              <FieldLabel htmlFor="reg-role" icon={Shield}>Account type</FieldLabel>
              <div style={{ position: 'relative' }}>
                <select
                  id="reg-role" name="role"
                  className="ul-select"
                  value={formData.role}
                  onChange={handleChange}
                  required aria-required="true">
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
                {/* Custom chevron */}
                <svg style={{
                  position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                  pointerEvents: 'none', color: 'var(--sb-text-dim)',
                }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {/* Submit */}
            <div className="af-6" style={{ marginTop: 32 }}>
              <button
                type="submit" disabled={loading} aria-busy={loading}
                className="auth-btn"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '13px 0', borderRadius: 12,
                  background: 'var(--sb-accent)', color: 'var(--app-bg)',
                  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}>
                <UserPlus size={15} aria-hidden="true" />
                Create account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}