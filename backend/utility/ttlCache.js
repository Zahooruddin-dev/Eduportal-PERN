const DEFAULT_TTL_MS = 30 * 1000;
const DEFAULT_MAX_ENTRIES = 500;

const cacheStore = new Map();

function toPositiveNumber(value, fallback) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric <= 0) {
		return fallback;
	}
	return numeric;
}

function pruneExpiredEntries(now = Date.now()) {
	for (const [key, entry] of cacheStore.entries()) {
		if (!entry || entry.expiresAt <= now) {
			cacheStore.delete(key);
		}
	}
}

function enforceMaxEntries(maxEntries = DEFAULT_MAX_ENTRIES) {
	const safeMax = Math.max(1, Math.trunc(toPositiveNumber(maxEntries, DEFAULT_MAX_ENTRIES)));
	while (cacheStore.size > safeMax) {
		const oldestKey = cacheStore.keys().next().value;
		if (!oldestKey) break;
		cacheStore.delete(oldestKey);
	}
}

function getCacheValue(key) {
	if (!key) return null;
	const entry = cacheStore.get(key);
	if (!entry) return null;

	if (entry.expiresAt <= Date.now()) {
		cacheStore.delete(key);
		return null;
	}

	return entry.value;
}

function setCacheValue(key, value, ttlMs = DEFAULT_TTL_MS) {
	if (!key) return value;
	const ttl = toPositiveNumber(ttlMs, DEFAULT_TTL_MS);
	const now = Date.now();
	pruneExpiredEntries(now);

	if (cacheStore.has(key)) {
		cacheStore.delete(key);
	}

	cacheStore.set(key, {
		value,
		expiresAt: now + ttl,
	});

	enforceMaxEntries();
	return value;
}

function deleteCacheValue(key) {
	if (!key) return;
	cacheStore.delete(key);
}

function deleteCacheByPrefix(prefix) {
	const normalizedPrefix = String(prefix || '').trim();
	if (!normalizedPrefix) return;

	for (const key of cacheStore.keys()) {
		if (String(key).startsWith(normalizedPrefix)) {
			cacheStore.delete(key);
		}
	}
}

function clearCache() {
	cacheStore.clear();
}

module.exports = {
	getCacheValue,
	setCacheValue,
	deleteCacheValue,
	deleteCacheByPrefix,
	clearCache,
};
