const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const { authenticateToken } = require("../middleware/authMiddleware");
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const Enrollment = require('../models/Enrollment');
const { enrollInCourse } = require('../controllers/studentController');

// Create required directories
const createRequiredDirs = async () => {
  const dirs = [
    'uploads/courses',
    'uploads/lessons',
    'uploads/defaults'
  ];
  
  try {
    // Create directories
    for (const dir of dirs) {
      await fs.mkdir(path.join(__dirname, '..', dir), { recursive: true });
    }
    
    // Create a simple default image if it doesn't exist
    const defaultCoursePath = path.join(__dirname, '..', 'uploads/defaults/default-course.jpg');
    try {
      await fs.access(defaultCoursePath);
    } catch (error) {
      // If default image doesn't exist, create a simple one using Canvas
      const { createCanvas } = require('canvas');
      const canvas = createCanvas(400, 300);
      const ctx = canvas.getContext('2d');
      
      // Fill background
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, 400, 300);
      
      // Add text
      ctx.fillStyle = '#666666';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No Image Available', 200, 150);
      
      // Save the canvas as JPG
      const buffer = canvas.toBuffer('image/jpeg');
      await fs.writeFile(defaultCoursePath, buffer);
      console.log('Created default course image');
    }
  } catch (error) {
    console.error('Error in createRequiredDirs:', error);
  }
};

// Initialize directories
createRequiredDirs().catch(console.error);

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const type = req.params.type;
    const uploadPath = path.join(__dirname, '..', 'uploads', type);
    
    // Ensure the upload directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Public routes
router.get("/", courseController.getAllCourses);
router.get("/categories", courseController.getCategories);

// Protected routes - put specific routes before parameterized routes
router.get('/recommended', authenticateToken, courseController.getRecommendedCourses);

// Create course
router.post("/", authenticateToken, upload.fields([
  { name: 'courseImage', maxCount: 1 },
  { name: 'instructorImage', maxCount: 1 }
]), courseController.createCourse);

// Admin-specific course creation route
router.post("/admin", authenticateToken, courseController.createCourse);

// Routes with parameters
router.get("/:id", courseController.getCourseById);
router.get('/:courseId/content', authenticateToken, courseController.getCourseContent);

// Get default image
router.get('/defaults/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const defaultPath = path.join(__dirname, '..', 'uploads/defaults', `default-${type}.jpg`);
    
    try {
      await fs.access(defaultPath);
      res.sendFile(defaultPath);
    } catch (error) {
      console.error(`Default ${type} image not found:`, error);
      res.status(404).send('Default image not found');
    }
  } catch (error) {
    console.error('Error serving default image:', error);
    res.status(500).send('Error serving default image');
  }
});

// Get course image
router.get('/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const imagePath = path.join(__dirname, '..', 'uploads', 'courses', `${id}.jpg`);
    const defaultPath = path.join(__dirname, '..', 'uploads', 'defaults', 'default-course.jpg');
    
    try {
      await fs.access(imagePath);
      res.sendFile(imagePath);
    } catch (error) {
      try {
        await fs.access(defaultPath);
        res.sendFile(defaultPath);
      } catch (error) {
        res.status(404).send('Image not found');
      }
    }
  } catch (error) {
    console.error('Error serving course image:', error);
    res.status(500).send('Error serving course image');
  }
});

// Upload any course-related image
router.post('/:type/:id/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }
    res.json({ message: 'Image uploaded successfully' });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Error uploading image' });
  }
});

// Enroll in a course
router.post('/:id/enroll', authenticateToken, enrollInCourse);

module.exports = router;
