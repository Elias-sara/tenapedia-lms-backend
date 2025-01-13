const mongoose = require("mongoose");

const CourseSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: [true, 'Course title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: { 
      type: String, 
      required: [true, 'Course description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    category: { 
      type: String,
      required: [true, 'Course category is required'],
      trim: true
    },
    image: { 
      type: String,
      default: '/images/default-course.jpg'
    },
    instructor: {
      name: { 
        type: String, 
        required: [true, 'Instructor name is required'],
        trim: true
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      bio: { 
        type: String,
        default: ''
      },
      image: { 
        type: String,
        default: '/images/default-avatar.jpg'
      },
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
      default: 'All Levels'
    },
    duration: {
      type: String,
      default: 'Self-paced'
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative']
    },
    learningOutcomes: [{
      type: String,
      trim: true
    }],
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    modules: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Module" 
    }],
    studentsEnrolled: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },
    isPublished: { 
      type: Boolean, 
      default: false 
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    },
    updatedAt: { 
      type: Date, 
      default: Date.now 
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Remove any existing indexes
CourseSchema.indexes().forEach(index => {
  CourseSchema.index(index[0], { unique: false });
});

module.exports = mongoose.model("Course", CourseSchema);
