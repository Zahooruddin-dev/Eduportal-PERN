import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, X, Mail, Lock } from 'lucide-react';
import { deleteUser } from '../../../api/authApi';
import { logout } from '../../../utils/auth';

/* ─────────────────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────────────────── */
const MODAL_CSS = `
  @keyframes damOverlayIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes damModalIn {
    from { opacity: 0; transform: translateY(24px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes damShake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-5px); }
    40%       { transform: translateX(5px); }
    60%       { transform: translateX(-3px); }
    80%       { transform: translateX(3px); }
  }
  @keyframes damSlideUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes damWarnPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
    50%       { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .dam2-overlay {
    position: fixed; inset: 0; z-index: 10000;
    background: rgba(0,0,0,0.68);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    animation: damOverlayIn 0.22s ease both;
    backdrop-filter: blur(5px);
  }
  .dam2-modal {
    width: 100%; max-width: 460px;
    background: var(--sb-bg-elevated);
    border: 1px solid var(--sb-danger-border);
    border-radius: 20px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(239,68,68,0.08);
    overflow: hidden;
    animation: damModalIn 0.34s cubic-bezier(0.22,1,0.36,1) both;
  }
  .dam2-modal.dam2-shake { animation: damShake 0.42s ease both; }

  .dam-f1 { animation: damSlideUp 0.38s cubic-bezier(0.22,1,0.36,1) 0.05s both; }
  .dam-f2 { animation: damSlideUp 0.38s cubic-bezier(0.22,1,0.36,1) 0.12s both; }
  .dam-f3 { animation: damSlideUp 0.38s cubic-bezier(0.22,1,0.36,1) 0.19s both; }
  .dam-f4 { animation: damSlideUp 0.38s cubic-bezier(0.22,1,0.36,1) 0.26s both; }

  /* Danger icon pulse */
  .dam2-icon-wrap { animation: damWarnPulse 2.4s ease-in-out 0.5s infinite; }

  /* Underline inputs */
  .dam2-input {
    width: 100%;
    padding: 9px 0;
    background: transparent;
    border: none;
    border-bottom: 1.5px solid var(--sb-border-strong);
    color: var(--sb-text);
    font-size: 14px;
    font-family: var(--font-body);
    outline: none;
    transition: border-color 0.22s ease;
    caret-color: var(--sb-danger);
  }
  .dam2-input:focus    { border-bottom-color: var(--sb-danger); }
  .dam2-input:disabled { opacity: 0.45; cursor: not-allowed; }
  .dam2-input::placeholder { color: var(--sb-text-dim); font-size: 13px; }

  /* Warning list */
  .dam2-warn-list { list-style: none; display: flex; flex-direction: column; gap: 7px; }
  .dam2-warn-list li {
    display: flex; align-items: flex-start; gap: 8px;
    font-size: 12.5px; color: var(--sb-text-secondary); line-height: 1.5;
  }
  .dam2-warn-list li::before {
    content: '';
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--sb-danger); flex-shrink: 0; margin-top: 6px;
    opacity: 0.7;
  }

  /* Delete confirm button */
  .dam2-confirm-btn {
    position: relative; overflow: hidden;
    transition: opacity 0.2s ease, transform 0.15s ease, background 0.2s ease;
  }
  .dam2-confirm-btn:hover:not(:disabled) { background: rgba(220,38,38,0.88) !important; }
  .dam2-confirm-btn:active:not(:disabled) { transform: scale(0.97); }
  .dam2-confirm-btn:disabled { opacity: 0.55; cursor: not-allowed; }

  .dam2-cancel-btn {
    transition: background 0.18s ease;
  }
  .dam2-cancel-btn:hover:not(:disabled) { background: var(--sb-border-strong) !important; }
`;

/* ─────────────────────────────────────────────────────────────
   DeleteAccountModal
───────────────────────────────────────────────────────────── */
const DeleteAccountModal = ({ username, onClose }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [deleting, setDeleting] = useState(false);
  const [shaking, setShaking]   = useState(false);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const handleDelete = async () => {
    if (!email || !password) {
      setError('Please enter your email and password to confirm.');
      triggerShake();
      return;
    }
    setDeleting(true);
    setError('');
    try {
      await deleteUser({ email, password });
      logout();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete account. Check your credentials.');
      setDeleting(false);
      triggerShake();
    }
  };

  return (
    <>
      <style>{MODAL_CSS}</style>
      <div className="dam2-overlay" role="dialog" aria-modal="true" aria-labelledby="dam2-title">
        <div className={`dam2-modal${shaking ? ' dam2-shake' : ''}`}>

          {/* ── Red header band ── */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.05) 100%)',
            borderBottom: '1px solid var(--sb-danger-border)',
            padding: '24px 24px 20px',
            position: 'relative',
          }}>
            {/* Dot grid */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(circle, rgba(239,68,68,0.18) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
              pointerEvents: 'none', opacity: 0.6,
            }} />

            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="dam2-icon-wrap" style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: 'rgba(239,68,68,0.14)',
                  border: '1px solid var(--sb-danger-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--sb-danger)',
                }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 id="dam2-title" style={{
                    fontFamily: 'var(--font-display)', fontSize: 20,
                    color: 'var(--sb-danger)', lineHeight: 1, marginBottom: 3,
                  }}>
                    Delete Account
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--sb-text-dim)' }}>
                    This action is permanent and irreversible
                  </p>
                </div>
              </div>
              <button onClick={onClose} disabled={deleting} aria-label="Close"
                style={{
                  background: 'none', border: 'none',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  color: 'var(--sb-text-dim)', display: 'flex', padding: 4,
                  borderRadius: 7, opacity: deleting ? 0.4 : 1,
                  transition: 'color 0.18s ease',
                }}
                onMouseEnter={e => !deleting && (e.currentTarget.style.color = 'var(--sb-text)')}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--sb-text-dim)'}>
                <X size={17} />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: '22px 24px 24px' }}>

            {/* Lead text */}
            <div className="dam-f1" style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 14, color: 'var(--sb-text)', lineHeight: 1.6 }}>
                You're about to permanently delete{' '}
                <strong style={{ color: 'var(--sb-text)', fontWeight: 700 }}>{username}</strong>'s account.
              </p>
            </div>

            {/* Warning list */}
            <div className="dam-f2" style={{
              background: 'rgba(239,68,68,0.05)',
              border: '1px solid var(--sb-danger-border)',
              borderRadius: 10, padding: '14px 16px',
              marginBottom: 22,
            }}>
              <ul className="dam2-warn-list">
                <li>All enrolled classes will be removed</li>
                <li>Your profile and personal data will be erased</li>
                <li>Any classes you teach will be deleted</li>
                <li>This action <strong style={{ color: 'var(--sb-danger)' }}>cannot be undone</strong></li>
              </ul>
            </div>

            {/* Credential fields */}
            <p className="dam-f3" style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--sb-text-dim)',
              marginBottom: 14,
            }}>
              Enter credentials to confirm
            </p>

            <div className="dam-f3" style={{ marginBottom: 18 }}>
              <label htmlFor="dam2-email" style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
                textTransform: 'uppercase', color: 'var(--sb-text-dim)', marginBottom: 6,
              }}>
                <Mail size={10} aria-hidden="true" /> Email
              </label>
              <input
                id="dam2-email" type="email"
                className="dam2-input"
                placeholder="your@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
                disabled={deleting} autoComplete="email"
              />
            </div>

            <div className="dam-f3" style={{ marginBottom: 20 }}>
              <label htmlFor="dam2-password" style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
                textTransform: 'uppercase', color: 'var(--sb-text-dim)', marginBottom: 6,
              }}>
                <Lock size={10} aria-hidden="true" /> Password
              </label>
              <input
                id="dam2-password" type="password"
                className="dam2-input"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); if (error) setError(''); }}
                disabled={deleting} autoComplete="current-password"
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 13px', borderRadius: 8, marginBottom: 18,
                background: 'var(--sb-danger-bg)', border: '1px solid var(--sb-danger-border)',
                color: 'var(--sb-danger)', fontSize: 12.5,
              }}>
                <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="dam-f4" style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} disabled={deleting}
                className="dam2-cancel-btn"
                style={{
                  flex: 1, padding: '11px 0',
                  borderRadius: 10, border: '1px solid var(--sb-border-strong)',
                  background: 'var(--sb-hover)', color: 'var(--sb-text-secondary)',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                  opacity: deleting ? 0.5 : 1,
                }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="dam2-confirm-btn"
                style={{
                  flex: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '11px 0', borderRadius: 10,
                  background: 'rgba(220,38,38,0.82)',
                  border: '1px solid var(--sb-danger-border)',
                  color: 'white',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                }}>
                {deleting ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Delete My Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteAccountModal;