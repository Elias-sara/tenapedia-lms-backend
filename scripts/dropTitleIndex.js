const mongoose = require('mongoose');
require('dotenv').config();

async function dropTitleIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the courses collection
    const db = mongoose.connection.db;
    const coursesCollection = db.collection('courses');

    // Drop the title index
    await coursesCollection.dropIndex('title_1');
    console.log('Successfully dropped title index');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

dropTitleIndex();
