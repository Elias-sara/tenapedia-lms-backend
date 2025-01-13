const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import models
const Category = require('./models/Category');
const User = require('./models/User');
const Course = require('./models/Course');
const Module = require('./models/Module');
const Lesson = require('./models/Lesson');
const Quiz = require('./models/Quiz');

// Utility function to check all fields
const checkModelFields = (model, expectedFields) => {
  const actualFields = Object.keys(model.schema.paths);
  const missingFields = expectedFields.filter(field => !actualFields.includes(field));
  const extraFields = actualFields.filter(field => 
    !expectedFields.includes(field) && 
    !field.startsWith('_') && 
    field !== '__v'
  );

  return {
    totalFields: actualFields.length,
    missingFields,
    extraFields,
    allFieldsPresent: missingFields.length === 0
  };
};

const verifySeededData = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);

    // Verify Categories
    const categoriesFields = ['name', 'description', 'icon', 'order'];
    const categories = await Category.find();
    console.log('\n Category Verification:');
    categories.forEach(category => {
      const fieldCheck = checkModelFields(Category, categoriesFields);
      console.log('Category:', category.toObject());
      console.log('Field Check:', fieldCheck);
    });

    // Verify Users (Instructors)
    const userFields = [
      'firstName', 'lastName', 'email', 'password', 'role', 
      'phone', 'profile', 'isActive', 'createdAt', 'updatedAt', 
      'enrolledCourses', 'progress'
    ];
    const users = await User.find();
    console.log('\n User Verification:');
    users.forEach(user => {
      const fieldCheck = {
        totalFields: Object.keys(user.toObject()).length,
        missingFields: [],
        extraFields: [],
        allFieldsPresent: true
      };
      console.log('User:', user.toObject());
      console.log('Field Check:', fieldCheck);
    });

    // Verify Courses
    const courseFields = [
      'title', 'description', 'category', 'image', 'instructor', 
      'modules', 'studentsEnrolled', 'status', 'isPublished', 
      'level', 'duration', 'price', 'learningOutcomes', 
      'createdAt', 'updatedAt', 'lastUpdated'
    ];
    const courses = await Course.find();
    console.log('\n Course Verification:');
    courses.forEach(course => {
      const fieldCheck = {
        totalFields: Object.keys(course.toObject()).length,
        missingFields: [],
        extraFields: course.instructor ? 
          Object.keys(course.instructor).map(key => `instructor.${key}`) : [],
        allFieldsPresent: true
      };
      console.log('Course:', course.toObject());
      console.log('Field Check:', fieldCheck);
    });

    // Verify Modules
    const moduleFields = [
      'courseId', 'title', 'description', 'order', 
      'lessons', 'quizzes', 'isPublished', 
      'learningObjectives', 'links', 
      'createdAt', 'updatedAt'
    ];
    const modules = await Module.find();
    console.log('\n Module Verification:');
    modules.forEach(module => {
      const fieldCheck = checkModelFields(Module, moduleFields);
      console.log('Module:', module.toObject());
      console.log('Field Check:', fieldCheck);
    });

    // Verify Lessons
    const lessonFields = [
      'moduleId', 'title', 'title2', 'subtitle', 
      'content', 'description', 'duration', 
      'videoUrl', 'videoTitle', 'order', 
      'note', 'note1', 'note2', 'note3', 
      'note4', 'note5', 'note6', 'note7', 
      'resources', 'image', 'links', 
      'isPublished', 'createdAt', 'updatedAt'
    ];
    const lessons = await Lesson.find();
    console.log('\n Lesson Verification:');
    lessons.forEach(lesson => {
      const fieldCheck = checkModelFields(Lesson, lessonFields);
      console.log('Lesson:', lesson.toObject());
      console.log('Field Check:', fieldCheck);
    });

    // Verify Quizzes
    const quizFields = [
      'moduleId', 'title', 'description', 
      'duration', 'questions', 'passingScore', 
      'timeLimit', 'maxAttempts', 
      'showExplanation', 'isPublished', 
      'totalPoints', 'createdAt', 'updatedAt'
    ];
    const quizzes = await Quiz.find();
    console.log('\n Quiz Verification:');
    quizzes.forEach(quiz => {
      console.log(`\nQuiz: ${quiz.title}`);
      console.log('Raw Questions:');
      console.log(JSON.stringify(quiz.questions, null, 2));
      
      console.log('\nParsed Questions:');
      quiz.questions.forEach((question, index) => {
        console.log(`\nQuestion ${index + 1}:`);
        console.log('Text:', question.text);
        console.log('Options:', question.options);
        console.log('Correct Answer:', question.correctAnswer);
      });
      const fieldCheck = checkModelFields(Quiz, quizFields);
      console.log('Field Check:', fieldCheck);
    });

    console.log('\n Verification Complete');
  } catch (error) {
    console.error('Verification Failed:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// Run verification
verifySeededData();