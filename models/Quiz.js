const mongoose = require("mongoose");

const QuizSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: [true, 'Module reference is required']
    },
    title: { 
      type: String, 
      required: [true, 'Quiz title is required'],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
      maxlength: [100, "Title cannot exceed 100 characters"]
    },
    description: { 
      type: String,
      required: [true, 'Quiz description is required'],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"]
    },
    duration: {
      type: Number,
      default: 30,
      min: [0, "Quiz duration cannot be negative"],
      max: [180, "Duration cannot exceed 180 minutes"]
    },
    questions: [
      {
        type: {
          type: String,
          enum: ['multiple-choice', 'true-false', 'short-answer'],
          default: 'multiple-choice'
        },
        text: { 
          type: String, 
          required: [true, 'Question text is required'],
          trim: true,
          minlength: [3, "Question must be at least 3 characters long"]
        },
        options: [{
          text: { 
            type: String, 
            required: [true, 'Option text is required']
          },
          isCorrect: { 
            type: Boolean, 
            default: false 
          }
        }],
        correctAnswer: { 
          type: String,
          default: function() {
            // Find the first correct option
            const correctOption = this.options ? this.options.find(opt => opt.isCorrect) : null;
            return correctOption ? correctOption.text : null;
          }
        },
        explanation: { 
          type: String,
          trim: true,
          default: 'No explanation provided.'
        },
        points: {
          type: Number,
          default: 1,
          min: [0, "Question points cannot be negative"],
          max: [100, "Points cannot exceed 100"]
        }
      }
    ],
    passingScore: { 
      type: Number, 
      required: true,
      min: [0, "Passing score cannot be negative"],
      max: [100, "Passing score cannot exceed 100"],
      default: 70
    },
    totalPoints: {
      type: Number,
      default: 0,
      min: [0, 'Total points cannot be negative']
    },
    timeLimit: {
      type: Number,
      default: 30,
      min: [0, "Time limit cannot be negative"],
      max: [180, "Time limit cannot exceed 180 minutes"]
    },
    maxAttempts: {
      type: Number,
      min: [1, "Maximum attempts must be at least 1"],
      max: [10, "Maximum attempts cannot exceed 10"],
      default: 3
    },
    showExplanation: {
      type: Boolean,
      default: true
    },
    isPublished: {
      type: Boolean,
      default: false
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    pre: ['save', function(next) {
      if (this.questions && this.questions.length > 0) {
        this.totalPoints = this.questions.reduce((total, question) => total + (question.points || 1), 0);
      } else {
        this.totalPoints = 0;
      }
      next();
    }]
  }
);

// Pre-save hook to ensure correctAnswer is set
QuizSchema.pre('save', function(next) {
  if (this.questions) {
    this.questions.forEach(question => {
      // If correctAnswer is not set, default to the first option
      if (!question.correctAnswer && question.options && question.options.length > 0) {
        console.warn(`Setting default correct answer for question: ${question.text}`);
        question.correctAnswer = question.options[0].text;
      }
    });
  }
  next();
});

// Virtual for total questions
QuizSchema.virtual('totalQuestions').get(function() {
  return this.questions ? this.questions.length : 0;
});

module.exports = mongoose.model("Quiz", QuizSchema);
