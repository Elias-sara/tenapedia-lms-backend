const express = require("express");
const router = express.Router();
const {
  getAllLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
} = require("../controllers/lessonController");

// Public Routes
router.get("/", getAllLessons);
router.get("/:id", getLessonById);

// Admin/Instructor Routes
router.post("/", createLesson); // Admin/Instructors only
router.put("/:id", updateLesson); // Admin/Instructors only
router.delete("/:id", deleteLesson); // Admin/Instructors only

module.exports = router;
