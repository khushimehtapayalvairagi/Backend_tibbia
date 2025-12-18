const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const ProcedureSchedule = require('../models/ProcedureSchedule');
const ManualChargeItem = require('../models/ManualChargeItem');

exports.createBill = async (req, res) => {
  try {
    const { patient_id_ref,ipd_admission_id_ref, items, generated_by_user_id } = req.body;
    if (!patient_id_ref || !items || !generated_by_user_id  || !ipd_admission_id_ref) {
      return res.status(400).json({ message: 'Required fields missing.' });
    }

    let total = 0, processed = [],billedProcedureIds = [];

    for (const it of items) {
      const { item_type, item_source_id, description, quantity } = it;
      if (!item_type || !quantity || quantity <= 0) {
        return res.status(400).json({ message: 'Invalid item details.' });
      }

      let unit_price, desc;
      if (item_source_id){
        if (item_type === 'ProcedureSchedule') {
          const ps = await ProcedureSchedule.findById(item_source_id).populate('procedureId');
          if (!ps) return res.status(404).json({ message: 'Scheduled procedure not found.' });
          if (ps.isBilled) return res.status(400).json({ message: 'This procedure has already been billed.' });
          unit_price = ps.procedureId.cost;
          desc = `Scheduled ${ps.procedureType} - ${ps.procedureId.name}`;
          billedProcedureIds.push(ps._id);
        } else {
          const m = await ManualChargeItem.findById(item_source_id);
          if (!m) return res.status(404).json({ message: 'Manual charge item not found.' });
          unit_price = m.defaultPrice;
          desc = m.itemName;
        }
      } else {
        if (!it.unit_price || it.unit_price <= 0) return res.status(400).json({ message: 'Unit price must be greater than zero for manual charges.' });
        unit_price = it.unit_price;
        desc = description || 'Custom charge';
      }

      const sub_total = unit_price * quantity;
      total += sub_total;

      processed.push({
        item_type,
        item_source_id,
        description: desc,
        quantity,
        unit_price,
        sub_total
      });
    }

    const bill = new Bill({
      patient_id_ref,ipd_admission_id_ref,
      items: processed, total_amount: total,
      balance_due: total, generated_by_user_id
    });
    await bill.save();

    if (billedProcedureIds.length > 0) {
      await ProcedureSchedule.updateMany(
        { _id: { $in: billedProcedureIds } },
        { isBilled: true }
      );
    }
    res.status(201).json({ message: 'Bill created.', bill });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getBillById = async (req, res) => {
  try {
    const bill = await Bill
      .findById(req.params.id)
     .populate({
        path: 'patient_id_ref',
        select: 'fullName' 
      })
      .populate({
        path: 'generated_by_user_id',
        select: 'name' 
      })
      .populate('patient_id_ref  ipd_admission_id_ref generated_by_user_id');
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });
    res.json({ bill });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getBillsByPatient = async (req, res) => {
  try {
    const bills = await Bill.find({ patient_id_ref: req.params.patientId }).sort({ bill_date: -1 });
    res.json({ bills });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.addPaymentToBill = async (req, res) => {
  try {
    const { bill_id_ref, amount_paid, payment_method, external_reference_number, received_by_user_id_ref } = req.body;
    if (!bill_id_ref || !amount_paid || !payment_method || !received_by_user_id_ref) {
      return res.status(400).json({ message: 'Missing payment info.' });
    }

    const bill = await Bill.findById(bill_id_ref);
    if (!bill) return res.status(404).json({ message: 'Bill not found.' });

    bill.amount_paid += amount_paid;
    bill.balance_due = bill.total_amount - bill.amount_paid;
    if(bill.amount_paid>=bill.total_amount) bill.amount_paid = bill.total_amount;
    bill.payment_status = bill.amount_paid == bill.total_amount ? 'Paid' : 'Partial';
    await bill.save();

    const payment = new Payment({
      bill_id_ref, amount_paid, payment_method,
      external_reference_number,
       received_by_user_id_ref
    });
    await payment.save();
    await payment.populate('received_by_user_id_ref', 'name role');
    res.status(201).json({ message: 'Payment recorded.', payment, updatedBill: bill });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getPaymentsForBill = async (req, res) => {
  try {
    const payments = await Payment
      .find({ bill_id_ref: req.params.billId })
      .populate('received_by_user_id_ref', 'name role');
    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
};
// GET /api/billing/pending-patients
// returns list of patients with bills that are not fully paid
exports.getPendingBillPatients = async (req, res) => {
  try {
    const bills = await Bill.find({
      payment_status: { $in: ["Pending", "Partial"] }
    }).populate("patient_id_ref", "fullName");

    // get unique patients from these bills
    const uniquePatients = [...new Map(
      bills.map(b => [b.patient_id_ref._id.toString(), b.patient_id_ref])
    ).values()];

    res.json({ patients: uniquePatients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};
