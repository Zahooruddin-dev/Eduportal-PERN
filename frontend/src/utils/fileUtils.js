export const getFileViewUrl = (url) => {
  if (!url) return url;
  if (url.includes('/raw/upload/')) {
    const separator = url.includes('?') ? '&' : '?';
    // Add both flags: fl_attachment=0 (inline) and embed=true (allow framing)
    return `${url}${separator}fl_attachment=0&embed=true`;
  }
  return url;
};