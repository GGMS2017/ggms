const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const User = require('./models/User');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');

const mockDBPath = path.join(__dirname, 'data', 'mockDB.json');

const seedDB = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('MongoDB is already seeded. Skipping initial seeding.');
      return;
    }

    console.log('No data found in MongoDB. Starting initial seeding from mockDB.json...');
    const rawData = fs.readFileSync(mockDBPath, 'utf8');
    const mockDB = JSON.parse(rawData);

    if (mockDB.users && mockDB.users.length > 0) {
      await User.insertMany(mockDB.users);
      console.log(`Inserted ${mockDB.users.length} users.`);
    }

    if (mockDB.courses && mockDB.courses.length > 0) {
      await Course.insertMany(mockDB.courses);
      console.log(`Inserted ${mockDB.courses.length} courses.`);
    }

    if (mockDB.enrollments && mockDB.enrollments.length > 0) {
      // Need to add id for enrollments as it was missing in mockDB occasionally but required in schema
      const enrolls = mockDB.enrollments.map((e, idx) => ({
        id: e.id || `enroll_${Date.now()}_${idx}`,
        ...e
      }));
      await Enrollment.insertMany(enrolls);
      console.log(`Inserted ${enrolls.length} enrollments.`);
    }

    console.log('MongoDB Seeding completed successfully!');
  } catch (error) {
    console.error('Error during MongoDB seeding:', error);
  }
};

module.exports = seedDB;
