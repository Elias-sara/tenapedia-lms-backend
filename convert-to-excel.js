const fs = require('fs');
const yaml = require('js-yaml');
const XLSX = require('xlsx');
const path = require('path');

function convertYamlToExcel() {
  try {
    // Read the YAML file
    const seedConfigPath = path.join(__dirname, 'seed-config.yml');
    const fileContents = fs.readFileSync(seedConfigPath, 'utf8');
    const data = yaml.load(fileContents);

    // Log the number of quizzes
    console.log('Number of Quizzes:', data.quizzes ? data.quizzes.length : 0);

    // Log the number of questions for each quiz
    if (data.quizzes) {
      data.quizzes.forEach((quiz, index) => {
        console.log(`Quiz ${index + 1} (${quiz.title}): ${quiz.questions ? quiz.questions.length : 0} questions`);
      });
    }

    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Helper function to safely stringify complex objects
    function safeStringify(obj, indent = 2) {
      try {
        return JSON.stringify(obj, null, indent);
      } catch {
        return String(obj);
      }
    }

    // Helper function to join array values
    function joinArray(arr, separator = '; ') {
      return arr && arr.length ? arr.join(separator) : 'None';
    }

    // Category Sheet
    if (data.category) {
      const categorySheet = XLSX.utils.json_to_sheet([{
        ...data.category,
        iconPath: data.category.icon || 'None'
      }]);
      XLSX.utils.book_append_sheet(wb, categorySheet, 'Category');
    }

    // Instructor Sheet
    if (data.instructor) {
      const instructorSheet = XLSX.utils.json_to_sheet([{
        ...data.instructor,
        fullName: `${data.instructor.firstName} ${data.instructor.lastName}`,
        profileBio: data.instructor.profile?.bio || 'None',
        profileAvatar: data.instructor.profile?.avatar || 'None',
        studentsEnrolled: joinArray(data.instructor.studentsEnrolled),
        profileDetails: safeStringify(data.instructor.profile)
      }]);
      XLSX.utils.book_append_sheet(wb, instructorSheet, 'Instructor');
    }

    // Course Sheet
    if (data.course) {
      const courseSheet = XLSX.utils.json_to_sheet([{
        ...data.course,
        instructorDetails: safeStringify(data.course.instructor),
        learningOutcomes: joinArray(data.course.learningOutcomes),
        studentsEnrolled: joinArray(data.course.studentsEnrolled),
        courseImage: data.course.image || 'None'
      }]);
      XLSX.utils.book_append_sheet(wb, courseSheet, 'Course');
    }

    // Modules Sheet
    if (data.modules) {
      const modulesSheet = data.modules.map(module => ({
        ...module,
        learningObjectives: joinArray(module.learningObjectives),
        links: module.links ? module.links.map(link => `${link.title}: ${link.url}`).join(' | ') : 'None'
      }));
      const moduleWorksheet = XLSX.utils.json_to_sheet(modulesSheet);
      XLSX.utils.book_append_sheet(wb, moduleWorksheet, 'Modules');
    }

    // Lessons Sheet
    if (data.lessons) {
      const lessonsSheet = data.lessons.map(lesson => ({
        ...lesson,
        resources: lesson.resources ? lesson.resources.map(res => `${res.title}: ${res.url}`).join(' | ') : 'None',
        links: lesson.links ? lesson.links.map(link => `${link.title}: ${link.url}`).join(' | ') : 'None',
        notes: [
          lesson.note, lesson.note1, lesson.note2, lesson.note3, 
          lesson.note4, lesson.note5, lesson.note6, lesson.note7
        ].filter(note => note).join(' | ')
      }));
      const lessonWorksheet = XLSX.utils.json_to_sheet(lessonsSheet);
      XLSX.utils.book_append_sheet(wb, lessonWorksheet, 'Lessons');
    }

    // Quizzes Summary Sheet
    if (data.quizzes) {
      const quizzesSheet = data.quizzes.map(quiz => ({
        ...quiz,
        studentsEnrolled: joinArray(quiz.studentsEnrolled),
        questionCount: quiz.questions ? quiz.questions.length : 0
      }));
      const quizWorksheet = XLSX.utils.json_to_sheet(quizzesSheet);
      XLSX.utils.book_append_sheet(wb, quizWorksheet, 'Quizzes Summary');
    }

    // Detailed Quiz Questions Sheet
    if (data.quizzes) {
      const questionsSheet = [];
      data.quizzes.forEach(quiz => {
        if (quiz.questions) {
          quiz.questions.forEach((question, index) => {
            questionsSheet.push({
              QuizTitle: quiz.title,
              QuizModuleTitle: quiz.moduleTitle,
              QuestionNumber: index + 1,
              ...question,
              Options: question.options ? question.options.map(opt => opt.text).join(', ') : 'None'
            });
          });
        }
      });
      const questionWorksheet = XLSX.utils.json_to_sheet(questionsSheet);
      XLSX.utils.book_append_sheet(wb, questionWorksheet, 'Quiz Questions');
    }

    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
    const outputPath = path.join(__dirname, '..', `CourseStructure-${timestamp}.xlsx`);

    // Write to Excel file
    XLSX.writeFile(wb, outputPath);

    console.log('Excel file created successfully at:', outputPath);
    return outputPath;
  } catch (error) {
    console.error('Error converting YAML to Excel:', error);
    console.error('Error details:', error.stack);
    throw error;
  }
}

// Run the conversion
try {
  convertYamlToExcel();
} catch (error) {
  console.error('Conversion failed:', error);
}
