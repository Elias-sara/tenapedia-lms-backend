const mongoose = require("mongoose");
const { performance } = require('perf_hooks');

const QuizAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    timeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    earnedPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    questionResults: [
      {
        question: {
          type: String,
          required: true,
        },
        userAnswer: {
          type: String,
          required: true,
        },
        correctAnswer: {
          type: String,
          required: true,
        },
        isCorrect: {
          type: Boolean,
          required: true,
        },
        points: {
          type: Number,
          default: 0,
          min: 0,
        },
        maxPoints: {
          type: Number,
          default: 1,
          min: 0,
        },
        explanation: {
          type: String,
        }
      }
    ],
    completedAt: {
      type: Date,
      default: Date.now,
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual to calculate percentage score
QuizAttemptSchema.virtual('percentageScore').get(function() {
  return this.totalPoints > 0 
    ? Math.round((this.earnedPoints / this.totalPoints) * 100)
    : 0;
});

// Validation to ensure question results match quiz
QuizAttemptSchema.pre('save', function(next) {
  const startTime = performance.now();
  
  // Detailed logging of quiz attempt before saving
  console.log('Saving Quiz Attempt:', {
    userId: this.user.toString(),
    quizId: this.quiz.toString(),
    moduleId: this.moduleId.toString(),
    score: this.score,
    timeSpent: this.timeSpent,
    totalPoints: this.totalPoints,
    earnedPoints: this.earnedPoints,
    questionResultsCount: this.questionResults.length
  });

  // Log each question result in detail
  this.questionResults.forEach((result, index) => {
    console.log(`Question Result ${index + 1}:`, {
      question: result.question,
      userAnswer: result.userAnswer,
      correctAnswer: result.correctAnswer,
      isCorrect: result.isCorrect,
      points: result.points,
      maxPoints: result.maxPoints
    });
  });

  // Ensure score is between 0 and 100
  this.score = Math.min(100, Math.max(0, this.score));
  
  // Validate passed status based on score
  this.passed = this.score >= 70;

  // Validate total and earned points
  if (this.totalPoints < this.earnedPoints) {
    console.warn('Warning: Earned points exceed total points', {
      totalPoints: this.totalPoints,
      earnedPoints: this.earnedPoints
    });
    this.earnedPoints = this.totalPoints;
  }

  // Performance logging
  const endTime = performance.now();
  console.log('Quiz Attempt Pre-Save Validation Duration:', {
    durationMs: endTime - startTime
  });

  next();
});

// Post-save hook for additional logging
QuizAttemptSchema.post('save', function(doc) {
  console.log('Quiz Attempt Saved Successfully:', {
    id: doc._id.toString(),
    userId: doc.user.toString(),
    quizId: doc.quiz.toString(),
    score: doc.score,
    passed: doc.passed
  });
});

// Error handling middleware
QuizAttemptSchema.post('save', function(error, doc, next) {
  if (error) {
    console.error('Error Saving Quiz Attempt:', {
      message: error.message,
      name: error.name,
      details: error.errors,
      quizAttemptData: doc
    });
    next(error);
  }
});

module.exports = mongoose.model("QuizAttempt", QuizAttemptSchema);
