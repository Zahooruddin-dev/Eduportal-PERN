const buckets = new Map();

function now() {
	return Date.now();
}

function cleanupExpired() {
	const current = now();
	for (const [key, value] of buckets.entries()) {
		if (value.resetAt <= current) {
			buckets.delete(key);
		}
	}
}

function createRateLimiter({ windowMs, max, getIdentifier }) {
	if (!Number.isFinite(windowMs) || windowMs <= 0) {
		throw new Error('windowMs must be a positive number.');
	}
	if (!Number.isFinite(max) || max <= 0) {
		throw new Error('max must be a positive number.');
	}

	return (req, res, next) => {
		cleanupExpired();
		const identifier = typeof getIdentifier === 'function'
			? getIdentifier(req)
			: req.ip;
		const scope = `${req.method}:${req.baseUrl || ''}:${req.path || ''}`;
		const key = `${scope}:${String(identifier || req.ip || 'anonymous')}`;
		const current = now();
		const existing = buckets.get(key);

		if (!existing || existing.resetAt <= current) {
			buckets.set(key, { count: 1, resetAt: current + windowMs });
			return next();
		}

		if (existing.count >= max) {
			const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - current) / 1000));
			res.set('Retry-After', String(retryAfterSeconds));
			return res.status(429).json({ message: 'Too many requests. Please try again later.' });
		}

		existing.count += 1;
		buckets.set(key, existing);
		return next();
	};
}

module.exports = {
	createRateLimiter,
};
