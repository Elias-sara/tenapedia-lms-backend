const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).fields([
  { name: 'courseImage', maxCount: 1 },
  { name: 'instructorImage', maxCount: 1 },
  // Allow any field that matches the pattern lessonImage-X-Y where X and Y are numbers
  { name: /^lessonImage-\d+-\d+$/, maxCount: 1 }
]);

// Wrap multer middleware to handle regex field names
const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Check if the error is due to an unexpected field that matches our pattern
      if (err.code === 'LIMIT_UNEXPECTED_FILE' && /^lessonImage-\d+-\d+$/.test(err.field)) {
        // If it matches our pattern, we can ignore this error and continue
        return next();
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(500).json({ message: err.message });
    }
    next();
  });
};

module.exports = uploadMiddleware;