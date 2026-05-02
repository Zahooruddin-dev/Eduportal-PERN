const express = require('express');
const quizControl = require('../controllers/quizControl');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

router.use(verifyToken);

router.post('/', quizControl.createQuiz);
router.get('/', quizControl.getQuizzes);
router.get('/:quizId', quizControl.getQuizDetails);
router.put('/:quizId', quizControl.updateQuiz);
router.delete('/:quizId', quizControl.deleteQuiz);

router.post('/:quizId/questions', quizControl.addQuestion);
router.put('/:quizId/questions/:questionId', quizControl.updateQuestion);
router.delete('/:quizId/questions/:questionId', quizControl.deleteQuestion);

router.post('/:quizId/start', quizControl.startQuiz);
router.get('/:quizId/my-submissions', quizControl.getMySubmissions);
router.post('/:quizId/submissions/:submissionId/answer', quizControl.submitAnswer);
router.post('/:quizId/submissions/:submissionId/submit', quizControl.submitQuiz);
router.get('/:quizId/submissions/:submissionId', quizControl.getSubmissionDetails);
router.get('/:quizId/summary', quizControl.getQuizSummary);

module.exports = router;
