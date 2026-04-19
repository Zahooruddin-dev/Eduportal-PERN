import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	createAdminInvite,
	createBulkStudents,
	createTeacherAccount,
	linkParentStudent,
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
	const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
	const lowercase = 'abcdefghijkmnopqrstuvwxyz';
	const numbers = '23456789';
	const specials = '@#$%&*';
	const allChars = `${uppercase}${lowercase}${numbers}${specials}`;

	const pickRandom = (chars) => chars[Math.floor(Math.random() * chars.length)];
	const chars = [
		pickRandom(uppercase),
		pickRandom(lowercase),
		pickRandom(numbers),
		pickRandom(specials),
	];

	while (chars.length < Math.max(12, Number(length) || 12)) {
		chars.push(pickRandom(allChars));
	}

	for (let i = chars.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = chars[i];
		chars[i] = chars[j];
		chars[j] = temp;
	}

	return chars.join('');
}

const USER_PAGE_SIZE = 25;
const STUDENT_OPTIONS_LIMIT = 300;

function toUserSummary(summary) {
	return {
		total: Number(summary?.total || 0),
		admin: Number(summary?.admin || 0),
		teacher: Number(summary?.teacher || 0),
		student: Number(summary?.student || 0),
		parent: Number(summary?.parent || 0),
	};
}

function summarizeUsersByRole(users) {
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
}

export default function UserManagement() {
	const [users, setUsers] = useState([]);
	const [userPage, setUserPage] = useState(1);
	const [userSummary, setUserSummary] = useState({
		total: 0,
		admin: 0,
		teacher: 0,
		student: 0,
		parent: 0,
	});
	const [userPagination, setUserPagination] = useState({
		total: 0,
		page: 1,
		limit: USER_PAGE_SIZE,
		totalPages: 1,
		hasNext: false,
		hasPrevious: false,
	});
	const [classes, setClasses] = useState([]);
	const [selectedClassIds, setSelectedClassIds] = useState([]);
	const [teacherForm, setTeacherForm] = useState({
		username: '',
		email: '',
		password: '',
		subjectInput: '',
		subjects: [],
		selectedClassId: '',
		otherGrade: '',
	});
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviteResult, setInviteResult] = useState(null);
	const [bulkRows, setBulkRows] = useState([]);
	const [bulkFileName, setBulkFileName] = useState('');
	const [loadingUsers, setLoadingUsers] = useState(true);
	const [loadingStudents, setLoadingStudents] = useState(true);
	const [submittingTeacher, setSubmittingTeacher] = useState(false);
	const [submittingInvite, setSubmittingInvite] = useState(false);
	const [submittingBulk, setSubmittingBulk] = useState(false);
	const [filters, setFilters] = useState({ role: 'all', search: '' });
	const [studentOptions, setStudentOptions] = useState([]);
	const [parentStudentSelection, setParentStudentSelection] = useState({});
	const [linkingParentIds, setLinkingParentIds] = useState({});
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

	const loadStudentOptions = useCallback(async () => {
		setLoadingStudents(true);
		try {
			const response = await listInstituteUsers({
				role: 'student',
				search: '',
				page: 1,
				limit: STUDENT_OPTIONS_LIMIT,
				compact: true,
			});
			const payload = response.data;
			const options = Array.isArray(payload) ? payload : (payload?.items || []);
			setStudentOptions(options);
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to load students for parent linking.');
		} finally {
			setLoadingStudents(false);
		}
	}, [openToast]);

	const syncParentSelections = useCallback((nextUsers) => {
		const nextSelection = {};
		nextUsers.forEach((entry) => {
			if (entry.role === 'parent') {
				nextSelection[entry.id] = entry.child_student_id || '';
			}
		});
		setParentStudentSelection(nextSelection);
	}, []);

	const loadUsers = useCallback(async (query = null, pageNumber = 1) => {
		const effectiveQuery = query || { role: 'all', search: '' };
		const requestedPage = Number.isFinite(Number(pageNumber)) ? Number(pageNumber) : 1;
		setLoadingUsers(true);
		try {
			const response = await listInstituteUsers({
				role: effectiveQuery.role,
				search: effectiveQuery.search,
				page: requestedPage,
				limit: USER_PAGE_SIZE,
			});
			const payload = response.data;
			const fetchedUsers = Array.isArray(payload) ? payload : (payload?.items || []);
			const pagination = Array.isArray(payload)
				? {
					total: fetchedUsers.length,
					page: requestedPage,
					limit: USER_PAGE_SIZE,
					totalPages: 1,
					hasNext: false,
					hasPrevious: requestedPage > 1,
				}
				: {
					total: Number(payload?.pagination?.total || 0),
					page: Number(payload?.pagination?.page || requestedPage),
					limit: Number(payload?.pagination?.limit || USER_PAGE_SIZE),
					totalPages: Math.max(1, Number(payload?.pagination?.totalPages || 1)),
					hasNext: Boolean(payload?.pagination?.hasNext),
					hasPrevious: Boolean(payload?.pagination?.hasPrevious),
				};

			setUsers(fetchedUsers);
			setUserPagination(pagination);
			setUserPage(pagination.page);
			setUserSummary(
				Array.isArray(payload)
					? summarizeUsersByRole(fetchedUsers)
					: toUserSummary(payload?.summary || summarizeUsersByRole(fetchedUsers)),
			);
			syncParentSelections(fetchedUsers);
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Failed to load users.');
		} finally {
			setLoadingUsers(false);
		}
	}, [openToast, syncParentSelections]);

	useEffect(() => {
		loadClasses();
		loadStudentOptions();
		loadUsers({ role: 'all', search: '' }, 1);
	}, [loadClasses, loadStudentOptions, loadUsers]);

	const summary = useMemo(() => {
		return toUserSummary(userSummary);
	}, [userSummary]);

	const visibleRange = useMemo(() => {
		if (!users.length) {
			return { start: 0, end: 0 };
		}
		const start = (userPagination.page - 1) * userPagination.limit + 1;
		const end = start + users.length - 1;
		return { start, end };
	}, [users, userPagination.limit, userPagination.page]);

	const toggleClassSelection = (classId) => {
		setSelectedClassIds((previous) =>
			previous.includes(classId)
				? previous.filter((id) => id !== classId)
				: [...previous, classId],
		);
	};

	const addTeacherSubject = () => {
		const value = String(teacherForm.subjectInput || '').trim();
		if (!value) {
			return;
		}

		const isDuplicate = teacherForm.subjects.some(
			(subject) => String(subject).toLowerCase() === value.toLowerCase(),
		);
		if (isDuplicate) {
			openToast('warning', 'Subject already added.');
			return;
		}

		setTeacherForm((previous) => ({
			...previous,
			subjectInput: '',
			subjects: [...previous.subjects, value],
		}));
	};

	const removeTeacherSubject = (subjectToRemove) => {
		setTeacherForm((previous) => ({
			...previous,
			subjects: previous.subjects.filter((subject) => subject !== subjectToRemove),
		}));
	};

	const handleTeacherSubmit = async (event) => {
		event.preventDefault();
		const normalizedSubjects = teacherForm.subjects
			.map((subject) => String(subject || '').trim())
			.filter(Boolean);
		const selectedClass = String(teacherForm.selectedClassId || '').trim();
		const otherGrade = String(teacherForm.otherGrade || '').trim();

		if (!normalizedSubjects.length) {
			openToast('warning', 'Add at least one subject for the teacher profile.');
			return;
		}

		if (!selectedClass) {
			openToast('warning', 'Select a class or choose Other for free-text grade.');
			return;
		}

		if (selectedClass === 'other' && !otherGrade) {
			openToast('warning', 'Enter the class/grade when Other is selected.');
			return;
		}

		setSubmittingTeacher(true);
		try {
			await createTeacherAccount({
				username: teacherForm.username,
				email: teacherForm.email,
				password: teacherForm.password,
				teacherProfile: {
					subjects: normalizedSubjects,
					selectedClassId: selectedClass === 'other' ? null : selectedClass,
					otherGrade: selectedClass === 'other' ? otherGrade : '',
				},
			});
			setTeacherForm({
				username: '',
				email: '',
				password: '',
				subjectInput: '',
				subjects: [],
				selectedClassId: '',
				otherGrade: '',
			});
			openToast('success', 'Teacher account created.');
			await loadUsers(filters, 1);
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
			await Promise.all([loadUsers(filters, 1), loadStudentOptions()]);
		} catch (error) {
			openToast('error', error?.response?.data?.message || 'Bulk student creation failed.');
		} finally {
			setSubmittingBulk(false);
		}
	};

	const handleSaveParentLink = (parentUser) => {
		const selectedStudentId = parentStudentSelection[parentUser.id] || '';
		const canUpdate = Boolean(selectedStudentId) || Boolean(parentUser.child_student_id);

		if (!canUpdate) {
			openToast('warning', 'Select a student first to create a parent-student link.');
			return;
		}

		setConfirmState({
			isOpen: true,
			title: selectedStudentId ? 'Link parent to student' : 'Remove parent link',
			message: selectedStudentId
				? `Link ${parentUser.username} to the selected student account?`
				: `Remove the linked student from ${parentUser.username}?`,
			type: 'warning',
			onConfirm: async () => {
				setLinkingParentIds((previous) => ({ ...previous, [parentUser.id]: true }));
				try {
					await linkParentStudent(parentUser.id, {
						studentId: selectedStudentId || null,
					});
					openToast('success', selectedStudentId
						? 'Student linked to parent account successfully.'
						: 'Parent account unlinked from student successfully.');
					await Promise.all([loadUsers(filters, userPage), loadStudentOptions()]);
				} catch (error) {
					openToast('error', error?.response?.data?.message || 'Failed to update parent-student mapping.');
				} finally {
					setLinkingParentIds((previous) => {
						const next = { ...previous };
						delete next[parentUser.id];
						return next;
					});
				}
			},
		});
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
				<p className='mt-1 text-sm text-[var(--color-text-muted)]'>Manage teacher, student, parent, and admin accounts in your institute.</p>
				<div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5'>
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
					<div className='rounded-xl border border-[var(--color-border)] p-3'>
						<p className='text-xs text-[var(--color-text-muted)]'>Parents</p>
						<p className='text-lg font-semibold text-[var(--color-text-primary)]'>{summary.parent}</p>
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
						minLength={12}
						value={teacherForm.password}
						onChange={(event) => setTeacherForm((previous) => ({ ...previous, password: event.target.value }))}
						placeholder='Strong password'
						className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
					/>

					<div>
						<p className='mb-1.5 text-sm font-medium text-[var(--color-text-secondary)]'>Subjects</p>
						<div className='flex gap-2'>
							<input
								value={teacherForm.subjectInput}
								onChange={(event) => setTeacherForm((previous) => ({ ...previous, subjectInput: event.target.value }))}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ',') {
										event.preventDefault();
										addTeacherSubject();
									}
								}}
								placeholder='Math'
								className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
							/>
							<button
								type='button'
								onClick={addTeacherSubject}
								className='rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40'
							>
								Add
							</button>
						</div>
						{teacherForm.subjects.length > 0 && (
							<div className='mt-2 flex flex-wrap gap-2'>
								{teacherForm.subjects.map((subject) => (
									<span
										key={subject}
										className='inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-1 text-xs text-[var(--color-text-secondary)]'
									>
										{subject}
										<button
											type='button'
											onClick={() => removeTeacherSubject(subject)}
											className='text-[var(--color-text-muted)] hover:text-red-500'
											aria-label={`Remove ${subject}`}
										>
											x
										</button>
									</span>
								))}
							</div>
						)}
					</div>

					<div>
						<p className='mb-1.5 text-sm font-medium text-[var(--color-text-secondary)]'>Preferred class</p>
						<select
							value={teacherForm.selectedClassId}
							onChange={(event) => {
								const nextValue = event.target.value;
								setTeacherForm((previous) => ({
									...previous,
									selectedClassId: nextValue,
									otherGrade: nextValue === 'other' ? previous.otherGrade : '',
								}));
							}}
							className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
						>
							<option value=''>Select a class</option>
							{classes.map((classItem) => (
								<option key={classItem.id} value={classItem.id}>
									{classItem.class_name}
								</option>
							))}
							<option value='other'>Other</option>
						</select>
					</div>

					{teacherForm.selectedClassId === 'other' && (
						<input
							required
							value={teacherForm.otherGrade}
							onChange={(event) => setTeacherForm((previous) => ({ ...previous, otherGrade: event.target.value }))}
							placeholder='Class/grade'
							className='w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30'
						/>
					)}

					<p className='text-xs text-[var(--color-text-muted)]'>
						Password must be 12+ characters with uppercase, lowercase, number, and special character.
					</p>
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
							onChange={(event) => {
								setFilters((previous) => ({ ...previous, role: event.target.value }));
								setUserPage(1);
							}}
							className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
						>
							<option value='all'>All roles</option>
							<option value='admin'>Admins</option>
							<option value='teacher'>Teachers</option>
							<option value='student'>Students</option>
							<option value='parent'>Parents</option>
						</select>
						<input
							value={filters.search}
							onChange={(event) => {
								setFilters((previous) => ({ ...previous, search: event.target.value }));
								setUserPage(1);
							}}
							placeholder='Search username or email'
							className='rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]'
						/>
						<button
							type='button'
							onClick={() => loadUsers(filters, 1)}
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
						{users.map((user) => {
							const teacherSubjects = Array.isArray(user.teacher_subjects)
								? user.teacher_subjects
								: String(user.teacher_subjects || '')
									.split(',')
									.map((item) => item.trim())
									.filter(Boolean);

							return (
								<div key={user.id} className='rounded-xl border border-[var(--color-border)] p-4'>
									<div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
										<div>
											<p className='text-sm font-medium text-[var(--color-text-primary)]'>{user.username}</p>
											<p className='text-sm text-[var(--color-text-secondary)]'>{user.email}</p>
											<p className='text-xs capitalize text-[var(--color-text-muted)]'>{user.role}</p>
											{user.role === 'teacher' && (
												<div className='mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-xs text-[var(--color-text-secondary)] space-y-1'>
													<p>
														<span className='font-medium text-[var(--color-text-primary)]'>Subjects:</span>{' '}
														{teacherSubjects.length ? teacherSubjects.join(', ') : 'Not provided'}
													</p>
													<p>
														<span className='font-medium text-[var(--color-text-primary)]'>Class preference:</span>{' '}
														{user.teacher_class_name || user.teacher_other_grade || 'Not provided'}
													</p>
												</div>
											)}
											{user.role === 'parent' && (
												<div className='mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-xs text-[var(--color-text-secondary)] space-y-1'>
													<p><span className='font-medium text-[var(--color-text-primary)]'>Child:</span> {user.child_full_name || 'Not provided'}</p>
													<p><span className='font-medium text-[var(--color-text-primary)]'>Grade:</span> {user.child_grade || 'Not provided'}</p>
													<p><span className='font-medium text-[var(--color-text-primary)]'>Relationship:</span> {user.relationship_to_child || 'Not provided'}</p>
													<p><span className='font-medium text-[var(--color-text-primary)]'>Primary phone:</span> {user.parent_phone || 'Not provided'}</p>
													<p>
														<span className='font-medium text-[var(--color-text-primary)]'>Linked student account:</span>{' '}
														{user.linked_student_username
															? `${user.linked_student_username} (${user.linked_student_email || 'No email'})`
															: 'Not linked yet'}
													</p>
													{user.alternate_phone && (
														<p><span className='font-medium text-[var(--color-text-primary)]'>Alternate phone:</span> {user.alternate_phone}</p>
													)}
													{user.address && (
														<p><span className='font-medium text-[var(--color-text-primary)]'>Address:</span> {user.address}</p>
													)}

													<div className='mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/8 p-2.5'>
														<p className='font-medium text-emerald-700 dark:text-emerald-300'>Parent to student mapping</p>
														<div className='mt-2 flex flex-col gap-2 sm:flex-row'>
															<select
																value={parentStudentSelection[user.id] || ''}
																onChange={(event) => {
																	const value = event.target.value;
																	setParentStudentSelection((previous) => ({
																		...previous,
																		[user.id]: value,
																	}));
																}}
																disabled={loadingStudents || Boolean(linkingParentIds[user.id])}
																className='w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text-primary)]'
															>
																<option value=''>No linked student</option>
																{studentOptions.map((studentOption) => (
																	<option key={studentOption.id} value={studentOption.id}>
																		{studentOption.username} ({studentOption.email})
																	</option>
																))}
															</select>
															<button
																type='button'
																onClick={() => handleSaveParentLink(user)}
																disabled={
																	loadingStudents
																	|| Boolean(linkingParentIds[user.id])
																	|| (!parentStudentSelection[user.id] && !user.child_student_id)
																}
																className='rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-60 dark:text-emerald-300'
															>
																{linkingParentIds[user.id]
																	? 'Saving...'
																	: parentStudentSelection[user.id]
																		? 'Save Link'
																		: 'Unlink Student'}
															</button>
														</div>
													</div>
												</div>
											)}
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
							);
						})}
						{!users.length && (
							<div className='rounded-xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]'>No users found.</div>
						)}

						<div className='flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-xs text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between'>
							<p>
								Showing {visibleRange.start} - {visibleRange.end} of {userPagination.total} users
							</p>
							<div className='flex items-center gap-2'>
								<button
									type='button'
									onClick={() => loadUsers(filters, userPagination.page - 1)}
									disabled={!userPagination.hasPrevious}
									className='rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)] disabled:opacity-50'
								>
									Previous
								</button>
								<span className='text-[var(--color-text-secondary)]'>Page {userPagination.page} / {userPagination.totalPages}</span>
								<button
									type='button'
									onClick={() => loadUsers(filters, userPagination.page + 1)}
									disabled={!userPagination.hasNext}
									className='rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)] disabled:opacity-50'
								>
									Next
								</button>
							</div>
						</div>
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
