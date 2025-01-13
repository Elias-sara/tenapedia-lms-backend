const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin'],
    default: 'student'
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Optional phone validation
        return v === '' || v === null || 
               /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/.test(v);
      },
      message: 'Please enter a valid phone number'
    },
    required: [false, 'Phone number is optional']
  },
  profile: {
    bio: {
      type: String,
      trim: true,
      default: ''
    },
    avatar: {
      type: String,
      default: '/images/default-avatar.jpg'
    }
  },
  enrolledCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  progress: {
    completedLessons: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    }],
    completedModules: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module'
    }],
    completedQuizzes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz'
    }],
    courseProgress: [{
      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
      },
      completedLessons: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
      }],
      completedModules: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module'
      }],
      completedQuizzes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz'
      }],
      lastAccessed: {
        type: Date,
        default: Date.now
      }
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add index for instructor name search
UserSchema.index({
  firstName: 'text',
  lastName: 'text',
  role: 1
});

module.exports = mongoose.model("User", UserSchema);
