import api from './axiosConfig';

export async function createQuiz(classId, quizData) {
	const response = await api.post(
		`/api/class/${classId}/quizzes`,
		quizData,
	);
	return response.data;
}

export async function getClassQuizzes(classId, search = '') {
	const response = await api.get(
		`/api/class/${classId}/quizzes`,
		{
			params: search ? { search } : {},
		},
	);
	return response.data;
}

export async function getQuizDetails(classId, quizId) {
	const response = await api.get(
		`/api/class/${classId}/quizzes/${quizId}`,
	);
	return response.data;
}

export async function updateQuiz(classId, quizId, updates) {
	const response = await api.put(
		`/api/class/${classId}/quizzes/${quizId}`,
		updates,
	);
	return response.data;
}

export async function deleteQuiz(classId, quizId) {
	const response = await api.delete(
		`/api/class/${classId}/quizzes/${quizId}`,
	);
	return response.data;
}

export async function addQuestionToQuiz(classId, quizId, questionData) {
	const response = await api.post(
		`/api/class/${classId}/quizzes/${quizId}/questions`,
		questionData,
	);
	return response.data;
}

export async function updateQuestion(classId, quizId, questionId, updates) {
	const response = await api.put(
		`/api/class/${classId}/quizzes/${quizId}/questions/${questionId}`,
		updates,
	);
	return response.data;
}

export async function deleteQuestion(classId, quizId, questionId) {
	const response = await api.delete(
		`/api/class/${classId}/quizzes/${quizId}/questions/${questionId}`,
	);
	return response.data;
}

export async function startQuiz(classId, quizId) {
	const response = await api.post(
		`/api/class/${classId}/quizzes/${quizId}/start`,
		{},
	);
	return response.data;
}

export async function getMySubmissions(classId, quizId) {
	const response = await api.get(
		`/api/class/${classId}/quizzes/${quizId}/my-submissions`,
	);
	return response.data;
}

export async function submitAnswer(classId, quizId, submissionId, answerData) {
	const response = await api.post(
		`/api/class/${classId}/quizzes/${quizId}/submissions/${submissionId}/answer`,
		answerData,
	);
	return response.data;
}

export async function submitQuiz(classId, quizId, submissionId, submitData) {
	const response = await api.post(
		`/api/class/${classId}/quizzes/${quizId}/submissions/${submissionId}/submit`,
		submitData,
	);
	return response.data;
}

export async function getSubmissionDetails(classId, quizId, submissionId) {
	const response = await api.get(
		`/api/class/${classId}/quizzes/${quizId}/submissions/${submissionId}`,
	);
	return response.data;
}

export async function getQuizSummary(classId, quizId) {
	const response = await api.get(
		`/api/class/${classId}/quizzes/${quizId}/summary`,
	);
	return response.data;
}
