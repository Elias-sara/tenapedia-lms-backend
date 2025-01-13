const Lesson = require("../models/Lesson");
const Module = require("../models/Module");

// Get all lessons
exports.getAllLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find();
    res.status(200).json(lessons);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lessons" });
  }
};

// Get a lesson by ID
exports.getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }
    res.status(200).json(lesson);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lesson" });
  }
};

// Create a lesson
exports.createLesson = async (req, res) => {
  try {
    const { moduleId, title, content, videoUrl, resources, duration, order } =
      req.body;

    // Validate module existence
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    const newLesson = new Lesson({
      moduleId,
      title,
      content,
      videoUrl,
      resources,
      duration,
      order,
    });

    const savedLesson = await newLesson.save();

    // Add the lesson to the module
    module.lessons.push(savedLesson._id);
    await module.save();

    res.status(201).json(savedLesson);
  } catch (error) {
    res.status(500).json({ error: "Failed to create lesson" });
  }
};

// Update a lesson
exports.updateLesson = async (req, res) => {
  try {
    const updatedLesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedLesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }
    res.status(200).json(updatedLesson);
  } catch (error) {
    res.status(500).json({ error: "Failed to update lesson" });
  }
};

// Delete a lesson
exports.deleteLesson = async (req, res) => {
  try {
    const deletedLesson = await Lesson.findByIdAndDelete(req.params.id);
    if (!deletedLesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    // Remove the lesson from its module
    const module = await Module.findById(deletedLesson.moduleId);
    if (module) {
      module.lessons = module.lessons.filter(
        (lessonId) => lessonId.toString() !== deletedLesson._id.toString()
      );
      await module.save();
    }

    res.status(200).json({ message: "Lesson deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete lesson" });
  }
};
