const mongoose = require("mongoose");
require("dotenv").config();

/**
 * Establishes a connection to the MongoDB database using the URI from environment variables.
 * Logs success or error messages accordingly.
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    console.error("MongoDB URI is not defined in the environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
