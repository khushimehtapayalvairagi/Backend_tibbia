const { Server } = require("socket.io");

let io;

const setupSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "https://kashichem.com",
        "http://kashichem.com",

        //  "https://kloudcrm.site",
      ],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    socket.on("joinDoctorRoom", (doctorId) => {
      socket.join(`doctor_${doctorId}`);
      console.log(`Doctor joined: doctor_${doctorId}`);
    });

    socket.on("joinReceptionistRoom", () => {
      socket.join("receptionist_room");
      console.log("Receptionist joined room");
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};

module.exports = { setupSocket, getIO };
