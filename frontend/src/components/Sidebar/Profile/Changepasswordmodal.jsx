import { useState } from 'react';
import { X, Lock, KeyRound, Loader, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { changePassword } from '../../../api/authApi';

/* ─────────────────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────────────────── */
const MODAL_CSS = `
  @keyframes cpOverlayIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes cpModalIn {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes cpSuccessPop {
    0%   { opacity: 0; transform: scale(0.8); }
    60%  { transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes cpSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .cp2-overlay {
    position: fixed; inset: 0; z-index: 10000;
    background: rgba(0,0,0,0.62);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    animation: cpOverlayIn 0.22s ease both;
    backdrop-filter: blur(4px);
  }
  .cp2-modal {
    width: 100%; max-width: 440px;
    background: var(--sb-bg-elevated);
    border: 1px solid var(--sb-border);
    border-radius: 20px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.36);
    overflow: hidden;
    animation: cpModalIn 0.32s cubic-bezier(0.22,1,0.36,1) both;
  }

  .cp2-f1 { animation: cpSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.06s both; }
  .cp2-f2 { animation: cpSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.13s both; }
  .cp2-f3 { animation: cpSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.20s both; }
  .cp2-f4 { animation: cpSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.27s both; }

  /* Underline input */
  .cp2-input {
    width: 100%;
    padding: 9px 32px 9px 0;
    background: transparent;
    border: none;
    border-bottom: 1.5px solid var(--sb-border-strong);
    color: var(--sb-text);
    font-size: 14px;
    font-family: var(--font-body);
    outline: none;
    transition: border-color 0.22s ease;
    caret-color: var(--sb-accent);
  }
  .cp2-input:focus     { border-bottom-color: var(--sb-accent); }
  .cp2-input:disabled  { opacity: 0.45; cursor: not-allowed; }
  .cp2-input::placeholder { color: var(--sb-text-dim); font-size: 13px; }

  /* Submit btn shimmer */
  .cp2-submit-btn {
    position: relative; overflow: hidden;
    transition: opacity 0.2s ease, transform 0.15s ease;
  }
  .cp2-submit-btn::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s ease;
  }
  .cp2-submit-btn:hover:not(:disabled)::after { transform: translateX(100%); }
  .cp2-submit-btn:active:not(:disabled) { transform: scale(0.97); }
  .cp2-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

  .cp2-success-icon { animation: cpSuccessPop 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both; }

  /* Strength bar segments */
  .cp2-strength-seg { height: 3px; border-radius: 3px; transition: background 0.3s ease; }
`;

/* ─────────────────────────────────────────────────────────────
   Password strength util
───────────────────────────────────────────────────────────── */
function getStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6)  s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 3); // 0-3
}
const strengthLabel = ['', 'Weak', 'Fair', 'Strong'];
const strengthColor = ['', 'var(--sb-danger)', '#f59e0b', 'var(--sb-accent)'];

/* ─────────────────────────────────────────────────────────────
   ChangePasswordModal
───────────────────────────────────────────────────────────── */
const ChangePasswordModal = ({ onClose }) => {
  const [currentPassword, setCurrentPassword]   = useState('');
  const [newPassword, setNewPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [showCurrent, setShowCurrent]           = useState(false);
  const [showNew, setShowNew]                   = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState('');
  const [success, setSuccess]                   = useState(false);

  const clearError = () => { if (error) setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
    if (newPassword.length < 6)          { setError('New password must be at least 6 characters.'); return; }
    if (currentPassword === newPassword) { setError('New password must differ from current password.'); return; }

    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally { setLoading(false); }
  };

  const strength = getStrength(newPassword);

  return (
    <>
      <style>{MODAL_CSS}</style>
      <div className="cp2-overlay" role="dialog" aria-modal="true" aria-label="Change password"
        onClick={e => { if (e.target === e.currentTarget && !loading) onClose(); }}>
        <div className="cp2-modal">

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '22px 24px 18px',
            borderBottom: '1px solid var(--sb-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'var(--sb-accent-bg)', color: 'var(--sb-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <KeyRound size={16} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--sb-text)', lineHeight: 1 }}>
                  Change Password
                </h3>
                <p style={{ fontSize: 11.5, color: 'var(--sb-text-dim)', marginTop: 2 }}>
                  Keep your account secure
                </p>
              </div>
            </div>
            <button onClick={onClose} disabled={loading} aria-label="Close"
              style={{
                background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                color: 'var(--sb-text-dim)', display: 'flex', padding: 6,
                borderRadius: 8, transition: 'color 0.18s ease, background 0.18s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--sb-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <X size={17} />
            </button>
          </div>

          {/* Success state */}
          {success ? (
            <div style={{
              padding: '48px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center',
            }}>
              <div className="cp2-success-icon" style={{
                width: 60, height: 60, borderRadius: 16,
                background: 'var(--sb-accent-bg)', color: 'var(--sb-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={28} />
              </div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--sb-text)' }}>
                Password updated!
              </h4>
              <p style={{ fontSize: 13.5, color: 'var(--sb-text-dim)' }}>
                Your password has been changed successfully.
              </p>
              <button onClick={onClose}
                className="cp2-submit-btn"
                style={{
                  marginTop: 8, padding: '10px 28px', borderRadius: 10,
                  background: 'var(--sb-accent)', color: 'var(--app-bg)',
                  border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
                }}>
                Done
              </button>
            </div>
          ) : (

            /* Form */
            <form onSubmit={handleSubmit} noValidate style={{ padding: '22px 24px 24px' }}>

              {/* Error */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '11px 13px', borderRadius: 9, marginBottom: 20,
                  background: 'var(--sb-danger-bg)', border: '1px solid var(--sb-danger-border)',
                  color: 'var(--sb-danger)', fontSize: 13,
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
              )}

              {/* Current password */}
              <div className="cp2-f1" style={{ marginBottom: 24 }}>
                <label htmlFor="cp2-current" style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: 'var(--sb-text-dim)', marginBottom: 6,
                }}>
                  <Lock size={10} aria-hidden="true" /> Current Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="cp2-current"
                    type={showCurrent ? 'text' : 'password'}
                    className="cp2-input"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={e => { setCurrentPassword(e.target.value); clearError(); }}
                    required disabled={loading} autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)}
                    aria-label={showCurrent ? 'Hide' : 'Show'} disabled={loading}
                    style={{
                      position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--sb-text-dim)', display: 'flex', padding: 3,
                    }}>
                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div className="cp2-f2" style={{ marginBottom: 8 }}>
                <label htmlFor="cp2-new" style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: 'var(--sb-text-dim)', marginBottom: 6,
                }}>
                  <Lock size={10} aria-hidden="true" /> New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="cp2-new"
                    type={showNew ? 'text' : 'password'}
                    className="cp2-input"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); clearError(); }}
                    required disabled={loading} autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    aria-label={showNew ? 'Hide' : 'Show'} disabled={loading}
                    style={{
                      position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--sb-text-dim)', display: 'flex', padding: 3,
                    }}>
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Strength meter */}
              {newPassword && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="cp2-strength-seg" style={{
                        flex: 1,
                        background: strength >= i ? strengthColor[strength] : 'var(--sb-border-strong)',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: strengthColor[strength] || 'var(--sb-text-dim)' }}>
                    {strengthLabel[strength] || ''}
                  </span>
                </div>
              )}

              {/* Confirm password */}
              <div className="cp2-f3" style={{ marginBottom: 28 }}>
                <label htmlFor="cp2-confirm" style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: 'var(--sb-text-dim)', marginBottom: 6,
                }}>
                  <Lock size={10} aria-hidden="true" /> Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="cp2-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className="cp2-input"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); clearError(); }}
                    required disabled={loading} autoComplete="new-password"
                  />
                  {/* Match indicator */}
                  {confirmPassword && (
                    <span style={{
                      position: 'absolute', right: 26, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 11,
                      color: confirmPassword === newPassword ? 'var(--sb-accent)' : 'var(--sb-danger)',
                    }}>
                      {confirmPassword === newPassword ? '✓' : '✗'}
                    </span>
                  )}
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    aria-label={showConfirm ? 'Hide' : 'Show'} disabled={loading}
                    style={{
                      position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--sb-text-dim)', display: 'flex', padding: 3,
                    }}>
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="cp2-f4" style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={loading}
                  className="cp2-submit-btn"
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '11px 0', borderRadius: 10,
                    background: 'var(--sb-accent)', color: 'var(--app-bg)',
                    border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
                  }}>
                  {loading
                    ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                    : <><KeyRound size={14} /> Change Password</>
                  }
                </button>
                <button type="button" onClick={onClose} disabled={loading}
                  style={{
                    padding: '11px 18px', borderRadius: 10,
                    background: 'var(--sb-hover)', color: 'var(--sb-text-secondary)',
                    border: '1px solid var(--sb-border-strong)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
                    opacity: loading ? 0.5 : 1,
                    transition: 'background 0.18s ease',
                  }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.background = 'var(--sb-border-strong)')}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--sb-hover)'}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default ChangePasswordModal;