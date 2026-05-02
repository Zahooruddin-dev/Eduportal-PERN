import axios from 'axios';
import { getAuthHeader } from './axiosConfig';

const apiClient = axios.create();

export async function createQuiz(classId, quizData) {
	const response = await apiClient.post(
		`/api/class/${classId}/quizzes`,
		quizData,
		{ headers: getAuthHeader() },
	);
	return response.data;
}

export async function getClassQuizzes(classId, search = '') {
	const response = await apiClient.get(
		`/api/class/${classId}/quizzes`,
		{
			params: search ? { search } : {},
			headers: getAuthHeader(),
		},
	);
	return response.data;
}

export async function getQuizDetails(classId, quizId) {
	const response = await apiClient.get(
		`/api/class/${classId}/quizzes/${quizId}`,
		{ headers: getAuthHeader() },
	);
	return response.data;
}

export async function updateQuiz(classId, quizId, updates) {
	const response = await apiClient.put(
		`/api/class/${classId}/quizzes/${quizId}`,
		updates,
		{ headers: getAuthHeader() },
	);
	return response.data;
}

export async function deleteQuiz(classId, quizId) {
	const response = await apiClient.delete(
		`/api/class/${classId}/quizzes/${quizId}`,
		{ headers: getAuthHeader() },
	);
	return response.data;
}

export async function addQuestionToQuiz(classId, quizId, questionData) {
	const response = await apiClient.post(
		`/api/class/${classId}/quizzes/${quizId}/questions`,
		questionData,
		{ headers: getAuthHeader() },
	);
	return response.data;
}

export async function updateQuestion(classId, quizId, questionId, updates) {
	const response = await apiClient.put(
		`/api/class/${classId}/quizzes/${quizId}/questions/${questionId}`,
		updates,
		{ headers: getAuthHeader() },
	);
	return response.data;
}

export async function deleteQuestion(classId, quizId, questionId) {
	const response = await apiClient.delete(
		`/api/class/${classId}/quizzes/${quizId}/questions/${questionId}`,
		{ headers: getAuthHeader() },
	);
	return response.data;
}

export async function startQuiz(classId, quizId) {
	const response = await apiClient.post(
		`/api/class/${classId}/quizzes/${quizId}/start`,
		{},
		{ headers: getAuthHeader() },
	);
	return response.data;
}

export async function getMySubmissions(classId, quizId) {
	const response = await apiClient.get(
		`/api/class/${classId}/quizzes/${quizId}/my-submissions`,
		{ headers: getAuthHeader() },
	);
	return response.data;
}

export async function submitAnswer(classId, quizId, submissionId, answerData) {
	const response = await apiClient.post(
		`/api/class/${classId}/quizzes/${quizId}/submissions/${submissionId}/answer`,
		answerData,
		{ headers: getAuthHeader() },
	);
	return response.data;
}

export async function submitQuiz(classId, quizId, submissionId, submitData) {
	const response = await apiClient.post(
		`/api/class/${classId}/quizzes/${quizId}/submissions/${submissionId}/submit`,
		submitData,
		{ headers: getAuthHeader() },
	);
	return response.data;
}

export async function getSubmissionDetails(classId, quizId, submissionId) {
	const response = await apiClient.get(
		`/api/class/${classId}/quizzes/${quizId}/submissions/${submissionId}`,
		{ headers: getAuthHeader() },
	);
	return response.data;
}

export async function getQuizSummary(classId, quizId) {
	const response = await apiClient.get(
		`/api/class/${classId}/quizzes/${quizId}/summary`,
		{ headers: getAuthHeader() },
	);
	return response.data;
}
