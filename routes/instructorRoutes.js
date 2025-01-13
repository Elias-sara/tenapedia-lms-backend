const express = require("express");
const { 
  createCourse, 
  getCourses, 
  createModule, 
  getModules, 
  createLesson, 
  getLessons, 
  createQuiz, 
  getQuizzes 
} = require("../controllers/instructorController");
const { authenticateToken } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Course Routes
router.post("/course", authenticateToken, roleMiddleware(["instructor"]), createCourse);
router.get("/courses", authenticateToken, roleMiddleware(["instructor"]), getCourses);

// Module Routes
router.post("/module", authenticateToken, roleMiddleware(["instructor"]), createModule);
router.get("/modules", authenticateToken, roleMiddleware(["instructor"]), getModules);

// Lesson Routes
router.post("/lesson", authenticateToken, roleMiddleware(["instructor"]), createLesson);
router.get("/lessons", authenticateToken, roleMiddleware(["instructor"]), getLessons);

// Quiz Routes
router.post("/quiz", authenticateToken, roleMiddleware(["instructor"]), createQuiz);
router.get("/quizzes", authenticateToken, roleMiddleware(["instructor"]), getQuizzes);

module.exports = router;
