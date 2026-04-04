const mongoose = require('mongoose');

const RelativeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactNumber: { type: String, required: true },
  relationship: { type: String, required: true }
}, { _id: false });

function relativesLimit(val) {
  return val.length <= 3;
}

const PatientSchema = new mongoose.Schema({
  patientId: { type: String, unique: true, required: true },
  fullName: { type: String, required: true },
  age: { type: String, required: true },
  dob: { type: Date, required: false },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  contactNumber: { type: String, required: false },
  email: { type: String, required: false },
  address: { type: String, required: true },
 abhaNumber: {
  type: String,
  unique: true,
  sparse: true // ✅ allows multiple null/undefined values
},
  aadhaarNumber: { type: String, unique: true, sparse: true }, // optional & unique
  relatives: { type: [RelativeSchema], validate: [relativesLimit, 'Maximum 3 relatives allowed'], required: false },
  status: { type: String, enum: ['Inactive','Active'], default: 'Inactive' }
}, { timestamps: true });

module.exports = mongoose.model('Patient', PatientSchema);
