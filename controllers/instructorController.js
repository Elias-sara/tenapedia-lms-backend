const { body, validationResult } = require('express-validator');
const Course = require("../models/Course");
const Module = require("../models/Module");
const Lesson = require("../models/Lesson");
const Quiz = require("../models/Quiz");
const mongoose = require("mongoose");

// Validation middleware for course creation
const validateCourse = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('image').notEmpty().withMessage('Image URL is required'),
];

// Create Course
exports.createCourse = [
  validateCourse,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, image } = req.body;
    const newCourse = new Course({
      title,
      description,
      category,
      image,
      instructor: req.user._id,
    });

    try {
      const course = await newCourse.save();
      res.status(201).json(course);
    } catch (error) {
      res.status(400).json({ message: "Error creating course", error: error.message });
    }
  }
];

// Get Courses with Pagination and Sorting
exports.getCourses = async (req, res) => {
  const { page = 1, limit = 10, sort = 'title' } = req.query;
  try {
    const courses = await Course.find({ instructor: req.user._id })
      .populate("modules", "title description")
      .sort({ [sort]: 1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: "Error fetching courses", error: error.message });
  }
};

// Create Module
exports.createModule = async (req, res) => {
  const { title, description, courseId } = req.body;
  const newModule = new Module({
    courseId,
    title,
    description,
  });

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const module = await newModule.save({ session });
    await Course.findByIdAndUpdate(courseId, { $push: { modules: module._id } }, { session });
    await session.commitTransaction();
    res.status(201).json(module);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: "Error creating module", error: error.message });
  } finally {
    session.endSession();
  }
};

// Get Modules
exports.getModules = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  try {
    const modules = await Module.find({})
      .skip((page - 1) * limit)
      .limit(limit);
    res.json(modules);
  } catch (error) {
    res.status(500).json({ message: "Error fetching modules", error: error.message });
  }
};

// Create Lesson
exports.createLesson = async (req, res) => {
  const { title, content, moduleId } = req.body;
  const newLesson = new Lesson({
    moduleId,
    title,
    content,
  });

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const lesson = await newLesson.save({ session });
    await Module.findByIdAndUpdate(moduleId, { $push: { lessons: lesson._id } }, { session });
    await session.commitTransaction();
    res.status(201).json(lesson);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: "Error creating lesson", error: error.message });
  } finally {
    session.endSession();
  }
};

// Get Lessons
exports.getLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find({}).populate("moduleId", "title description");
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ message: "Error fetching lessons", error: error.message });
  }
};

// Create Quiz
exports.createQuiz = async (req, res) => {
  const { title, questions, moduleId } = req.body;
  const newQuiz = new Quiz({
    moduleId,
    title,
    questions,
  });

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const quiz = await newQuiz.save({ session });
    await Module.findByIdAndUpdate(moduleId, { $push: { quizzes: quiz._id } }, { session });
    await session.commitTransaction();
    res.status(201).json(quiz);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: "Error creating quiz", error: error.message });
  } finally {
    session.endSession();
  }
};

// Get Quizzes
exports.getQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({}).populate("moduleId", "title description");
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching quizzes", error: error.message });
  }
};
