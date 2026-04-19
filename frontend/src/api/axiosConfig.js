import axios from 'axios';

const api = axios.create({
	baseURL: import.meta.env.VITE_BACKEND_URL || '',
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
});

const CACHE_TTL_MS = 20_000;
const responseCache = new Map();
const TOKEN_KEY = 'token';
const AUTH_REFRESH_PATH = '/api/auth/refresh';
let refreshRequest = null;

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
	const token = localStorage.getItem(TOKEN_KEY) || '';
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

function clearAuthState() {
	localStorage.removeItem(TOKEN_KEY);
}

function isAuthRequestPath(url = '') {
	return (
		url.includes('/api/auth/login')
		|| url.includes('/api/auth/register')
		|| url.includes('/api/auth/request-reset')
		|| url.includes('/api/auth/reset-password')
		|| url.includes('/api/auth/refresh')
		|| url.includes('/api/auth/logout')
	);
}

async function requestTokenRefresh() {
	if (!refreshRequest) {
		refreshRequest = api
			.post(
				AUTH_REFRESH_PATH,
				{},
				{
					skipAuthRefresh: true,
					cache: false,
				},
			)
			.then((response) => {
				const token = response?.data?.token || '';
				if (!token) {
					throw new Error('Refresh token response did not include access token.');
				}
				localStorage.setItem(TOKEN_KEY, token);
				return token;
			})
			.finally(() => {
				refreshRequest = null;
			});
	}

	return refreshRequest;
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
		config.headers = config.headers || {};
		const token = localStorage.getItem(TOKEN_KEY);
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
	async (error) => {
		const status = error?.response?.status;
		const originalRequest = error?.config || {};
		const requestUrl = String(originalRequest?.url || '');
		const isAuthRequest = isAuthRequestPath(requestUrl);

		if (!error.response || status >= 500) {
			emitGlobalApiError(
				error?.response?.data?.message || error?.message || 'Server error. Please try again.',
			);
		}

		const shouldRetryWithRefresh = status === 401
			&& !isAuthRequest
			&& !originalRequest._retry
			&& !originalRequest.skipAuthRefresh;

		if (shouldRetryWithRefresh) {
			originalRequest._retry = true;
			try {
				const refreshedToken = await requestTokenRefresh();
				originalRequest.headers = {
					...(originalRequest.headers || {}),
					Authorization: `Bearer ${refreshedToken}`,
				};
				return api(originalRequest);
			} catch {
				clearAuthState();
			}
		}

		if (status === 401 && !isAuthRequest && !originalRequest.skipSessionRedirect) {
			clearAuthState();
			emitGlobalApiError('Your session has expired. Please sign in again.');
			if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
				window.location.href = '/login';
			}
		}

		return Promise.reject(error);
	},
);

export default api;
