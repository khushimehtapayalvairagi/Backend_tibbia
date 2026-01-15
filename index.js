const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./utils/config');
const cors = require('cors');
const dotenv = require('dotenv');
const { setupSocket } = require('./utils/sockets');

const { restrictToLoggedInUserOnly, restrictTo, restrictToDesignation } = require('./middlewares/auth');
dotenv.config();


 const app = express();
const server = http.createServer(app);
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    // origin: ["https://uudra.in", "http://localhost:3000"],
        // origin: ["http://localhost:3000"],
          // origin: ["https://kloudcrm.site", "http://kloudcrm.site", "https://www.kloudcrm.site"],
           origin: [ "https://kashichem.com",  // ✅ Add this line
      "http://kashichem.com" ],

        credentials: true,
  })
);
// require("dotenv").config();
// const express = require("express");
// const http = require("http");
// const cookieParser = require("cookie-parser");
// const cors = require("cors");
// const { connectDB } = require("./utils/config");
// const { setupSocket } = require("./utils/sockets");

// const app = express();
// const server = http.createServer(app);

// // Middlewares
// app.use(express.json());
// app.use(cookieParser());

// app.use(cors({
//   origin: [
//     "https://kashichem.com",
//     "http://kashichem.com",
//     "http://localhost:3000"
//   ],
//   credentials: true,
// }));


const AuthHandler = require('./routes/auth');
const AdminHandler = require('./routes/admin');
const ReceptionistHandler = require('./routes/receptionist');
 const doctorHandler = require('./routes/doctor');
const ipdHandler = require('./routes/ipd');
const procedure = require('./routes/procedure');
const inventoryManager = require('./routes/inventoryManager');

const bulkUpload = require('./routes/bulkUpload');


const labRoutes = require('./routes/Lab');

const billingHandler = require('./routes/billing');

const reports = require('./routes/reports');


(async () => {
  await connectDB(process.env.DATABASE_URL);

  setupSocket(server);

  server.listen(process.env.PORT || 8001, () => {
    console.log(`Server is listening at PORT: ${process.env.PORT || 8001}`);
  });
})();


app.use('/api/auth', AuthHandler);
app.use('/api/lab', labRoutes);

app.use('/api/billing', restrictToLoggedInUserOnly, restrictTo(['ADMIN', 'RECEPTIONIST', 'STAFF']), billingHandler);
app.use('/api/admin', restrictToLoggedInUserOnly, restrictTo(['ADMIN',"STAFF"]), bulkUpload);
app.use('/api/admin',restrictToLoggedInUserOnly,restrictTo(['ADMIN']),AdminHandler);
app.use('/api/receptionist',restrictToLoggedInUserOnly, restrictTo(['ADMIN', 'STAFF']),restrictToDesignation(['Receptionist',"Head Nurse","Lab Technician"]),ReceptionistHandler);
app.use('/api/doctor', restrictToLoggedInUserOnly,restrictTo(['ADMIN', 'DOCTOR']),doctorHandler);
app.use('/api/ipd', restrictToLoggedInUserOnly,restrictTo(['ADMIN', 'DOCTOR', 'STAFF']), restrictToDesignation(['Receptionist', 'Head Nurse']),ipdHandler);
app.use('/api/procedures',restrictToLoggedInUserOnly, restrictTo(['ADMIN', 'DOCTOR', 'STAFF']), restrictToDesignation(['Receptionist', 'Head Nurse']),procedure);
app.use('/api/inventory',restrictToLoggedInUserOnly,restrictTo(['ADMIN', 'STAFF']),restrictToDesignation(['Inventory Manager']),inventoryManager);
app.use('/api/reports',restrictToLoggedInUserOnly, restrictTo(['ADMIN']),reports);

