const mongoose = require('mongoose');

const OPDConsultationSchema = new mongoose.Schema({
    visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    consultationDateTime: { type: Date, default: Date.now },
    chiefComplaint: { type: String, required: true },
    diagnosis: { type: String },
    doctorNotes: { type: String },
    admissionAdvice: { type: Boolean, default: false },
    labInvestigationsSuggested: [{ type: String }],
    medicinesPrescribedText: { type: String },
    transcribedFromPaperNotes: { type: Boolean, default: false },
    transcribedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('OPDConsultation', OPDConsultationSchema);

