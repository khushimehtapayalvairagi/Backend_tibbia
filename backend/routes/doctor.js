const express = require('express');
const router = express.Router();

const { 
    createOPDConsultationHandler,getPatientOPDConsultationsHandler,getAssignedVisitsForDoctorHandler} = require('../controllers/doctor');

router.get('/visits/doctor/:doctorId', getAssignedVisitsForDoctorHandler);

router.post('/opd-consultations', createOPDConsultationHandler);
router.get('/opd-consultations/:patientId', getPatientOPDConsultationsHandler);

module.exports = router;