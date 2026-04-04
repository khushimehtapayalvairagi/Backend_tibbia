const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true  },
    password: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'RECEPTIONIST','NURSE', 'DOCTOR','INVENTORYMANAGER','STAFF'], required: true },
    isActive: { type: Boolean, default: true } 

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

