const Patient = require('../models/Patient');
const Visit = require('../models/Visit');
const ReferralPartner = require('../models/ReferralPartner');
const Doctor = require('../models/Doctor');
const Specialty = require('../models/Specialty')
const ProcedureSchedule = require('../models/ProcedureSchedule');

const {  getIO } = require('../utils/sockets');


const generatePatientId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `HSP${year}${month}${day}${hours}${minutes}${seconds}`;
};

const registerPatientHandler = async (req, res) => {
  try {
    const { fullName, gender, age, address, dob, contactNumber, email, aadhaarNumber, relatives } = req.body;

    // Required fields
    if (!fullName || !gender || !age || !address) {
      return res.status(400).json({ message: "Name, Gender, Age, and Address are required." });
    }

    // Optional validations
    if (contactNumber && contactNumber.length !== 10) {
      return res.status(400).json({ message: "Contact number must be exactly 10 digits." });
    }

    if (aadhaarNumber && aadhaarNumber.length !== 12) {
      return res.status(400).json({ message: "Aadhaar number must be exactly 12 digits." });
    }

    if (relatives && relatives.length > 3) {
      return res.status(400).json({ message: "Maximum of 3 relatives allowed." });
    }

    const patientId = generatePatientId(); // your function

    const patientData = {
      patientId,
      fullName,
      dob: dob || null,
      age,
      gender,
      contactNumber: contactNumber || null,
      email: email || null,
      address,
      aadhaarNumber: aadhaarNumber?.trim() || undefined, // undefined avoids null conflicts
      relatives: relatives?.length ? relatives : []
    };

    const patient = new Patient(patientData);
    await patient.save();

    res.status(201).json({ message: "Patient registered successfully.", patient });

  } catch (error) {
    console.error("Register Patient Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate Aadhaar number detected." });
    }
    res.status(500).json({ message: "Server error." });
  }
};
const getAllPatientsHandler = async (req, res) => {
    try {
        const patients = await Patient.find();
        res.status(200).json({ patients });
    } catch (error) {
        console.error('Fetch Patients Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getPatientByIdHandler = async (req, res) => {
    try {
        const { id } = req.params;
      
        const patient = await Patient.findOne({ patientId: id });

        if (!patient) {
            return res.status(404).json({ message: 'Patient not found.' });
        }

        res.status(200).json({ patient });
    } catch (error) {
        console.error('Fetch Patient By patientId Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};
// const getAvailableDoctorsHandler = async (req, res) => {
//   try {
//     const { specialtyName } = req.body;

//     if (!specialtyName) {
//       return res.status(400).json({
//         message: "specialtyName is required in the body.",
//       });
//     }

//     console.log("🔍 Checking available doctors for specialty:", specialtyName);

//     const specialty = await Specialty.findOne({
//       name: { $regex: new RegExp(`^${specialtyName}$`, "i") },
//     });

//     if (!specialty) {
//       return res.status(404).json({
//         message: `Specialty not found: ${specialtyName}`,
//       });
//     }

//     // ✅ Fetch all doctors with this specialty — ignore schedule
//     const doctors = await Doctor.find({ specialty: specialty._id, isActive: true })
//       .populate("userId", "name email role")
//       .populate("specialty", "name")
//       .populate("department", "name");

//     if (doctors.length === 0) {
//       return res.status(200).json({
//         message: "No doctors available for this specialty.",
//         doctors: [],
//       });
//     }

//     // ✅ Map to simplified structure for frontend
//     const doctorList = doctors.map((doc) => ({
//       doctorId: doc._id,
//       name: doc.userId?.name,
//       specialty: doc.specialty?.name,
//       department: doc.department?.name,
//       email: doc.userId?.email,
//     }));

//     return res.status(200).json({
//       message: "Doctors fetched successfully.",
//       doctors: doctorList,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching available doctors:", error.message);
//     res.status(500).json({
//       message: "Error fetching doctors.",
//       error: error.message,
//     });
//   }
// };

// controllers/receptionist.js

// ✅ Fixed version — getAvailableDoctorsHandler
// ✅ FIXED getAvailableDoctorsHandler
const getAvailableDoctorsHandler = async (req, res) => {
 try {
    const doctors = await Doctor.find({ isActive: true })
      .populate('userId', 'name email') // get doctor's name
      .populate('specialty', 'name');   // get specialty name

    if (!doctors.length) {
      return res.status(200).json({ doctors: [], message: "No doctors found." });
    }

    res.status(200).json({ doctors });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ message: "Server error while fetching doctors." });
  }
};










const createVisitHandler = async (req, res) => {
  try {
    const { patientId, patientDbId, visitType, assignedDoctorId, referredBy, payment } = req.body;

    // generate receipt number based on date + count
    const today = new Date().toISOString().slice(0,10).replace(/-/g,""); // 20250923
    const countToday = await Visit.countDocuments({
      createdAt: {
        $gte: new Date().setHours(0,0,0,0),
        $lt: new Date().setHours(23,59,59,999)
      }
    });

    const receiptNumber = `${today}-${String(countToday + 1).padStart(3, '0')}`;
// const doctor = await Doctor.findById(assignedDoctorId).populate('userId', 'name');
let doctor = await Doctor.findById(assignedDoctorId).populate('userId', 'name');
if (!doctor) {
  doctor = await Doctor.findOne({ _id: assignedDoctorId }).populate('userId', 'name');
}
if (!doctor) {
  return res.status(404).json({ message: "Doctor not found" });
}

    const visit = new Visit({
   patientId: patientId.trim(),
      patientDbId,
      visitType,
      assignedDoctorId,
      referredBy,
      payment,
      receiptNumber,
        doctorName: doctor.userId.name,
         visitDate: new Date(),
    });

    await visit.save();
    res.status(201).json({ message: "Visit created", visit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating visit" });
  }
};
const addPrescriptionHandler = async (req, res) => {
  try {
    const { visitId } = req.params;
    const { consultationNotes, prescription } = req.body;

    const visit = await Visit.findById(visitId);
    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    if (consultationNotes) visit.consultationNotes = consultationNotes;
    if (Array.isArray(prescription)) visit.prescription = prescription;

    await visit.save();
    res.status(200).json({ message: 'Prescription saved successfully', visit });
  } catch (error) {
    console.error('Prescription save error:', error);
    res.status(500).json({ message: 'Error saving prescription' });
  }
};


const getVisitsByPatientHandler = async (req, res) => {
    try {
        const { patientId } = req.params;

       const visits = await Visit.find({ patientId: patientId.trim() })
            .sort({ visitDate: -1 })
          
           .populate({
    path: 'assignedDoctorId',
    model: 'Doctor',
    populate: {
      path: 'userId',
      model: 'User',
      select: 'name email'
    }
  })

            .populate({
                path: 'referredBy',
                select: 'name contact_person contact_number' 
            })
           
        res.status(200).json({ visits });
    } catch (error) {
        console.error('Fetch Visits Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};
// ✅ Get prescription by visit ID
// ✅ Get all prescriptions for a specific patient
const getPrescriptionsByPatientHandler = async (req, res) => {
  try {
    const { patientId } = req.params;

    const visits = await Visit.find({
      patientId: patientId.trim(),
      prescription: { $exists: true, $ne: [] }
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'assignedDoctorId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate({
        path: 'patientDbId',
        select: 'fullName age gender patientId contactNumber address',
      });

    if (!visits.length) {
      return res.status(404).json({ message: 'No prescriptions found for this patient.' });
    }

    res.status(200).json({
      message: 'Patient prescriptions fetched successfully',
      prescriptions: visits,
    });
  } catch (error) {
    console.error('Fetch patient prescriptions error:', error);
    res.status(500).json({ message: 'Error fetching prescriptions.' });
  }
};


// const updateVisitStatusHandler = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { newStatus, declineReason } = req.body;

//         const allowedStatuses = ['Waiting', 'Declined', 'Completed'];

//         if (!newStatus || !allowedStatuses.includes(newStatus)) {
//             return res.status(400).json({ message: `Invalid status. Allowed statuses: ${allowedStatuses.join(', ')}` });
//         }

//         if (newStatus === 'Declined' && (!declineReason || declineReason.trim() === '')) {
//             return res.status(400).json({ message: 'declineReason is required when visit is declined.' });
//         }

//         const visit = await Visit.findById(id).populate('patientDbId');
//         if (!visit) {
//             return res.status(404).json({ message: 'Visit not found.' });
//         }

//         visit.status = newStatus;

//         if (newStatus === 'Declined') {
//             visit.declineReason = declineReason.trim();
//         } else {
//             visit.declineReason = undefined;
//         }
//         await visit.save();
//         if (newStatus === 'Waiting') {

//             getIO().to(`doctor_${visit.assignedDoctorId}`).emit('newAssignedPatient', {
//                 doctorId: visit.assignedDoctorId,
//                 visitId: visit._id,
//                 patientName: visit.patientDbId.fullName || 'New patient',
//             });
//         }
//         res.status(200).json({ message: 'Visit status updated successfully.', visit });
//     } catch (error) {
//         console.error('Update Visit Status Error:', error);
//         res.status(500).json({ message: 'Server error.' });
//     }
// };

const getActivePatientsHandler = async (req, res) => {
  try {
    const activePatients = await Patient.find({ status: 'Active' })
      .sort({ updatedAt: -1 })
      .select('fullName contactNumber email status');

    res.status(200).json({ patients: activePatients });
  } catch (error) {
    console.error('Get Active Patients Error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};



const getUnbilledProceduresForPatientHandler = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required.' });
    }

    const schedules = await ProcedureSchedule.find({
      patientId,
      isBilled: false
    }).populate('procedureId surgeonId');

    res.status(200).json({ unbilledProcedures: schedules });
  } catch (error) {
    console.error('Fetch Unbilled Procedures Error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};




module.exports = {registerPatientHandler,getAllPatientsHandler,getPatientByIdHandler,createVisitHandler,getVisitsByPatientHandler, getPrescriptionsByPatientHandler
                ,getAvailableDoctorsHandler,getActivePatientsHandler,getUnbilledProceduresForPatientHandler,addPrescriptionHandler}