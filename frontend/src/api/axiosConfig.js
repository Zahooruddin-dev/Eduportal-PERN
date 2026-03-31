import axios from 'axios';

const api = axios.create({
	baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
	headers: {
		'Content-Type': 'application/json',
	},
});

const CACHE_TTL_MS = 20_000;
const responseCache = new Map();

function stableSerialize(value) {
	if (value === null || value === undefined) return '';
	if (Array.isArray(value)) {
		return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
	}
	if (typeof value === 'object') {
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${key}:${stableSerialize(value[key])}`)
			.join(',')}}`;
	}
	return String(value);
}

function buildCacheKey(url, config = {}) {
	const token = localStorage.getItem('token') || '';
	const paramsSignature = stableSerialize(config.params || {});
	return `${token}::${url}::${paramsSignature}`;
}

function cloneResponse(response, config = {}) {
	return {
		...response,
		config: {
			...(response?.config || {}),
			...config,
		},
		headers: {
			...(response?.headers || {}),
		},
	};
}

function emitGlobalApiError(message) {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(
		new CustomEvent('app:api-error', {
			detail: { message },
		}),
	);
}

const rawGet = api.get.bind(api);
api.get = (url, config = {}) => {
	if (config?.cache === false) {
		return rawGet(url, config);
	}

	const cacheKey = buildCacheKey(url, config);
	const cached = responseCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		return Promise.resolve(cloneResponse(cached.response, config));
	}

	responseCache.delete(cacheKey);
	const ttlMs = Number(config?.cacheTtlMs) > 0
		? Number(config.cacheTtlMs)
		: CACHE_TTL_MS;

	return rawGet(url, config).then((response) => {
		responseCache.set(cacheKey, {
			response,
			expiresAt: Date.now() + ttlMs,
		});
		return response;
	});
};

api.clearResponseCache = () => {
	responseCache.clear();
};

api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		if (String(config.method || '').toLowerCase() !== 'get') {
			responseCache.clear();
		}

		return config;
	},
	(error) => Promise.reject(error),
);

api.interceptors.response.use(
	(response) => response,
	(error) => {
		const status = error?.response?.status;
		const requestUrl = String(error?.config?.url || '');
		const isAuthRequest = requestUrl.includes('/api/auth/login')
			|| requestUrl.includes('/api/auth/register')
			|| requestUrl.includes('/api/auth/request-reset')
			|| requestUrl.includes('/api/auth/reset-password');

		if (!error.response || status >= 500) {
			emitGlobalApiError(
				error?.response?.data?.message || error?.message || 'Server error. Please try again.',
			);
		}

		if (status === 401 && !isAuthRequest) {
			localStorage.removeItem('token');
			emitGlobalApiError('Your session has expired. Please sign in again.');
			if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
				window.location.href = '/login';
			}
		}

		return Promise.reject(error);
	},
);

export default api;
