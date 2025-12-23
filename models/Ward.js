const mongoose = require('mongoose');

const BedSchema = new mongoose.Schema({
    bedNumber: { type: String, required: true},
    status: { type: String, enum: ['available', 'occupied', 'cleaning'], default: 'available' }
});

const WardSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    roomCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    beds: [BedSchema]
});

module.exports = mongoose.model('Ward', WardSchema);
