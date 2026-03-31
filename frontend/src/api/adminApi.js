import api from './axiosConfig';

export const bootstrapAdmin = (payload, setupSecret) => {
	return api.post('/api/admin/bootstrap', payload, {
		headers: {
			'X-Admin-Setup-Secret': setupSecret,
		},
	});
};

export const acceptAdminInvite = (payload) => {
	return api.post('/api/admin/invites/accept', payload);
};

export const listInstituteUsers = (params = {}) => {
	return api.get('/api/admin/users', { params });
};

export const listInstituteClasses = () => {
	return api.get('/api/admin/classes');
};

export const getAdminRiskOverview = ({ refresh = false } = {}) => {
	return api.get('/api/admin/risk-overview', {
		params: refresh ? { refresh: 1 } : undefined,
	});
};

export const createTeacherAccount = (payload) => {
	return api.post('/api/admin/teachers', payload);
};

export const createBulkStudents = (payload) => {
	return api.post('/api/admin/students/bulk', payload);
};

export const createAdminInvite = (payload) => {
	return api.post('/api/admin/invites', payload);
};

export const resetUserPasswordAsAdmin = (userId, payload) => {
	return api.post(`/api/admin/users/${userId}/reset-password`, payload);
};

export const listAdminAnnouncements = () => {
	return api.get('/api/admin/announcements');
};

export const createAdminAnnouncement = (payload) => {
	return api.post('/api/admin/announcements', payload);
};

export const deleteAdminAnnouncement = (announcementId) => {
	return api.delete(`/api/admin/announcements/${announcementId}`);
};

export const linkParentStudent = (parentUserId, payload) => {
	return api.patch(`/api/admin/parents/${parentUserId}/link-student`, payload);
};
