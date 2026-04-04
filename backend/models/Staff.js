const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
contactNumber: {
    type: String,
    default: null
  },
  designation: {
    type: String,
    enum: [
      'Head Nurse',
      'Lab Technician',
      'Receptionist',
      'Inventory Manager',
      'Other',
      'Pathologist',
      'Metron',
      'X-Ray Technicians',
      'Sonography Assist',
      'O.T. Attendant',
      'Pharmacists'
    ],
    required: true
  },

   // department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
 

//    designation: { 
//   type: String, 
//   required: true 
// },
   isActive: { type: Boolean, default: true }   

});

module.exports = mongoose.model('Staff', StaffSchema);
