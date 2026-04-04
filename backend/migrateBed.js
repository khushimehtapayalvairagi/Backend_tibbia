const mongoose = require("mongoose");
const Ward = require("./models/Ward");

mongoose
  .connect(
    "mongodb://hospitalAdmin:Password123@103.138.96.104:27017/hospitaldb?authSource=admin"
  )
  .then(async () => {
    console.log("Connected to DB — starting migration...");

    const wards = await Ward.find();

    for (const ward of wards) {
      let expandedBeds = [];

      for (const bed of ward.beds) {
        const raw = String(bed.bedNumber).trim();

        // RANGE: "1 To 15", "61 To 70"
        if (/^\d+\s*to\s*\d+$/i.test(raw)) {
          const [start, end] = raw
            .toLowerCase()
            .split("to")
            .map((n) => parseInt(n.trim()));

          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) {
              expandedBeds.push({
                bedNumber: i,
                status: bed.status || "available",
              });
            }
          }
        }
        // SINGLE: "77"
        else if (!isNaN(parseInt(raw))) {
          expandedBeds.push({
            bedNumber: parseInt(raw),
            status: bed.status || "available",
          });
        }
      }

      // Remove duplicates + sort
      const uniqueMap = {};
      expandedBeds.forEach((b) => {
        uniqueMap[b.bedNumber] = b;
      });

      ward.beds = Object.values(uniqueMap).sort(
        (a, b) => a.bedNumber - b.bedNumber
      );

      await ward.save();
      console.log(`✔ Migrated ward: ${ward.name}`);
    }

    console.log("🎉 Migration complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
