const mongoose = require('mongoose');

const IPDAdmissionSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', required: true },
    admissionDate: { type: Date, default: Date.now },
    wardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward', required: true },
    bedNumber: { type: String, required: true },
    roomCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    admittingDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    expectedDischargeDate: { type: Date },
    actualDischargeDate: { type: Date },
    status: { type: String, enum: ['Admitted', 'Discharged', 'Transferred'], default: 'Admitted' }
}, { timestamps: true });

module.exports = mongoose.model('IPDAdmission', IPDAdmissionSchema);
