const express = require('express');
const router = express.Router();
const billing = require('../controllers/billing');
 const {getAllManualChargeItemsHandler}= require("../controllers/admin")
  const { getSchedulesByPatient}= require("../controllers/procedure")
router.post('/bills', billing.createBill);
router.get('/bills/:id', billing.getBillById);
router.get('/bills/patient/:patientId', billing.getBillsByPatient);
router.get('/pending-patients', billing.getPendingBillPatients);
router.post('/payments', billing.addPaymentToBill);
router.get('/payments/:billId', billing.getPaymentsForBill);
router.get('/manual-charge-items', getAllManualChargeItemsHandler);
router.get('/schedules/:patientId', getSchedulesByPatient);
module.exports = router;
