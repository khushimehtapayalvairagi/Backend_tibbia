const mongoose = require('mongoose');
const User = require('../models/User'); 
const Department = require('../models/Department');
const Specialty = require('../models/Specialty')
const RoomCategory = require('../models/Room');
const Ward = require('../models/Ward');
const LabourRoom = require('../models/LabourRoom');
const Procedure = require('../models/Procedure');
const ManualChargeItem = require('../models/ManualChargeItem');
const Doctor = require('../models/Doctor');
const Staff = require('../models/Staff');
const ReferralPartner = require('../models/ReferralPartner');
const OperationTheater = require('../models/OperationTheater');
const IPDAdmission = require('../models/IPDAdmission');
const bcrypt = require('bcrypt');

const registerHandler = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      doctorType,
      specialty,
      medicalLicenseNumber,
      contactNumber,
      designation,
      department,
      schedule,
    } = req.body;

    const requesterRole = req.user?.role;

    if (!name || !email || !password || !role) {
      throw new Error('Name, email, password, and role are required.');
    }

    // Only admin can create users
    if (requesterRole !== 'ADMIN') {
      throw new Error('Only Admin is allowed to register users.');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists.');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user record
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    // Handle ADMIN
    if (role.toUpperCase() === 'ADMIN') {
      return res.status(201).json({
        message: 'Admin registered successfully.',
        userId: newUser._id,
      });
    }

    // Handle DOCTOR
    if (role.toUpperCase() === 'DOCTOR') {
      if (!doctorType || !specialty || !medicalLicenseNumber) {
        throw new Error('doctorType, specialty, and medicalLicenseNumber are required for Doctor.');
      }

      const specialtyData = await Specialty.findOne({
        name: new RegExp(`^${specialty.trim()}$`, 'i'),
      });
      if (!specialtyData) throw new Error(`Specialty '${specialty}' not found.`);

      const departmentData = await Department.findById(department);
      if (!departmentData) throw new Error('Department not found.');

      const allDays = [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
      ];

      const fullWeekSchedule = allDays.map(day => ({
        dayOfWeek: day,
        startTime: '00:00',
        endTime: '23:59',
        isAvailable: true,
      }));

      const doctor = await Doctor.create({
        userId: newUser._id,
        doctorType,
        specialty: specialtyData._id,
        department: departmentData._id,
        medicalLicenseNumber,
        schedule: schedule && schedule.length ? schedule : fullWeekSchedule,
         isActive: true,
      });

      return res.status(201).json({
        message: 'Doctor registered successfully with schedule.',
        userId: newUser._id,
        doctorId: doctor._id,
      });
    }

    // ✅ Handle STAFF (fixed version)
      if (role.toUpperCase() === 'STAFF') {
      if (!contactNumber || !designation) {
        throw new Error('contactNumber and designation are required for Staff.');
      }

      let departmentId = null;
      if (department) {
        const departmentData = await Department.findOne({ name: department.trim() });
        if (!departmentData) throw new Error(`Department not found.`);
        departmentId = departmentData._id;
      }

      const staff = await Staff.create({
        userId: newUser._id,
        contactNumber,
        designation,
        department: departmentId
      });

      return res.status(201).json({
        message: 'Staff registered successfully.',
        userId: newUser._id,
        staffId: staff._id
      });
    }


    // Handle unknown roles
    throw new Error('Invalid role.');

  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(400).json({ message: error.message });
  }
};

// const registerHandler = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       password,
//       role,
//       doctorType,
//       specialty,
//       medicalLicenseNumber,
//       schedule,
//       contactNumber,
//       designation,
//       department,
//     } = req.body;

//     const requesterRole = req.user.role;

//     // Basic validations
//     if (!name || !email || !password || !role) {
//       throw new Error('Name, email, password, and role are required.');
//     }

//     if (requesterRole !== 'ADMIN') {
//       throw new Error('Only Admin is allowed to register users.');
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       throw new Error('User with this email already exists.');
//     }

//     // Hash password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Create user
//     const newUser = await User.create({
//       name,
//       email,
//       password: hashedPassword,
//       role,
//     });

//     // ----- DOCTOR -----
//     if (role.toUpperCase() === 'DOCTOR') {
//       if (!doctorType || !specialty || !medicalLicenseNumber) {
//         throw new Error('doctorType, specialty, and medicalLicenseNumber are required for Doctor.');
//       }

//       const specialtyData = await Specialty.findOne({
//         name: new RegExp(`^${specialty.trim()}$`, 'i'),
//       });
//       if (!specialtyData) {
//         throw new Error(`Specialty '${specialty}' not found.`);
//       }

//       if (!department) {
//         throw new Error('Department is required for Doctor.');
//       }

//       const departmentData = await Department.findById(department);
//       if (!departmentData) {
//         throw new Error('Department not found.');
//       }

//       // Default full week schedule if none provided
//       const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
//       const fullWeekSchedule = allDays.map(day => ({
//         dayOfWeek: day,
//         startTime: '00:00',
//         endTime: '23:59',
//         isAvailable: true
//       }));

//       const existingDoctor = await Doctor.findOne({ userId: newUser._id });
//       if (existingDoctor) {
//         throw new Error('Doctor already exists for this user.');
//       }

//       const doctor = await Doctor.create({
//         userId: newUser._id,
//         doctorType,
//         specialty: specialtyData._id,
//         department: departmentData._id,
//         medicalLicenseNumber,
//         schedule: fullWeekSchedule,
//       });

//       return res.status(201).json({
//         message: 'Doctor registered successfully with schedule.',
//         userId: newUser._id,
//         doctorId: doctor._id,
//       });
//     }

//     // ----- STAFF -----
//     if (role.toUpperCase() === 'STAFF') {
//       if (!contactNumber || !designation) {
//         throw new Error('contactNumber and designation are required for Staff.');
//       }

//       let departmentId = null;
//       if (department) {
//         const departmentData = await Department.findOne({ name: department.trim() });
//         if (!departmentData) {
//           throw new Error(`Department '${department}' not found.`);
//         }
//         departmentId = departmentData._id;
//       }

//       const existingStaff = await Staff.findOne({ userId: newUser._id });
//       if (existingStaff) {
//         throw new Error('Staff already exists for this user.');
//       }

//       const staff = await Staff.create({
//         userId: newUser._id,
//         contactNumber,
//         designation,
//         department: departmentId,
//       });

//       return res.status(201).json({
//         message: 'Staff registered successfully.',
//         userId: newUser._id,
//         staffId: staff._id,
//       });
//     }

//     // ----- ADMIN -----
//     if (role.toUpperCase() === 'ADMIN') {
//       return res.status(201).json({
//         message: 'Admin registered successfully.',
//         userId: newUser._id,
//       });
//     }

//     // Invalid role
//     throw new Error('Invalid role specified.');
//   } catch (error) {
//     console.error('Registration error:', error.message);
//     return res.status(400).json({ message: error.message });
//   }
// };



const getAllUsersHandler = async (req, res) => {
    try {
       
        const users = await User.find({}, '-password'); 

        res.status(200).json({
            message: 'Users fetched successfully.',
            users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const createDepartmentHandler = async (req, res) => {
    try {
        const { name, description } = req.body;
        if(!name || !description) return res.status(404).json({message: "name and description is required"});

        const existing = await Department.findOne({ name });
        if (existing) return res.status(400).json({ message: 'Department already exists.' });

        const department = new Department({ name, description });
        await department.save();

        res.status(201).json({ message: 'Department created successfully.', department });
    } catch (error) {
        console.error('Create Department Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getAllDepartmentsHandler = async (req, res) => {
    try {
        const departments = await Department.find();
        res.status(200).json({ departments });
    } catch (error) {
        console.error('Get Departments Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const createSpecialtyHandler = async (req, res) => {
    try {
        const { name, description } = req.body;
        if(!name || !description) return res.status(404).json({message: "name and description is required"});

        const existing = await Specialty.findOne({ name });
        if (existing) return res.status(400).json({ message: 'Specialty already exists.' });

        const specialty = new Specialty({ name, description });
        await specialty.save();

        res.status(201).json({ message: 'Specialty created successfully.', specialty });
    } catch (error) {
        console.error('Create Specialty Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getAllSpecialtiesHandler = async (req, res) => {
    try {
        const specialties = await Specialty.find();
        res.status(200).json({ specialties });
    } catch (error) {
        console.error('Get Specialties Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const createRoomCategoryHandler = async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if(!name || !description) return res.status(404).json({message: "name and description is required"});


        const existing = await RoomCategory.findOne({ name });
        if (existing) return res.status(400).json({ message: 'Room category already exists.' });

        const roomCategory = new RoomCategory({ name, description });
        await roomCategory.save();

        res.status(201).json({ message: 'Room category created successfully.', roomCategory });
    } catch (error) {
        console.error('Create Room Category Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getAllRoomCategoriesHandler = async (req, res) => {
    try {
        const roomCategories = await RoomCategory.find();
        res.status(200).json({ roomCategories });
    } catch (error) {
        console.error('Get Room Categories Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const createWardHandler = async (req, res) => {
    try {
        const { name, roomCategory, beds } = req.body;

        if (!name || !roomCategory || !beds || !Array.isArray(beds) || beds.length === 0) {
            return res.status(400).json({ message: 'Name, roomCategory, and a non-empty beds array are required.' });
        }

        const existingWard = await Ward.findOne({ name: name.trim() });
        if (existingWard) {
            return res.status(400).json({ message: 'Ward already exists.' });
        }

        const bedNumbers = beds.map(bed => bed.bedNumber);
        const uniqueBedNumbers = new Set(bedNumbers);

        if (uniqueBedNumbers.size !== bedNumbers.length) {
            return res.status(400).json({ message: 'Duplicate bed numbers found in the request.' });
        }

        const roomCategoryData = await RoomCategory.findOne({ name: roomCategory.trim() });
        if (!roomCategoryData) {
            return res.status(400).json({ message: `Room Category '${roomCategory}' not found.` });
        }

        const ward = new Ward({
            name: name.trim(),
            roomCategory: roomCategoryData._id,
            beds
        });

        await ward.save();

        res.status(201).json({ message: 'Ward created successfully.', ward });

    } catch (error) {
        console.error('Create Ward Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getAllWardsHandler = async (req, res) => {
  try {
    const wards = await Ward.find().populate('roomCategory');

    // fetch only admitted admissions
    const activeAdmissions = await IPDAdmission.find({ status: 'Admitted' });

    // map admitted beds
    const occupiedBeds = activeAdmissions.map(a => `${a.wardId}-${a.bedNumber}`);

    const response = wards.map(ward => ({
      ...ward.toObject(),
      beds: ward.beds.map(bed => {
        // 💡 If admission discharged, don't mark occupied
        const isOccupied = occupiedBeds.includes(`${ward._id}-${bed.bedNumber}`);
        return {
          ...bed.toObject(),
          status: isOccupied ? 'occupied' : 'available'
        };
      })
    }));

    res.status(200).json({ wards: response });
  } catch (error) {
    console.error('Get Wards Error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

const createLabourRoomHandler = async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if(!name || !description) return res.status(404).json({message: "name and description is required"});

        const existing = await LabourRoom.findOne({ name });
        if (existing) return res.status(400).json({ message: 'Labour Room already exists.' });

        const labourRoom = new LabourRoom({ name, description });
        await labourRoom.save();

        res.status(201).json({ message: 'Labour Room created successfully.', labourRoom });
    } catch (error) {
        console.error('Create Labour Room Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getAllLabourRoomsHandler = async (req, res) => {
    try {
        const labourRooms = await LabourRoom.find();
        res.status(200).json({ labourRooms });
    } catch (error) {
        console.error('Get Labour Rooms Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const createProcedureHandler = async (req, res) => {
    try {
        const { name, description, cost } = req.body;

        if(!name || !description || !cost) return res.status(404).json({message: "name,description & cost is required"});


        const existing = await Procedure.findOne({ name });
        if (existing) return res.status(400).json({ message: 'Procedure already exists.' });

        const procedure = new Procedure({ name, description, cost });
        await procedure.save();

        res.status(201).json({ message: 'Procedure created successfully.', procedure });
    } catch (error) {
        console.error('Create Procedure Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getAllProceduresHandler = async (req, res) => {
    try {
        const procedures = await Procedure.find();
        res.status(200).json({ procedures });
    } catch (error) {
        console.error('Get Procedures Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const createManualChargeItemHandler = async (req, res) => {
    try {
        const { itemName, category, defaultPrice, description } = req.body;

        if(!itemName || !description || !category || !defaultPrice) return res.status(404).json({message: "name,description,category and defaultPrice is required"});

        const existing = await ManualChargeItem.findOne({ itemName });
        if (existing) return res.status(400).json({ message: 'Manual charge item already exists.' });

        const item = new ManualChargeItem({ itemName, category, defaultPrice, description });
        await item.save();

        res.status(201).json({ message: 'Manual charge item created successfully.', item });
    } catch (error) {
        console.error('Create Manual Charge Item Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getAllManualChargeItemsHandler = async (req, res) => {
    try {
        const items = await ManualChargeItem.find();
        res.status(200).json({ items });
    } catch (error) {
        console.error('Get Manual Charge Items Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getAllStaffHandler = async (req, res) => {
    try {
        const staffList = await Staff.find().populate('userId', 'name email role').populate('department', 'name');
        res.status(200).json({ staff: staffList });
    } catch (error) {
        console.error('Fetch Staff Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getStaffByIdHandler = async (req, res) => {
    try {
        const { id } = req.params;

        const staff = await Staff.findById(id).populate('userId', 'name email role').populate('department', 'name');
        if (!staff) return res.status(404).json({ message: 'Staff not found.' });

        res.status(200).json({ staff });
    } catch (error) {
        console.error('Fetch Staff By ID Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getAllDoctorsHandler = async (req, res) => {
    try {
        const doctors = await Doctor.find().populate('userId', 'name email role')
        .populate('specialty', 'name')
          .populate('department','name')
        res.status(200).json({ doctors });
    } catch (error) {
        console.error('Fetch Doctors Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// const getDoctorByIdHandler = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const doctor = await Doctor.findById(id).populate('userId', 'name email role').populate('specialty', 'name');
//         if (!doctor) return res.status(404).json({ message: 'Doctor not found.' });

//         res.status(200).json({ doctor });
//     } catch (error) {
//         console.error('Fetch Doctor By ID Error:', error);
//         res.status(500).json({ message: 'Server error.' });
//     }
// };

const createReferralPartnerHandler = async (req, res) => {
    try {
        const { name, contactNumber } = req.body;

        if (!name || !contactNumber) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const existing = await ReferralPartner.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Referral Partner already exists.' });
        }

        const partner = new ReferralPartner({
            name: name.trim(),
            contactNumber: contactNumber.trim()
        });

        await partner.save();

        res.status(201).json({ message: 'Referral Partner created successfully.', partner });
    } catch (error) {
        console.error('Create Referral Partner Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getAllReferralPartnersHandler = async (req, res) => {
    try {
        const partners = await ReferralPartner.find();
        res.status(200).json({ partners });
    } catch (error) {
        console.error('Fetch Referral Partners Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const createOperationTheaterHandler = async (req, res) => {
    try {
        const { name, status } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Theater name is required.' });
        }

        const existing = await OperationTheater.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Operation Theater already exists.' });
        }

        const theater = new OperationTheater({
            name: name.trim(),
            status: status || 'Available'
        });

        await theater.save();

        res.status(201).json({ message: 'Operation Theater created successfully.', theater });
    } catch (error) {
        console.error('Create Operation Theater Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

const getAllOperationTheatersHandler = async (req, res) => {
    try {
        const theaters = await OperationTheater.find();
        res.status(200).json({ theaters });
    } catch (error) {
        console.error('Fetch Operation Theaters Error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};


const deleteUserHandler = async (req, res) => {
  try {
    const { id, role } = req.body;

    if (!id || !role) {
      return res.status(400).json({ message: 'id and role are required.' });
    }

    if (role === 'DOCTOR') {
      const doctor = await Doctor.findById(id);
      if (!doctor) return res.status(404).json({ message: 'Doctor not found.' });

      // ✅ Mark both doctor + user inactive
      doctor.isActive = false;
      await doctor.save();

      if (doctor.userId) {
        await User.findByIdAndUpdate(doctor.userId, { isActive: false });
      }

      return res.status(200).json({ message: 'Doctor set as inactive successfully.' });

    } else if (role === 'STAFF') {
      const staff = await Staff.findById(id);
      if (!staff) return res.status(404).json({ message: 'Staff not found.' });

      staff.isActive = false;
      await staff.save();

      if (staff.userId) {
        await User.findByIdAndUpdate(staff.userId, { isActive: false });
      }

      return res.status(200).json({ message: 'Staff set as inactive successfully.' });

    } else {
      return res.status(400).json({ message: 'Invalid role. Only DOCTOR or STAFF allowed.' });
    }
  } catch (error) {
    console.error('Deactivate User Error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};



module.exports = {registerHandler,getAllUsersHandler,createDepartmentHandler,getAllDepartmentsHandler
    ,createSpecialtyHandler,getAllSpecialtiesHandler,createRoomCategoryHandler,getAllRoomCategoriesHandler,createWardHandler
    ,getAllWardsHandler,createLabourRoomHandler,getAllLabourRoomsHandler,createProcedureHandler,getAllProceduresHandler
    ,createManualChargeItemHandler,getAllManualChargeItemsHandler,getAllStaffHandler,getStaffByIdHandler
    ,getAllDoctorsHandler,createReferralPartnerHandler,getAllReferralPartnersHandler,createOperationTheaterHandler
    ,getAllOperationTheatersHandler,deleteUserHandler
};
