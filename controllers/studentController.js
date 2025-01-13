const mongoose = require('mongoose');
const Course = require("../models/Course");
const Module = require("../models/Module");
const Lesson = require("../models/Lesson");
const Enrollment = require("../models/Enrollment");
const Progress = require("../models/Progress");
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const QuizAttempt = require("../models/QuizAttempt");
const Activity = require('../models/Activity');

// Get enrolled courses for a student
const getEnrolledCourses = async (req, res) => {
    try {
        const userId = req.user._id;

        // Check MongoDB connection state
        if (mongoose.connection.readyState !== 1) {
            console.error('getEnrolledCourses: MongoDB not connected');
            return res.status(503).json({ 
                message: 'Database connection unavailable. Please try again later.',
                retryAfter: 5
            });
        }

        const user = await User.findById(userId)
            .select('enrolledCourses')
            .lean();

        if (!user) {
            console.error('getEnrolledCourses: User not found:', userId);
            return res.status(404).json({ message: 'User not found' });
        }

        // If user has no enrolled courses, return empty array
        if (!user.enrolledCourses || user.enrolledCourses.length === 0) {
            console.log('User has no enrolled courses:', userId);
            return res.json([]);
        }

        // Get enrolled courses with modules, lessons, and quizzes
        const enrolledCourses = await Course.find({
            '_id': { $in: user.enrolledCourses }
        })
        .populate({
            path: 'modules',
            populate: [
                {
                    path: 'lessons',
                    select: '_id title description duration order videoUrl'
                },
                {
                    path: 'quizzes',
                    select: '_id title description passingScore'
                }
            ]
        })
        .select('title description image category instructor modules studentsEnrolled')
        .lean();

        // Get progress for all enrolled courses
        const progress = await Progress.find({
            student: userId,
            course: { $in: user.enrolledCourses }
        }).lean();

        // Get enrollment data for module progress
        const enrollments = await Enrollment.find({
            student: userId,
            course: { $in: user.enrolledCourses }
        }).lean();

        // Add progress data to each course
        const coursesWithProgress = enrolledCourses.map(course => {
            const courseProgress = progress.filter(p => p.course.toString() === course._id.toString());
            const enrollment = enrollments.find(e => e.course.toString() === course._id.toString());
            
            // Calculate total lessons and completed lessons
            let totalLessons = 0;
            let completedLessons = 0;
            let totalQuizzes = 0;
            let completedQuizzes = 0;

            course.modules.forEach(module => {
                if (module.lessons) {
                    totalLessons += module.lessons.length;
                    const moduleEnrollment = enrollment?.moduleProgress?.find(
                        mp => mp.module.toString() === module._id.toString()
                    );
                    if (moduleEnrollment) {
                        completedLessons += moduleEnrollment.lessonProgress.filter(lp => lp.completed).length;
                    }
                }
                if (module.quizzes) {
                    totalQuizzes += module.quizzes.length;
                    const quizProgress = courseProgress.filter(p => 
                        p.status === 'completed' && 
                        module.quizzes.some(q => q._id.toString() === p.quiz?.toString())
                    );
                    completedQuizzes += quizProgress.length;
                }
            });

            const totalItems = totalLessons + totalQuizzes;
            const completedItems = completedLessons + completedQuizzes;
            const progressPercentage = totalItems > 0 
                ? Math.round((completedItems / totalItems) * 100) 
                : 0;

            return {
                ...course,
                progress: progressPercentage,
                totalLessons,
                completedLessons,
                totalQuizzes,
                completedQuizzes,
                moduleProgress: enrollment?.moduleProgress || []
            };
        });

        console.log('Successfully fetched enrolled courses for user:', userId);
        res.json(coursesWithProgress);
    } catch (error) {
        console.error('Error in getEnrolledCourses:', error);
        
        if (error.name === 'MongoNetworkError' || 
            error.name === 'MongoServerSelectionError' ||
            error.name === 'MongooseServerSelectionError') {
            return res.status(503).json({ 
                message: 'Database connection error. Please try again later.',
                retryAfter: 5
            });
        }

        res.status(500).json({ 
            message: 'Error fetching enrolled courses',
            error: error.message 
        });
    }
};

// Get student's progress
const getStudentProgress = async (req, res) => {
    try {
        const studentId = req.user._id;
        const courseId = req.query.courseId;

        const progress = await Progress.find({
            student: studentId,
            ...(courseId && { course: courseId })
        }).populate('lesson');

        res.json(progress);
    } catch (error) {
        console.error('Error in getStudentProgress:', error);
        res.status(500).json({ message: 'Error fetching progress' });
    }
};

// Update lesson progress
const updateLessonProgress = async (req, res) => {
    try {
        const { lessonId, courseId, status } = req.body;
        const studentId = req.user._id;

        console.log('Lesson Progress Update Request:', {
            studentId,
            lessonId,
            courseId,
            status
        });

        let progress = await Progress.findOne({
            student: studentId,
            lesson: lessonId,
            course: courseId
        });

        if (!progress) {
            progress = new Progress({
                student: studentId,
                lesson: lessonId,
                course: courseId,
                status: status,
                completedAt: status === 'completed' ? new Date() : null
            });
        } else {
            progress.status = status;
            progress.completedAt = status === 'completed' ? new Date() : null;
        }

        await progress.save();
        
        console.log('Lesson Progress Updated Successfully:', {
            progressId: progress._id,
            status: progress.status
        });

        res.json(progress);
    } catch (error) {
        console.error('Error in updateLessonProgress:', error);
        res.status(500).json({ 
            message: 'Error updating progress',
            error: error.message 
        });
    }
};

// Submit quiz
const submitQuiz = async (req, res) => {
    try {
        const { quizId, answers } = req.body;
        const studentId = req.user._id;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        // Calculate score
        let score = 0;
        const results = quiz.questions.map((question, index) => {
            const isCorrect = question.correctAnswer === answers[index];
            if (isCorrect) score++;
            return {
                questionId: question._id,
                userAnswer: answers[index],
                correct: isCorrect
            };
        });

        const finalScore = (score / quiz.questions.length) * 100;

        // Save quiz attempt
        const attempt = {
            student: studentId,
            quiz: quizId,
            answers: results,
            score: finalScore,
            completedAt: new Date()
        };

        // Update progress if quiz is part of a lesson
        if (quiz.lesson) {
            await Progress.findOneAndUpdate(
                { student: studentId, lesson: quiz.lesson },
                { 
                    $set: { 
                        quizAttempts: attempt,
                        status: finalScore >= quiz.passingScore ? 'completed' : 'in-progress'
                    }
                },
                { upsert: true }
            );
        }

        res.json({
            score: finalScore,
            results: results,
            passed: finalScore >= quiz.passingScore
        });
    } catch (error) {
        console.error('Error in submitQuiz:', error);
        res.status(500).json({ message: 'Error submitting quiz' });
    }
};

// Enroll in a course
const enrollInCourse = async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const studentId = req.user._id;

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if student is already enrolled
        const existingEnrollment = await Enrollment.findOne({
            student: studentId,
            course: courseId
        });

        if (existingEnrollment) {
            return res.status(400).json({ message: 'Already enrolled in this course' });
        }

        // Create new enrollment
        const enrollment = new Enrollment({
            student: studentId,
            course: courseId,
            enrollmentDate: new Date(),
            status: 'active',
            moduleProgress: course.modules.map(moduleId => ({
                module: moduleId,
                completed: false,
                lessonProgress: []
            }))
        });

        await enrollment.save();

        // Add course to student's enrolled courses
        await User.findByIdAndUpdate(
            studentId,
            { $addToSet: { enrolledCourses: courseId } }
        );

        // Increment course enrollment count
        await Course.findByIdAndUpdate(
            courseId,
            { $addToSet: { studentsEnrolled: studentId } }
        );

        // Create activity record
        const activity = new Activity({
            userId: studentId,
            type: 'course_enrollment',
            description: `Enrolled in course: ${course.title}`,
            metadata: {
                courseId: courseId,
                courseName: course.title
            }
        });
        await activity.save();

        res.status(201).json({
            message: 'Successfully enrolled in the course',
            enrollment
        });

    } catch (error) {
        console.error('Error in enrollInCourse:', error);
        res.status(500).json({
            message: 'Error enrolling in course',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get course details with progress
const getCourseDetails = async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const studentId = req.user._id;

        console.log('Fetching course details:', {
            courseId,
            studentId: studentId.toString(),
            user: {
                _id: req.user._id,
                email: req.user.email,
                role: req.user.role
            }
        });

        // Verify user exists and is a student
        const user = await User.findById(studentId);
        if (!user) {
            console.error('User not found:', studentId);
            return res.status(404).json({ message: 'User not found' });
        }

        // Log enrolled courses for debugging
        console.log('User enrolled courses:', user.enrolledCourses);

        const enrollment = await Enrollment.findOne({
            course: courseId,
            student: studentId
        });

        if (!enrollment) {
            console.error('No enrollment found:', {
                courseId,
                studentId: studentId.toString(),
                allEnrollments: await Enrollment.find({ student: studentId })
            });
            return res.status(403).json({ message: 'Not enrolled in this course' });
        }

        const course = await Course.findById(courseId)
            .populate({
                path: 'modules',
                populate: {
                    path: 'lessons'
                }
            });

        if (!course) {
            console.error('Course not found:', courseId);
            return res.status(404).json({ message: 'Course not found' });
        }

        // If no modules exist, try to find modules by courseId
        if (!course.modules || course.modules.length === 0) {
            const modulesForCourse = await Module.find({ courseId: courseId })
                .populate('lessons');
            
            console.log('Modules found for course:', {
                courseId,
                modulesCount: modulesForCourse.length
            });

            // Update course with found modules
            course.modules = modulesForCourse;
        }

        const progress = await Progress.find({
            student: studentId,
            course: courseId
        });

        console.log('Progress found:', progress.length);

        const courseWithProgress = {
            ...course.toObject(),
            modules: course.modules.map(module => ({
                ...module.toObject(),
                lessons: module.lessons.map(lesson => ({
                    ...lesson.toObject(),
                    progress: progress.find(p => p.lesson.toString() === lesson._id.toString())
                }))
            }))
        };

        res.json(courseWithProgress);
    } catch (error) {
        console.error('Error in getCourseDetails:', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            message: 'Error fetching course details', 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
        });
    }
};

// Get lesson details
const getLessonDetails = async (req, res) => {
    try {
        const { lessonId } = req.params;
        
        if (!lessonId) {
            console.error('getLessonDetails: lessonId is undefined');
            return res.status(400).json({ message: 'Lesson ID is required' });
        }

        console.log('Fetching lesson details for lessonId:', lessonId);
        const lesson = await Lesson.findById(lessonId);
        
        if (!lesson) {
            console.error('getLessonDetails: Lesson not found for id:', lessonId);
            return res.status(404).json({ message: 'Lesson not found' });
        }

        // Check if student is enrolled in the course this lesson belongs to
        const module = await Module.findOne({ lessons: lessonId });
        if (!module) {
            console.error('getLessonDetails: Module not found for lesson:', lessonId);
            return res.status(404).json({ message: 'Module not found for this lesson' });
        }

        const course = await Course.findOne({ modules: module._id });
        if (!course) {
            console.error('getLessonDetails: Course not found for module:', module._id);
            return res.status(404).json({ message: 'Course not found for this lesson' });
        }

        // Check enrollment in both User and Course models
        const userId = req.user._id;
        const [user, courseWithEnrollment] = await Promise.all([
            User.findById(userId),
            Course.findById(course._id)
        ]);

        if (!user) {
            console.error('getLessonDetails: User not found:', userId);
            return res.status(404).json({ message: 'User not found' });
        }

        const isEnrolledInUser = user.enrolledCourses.some(enrolledCourseId => 
            enrolledCourseId.toString() === course._id.toString()
        );

        const isEnrolledInCourse = courseWithEnrollment.studentsEnrolled.some(studentId => 
            studentId.toString() === userId.toString()
        );

        if (!isEnrolledInUser || !isEnrolledInCourse) {
            console.error('getLessonDetails: Enrollment mismatch. User enrolled:', isEnrolledInUser, 'Course enrolled:', isEnrolledInCourse);
            console.error('User:', userId, 'Course:', course._id);
            
            // Auto-fix enrollment if it's mismatched
            if (isEnrolledInUser && !isEnrolledInCourse) {
                courseWithEnrollment.studentsEnrolled.push(userId);
                await courseWithEnrollment.save();
            } else if (!isEnrolledInUser && isEnrolledInCourse) {
                user.enrolledCourses.push(course._id);
                await user.save();
            } else {
                return res.status(403).json({ message: 'Not enrolled in this course' });
            }
        }

        console.log('Successfully fetched lesson details for:', lessonId);
        res.json(lesson);
    } catch (error) {
        console.error('Error in getLessonDetails:', error);
        res.status(500).json({ 
            message: 'Error fetching lesson details',
            error: error.message 
        });
    }
};

// Get course navigation
const getCourseNavigation = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { currentModuleId, currentLessonId } = req.query;
        const userId = req.user._id;

        // Check MongoDB connection state
        if (mongoose.connection.readyState !== 1) {
            console.error('getCourseNavigation: MongoDB not connected');
            return res.status(503).json({ 
                message: 'Database connection unavailable. Please try again later.',
                retryAfter: 5
            });
        }

        // Verify enrollment
        const user = await User.findById(userId).select('enrolledCourses').lean();
        if (!user) {
            console.error('getCourseNavigation: User not found:', userId);
            return res.status(404).json({ message: 'User not found' });
        }

        const isEnrolled = user.enrolledCourses.some(id => id.toString() === courseId);
        if (!isEnrolled) {
            console.error('getCourseNavigation: User not enrolled in course. User:', userId, 'Course:', courseId);
            return res.status(403).json({ message: 'Not enrolled in this course' });
        }

        // Get course with modules and lessons
        const course = await Course.findById(courseId)
            .populate({
                path: 'modules',
                populate: {
                    path: 'lessons',
                    select: '_id title moduleId order'
                }
            })
            .lean();

        if (!course) {
            console.error('getCourseNavigation: Course not found:', courseId);
            return res.status(404).json({ message: 'Course not found' });
        }

        // If no modules exist, try to find modules by courseId
        if (!course.modules || course.modules.length === 0) {
            const modulesForCourse = await Module.find({ courseId: courseId })
                .populate('lessons', '_id title moduleId order');
            
            console.log('Modules found for course:', {
                courseId,
                modulesCount: modulesForCourse.length
            });

            // Update course with found modules
            course.modules = modulesForCourse;
        }

        // Flatten all lessons and sort by order
        const allLessons = course.modules.reduce((acc, module) => {
            if (module.lessons && Array.isArray(module.lessons)) {
                return [...acc, ...module.lessons.map(lesson => ({
                    ...lesson,
                    moduleId: module._id
                }))];
            }
            return acc;
        }, []).sort((a, b) => (a.order || 0) - (b.order || 0));

        if (allLessons.length === 0) {
            console.error('getCourseNavigation: No lessons found in course:', courseId);
            return res.status(404).json({ message: 'No lessons found in this course' });
        }

        // Find current lesson index
        const currentIndex = allLessons.findIndex(lesson => 
            lesson._id.toString() === currentLessonId
        );

        // Get previous and next lessons
        const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
        const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

        // Get progress
        const progress = await Progress.find({
            student: userId,
            course: courseId
        }).lean();

        console.log('Successfully fetched course navigation. Course:', courseId, 'Current lesson:', currentLessonId);
        res.json({
            prev: prevLesson ? {
                lessonId: prevLesson._id,
                moduleId: prevLesson.moduleId,
                title: prevLesson.title
            } : null,
            next: nextLesson ? {
                lessonId: nextLesson._id,
                moduleId: nextLesson.moduleId,
                title: nextLesson.title
            } : null,
            progress: progress.reduce((acc, p) => {
                acc[p.lesson] = p.status;
                return acc;
            }, {})
        });
    } catch (error) {
        console.error('Error in getCourseNavigation:', error);
        
        if (error.name === 'MongoNetworkError' || 
            error.name === 'MongoServerSelectionError' ||
            error.name === 'MongooseServerSelectionError') {
            return res.status(503).json({ 
                message: 'Database connection error. Please try again later.',
                retryAfter: 5
            });
        }

        res.status(500).json({ 
            message: 'Error fetching course navigation',
            error: error.message 
        });
    }
};

// Get student profile
const getStudentProfile = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const student = await User.findById(req.user._id)
            .select('-password')
            .lean();

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json({
            _id: student._id,
            firstName: student.firstName || '',
            lastName: student.lastName || '',
            email: student.email || '',
            phone: student.phone || '',
            bio: student.bio || '',
            role: student.role
        });
    } catch (error) {
        console.error('Error in getStudentProfile:', error);
        res.status(500).json({ 
            message: 'Error fetching student profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get student activities
const getActivities = async (req, res) => {
    try {
        const activities = await Activity.find({ 
            userId: req.user._id 
        })
        .sort({ timestamp: -1 })
        .limit(5);
        
        res.json(activities);
    } catch (error) {
        console.error('Error in getActivities:', error);
        res.status(500).json({ message: 'Error fetching activities' });
    }
};

// Get upcoming deadlines
const getDeadlines = async (req, res) => {
    try {
        const student = await User.findById(req.user._id)
            .populate({
                path: 'enrolledCourses',
                select: 'title assignments deadlines'
            });

        const deadlines = student.enrolledCourses.reduce((acc, course) => {
            const courseDeadlines = [...(course.assignments || []), ...(course.deadlines || [])]
                .map(d => ({
                    ...d,
                    courseName: course.title
                }))
                .filter(d => new Date(d.dueDate) > new Date());

            return [...acc, ...courseDeadlines];
        }, [])
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);

        res.json(deadlines);
    } catch (error) {
        console.error('Error in getDeadlines:', error);
        res.status(500).json({ message: 'Error fetching deadlines' });
    }
};

// Get learning stats
const getStats = async (req, res) => {
    try {
        const student = await User.findById(req.user._id)
            .populate('enrolledCourses');

        const stats = {
            totalProgress: 0,
            completedCourses: 0,
            hoursSpent: 0,
            averageScore: 0
        };

        if (student.enrolledCourses.length > 0) {
            const completedCourses = student.enrolledCourses.filter(course => 
                course.progress >= 100
            ).length;

            stats.completedCourses = completedCourses;
            stats.totalProgress = Math.round(
                student.enrolledCourses.reduce((acc, course) => acc + (course.progress || 0), 0) 
                / student.enrolledCourses.length
            );
            // Add other stat calculations as needed
        }

        res.json(stats);
    } catch (error) {
        console.error('Error in getStats:', error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
};

// Update student profile
const updateStudentProfile = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, bio } = req.body;
        const userId = req.user._id;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    firstName,
                    lastName,
                    email,
                    phone,
                    bio
                }
            },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(updatedUser);
    } catch (error) {
        console.error('Error in updateStudentProfile:', error);
        res.status(500).json({ 
            message: 'Error updating profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getEnrolledCourses,
    getStudentProgress,
    updateLessonProgress,
    submitQuiz,
    enrollInCourse,
    getCourseDetails,
    getLessonDetails,
    getCourseNavigation,
    getStudentProfile,
    updateStudentProfile,
    getActivities,
    getDeadlines,
    getStats
};
