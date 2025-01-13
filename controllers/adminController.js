const Course = require("../models/Course");
const Module = require("../models/Module");
const Lesson = require("../models/Lesson");
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const { validationResult } = require('express-validator');
const sharp = require('sharp');

// Utility function for error handling
const handleError = (res, error, message) => {
  console.error(error);
  res.status(500).json({ message, error: error.message });
};

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({}).populate("modules");
    if (!courses || courses.length === 0) {
      return res.status(404).json({ message: "No courses found" });
    }
    res.json(courses);
  } catch (error) {
    handleError(res, error, "Error fetching courses");
  }
};

// Course creation controller
exports.createCourse = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    const { title, description, category, instructorName, instructorBio, modules } = req.body;
    
    // Get file paths if they exist
    const courseImage = req.files?.courseImage?.[0]?.path;
    const instructorImage = req.files?.instructorImage?.[0]?.path;

    // Parse modules if it's a string
    let parsedModules = modules;
    if (typeof modules === 'string') {
      try {
        parsedModules = JSON.parse(modules);
      } catch (error) {
        console.error('Error parsing modules:', error);
        return res.status(400).json({ message: 'Invalid modules data format' });
      }
    }

    // Validate required fields
    if (!title || !description || !instructorName) {
      return res.status(400).json({ message: 'Title, description, and instructor name are required' });
    }

    // Check for existing course with same title
    const existingCourse = await Course.findOne({ title });
    if (existingCourse) {
      return res.status(400).json({ message: 'A course with this title already exists. Please choose a different title.' });
    }

    // Create course
    const newCourse = new Course({
      title,
      description,
      category,
      instructor: {
        name: instructorName,
        bio: instructorBio,
        image: instructorImage
      },
      image: courseImage,
      modules: [], // Initialize empty modules array
      status: 'draft' // Start as draft
    });

    // Save course first
    const savedCourse = await newCourse.save();
    console.log('Saved course ID:', savedCourse._id);

    // Create and link modules if they exist
    if (parsedModules && Array.isArray(parsedModules)) {
      for (const moduleData of parsedModules) {
        try {
          // Create the module first
          const newModule = new Module({
            courseId: savedCourse._id,
            title: moduleData.title,
            description: moduleData.description,
            lessons: [], // Initialize empty lessons array
            quizzes: [] // Initialize empty quizzes array
          });

          // Save the module
          const savedModule = await newModule.save();
          
          // Create and save lessons if they exist
          if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
            for (const lessonData of moduleData.lessons) {
              const newLesson = new Lesson({
                moduleId: savedModule._id,
                title: lessonData.title,
                content: lessonData.content || '',
                description: lessonData.description || '',
                videoUrl: lessonData.videoUrl || '',
                videoTitle: lessonData.videoTitle || '',
                duration: lessonData.duration || 30,
                order: lessonData.order || 0,
                image: lessonData.image || null,
                note: lessonData.note || '',
                note1: lessonData.note1 || '',
                note2: lessonData.note2 || '',
                note3: lessonData.note3 || '',
                note4: lessonData.note4 || '',
                note5: lessonData.note5 || '',
                note6: lessonData.note6 || '',
                note7: lessonData.note7 || '',
                links: lessonData.links || '',
                resources: lessonData.resources || []
              });

              const savedLesson = await newLesson.save();
              savedModule.lessons.push(savedLesson._id);
            }
          }

          // Create and save quizzes if they exist
          if (moduleData.quizzes && Array.isArray(moduleData.quizzes)) {
            for (const quizData of moduleData.quizzes) {
              const newQuiz = new Quiz({
                moduleId: savedModule._id,
                title: quizData.title,
                description: quizData.description,
                duration: quizData.duration || 30,
                passingScore: quizData.passingScore || 70,
                questions: quizData.questions.map(q => ({
                  question: q.question,
                  options: q.options,
                  correctAnswer: q.correctAnswer,
                  explanation: q.explanation
                }))
              });

              const savedQuiz = await newQuiz.save();
              savedModule.quizzes.push(savedQuiz._id);
            }
          }

          // Save module with updated references
          await savedModule.save();
          savedCourse.modules.push(savedModule._id);
        } catch (error) {
          console.error('Module creation error:', error);
          // Delete the course and all its modules/lessons/quizzes if module creation fails
          await Course.findByIdAndDelete(savedCourse._id);
          throw new Error(`Failed to create module: ${error.message}`);
        }
      }

      // Save course with all module references
      await savedCourse.save();
    }

    // Return the saved course
    res.status(201).json({
      message: "Course created successfully",
      courseId: savedCourse._id,
      title: savedCourse.title
    });
  } catch (error) {
    console.error('Course creation error:', error);
    // If error is duplicate key error, return a more friendly message
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'A course with this title already exists. Please choose a different title.' 
      });
    }
    // For other errors
    res.status(500).json({ 
      message: "Error creating course", 
      error: error.message 
    });
  }
};

// Update course
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, instructorName, instructorBio } = req.body;
    const courseImage = req.file ? req.file.path : null;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    course.title = title || course.title;
    course.description = description || course.description;
    course.category = category || course.category;
    if (instructorName) course.instructor.name = instructorName;
    if (instructorBio) course.instructor.bio = instructorBio;
    if (courseImage) course.image = courseImage;

    const updatedCourse = await course.save();
    res.status(200).json({ 
      message: "Course updated successfully", 
      course: updatedCourse 
    });
  } catch (error) {
    handleError(res, error, "Failed to update course");
  }
};

// Delete course
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    await Module.deleteMany({ _id: { $in: course.modules } });
    await course.deleteOne();
    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    handleError(res, error, "Failed to delete course");
  }
};

// Get all modules
exports.getAllModules = async (req, res) => {
  try {
    const modules = await Module.find({}).populate('courseId');
    res.json(modules);
  } catch (error) {
    handleError(res, error, "Error fetching modules");
  }
};

// Create module
exports.createModule = async (req, res) => {
  try {
    const { title, description, courseId } = req.body;
    
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const newModule = new Module({
      courseId,
      title,
      description,
    });

    const savedModule = await newModule.save();
    course.modules.push(savedModule._id);
    await course.save();

    res.status(201).json({
      message: "Module created successfully",
      module: savedModule
    });
  } catch (error) {
    handleError(res, error, "Error creating module");
  }
};

// Update module
exports.updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const updatedModule = await Module.findByIdAndUpdate(
      id,
      { title, description },
      { new: true }
    );

    if (!updatedModule) {
      return res.status(404).json({ message: "Module not found" });
    }

    res.json({
      message: "Module updated successfully",
      module: updatedModule
    });
  } catch (error) {
    handleError(res, error, "Error updating module");
  }
};

// Delete module
exports.deleteModule = async (req, res) => {
  try {
    const { id } = req.params;
    const module = await Module.findById(id);
    
    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    await Course.updateOne(
      { modules: id },
      { $pull: { modules: id } }
    );

    await module.deleteOne();
    res.status(200).json({ message: "Module deleted successfully" });
  } catch (error) {
    handleError(res, error, "Error deleting module");
  }
};

// Get all lessons
exports.getAllLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find({}).populate('moduleId');
    res.json(lessons);
  } catch (error) {
    handleError(res, error, "Error fetching lessons");
  }
};

// Create lesson
exports.createLesson = async (req, res) => {
  try {
    const { title, content, moduleId } = req.body;
    
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    const newLesson = new Lesson({
      moduleId,
      title,
      content,
    });

    const savedLesson = await newLesson.save();
    res.status(201).json({
      message: "Lesson created successfully",
      lesson: savedLesson
    });
  } catch (error) {
    handleError(res, error, "Error creating lesson");
  }
};

// Update lesson
exports.updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const updatedLesson = await Lesson.findByIdAndUpdate(
      id,
      { title, content },
      { new: true }
    );

    if (!updatedLesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    res.json({
      message: "Lesson updated successfully",
      lesson: updatedLesson
    });
  } catch (error) {
    handleError(res, error, "Error updating lesson");
  }
};

// Delete lesson
exports.deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const lesson = await Lesson.findById(id);
    
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    await lesson.deleteOne();
    res.status(200).json({ message: "Lesson deleted successfully" });
  } catch (error) {
    handleError(res, error, "Error deleting lesson");
  }
};

// Get all quizzes
exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({}).populate('moduleId');
    res.json(quizzes);
  } catch (error) {
    handleError(res, error, "Error fetching quizzes");
  }
};

// Create quiz
exports.createQuiz = async (req, res) => {
  try {
    const { title, questions, moduleId } = req.body;
    
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    const newQuiz = new Quiz({
      moduleId,
      title,
      questions,
    });

    const savedQuiz = await newQuiz.save();
    res.status(201).json({
      message: "Quiz created successfully",
      quiz: savedQuiz
    });
  } catch (error) {
    handleError(res, error, "Error creating quiz");
  }
};

// Update quiz
exports.updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, questions } = req.body;

    const updatedQuiz = await Quiz.findByIdAndUpdate(
      id,
      { title, questions },
      { new: true }
    );

    if (!updatedQuiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.json({
      message: "Quiz updated successfully",
      quiz: updatedQuiz
    });
  } catch (error) {
    handleError(res, error, "Error updating quiz");
  }
};

// Delete quiz
exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    await quiz.deleteOne();
    res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (error) {
    handleError(res, error, "Error deleting quiz");
  }
};

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student" });
    res.json(students);
  } catch (error) {
    handleError(res, error, "Error fetching students");
  }
};

// Add student
exports.addStudent = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const newStudent = new User({
      name,
      email,
      password,
      role: "student",
    });

    const savedStudent = await newStudent.save();
    res.status(201).json({
      message: "Student added successfully",
      student: savedStudent
    });
  } catch (error) {
    handleError(res, error, "Error adding student");
  }
};

// Update student
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    const updatedStudent = await User.findByIdAndUpdate(
      id,
      { name, email, password },
      { new: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({
      message: "Student updated successfully",
      student: updatedStudent
    });
  } catch (error) {
    handleError(res, error, "Error updating student");
  }
};

// Delete student
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await User.findById(id);
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await student.deleteOne();
    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    handleError(res, error, "Error deleting student");
  }
};

// Get all instructors
exports.getAllInstructors = async (req, res) => {
  try {
    const instructors = await User.find({ role: "instructor" });
    res.json(instructors);
  } catch (error) {
    handleError(res, error, "Error fetching instructors");
  }
};

// Add instructor
exports.addInstructor = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const newInstructor = new User({
      name,
      email,
      password,
      role: "instructor",
    });

    const savedInstructor = await newInstructor.save();
    res.status(201).json({
      message: "Instructor added successfully",
      instructor: savedInstructor
    });
  } catch (error) {
    handleError(res, error, "Error adding instructor");
  }
};

// Update instructor
exports.updateInstructor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    const updatedInstructor = await User.findByIdAndUpdate(
      id,
      { name, email, password },
      { new: true }
    );

    if (!updatedInstructor) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    res.json({
      message: "Instructor updated successfully",
      instructor: updatedInstructor
    });
  } catch (error) {
    handleError(res, error, "Error updating instructor");
  }
};

// Delete instructor
exports.deleteInstructor = async (req, res) => {
  try {
    const { id } = req.params;
    const instructor = await User.findById(id);
    
    if (!instructor) {
      return res.status(404).json({ message: "Instructor not found" });
    }

    await instructor.deleteOne();
    res.status(200).json({ message: "Instructor deleted successfully" });
  } catch (error) {
    handleError(res, error, "Error deleting instructor");
  }
};

// Get admin profile
exports.getAdminProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const admin = await User.findById(userId)
      .select('-password')
      .lean();

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    res.status(200).json(admin);
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({ 
      message: "Error fetching admin profile", 
      error: error.message 
    });
  }
};