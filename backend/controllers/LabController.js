// controllers/labController.js
const LabTest = require('../models/LabTest');
const Patient = require('../models/Patient');
const LabPayment = require('../models/LabPayment');
const Staff = require('../models/Staff');

const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../uploads/labReports');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const pending = await LabTest.countDocuments({ status: 'Pending' });
    const completed = await LabTest.countDocuments({ status: 'Completed' });
    res.json({ pending, completed });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all lab tests with patient info
exports.getLabTests = async (req, res) => {
  try {
    const tests = await LabTest.find().populate('patientId');
    res.json({ tests });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Add test result
// Add test result
exports.addTestResult = async (req, res) => {
  try {
    const { patientId, testType, date, results } = req.body;

    // Ensure results is array of non-empty strings
    const finalResults = Array.isArray(results)
      ? results.filter(r => typeof r === 'string' && r.trim() !== "")
      : [];

    const test = new LabTest({
      patientId,
      testType,
      date,
      results: finalResults,
      status: "Pending",
    });

    await test.save();
    res.status(201).json({ message: "Lab test saved (Pending)", test });
  } catch (err) {
    console.error("Error in addTestResult:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// Get appointments (simple: lab tests with future date)
exports.getAppointments = async (req, res) => {
  try {
    const appointments = await LabTest.find({ date: { $gte: new Date() } }).populate('patientId');
    res.json({ appointments });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
exports.uploadReport = async (req, res) => {
  try {
    const { testId, amount, paymentStatus = "Pending", notes = "" } = req.body;

    // Optional file path logic (if you still want to keep it)
    let filePath = null;
    if (req.file) {
      filePath = `/uploads/labReports/${req.file.filename}`;
    }

    const updateData = {
      status: "Completed",
      labTechnician: req.user._id,
    };
    if (filePath) {
      updateData.reportFile = filePath;
    }

    const test = await LabTest.findByIdAndUpdate(
      testId,
      updateData,
      { new: true }
    )
      .populate("patientId")
      .populate({ path: "labTechnician", populate: { path: "userId", select: "name" } });

    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    const technicianName = test.labTechnician?.userId?.name || "Not Assigned";

    if (amount) {
      await LabPayment.create({
        patientId: test.patientId,
        testId: test._id,
        amount,
        status: paymentStatus,
        notes,
      });
    }

    return res.json({ message: "Report updated & payment created", test, technicianName });
  } catch (err) {
    console.error("Error in uploadReport:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getPendingPayments = async (req, res) => {
  try {
    const payments = await LabPayment.find({ status: 'Pending' })
      .populate('patientId')
      .populate('testId');
    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark payment as Paid
exports.markPaymentPaid = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await LabPayment.findByIdAndUpdate(
      paymentId,
      { status: 'Paid', paymentDate: new Date() },
      { new: true }
    );

    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    res.json({ message: 'Payment marked as Paid', payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};