const mongoose = require('mongoose');

const AnesthesiaRecordSchema = new mongoose.Schema({
    // procedureScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProcedureSchedule', required: true },
      patientId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Patient'   // 👈 must match your Patient model name
    },
    ipdAdmissionId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'IPDAdmission' 
    },
     procedureType: { type: String, enum: ['OT', 'Labour Room'] },
    anestheticId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    anesthesiaName: { type: String, required: true },
    anesthesiaType: { type: String, enum: ['General', 'Local', 'Epidural'], required: true },
    induceTime: { type: Date },
    endTime: { type: Date },
    medicinesUsedText: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('AnesthesiaRecord', AnesthesiaRecordSchema);
