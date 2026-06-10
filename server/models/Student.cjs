const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  date: { type: String, required: true },
  subject: { type: String, required: true },
  time: { type: String, required: true },
  location: { type: String, default: 'TBD' },
  type: { type: String, enum: ['Theory', 'Practical'], required: true },
  // Practical specific fields
  panel: { type: String },
  professor: { type: String }
}, { strict: false });

const StudentSchema = new mongoose.Schema({
  rollNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  batch: {
    type: String,
    required: true,
    index: true
  },
  theory: [ExamSchema],
  practical: [ExamSchema]
}, { timestamps: true, strict: false });

// Create a compound text index to allow text searches on rollNo and name
StudentSchema.index({ name: 'text', rollNo: 'text' });

module.exports = mongoose.model('Student', StudentSchema);

