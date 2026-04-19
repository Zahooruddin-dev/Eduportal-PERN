
 const StrengthBar = ({ password, minLength = 10 }) => {
	const calc = (p) => {
		let s = 0;
		if (p.length >= minLength) s++;
		if (/[A-Z]/.test(p)) s++;
		if (/[a-z]/.test(p)) s++;
		if (/[0-9]/.test(p)) s++;
		if (/[^A-Za-z0-9]/.test(p)) s++;
		return Math.min(s, 5);
	};
	const score = calc(password);
	const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
	const colors = [
		'',
		'bg-red-500',
		'bg-amber-400',
		'bg-yellow-400',
		'bg-emerald-500',
		'bg-emerald-600',
	];

	if (!password) return null;

	return (
		<div className='mt-2' aria-live='polite' aria-atomic='true'>
			<div
				className='flex gap-1 mb-1'
				role='img'
				aria-label={`Password strength: ${labels[score]}`}
			>
				{[1, 2, 3, 4, 5].map((i) => (
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
export {StrengthBar}