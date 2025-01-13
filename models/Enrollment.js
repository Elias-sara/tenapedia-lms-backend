const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    enrollmentDate: {
        type: Date,
        default: Date.now
    },
    progress: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'dropped'],
        default: 'active'
    },
    moduleProgress: [{
        module: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Module',
            required: true
        },
        completed: {
            type: Boolean,
            default: false
        },
        lessonProgress: [{
            lesson: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Lesson',
                required: true
            },
            completed: {
                type: Boolean,
                default: false
            },
            progress: {
                type: Number,
                default: 0
            }
        }]
    }]
});

// Add compound index to prevent duplicate enrollments
enrollmentSchema.index({ course: 1, student: 1 }, { unique: true });

// Export the model only if it hasn't been registered
module.exports = mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);
