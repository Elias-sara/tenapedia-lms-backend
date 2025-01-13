const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const yaml = require('js-yaml');

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import models
const Course = require('./models/Course');
const Module = require('./models/Module');
const Lesson = require('./models/Lesson');
const Quiz = require('./models/Quiz');
const User = require('./models/User');
const Category = require('./models/Category');
const Enrollment = require('./models/Enrollment');

// Utility function for logging
const logger = {
  info: (message) => console.log(`[SEED INFO] ${message}`),
  error: (message, error) => console.error(`[SEED ERROR] ${message}`, error)
};

// Utility function to safely parse JSON or return default
const safeParseJSON = (jsonString, defaultValue = []) => {
  console.log('Parsing JSON:', jsonString);
  console.log('Type of input:', typeof jsonString);

  if (!jsonString) return defaultValue;
  
  // Handle '|||' separated questions or links from Excel
  if (typeof jsonString === 'string' && jsonString.includes('|||')) {
    return jsonString.split('|||').map(itemStr => {
      try {
        // Try to parse each item segment as JSON
        const itemObj = JSON.parse(itemStr);
        return itemObj;
      } catch (error) {
        // Fallback parsing for complex strings
        const extractValue = (key) => {
          const regex = new RegExp(`["']?${key}["']?\\s*:\\s*["']?([^,"'}]+)["']?`);
          const match = itemStr.match(regex);
          return match ? match[1].trim() : null;
        };

        // Detect if this is a question or a link
        if (extractValue('type') || extractValue('question')) {
          // Question parsing
          return {
            type: extractValue('type') || 'multiple-choice',
            text: extractValue('text') || extractValue('question') || itemStr,
            options: [{ 
              text: 'Option A', 
              isCorrect: extractValue('isCorrect') === 'true' 
            }],
            correctAnswer: extractValue('correctAnswer') || 'Option A',
            points: parseInt(extractValue('points'), 10) || 1,
            explanation: extractValue('explanation') || 'No explanation provided.'
          };
        } else {
          // Link parsing
          return {
            title: extractValue('title') || extractValue('name') || 'Untitled Resource',
            url: extractValue('url') || extractValue('link') || 'https://example.com/resource'
          };
        }
      }
    });
  }
  
  // Existing JSON parsing logic
  try {
    const parsed = JSON.parse(jsonString);
    console.log('Parsed JSON:', parsed);
    console.log('Type of parsed:', typeof parsed);
    return parsed;
  } catch (error) {
    console.log('JSON parsing error:', error);
    
    // If JSON parsing fails, try to parse as semicolon-separated URLs or an object-like string
    try {
      // Check if it's a semicolon-separated list of URLs
      if (jsonString.includes(';') && jsonString.match(/^https?:\/\//)) {
        return jsonString.split(';').map(url => {
          const cleanUrl = url.trim();
          return {
            title: cleanUrl.split('/').pop() || 'Resource',
            url: cleanUrl
          };
        });
      }
      
      // Remove extra quotes and braces, then parse
      const cleanedString = jsonString
        .replace(/^["'{]+|["}]+$/g, '')  // Remove leading/trailing quotes and braces
        .replace(/\\"/g, '"');  // Unescape quotes
      
      console.log('Cleaned string:', cleanedString);
      
      // Aggressive parsing strategy with multiple regex patterns
      const extractValue = (key, fallbackRegex = null) => {
        const primaryRegex = new RegExp(`["']?${key}["']?\\s*:\\s*["']?([^,"'}]+)["']?`);
        const fallbackPattern = fallbackRegex || new RegExp(`${key}\\s*["']?([^,"'}]+)["']?`);
        
        const primaryMatch = cleanedString.match(primaryRegex);
        const fallbackMatch = cleanedString.match(fallbackPattern);
        
        return (primaryMatch ? primaryMatch[1] : 
               (fallbackMatch ? fallbackMatch[1] : null))?.trim();
      };

      // Extract specific fields with multiple fallback strategies
      const text = extractValue('text', /question\s*["']?([^,"'}]+)["']?/) || 
                   extractValue('question') || 
                   cleanedString;
      
      const type = extractValue('type') || 'multiple-choice';
      const isCorrect = extractValue('isCorrect') === 'true';
      const correctAnswer = extractValue('correctAnswer') || text;
      const points = parseInt(extractValue('points'), 10) || 1;
      const explanation = extractValue('explanation') || 'No explanation provided.';
      
      // Handle options with multiple strategies
      let options = [];
      const optionsMatch = cleanedString.match(/options\s*:\s*\[([^\]]+)\]/i);
      if (optionsMatch) {
        const optionsStr = optionsMatch[1];
        const optionTexts = optionsStr.match(/["']text["']?\s*:\s*["']([^"']+)["']/g) || [];
        options = optionTexts.map(opt => {
          const optText = opt.match(/["']text["']?\s*:\s*["']([^"']+)["']/)[1];
          return { 
            text: optText, 
            isCorrect: isCorrect || true 
          };
        });
      }

      // Fallback if no options found
      if (options.length === 0) {
        options = [{ 
          text: 'Option A', 
          isCorrect: true 
        }];
      }
      
      return {
        type,
        text,
        options,
        correctAnswer: correctAnswer || 'Option A',
        points,
        explanation
      };
    } catch (parseError) {
      console.warn(`Failed to parse JSON-like string: ${jsonString}`, parseError);
      return { 
        type: 'multiple-choice',
        text: jsonString, 
        options: [{ text: 'Option A', isCorrect: true }],
        correctAnswer: 'Option A',
        points: 1,
        explanation: 'No explanation provided.'
      };
    }
  }
};

// Utility function to extract URL from various formats
const extractURL = (input) => {
  // If input is already a valid URL, return it
  const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  
  // If input is a string URL
  if (typeof input === 'string' && urlRegex.test(input)) {
    return input.startsWith('http') ? input : `https://${input}`;
  }
  
  // If input is an object
  if (typeof input === 'object' && input !== null) {
    // Check for common URL keys
    const urlKeys = ['url', 'link', 'href'];
    for (let key of urlKeys) {
      if (input[key] && urlRegex.test(input[key])) {
        return input[key].startsWith('http') ? input[key] : `https://${input[key]}`;
      }
    }
    
    // If no URL found, use a default example URL with the title
    return input.title ? 
      `https://example.com/${input.title.toLowerCase().replace(/\s+/g, '-')}` : 
      'https://example.com/resource';
  }
  
  // Fallback to a generic example URL
  return 'https://example.com/resource';
};

// Load seed configuration from YAML
const loadSeedConfig = () => {
  try {
    const configPath = path.resolve(__dirname, 'seed-config.yml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const seedConfig = yaml.load(fileContents);
    
    logger.info('Seed configuration loaded successfully');
    return seedConfig;
  } catch (error) {
    logger.error('Error loading seed configuration:', error);
    return null;
  }
};

// Validate critical environment variables
const validateEnvironment = () => {
  const requiredEnvVars = ['MONGO_URI'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

// Clear existing data before seeding
const clearDatabase = async () => {
  try {
    logger.info('🗑️ Clearing existing database collections...');
    
    // Clear collections in a specific order to handle potential foreign key constraints
    await Quiz.deleteMany({});
    logger.info('Cleared Quizzes');
    
    await Lesson.deleteMany({});
    logger.info('Cleared Lessons');
    
    await Module.deleteMany({});
    logger.info('Cleared Modules');
    
    await Course.deleteMany({});
    logger.info('Cleared Courses');
    
    await User.deleteMany({});
    logger.info('Cleared Users');
    
    await Category.deleteMany({});
    logger.info('Cleared Categories');

    logger.info('🧹 Database cleared successfully!');
  } catch (error) {
    logger.error('Error clearing database:', error);
    throw error;
  }
};

// Seed database using configuration
const seedDatabase = async () => {
  const seedConfig = loadSeedConfig();
  if (!seedConfig) {
    logger.error('Cannot proceed with seeding: Configuration not loaded');
    return;
  }

  try {
    // Seed Category
    const category = await Category.findOneAndUpdate(
      { name: seedConfig.category.name },
      seedConfig.category,
      { upsert: true, new: true, runValidators: true }
    );
    if (!category) {
      logger.error('Failed to seed Category');
      throw new Error('Category seeding failed');
    }
    logger.info(`Seeded Category: ${category.name}`);

    // Seed Instructor/User
    const hashedPassword = await bcrypt.hash(seedConfig.instructor.password, 10);
    const instructor = await User.findOneAndUpdate(
      { email: seedConfig.instructor.email },
      {
        ...seedConfig.instructor,
        password: hashedPassword
      },
      { upsert: true, new: true, runValidators: true }
    );
    if (!instructor) {
      logger.error('Failed to seed Instructor');
      throw new Error('Instructor seeding failed');
    }
    logger.info(`Seeded Instructor: ${instructor.firstName} ${instructor.lastName}`);

    // Seed Course
    const course = await Course.findOneAndUpdate(
      { title: seedConfig.course.title },
      {
        ...seedConfig.course,
        studentsEnrolled: [], // Clear students enrolled during seeding
        category: category._id,
        instructor: {
          id: instructor._id,
          name: `${instructor.firstName} ${instructor.lastName}`,
          bio: instructor.profile.bio,
          image: instructor.profile.avatar
        }
      },
      { upsert: true, new: true, runValidators: true }
    );
    if (!course) {
      logger.error('Failed to seed Course');
      throw new Error('Course seeding failed');
    }
    logger.info(`Seeded Course: ${course.title}`);

    // Seed Modules
    const seedModules = async () => {
      const modules = [];
      for (const moduleData of seedConfig.modules) {
        // Find the corresponding course
        const courseForModule = await Course.findOne({ 
          title: moduleData.courseTitle 
        });

        if (!courseForModule) {
          logger.error(`Course not found for module: ${moduleData.title}`);
          continue;
        }

        const module = new Module({
          courseId: courseForModule._id,
          title: moduleData.title,
          description: moduleData.description,
          order: moduleData.order || 1,
          learningObjectives: moduleData.learningObjectives || [],
          links: moduleData.links ? moduleData.links.map(link => ({
            title: link.title || 'Module Resource',
            url: link.url
          })) : [],
          lessons: [],
          quizzes: [],
          isPublished: moduleData.isPublished !== undefined ? moduleData.isPublished : true,
          createdAt: moduleData.createdAt ? new Date(moduleData.createdAt) : new Date(),
          updatedAt: moduleData.updatedAt ? new Date(moduleData.updatedAt) : new Date()
        });

        await module.save();

        // Update course's modules array
        courseForModule.modules.push(module._id);
        await courseForModule.save();

        modules.push(module);
        logger.info(`Seeded Module: ${module.title} (Course: ${courseForModule.title})`);
      }
      return modules;
    };

    // Seed Lessons
    const seedLessons = async (modules) => {
      const lessons = [];
      for (const lessonData of seedConfig.lessons) {
        // Find the corresponding module
        const moduleForLesson = modules.find(m => 
          m.title.toLowerCase() === (lessonData.moduleTitle || '').toLowerCase()
        );

        const lesson = new Lesson({
          moduleId: moduleForLesson ? moduleForLesson._id : null,
          
          // Core lesson details
          title: lessonData.title || 'Untitled Lesson',
          title2: lessonData.title2 || '',
          subtitle: lessonData.subtitle || '',
          content: lessonData.content || '',
          description: lessonData.description || '',
          
          // Notes (all 7 possible notes)
          note: lessonData.note || '',
          note1: lessonData.note1 || '',
          note2: lessonData.note2 || '',
          note3: lessonData.note3 || '',
          note4: lessonData.note4 || '',
          note5: lessonData.note5 || '',
          note6: lessonData.note6 || '',
          note7: lessonData.note7 || '',
          
          // Video details
          videoUrl: lessonData.videoUrl || '',
          videoTitle: lessonData.videoTitle || '',
          
          // Links processing
          links: lessonData.links ? 
            lessonData.links.map(link => link.url).join(', ') : '',
          
          // Resources processing
          resources: lessonData.resources ? 
            lessonData.resources.map(resource => ({
              title: resource.title || 'Learning Resource',
              url: resource.url || 'https://example.com/resource'
            })) : [],
          
          // Image
          image: lessonData.image || '',
          
          // Lesson metadata
          duration: lessonData.duration || 0,
          order: lessonData.order || 1,
          isPublished: lessonData.isPublished !== undefined ? 
            lessonData.isPublished : false,
          
          // Timestamps
          createdAt: lessonData.createdAt ? 
            new Date(lessonData.createdAt) : new Date(),
          updatedAt: lessonData.updatedAt ? 
            new Date(lessonData.updatedAt) : new Date()
        });

        await lesson.save();
        
        // If a module was found, update the module's lessons array
        if (moduleForLesson) {
          moduleForLesson.lessons.push(lesson._id);
          await moduleForLesson.save();
        }

        lessons.push(lesson);
        logger.info(`Seeded Lesson: ${lesson.title} (Module: ${moduleForLesson ? moduleForLesson.title : 'Not Assigned'})`);
      }
      return lessons;
    };

    // Seed Quizzes
    const seedQuizzes = async (modules) => {
      const quizzes = [];
      for (const quizData of seedConfig.quizzes) {
        // Find the corresponding module
        const moduleForQuiz = modules.find(m => 
          m.title.toLowerCase() === (quizData.moduleTitle || '').toLowerCase()
        );

        const quiz = new Quiz({
          moduleId: moduleForQuiz ? moduleForQuiz._id : null,
          title: quizData.title,
          description: quizData.description,
          duration: quizData.duration || 30,
          questions: quizData.questions || [],
          passingScore: quizData.passingScore || 70,
          totalPoints: quizData.totalPoints || 0,
          timeLimit: quizData.timeLimit || 30,
          maxAttempts: quizData.maxAttempts || 3,
          showExplanation: quizData.showExplanation !== undefined ? quizData.showExplanation : true,
          isPublished: quizData.isPublished !== undefined ? quizData.isPublished : true,
          studentsEnrolled: quizData.studentsEnrolled || [],
          totalQuestions: quizData.questions ? quizData.questions.length : 0,
          createdAt: quizData.createdAt ? new Date(quizData.createdAt) : new Date(),
          updatedAt: quizData.updatedAt ? new Date(quizData.updatedAt) : new Date()
        });

        await quiz.save();
        
        // If a module was found, update the module's quizzes array
        if (moduleForQuiz) {
          moduleForQuiz.quizzes.push(quiz._id);
          await moduleForQuiz.save();
        }

        quizzes.push(quiz);
        logger.info(`Seeded Quiz: ${quiz.title} (Module: ${moduleForQuiz ? moduleForQuiz.title : 'Not Assigned'})`);
      }
      return quizzes;
    };

    const modules = await seedModules();
    const lessons = await seedLessons(modules);
    const quizzes = await seedQuizzes(modules);
    
    logger.info('🌱 Database seeding completed successfully! 🌱');
    logger.info(`Seeded:
    - Categories: 1
    - Instructors: 1
    - Courses: 1
    - Modules: ${modules.length}
    - Lessons: ${lessons.length}
    - Quizzes: ${quizzes.length}`);

    // Log details of inserted documents
    console.log('Inserted Category:', category.toObject());
    console.log('Inserted Instructor:', instructor.toObject());
    console.log('Inserted Course:', course.toObject());
    console.log('Inserted Modules:', modules.map(m => m.toObject()));
    console.log('Inserted Lessons:', lessons.map(l => l.toObject()));
    console.log('Inserted Quizzes:', quizzes.map(q => q.toObject()));
    
    return {
      category,
      instructor,
      course,
      modules,
      lessons,
      quizzes
    };
  } catch (error) {
    logger.error('Error during seeding:', error);
    throw error; // Re-throw to be caught in the main seed function
  }
};

// Verification function to check relationships
const verifyRelationships = async () => {
  // Verify Course-Module Relationship
  const course = await Course.findOne({ title: 'NCLEX Cardiovascular Nursing Mastery' })
    .populate('modules');
  
  console.log('\n--- Relationship Verification ---');
  console.log('Course Modules:');
  course.modules.forEach(module => {
    console.log(`- ${module.title} (ID: ${module._id})`);
  });

  // Verify Module-Lesson Relationship
  const modulesWithLessons = await Module.find({
    $expr: { $gt: [{ $size: "$lessons" }, 0] }
  }).populate('lessons');

  console.log('\nModules with Lessons:');
  modulesWithLessons.forEach(module => {
    console.log(`Module: ${module.title}`);
    module.lessons.forEach(lesson => {
      console.log(`  - Lesson: ${lesson.title}`);
    });
  });

  // Verify Module-Quiz Relationship
  const modulesWithQuizzes = await Module.find({
    $expr: { $gt: [{ $size: "$quizzes" }, 0] }
  }).populate('quizzes');

  console.log('\nModules with Quizzes:');
  modulesWithQuizzes.forEach(module => {
    console.log(`Module: ${module.title}`);
    module.quizzes.forEach(quiz => {
      console.log(`  - Quiz: ${quiz.title}`);
    });
  });

  // Additional detailed checks
  const allModules = await Module.find({ courseId: course._id });
  console.log('\nAll Modules for Course:');
  allModules.forEach(module => {
    console.log(`- ${module.title}`);
    console.log(`  Lessons Count: ${module.lessons ? module.lessons.length : 0}`);
    console.log(`  Quizzes Count: ${module.quizzes ? module.quizzes.length : 0}`);
  });
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await clearDatabase();
    await seedDatabase();
    await verifyRelationships();
  } catch (error) {
    logger.error('Seed script failed', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

seed();
