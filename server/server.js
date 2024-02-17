const WebSocket = require("ws");

const io = require("socket.io")(3001, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A client connected!");
  socket.on("updates", (delta) => {
    // Send client updates to everyone
    socket.broadcast.emit("new-updates", delta);
  });
});
