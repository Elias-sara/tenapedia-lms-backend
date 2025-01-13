// models/Progress.js
const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    answers: [{
        questionId: mongoose.Schema.Types.ObjectId,
        userAnswer: String,
        correct: Boolean
    }],
    score: {
        type: Number,
        required: true
    },
    completedAt: {
        type: Date,
        default: Date.now
    }
});

const progressSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true
    },
    status: {
        type: String,
        enum: ['not-started', 'in-progress', 'completed'],
        default: 'not-started'
    },
    completedAt: {
        type: Date
    },
    quizAttempts: [quizAttemptSchema],
    lastAccessedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
progressSchema.index({ student: 1, course: 1, lesson: 1 });

const Progress = mongoose.model('Progress', progressSchema);
module.exports = Progress;