import api from './axiosConfig';

export const createClass = (data) => {
	return api.post('/api/class', data);
};
export const getClasses = (params) => {
	return api.get('/api/class', { params });
};
export const getClassById = (id) => {
	return api.get(`/api/class/${id}`);
};
export const getMyClasses = () => {
	return api.get('/api/class/mine');
};
export const updateClass = (id, data) => {
  return api.put(`/api/class/${id}`, data);
};
export const deleteMyClass = (id) => {
	return api.delete(`/api/class/${id}`);
};

export const postEnrollement = (data) => {
	return api.post(`/api/enroll/`, data);
};
export const getClassEnrolledRooster = (id) => {
	return api.get(`/api/enroll/class/${id}`);
};
export const getStudentEnrolledShedule = (id) => {
	return api.get(`/api/enroll/student/${id}`);
};

export const postAnnouncement = (classId, data) => {
	return api.post(`/api/class/${classId}/announcements`, data);
};
export const getClassAnnouncements = (classId) => {
	return api.get(`/api/class/${classId}/announcements`);
};
export const getAnnouncementById = (classId, announcementId) => {
	return api.get(`/api/class/${classId}/announcements/${announcementId}`);
};
export const deleteAnnouncement = (classId, announcementId) => {
	return api.delete(`/api/class/${classId}/announcements/${announcementId}`);
};
export const getMyAnnouncements = () => api.get('/api/announcements/my');

export const unenrollStudent = (studentId, classId) => {
	return api.delete(`/api/enroll/student/${studentId}/class/${classId}`);
};
