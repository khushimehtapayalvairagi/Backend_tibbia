// const mongoose = require('mongoose');

// const VisitSchema = new mongoose.Schema({
//   // existing fields...
//   patientId: { type: String, required: true },
//   patientDbId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
//   visitType: { type: String, enum: ['OPD', 'IPD_Referral', 'IPD_Admission'], required: true },
//   assignedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
//   receiptNumber: { type: String, unique: true },
//   visitDate: { type: Date, default: Date.now },
//   status: { type: String, enum: ['Registered', 'Waiting', 'Declined', 'Completed'], default: 'Registered' },
//   declineReason: { type: String },
//   referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralPartner' },
//   payment: {
//     amount: { type: Number },
//     isPaid: { type: Boolean, default: false },
//   },

//   // 🩺 add this:
//   consultationNotes: { type: String },
//   prescription: [
//     {
//       medicineName: String,
//       dosage: String,
//       frequency: String,
//       duration: String,
//       remarks: String,
//     },
//   ],
//   prescriptionFile: { type: String }, // optional scanned file
// }, { timestamps: true });


// module.exports = mongoose.model('Visit', VisitSchema);
const mongoose = require('mongoose');

const VisitSchema = new mongoose.Schema({
    patientId: { type: String, required: true },
    
    patientDbId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },

    visitType: { type: String, enum: ['OPD', 'IPD_Referral', 'IPD_Admission'], required: true },

  assignedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },

// receiptNumber: {
//   type: String,
//   unique: true,
//   sparse: true // ✅ allows multiple docs without receiptNumber
// },


    visitDate: { type: Date, default: Date.now },

    status: { type: String, enum: ['Registered', 'Waiting', 'Declined', 'Completed'], default: 'Registered' },

    declineReason: { type: String },

    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralPartner' },
   // models/Visit.js
// receiptNumber: {
//   type: String,
//   unique: true,
//   sparse: true,   // 🔥 THIS IS MANDATORY
//   default: undefined
// },

    payment: {
        amount: { type: Number },
        isPaid: { type: Boolean, default: false }
    }
}, { timestamps: true });

module.exports = mongoose.model('Visit', VisitSchema);
