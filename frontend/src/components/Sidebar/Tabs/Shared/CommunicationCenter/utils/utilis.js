export function toLabel(value) {
	return String(value || '')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function avatarInitial(user) {
	return String(user?.username || '?').charAt(0).toUpperCase();
}

export function summarizeContact(contact) {
	if (contact.role === 'teacher') {
		const list = Array.isArray(contact.teacher_subjects) ? contact.teacher_subjects.filter(Boolean) : [];
		return list.slice(0, 3).join(', ') || 'Teacher';
	}
	if (contact.role === 'student') {
		const list = Array.isArray(contact.student_subjects) ? contact.student_subjects.filter(Boolean) : [];
		return list.slice(0, 3).join(', ') || 'Student';
	}
	return toLabel(contact.role);
}

export function formatTime(value) {
	if (!value) return '--';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '--';
	return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(value) {
	if (!value) return 'No activity';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'No activity';
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();
	if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatMessagePreview(content) {
	const text = String(content || '').trim();
	return text || 'No messages yet';
}