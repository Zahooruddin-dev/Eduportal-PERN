const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
	if (typeof value !== 'string') return false;
	return UUID_REGEX.test(value.trim());
}

function validateUuidParam(paramName, label = paramName) {
	return (req, res, next, value) => {
		if (!isUuid(String(value || ''))) {
			return res.status(400).json({ error: `Invalid ${label} format.` });
		}
		next();
	};
}

module.exports = {
	isUuid,
	validateUuidParam,
};
