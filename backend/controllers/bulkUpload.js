const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const Specialty = require("../models/Specialty");
const Department = require("../models/Department");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Staff = require("../models/Staff");
const LabourRoom = require("../models/LabourRoom");
const RoomCategory = require('../models/Room');
const Ward = require('../models/Ward');
const Procedure = require('../models/Procedure');
const ManualChargeItem = require('../models/ManualChargeItem');
const ReferralPartner = require("../models/ReferralPartner");


const OperationTheater = require("../models/OperationTheater");

const InventoryItem = require("../models/InventoryItems"); // adjust path

// Utility to parse Excel or CSV


// Bulk Upload Inventory Items
exports.bulkUploadInventory = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const data = await parseFile(req.file.path);
    fs.unlinkSync(req.file.path);

    if (!data.length)
      return res.status(400).json({ message: "File is empty" });

    const errorRows = [];
    const insertedItems = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      const {
        itemName,
        itemCode,
        category,
        unitOfMeasurement,
        minStockLevel,
        maxStockLevel,
        supplierName,
        supplierContact,
        currentStock,
      } = row;

      if (
        !itemName ||
        !itemCode ||
        !category ||
        !unitOfMeasurement ||
        !minStockLevel ||
        !maxStockLevel ||
        !supplierName ||
        !supplierContact
      ) {
        errorRows.push(rowNum);
        continue;
      }

      // Check for duplicate itemCode
      const existing = await InventoryItem.findOne({ itemCode: String(itemCode).trim() });
      if (existing) {
        errorRows.push(rowNum);
        continue;
      }

      insertedItems.push({
        itemName: String(itemName).trim(),
        itemCode: String(itemCode).trim(),
        category: String(category).trim(),
        unitOfMeasurement: String(unitOfMeasurement).trim(),
        minStockLevel: Number(minStockLevel),
        maxStockLevel: Number(maxStockLevel),
        supplierInfo: {
          name: String(supplierName).trim(),
          contact: String(supplierContact).trim(),
        },
        currentStock: currentStock ? Number(currentStock) : 0,
      });
    }

    if (!insertedItems.length)
      return res.status(400).json({ message: "No valid rows to upload", errorRows });

    await InventoryItem.insertMany(insertedItems);

    res.status(200).json({
      message: `Successfully uploaded ${insertedItems.length} items`,
      failedRows: errorRows,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};

// ✅ Bulk upload Operation Theaters
exports.bulkUploadOperationTheatersHandler = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    // Read Excel
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    // Remove uploaded file after parsing
    fs.unlinkSync(req.file.path);

    const errorRows = [];
    const added = [];

    for (let i = 0; i < rows.length; i++) {
      let { name, status } = rows[i];

      name = name ? String(name).trim() : "";
      status = status ? String(status).trim() : "Available";

      if (!name) {
        errorRows.push(i + 2);
        continue;
      }

      const exists = await OperationTheater.findOne({ name });
      if (exists) {
        errorRows.push(i + 2);
        continue;
      }

      const theater = new OperationTheater({ name, status });
      await theater.save();
      added.push(theater);
    }

    res.status(200).json({
      message: `Successfully added ${added.length} operation theaters.`,
      errorRows,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};

exports.bulkUploadReferralPartnersHandler = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    // Read uploaded Excel or CSV
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    // Remove temp uploaded file
    fs.unlinkSync(req.file.path);

    const errorRows = [];
    const addedPartners = [];

    for (let i = 0; i < rows.length; i++) {
      let { name, contactNumber } = rows[i];

      // Convert to string safely (for Excel numbers)
      name = name ? String(name).trim() : "";
      contactNumber = contactNumber ? String(contactNumber).trim() : "";

      if (!name || !contactNumber) {
        errorRows.push(i + 2);
        continue;
      }

      // Check duplicate
      const exists = await ReferralPartner.findOne({ name });
      if (exists) {
        errorRows.push(i + 2);
        continue;
      }

      const partner = new ReferralPartner({ name, contactNumber });
      await partner.save();
      addedPartners.push(partner);
    }

    res.status(200).json({
      message: `Successfully added ${addedPartners.length} referral partners.`,
      errorRows,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};



exports. bulkUploadManualChargeItemsHandler = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Excel file is required" });

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const errorRows = [];
    for (let i = 0; i < data.length; i++) {
      const { itemName, category, defaultPrice, description } = data[i];

      if (!itemName || !category || !defaultPrice || !description) {
        errorRows.push(i + 2); // Excel row number (header is row 1)
        continue;
      }

      const exists = await ManualChargeItem.findOne({ itemName });
      if (exists) {
        errorRows.push(i + 2);
        continue;
      }

      const newItem = new ManualChargeItem({ itemName, category, defaultPrice, description });
      await newItem.save();
    }

    if (errorRows.length > 0) {
      return res.status(400).json({ message: "Some rows failed", errorRows });
    }

    res.status(200).json({ message: "Bulk upload successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.bulkUploadProcedures = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  let workbook;
  try {
    workbook = xlsx.readFile(req.file.path);
  } catch (err) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: "Invalid Excel file", error: err.message });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  fs.unlinkSync(req.file.path);

  const errorRows = [];
  const proceduresToInsert = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const name = row.name?.trim();
    const description = row.description?.trim();
    const cost = Number(row.cost);

    if (!name || !description || !cost || isNaN(cost)) {
      errorRows.push(i + 2); // +2 for header row
      continue;
    }

    proceduresToInsert.push({ name, description, cost });
  }

  if (errorRows.length > 0) {
    return res.status(400).json({ message: "Validation failed at rows", errorRows });
  }

  try {
    await Procedure.insertMany(proceduresToInsert);
    res.json({ message: "Procedures uploaded successfully", count: proceduresToInsert.length });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};


exports.bulkUploadWards = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  let workbook;
  try {
    workbook = xlsx.readFile(req.file.path);
  } catch (err) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: "Invalid Excel file", error: err.message });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  fs.unlinkSync(req.file.path);

  const errorRows = [];
  const wardsToInsert = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const name = row.name?.trim();
    const roomCategoryName = row.roomCategory?.trim();
    const bedsStr = row.beds?.trim(); // comma-separated bed numbers

    if (!name || !roomCategoryName || !bedsStr) {
      errorRows.push(i + 2); // +2 for header row
      continue;
    }

    const roomCategoryData = await RoomCategory.findOne({ name: roomCategoryName });
    if (!roomCategoryData) {
      errorRows.push(i + 2);
      continue;
    }

    const bedNumbers = bedsStr.split(',').map(b => b.trim()).filter(Boolean);
    if (bedNumbers.length === 0) {
      errorRows.push(i + 2);
      continue;
    }

    const beds = bedNumbers.map(bedNumber => ({ bedNumber, status: 'available' }));

    wardsToInsert.push({
      name,
      roomCategory: roomCategoryData._id,
      beds
    });
  }

  if (errorRows.length > 0)
    return res.status(400).json({ message: "Validation failed at rows", errorRows });

  try {
    await Ward.insertMany(wardsToInsert);
    res.json({ message: "Wards uploaded successfully", count: wardsToInsert.length });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};



exports.bulkUploadRoomCategories = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  let workbook;
  try {
    workbook = xlsx.readFile(req.file.path);
  } catch (err) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: "Invalid Excel file", error: err.message });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  fs.unlinkSync(req.file.path);

  const errorRows = [];
  const records = [];

  data.forEach((row, index) => {
    const name = row.name?.trim();
    const description = row.description?.trim();
    if (!name || !description) errorRows.push(index + 2); // +2 because Excel rows start at 1 and first row is header
    else records.push({ name, description });
  });

  if (errorRows.length > 0)
    return res.status(400).json({ message: "Validation failed at rows", errorRows });

  try {
    await RoomCategory.insertMany(records);
    res.json({ message: "Room Categories uploaded successfully", count: records.length });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};


exports.bulkUploadLabourRooms = async (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "No file uploaded" });

  let workbook;
  try {
    workbook = xlsx.readFile(req.file.path);
  } catch (err) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: "Invalid Excel file", error: err.message });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  fs.unlinkSync(req.file.path);

  const errorRows = [];
  const records = [];

  data.forEach((row, index) => {
    const name = row.name?.trim();
    const description = row.description?.trim();
    if (!name) errorRows.push(index + 2);
    else records.push({ name, description });
  });

  if (errorRows.length > 0)
    return res.status(400).json({
      message: "Validation failed at rows",
      errorRows
    });

  try {
    await LabourRoom.insertMany(records);
    res.json({ message: "Labour Rooms uploaded successfully", count: records.length });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};

// Utility to read Excel or CSV
const parseFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".xlsx" || ext === ".xls") {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(sheet, { defval: "" });
  } else if (ext === ".csv") {
    return new Promise((resolve, reject) => {
      const rows = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", () => resolve(rows))
        .on("error", (err) => reject(err));
    });
  } else {
    throw new Error("Unsupported file type. Only CSV or Excel allowed.");
  }
};

// ----------- BULK UPLOAD SPECIALTY -----------
exports.bulkUploadSpeciality = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  try {
    const data = await parseFile(req.file.path);
    fs.unlinkSync(req.file.path);

    const records = [];
    const errorRows = [];

    data.forEach((row, idx) => {
      if (!row.name || !row.description) errorRows.push(idx + 2);
      else records.push({ name: row.name.trim(), description: row.description.trim() });
    });

    if (errorRows.length) return res.status(400).json({ message: "Validation failed", errorRows });

    const inserted = await Specialty.insertMany(records);
    res.json({ message: "Specialties uploaded successfully", insertedCount: inserted.length });
  } catch (err) {
    fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};

// ----------- BULK UPLOAD DEPARTMENT -----------
exports.bulkUploadDepartment = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  try {
    const data = await parseFile(req.file.path);
    fs.unlinkSync(req.file.path);

    const records = [];
    const errorRows = [];

    data.forEach((row, idx) => {
      if (!row.name || !row.description) errorRows.push(idx + 2);
      else records.push({ name: row.name.trim(), description: row.description.trim() });
    });

    if (errorRows.length) return res.status(400).json({ message: "Validation failed", errorRows });

    const inserted = await Department.insertMany(records);
    res.json({ message: "Departments uploaded successfully", insertedCount: inserted.length });
  } catch (err) {
    fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};

// ----------- BULK UPLOAD DOCTORS -----------
exports.bulkUploadDoctors = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const data = await parseFile(req.file.path);
    fs.unlinkSync(req.file.path);
    if (!data.length) throw new Error("File is empty");

    const errors = [];
    let successCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      let { name, email, password, doctorType, specialty, department, medicalLicenseNumber } = row;

      name = String(name || "").trim();
      email = String(email || "").trim();
      password = String(password || "").trim();
      doctorType = String(doctorType || "").trim();
      specialty = String(specialty || "").trim();
      department = String(department || "").trim();
      medicalLicenseNumber = String(medicalLicenseNumber || "").trim();

      if (!name || !email || !password || !doctorType || !specialty || !department || !medicalLicenseNumber) {
        errors.push({ row: rowNum, error: "Missing required fields" });
        continue;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });

      const specialtyData = await Specialty.findOne({ name: new RegExp(`^${specialty}$`, "i") });
      const departmentData = await Department.findOne({ name: new RegExp(`^${department}$`, "i") });

      if (!specialtyData || !departmentData) {
        errors.push({ row: rowNum, error: "Invalid Specialty or Department" });
        continue;
      }

      if (existingUser) {
        // ✅ Update existing doctor to active
        await Doctor.findOneAndUpdate(
          { userId: existingUser._id },
          {
            doctorType,
            specialty: specialtyData._id,
            department: departmentData._id,
            medicalLicenseNumber,
            isActive: true,
          },
          { new: true }
        );

        successCount++;
        continue;
      }

      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "DOCTOR",
      });

      // Create doctor
      await Doctor.create({
        userId: newUser._id,
        doctorType,
        specialty: specialtyData._id,
        department: departmentData._id,
        medicalLicenseNumber,
        isActive: true, // ✅ Always active
      });

      successCount++;
    }

    if (errors.length)
      return res.status(400).json({
        message: "Some rows failed",
        errorRows: errors,
        successCount,
      });

    res.json({ message: "Doctors uploaded successfully", successCount });
  } catch (err) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};



// ----------- BULK UPLOAD STAFF -----------



exports.bulkUploadStaff = async (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "No file uploaded" });

  try {
    const data = await parseFile(req.file.path);
    fs.unlinkSync(req.file.path);

    if (!data.length)
      throw new Error("File is empty");

    const errors = [];
    let successCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        // ✅ 1. Validate essential fields exist
        if (
          !row.name ||
          !row.email ||
          !row.designation ||
          !row.department
        ) {
          throw new Error("Missing required staff fields.");
        }

        // ✅ 2. Find Department by ID or Name
        let departmentData;
        if (/^[0-9a-fA-F]{24}$/.test(row.department)) {
          departmentData = await Department.findById(row.department);
        } else {
          departmentData = await Department.findOne({
            name: { $regex: new RegExp("^" + row.department + "$", "i") },
          });
        }

        if (!departmentData)
          throw new Error(`Department '${row.department}' not found.`);

        // ✅ 3. Prevent duplicate email
        const existingUser = await User.findOne({ email: row.email });
        if (existingUser)
          throw new Error(`Email '${row.email}' already exists.`);

        // ✅ 4. Create user
        const hashedPassword = await bcrypt.hash(row.password || "123456", 10);
        const newUser = await User.create({
          name: row.name,
          email: row.email,
          password: hashedPassword,
          role: "STAFF",
        });

        // ✅ 5. Create staff
        await Staff.create({
          userId: newUser._id,
          department: departmentData._id,
          designation: row.designation,
          contactNumber: row.contactNumber || "",
          isActive: true,
        });

        successCount++;
      } catch (err) {
        errors.push({ row: i + 2, error: err.message }); // +2 for Excel row number
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Validation failed. Fix errors and re-upload.",
        errorRows: errors,
      });
    }

    res.status(200).json({
      message: `Bulk upload completed successfully. ${successCount} staff added.`,
      errors,
    });
  } catch (err) {
    console.error("Bulk upload error:", err);
    res.status(500).json({ message: err.message });
  }
};


