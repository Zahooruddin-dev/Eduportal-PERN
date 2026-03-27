const SpinnerIcon = () => (
	<svg
		className='w-4 h-4 animate-spin'
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		aria-hidden='true'
	>
		<circle
			className='opacity-25'
			cx='12'
			cy='12'
			r='10'
			stroke='currentColor'
			strokeWidth='4'
		/>
		<path
			className='opacity-75'
			fill='currentColor'
			d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
		/>
	</svg>
);

const EyeIcon = ({ open }) =>
	open ? (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
			aria-hidden='true'
			className='w-4 h-4'
		>
			<path d='M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' />
			<circle cx='12' cy='12' r='3' />
		</svg>
	) : (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
			strokeLinejoin='round'
			aria-hidden='true'
			className='w-4 h-4'
		>
			<path d='M9.88 9.88a3 3 0 1 0 4.24 4.24' />
			<path d='M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68' />
			<path d='M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61' />
			<line x1='2' x2='22' y1='2' y2='22' />
		</svg>
	);
const AlertBox = ({ message }) => (
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
    <span>{message}</span>
  </div>
);

export { EyeIcon, SpinnerIcon,AlertBox };
