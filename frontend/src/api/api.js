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

export const getStudentBannedClasses = (id) => {
  return api.get(`/api/enroll/student/${id}/banned-classes`);
};

export const removeStudentFromClass = (classId, studentId, payload) => {
  return api.post(`/api/enroll/class/${classId}/student/${studentId}/remove`, payload);
};

export const getRemovedClassMembers = (classId) => {
  return api.get(`/api/enroll/class/${classId}/removed`);
};

export const unbanStudentFromClass = (classId, studentId, payload = {}) => {
  return api.patch(`/api/enroll/class/${classId}/student/${studentId}/unban`, payload);
};

export const getStudentClassProfile = (classId, studentId) => {
  return api.get(`/api/enroll/class/${classId}/student/${studentId}/details`);
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
export const getAdminNotifications = (params = {}) =>
  api.get('/api/announcements/notifications/my', { params });

export const getAdminNotificationUnreadSummary = (params = {}) =>
  api.get('/api/announcements/notifications/unread-summary', { params, cache: false });

export const markAdminNotificationRead = (announcementId) =>
  api.patch(`/api/announcements/notifications/${announcementId}/read`);

export const markAllAdminNotificationsRead = () =>
  api.post('/api/announcements/notifications/read-all');

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
// Assignments
export const getClassAssignments = (classId) => {
  return api.get(`/api/class/${classId}/assignments`);
};

export const createAssignment = (classId, data) => {
  return api.post(`/api/class/${classId}/assignments`, data);
};

export const updateAssignment = (classId, assignmentId, data) => {
  return api.put(`/api/class/${classId}/assignments/${assignmentId}`, data);
};

export const deleteAssignment = (classId, assignmentId) => {
  return api.delete(`/api/class/${classId}/assignments/${assignmentId}`);
};

// Grades for assignment
export const getAssignmentGrades = (classId, assignmentId) => {
  return api.get(`/api/class/${classId}/assignments/${assignmentId}/grades`);
};

export const submitAssignmentGrades = (classId, assignmentId, data) => {
  return api.post(`/api/class/${classId}/assignments/${assignmentId}/grades`, data);
};

// Attachments
export const getAssignmentAttachments = (classId, assignmentId) => {
  return api.get(`/api/class/${classId}/assignments/${assignmentId}/attachments`);
};

export const addAssignmentAttachment = (classId, assignmentId, data) => {
  return api.post(`/api/class/${classId}/assignments/${assignmentId}/attachments`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const deleteAssignmentAttachment = (classId, assignmentId, attachmentId) => {
  return api.delete(`/api/class/${classId}/assignments/${assignmentId}/attachments/${attachmentId}`);
};

// Submissions (student)
export const getMyAssignmentSubmission = (classId, assignmentId) => {
  return api.get(`/api/class/${classId}/assignments/${assignmentId}/my-submission`);
};

export const submitAssignment = (classId, assignmentId, data) => {
  return api.post(`/api/class/${classId}/assignments/${assignmentId}/submit`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// For teacher: get all submissions for an assignment
export const getAssignmentSubmissions = (classId, assignmentId) => {
  return api.get(`/api/class/${classId}/assignments/${assignmentId}/submissions`);
};

// For student: get grades for a specific class (already in use)
export const getStudentGradesForClass = (classId) => {
  return api.get(`/api/class/${classId}/assignments/my-grades`);
};

export const getGradebookGrades = (classId, params = {}) => {
  return api.get(`/api/gradebook/grades/${classId}`, { params });
};

export const postGradebookGrades = (payload) => {
  return api.post('/api/gradebook/grades', payload);
};

export const uploadGradebookCsv = (payload) => {
  return api.post('/api/gradebook/upload', payload);
};

export const releaseGradebookGrades = (payload) => {
  return api.patch('/api/gradebook/release', payload);
};

export const getMyGradebookGrades = (params = {}) => {
  return api.get('/api/gradebook/my-grades', { params });
};

export const getReportMeta = () => {
  return api.get('/api/reports/meta');
};

export const getReportTargets = (params = {}) => {
  return api.get('/api/reports/targets', { params });
};

export const createReport = (payload) => {
  return api.post('/api/reports', payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getMyReports = () => {
  return api.get('/api/reports/my');
};

export const getInstituteReports = (params = {}) => {
  return api.get('/api/reports/institute', { params });
};

export const updateInstituteReportStatus = (reportId, payload) => {
  return api.patch(`/api/reports/${reportId}/status`, payload);
};

export const searchCommunicationContacts = (params = {}) => {
  return api.get('/api/communication/contacts', { params });
};

export const getTeacherCommunicationProfile = (teacherId) => {
  return api.get(`/api/communication/teachers/${teacherId}/profile`);
};

export const openDirectConversation = (payload) => {
  return api.post('/api/communication/conversations/direct', payload);
};

export const getCommunicationInbox = () => {
  return api.get('/api/communication/inbox', { cache: false });
};

export const getConversationMessages = (conversationId, params = {}) => {
  return api.get(`/api/communication/conversations/${conversationId}/messages`, {
    params,
    cache: false,
  });
};

export const markConversationRead = (conversationId) => {
  return api.post(`/api/communication/conversations/${conversationId}/read`);
};

export const getCommunicationUnreadCount = () => {
  return api.get('/api/communication/unread-count', { cache: false });
};

export const sendCommunicationMessage = (payload) => {
  return api.post('/api/communication/messages', payload);
};

export const editCommunicationMessage = (messageId, payload) => {
  return api.patch(`/api/communication/messages/${messageId}`, payload);
};

export const deleteCommunicationMessage = (messageId) => {
  return api.delete(`/api/communication/messages/${messageId}`);
};