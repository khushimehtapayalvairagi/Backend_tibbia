const express = require('express');
const router = express.Router();
const procedureController = require('../controllers/procedure');


router.post('/schedules', procedureController.scheduleProcedure);
router.get('/schedules/:patientId', procedureController.getSchedulesByPatient);
// router.put('/schedules/:id/status', procedureController.updateProcedureStatus);

router.post('/anesthesia-records', procedureController.createAnesthesiaRecord);
router.get('/anesthesia-records/:procedureScheduleId', procedureController.getAnesthesiaRecord);

router.post('/labour-details', procedureController.createLabourRoomDetail);
router.get('/labour-details/:procedureScheduleId', procedureController.getLabourRoomDetail);

module.exports = router;
