const MAX_PASSWORD_LENGTH = 72;

const ROLE_MIN_LENGTH = {
	admin: 12,
	teacher: 12,
	student: 10,
	parent: 10,
};

function normalizeRole(role) {
	return String(role || '').trim().toLowerCase();
}

function getMinPasswordLength(role) {
	const normalized = normalizeRole(role);
	return ROLE_MIN_LENGTH[normalized] || 10;
}

function validatePasswordStrength(password, role) {
	const value = String(password || '');
	const minLength = getMinPasswordLength(role);

	if (!value) {
		return { ok: false, message: 'Password is required.' };
	}

	if (value.length < minLength) {
		return {
			ok: false,
			message: `Password must be at least ${minLength} characters.`,
		};
	}

	if (value.length > MAX_PASSWORD_LENGTH) {
		return {
			ok: false,
			message: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
		};
	}

	if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
		return {
			ok: false,
			message: 'Password must include uppercase, lowercase, number, and special character.',
		};
	}

	return { ok: true };
}

module.exports = {
	getMinPasswordLength,
	validatePasswordStrength,
};
