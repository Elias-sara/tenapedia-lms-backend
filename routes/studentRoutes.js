const express = require("express");
const studentController = require("../controllers/studentController");
const { authenticateToken } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const router = express.Router();

// Protected routes (require authentication)
router.use(authenticateToken);
router.use(roleMiddleware(['student']));

// Profile routes
router.get('/profile', studentController.getStudentProfile);
router.put('/profile', studentController.updateStudentProfile);

// Course enrollment and progress routes
router.get('/courses', studentController.getEnrolledCourses);
router.post('/enroll/:courseId', studentController.enrollInCourse);
router.get('/courses/:courseId', studentController.getCourseDetails);
router.get('/courses/:courseId/navigation', studentController.getCourseNavigation);

// Lesson routes
router.get('/lessons/:lessonId', studentController.getLessonDetails);
router.post('/progress/lesson', studentController.updateLessonProgress);

// Quiz routes
router.post('/quiz/submit', studentController.submitQuiz);

// Progress and stats routes
router.get('/progress', studentController.getStudentProgress);
router.get('/activities', studentController.getActivities);
router.get('/deadlines', studentController.getDeadlines);
router.get('/stats', studentController.getStats);

module.exports = router;
