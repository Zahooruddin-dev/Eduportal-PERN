export const getFileViewUrl = (url) => {
	if (!url) return url;
	if (url.includes('/raw/upload/')) {
		const separator = url.includes('?') ? '&' : '?';
		return `${url}${separator}fl_attachment=0&embed=true`;
	}
	return url;
};
