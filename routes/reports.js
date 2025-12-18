// const express = require('express');
// const router = express.Router();
// const {  getMonthlyOPDIPDReportHandler
//  } = require('../controllers/reports');

// // router.get('/opd-register', getCentralOPDRegister);
// // router.get('/opd-register/department-wise', getDepartmentWiseOPDRegister);
// // router.get('/opd-register/new-vs-old', getNewVsOldOPDPatients);
// // router.get('/opd-register/doctor-wise', getDoctorWiseOPDRegister);
// // router.get('/ipd-register/central', getCentralIPDRegister);
// // router.get('/ipd-register/department-wise', getDepartmentWiseIPDRegister);
// // router.get('/procedures/ot-register',getOTProcedureRegister);
// // router.get('/anesthesia-register', getAnesthesiaRegister);
// // router.get('/ot-fumigation-report', getOTFumigationReport);
// // router.get('/birth-records', getBirthRecordReport);
// // router.get('/billing-summary', getBillingSummaryReport);
// // router.get('/payment-reconciliation', getPaymentReconciliationReport);

// router.get('/monthly-opd-ipd-report', getMonthlyOPDIPDReportHandler);



// module.exports = router;
const express = require('express');
const router = express.Router();
const { getCentralOPDRegister,getDepartmentWiseOPDRegister,getNewVsOldOPDPatients,getDoctorWiseOPDRegister,
    getCentralIPDRegister,getDepartmentWiseIPDRegister,getOTProcedureRegister,getAnesthesiaRegister,getOTFumigationReport,
    getBirthRecordReport,getBillingSummaryReport,getPaymentReconciliationReport
 } = require('../controllers/reports');

router.get('/opd-register', getCentralOPDRegister);
router.get('/opd-register/department-wise', getDepartmentWiseOPDRegister);
router.get('/opd-register/new-vs-old', getNewVsOldOPDPatients);
router.get('/opd-register/doctor-wise', getDoctorWiseOPDRegister);
router.get('/ipd-register/central', getCentralIPDRegister);
router.get('/ipd-register/department-wise', getDepartmentWiseIPDRegister);
router.get('/procedures/ot-register',getOTProcedureRegister);
router.get('/anesthesia-register', getAnesthesiaRegister);
// router.get('/ot-fumigation-report', getOTFumigationReport);
router.get('/birth-records', getBirthRecordReport);
router.get('/billing-summary', getBillingSummaryReport);
router.get('/payment-reconciliation', getPaymentReconciliationReport);





module.exports = router;