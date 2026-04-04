const express = require("express");
const {registerHandler,getAllUsersHandler,createDepartmentHandler
    ,getAllDepartmentsHandler,createSpecialtyHandler,getAllSpecialtiesHandler,createRoomCategoryHandler
    ,getAllRoomCategoriesHandler,createWardHandler,getAllWardsHandler,createLabourRoomHandler,getAllLabourRoomsHandler
    ,createProcedureHandler,getAllProceduresHandler,createManualChargeItemHandler,getAllManualChargeItemsHandler
    ,getAllStaffHandler,getStaffByIdHandler,getAllDoctorsHandler,getDoctorByIdHandler
    ,createReferralPartnerHandler,getAllReferralPartnersHandler,createOperationTheaterHandler
    ,getAllOperationTheatersHandler,deleteUserHandler}  = require("../controllers/admin")
const {createInventoryItem} = require('../controllers/inventoryManager');
const router = express.Router();


router.post('/items', createInventoryItem);
router.post('/users', registerHandler); 
router.get('/users', getAllUsersHandler);
router.delete('/users',deleteUserHandler);
router.post('/departments',createDepartmentHandler);
router.get('/departments',getAllDepartmentsHandler);
router.post('/specialties', createSpecialtyHandler);
router.get('/specialties', getAllSpecialtiesHandler);
router.post('/room-categories', createRoomCategoryHandler);
router.get('/room-categories', getAllRoomCategoriesHandler);
router.post('/wards', createWardHandler);
router.get('/wards', getAllWardsHandler);
router.post('/labour-rooms', createLabourRoomHandler);
router.get('/labour-rooms', getAllLabourRoomsHandler);
router.post('/procedures', createProcedureHandler);
router.get('/procedures', getAllProceduresHandler);
router.post('/manual-charge-items', createManualChargeItemHandler);
router.get('/manual-charge-items', getAllManualChargeItemsHandler);
router.get('/staff', getAllStaffHandler);
router.get('/staff/:id', getStaffByIdHandler);
router.get('/doctors', getAllDoctorsHandler);
 router.get('/doctors/:id', getDoctorByIdHandler);
router.post('/referral-partners', createReferralPartnerHandler);
router.get('/referral-partners', getAllReferralPartnersHandler);
router.post('/operation-theaters', createOperationTheaterHandler);
router.get('/operation-theaters', getAllOperationTheatersHandler);




module.exports = router;