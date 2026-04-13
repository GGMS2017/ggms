const mongoose = require('mongoose');

const qaSchema = new mongoose.Schema({
  courseId: { type: String, required: true },
  lectureId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  question: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('QA', qaSchema);
