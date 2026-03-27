import { useState, useEffect } from 'react';
import {
  User, Mail, Shield, Calendar, Edit, Camera,
  Key, Activity, IdCard, Trash2, CheckCircle, X,
} from 'lucide-react';
import { updateUsername } from '../../../api/authApi';
import DeleteAccountModal from './DeleteAccountModal';
import ChangePasswordModal from './Changepasswordmodal';

/* ─────────────────────────────────────────────────────────────
   Injected CSS — same animation tokens as auth pages
───────────────────────────────────────────────────────────── */
const PROFILE_CSS = `
  @keyframes prSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes prFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes prAvatarPop {
    0%   { opacity: 0; transform: scale(0.88); }
    60%  { transform: scale(1.04); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes prDotPulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.35); }
  }

  .pr-1 { animation: prSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.04s both; }
  .pr-2 { animation: prSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.12s both; }
  .pr-3 { animation: prSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.20s both; }
  .pr-4 { animation: prSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.28s both; }
  .pr-5 { animation: prSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.36s both; }
  .pr-6 { animation: prSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.44s both; }

  .pr-avatar-pop { animation: prAvatarPop 0.55s cubic-bezier(0.22,1,0.36,1) 0.06s both; }

  /* Underline input — profile edit */
  .pr-ul-input {
    width: 100%;
    padding: 8px 0;
    background: transparent;
    border: none;
    border-bottom: 1.5px solid var(--sb-accent);
    color: var(--sb-text);
    font-size: 15px;
    font-family: var(--font-body);
    outline: none;
    caret-color: var(--sb-accent);
    transition: border-color 0.2s ease;
  }
  .pr-ul-input:focus { border-bottom-color: var(--sb-accent-light); }
  .pr-ul-input::placeholder { color: var(--sb-text-dim); }

  /* Action button hover */
  .pr-action-btn {
    position: relative;
    overflow: hidden;
    transition: opacity 0.2s ease, transform 0.15s ease, background 0.2s ease;
  }
  .pr-action-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s ease;
  }
  .pr-action-btn:hover:not(:disabled)::after { transform: translateX(100%); }
  .pr-action-btn:active:not(:disabled) { transform: scale(0.97); }
  .pr-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Dot grid */
  .pr-dot-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, var(--sb-border-strong) 1.1px, transparent 1.1px);
    background-size: 20px 20px;
    pointer-events: none;
  }

  /* Activity dot pulse */
  .pr-dot-live { animation: prDotPulse 2.2s ease-in-out infinite; }

  /* Avatar hover reveal */
  .pr-avatar-wrap:hover .pr-avatar-overlay { opacity: 1; }
  .pr-avatar-overlay {
    opacity: 0;
    transition: opacity 0.22s ease;
  }

  /* Detail item hover */
  .pr-detail-item {
    transition: background 0.18s ease;
    border-radius: 10px;
  }
  .pr-detail-item:hover { background: var(--sb-hover); }

  /* Danger zone button */
  .pr-delete-btn {
    transition: background 0.2s ease, transform 0.15s ease;
  }
  .pr-delete-btn:hover { background: rgba(239,68,68,0.14) !important; }
  .pr-delete-btn:active { transform: scale(0.97); }

  @media (max-width: 900px) {
    .pr-main-grid { flex-direction: column !important; }
    .pr-hero-panel { min-height: 0 !important; }
  }
  @media (max-width: 600px) {
    .pr-hero-inner { flex-direction: column !important; align-items: flex-start !important; }
    .pr-avatar-wrap { margin-bottom: 16px; }
  }
`;

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

const roleConfig = {
  admin:   { color: 'var(--sb-badge-admin-color)',   bg: 'var(--sb-badge-admin-bg)',   border: 'var(--sb-badge-admin-border)' },
  teacher: { color: 'var(--sb-badge-teacher-color)', bg: 'var(--sb-badge-teacher-bg)', border: 'var(--sb-badge-teacher-border)' },
  student: { color: 'var(--sb-badge-student-color)', bg: 'var(--sb-badge-student-bg)', border: 'var(--sb-badge-student-border)' },
};
const getRoleStyle = (role) => roleConfig[role?.toLowerCase()] || roleConfig.student;

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */
function FieldLabel({ icon: Icon, children }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
      textTransform: 'uppercase', color: 'var(--sb-text-dim)',
    }}>
      {Icon && <Icon size={10} aria-hidden="true" />}
      {children}
    </span>
  );
}

function ActionBtn({ onClick, disabled, variant = 'primary', icon: Icon, children, style = {} }) {
  const isPrimary = variant === 'primary';
  const isDanger  = variant === 'danger';
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="pr-action-btn"
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '10px 18px', borderRadius: 10, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
        background: isDanger
          ? 'rgba(239,68,68,0.09)'
          : isPrimary
          ? 'var(--sb-accent)'
          : 'var(--sb-hover)',
        color: isDanger
          ? 'var(--sb-danger)'
          : isPrimary
          ? 'var(--app-bg)'
          : 'var(--sb-text-secondary)',
        border: isDanger ? '1px solid var(--sb-danger-border)' : '1px solid transparent',
        ...style,
      }}
    >
      {Icon && <Icon size={14} aria-hidden="true" />}
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Profile
───────────────────────────────────────────────────────────── */
const Profile = ({ user, profileImageUrl, onProfileUpdate }) => {
  const [isEditing, setIsEditing]           = useState(false);
  const [newName, setNewName]               = useState(user?.username || '');
  const [selectedFile, setSelectedFile]     = useState(null);
  const [previewUrl, setPreviewUrl]         = useState(null);
  const [currentUser, setCurrentUser]       = useState(user);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [showDeleteModal, setShowDeleteModal]   = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    setCurrentUser(user);
    setNewName(user?.username || '');
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('id', currentUser.id);
      formData.append('newUsername', newName);
      if (selectedFile) formData.append('image', selectedFile);

      const response = await updateUsername(formData);
      if (response.data.token) localStorage.setItem('token', response.data.token);
      if (response.data.user) setCurrentUser(response.data.user);

      setIsEditing(false);
      setSelectedFile(null);
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
      if (onProfileUpdate) onProfileUpdate();
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally { setLoading(false); }
  };

  const handleCancel = () => {
    setNewName(currentUser?.username || '');
    setSelectedFile(null);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    setIsEditing(false);
    setError('');
  };

  const displayImage = previewUrl || profileImageUrl;
  const roleStyle    = getRoleStyle(currentUser?.role);
  const initials     = currentUser?.username?.charAt(0).toUpperCase() || '?';

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1100, margin: '0 auto' }}>
      <style>{PROFILE_CSS}</style>

      {/* ── Page header ── */}
      <div className="pr-1" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--sb-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <polygon points="10,2 18,7 18,13 10,18 2,13 2,7" fill="var(--app-bg)" fillOpacity="0.9" />
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--sb-text)', lineHeight: 1 }}>
            Profile
          </h1>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--sb-text-dim)', marginLeft: 48 }}>
          Account overview and personal information
        </p>
      </div>

      {/* ── Main grid ── */}
      <div className="pr-main-grid" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* ── Left: hero panel ── */}
        <div
          className="pr-2"
          style={{
            width: 300, flexShrink: 0,
            borderRadius: 18, overflow: 'hidden',
            border: '1px solid var(--sb-border)',
            background: 'var(--sb-bg)',
            position: 'relative',
          }}
        >
          <div className="pr-dot-grid" />

          {/* Glow */}
          <div style={{
            position: 'absolute', width: 260, height: 260, borderRadius: '50%',
            background: 'radial-gradient(circle, var(--sb-accent-bg) 0%, transparent 70%)',
            top: -100, right: -100, pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1, padding: '36px 28px' }}>

            {/* Avatar */}
            <div className="pr-avatar-pop" style={{ position: 'relative', width: 80, height: 80, marginBottom: 20 }}>
              <div className="pr-avatar-wrap" style={{
                width: 80, height: 80, borderRadius: 22,
                background: 'var(--sb-avatar-bg)',
                border: '2px solid var(--sb-accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', position: 'relative',
              }}>
                {displayImage ? (
                  <img
                    src={displayImage} alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 30, color: 'var(--sb-avatar-text)', lineHeight: 1,
                  }}>{initials}</span>
                )}

                {/* Edit overlay */}
                {isEditing && (
                  <label htmlFor="profile-file-upload"
                    className="pr-avatar-overlay"
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.55)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: 4, cursor: 'pointer',
                    }}>
                    <Camera size={18} color="white" />
                    <span style={{ fontSize: 9, color: 'white', fontWeight: 600, letterSpacing: '0.06em' }}>CHANGE</span>
                  </label>
                )}
              </div>

              {isEditing && (
                <input id="profile-file-upload" type="file" accept="image/*"
                  style={{ display: 'none' }} onChange={handleFileChange} />
              )}

              {/* Online dot */}
              <div className="pr-dot-live" style={{
                position: 'absolute', bottom: 4, right: 4,
                width: 12, height: 12, borderRadius: '50%',
                background: 'var(--sb-accent)',
                border: '2px solid var(--sb-bg)',
              }} />
            </div>

            {/* Name */}
            {isEditing ? (
              <input
                className="pr-ul-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{ fontSize: 20, fontFamily: 'var(--font-display)', marginBottom: 10 }}
                placeholder="Username"
              />
            ) : (
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 22,
                color: 'var(--sb-text)', marginBottom: 10, lineHeight: 1.2,
              }}>
                {currentUser?.username || 'User'}
              </h2>
            )}

            {/* Role badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase',
              padding: '4px 10px', borderRadius: 6,
              background: roleStyle.bg,
              color: roleStyle.color,
              border: `1px solid ${roleStyle.border}`,
              marginBottom: 20,
            }}>
              <Shield size={11} aria-hidden="true" />
              {currentUser?.role || 'User'}
            </span>

            {/* Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: IdCard, label: `ID: ${currentUser?.id}` },
                { icon: Calendar, label: `Joined ${formatDate(currentUser?.createdAt)}` },
                { icon: Mail, label: currentUser?.email },
              ].map(({ icon: Icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={12} color="var(--sb-text-dim)" aria-hidden="true" />
                  <span style={{ fontSize: 12, color: 'var(--sb-text-secondary)', lineHeight: 1.4 }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Decorative rule */}
            <div style={{ display: 'flex', gap: 5, marginTop: 28 }}>
              {[28, 7, 7].map((w, i) => (
                <div key={i} style={{
                  height: 2, width: w, borderRadius: 2,
                  background: i === 0 ? 'var(--sb-accent)' : 'var(--sb-border-strong)',
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: details + actions ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Error banner */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 16px', borderRadius: 10,
              background: 'var(--sb-danger-bg)', border: '1px solid var(--sb-danger-border)',
              color: 'var(--sb-danger)', fontSize: 13,
            }}>
              <X size={14} /> {error}
            </div>
          )}

          {/* Personal info card */}
          <div className="pr-3" style={{
            borderRadius: 18, border: '1px solid var(--sb-border)',
            background: 'var(--sb-bg-elevated)', overflow: 'hidden',
          }}>
            {/* Card header */}
            <div style={{
              padding: '18px 24px 16px',
              borderBottom: '1px solid var(--sb-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontSize: 17,
                  color: 'var(--sb-text)', marginBottom: 2,
                }}>Personal Information</h3>
                <p style={{ fontSize: 12, color: 'var(--sb-text-dim)' }}>
                  {isEditing ? 'Make your changes and save' : 'Your account details'}
                </p>
              </div>
              {!isEditing && (
                <ActionBtn icon={Edit} onClick={() => setIsEditing(true)}>
                  Edit
                </ActionBtn>
              )}
            </div>

            {/* Detail grid */}
            <div style={{ padding: '8px 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {[
                { icon: User,     label: 'Username', value: currentUser?.username, editable: true },
                { icon: Mail,     label: 'Email',    value: currentUser?.email },
                { icon: Shield,   label: 'Role',     value: currentUser?.role },
                { icon: Activity, label: 'Account ID', value: currentUser?.id },
              ].map(({ icon: Icon, label, value, editable }) => (
                <div key={label} className="pr-detail-item" style={{ padding: '12px 10px' }}>
                  <FieldLabel icon={Icon}>{label}</FieldLabel>
                  {isEditing && editable ? (
                    <input
                      className="pr-ul-input"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      style={{ marginTop: 6, fontSize: 14 }}
                      placeholder={label}
                    />
                  ) : (
                    <p style={{ fontSize: 14, color: 'var(--sb-text)', marginTop: 5, fontWeight: 500 }}>
                      {value || '—'}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Edit actions */}
            {isEditing && (
              <div style={{
                padding: '14px 24px',
                borderTop: '1px solid var(--sb-border)',
                display: 'flex', gap: 10,
              }}>
                <ActionBtn icon={CheckCircle} onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving…' : 'Save Changes'}
                </ActionBtn>
                <ActionBtn variant="secondary" onClick={handleCancel} disabled={loading}>
                  Cancel
                </ActionBtn>
              </div>
            )}
          </div>

          {/* Quick actions card */}
          <div className="pr-4" style={{
            borderRadius: 18, border: '1px solid var(--sb-border)',
            background: 'var(--sb-bg-elevated)', padding: '18px 24px',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 17,
              color: 'var(--sb-text)', marginBottom: 14,
            }}>
              Account Actions
            </h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <ActionBtn icon={Key} onClick={() => setShowPasswordModal(true)}>
                Change Password
              </ActionBtn>
            </div>
          </div>

          {/* Activity card */}
          <div className="pr-5" style={{
            borderRadius: 18, border: '1px solid var(--sb-border)',
            background: 'var(--sb-bg-elevated)', padding: '18px 24px',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 17,
              color: 'var(--sb-text)', marginBottom: 18,
            }}>
              Account Activity
            </h3>

            <div style={{ position: 'relative', paddingLeft: 20 }}>
              {/* Vertical line */}
              <div style={{
                position: 'absolute', left: 5, top: 6, bottom: 6, width: 1.5,
                background: 'var(--sb-border-strong)', borderRadius: 2,
              }} />

              {[
                { text: 'Account created', time: formatDate(currentUser?.createdAt), live: false },
                { text: 'Profile last updated', time: 'Recently', live: true },
                { text: `Role assigned: ${currentUser?.role}`, time: formatDate(currentUser?.createdAt), live: false },
              ].map(({ text, time, live }, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < 2 ? 20 : 0, position: 'relative' }}>
                  {/* Dot */}
                  <div style={{
                    position: 'absolute', left: -15, top: 5,
                    width: 8, height: 8, borderRadius: '50%',
                    background: live ? 'var(--sb-accent)' : 'var(--sb-border-strong)',
                    border: '1.5px solid var(--sb-bg-elevated)',
                    zIndex: 1,
                  }} className={live ? 'pr-dot-live' : ''} />
                  <div>
                    <p style={{ fontSize: 13.5, color: 'var(--sb-text)', fontWeight: 500, marginBottom: 2 }}>{text}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--sb-text-dim)' }}>{time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div className="pr-6" style={{
            borderRadius: 18,
            border: '1px solid var(--sb-danger-border)',
            background: 'var(--sb-danger-bg)',
            padding: '18px 24px',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 17,
              color: 'var(--sb-danger)', marginBottom: 4,
            }}>
              Danger Zone
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 13, color: 'var(--sb-text-secondary)', fontWeight: 500, marginBottom: 3 }}>Delete Account</p>
                <p style={{ fontSize: 12, color: 'var(--sb-text-dim)', maxWidth: 400 }}>
                  Permanently delete your account and all associated data. This cannot be undone.
                </p>
              </div>
              <button
                className="pr-delete-btn"
                onClick={() => setShowDeleteModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '10px 16px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.07)',
                  border: '1px solid var(--sb-danger-border)',
                  color: 'var(--sb-danger)',
                  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                <Trash2 size={14} aria-hidden="true" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal username={currentUser?.username} onClose={() => setShowDeleteModal(false)} />
      )}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
};

export default Profile;