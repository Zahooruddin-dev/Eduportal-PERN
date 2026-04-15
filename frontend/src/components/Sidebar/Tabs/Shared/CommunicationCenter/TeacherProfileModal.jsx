import { Loader2, User, X } from 'lucide-react';

export function TeacherProfileModal({ isOpen, onClose, profile, loading }) {
	if (!isOpen) return null;

	return (
		<div className='fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 bg-black/50'>
			<div className='w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl'>
				<div className='flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4'>
					<div>
						<p className='text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]'>
							Profile
						</p>
						<h3 className='mt-0.5 text-base font-bold text-[var(--color-text-primary)]'>
							Teacher Details
						</h3>
					</div>
					<button
						onClick={onClose}
						className='flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-border)]/50'
					>
						<X size={16} />
					</button>
				</div>

				<div className='p-5'>
					{loading ? (
						<div className='flex items-center justify-center gap-2 py-10 text-sm text-[var(--color-text-muted)]'>
							<Loader2 size={16} className='animate-spin' />
							Loading profile…
						</div>
					) : !profile?.teacher ? (
						<div className='py-10 text-center text-sm text-[var(--color-text-muted)]'>
							Profile not available.
						</div>
					) : (
						<div className='space-y-5'>
							<div className='flex items-center gap-4'>
								{profile.teacher.profile_pic ? (
									<img
										src={profile.teacher.profile_pic}
										alt={profile.teacher.username}
										className='h-14 w-14 rounded-full object-cover'
									/>
								) : (
									<div className='flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]'>
										<User size={22} />
									</div>
								)}
								<div>
									<p className='text-base font-bold text-[var(--color-text-primary)]'>
										{profile.teacher.username}
									</p>
									<p className='text-sm text-[var(--color-text-muted)]'>
										{profile.teacher.email}
									</p>
								</div>
							</div>

							<div>
								<p className='mb-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]'>
									Classes
								</p>
								{profile.classes?.length ? (
									<div className='max-h-60 space-y-2 overflow-y-auto'>
										{profile.classes.map((cls) => (
											<div
												key={cls.id}
												className='flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5'
											>
												<p className='text-sm font-semibold text-[var(--color-text-primary)]'>
													{cls.class_name}
												</p>
												<div className='text-right'>
													{cls.subject && (
														<span className='inline-block rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-primary)]'>
															{cls.subject}
														</span>
													)}
													{cls.grade_level && (
														<p className='mt-0.5 text-xs text-[var(--color-text-muted)]'>
															{cls.grade_level}
														</p>
													)}
												</div>
											</div>
										))}
									</div>
								) : (
									<p className='text-sm text-[var(--color-text-muted)]'>No classes found.</p>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}