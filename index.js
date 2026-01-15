require("dotenv").config(); // Load env variables first

const express = require("express");
const http = require("http");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const { connectDB } = require("./utils/config");
const { setupSocket } = require("./utils/sockets");

// Import auth middleware
const {
  restrictToLoggedInUserOnly,
  restrictTo,
  restrictToDesignation
} = require("./middlewares/auth");

// Import route handlers
const AuthHandler = require("./routes/auth");
const AdminHandler = require("./routes/admin");
const ReceptionistHandler = require("./routes/receptionist");
const doctorHandler = require("./routes/doctor");
const ipdHandler = require("./routes/ipd");
const procedure = require("./routes/procedure");
const inventoryManager = require("./routes/inventoryManager");
const bulkUpload = require("./routes/bulkUpload");
const labRoutes = require("./routes/Lab");
const billingHandler = require("./routes/billing");
const reports = require("./routes/reports");

const app = express();
const server = http.createServer(app);

// Standard Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "https://kashichem.com",
      "http://kashichem.com",
      "http://localhost:3000"
    ],
    credentials: true,
  })
);

// -----------------------------------------------------------------------------
//  Load ROUTES *after* DB is connected
// -----------------------------------------------------------------------------

(async () => {
  try {
    // 🔗 Connect to database
    await connectDB(process.env.DATABASE_URL);

    // ------------------- ROUTES -------------------

    // Auth routes (no restrictions)
    app.use("/api/auth", AuthHandler);

    // Lab routes (no restrictions)
    app.use("/api/lab", labRoutes);

    // Protected routes (need login + roles/designations)
    app.use(
      "/api/billing",
      restrictToLoggedInUserOnly,
      restrictTo(["ADMIN", "RECEPTIONIST", "STAFF"]),
      billingHandler
    );

    app.use(
      "/api/admin",
      restrictToLoggedInUserOnly,
      restrictTo(["ADMIN", "STAFF"]),
      bulkUpload
    );

    app.use(
      "/api/admin",
      restrictToLoggedInUserOnly,
      restrictTo(["ADMIN"]),
      AdminHandler
    );

    app.use(
      "/api/receptionist",
      restrictToLoggedInUserOnly,
      restrictTo(["ADMIN", "STAFF"]),
      restrictToDesignation(["Receptionist", "Head Nurse", "Lab Technician"]),
      ReceptionistHandler
    );

    app.use(
      "/api/doctor",
      restrictToLoggedInUserOnly,
      restrictTo(["ADMIN", "DOCTOR"]),
      doctorHandler
    );

    app.use(
      "/api/ipd",
      restrictToLoggedInUserOnly,
      restrictTo(["ADMIN", "DOCTOR", "STAFF"]),
      restrictToDesignation(["Receptionist", "Head Nurse"]),
      ipdHandler
    );

    app.use(
      "/api/procedures",
      restrictToLoggedInUserOnly,
      restrictTo(["ADMIN", "DOCTOR", "STAFF"]),
      restrictToDesignation(["Receptionist", "Head Nurse"]),
      procedure
    );

    app.use(
      "/api/inventory",
      restrictToLoggedInUserOnly,
      restrictTo(["ADMIN", "STAFF"]),
      restrictToDesignation(["Inventory Manager"]),
      inventoryManager
    );

    app.use(
      "/api/reports",
      restrictToLoggedInUserOnly,
      restrictTo(["ADMIN"]),
      reports
    );

    // Initialize socket after DB and routes
    setupSocket(server);

    // Start listening
    server.listen(process.env.PORT || 8001, () => {
      console.log(
        `Server is listening on PORT: ${process.env.PORT || 8001}`
      );
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1); // Exit with failure
  }
})();
