const Quiz = require("../models/Quiz");
const Module = require("../models/Module");
const User = require("../models/User");
const QuizAttempt = require("../models/QuizAttempt");

// Helper function to prepare quiz for client
const prepareQuizForClient = (quiz) => {
  // If it's already a plain object (from .lean()), use it directly
  const preparedQuiz = quiz.toObject ? quiz.toObject() : { ...quiz };
  
  // Include correct answers and explanations
  preparedQuiz.questions = preparedQuiz.questions.map(q => ({
    ...q,
    correctAnswer: q.correctAnswer || null,
    explanation: q.explanation
  }));

  return preparedQuiz;
};

// Get all quizzes
exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find();
    res.status(200).json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ 
      error: "Failed to fetch quizzes",
      details: error.message 
    });
  }
};

// Get a quiz by ID
exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Check if user is instructor/admin to get full quiz details
    const isInstructor = req.user && (req.user.role === 'instructor' || req.user.role === 'admin');
    const preparedQuiz = isInstructor ? quiz : prepareQuizForClient(quiz);

    res.status(200).json(preparedQuiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ 
      error: "Failed to fetch quiz",
      details: error.message 
    });
  }
};

// Create a quiz
exports.createQuiz = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      questions, 
      difficulty,
      category,
      maxAttempts,
      timeLimit
    } = req.body;

    // Validate input
    if (!title || !description || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'Invalid quiz data' });
    }

    // Validate module existence
    const moduleId = req.body.moduleId;
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    // Prepare quiz questions
    const preparedQuestions = questions.map(question => ({
      ...question,
      correctAnswer: question.correctAnswer || null, // Ensure correctAnswer is set
    }));

    // Create new quiz
    const quiz = new Quiz({
      title,
      description,
      moduleId,
      questions: preparedQuestions,
      difficulty,
      category,
      maxAttempts,
      timeLimit
    });

    // Save quiz
    await quiz.save();

    res.status(201).json(prepareQuizForClient(quiz));
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ 
      message: 'Error creating quiz', 
      details: error.message 
    });
  }
};

// Update a quiz
exports.updateQuiz = async (req, res) => {
  try {
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!updatedQuiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    res.status(200).json(updatedQuiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ 
      error: "Failed to update quiz",
      details: error.message 
    });
  }
};

// Delete a quiz
exports.deleteQuiz = async (req, res) => {
  try {
    const deletedQuiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!deletedQuiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Remove the quiz from its module
    const module = await Module.findById(deletedQuiz.moduleId);
    if (module) {
      module.quizzes = module.quizzes.filter(
        (quizId) => quizId.toString() !== deletedQuiz._id.toString()
      );
      await module.save();
    }

    res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ 
      error: "Failed to delete quiz",
      details: error.message 
    });
  }
};

// Get quizzes by module ID
exports.getQuizzesByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;

    // Find quizzes for the specific module
    const quizzes = await Quiz.find({ moduleId })
      .select('title description questions moduleId passingScore totalPoints')
      .lean();

    // Prepare quizzes for client
    const preparedQuizzes = quizzes.map(quiz => prepareQuizForClient(quiz));

    res.json(preparedQuizzes);
  } catch (error) {
    console.error('Error fetching quizzes by module:', error);
    res.status(500).json({ 
      message: 'Error fetching quizzes', 
      details: error.message 
    });
  }
};

// Submit a quiz
exports.submitQuiz = async (req, res) => {
  try {
    const { answers, timeSpent } = req.body;
    const quizId = req.params.quizId;
    const userId = req.user.id;

    // Validate inputs
    if (!quizId || !userId) {
      return res.status(400).json({ message: 'Missing quiz or user ID' });
    }

    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Validate time spent
    const validTimeSpent = typeof timeSpent === 'number' 
      ? Math.max(0, Math.min(timeSpent, quiz.duration * 60)) 
      : 0;

    console.log('Backend Time Validation:', {
      inputTimeSpent: timeSpent,
      validTimeSpent,
      quizDuration: quiz.duration
    });

    // Process quiz answers
    const questionResults = answers.map(answer => {
      // Find the corresponding question in the quiz
      const question = quiz.questions.find(q => q.text === answer.question);
      
      if (!question) {
        console.warn(`No matching question found for: ${answer.question}`);
        return null;
      }

      return {
        question: answer.question,
        userAnswer: answer.userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect: answer.userAnswer === question.correctAnswer,
        points: answer.userAnswer === question.correctAnswer ? question.points : 0,
        maxPoints: question.points,
        explanation: question.explanation
      };
    }).filter(result => result !== null);

    // Calculate total points
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const earnedPoints = questionResults.reduce((sum, result) => sum + result.points, 0);
    const score = Math.round((earnedPoints / totalPoints) * 100);
    const passed = score >= quiz.passingScore;

    // Create quiz attempt
    const quizAttempt = new QuizAttempt({
      user: userId,
      quiz: quizId,
      moduleId: quiz.moduleId,
      score,
      passed,
      timeSpent: validTimeSpent,
      totalPoints,
      earnedPoints,
      questionResults
    });

    // Save quiz attempt
    await quizAttempt.save();

    // Prepare response
    res.json({
      id: quizAttempt._id,
      score,
      passed,
      timeSpent: validTimeSpent,
      totalPoints,
      earnedPoints,
      questionResults
    });
  } catch (error) {
    console.error('Quiz submission error:', error);
    res.status(500).json({ message: 'Error submitting quiz', error: error.message });
  }
};
