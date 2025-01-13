const express = require("express");
const router = express.Router();
const {
  getAllQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizzesByModule,
  submitQuiz,
} = require("../controllers/quizController");
const { authenticateToken } = require("../middleware/authMiddleware");

// Public Routes
router.get("/", getAllQuizzes);
router.get("/:id", getQuizById);
router.get("/module/:moduleId", getQuizzesByModule);

// Protected Routes
router.post("/:quizId/submit", authenticateToken, submitQuiz);

// Admin/Instructor Routes
router.post("/", createQuiz); // Admin/Instructors only
router.put("/:id", updateQuiz); // Admin/Instructors only
router.delete("/:id", deleteQuiz); // Admin/Instructors only

module.exports = router;
