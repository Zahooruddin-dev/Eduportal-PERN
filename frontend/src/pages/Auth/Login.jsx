import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { loginUser } from '../../api/authApi';
import { useAuth } from '../../utils/AuthContext';
import { Link, useNavigate } from 'react-router';

/* ─────────────────────────────────────────────────────────────
   Shared styles injected once per mount
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
  @keyframes authShimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes authPulse {
    0%, 100% { opacity: 0.35; }
    50%       { opacity: 0.7;  }
  }

  /* Staggered field entrance */
  .af-1 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.08s both; }
  .af-2 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.18s both; }
  .af-3 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.28s both; }
  .af-4 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.36s both; }
  .af-5 { animation: authSlideUp 0.48s cubic-bezier(0.22,1,0.36,1) 0.44s both; }

  /* Underline input */
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

  /* Select (underline) */
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
  }
  .ul-select:focus { border-bottom-color: var(--sb-accent); }
  .ul-select option { background: var(--sb-bg-elevated); }

  /* Auth button shimmer */
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

  /* Left panel dot grid */
  .auth-dot-grid {
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(circle, var(--sb-border-strong) 1.2px, transparent 1.2px);
    background-size: 22px 22px;
    pointer-events: none;
  }

  /* Responsive: hide left panel on small screens */
  @media (max-width: 660px) {
    .auth-left  { display: none !important; }
    .auth-right { border-radius: 20px !important; }
  }

  /* Skeleton pulse */
  .sk-pulse { animation: authPulse 1.6s ease-in-out infinite; }
`;

/* ─────────────────────────────────────────────────────────────
   SkeletonLoader — mirrors split layout
───────────────────────────────────────────────────────────── */
function SkeletonLoader() {
	return (
		<div
			className='auth-page'
			role='status'
			aria-label='Signing you in, please wait'
			aria-live='polite'
		>
			<style>{SHARED_CSS}</style>
			<div style={cardStyle}>
				{/* Left */}
				<div className='auth-left' style={leftStyle}>
					<div className='auth-dot-grid' />
					<div style={glowStyle} />
					<div style={{ position: 'relative', zIndex: 1 }}>
						<div
							className='sk-pulse'
							style={{
								width: 36,
								height: 36,
								borderRadius: 9,
								background: 'var(--sb-accent-bg)',
								marginBottom: 40,
							}}
						/>
						<div
							className='sk-pulse'
							style={{
								width: 120,
								height: 34,
								borderRadius: 6,
								background: 'var(--sb-hover)',
								marginBottom: 14,
							}}
						/>
						<div
							className='sk-pulse'
							style={{
								width: 160,
								height: 14,
								borderRadius: 4,
								background: 'var(--sb-hover)',
							}}
						/>
					</div>
				</div>
				{/* Right */}
				<div className='auth-right' style={{ ...rightStyle, gap: 0 }}>
					<div
						className='sk-pulse'
						style={{
							width: 120,
							height: 22,
							borderRadius: 5,
							background: 'var(--sb-hover)',
							marginBottom: 6,
						}}
					/>
					<div
						className='sk-pulse'
						style={{
							width: 190,
							height: 13,
							borderRadius: 4,
							background: 'var(--sb-hover)',
							marginBottom: 44,
						}}
					/>
					{[1, 2].map((i) => (
						<div key={i} style={{ marginBottom: 32 }}>
							<div
								className='sk-pulse'
								style={{
									width: 80,
									height: 10,
									borderRadius: 3,
									background: 'var(--sb-hover)',
									marginBottom: 12,
								}}
							/>
							<div
								className='sk-pulse'
								style={{
									width: '100%',
									height: 1.5,
									borderRadius: 1,
									background: 'var(--sb-border-strong)',
								}}
							/>
						</div>
					))}
					<div
						className='sk-pulse'
						style={{
							width: '100%',
							height: 46,
							borderRadius: 12,
							background: 'var(--sb-accent-bg)',
							marginTop: 8,
						}}
					/>
				</div>
			</div>
		</div>
	);
}

/* ─────────────────────────────────────────────────────────────
   Shared layout constants
───────────────────────────────────────────────────────────── */
const cardStyle = {
	display: 'flex',
	width: '100%',
	maxWidth: 860,
	minHeight: 540,
	borderRadius: 22,
	overflow: 'hidden',
	border: '1px solid var(--sb-border)',
	boxShadow: '0 32px 90px rgba(0,0,0,0.28)',
};

const leftStyle = {
	width: '42%',
	minWidth: 220,
	background: 'var(--sb-bg)',
	position: 'relative',
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'space-between',
	padding: '40px 36px',
	overflow: 'hidden',
};

const glowStyle = {
	position: 'absolute',
	width: 340,
	height: 340,
	borderRadius: '50%',
	background:
		'radial-gradient(circle, var(--sb-accent-bg) 0%, transparent 68%)',
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
   Reusable field label
───────────────────────────────────────────────────────────── */
function FieldLabel({ htmlFor, icon: Icon, children }) {
	return (
		<label
			htmlFor={htmlFor}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 5,
				fontSize: 10.5,
				fontWeight: 600,
				letterSpacing: '0.08em',
				textTransform: 'uppercase',
				color: 'var(--sb-text-dim)',
				marginBottom: 6,
				userSelect: 'none',
			}}
		>
			{Icon && <Icon size={11} aria-hidden='true' />}
			{children}
		</label>
	);
}

/* ─────────────────────────────────────────────────────────────
   Reusable inline error
───────────────────────────────────────────────────────────── */
function FieldError({ id, msg }) {
	if (!msg) return null;
	return (
		<span
			id={id}
			role='alert'
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 4,
				fontSize: 11.5,
				color: 'var(--sb-danger)',
				marginTop: 5,
			}}
		>
			<AlertCircle size={11} aria-hidden='true' />
			{msg}
		</span>
	);
}

/* ─────────────────────────────────────────────────────────────
   Logo mark
───────────────────────────────────────────────────────────── */
function LogoMark() {
	return (
		<div
			style={{
				width: 38,
				height: 38,
				borderRadius: 10,
				background: 'var(--sb-accent)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				marginBottom: 36,
				flexShrink: 0,
			}}
		>
			<svg width='18' height='18' viewBox='0 0 20 20' fill='none'>
				<polygon
					points='10,2 18,7 18,13 10,18 2,13 2,7'
					fill='var(--app-bg)'
					fillOpacity='0.9'
				/>
			</svg>
		</div>
	);
}

/* ─────────────────────────────────────────────────────────────
   Left decorative panel
───────────────────────────────────────────────────────────── */
function LeftPanel({ title, titleItalic, subtitle, bullets }) {
	return (
		<div className='auth-left' style={leftStyle}>
			<div className='auth-dot-grid' />
			<div style={glowStyle} />

			<div style={{ position: 'relative', zIndex: 1 }}>
				<LogoMark />
				<h2
					style={{
						fontFamily: 'var(--font-display)',
						fontSize: 'clamp(28px, 3.5vw, 38px)',
						lineHeight: 1.15,
						color: 'var(--sb-text)',
						marginBottom: 14,
					}}
				>
					{title}
					{titleItalic && (
						<>
							<br />
							<em style={{ color: 'var(--sb-accent)', fontStyle: 'italic' }}>
								{titleItalic}
							</em>
						</>
					)}
				</h2>
				<p
					style={{
						fontSize: 13.5,
						color: 'var(--sb-text-dim)',
						lineHeight: 1.65,
						maxWidth: 200,
					}}
				>
					{subtitle}
				</p>
			</div>

			<div style={{ position: 'relative', zIndex: 1 }}>
				{bullets && (
					<ul
						style={{
							listStyle: 'none',
							marginBottom: 20,
							display: 'flex',
							flexDirection: 'column',
							gap: 8,
						}}
					>
						{bullets.map((b, i) => (
							<li
								key={i}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 8,
									fontSize: 12,
									color: 'var(--sb-text-secondary)',
								}}
							>
								<span
									style={{
										width: 5,
										height: 5,
										borderRadius: '50%',
										background: 'var(--sb-accent)',
										flexShrink: 0,
									}}
								/>
								{b}
							</li>
						))}
					</ul>
				)}
				{/* Decorative rule */}
				<div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
					{[32, 8, 8].map((w, i) => (
						<div
							key={i}
							style={{
								height: 2,
								width: w,
								borderRadius: 2,
								background:
									i === 0 ? 'var(--sb-accent)' : 'var(--sb-border-strong)',
							}}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

/* ─────────────────────────────────────────────────────────────
   EMAIL REGEX
───────────────────────────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ─────────────────────────────────────────────────────────────
   Login
───────────────────────────────────────────────────────────── */
export default function Login() {
	const navigate = useNavigate();
	const { refreshUser } = useAuth();

	const [formData, setFormData] = useState({ email: '', password: '' });
	const [fieldErrors, setFieldErrors] = useState({});
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const passwordRef = useRef(null);
	const errorRef = useRef(null);

	useEffect(() => {
		if (error && errorRef.current) errorRef.current.focus();
	}, [error]);

	const validateEmail = (val) => {
		if (!val) return 'Email is required.';
		if (!EMAIL_RE.test(val))
			return 'Enter a valid email address (e.g. name@example.com).';
		return '';
	};

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((p) => ({ ...p, [name]: value }));
		if (error) setError('');
		if (fieldErrors[name]) setFieldErrors((p) => ({ ...p, [name]: '' }));
	};

	const handleEmailBlur = () => {
		const m = validateEmail(formData.email);
		if (m) setFieldErrors((p) => ({ ...p, email: m }));
	};
	const handleEmailKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			const m = validateEmail(formData.email);
			if (m) {
				setFieldErrors((p) => ({ ...p, email: m }));
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

	if (loading) return <SkeletonLoader />;

	return (
		<div className='auth-page'>
			<style>{SHARED_CSS}</style>

			{/* Skip link */}
			<a
				href='#login-email'
				className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm'
				style={{
					background: 'var(--sb-accent)',
					color: 'var(--app-bg)',
					fontWeight: 600,
				}}
			>
				Skip to form
			</a>

			<div style={cardStyle} role='main'>
				<LeftPanel
					title='Welcome'
					titleItalic='back.'
					subtitle='Your learning journey continues where you left off.'
					bullets={[
						'Secure & encrypted',
						'Personalised experience',
						'Progress saved automatically',
					]}
				/>

				{/* ── Right: form ── */}
				<div className='auth-right' style={rightStyle}>
					{/* Heading */}
					<div className='af-1' style={{ marginBottom: 36 }}>
						<h1
							style={{
								fontFamily: 'var(--font-display)',
								fontSize: 26,
								color: 'var(--sb-text)',
								marginBottom: 4,
							}}
						>
							Sign in
						</h1>
						<p style={{ fontSize: 13.5, color: 'var(--sb-text-dim)' }}>
							Don&apos;t have an account?{' '}
							<Link
								to='/register'
								style={{
									color: 'var(--sb-accent)',
									fontWeight: 500,
									textDecoration: 'none',
								}}
								onMouseEnter={(e) =>
									(e.target.style.textDecoration = 'underline')
								}
								onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
							>
								Create one
							</Link>
						</p>
					</div>

					{/* Global error */}
					{error && (
						<div
							ref={errorRef}
							tabIndex={-1}
							role='alert'
							aria-live='assertive'
							className='af-1'
							style={{
								display: 'flex',
								alignItems: 'flex-start',
								gap: 9,
								padding: '12px 14px',
								borderRadius: 10,
								marginBottom: 24,
								background: 'var(--sb-danger-bg)',
								border: '1px solid var(--sb-danger-border)',
								color: 'var(--sb-danger)',
								fontSize: 13,
							}}
						>
							<AlertCircle
								size={15}
								style={{ flexShrink: 0, marginTop: 1 }}
								aria-hidden='true'
							/>
							{error}
						</div>
					)}

					<form
						onSubmit={handleSubmit}
						noValidate
						aria-label='Sign in to your account'
					>
						<div className='af-2' style={{ marginBottom: 28 }}>
							<FieldLabel htmlFor='login-email' icon={Mail}>
								Email address
							</FieldLabel>
							<input
								id='login-email'
								type='email'
								name='email'
								className={`ul-input${fieldErrors.email ? ' ul-err' : ''}`}
								placeholder='name@example.com'
								value={formData.email}
								onChange={handleChange}
								onBlur={handleEmailBlur}
								onKeyDown={handleEmailKeyDown}
								required
								autoComplete='email'
								autoFocus
								aria-required='true'
								aria-invalid={!!fieldErrors.email}
								aria-describedby={
									fieldErrors.email ? 'login-email-error' : 'login-email-hint'
								}
								style={{
									WebkitAutofillBoxShadow:
										'0 0 0 1000px var(--sb-bg-elevated) inset',
									WebkitAutofillTextFillColor: 'var(--sb-text)',
								}}
							/>
							{fieldErrors.email ? (
								<FieldError id='login-email-error' msg={fieldErrors.email} />
							) : (
								<span
									id='login-email-hint'
									style={{
										fontSize: 11,
										color: 'var(--sb-text-dim)',
										marginTop: 4,
										display: 'block',
									}}
								>
									Press Enter to move to password
								</span>
							)}
						</div>

						{/* Password */}
						<div className='af-3' style={{ marginBottom: 10 }}>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									marginBottom: 6,
								}}
							>
								<FieldLabel htmlFor='login-password' icon={Lock}>
									Password
								</FieldLabel>
								<Link
									to='/forgot-password'
									style={{
										fontSize: 11.5,
										color: 'var(--sb-accent)',
										textDecoration: 'none',
										fontWeight: 500,
									}}
									onMouseEnter={(e) =>
										(e.target.style.textDecoration = 'underline')
									}
									onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
								>
									Forgot password?
								</Link>
							</div>
							<div style={{ position: 'relative' }}>
								<input
									id='login-password'
									ref={passwordRef}
									type={showPassword ? 'text' : 'password'}
									name='password'
									className={`ul-input${fieldErrors.password ? ' ul-err' : ''}`}
									style={{ paddingRight: 32 }}
									placeholder='Enter your password'
									value={formData.password}
									onChange={handleChange}
									required
									autoComplete='current-password'
									aria-required='true'
									aria-invalid={!!fieldErrors.password}
									aria-describedby={
										fieldErrors.password ? 'login-password-error' : undefined
									}
								/>
								<button
									type='button'
									onClick={() => setShowPassword((v) => !v)}
									aria-label={showPassword ? 'Hide password' : 'Show password'}
									aria-pressed={showPassword}
									style={{
										position: 'absolute',
										right: 0,
										top: '50%',
										transform: 'translateY(-50%)',
										background: 'none',
										border: 'none',
										cursor: 'pointer',
										color: 'var(--sb-text-dim)',
										display: 'flex',
										padding: 4,
									}}
								>
									{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
								</button>
							</div>
							<FieldError
								id='login-password-error'
								msg={fieldErrors.password}
							/>
						</div>

						{/* Submit */}
						<div className='af-4' style={{ marginTop: 36 }}>
							<button
								type='submit'
								disabled={loading}
								aria-busy={loading}
								className='auth-btn'
								style={{
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: 8,
									width: '100%',
									padding: '13px 0',
									borderRadius: 12,
									background: 'var(--sb-accent)',
									color: 'var(--app-bg)',
									fontSize: 14,
									fontWeight: 600,
									fontFamily: 'var(--font-body)',
									border: 'none',
									cursor: loading ? 'not-allowed' : 'pointer',
									opacity: loading ? 0.6 : 1,
								}}
							>
								<LogIn size={15} aria-hidden='true' />
								Sign in
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
