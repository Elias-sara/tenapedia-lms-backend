const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, isAdmin } = require('../../middleware/authMiddleware');
const Course = require('../../models/Course');
const Module = require('../../models/Module');
const Lesson = require('../../models/Lesson');
const Quiz = require('../../models/Quiz');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware to check admin role
router.use(authenticateToken, isAdmin);

// Course CRUD Operations
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find()
      .populate({
        path: 'modules',
        populate: {
          path: 'lessons quizzes'
        }
      });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', upload.fields([
  { name: 'courseImage', maxCount: 1 },
  { name: 'instructorImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const courseData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      instructorName: req.body.instructorName,
      instructorBio: req.body.instructorBio,
      modules: JSON.parse(req.body.modules || '[]')
    };

    if (req.files) {
      if (req.files.courseImage) {
        courseData.image = req.files.courseImage[0].path;
      }
      if (req.files.instructorImage) {
        courseData.instructorImage = req.files.instructorImage[0].path;
      }
    }

    const course = new Course(courseData);
    const savedCourse = await course.save();

    // Create modules, lessons, and quizzes
    const modules = JSON.parse(req.body.modules || '[]');
    for (const moduleData of modules) {
      const module = new Module({
        title: moduleData.title,
        description: moduleData.description,
        course: savedCourse._id,
        order: moduleData.order
      });
      const savedModule = await module.save();

      // Create lessons
      for (const lessonData of moduleData.lessons) {
        const lesson = new Lesson({
          title: lessonData.title,
          content: lessonData.content,
          description: lessonData.description,
          videoUrl: lessonData.videoUrl,
          videoTitle: lessonData.videoTitle,
          duration: lessonData.duration,
          order: lessonData.order,
          module: savedModule._id
        });
        await lesson.save();
      }

      // Create quizzes
      for (const quizData of moduleData.quizzes) {
        const quiz = new Quiz({
          title: quizData.title,
          description: quizData.description,
          passingScore: quizData.passingScore,
          questions: quizData.questions,
          module: savedModule._id
        });
        await quiz.save();
      }

      // Update course with module reference
      await Course.findByIdAndUpdate(savedCourse._id, {
        $push: { modules: savedModule._id }
      });
    }

    res.status(201).json(savedCourse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', upload.fields([
  { name: 'courseImage', maxCount: 1 },
  { name: 'instructorImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const courseData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      instructorName: req.body.instructorName,
      instructorBio: req.body.instructorBio
    };

    if (req.files) {
      if (req.files.courseImage) {
        courseData.image = req.files.courseImage[0].path;
      }
      if (req.files.instructorImage) {
        courseData.instructorImage = req.files.instructorImage[0].path;
      }
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      courseData,
      { new: true }
    );

    // Update modules if provided
    if (req.body.modules) {
      const modules = JSON.parse(req.body.modules);
      for (const moduleData of modules) {
        if (moduleData._id) {
          // Update existing module
          await Module.findByIdAndUpdate(moduleData._id, {
            title: moduleData.title,
            description: moduleData.description,
            order: moduleData.order
          });
        } else {
          // Create new module
          const module = new Module({
            title: moduleData.title,
            description: moduleData.description,
            course: course._id,
            order: moduleData.order
          });
          const savedModule = await module.save();
          await Course.findByIdAndUpdate(course._id, {
            $push: { modules: savedModule._id }
          });
        }
      }
    }

    res.json(course);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Delete all associated modules, lessons, and quizzes
    for (const moduleId of course.modules) {
      const module = await Module.findById(moduleId);
      if (module) {
        // Delete lessons
        await Lesson.deleteMany({ module: moduleId });
        // Delete quizzes
        await Quiz.deleteMany({ module: moduleId });
        // Delete module
        await Module.findByIdAndDelete(moduleId);
      }
    }

    // Delete course
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course and all associated content deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
