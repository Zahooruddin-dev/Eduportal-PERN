
export const getFileViewUrl = (url) => {
  if (url?.includes('/raw/upload/')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}fl_attachment=0`;
  }
  return url;
};