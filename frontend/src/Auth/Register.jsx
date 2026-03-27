import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../api/authApi';
import { SpinnerIcon,EyeIcon } from './Icon';

const StrengthBar = ({ password }) => {
	const calc = (p) => {
		let s = 0;
		if (p.length >= 8) s++;
		if (/[A-Z]/.test(p)) s++;
		if (/[0-9]/.test(p)) s++;
		if (/[^A-Za-z0-9]/.test(p)) s++;
		return s;
	};
	const score = calc(password);
	const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
	const colors = [
		'',
		'bg-red-500',
		'bg-amber-400',
		'bg-yellow-400',
		'bg-emerald-500',
	];

	if (!password) return null;

	return (
		<div className='mt-2' aria-live='polite' aria-atomic='true'>
			<div
				className='flex gap-1 mb-1'
				role='img'
				aria-label={`Password strength: ${labels[score]}`}
			>
				{[1, 2, 3, 4].map((i) => (
					<div
						key={i}
						className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : 'bg-[var(--color-border)]'}`}
					/>
				))}
			</div>
			<p className='text-xs text-[var(--color-text-muted)]'>
				Strength:{' '}
				<span className='font-medium text-[var(--color-text-secondary)]'>
					{labels[score] || 'Too short'}
				</span>
			</p>
		</div>
	);
};

export default function Register() {
	const { login } = useAuth();
	const navigate = useNavigate();

	const [form, setForm] = useState({
		username: '',
		email: '',
		password: '',
		confirm: '',
	});
	const [show, setShow] = useState({ password: false, confirm: false });
	const [error, setError] = useState('');
	const [fieldErrors, setFieldErrors] = useState({});
	const [loading, setLoading] = useState(false);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setForm((prev) => ({ ...prev, [name]: value }));
		if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
		if (error) setError('');
	};

	const validate = () => {
		const errs = {};
		if (!form.username.trim()) errs.username = 'Username is required';
		else if (form.username.length < 3) errs.username = 'At least 3 characters';
		if (!form.email.trim()) errs.email = 'Email is required';
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
			errs.email = 'Enter a valid email';
		if (!form.password) errs.password = 'Password is required';
		else if (form.password.length < 8)
			errs.password = 'At least 8 characters required';
		if (!form.confirm) errs.confirm = 'Please confirm your password';
		else if (form.confirm !== form.password)
			errs.confirm = 'Passwords do not match';
		return errs;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		const errs = validate();
		if (Object.keys(errs).length) {
			setFieldErrors(errs);
			return;
		}
		setLoading(true);
		setError('');
		try {
			const res = await registerUser(form);
			login(res.data.token);
			navigate('/dashboard');
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const field = (name, label, type, placeholder, autoComplete, extra) => (
		<div>
			<label
				htmlFor={name}
				className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'
			>
				{label}
			</label>
			<div className='relative'>
				<input
					id={name}
					name={name}
					type={extra ? (show[name] ? 'text' : 'password') : type}
					autoComplete={autoComplete}
					required
					value={form[name]}
					onChange={handleChange}
					placeholder={placeholder}
					aria-invalid={!!fieldErrors[name]}
					aria-describedby={fieldErrors[name] ? `${name}-error` : undefined}
					className={`w-full rounded-xl border bg-[var(--color-input-bg)] px-3.5 py-2.5 ${extra ? 'pr-10' : ''} text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:ring-2 disabled:opacity-50 ${
						fieldErrors[name]
							? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
							: 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20'
					}`}
				/>
				{extra && (
					<button
						type='button'
						onClick={() => setShow((v) => ({ ...v, [name]: !v[name] }))}
						className='absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-r-xl'
						aria-label={
							show[name]
								? `Hide ${label.toLowerCase()}`
								: `Show ${label.toLowerCase()}`
						}
						aria-pressed={show[name]}
					>
						<EyeIcon open={show[name]} />
					</button>
				)}
			</div>
			{fieldErrors[name] && (
				<p
					id={`${name}-error`}
					role='alert'
					className='mt-1.5 text-xs text-red-500'
				>
					{fieldErrors[name]}
				</p>
			)}
			{name === 'password' && <StrengthBar password={form.password} />}
		</div>
	);

	return (
		<main className='min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4 py-12'>
			<div className='w-full max-w-md'>
				<div className='mb-8 text-center'>
					<div className='inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--color-primary)] mb-5'>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							viewBox='0 0 24 24'
							fill='none'
							stroke='white'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
							className='w-6 h-6'
							aria-hidden='true'
						>
							<path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
							<circle cx='9' cy='7' r='4' />
							<line x1='19' x2='19' y1='8' y2='14' />
							<line x1='22' x2='16' y1='11' y2='11' />
						</svg>
					</div>
					<h1 className='text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight'>
						Create an account
					</h1>
					<p className='mt-1.5 text-sm text-[var(--color-text-muted)]'>
						Get started — it only takes a moment
					</p>
				</div>

				<div className='bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8'>
					{error && (
						<div
							role='alert'
							className='mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400'
						>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								viewBox='0 0 24 24'
								fill='none'
								stroke='currentColor'
								strokeWidth='2'
								strokeLinecap='round'
								strokeLinejoin='round'
								className='mt-0.5 w-4 h-4 shrink-0'
								aria-hidden='true'
							>
								<circle cx='12' cy='12' r='10' />
								<line x1='12' x2='12' y1='8' y2='12' />
								<line x1='12' x2='12.01' y1='16' y2='16' />
							</svg>
							<span>{error}</span>
						</div>
					)}

					<form onSubmit={handleSubmit} noValidate className='space-y-5'>
						{field(
							'username',
							'Username',
							'text',
							'johndoe',
							'username',
							false,
						)}
						{field(
							'email',
							'Email address',
							'email',
							'you@example.com',
							'email',
							false,
						)}
						{field(
							'password',
							'Password',
							'password',
							'••••••••',
							'new-password',
							true,
						)}
						{field(
							'confirm',
							'Confirm password',
							'password',
							'••••••••',
							'new-password',
							true,
						)}

						<button
							type='submit'
							disabled={loading}
							className='w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed mt-1'
							aria-busy={loading}
						>
							{loading && <SpinnerIcon />}
							{loading ? 'Creating account…' : 'Create account'}
						</button>
					</form>
				</div>

				<p className='mt-5 text-center text-sm text-[var(--color-text-muted)]'>
					Already have an account?{' '}
					<Link
						to='/login'
						className='font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded'
					>
						Sign in
					</Link>
				</p>
			</div>
		</main>
	);
}
