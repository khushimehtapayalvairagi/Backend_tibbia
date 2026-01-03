const mongoose = require("mongoose");
const Ward = require("./models/Ward"); // Adjust path if needed

mongoose
  .connect(
    "mongodb://hospitalAdmin:Password123@103.138.96.104:27017/hospitaldb?authSource=admin"
  )
  .then(async () => {
    console.log("Connected to DB — starting migration...");

    const wards = await Ward.find();

    for (const ward of wards) {
      let newBeds = [];

      for (const b of ward.beds) {
        const p = String(b.bedNumber).trim().toLowerCase();

        if (p.includes("to")) {
          const parts = p.split(" ");
          const startNum = parseInt(parts[0]);
          const endNum = parseInt(parts[2]);
          if (!isNaN(startNum) && !isNaN(endNum)) {
            for (let i = startNum; i <= endNum; i++) {
              newBeds.push({ bedNumber: i, status: b.status });
            }
          }
        } else {
          const num = parseInt(p);
          if (!isNaN(num)) {
            newBeds.push({ bedNumber: num, status: b.status });
          }
        }
      }

      // Deduplicate and sort numeric beds
      const uniqueBeds = [];
      const seen = {};
      newBeds
        .sort((a, b) => a.bedNumber - b.bedNumber)
        .forEach((bed) => {
          if (!seen[bed.bedNumber]) {
            seen[bed.bedNumber] = true;
            uniqueBeds.push(bed);
          }
        });

      ward.beds = uniqueBeds;
      await ward.save();
      console.log(`Migrated ward: ${ward.name}`);
    }

    console.log("Migration complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
