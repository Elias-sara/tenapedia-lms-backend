const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { completeLesson, getCourseProgress, completeModule } = require('../controllers/progressController');

// Protected routes - require authentication
router.use(authenticateToken);

// Mark lesson as completed
router.post('/lesson/:lessonId/complete', completeLesson);

// Mark module as completed
router.post('/module/:moduleId/complete', completeModule);

// Get course progress
router.get('/course/:courseId', getCourseProgress);

module.exports = router;
