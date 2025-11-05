const express = require("express");
const {registerPatientHandler,getAllPatientsHandler,getPatientByIdHandler,createVisitHandler,getVisitsByPatientHandler
        , getPrescriptionsByPatientHandler,getAvailableDoctorsHandler,getActivePatientsHandler,getUnbilledProceduresForPatientHandler,addPrescriptionHandler}= require("../controllers/receptionist")
const{getAllSpecialtiesHandler, getAllProceduresHandler,getAllWardsHandler,getAllOperationTheatersHandler,getAllRoomCategoriesHandler,getAllReferralPartnersHandler, getAllDoctorsHandler,getAllLabourRoomsHandler,getAllDepartmentsHandler,} = require("../controllers/admin")
        const router = express.Router();

router.post('/patients', registerPatientHandler);
router.get('/patients', getAllPatientsHandler);
router.get('/patients/:id', getPatientByIdHandler);
router.get('/specialties', getAllSpecialtiesHandler);
router.get('/departments',getAllDepartmentsHandler);
router.get('/doctors-available', getAvailableDoctorsHandler);
router.post('/visits',  createVisitHandler);
router.get('/visits/:patientId',  getVisitsByPatientHandler);
router.get('/prescriptions/:patientId', getPrescriptionsByPatientHandler);

router.get('/wards', getAllWardsHandler);
router.get('/room-categories', getAllRoomCategoriesHandler);
router.get('/referral-partners', getAllReferralPartnersHandler);
router.get('/operation-theaters', getAllOperationTheatersHandler);
router.get('/procedures', getAllProceduresHandler);
router.get('/labour-rooms', getAllLabourRoomsHandler);
router.get('/patients/active', getActivePatientsHandler);
router.get('/procedures/unbilled/:patientId', getUnbilledProceduresForPatientHandler);
router.put('/visits/:visitId/prescription', addPrescriptionHandler);


module.exports = router;