const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const LessonSchema = new Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    title: { type: String, required: true },
    title2: { type: String }, // Secondary title for additional context
    subtitle: { type: String }, // Subtitle for the lesson
    content: { type: String, required: true }, // Main content of the lesson
    note: { type: String }, // General note about the lesson
    note1: { type: String }, // Additional note 1
    note2: { type: String }, // Additional note 2
    note3: { type: String }, // Additional note 3
    note4: { type: String }, // Additional note 4
    note5: { type: String }, // Additional note 5
    note6: { type: String }, // Additional note 6
    note7: { type: String }, // Additional note 7
    description: { type: String }, // Short description of the lesson
    videoUrl: { type: String }, // Video URL
    videoTitle: { type: String }, // Title of the video
    links: { type: String }, // Additional links or metadata
    resources: [
      {
        title: { type: String, default: "Learning Resource" },
        url: {
          type: String,
          default: "https://example.com/resource",
          validate: {
            validator: function (v) {
              // Optional URL validation, can be customized
              const urlRegex =
                /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
              return !v || urlRegex.test(v);
            },
            message: (props) => `${props.value} is not a valid URL!`,
          },
        },
      },
    ], // Array of resource objects
    image: { type: String }, // Image URL for the lesson
    duration: { type: Number, required: true }, // Duration in minutes
    order: { type: Number, required: true }, // Order in the module
    isPublished: { type: Boolean, default: false }, // Publication status
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

module.exports = mongoose.model("Lesson", LessonSchema);
