const mongoose = require('mongoose');

const ManualChargeItemSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
  category: {
      type: String,     // ✅ OPEN FIELD
      required: true,
      trim: true
    },
    defaultPrice: { type: Number, required: true },
    description: { type: String }
});

module.exports = mongoose.model('ManualChargeItem', ManualChargeItemSchema);
