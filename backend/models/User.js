const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String, required: true },
  role: { type: String, required: true, enum: ['student', 'instructor', 'admin'] },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  badges: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
