const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  courseId: { type: String, required: true },
  progress: {
    completedLectures: [String],
    totalLectures: { type: Number, default: 0 }
  },
  attentionLogs: [{
    eventType: { type: String },
    timestamp: { type: String },
    details: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
