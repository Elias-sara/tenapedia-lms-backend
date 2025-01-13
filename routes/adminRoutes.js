const express = require("express");
const upload = require('../middleware/uploadMiddleware');
const {
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getAllModules,
  createModule,
  updateModule,
  deleteModule,
  getAllLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  getAllQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getAllStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  getAllInstructors,
  addInstructor,
  updateInstructor,
  deleteInstructor,
  getAdminProfile
} = require("../controllers/adminController");
const { authenticateToken, isAdmin } = require("../middleware/authMiddleware");
const router = express.Router();

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Debugging middleware to log requests
router.use((req, res, next) => {
  console.log(`Admin Route - Method: ${req.method}, URL: ${req.originalUrl}`);
  console.log('Request Body:', req.body);
  console.log('Request Files:', req.files);
  next();
});

// Apply authentication and admin check to all routes
router.use(authenticateToken, isAdmin);

// Admin Profile
router.get("/profile", asyncHandler(getAdminProfile));

// Course Management
router.get("/courses", asyncHandler(getAllCourses));
router.post("/courses", upload, asyncHandler(createCourse));
router.put("/courses/:id", upload, asyncHandler(updateCourse));
router.delete("/courses/:id", asyncHandler(deleteCourse));

// Module Management
router.get("/modules", asyncHandler(getAllModules));
router.post("/modules", upload, asyncHandler(createModule));
router.put("/modules/:id", upload, asyncHandler(updateModule));
router.delete("/modules/:id", asyncHandler(deleteModule));

// Lesson Management
router.get("/lessons", asyncHandler(getAllLessons));
router.post("/lessons", upload, asyncHandler(createLesson));
router.put("/lessons/:id", upload, asyncHandler(updateLesson));
router.delete("/lessons/:id", asyncHandler(deleteLesson));

// Quiz Management
router.get("/quizzes", asyncHandler(getAllQuizzes));
router.post("/quizzes", upload, asyncHandler(createQuiz));
router.put("/quizzes/:id", upload, asyncHandler(updateQuiz));
router.delete("/quizzes/:id", asyncHandler(deleteQuiz));

// Student Management
router.get("/students", asyncHandler(getAllStudents));
router.post("/students", upload, asyncHandler(addStudent));
router.put("/students/:id", upload, asyncHandler(updateStudent));
router.delete("/students/:id", asyncHandler(deleteStudent));

// Instructor Management
router.get("/instructors", asyncHandler(getAllInstructors));
router.post("/instructors", upload, asyncHandler(addInstructor));
router.put("/instructors/:id", upload, asyncHandler(updateInstructor));
router.delete("/instructors/:id", asyncHandler(deleteInstructor));

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Admin Route Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = router;