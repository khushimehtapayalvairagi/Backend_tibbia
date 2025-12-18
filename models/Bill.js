const mongoose = require('mongoose');

const BillItemSchema = new mongoose.Schema({
  item_type: { type: String, required: true },
  item_source_id: { type: mongoose.Schema.Types.ObjectId },
  description: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit_price: { type: Number, required: true },
  sub_total: { type: Number, required: true }
}, { _id: false });

const BillSchema = new mongoose.Schema({
  patient_id_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  visit_id_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
  ipd_admission_id_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'IPDAdmission' },
  bill_date: { type: Date, default: Date.now },
  items: { type: [BillItemSchema], required: true },
  total_amount: { type: Number, required: true },
  amount_paid: { type: Number, default: 0 },
  balance_due: { type: Number, required: true },
  payment_status: { type: String, enum: ['Paid', 'Partial', 'Pending'], default: 'Pending' },
  generated_by_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Bill', BillSchema);
