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

// Utility function to validate and normalize URLs
const normalizeURL = (input) => {
  // If input is a local file path, convert to a valid URL
  if (input.startsWith('/')) {
    return `https://example.com${input}`;
  }
  
  // If input is already a valid URL, return it
  const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  if (urlRegex.test(input)) {
    return input.startsWith('http') ? input : `https://${input}`;
  }
  
  // Fallback to a generic example URL
  return 'https://example.com/resource';
};

// Load seed configuration from multiple YAML files
const loadSeedConfigs = () => {
  const seedConfigFiles = [
    path.resolve(__dirname, 'seed-config.yml'),
    path.resolve(__dirname, 'seed-config2.yml'),
    path.resolve(__dirname, 'seed-config3.yml')
  ];

  const seedConfigs = [];

  for (const configFile of seedConfigFiles) {
    try {
      // Check if file exists before trying to read
      if (fs.existsSync(configFile)) {
        const fileContents = fs.readFileSync(configFile, 'utf8');
        const config = yaml.load(fileContents);
        
        // Optional: Add a source file reference to the config
        config._sourceFile = configFile;
        
        seedConfigs.push(config);
        logger.info(`Loaded seed configuration from ${path.basename(configFile)}`);
      }
    } catch (error) {
      logger.error(`Error loading seed configuration from ${configFile}:`, error);
    }
  }

  if (seedConfigs.length === 0) {
    throw new Error('No seed configuration files found');
  }

  return seedConfigs;
};

// Seed Category
const seedCategory = async (categoryConfig) => {
  const category = await Category.findOneAndUpdate(
    { name: categoryConfig.name },
    categoryConfig,
    { upsert: true, new: true, runValidators: true }
  );
  if (!category) {
    logger.error('Failed to seed Category');
    throw new Error('Category seeding failed');
  }
  logger.info(`Seeded Category: ${category.name}`);
  return category;
};

// Seed Instructor/User
const seedInstructor = async (instructorConfig, category) => {
  const hashedPassword = await bcrypt.hash(instructorConfig.password, 10);
  const instructor = await User.findOneAndUpdate(
    { email: instructorConfig.email },
    {
      ...instructorConfig,
      password: hashedPassword
    },
    { upsert: true, new: true, runValidators: true }
  );
  if (!instructor) {
    logger.error('Failed to seed Instructor');
    throw new Error('Instructor seeding failed');
  }
  logger.info(`Seeded Instructor: ${instructor.firstName} ${instructor.lastName}`);
  return instructor;
};

// Seed Course
const seedCourse = async (courseConfig, category, instructor) => {
  const course = await Course.findOneAndUpdate(
    { title: courseConfig.title },
    {
      ...courseConfig,
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
  return course;
};

// Seed Modules
const seedModules = async (moduleConfigs, course) => {
  const modules = [];
  for (const moduleConfig of moduleConfigs) {
    const module = new Module({
      courseId: course._id,
      title: moduleConfig.title,
      description: moduleConfig.description,
      order: moduleConfig.order || 1,
      learningObjectives: moduleConfig.learningObjectives || [],
      links: moduleConfig.links ? moduleConfig.links.map(link => ({
        title: link.title || 'Module Resource',
        url: link.url
      })) : [],
      lessons: [],
      quizzes: [],
      isPublished: moduleConfig.isPublished !== undefined ? moduleConfig.isPublished : true,
      createdAt: moduleConfig.createdAt ? new Date(moduleConfig.createdAt) : new Date(),
      updatedAt: moduleConfig.updatedAt ? new Date(moduleConfig.updatedAt) : new Date()
    });

    await module.save();

    // Update course's modules array
    course.modules.push(module._id);
    await course.save();

    modules.push(module);
    logger.info(`Seeded Module: ${module.title} (Course: ${course.title})`);
  }
  return modules;
};

// Seed Lessons with improved URL handling
const seedLessons = async (lessonConfigs, modules) => {
  const lessons = [];
  for (const lessonConfig of lessonConfigs) {
    // Find the corresponding module
    const moduleForLesson = modules.find(m => 
      m.title.toLowerCase() === (lessonConfig.moduleTitle || '').toLowerCase()
    );

    const lesson = new Lesson({
      moduleId: moduleForLesson ? moduleForLesson._id : null,
      
      // Core lesson details
      title: lessonConfig.title || 'Untitled Lesson',
      title2: lessonConfig.title2 || '',
      subtitle: lessonConfig.subtitle || '',
      content: lessonConfig.content || '',
      description: lessonConfig.description || '',
      
      // Notes (all 7 possible notes)
      note: lessonConfig.note || '',
      note1: lessonConfig.note1 || '',
      note2: lessonConfig.note2 || '',
      note3: lessonConfig.note3 || '',
      note4: lessonConfig.note4 || '',
      note5: lessonConfig.note5 || '',
      note6: lessonConfig.note6 || '',
      note7: lessonConfig.note7 || '',
      
      // Video details
      videoUrl: lessonConfig.videoUrl ? normalizeURL(lessonConfig.videoUrl) : '',
      videoTitle: lessonConfig.videoTitle || '',
      
      // Links processing
      links: lessonConfig.links ? 
        lessonConfig.links.map(link => normalizeURL(link.url || link)).join(', ') : '',
      
      // Resources processing
      resources: lessonConfig.resources ? 
        lessonConfig.resources.map(resource => ({
          title: resource.title || 'Learning Resource',
          url: normalizeURL(resource.url || 'https://example.com/resource')
        })) : [],
      
      // Image
      image: lessonConfig.image || '',
      
      // Lesson metadata
      duration: lessonConfig.duration || 0,
      order: lessonConfig.order || 1,
      isPublished: lessonConfig.isPublished !== undefined ? 
        lessonConfig.isPublished : false,
      
      // Timestamps
      createdAt: lessonConfig.createdAt ? 
        new Date(lessonConfig.createdAt) : new Date(),
      updatedAt: lessonConfig.updatedAt ? 
        new Date(lessonConfig.updatedAt) : new Date()
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
const seedQuizzes = async (quizConfigs, modules) => {
  const quizzes = [];
  for (const quizConfig of quizConfigs) {
    // Find the corresponding module
    const moduleForQuiz = modules.find(m => 
      m.title.toLowerCase() === (quizConfig.moduleTitle || '').toLowerCase()
    );

    const quiz = new Quiz({
      moduleId: moduleForQuiz ? moduleForQuiz._id : null,
      title: quizConfig.title,
      description: quizConfig.description,
      duration: quizConfig.duration || 30,
      questions: quizConfig.questions || [],
      passingScore: quizConfig.passingScore || 70,
      totalPoints: quizConfig.totalPoints || 0,
      timeLimit: quizConfig.timeLimit || 30,
      maxAttempts: quizConfig.maxAttempts || 3,
      showExplanation: quizConfig.showExplanation !== undefined ? quizConfig.showExplanation : true,
      isPublished: quizConfig.isPublished !== undefined ? quizConfig.isPublished : true,
      studentsEnrolled: quizConfig.studentsEnrolled || [],
      totalQuestions: quizConfig.questions ? quizConfig.questions.length : 0,
      createdAt: quizConfig.createdAt ? new Date(quizConfig.createdAt) : new Date(),
      updatedAt: quizConfig.updatedAt ? new Date(quizConfig.updatedAt) : new Date()
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

// Modify seedDatabase to handle multiple configurations
const seedDatabase = async () => {
  try {
    const seedConfigs = loadSeedConfigs();
    
    // Process each configuration sequentially
    for (const config of seedConfigs) {
      logger.info(`🌱 Seeding from configuration: ${config._sourceFile}`);

      // Seed Category
      const category = await seedCategory(config.category);

      // Seed Instructor
      const instructor = await seedInstructor(config.instructor, category);

      // Seed Course
      const course = await seedCourse(config.course, category, instructor);

      // Seed Modules
      const modules = await seedModules(config.modules, course);

      // Seed Lessons
      const lessons = await seedLessons(config.lessons, modules);

      // Seed Quizzes
      const quizzes = await seedQuizzes(config.quizzes, modules);

      logger.info(`✅ Successfully seeded configuration from ${config._sourceFile}`);
    }
  } catch (error) {
    logger.error('Error during database seeding:', error);
    process.exit(1);
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

// Validate critical environment variables
const validateEnvironment = () => {
  const requiredEnvVars = ['MONGO_URI'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
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
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    logger.info('🗑️ Clearing existing database collections...');
    await clearDatabase();
    logger.info('🌱 Seeding database with multiple configurations...');

    await seedDatabase();
    await verifyRelationships();

    logger.info('🌱 Database seeding completed successfully! 🌱');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
