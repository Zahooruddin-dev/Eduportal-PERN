const express = require('express');
const calendarController = require('../controllers/calendarControl');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/public/:token.ics', calendarController.getPublicCalendarIcs);

router.use(verifyToken);

router.get('/my/events', calendarController.getMyCalendarEvents);
router.get('/my.ics', calendarController.getMyCalendarIcs);
router.get('/my/subscription', calendarController.getMyCalendarSubscription);
router.post('/my/subscription', calendarController.createMyCalendarSubscription);
router.post('/my/subscription/rotate', calendarController.rotateMyCalendarSubscription);

module.exports = router;
