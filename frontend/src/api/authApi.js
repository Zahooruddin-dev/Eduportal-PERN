import api from './axiosConfig';

export const loginUser = (data) => {
	return api.post('/api/auth/login', data);
};

export const registerUser = (data) => {
	return api.post('/api/auth/register', data);
};
export const updateUsername = (data) => {
	return api.put('/api/auth/update-profile', data, {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	});
};
export const changePassword = (data) => {
	return api.put('/api/auth/change-password', data);
};
export const deleteUser = (data) => {
	return api.delete('/api/auth/delete', { data });
};

export const requestReset = (data) => {
	return api.post('/api/auth/request-reset', data);
};

export const resetPassword = (data) => {
	return api.post('/api/auth/reset-password', data);
};

export const getParentProfile = () => {
	return api.get('/api/auth/parent-profile');
};

export const updateParentProfile = (data) => {
	return api.put('/api/auth/parent-profile', data);
};

export const getParentLinkedStudentOverview = () => {
	return api.get('/api/parent/linked-student');
};
