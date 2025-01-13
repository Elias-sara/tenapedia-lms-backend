const mongoose = require("mongoose");
const Course = require("../models/Course");
const User = require("../models/User");
const Module = require("../models/Module");
const QuizModel = require('../models/Quiz');
const Lesson = require("../models/Lesson");
const Category = require('../models/Category');
const { getImagePath } = require('../utils/imageHelper');
const path = require('path');

// Get all courses with pagination and filters
const getAllCourses = async (req, res) => {
    try {
        // Verify authentication token
        if (!req.headers.authorization) {
            return res.status(401).json({
                success: false,
                message: 'Authorization token is missing'
            });
        }

        // Check MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false,
                message: 'Database connection unavailable',
                retryAfter: 5
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const category = req.query.category;
        const instructorName = req.query.instructor;

        const query = {};

        // Add search condition
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Add category filter
        if (category && category !== 'all' && mongoose.Types.ObjectId.isValid(category)) {
            query.category = new mongoose.Types.ObjectId(category);
        }

        // Handle instructor filter
        if (instructorName) {
            const nameParts = instructorName.split(' ');
            const instructorQuery = {
                role: 'instructor',
                $or: [
                    { firstName: { $regex: instructorName, $options: 'i' } },
                    { lastName: { $regex: instructorName, $options: 'i' } }
                ]
            };

            if (nameParts.length > 1) {
                instructorQuery.$or.push({
                    $and: [
                        { firstName: { $regex: nameParts[0], $options: 'i' } },
                        { lastName: { $regex: nameParts[nameParts.length - 1], $options: 'i' } }
                    ]
                });
            }

            const instructor = await User.findOne(instructorQuery);
            if (instructor) {
                query.instructor = instructor._id;
            }
        }

        // Execute query with error handling
        let courses, total;
        try {
            [courses, total] = await Promise.all([
                Course.find(query)
                    .populate('instructor', 'firstName lastName')
                    .populate('category', 'name')
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
                Course.countDocuments(query)
            ]);
        } catch (dbError) {
            console.error('Database query error:', dbError);
            return res.status(500).json({
                success: false,
                message: 'Error querying courses',
                error: dbError.message
            });
        }

        // Format response to match frontend expectations
        const coursesWithImages = courses.map(course => ({
            ...course,
            image: course.image || '/images/default-course.jpg',
            instructorName: course.instructor ? 
                `${course.instructor.firstName} ${course.instructor.lastName}` : 
                'Unknown Instructor'
        }));

        return res.status(200).json({
            success: true,
            courses: coursesWithImages,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            total
        });

    } catch (error) {
        console.error('Error in getAllCourses:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get all categories
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        console.error('Error in getCategories:', error);
        res.status(500).json({ message: 'Error fetching categories' });
    }
};

// Get course by ID
const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('category', 'name')
            .populate('instructor', 'firstName lastName');

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        course.image = getImagePath(course.image);
        
        res.json(course);
    } catch (error) {
        console.error('Error in getCourseById:', error);
        res.status(500).json({ message: 'Error fetching course' });
    }
};

// Get course content including modules and lessons
const getCourseContent = async (req, res) => {
    try {
        const { courseId } = req.params;
        console.log('Fetching course content for courseId:', courseId);

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            console.error('Invalid courseId format:', courseId);
            return res.status(400).json({ message: 'Invalid course ID format' });
        }

        const course = await Course.findById(courseId)
            .populate({
                path: 'modules',
                populate: [
                    {
                        path: 'lessons',
                        model: 'Lesson',
                        select: 'title description duration videoUrl order'
                    },
                    {
                        path: 'quizzes',
                        model: 'Quiz',
                        select: 'title description passingScore'
                    }
                ]
            })
            .populate('instructor', 'firstName lastName')
            .lean();

        if (!course) {
            console.error('Course not found for ID:', courseId);
            return res.status(404).json({ message: 'Course not found' });
        }

        // Format instructor name
        if (course.instructor) {
            course.instructor.name = `${course.instructor.firstName} ${course.instructor.lastName}`.trim();
            delete course.instructor.firstName;
            delete course.instructor.lastName;
        }

        // Sort modules and their contents
        if (course.modules) {
            course.modules.forEach(module => {
                if (module.lessons) {
                    module.lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
                }
            });
        }

        console.log('Successfully fetched course content for ID:', courseId);
        res.json(course);
    } catch (error) {
        console.error('Error in getCourseContent:', error);
        res.status(500).json({ 
            message: 'Error fetching course content',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get recommended courses
const getRecommendedCourses = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get user's enrolled courses to exclude them
        const user = await User.findById(userId)
            .select('enrolledCourses')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If user has no enrolled courses, return popular courses
        if (!user.enrolledCourses || user.enrolledCourses.length === 0) {
            const popularCourses = await Course.find()
                .populate('instructor', 'firstName lastName')
                .select('title description image category instructor duration studentsEnrolled')
                .sort({ 'studentsEnrolled': -1 })
                .limit(6)
                .lean()
                .then(courses => courses.map(course => ({
                    ...course,
                    instructor: {
                        name: course.instructor ? `${course.instructor.firstName} ${course.instructor.lastName}`.trim() : 'Unknown Instructor'
                    }
                })));

            return res.json(popularCourses);
        }

        // Get user's enrolled course categories
        const enrolledCourses = await Course.find({
            '_id': { $in: user.enrolledCourses }
        })
        .select('category')
        .lean();

        const enrolledCategories = new Set(enrolledCourses.map(course => course.category));

        // Find courses that:
        // 1. User is not enrolled in
        // 2. Are in similar categories to what the user is learning
        // 3. Have good enrollment numbers
        const recommendedCourses = await Course.find({
            '_id': { $nin: user.enrolledCourses },
            ...(enrolledCategories.size > 0 && {
                category: { $in: Array.from(enrolledCategories) }
            })
        })
        .populate('instructor', 'firstName lastName')
        .select('title description image category instructor duration studentsEnrolled')
        .sort({ 'studentsEnrolled': -1 })
        .limit(6)
        .lean()
        .then(courses => courses.map(course => ({
            ...course,
            instructor: {
                name: course.instructor ? `${course.instructor.firstName} ${course.instructor.lastName}`.trim() : 'Unknown Instructor'
            }
        })));

        // If we don't have enough recommendations from similar categories,
        // add popular courses from other categories
        if (recommendedCourses.length < 6) {
            const additionalCourses = await Course.find({
                '_id': { 
                    $nin: [
                        ...user.enrolledCourses,
                        ...recommendedCourses.map(c => c._id)
                    ]
                }
            })
            .populate('instructor', 'firstName lastName')
            .select('title description image category instructor duration studentsEnrolled')
            .sort({ 'studentsEnrolled': -1 })
            .limit(6 - recommendedCourses.length)
            .lean()
            .then(courses => courses.map(course => ({
                ...course,
                instructor: {
                    name: course.instructor ? `${course.instructor.firstName} ${course.instructor.lastName}`.trim() : 'Unknown Instructor'
                }
            })));

            recommendedCourses.push(...additionalCourses);
        }

        res.json(recommendedCourses);
    } catch (error) {
        console.error('Error in getRecommendedCourses:', error);
        res.status(500).json({ 
            message: 'Error fetching recommended courses',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Create course with image upload handling
const createCourse = async (req, res) => {
    try {
        const { 
            title, 
            description, 
            category, 
            image,
            instructor,
            modules 
        } = req.body;

        // Validate required fields
        if (!title || !description || !category) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Prepare course data
        const courseData = {
            title,
            description,
            category,
            image: image || null,
            instructor: {
                name: instructor.name,
                bio: instructor.bio,
                image: instructor.image || null
            },
            modules: modules || []
        };

        // Create course
        const newCourse = await Course.create(courseData);

        // Respond with created course
        res.status(201).json({
            message: 'Course created successfully',
            course: newCourse
        });
    } catch (error) {
        console.error('Course creation error:', error);
        res.status(500).json({ 
            message: 'Error creating course', 
            error: error.message 
        });
    }
};

module.exports = {
    getAllCourses,
    getCategories,
    getCourseById,
    getCourseContent,
    getRecommendedCourses,
    createCourse
};
