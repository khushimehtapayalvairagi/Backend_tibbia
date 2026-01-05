const OPDConsultation = require('../models/OPDConsultation');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const IPDAdmission = require('../models/IPDAdmission');
const ProcedureSchedule = require('../models/ProcedureSchedule');
const Department = require('../models/Department');

const AnesthesiaRecord = require('../models/AnesthesiaRecord');
const FumigationEntry = require('../models/FumigationEntry');
const LabourRoomDetail = require('../models/LabourRoomDetail');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');


exports.getCentralOPDRegister = async (req, res) => {
  try {
    const { startDate, endDate, doctorId, specialtyId } = req.query;

    const query = {};

    // Date filter
    if (startDate && endDate) {
      query.consultationDateTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Doctor + Specialty filter
    if (doctorId && specialtyId) {
      const doctors = await Doctor.find(
        { specialty: specialtyId },
        "_id"
      );

      const validDoctorIds = doctors.map(doc => doc._id.toString());

      if (validDoctorIds.includes(doctorId)) {
        query.doctorId = doctorId;
      } else {
        return res.status(200).json({ consultations: [] });
      }

    } else if (doctorId) {
      query.doctorId = doctorId;

    } else if (specialtyId) {
      const doctors = await Doctor.find(
        { specialty: specialtyId },
        "_id"
      );

      const doctorIds = doctors.map(doc => doc._id);
      query.doctorId = { $in: doctorIds };
    }

    const consultations = await OPDConsultation.find(query)
      .populate({
        path: 'visitId',
        populate: [
          {
            path: 'assignedDoctorId',
            populate: { path: 'userId', select: 'name email' }
          },
          { path: 'referredBy', select: 'name contactNumber' }
        ]
      })
      .populate({
        path: 'patientId',
        select: 'patientId fullName age gender address phone status'
      })
      .populate({
        path: 'doctorId',
        populate: [
          { path: 'userId', select: 'name email' },
          { path: 'specialty', select: 'name' }
        ]
      })
      .populate({
        path: 'transcribedByUserId',
        select: 'name role email'
      })
      .sort({ consultationDateTime: -1 });

    res.status(200).json({ consultations });

  } catch (error) {
    console.error('Central OPD Report Error:', error);
    res.status(500).json({
      message: 'Server error while generating OPD register.'
    });
  }
};




// exports.getDepartmentWiseOPDRegister = async (req, res) => {
//   try {
//     const { startDate, endDate, departmentId } = req.query;

//     const dateFilter = {};
//     if (startDate && endDate) {
//       dateFilter.consultationDateTime = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate),
//       };
//     }

  
//     let doctorQuery = {};
//     if (departmentId) {
//       doctorQuery.department = departmentId;
//     }
//     const doctors = await Doctor.find(doctorQuery).select('_id department').populate('department');
//     const doctorMap = {};
//     const doctorIds = doctors.map(doc => {
//       doctorMap[doc._id.toString()] = doc.department;
//       return doc._id;
//     });

//     const consultations = await OPDConsultation.find({
//       ...dateFilter,
//       doctorId: { $in: doctorIds }
//     })
//       .populate({
//         path: 'patientId',
//         select: 'fullName age gender patientId'
//       })
//       .populate({
//         path: 'doctorId',
//         populate: [
//           { path: 'userId', select: 'name email' },
//           { path: 'department', select: 'name' },
//           { path: 'specialty', select: 'name' }
//         ]
//       })
//       .sort({ consultationDateTime: -1 });

 
//     const departmentGroups = {};
//     consultations.forEach(c => {
//       const deptName = c.doctorId?.department?.name || 'Unknown';
//       if (!departmentGroups[deptName]) {
//         departmentGroups[deptName] = [];
//       }
//       departmentGroups[deptName].push(c);
//     });

//     res.status(200).json({ departmentWiseRegister: departmentGroups });
//   } catch (error) {
//     console.error('Department-wise OPD Report Error:', error);
//     res.status(500).json({ message: 'Server error while generating department-wise OPD register.' });
//   }
// };

exports.getDepartmentWiseOPDRegister = async (req, res) => {
  try {
    const { startDate, endDate, specialtyId } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.consultationDateTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Step 1: Find doctors by specialty (if provided)
    let doctorQuery = {};
    if (specialtyId) {
      doctorQuery.specialty = specialtyId;
    }

    const doctors = await Doctor.find(doctorQuery)
      .select('_id specialty')
      .populate('specialty', 'name');

    const doctorIds = doctors.map(doc => doc._id);

    // Step 2: Fetch OPD consultations
    const consultations = await OPDConsultation.find({
      ...dateFilter,
      doctorId: { $in: doctorIds }
    })
      .populate({
        path: 'patientId',
        select: 'fullName age gender patientId'
      })
      .populate({
        path: 'doctorId',
        populate: [
          { path: 'userId', select: 'name email' },
          { path: 'specialty', select: 'name' }
        ]
      })
      .sort({ consultationDateTime: -1 });

    // Step 3: Group consultations by specialty
    const specialtyGroups = {};

    consultations.forEach(c => {
      const specialtyName =
        c.doctorId?.specialty?.name || 'Unknown Specialty';

      if (!specialtyGroups[specialtyName]) {
        specialtyGroups[specialtyName] = [];
      }

      specialtyGroups[specialtyName].push(c);
    });

    res.status(200).json({
      specialtyWiseRegister: specialtyGroups
    });

  } catch (error) {
    console.error('Specialty-wise OPD Report Error:', error);
    res.status(500).json({
      message: 'Server error while generating specialty-wise OPD register.'
    });
  }
};



exports.getNewVsOldOPDPatients = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const consultationsInRange = await OPDConsultation.find({
      consultationDateTime: { $gte: start, $lte: end }
    }).select('patientId consultationDateTime');

    const patientIds = [...new Set(consultationsInRange.map(c => c.patientId.toString()))];

    let newCount = 0;
    let oldCount = 0;

    for (const pid of patientIds) {
      const firstVisit = await OPDConsultation.findOne({ patientId: pid })
        .sort({ consultationDateTime: 1 })
        .select('consultationDateTime');

      if (!firstVisit) continue;

      if (firstVisit.consultationDateTime >= start && firstVisit.consultationDateTime <= end) {
        newCount++;
      } else {
        oldCount++;
      }
    }

    res.status(200).json({
      totalConsultations: consultationsInRange.length,
      uniquePatients: patientIds.length,
      newPatients: newCount,
      oldPatients: oldCount
    });
  } catch (error) {
    console.error('New vs Old OPD Patient Report Error:', error);
    res.status(500).json({ message: 'Server error while generating new vs old patient report.' });
  }
};


exports.getDoctorWiseOPDRegister = async (req, res) => {
  try {
    const { startDate, endDate, specialtyId } = req.query;

    // Doctor filter
    const doctorFilter = {};
    if (specialtyId) {
      doctorFilter.specialty = specialtyId;
    }

    // Fetch doctors
    const doctors = await Doctor.find(doctorFilter)
      .populate('userId', 'name email')
      .populate('specialty', 'name');

    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
    const end = endDate ? new Date(endDate) : new Date();

    const results = [];

    for (const doctor of doctors) {
      const consultations = await OPDConsultation.find({
        doctorId: doctor._id,
        consultationDateTime: { $gte: start, $lte: end }
      })
        .populate('patientId', 'fullName patientId')
        .select('consultationDateTime chiefComplaint diagnosis patientId');

      if (consultations.length > 0) {
       results.push({
  doctor: { _id: doctor._id, name: doctor.userId?.name || "N/A", specialty: doctor.specialty?.name || "N/A" },
  totalConsultations: consultations.length,
  consultations // can be empty
});

      }
    }

    res.status(200).json(results);

  } catch (error) {
    console.error('Doctor-wise OPD Report Error:', error);
    res.status(500).json({
      message: 'Server error while generating doctor-wise OPD report.'
    });
  }
};



exports.getCentralIPDRegister = async (req, res) => {
  console.log("📥 Query received:", req.query);

  try {
    const { startDate, endDate, specialtyId, doctorId } = req.query;
    const match = {};

    // Date filter
    if (startDate || endDate) {
      match.admissionDate = {};
      if (startDate) match.admissionDate.$gte = new Date(startDate);
      if (endDate) match.admissionDate.$lte = new Date(endDate);
    }

    // Doctor filter (from userId → Doctor._id)
    if (doctorId) {
      const doctor = await Doctor.findOne({ userId: doctorId });
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      match.admittingDoctorId = doctor._id;
    }

    // Specialty filter
    if (specialtyId) {
      const doctorsInSpecialty = await Doctor.find({
        specialty: specialtyId
      }).select('_id');

      match.admittingDoctorId = {
        $in: doctorsInSpecialty.map(doc => doc._id)
      };
    }

    const admissions = await IPDAdmission.find(match)
      .populate('patientId', 'fullName patientId')
      .populate({
        path: 'admittingDoctorId',
        populate: [
          { path: 'userId', select: 'name' },
          { path: 'specialty', select: 'name' }
        ]
      })
      .populate('wardId', 'name')
      .populate('roomCategoryId', 'name')
      .sort({ admissionDate: -1 });

    console.log('🧠 Raw Doctor Data:', admissions.map(a => ({
      admissionId: a._id,
      doctorId: a.admittingDoctorId?._id,
      populatedUserId: a.admittingDoctorId?.userId,
      doctorName: a.admittingDoctorId?.userId?.name,
      specialtyName: a.admittingDoctorId?.specialty?.name,
    })));

    const result = admissions.map(ad => ({
      _id: ad._id,
      admissionDate: ad.admissionDate,
      expectedDischargeDate: ad.expectedDischargeDate,
      actualDischargeDate: ad.actualDischargeDate,
      status: ad.status,
      bedNumber: ad.bedNumber,
      patient: ad.patientId,
      doctor: ad.admittingDoctorId
        ? {
            _id: ad.admittingDoctorId._id,
            name: ad.admittingDoctorId.userId?.name,
            specialty: ad.admittingDoctorId.specialty?.name
          }
        : null,
      ward: ad.wardId,
      roomCategory: ad.roomCategoryId
    }));

    res.status(200).json(result);

  } catch (error) {
    console.error('Central IPD Register Error:', error);
    res.status(500).json({
      message: 'Server error while generating Central IPD Register.'
    });
  }
};



// exports.getDepartmentWiseIPDRegister = async (req, res) => {
//   try {
//   const { startDate, endDate, departmentId } = req.query;

//     const match = {};
//     if (startDate || endDate) {
//       match.admissionDate = {};
//       if (startDate) match.admissionDate.$gte = new Date(startDate);
//       if (endDate) match.admissionDate.$lte = new Date(endDate);
//     }

//     const admissions = await IPDAdmission.find(match)
//       .populate('patientId', 'fullName patientId')
//       .populate({
//         path: 'admittingDoctorId',
//         populate: [
//           { path: 'userId', select: 'name' },
//           { path: 'department', select: 'name' }
//         ]
//       });

//     const deptMap = {};

//     for (const ad of admissions) {
//       const dept = ad.admittingDoctorId?.department;
//       const deptId = dept?._id?.toString();
//       const deptName = dept?.name || 'Unknown';

//       if (!deptMap[deptId]) {
//         deptMap[deptId] = {
//           department: deptName,
//           departmentId: deptId,
//           totalAdmissions: 0,
//           admissions: []
//         };
//       }

//       deptMap[deptId].totalAdmissions += 1;

//       deptMap[deptId].admissions.push({
//         _id: ad._id,
//         admissionDate: ad.admissionDate,
//         status: ad.status,
//         bedNumber: ad.bedNumber,
//         patient: ad.patientId,
//         doctor: ad.admittingDoctorId
//           ? {
//               _id: ad.admittingDoctorId._id,
//               name: ad.admittingDoctorId.userId?.name
//             }
//           : null
//       });
//     }

//     res.status(200).json(Object.values(deptMap));
//   } catch (error) {
//     console.error('Department-wise IPD Register Error:', error);
//     res.status(500).json({ message: 'Server error generating department-wise IPD register.' });
//   }
// };
exports.getDepartmentWiseIPDRegister = async (req, res) => {
  try {
    const { startDate, endDate, specialtyId } = req.query;

    const match = {};
    if (startDate || endDate) {
      match.admissionDate = {};
      if (startDate) match.admissionDate.$gte = new Date(startDate);
      if (endDate) match.admissionDate.$lte = new Date(endDate);
    }

    // Fetch IPD admissions
    const admissions = await IPDAdmission.find(match)
      .populate('patientId', 'fullName patientId')
        .populate('wardId', 'name')
      .populate({
        path: 'admittingDoctorId',
        populate: [
          { path: 'userId', select: 'name' },
          { path: 'specialty', select: 'name' }
        ]
      });

    const specialtyMap = {};

    for (const ad of admissions) {
      const specialty = ad.admittingDoctorId?.specialty;
      const specialtyIdKey = specialty?._id?.toString();
      const specialtyName = specialty?.name || 'Unknown Specialty';

      if (!specialtyMap[specialtyIdKey]) {
        specialtyMap[specialtyIdKey] = {
          specialty: specialtyName,
          specialtyId: specialtyIdKey,
          totalAdmissions: 0,
          admissions: []
        };
      }

      specialtyMap[specialtyIdKey].totalAdmissions += 1;

      specialtyMap[specialtyIdKey].admissions.push({
        _id: ad._id,
        admissionDate: ad.admissionDate,
        status: ad.status,
        bedNumber: ad.bedNumber,
        patient: ad.patientId,
         ward: ad.wardId
    ? {
        _id: ad.wardId._id,
        name: ad.wardId.name
      }
    : null,
        doctor: ad.admittingDoctorId
          ? {
              _id: ad.admittingDoctorId._id,
              name: ad.admittingDoctorId.userId?.name
            }
          : null
          
      });
    }
            
    res.status(200).json(Object.values(specialtyMap));

  } catch (error) {
    console.error('Specialty-wise IPD Register Error:', error);
    res.status(500).json({
      message: 'Server error generating specialty-wise IPD register.'
    });
  }
};



exports.getOTProcedureRegister = async (req, res) => {
  try {
    const { startDate, endDate, status, surgeonId, specialtyId } = req.query;

    const match = { procedureType: 'OT' };

    if (status) match.status = status;
    if (surgeonId) match.surgeonId = surgeonId;

    if (startDate || endDate) {
      match.scheduledDateTime = {};
      if (startDate) match.scheduledDateTime.$gte = new Date(startDate);
      if (endDate) match.scheduledDateTime.$lte = new Date(endDate);
    }

    const schedules = await ProcedureSchedule.find(match)
      .populate('procedureId', 'name cost')
      .populate('patientId', 'fullName patientId')
      
      .populate({
        path: 'surgeonId',
        populate: [
          { path: 'userId', select: 'name' },
          { path: 'specialty', select: 'name' }
        ]
      });

    let result = schedules;

    // Specialty filter
    if (specialtyId) {
      result = schedules.filter(s =>
        s.surgeonId?.specialty?._id?.toString() === specialtyId
      );
    }

    const formatted = result.map(s => ({
      _id: s._id,
      scheduledDateTime: s.scheduledDateTime,
      status: s.status,
      procedure: s.procedureId,
      patient: s.patientId,
     surgeon: s.surgeonId
  ? {
      _id: s.surgeonId._id,
      name:
        s.surgeonId.userId?.name ||   // Doctor → User
        s.surgeonId.name ||           // If surgeonId is User
        "N/A"
    }
  : null,

      // specialty: s.surgeonId?.specialty
      //   ? {
      //       _id: s.surgeonId.specialty._id,
      //       name: s.surgeonId.specialty.name
      //     }
      //   : null
    }));

    res.status(200).json(formatted);

  } catch (error) {
    console.error('OT Procedure Register Error:', error);
    res.status(500).json({
      message: 'Error generating OT procedure register.'
    });
  }
};


exports.getAnesthesiaRegister = async (req, res) => {
  try {
    const { startDate, endDate, anestheticId } = req.query;
    const match = {};

    if (startDate || endDate) {
      match.induceTime = {};
      if (startDate) match.induceTime.$gte = new Date(startDate);
      if (endDate) match.induceTime.$lte = new Date(endDate);
    }

    if (anestheticId) match.anestheticId = anestheticId;

    const records = await AnesthesiaRecord.find(match)
      .populate({ path: "patientId", select: "fullName" })
      .populate({
        path: "anestheticId",
        populate: [
          { path: "userId", select: "name" },
          { path: "specialty", select: "name" }
        ]
      });

    const result = records.map(rec => ({
      _id: rec._id,
      patient: rec.patientId || null,
     anesthetist: rec.anestheticId
  ? {
      _id: rec.anestheticId._id,
      name:
        rec.anestheticId.userId?.name ||  // Doctor
        rec.anestheticId.name ||          // User
        "N/A",

    }
  : null,

      anesthesiaType: rec.anesthesiaType,
      anesthesiaName: rec.anesthesiaName,
      procedureType: rec.procedureType,
      induceTime: rec.induceTime,
      endTime: rec.endTime
    }));

    res.status(200).json(result);

  } catch (error) {
    console.error('Anesthesia Register Error:', error);
    res.status(500).json({
      message: "Error generating anesthesia register."
    });
  }
};









exports.getBirthRecordReport = async (req, res) => {
  try {
    const { startDate, endDate, gender, delivery_type } = req.query;

    const match = {};

    if (startDate || endDate) {
      match.dobBaby = {};
      if (startDate) match.dobBaby.$gte = new Date(startDate);
      if (endDate) match.dobBaby.$lte = new Date(endDate);
    }

  if (gender) {
  match.gender = { $regex: new RegExp(gender, 'i') }; // case-insensitive
}
if (delivery_type) {
  match.deliveryType = { $regex: new RegExp(delivery_type, 'i') };
}


    const records = await LabourRoomDetail.find(match)
      .populate('patientId', 'fullName age gender patientId')
      .populate('procedureScheduleId', 'scheduledDateTime procedureType')
      .populate('capturedByUserId', 'name role');

    // res.status(200).json(records);
    const count = await LabourRoomDetail.countDocuments(match);
res.status(200).json({ totalBirths: count });

  } catch (error) {
    console.error('Birth Record Report Error:', error);
    res.status(500).json({ message: 'Error generating birth record report.' });
  }
};



exports.getBillingSummaryReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const match = {};
    if (startDate || endDate) {
      match.bill_date = {};
      if (startDate) match.bill_date.$gte = new Date(startDate);
      if (endDate) match.bill_date.$lte = new Date(endDate);
    }

    const summary = await Bill.aggregate([
      { $match: match },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.item_type',
          totalAmount: { $sum: '$items.sub_total' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          breakdown: {
            $push: {
              type: '$_id',
              amount: '$totalAmount',
              count: '$count'
            }
          },
          grandTotal: { $sum: '$totalAmount' }
        }
      },
      {
        $project: {
          _id: 0,
          breakdown: 1,
          grandTotal: 1
        }
      }
    ]);

    const paymentStatusBreakdown = await Bill.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$payment_status',
          totalAmount: { $sum: '$total_amount' }
        }
      }
    ]);

    // res.status(200).json({
    //   summary: summary[0] || { breakdown: [], grandTotal: 0 },
    //   paymentStatusBreakdown
    // });
    res.status(200).json({
  totalAmount: summary[0]?.grandTotal || 0,
  paymentStatusBreakdown
});

  } catch (error) {
    console.error('Billing Summary Error:', error);
    res.status(500).json({ message: 'Error generating billing summary report.' });
  }
};



exports.getPaymentReconciliationReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const match = {};
    if (startDate || endDate) {
      match.payment_date = {};
      if (startDate) match.payment_date.$gte = new Date(startDate);
      if (endDate) match.payment_date.$lte = new Date(endDate);
    }

    const payments = await Payment.find(match)
      .populate('received_by_user_id_ref', 'name role')
      .populate('bill_id_ref', 'patient_id_ref total_amount payment_status');

    const methodBreakdown = {};
    const userBreakdown = {};
    let totalAmount = 0;

    for (const p of payments) {
      totalAmount += p.amount_paid;

      if (!methodBreakdown[p.payment_method]) methodBreakdown[p.payment_method] = 0;
      methodBreakdown[p.payment_method] += p.amount_paid;

  
      const user = p.received_by_user_id_ref?.name || 'Unknown';
      if (!userBreakdown[user]) userBreakdown[user] = 0;
      userBreakdown[user] += p.amount_paid;
    }

    res.status(200).json({
      totalReceived: totalAmount,
      methodBreakdown,
      userBreakdown,
      payments
    });
  } catch (error) {
    console.error('Payment Reconciliation Report Error:', error);
    res.status(500).json({ message: 'Failed to generate report.' });
  }
};
// controllers/reports.js
// const Visit = require("../models/Visit");
// const IPDAdmission = require("../models/IPDAdmission");
// const Doctor = require("../models/Doctor");
// const Department = require("../models/Department");
// const ProcedureSchedule = require("../models/ProcedureSchedule");

// exports.getMonthlyOPDIPDReportHandler = async (req, res) => {
//   try {
//     let { fromDate, toDate } = req.query;

//     if (!fromDate || !toDate) {
//       return res.status(400).json({ message: "fromDate and toDate are required" });
//     }

//     // ✅ Date normalization
//     fromDate = new Date(fromDate);
//     fromDate.setHours(0, 0, 0, 0);
//     toDate = new Date(toDate);
//     toDate.setHours(23, 59, 59, 999);

//     // Fetch departments
//     const departments = await Department.find().select("name").lean();
//     const deptNames = departments.map((d) => d.name);

//     // Fetch OPD visits
//     const opdVisits = await Visit.find({
//       visitType: "OPD",
//       visitDate: { $gte: fromDate, $lte: toDate },
//     }).populate({
//       path: "assignedDoctorId",
//       populate: { path: "department", select: "name" },
//     });

//     // Fetch IPD admissions
//     const ipdAdmissions = await IPDAdmission.find({
//       admissionDate: { $gte: fromDate, $lte: toDate },
//     }).populate({
//       path: "admittingDoctorId",
//       populate: { path: "department", select: "name" },
//     });

//     // Fetch procedures (Labour + OT)
//     const procedures = await ProcedureSchedule.find({
//       scheduledDateTime: { $gte: fromDate, $lte: toDate },
//     }).populate({
//       path: "surgeonId",
//       populate: { path: "department", select: "name" },
//     });

//     // Initialize counters
//     const opdCount = {};
//     const ipdCount = {};
//     const otCount = {};
//     const labourCount = {};
//     deptNames.forEach((d) => {
//       opdCount[d] = 0;
//       ipdCount[d] = 0;
//       otCount[d] = 0;
//       labourCount[d] = 0;
//     });

//     // OPD
//     opdVisits.forEach((v) => {
//       const deptName = v.assignedDoctorId?.department?.name;
//       if (deptName && deptNames.includes(deptName)) opdCount[deptName]++;
//     });

//     // IPD
//     ipdAdmissions.forEach((a) => {
//       const deptName = a.admittingDoctorId?.department?.name;
//       if (deptName && deptNames.includes(deptName)) ipdCount[deptName]++;
//     });

//     // Procedures
//     procedures.forEach((p) => {
//       const deptName = p.surgeonId?.department?.name;
//       if (!deptName || !deptNames.includes(deptName)) return;

//       if (p.procedureType === "OT") otCount[deptName]++;
//       else if (p.procedureType === "Labour Room") labourCount[deptName]++;
//     });

//     const opdTotal = Object.values(opdCount).reduce((a, b) => a + b, 0);
//     const ipdTotal = Object.values(ipdCount).reduce((a, b) => a + b, 0);
//     const otTotal = Object.values(otCount).reduce((a, b) => a + b, 0);
//     const labourTotal = Object.values(labourCount).reduce((a, b) => a + b, 0);

//     const daysCount = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) || 1;

//     res.status(200).json({
//       report: [
//         {
//           fromDate: fromDate.toISOString().slice(0, 10),
//           toDate: toDate.toISOString().slice(0, 10),
//           opd: { ...opdCount, total: opdTotal, dailyAvg: (opdTotal / daysCount).toFixed(2) },
//           ipd: { ...ipdCount, total: ipdTotal, dailyAvg: (ipdTotal / daysCount).toFixed(2) },
//           ot: { ...otCount, total: otTotal },
//           labour: { ...labourCount, total: labourTotal },
//         },
//       ],
//       departments: deptNames,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };


