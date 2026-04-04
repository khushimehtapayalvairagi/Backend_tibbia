// models/LabTest.js
const mongoose = require('mongoose');

const LabTestSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  testType: { type: String, required: true },
 results: {
  type: [String],
  default: [],
},

  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  date: { type: Date, default: Date.now },
 reportFile: { type: String },
   labTechnician: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" }
});

module.exports = mongoose.model('LabTest', LabTestSchema);
