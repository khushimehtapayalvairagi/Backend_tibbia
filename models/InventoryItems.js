const mongoose = require('mongoose');

const SupplierInfoSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contact: { type: String, required: true }
}, { _id: false });

const InventoryItemSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    itemCode: { type: String, required: true, unique: true },
     category: {
    type: String,
    required: true,
    trim: true
  },
    unitOfMeasurement: { type: String, required: true }, // e.g., pcs, box, ml
    currentStock: { type: Number, default: 0 },
    minStockLevel: { type: Number, required: true },
    maxStockLevel: { type: Number, required: true },
    supplierInfo: SupplierInfoSchema,
    lastRestockedDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);