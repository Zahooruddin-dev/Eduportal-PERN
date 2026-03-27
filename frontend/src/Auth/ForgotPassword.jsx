import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SpinnerIcon, AlertBox, EyeIcon } from './Icon';
import { requestReset } from '../api/authApi';

function RequestStep({ onSuccess }) {
	const [email, setEmail] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!email.trim()) {
			setError('Email is required');
			return;
		}
		setError('');
		setLoading(true);
		try {
			await requestReset({ email });
			onSuccess(email);
		} catch (err) {
			const message =
				err.response?.data?.message || err.message || 'Something went wrong';
			setError(message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
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
						<rect width='20' height='16' x='2' y='4' rx='2' />
						<path d='m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' />
					</svg>
				</div>
				<h1 className='text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight'>
					Forgot your password?
				</h1>
				<p className='mt-1.5 text-sm text-[var(--color-text-muted)] max-w-xs mx-auto'>
					Enter your email and we&apos;ll send you a reset link
				</p>
			</div>

			<div className='bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8'>
				{error && <AlertBox message={error} />}

				<form onSubmit={handleSubmit} noValidate className='space-y-5'>
					<div>
						<label
							htmlFor='reset-email'
							className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'
						>
							Email address
						</label>
						<input
							id='reset-email'
							name='email'
							type='email'
							autoComplete='email'
							required
							value={email}
							onChange={(e) => {
								setEmail(e.target.value);
								if (error) setError('');
							}}
							placeholder='you@example.com'
							className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
							aria-required='true'
						/>
					</div>

					<button
						type='submit'
						disabled={loading || !email}
						className='w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
						aria-busy={loading}
					>
						{loading && <SpinnerIcon />}
						{loading ? 'Sending…' : 'Send reset link'}
					</button>
				</form>
			</div>
		</>
	);
}

function SentStep({ email, onReset }) {
	const [form, setForm] = useState({ code: '', password: '', confirm: '' });
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [done, setDone] = useState(false);

	const handleChange = (e) => {
		setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
		if (error) setError('');
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!form.code.trim()) {
			setError('Reset code is required');
			return;
		}
		if (form.password.length < 8) {
			setError('Password must be at least 8 characters');
			return;
		}
		if (form.password !== form.confirm) {
			setError('Passwords do not match');
			return;
		}
		setLoading(true);
		setError('');
		try {
			await requestReset({
				email,
				code: form.code,
				password: form.password,
			});
			setDone(true);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	if (done) {
		return (
			<>
				<div className='mb-8 text-center'>
					<div className='inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500 mb-5'>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							viewBox='0 0 24 24'
							fill='none'
							stroke='white'
							strokeWidth='2.5'
							strokeLinecap='round'
							strokeLinejoin='round'
							className='w-6 h-6'
							aria-hidden='true'
						>
							<polyline points='20 6 9 17 4 12' />
						</svg>
					</div>
					<h1 className='text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight'>
						Password reset!
					</h1>
					<p className='mt-1.5 text-sm text-[var(--color-text-muted)]'>
						Your password has been updated successfully
					</p>
				</div>
				<div className='bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8 text-center'>
					<Link
						to='/login'
						className='inline-flex items-center justify-center w-full rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2'
					>
						Back to sign in
					</Link>
				</div>
			</>
		);
	}

	return (
		<>
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
						<rect width='18' height='11' x='3' y='11' rx='2' ry='2' />
						<path d='M7 11V7a5 5 0 0 1 10 0v4' />
					</svg>
				</div>
				<h1 className='text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight'>
					Set new password
				</h1>
				<p className='mt-1.5 text-sm text-[var(--color-text-muted)]'>
					We sent a code to{' '}
					<span className='font-medium text-[var(--color-text-secondary)]'>
						{email}
					</span>
				</p>
			</div>

			<div className='bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-8'>
				{error && <AlertBox message={error} />}

				<form onSubmit={handleSubmit} noValidate className='space-y-5'>
					<div>
						<label
							htmlFor='reset-code'
							className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'
						>
							Reset code
						</label>
						<input
							id='reset-code'
							name='code'
							type='text'
							autoComplete='one-time-code'
							inputMode='numeric'
							required
							value={form.code}
							onChange={handleChange}
							placeholder='123456'
							className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 tracking-widest font-mono'
						/>
					</div>

					<div>
						<label
							htmlFor='new-password'
							className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'
						>
							New password
						</label>
						<div className='relative'>
							<input
								id='new-password'
								name='password'
								type={showPassword ? 'text' : 'password'}
								autoComplete='new-password'
								required
								value={form.password}
								onChange={handleChange}
								placeholder='••••••••'
								className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 pr-10 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
							/>
							<button
								type='button'
								onClick={() => setShowPassword((v) => !v)}
								className='absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-r-xl'
								aria-label={showPassword ? 'Hide password' : 'Show password'}
								aria-pressed={showPassword}
							>
								<EyeIcon open={showPassword} />
							</button>
						</div>
					</div>

					<div>
						<label
							htmlFor='confirm-password'
							className='block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5'
						>
							Confirm new password
						</label>
						<input
							id='confirm-password'
							name='confirm'
							type='password'
							autoComplete='new-password'
							required
							value={form.confirm}
							onChange={handleChange}
							placeholder='••••••••'
							className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20'
						/>
					</div>

					<button
						type='submit'
						disabled={loading}
						className='w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
						aria-busy={loading}
					>
						{loading && <SpinnerIcon />}
						{loading ? 'Resetting…' : 'Reset password'}
					</button>

					<button
						type='button'
						onClick={onReset}
						className='w-full text-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded'
					>
						Use a different email
					</button>
				</form>
			</div>
		</>
	);
}

export default function ForgotPassword() {
	const [sentTo, setSentTo] = useState(null);

	return (
		<main className='min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4 py-12'>
			<div className='w-full max-w-md'>
				{sentTo ? (
					<SentStep email={sentTo} onReset={() => setSentTo(null)} />
				) : (
					<RequestStep onSuccess={setSentTo} />
				)}

				<p className='mt-5 text-center text-sm text-[var(--color-text-muted)]'>
					Remember it?{' '}
					<Link
						to='/login'
						className='font-medium text-[var(--color-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded'
					>
						Back to sign in
					</Link>
				</p>
			</div>
		</main>
	);
}
