const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const moduleController = require("../controllers/moduleController");

// Public routes
router.get("/", moduleController.getAllModules);
router.get("/:id", moduleController.getModuleById);
router.get("/:moduleId/lessons", moduleController.getLessonsByModuleId);

// Protected routes (requires authentication)
router.post("/", authenticateToken, moduleController.createModule);
router.put("/:id", authenticateToken, moduleController.updateModule);
router.delete("/:id", authenticateToken, moduleController.deleteModule);

module.exports = router;