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
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const data = await parseFile(req.file.path);
    fs.unlinkSync(req.file.path);

    if (!data.length) {
      return res.status(400).json({ message: "File is empty" });
    }

    const clean = (val) =>
      typeof val === "string"
        ? val.replace(/\r?\n|\r/g, " ").trim()
        : val;

    const errorRows = [];
    const insertedItems = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      const itemName = clean(row.itemName);
      const category = clean(row.category);
      const unitOfMeasurement = clean(row.unitOfMeasurement);
      const supplierName = clean(row.supplierName);
      const supplierContact = clean(row.supplierContact || row.supplierCo);

      // ✅ Auto-generate itemCode
      const itemCode =
        clean(row.itemCode) ||
        `ITEM-${itemName?.substring(0, 6).toUpperCase()}-${Date.now()}-${i}`;

      const minStockLevel =
        row.minStockLevel !== undefined && row.minStockLevel !== ""
          ? Number(row.minStockLevel)
          : 0;

      const maxStockLevel =
        row.maxStockLevel !== undefined && row.maxStockLevel !== ""
          ? Number(row.maxStockLevel)
          : 0;

      // ✅ Only strict required fields
      if (!itemName || !category || !unitOfMeasurement || !supplierName || !supplierContact) {
        errorRows.push(rowNum);
        continue;
      }

      // ✅ Check duplicate itemCode
      const existing = await InventoryItem.findOne({
        itemCode: itemCode,
      });

      if (existing) {
        errorRows.push(rowNum);
        continue;
      }

      insertedItems.push({
        itemName,
        itemCode,
        category,
        unitOfMeasurement,
        minStockLevel,
        maxStockLevel,
        supplierInfo: {
          name: supplierName,
          contact: String(supplierContact),
        },
        currentStock:
          row.currentStock !== undefined && row.currentStock !== ""
            ? Number(row.currentStock)
            : 0,
      });
    }

    if (!insertedItems.length) {
      return res.status(400).json({
        message: "No valid rows to upload",
        errorRows,
      });
    }

    await InventoryItem.insertMany(insertedItems);

    res.status(200).json({
      message: `Successfully uploaded ${insertedItems.length} items`,
      failedRows: errorRows,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    res.status(500).json({
      message: "Upload failed",
      error: error.message,
    });
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


exports.bulkUploadManualChargeItemsHandler = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Excel file is required" });

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const errorRows = [];

    for (let i = 0; i < data.length; i++) {
      const { itemName, category, defaultPrice, description } = data[i];

      // Skip rows with missing required fields
      if (!itemName || !category || defaultPrice === undefined || defaultPrice === null || defaultPrice === '') {
        continue;
      }

      // Normalize price: remove commas
      let price = defaultPrice;
      if (typeof price === "string") {
        price = price.replace(/,/g, "").trim();
      }
      const numericPrice = Number(price);

      if (isNaN(numericPrice)) {
        errorRows.push(i + 2);
        continue;
      }

      // SKIP duplicates without error
      const exists = await ManualChargeItem.findOne({ itemName });
      if (exists) {
        continue;
      }

      // Save
      await new ManualChargeItem({
        itemName,
        category,
        defaultPrice: numericPrice,
        description: description || ""
      }).save();
    }

    if (errorRows.length > 0) {
      return res.status(400).json({ message: "Some rows failed", errorRows });
    }

    return res.status(200).json({ message: "Bulk upload successful!" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
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

   if (!name || !description || typeof row.cost === "undefined" || row.cost === null || row.cost === "" || isNaN(cost)) {

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
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  let workbook;
  try {
    workbook = xlsx.readFile(req.file.path);
  } catch (err) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: "Invalid Excel file" });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  fs.unlinkSync(req.file.path);

  const errorRows = [];
  const wardsToInsert = [];

  for (let i = 0; i < data.length; i++) {
    const excelRow = i + 2;
    const row = data[i];

    const name = String(row.name || "").trim();
    const roomCategoryName = String(row.roomCategory || "").trim();
    const bedsStr = String(row.beds || "").trim();

    if (!name || !roomCategoryName || !bedsStr) {
      errorRows.push(excelRow);
      continue;
    }

    const roomCategory = await RoomCategory.findOne({
      $or: [{ name: roomCategoryName }, { description: roomCategoryName }]
    });

    if (!roomCategory) {
      errorRows.push(excelRow);
      continue;
    }

// parse ranges like "1 To 15" or single values like "77"
const beds = [];

const parts = bedsStr.split(",").map(x => x.trim()).filter(Boolean);

for (const p of parts) {
  // if it's a range
  if (p.toLowerCase().includes("to")) {
    const [start, , end] = p.split(" ");
    const startNum = parseInt(start);
    const endNum = parseInt(end);
    if (!isNaN(startNum) && !isNaN(endNum)) {
      for (let i = startNum; i <= endNum; i++) {
        beds.push({
          bedNumber: i,
          status: "available"
        });
      }
    }
  } else {
    // single bed
    const num = parseInt(p);
    if (!isNaN(num)) {
      beds.push({ bedNumber: num, status: "available" });
    }
  }
}

if (!beds.length) {
  errorRows.push(excelRow);
  continue;
}


    wardsToInsert.push({
      name,
      roomCategory: roomCategory._id,
      beds
    });
  }

  if (errorRows.length > 0) {
    return res.status(400).json({
      message: "Validation failed at rows",
      errorRows
    });
  }

  try {
    await Ward.insertMany(wardsToInsert, { ordered: true }); // insert ALL
    res.json({
      message: "Wards uploaded successfully",
      count: wardsToInsert.length
    });
  } catch (err) {
    res.status(500).json({
      message: "Upload failed",
      error: err.message
    });
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
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const data = await parseFile(req.file.path);
    fs.unlinkSync(req.file.path);

    const records = [];
    const errorRows = [];

    let lastValidName = null; // ✅ carry forward department name

    data.forEach((row, idx) => {
      const rowNumber = idx + 2; // Excel row number

      const name = row.name?.trim() || lastValidName;
      const description = row.description?.trim();

      if (!name || !description) {
        errorRows.push(rowNumber);
        return;
      }

      records.push({
        name,
        description
      });

      lastValidName = name;
    });

    if (!records.length) {
      return res.status(400).json({
        message: "No valid department records found",
        errorRows
      });
    }

    // ✅ ordered:false → continue even if one row fails
    await Department.insertMany(records, { ordered: false });

    res.status(200).json({
      message: "Departments uploaded successfully",
      insertedCount: records.length,
      invalidRows: errorRows
    });

  } catch (err) {
    fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path);

    res.status(500).json({
      message: "Upload failed",
      error: err.message
    });
  }
};



// ----------- BULK UPLOAD DOCTORS -----------
exports.bulkUploadDoctors = async (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "No file uploaded" });

  try {
    // parse the uploaded Excel/CSV file
    const data = await parseFile(req.file.path);

    // delete temp file
    fs.unlinkSync(req.file.path);

    if (!data.length)
      return res.status(400).json({ message: "Uploaded file is empty" });

    const errors = [];
    let successCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number approx.

      try {
        // ───────── Normalize headers ─────────
        const normalized = {};
        for (const key in row) {
          const cleanKey = key
            .replace(/[\uFEFF\u200B]/g, "")  // remove BOM/hidden
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

          normalized[cleanKey] = row[key];
        }

        // ───────── Pull values safely ─────────
        const name = String(normalized.name || "").trim();
        const email = String(normalized.email || "").trim();
        const password = String(normalized.password || "").trim();
        const doctorType = String(normalized.doctortype || "").trim();
        const specialtyRaw = String(normalized.specialty || "").trim();
        const medicalLicense = String(normalized.medicallicensenumber || "").trim();

        // ───────── Required validation ─────────
        if (!name || !email || !password || !doctorType || !specialtyRaw || !medicalLicense) {
          throw new Error("Missing required fields");
        }

        // ───────── Normalize specialty string ─────────
        const specialtyClean = specialtyRaw
          .replace(/\s+/g, " ")
          .trim();

        // ───────── Specialty lookup ─────────
        const specialtyData = await Specialty.findOne({
          name: { $regex: `^${specialtyClean}$`, $options: "i" }
        });

        if (!specialtyData) {
          throw new Error(`Specialty '${specialtyClean}' not found`);
        }

        // ───────── Check if user exists ─────────
        const existingUser = await User.findOne({ email });

        if (existingUser) {
          // If user exists, try to create/update doctor record

          const existingDoctor = await Doctor.findOne({ userId: existingUser._id });

          if (existingDoctor) {
            // Update existing doctor info
            await Doctor.findOneAndUpdate(
              { userId: existingUser._id },
              {
                doctorType,
                specialty: specialtyData._id,
                medicalLicenseNumber: medicalLicense,
                isActive: true
              }
            );
          } else {
            // Create doctor profile for existing user
            await Doctor.create({
              userId: existingUser._id,
              doctorType,
              specialty: specialtyData._id,
              medicalLicenseNumber: medicalLicense,
              isActive: true
            });
          }

          successCount++;
          continue;
        }

        // ───────── New user creation ─────────
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
          name,
          email,
          password: hashedPassword,
          role: "DOCTOR"
        });

        await Doctor.create({
          userId: newUser._id,
          doctorType,
          specialty: specialtyData._id,
          medicalLicenseNumber: medicalLicense,
          isActive: true
        });

        successCount++;
      } catch (err) {
        errors.push({ row: rowNum, error: err.message });
      }
    }

    return res.status(200).json({
      message: errors.length
        ? "Upload done with some errors"
        : "Doctors uploaded successfully",
      successCount,
      errorRows: errors,
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      message: "Upload failed",
      error: err.message,
    });
  }
};






// ----------- BULK UPLOAD STAFF -----------

// ----------- BULK UPLOAD STAFF -----------
exports.bulkUploadStaff = async (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "No file uploaded" });

  try {
    const data = await parseFile(req.file.path);
    fs.unlinkSync(req.file.path);

    if (!data.length)
      return res.status(400).json({ message: "File is empty" });

    const errors = [];
    let successCount = 0;

    const allowedDesignations = [
      "Head Nurse",
      "Lab Technician",
      "Receptionist",
      "Inventory Manager",
      "Other"
    ];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

      try {
        const name = String(row.name || "").trim();
        const email = String(row.email || "").trim().toLowerCase();
        const rawPassword = String(row.password || "").trim();
        const contactNumber = String(row.contactNumber || "").trim();
        const designationRaw = String(row.designation || "").trim();

        // Required fields
        if (!name || !email || !designationRaw) {
          throw new Error("Missing required field (name, email, or designation)");
        }

        // Email format check
        if (!/^\S+@\S+\.\S+$/.test(email)) {
          throw new Error("Invalid email format");
        }

        // Normalize designation to allowed enum
        const designation = allowedDesignations.find(
          d => d.toLowerCase() === designationRaw.toLowerCase()
        );

        if (!designation) {
          throw new Error(`Invalid designation '${designationRaw}'`);
        }

        // Find or create user
        let user = await User.findOne({ email });

        if (!user) {
          const passwordHash = await bcrypt.hash(rawPassword || "123456", 10);
          user = await User.create({
            name,
            email,
            password: passwordHash,
            role: "STAFF",
          });
        }

        // Create staff entry
        await Staff.create({
          userId: user._id,
          designation,
          contactNumber: contactNumber || "",
          isActive: true,
        });

        successCount++;
      } catch (err) {
        errors.push({ row: rowNum, error: err.message });
      }
    }

    return res.status(200).json({
      message: "Staff bulk upload completed",
      successCount,
      errorCount: errors.length,
      errorRows: errors
    });

  } catch (err) {
    console.error("Bulk upload error:", err);
    return res.status(500).json({ message: err.message });
  }
};









