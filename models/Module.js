const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ModuleSchema = new Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
    },
    title: {
      type: String,
      required: [true, "Module title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Module description is required"],
    },
    order: {
      type: Number,
      default: 1,
      min: [1, "Module order must be at least 1"],
    },
    learningObjectives: [
      {
        type: String,
        trim: true,
      },
    ],
    links: [
      {
        title: {
          type: String,
          trim: true,
        },
        url: {
          type: String,
          trim: true,
          validate: {
            validator: function (v) {
              // Basic URL validation
              return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(v);
            },
            message: (props) => `${props.value} is not a valid URL!`,
          },
        },
      },
    ],
    lessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],
    quizzes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quiz",
      },
    ],
    isPublished: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Module", ModuleSchema);
