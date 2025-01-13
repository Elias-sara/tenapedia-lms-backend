const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const instructorRoutes = require('./routes/instructorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const courseRoutes = require('./routes/courseRoutes');
const progressRoutes = require('./routes/progressRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const quizRoutes = require('./routes/quizRoutes');

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false
};

// Apply CORS before any route handlers
app.use(cors(corsOptions));

// Enable pre-flight requests for all routes
app.options('*', cors(corsOptions));

// Security headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,UPDATE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization');
  next();
});

// Middleware
app.use(express.json());

// Create required directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const publicDir = path.join(__dirname, 'public');
const imagesDir = path.join(publicDir, 'images');

[fs.existsSync(uploadsDir) || fs.mkdirSync(uploadsDir, { recursive: true }),
 fs.existsSync(publicDir) || fs.mkdirSync(publicDir, { recursive: true }),
 fs.existsSync(imagesDir) || fs.mkdirSync(imagesDir, { recursive: true })];

// Configure static file serving with CORS
const staticFileOptions = {
  setHeaders: (res) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600'
    });
  }
};

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticFileOptions));
app.use('/images', express.static(path.join(__dirname, 'public/images'), staticFileOptions));

// Add a route to handle direct image requests
app.get('/api/images/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'public/images', filename);
  
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ message: 'Image not found' });
  }
});

// Add a route to handle course image requests
app.get('/api/courses/:courseId/image', (req, res) => {
  const courseId = req.params.courseId;
  const imagePath = path.join(__dirname, 'uploads/courses', `${courseId}.jpg`);
  
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    // Send a default image if the course image doesn't exist
    res.sendFile(path.join(__dirname, 'public/images/default-course.jpg'));
  }
});

console.log("MONGO_URI:", process.env.MONGO_URI);

// MongoDB connection
const connectDB = async () => {
    const MAX_RETRIES = 5;
    const RETRY_INTERVAL = 5000; // 5 seconds
    let currentRetry = 0;

    const mongooseOptions = {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        heartbeatFrequencyMS: 5000,
        family: 4
    };

    while (currentRetry < MAX_RETRIES) {
        try {
            await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
            console.log('MongoDB connected successfully');

            mongoose.connection.on('disconnected', () => {
                console.log('MongoDB disconnected. Attempting to reconnect...');
                setTimeout(() => connectDB(), RETRY_INTERVAL);
            });

            mongoose.connection.on('error', (err) => {
                console.error('MongoDB connection error:', err);
                if (mongoose.connection.readyState !== 1) {
                    setTimeout(() => connectDB(), RETRY_INTERVAL);
                }
            });

            return;
        } catch (error) {
            currentRetry++;
            console.error(`MongoDB connection attempt ${currentRetry} failed:`, error.message);
            
            if (currentRetry === MAX_RETRIES) {
                console.error('Failed to connect to MongoDB after maximum retries');
                process.exit(1);
            }
            
            await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
        }
    }
};

// Routes
console.log("Registering routes:");
console.log("Auth Routes:", authRoutes);
console.log("Students Routes:", studentRoutes);
console.log("Instructors Routes:", instructorRoutes);
console.log("Admin Routes:", adminRoutes);
console.log("Course Routes:", courseRoutes);
console.log("Progress Routes:", progressRoutes);
console.log("Lesson Routes:", lessonRoutes);
console.log("Quiz Routes:", quizRoutes);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/quizzes', quizRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Start server with port handling
const startServer = async () => {
    try {
        await connectDB();
        
        const PORT = process.env.PORT || 5000;
        let currentPort = PORT;
        const maxPortAttempts = 10;

        const tryPort = (port) => {
            return new Promise((resolve, reject) => {
                const server = app.listen(port)
                    .on('error', (err) => {
                        if (err.code === 'EADDRINUSE') {
                            console.log(`Port ${port} is in use, trying next port`);
                            resolve(false);
                        } else {
                            reject(err);
                        }
                    })
                    .on('listening', () => {
                        console.log(`Server is running on port ${port}`);
                        resolve(true);
                    });
            });
        };

        for (let i = 0; i < maxPortAttempts; i++) {
            const success = await tryPort(currentPort);
            if (success) break;
            currentPort++;
        }
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle process termination
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error during MongoDB disconnect:', err);
        process.exit(1);
    }
});

app.use('/public', express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

startServer();
