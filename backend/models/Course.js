const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  duration: { type: String, required: true },
  completed: { type: Boolean, default: false },
  note: { type: String },
  videoUrl: { type: String }
});

const curriculumSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  lectures: [lectureSchema]
});

const courseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructor: { type: String, required: true },
  curriculum: [curriculumSchema],
  thumbnail: { type: String },
  tags: [{ type: String }],
  studentLogs: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);
