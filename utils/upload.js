//utils/upload.js
const multer = require("multer");
const path = require("path");

// Set up storage for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Directory to store the uploaded images
    cb(null, "uploads/"); 
  },
  filename: (req, file, cb) => {
    // Set the filename to include the current timestamp to avoid conflicts
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Filter to only allow image files (JPEG, PNG, GIF, etc.)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/; // Allowed image formats
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase()); // Check file extension
  const mimetype = allowedTypes.test(file.mimetype); // Check MIME type
  
  // If the file is an allowed image, continue; otherwise, throw an error
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    return cb(new Error("Only image files are allowed!"), false);
  }
};

// Set up the upload middleware
const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Optional: Limit the file size to 5MB (adjust as needed)
});

// Export the upload middleware to use it in other parts of the application
module.exports = upload;
