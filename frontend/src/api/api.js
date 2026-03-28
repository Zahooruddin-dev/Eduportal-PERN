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
export const getClassAnnouncements = (classId) => {
  return api.get(`/api/class/${classId}/announcements`);
};

export const postAnnouncement = (classId, data) => {
  return api.post(`/api/class/${classId}/announcements`, data);
};

export const deleteAnnouncement = (classId, announcementId) => {
  return api.delete(`/api/class/${classId}/announcements/${announcementId}`);
};
export const getMyAnnouncements = () => api.get('/api/announcements/my');

export const unenrollStudent = (studentId, classId) => {
	return api.delete(`/api/enroll/student/${studentId}/class/${classId}`);
};

export const getClassResources = (classId) => {
  return api.get(`/api/class/${classId}/resources`);
};

export const createResource = (classId, data) => {
  return api.post(`/api/class/${classId}/resources`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const updateResource = (classId, resourceId, data) => {
  return api.put(`/api/class/${classId}/resources/${resourceId}`, data);
};

export const deleteResource = (classId, resourceId) => {
  return api.delete(`/api/class/${classId}/resources/${resourceId}`);
};

export const getResourceComments = (classId, resourceId) => {
    return api.get(`/api/class/${classId}/resources/${resourceId}/comments`);
};

export const createResourceComment = (classId, resourceId, data) => {
    return api.post(`/api/class/${classId}/resources/${resourceId}/comments`, data);
};

export const updateResourceComment = (classId, resourceId, commentId, data) => {
    return api.put(`/api/class/${classId}/resources/${resourceId}/comments/${commentId}`, data);
};

export const deleteResourceComment = (classId, resourceId, commentId) => {
    return api.delete(`/api/class/${classId}/resources/${resourceId}/comments/${commentId}`);
};
export const getClassAttendance = (classId, date) => {
    return api.get(`/api/attendance/${classId}`, { params: { date } });
};

export const postAttendance = (classId, data) => {
    return api.post(`/api/attendance/${classId}`, data);
};
export const getClassAssignments = (classId) => {
    return api.get(`/api/class/${classId}/grades/assignments`);
};
export const createAssignment = (classId, data) => {
    return api.post(`/api/class/${classId}/grades/assignments`, data);
};
export const updateAssignment = (classId, assignmentId, data) => {
    return api.put(`/api/class/${classId}/grades/assignments/${assignmentId}`, data);
};
export const deleteAssignment = (classId, assignmentId) => {
    return api.delete(`/api/class/${classId}/grades/assignments/${assignmentId}`);
};

// Grades
export const getAssignmentGrades = (classId, assignmentId) => {
    return api.get(`/api/class/${classId}/grades/assignments/${assignmentId}/grades`);
};
export const submitAssignmentGrades = (classId, assignmentId, data) => {
    return api.post(`/api/class/${classId}/grades/assignments/${assignmentId}/grades`, data);
};
export const getStudentGradesForClass = (classId) => {
    return api.get(`/api/class/${classId}/grades/my-grades`);
};