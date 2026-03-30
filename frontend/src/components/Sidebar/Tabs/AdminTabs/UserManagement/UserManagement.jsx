import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	createAdminInvite,
	createBulkStudents,
	createTeacherAccount,
	listInstituteClasses,
	listInstituteUsers,
	resetUserPasswordAsAdmin,
} from '../../../../../api/adminApi';
import ConfirmModal from '../../../../ConfirmModal';
import Toast from '../../../../Toast';

function splitCsvLine(line) {
	const values = [];
	let current = '';
	let inQuotes = false;
	for (let i = 0; i < line.length; i += 1) {
		const char = line[i];
		if (char === '"') {
			const next = line[i + 1];
			if (inQuotes && next === '"') {
				current += '"';
				i += 1;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			values.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	values.push(current.trim());
	return values.map((value) => value.replace(/^"|"$/g, '').trim());
}

function parseCsvRows(text) {
	const lines = String(text || '')
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	if (lines.length < 2) {
		throw new Error('CSV must include a header and at least one data row.');
	}

	const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
	const usernameIndex = headers.findIndex((header) => header === 'username' || header === 'name');
	const emailIndex = headers.findIndex((header) => header === 'email');
	const passwordIndex = headers.findIndex((header) => header === 'password');

	if (usernameIndex === -1 || emailIndex === -1) {
		throw new Error('CSV header must include username and email columns.');
	}

	const rows = [];
	for (let i = 1; i < lines.length; i += 1) {
		const columns = splitCsvLine(lines[i]);
		const username = columns[usernameIndex] || '';
		const email = columns[emailIndex] || '';
		const password = passwordIndex >= 0 ? columns[passwordIndex] || '' : '';
		if (!username && !email) {
			continue;
		}
		rows.push({ username, email, password });
	}

	if (!rows.length) {
		throw new Error('No valid student rows were found in the CSV file.');
	}

	return rows;
}

function generateTempPassword(length = 12) {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%&*';
	let password = '';
	for (let i = 0; i < length; i += 1) {
		password += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return password;
}

export default function UserManagement() {
	const [users, setUsers] = useState([]);
	const [classes, setClasses] = useState([]);
	const [selectedClassIds, setSelectedClassIds] = useState([]);
	const [teacherForm, setTeacherForm] = useState({ username: '', email: '', password: '' });
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviteResult, setInviteResult] = useState(null);
	const [bulkRows, setBulkRows] = useState([]);
	const [bulkFileName, setBulkFileName] = useState('');
	const [loadingUsers, setLoadingUsers] = useState(true);
	const [submittingTeacher, setSubmittingTeacher] = useState(false);
	const [submittingInvite, setSubmittingInvite] = useState(false);
	const [submittingBulk, setSubmittingBulk] = useState(false);
	const [filters, setFilters] = useState({ role: 'all', search: '' });
	const [confirmState, setConfirmState] = useState({
		isOpen: false,
		title: '',
		message: '',
		type: 'warning',
		onConfirm: null,
	});
	const [tempPasswords, setTempPasswords] = useState({});
	const [toast, setToast] = useState({
		isOpen: false,
		type: 'info',
		message: '',
	});

	const openToast = useCallback((type, message) => {
		setToast({ isOpen: true, type, message });
	}, []);

	const loadClasses = useCallback(async () => {
		try {
			const response = await listInstituteClasses();
			setClasses(response.data || []);
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to load classes.');
		}
	}, [openToast]);

	const loadUsers = useCallback(async (query = filters) => {
		setLoadingUsers(true);
		try {
			const response = await listInstituteUsers({
				role: query.role,
				search: query.search,
			});
			setUsers(response.data || []);
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to load users.');
		} finally {
			setLoadingUsers(false);
		}
	}, [filters, openToast]);

	useEffect(() => {
		loadClasses();
		loadUsers({ role: 'all', search: '' });
	}, [loadClasses, loadUsers]);

	const summary = useMemo(() => {
		const byRole = { admin: 0, teacher: 0, student: 0, parent: 0 };
		users.forEach((user) => {
			if (byRole[user.role] !== undefined) {
				byRole[user.role] += 1;
			}
		});
		return {
			total: users.length,
			...byRole,
		};
	}, [users]);

	const toggleClassSelection = (classId) => {
		setSelectedClassIds((previous) =>
			previous.includes(classId)
				? previous.filter((id) => id !== classId)
				: [...previous, classId],
		);
	};

	const handleTeacherSubmit = async (event) => {
		event.preventDefault();
		setSubmittingTeacher(true);
		try {
			await createTeacherAccount(teacherForm);
			setTeacherForm({ username: '', email: '', password: '' });
			openToast('success', 'Teacher account created.');
			loadUsers();
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to create teacher account.');
		} finally {
			setSubmittingTeacher(false);
		}
	};

	const handleInviteSubmit = async (event) => {
		event.preventDefault();
		setSubmittingInvite(true);
		try {
			const response = await createAdminInvite({ email: inviteEmail });
			setInviteResult(response.data?.invite || null);
			setInviteEmail('');
			openToast('success', 'Admin invitation created.');
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to create admin invite.');
		} finally {
			setSubmittingInvite(false);
		}
	};

	const handleCsvFileChange = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			const rows = parseCsvRows(text);
			setBulkRows(rows);
			setBulkFileName(file.name);
			openToast('success', `Loaded ${rows.length} student rows from CSV.`);
		} catch (error) {
			setBulkRows([]);
			setBulkFileName('');
			openToast('error', error.message || 'Failed to parse CSV file.');
		}
	};

	const runBulkCreate = async () => {
		setSubmittingBulk(true);
		try {
			const response = await createBulkStudents({
				students: bulkRows,
				classIds: selectedClassIds,
			});
			const createdCount = response.data?.summary?.createdCount || 0;
			const skippedCount = response.data?.summary?.skippedCount || 0;
			setBulkRows([]);
			setBulkFileName('');
			openToast('success', `Bulk creation completed. Created: ${createdCount}, Skipped: ${skippedCount}.`);
			loadUsers();
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Bulk student creation failed.');
		} finally {
			setSubmittingBulk(false);
		}
	};

	const handleBulkSubmit = async (event) => {
		event.preventDefault();
		if (!bulkRows.length) {
			openToast('warning', 'Upload a CSV file first.');
			return;
		}
		setConfirmState({
			isOpen: true,
			title: 'Create student accounts',
			message: `Create ${bulkRows.length} student accounts and auto-enroll them in ${selectedClassIds.length} classes?`,
			type: 'warning',
			onConfirm: runBulkCreate,
		});
	};

	const handleSendResetCode = (user) => {
		setConfirmState({
			isOpen: true,
			title: 'Send reset code',
			message: `Send a password reset code to ${user.email}?`,
			type: 'warning',
			onConfirm: async () => {
				try {
					await resetUserPasswordAsAdmin(user.id, { method: 'email' });
					openToast('success', `Reset code sent to ${user.email}.`);
				} catch (error) {
					openToast('error', error?.response?.data?.message || 'Failed to send reset code.');
				}
			},
		});
	};

	const handleSetTemporaryPassword = (user) => {
		const temporaryPassword = generateTempPassword();
		setConfirmState({
			isOpen: true,
			title: 'Set temporary password',
			message: `Set a generated temporary password for ${user.email}?`,
			type: 'warning',
			onConfirm: async () => {
				try {
					await resetUserPasswordAsAdmin(user.id, {
						method: 'temporary',
						newPassword: temporaryPassword,
					});
					setTempPasswords((previous) => ({ ...previous, [user.id]: temporaryPassword }));
					openToast('success', `Temporary password set for ${user.email}.`);
				} catch (error) {
					openToast('error', error?.response?.data?.message || 'Failed to set temporary password.');
				}
			},
		});
	};

	return (
		<div className='p-4 sm:p-6 lg:p-8 space-y-6'>
			<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6'>
				<h1 className='text-2xl font-semibold text-[var(--color-text-primary)]'>User Management</h1>
				<p className='mt-1 text-sm text-[var(--color-text-muted)]'>Manage teacher, student, and admin accounts in your institute.</p>
				<div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4'>
					<div className='rounded-xl border border-[var(--color-border)] p-3'>
						<p className='text-xs text-[var(--color-text-muted)]'>Total</p>
						<p className='text-lg font-semibold text-[var(--color-text-primary)]'>{summary.total}</p>
					</div>
					<div className='rounded-xl border border-[var(--color-border)] p-3'>
						<p className='text-xs text-[var(--color-text-muted)]'>Admins</p>
						<p className='text-lg font-semibold text-[var(--color-text-primary)]'>{summary.admin}</p>
					</div>
					<div className='rounded-xl border border-[var(--color-border)] p-3'>
						<p className='text-xs text-[var(--color-text-muted)]'>Teachers</p>
						<p className='text-lg font-semibold text-[var(--color-text-primary)]'>{summary.teacher}</p>
					</div>
					<div className='rounded-xl border border-[var(--color-border)] p-3'>
						<p className='text-xs text-[var(--color-text-muted)]'>Students</p>
						<p className='text-lg font-semibold text-[var(--color-text-primary)]'>{summary.student}</p>
					</div>
				</div>
			</div>

			<div className='grid gap-6 lg:grid-cols-2'>
				<form onSubmit={handleTeacherSubmit} className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-4'>
					<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Create Teacher Account</h2>
					<input
						required
						value={teacherForm.username}
						onChange={(event) => setTeacherForm((previous) => ({ ...previous, username: event.target.value }))}
						placeholder='Teacher username'
						className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
					/>
					<input
						required
						type='email'
						value={teacherForm.email}
						onChange={(event) => setTeacherForm((previous) => ({ ...previous, email: event.target.value }))}
						placeholder='teacher@school.com'
						className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
					/>
					<input
						required
						type='password'
						minLength={8}
						value={teacherForm.password}
						onChange={(event) => setTeacherForm((previous) => ({ ...previous, password: event.target.value }))}
						placeholder='Temporary password'
						className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
					/>
					<button
						type='submit'
						disabled={submittingTeacher}
						className='w-full rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60'
					>
						{submittingTeacher ? 'Creating...' : 'Create Teacher'}
					</button>
				</form>

				<form onSubmit={handleInviteSubmit} className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-4'>
					<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Invite Another Admin</h2>
					<input
						required
						type='email'
						value={inviteEmail}
						onChange={(event) => setInviteEmail(event.target.value)}
						placeholder='new-admin@school.com'
						className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
					/>
					<button
						type='submit'
						disabled={submittingInvite}
						className='w-full rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60'
					>
						{submittingInvite ? 'Creating invite...' : 'Create Admin Invite'}
					</button>
					{inviteResult && (
						<div className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3 text-sm text-[var(--color-text-secondary)]'>
							<p className='font-medium text-[var(--color-text-primary)]'>Invite Link</p>
							<p className='mt-1 break-all'>{inviteResult.inviteUrl}</p>
							<p className='mt-2 text-xs text-[var(--color-text-muted)]'>Expires: {new Date(inviteResult.expiresAt).toLocaleString()}</p>
						</div>
					)}
				</form>
			</div>

			<form onSubmit={handleBulkSubmit} className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-4'>
				<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Bulk Student Accounts</h2>
				<div className='grid gap-4 lg:grid-cols-[1fr_1fr]'>
					<div className='space-y-3'>
						<input
							type='file'
							accept='.csv,text/csv'
							onChange={handleCsvFileChange}
							className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
						/>
						<p className='text-xs text-[var(--color-text-muted)]'>CSV must include username and email columns. Password column is optional.</p>
						{bulkFileName && (
							<div className='rounded-xl border border-[var(--color-border)] p-3 text-sm text-[var(--color-text-secondary)]'>
								<p className='font-medium text-[var(--color-text-primary)]'>{bulkFileName}</p>
								<p className='mt-1'>Parsed rows: {bulkRows.length}</p>
							</div>
						)}
					</div>
					<div className='rounded-xl border border-[var(--color-border)] p-3'>
						<p className='text-sm font-medium text-[var(--color-text-primary)]'>Auto-enroll classes</p>
						<div className='mt-2 max-h-40 overflow-auto space-y-2'>
							{classes.map((classItem) => (
								<label key={classItem.id} className='flex items-start gap-2 text-sm text-[var(--color-text-secondary)]'>
									<input
										type='checkbox'
										checked={selectedClassIds.includes(classItem.id)}
										onChange={() => toggleClassSelection(classItem.id)}
										className='mt-1 accent-[var(--color-primary)]'
									/>
									<span>
										{classItem.class_name}
										<span className='block text-xs text-[var(--color-text-muted)]'>{classItem.teacher_name || 'No teacher assigned'}</span>
									</span>
								</label>
							))}
							{!classes.length && <p className='text-xs text-[var(--color-text-muted)]'>No classes found.</p>}
						</div>
					</div>
				</div>
				<button
					type='submit'
					disabled={submittingBulk}
					className='w-full rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60'
				>
					{submittingBulk ? 'Creating accounts...' : 'Create Students From CSV'}
				</button>
			</form>

			<div className='rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-4'>
				<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
					<h2 className='text-lg font-semibold text-[var(--color-text-primary)]'>Institute Users</h2>
					<div className='flex flex-col gap-2 sm:flex-row'>
						<select
							value={filters.role}
							onChange={(event) => setFilters((previous) => ({ ...previous, role: event.target.value }))}
							className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
						>
							<option value='all'>All roles</option>
							<option value='admin'>Admins</option>
							<option value='teacher'>Teachers</option>
							<option value='student'>Students</option>
						</select>
						<input
							value={filters.search}
							onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))}
							placeholder='Search username or email'
							className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
						/>
						<button
							type='button'
							onClick={() => loadUsers(filters)}
							className='rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40'
						>
							Refresh
						</button>
					</div>
				</div>

				{loadingUsers ? (
					<div className='rounded-xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]'>Loading users...</div>
				) : (
					<div className='space-y-3'>
						{users.map((user) => (
							<div key={user.id} className='rounded-xl border border-[var(--color-border)] p-4'>
								<div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
									<div>
										<p className='text-sm font-medium text-[var(--color-text-primary)]'>{user.username}</p>
										<p className='text-sm text-[var(--color-text-secondary)]'>{user.email}</p>
										<p className='text-xs capitalize text-[var(--color-text-muted)]'>{user.role}</p>
									</div>
									<div className='flex flex-wrap gap-2'>
										<button
											type='button'
											onClick={() => handleSendResetCode(user)}
											className='rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40'
										>
											Send Reset Code
										</button>
										<button
											type='button'
											onClick={() => handleSetTemporaryPassword(user)}
											className='rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40'
										>
											Set Temporary Password
										</button>
									</div>
								</div>
								{tempPasswords[user.id] && (
									<div className='mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-xs text-[var(--color-text-secondary)]'>
										Temporary password: <span className='font-semibold text-[var(--color-text-primary)]'>{tempPasswords[user.id]}</span>
									</div>
								)}
							</div>
						))}
						{!users.length && (
							<div className='rounded-xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]'>No users found.</div>
						)}
					</div>
				)}
			</div>

			<ConfirmModal
				isOpen={confirmState.isOpen}
				onClose={() => setConfirmState((previous) => ({ ...previous, isOpen: false }))}
				onConfirm={() => {
					if (typeof confirmState.onConfirm === 'function') {
						confirmState.onConfirm();
					}
				}}
				title={confirmState.title}
				message={confirmState.message}
				type={confirmState.type}
				confirmText='Confirm'
				cancelText='Cancel'
			/>

			<Toast
				type={toast.type}
				message={toast.message}
				isOpen={toast.isOpen}
				onClose={() => setToast((previous) => ({ ...previous, isOpen: false }))}
			/>
		</div>
	);
}
