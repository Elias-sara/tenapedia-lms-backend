require("dotenv").config();

/**
 * Configuration module that loads environment variables.
 * Provides MongoDB URI, server port, and JWT secret key.
 * Defaults to port 5000 if not defined in environment variables.
 */
module.exports = {
  MONGO_URI: process.env.MONGO_URI || "", // Ensure MONGO_URI is provided
  PORT: process.env.PORT || 5000, // Default to 5000 if no PORT is set
  JWT_SECRET: process.env.JWT_SECRET || "", // Ensure JWT_SECRET is provided
};
