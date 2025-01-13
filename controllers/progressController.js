const Course = require('../models/Course');
const User = require('../models/User');

// Mark a lesson as completed
exports.completeLesson = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user._id;

        // Find the user and update their progress
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Initialize progress if it doesn't exist
        if (!user.progress) {
            user.progress = {
                completedLessons: [],
                completedModules: [],
                completedQuizzes: [],
                courseProgress: []
            };
        }

        // Add lesson to completed lessons if not already completed
        if (!user.progress.completedLessons.includes(lessonId)) {
            user.progress.completedLessons.push(lessonId);

            // Find the course and module this lesson belongs to
            const course = await Course.findOne({
                'modules.lessons': lessonId
            });

            if (course) {
                const module = course.modules.find(m => 
                    m.lessons.some(l => l.toString() === lessonId)
                );

                if (module) {
                    // Check if all lessons in the module are completed
                    const allLessonsCompleted = module.lessons.every(lesson =>
                        user.progress.completedLessons.includes(lesson.toString())
                    );

                    // If all lessons are completed, mark module as completed
                    if (allLessonsCompleted && !user.progress.completedModules.includes(module._id)) {
                        user.progress.completedModules.push(module._id);

                        // Update course progress
                        let courseProgress = user.progress.courseProgress.find(
                            cp => cp.courseId.toString() === course._id.toString()
                        );

                        if (!courseProgress) {
                            courseProgress = {
                                courseId: course._id,
                                completedLessons: [],
                                completedModules: [],
                                completedQuizzes: []
                            };
                            user.progress.courseProgress.push(courseProgress);
                        }

                        if (!courseProgress.completedLessons.includes(lessonId)) {
                            courseProgress.completedLessons.push(lessonId);
                        }

                        if (!courseProgress.completedModules.includes(module._id)) {
                            courseProgress.completedModules.push(module._id);
                        }
                    }
                }
            }

            await user.save();
        }

        res.status(200).json({
            message: 'Lesson marked as completed',
            progress: user.progress
        });
    } catch (error) {
        console.error('Error completing lesson:', error);
        res.status(500).json({ message: 'Error completing lesson', error: error.message });
    }
};

// Mark a module as completed
exports.completeModule = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const userId = req.user._id;

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Initialize progress if it doesn't exist
        if (!user.progress) {
            user.progress = {
                completedLessons: [],
                completedModules: [],
                completedQuizzes: [],
                courseProgress: []
            };
        }

        // Find the course this module belongs to
        const course = await Course.findOne({
            'modules._id': moduleId
        });

        if (!course) {
            return res.status(404).json({ message: 'Module not found' });
        }

        const module = course.modules.find(m => m._id.toString() === moduleId);
        if (!module) {
            return res.status(404).json({ message: 'Module not found' });
        }

        // Add module to completed modules if not already completed
        if (!user.progress.completedModules.includes(moduleId)) {
            user.progress.completedModules.push(moduleId);

            // Update course progress
            let courseProgress = user.progress.courseProgress.find(
                cp => cp.courseId.toString() === course._id.toString()
            );

            if (!courseProgress) {
                courseProgress = {
                    courseId: course._id,
                    completedLessons: [],
                    completedModules: [],
                    completedQuizzes: []
                };
                user.progress.courseProgress.push(courseProgress);
            }

            if (!courseProgress.completedModules.includes(moduleId)) {
                courseProgress.completedModules.push(moduleId);
            }

            await user.save();
        }

        res.status(200).json({
            message: 'Module marked as completed',
            progress: user.progress
        });
    } catch (error) {
        console.error('Error completing module:', error);
        res.status(500).json({ message: 'Error completing module', error: error.message });
    }
};

// Get user's progress for a course
exports.getCourseProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Initialize progress if it doesn't exist
        if (!user.progress) {
            user.progress = {
                completedLessons: [],
                completedModules: [],
                completedQuizzes: [],
                courseProgress: []
            };
            await user.save();
        }

        res.status(200).json(user.progress);
    } catch (error) {
        console.error('Error getting course progress:', error);
        res.status(500).json({ message: 'Error getting course progress', error: error.message });
    }
};
