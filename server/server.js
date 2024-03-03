const express = require("express");
const cors = require("cors");
const Rooms = require("./Rooms/rooms");
const { connect } = require("./Database/db");
const Document = require("./Database/Document/Document");
const { getInsertedDataFromQuill } = require("./util/util");
const ioClient = require("socket.io-client");

const app = express();
const http = require("http").Server(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

let PORT = 3001;
// const RANK = 0;

if (process.argv.length === 3) {
  PORT = Number.parseInt(process.argv[2]);
  // RANK = Number.parseInt(process.argv[3]);
}

const rooms = new Rooms();
connect();
const defaultValue = { updates: [], text: [] };

let otherServerSockets = [];
const listOfEndpoints = [
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
];
let running = false;

const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

listOfEndpoints.forEach((serverEndpoint) => {
  if (!serverEndpoint.includes(String(PORT))) {
    const socketServer = ioClient(serverEndpoint);
    otherServerSockets.push({
      serverEndpoint: serverEndpoint,
      sockId: socketServer.id,
      socket: socketServer,
    });
    createSocketListeners(socketServer);
  }
});

function createSocketListeners(io) {
  io.on("connection", (socket) => {
    console.log("A client connected!");

    socket.on("bully-message", (message) => {
      bullyReceived = true;
    });

    socket.on("leader-elected", (message) => {
      leader = message.leader;
      running = false;
    });

    socket.on("initiate-election", (message) => {
      running = true;
      let isTop = true;
      for (const { serverEndpoint, sockId, socket } of otherServerSockets) {
        const ports = serverEndpoint.split(":");
        if (ports[2] > PORT) {
          isTop = false;
          io.to(sockId).emit("initiate-election", message);
          setTimeout(() => {
            if (!bullyReceived) {
              leader = socket.id;
              socket.emit("leader-elected", {
                leader: socket.id,
                endpoint: serverEndpoint,
              });
            } else {
              setTimeout(() => {
                if (leader) {
                  socket.emit("leader-elected", {
                    leader: socket.id,
                    endpoint: serverEndpoint,
                  });
                  running = false;
                } else {
                  io.to(socket.id).emit("initiate-election", message);
                }
              }, 5000);
            }
          }, 5000);
        }
      }
      if (isTop) {
        socket.broadcast.emit("leader-elected", {
          leader: socket.id,
        });
      }
    });

    socket.on("create-document", async (message) => {
      const { documentId, sId } = message;
      console.log("Hello", sId);
      rooms.removeFromAnyOtherRoom(sId);
      rooms.createRoom(documentId);
      rooms.addPermittedUsers(documentId, sId);
      rooms.addCurrentUsers(documentId, sId);
      console.log("creating document: ", documentId);
      await Document.create({ _id: documentId, data: defaultValue });
    });

    socket.on("updates", async (message) => {
      const { documentId, delta, sId } = message;
      const userList = rooms.getCurrentUsers(documentId);
      console.log(userList);
      console.log(documentId);
      const prev = await Document.findById(documentId);
      console.log("ops", JSON.stringify(delta.ops[1]));
      console.log("delta", JSON.stringify(delta));
      const newData = {
        updates: [...prev.data.updates, ...delta.ops],
        text: [...prev.data.text, getInsertedDataFromQuill(delta)],
      };
      await Document.findByIdAndUpdate(documentId, { data: newData });
      socket.emit("new-updates", {
        delta: delta,
        userList: userList,
        senderId: sId,
      });
    });

    socket.on("join-document", async (message) => {
      const { documentId, sId } = message;
      rooms.removeFromAnyOtherRoom(sId);
      rooms.addCurrentUsers(documentId, sId);
      rooms.addPermittedUsers(documentId, sId);
      const document = await Document.findById(documentId);
      console.log("document", document);
      socket.emit("join-document-data", {
        text: document.data.text,
        sId: sId,
      });
    });

    socket.on("client-disconnect", async (message) => {
      const { sId } = message;
      rooms.removeFromAnyOtherRoom(sId);
    });
  });
}

createSocketListeners(io);

app.get("/getDocumentList", (req, res) => {
  const data = rooms.getDocuments();
  console.log(data);
  res.send({
    documents: data,
  });
});

http.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
