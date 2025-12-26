const mongoose = require('mongoose');

const BedSchema = new mongoose.Schema({
     beds: [
    { bedNumber: Number, status: String }  // available or occupied
  ],
    status: { type: String, enum: ['available', 'occupied', 'cleaning'], default: 'available' }
});

const WardSchema = new mongoose.Schema({
    name: { type: String, required: true },
    roomCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    beds: [BedSchema]
});

module.exports = mongoose.model('Ward', WardSchema);
