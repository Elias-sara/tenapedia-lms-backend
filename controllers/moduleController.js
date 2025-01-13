// controllers/moduleController.js
const Module = require("../models/Module");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");

// Get all modules
exports.getAllModules = async (req, res) => {
  try {
    const modules = await Module.find().populate("lessons quizzes");
    res.status(200).json(modules);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch modules" });
  }
};

// Get a module by ID
exports.getModuleById = async (req, res) => {
  try {
    const module = await Module.findById(req.params.id).populate(
      "lessons quizzes"
    );
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }
    res.status(200).json(module);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch module" });
  }
};

// Create a module
exports.createModule = async (req, res) => {
  try {
    const { courseId, title, description } = req.body;

    // Validate course existence
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const newModule = new Module({
      courseId,
      title,
      description,
    });

    const savedModule = await newModule.save();

    // Add the module to the course
    course.modules.push(savedModule._id);
    await course.save();

    res.status(201).json(savedModule);
  } catch (error) {
    res.status(500).json({ error: "Failed to create module" });
  }
};

// Update a module
exports.updateModule = async (req, res) => {
  try {
    const updatedModule = await Module.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedModule) {
      return res.status(404).json({ error: "Module not found" });
    }
    res.status(200).json(updatedModule);
  } catch (error) {
    res.status(500).json({ error: "Failed to update module" });
  }
};

// Delete a module
exports.deleteModule = async (req, res) => {
  try {
    const deletedModule = await Module.findByIdAndDelete(req.params.id);
    if (!deletedModule) {
      return res.status(404).json({ error: "Module not found" });
    }

    // Remove the module from its course
    const course = await Course.findById(deletedModule.courseId);
    if (course) {
      course.modules = course.modules.filter(
        (moduleId) => moduleId.toString() !== deletedModule._id.toString()
      );
      await course.save();
    }

    res.status(200).json({ message: "Module deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete module" });
  }
};

// Controller to get lessons by moduleId
exports.getLessonsByModuleId = async (req, res) => {
  const { moduleId } = req.params; // Extract moduleId from the request parameters

  try {
    // Find lessons by the moduleId in the database
    const lessons = await Lesson.find({ moduleId });

    // If no lessons are found, return a 404 response
    if (!lessons || lessons.length === 0) {
      return res
        .status(404)
        .json({ message: "Lessons not found for this module" });
    }

    // Send the lessons as the response
    res.json(lessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
