let io = null;

module.exports = {
  init: (server) => {
    const { Server } = require("socket.io");
    io = new Server(server, {
      cors: {
        origin: ["*"],
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      console.log("New client connected:", socket.id);
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },
};
