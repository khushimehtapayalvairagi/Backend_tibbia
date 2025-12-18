const { Server } = require('socket.io');

let io;

const setupSocket = (server) => {
    io = new Server(server, {
        cors: {
           origin: ["http://localhost:3000"],
            // origin: ["http://localhost:3000", "https://uudra.in"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('joinDoctorRoom', (doctorId) => {
            socket.join(`doctor_${doctorId}`);
            console.log(`Doctor ${doctorId} joined room doctor_${doctorId}`);
        });

        socket.on('joinReceptionistRoom', () => {
            socket.join('receptionist_room');
            console.log('A receptionist joined the receptionist_room');
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { setupSocket, getIO };
