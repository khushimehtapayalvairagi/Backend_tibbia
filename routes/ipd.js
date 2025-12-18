const express = require('express');
const router = express.Router();
const ipdController = require('../controllers/IPDAdmission');

router.post('/admissions', ipdController.createIPDAdmission);
router.get('/admissions/:patientId', ipdController.getIPDAdmissionsByPatient);
router.put('/admissions/:id/discharge', ipdController.dischargeIPDAdmission);
router.post('/reports', ipdController.createDailyProgressReport);
router.get('/reports', ipdController.getDailyReportsByAdmission);

module.exports = router;
