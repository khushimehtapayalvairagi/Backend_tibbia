const mongoose = require('mongoose');

const ProcedureScheduleSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    ipdAdmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'IPDAdmission' }, 
    procedureType: { type: String, enum: ['OT', 'Labour Room'], required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'OperationTheater'},

   labourRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabourRoom' },

    scheduledDateTime: { type: Date, required: true },
    procedureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Procedure', required: true },
    surgeonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    assistantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
    // anestheticId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    status: { type: String, enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'], default: 'Scheduled' },
    isBilled: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ProcedureSchedule', ProcedureScheduleSchema);