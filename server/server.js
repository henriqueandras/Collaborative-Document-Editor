const socket = require("socket.io");
const express = require('express');
const cors = require('cors');
const Rooms = require("./Rooms/rooms");

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(cors());

const REST_API_PORT = 4001;
const SOCKET_PORT = 3001;

const rooms = new Rooms();

const io = socket(SOCKET_PORT, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A client connected!");

  socket.on("create-document",(message)=>{
    const { documentId } = message;
    rooms.createRoom(documentId);
    rooms.addPermittedUsers(documentId, socket.id);
    rooms.addCurrentUsers(documentId, socket.id);
  });

  socket.on("updates", (message) => {
    const { documentId, delta } = message;
    const userList = rooms.getCurrentUsers(documentId);
    console.log(userList.length);
    console.log(documentId);
    userList.forEach((sock)=>{
      console.log(delta, sock);
      // console.log(io.sockets);
      if(sock !== socket){
        io.to(sock).emit("new-updates",delta);
      }
    });
    // Send client updates to everyone
    // socket.broadcast.emit("new-updates", delta);
  });

  socket.on("join-document",(message)=>{
    const {documentId} = message;
    rooms.addCurrentUsers(documentId, socket.id);
    rooms.addPermittedUsers(documentId, socket.id);
  });
});

app.get('/getDocumentList',(req,res)=>{
  const data = rooms.getDocuments();
  console.log(data);
  res.send({
    documents: data
  });
});

app.listen(REST_API_PORT, console.log(`REST-API listening on port: ${REST_API_PORT}`));