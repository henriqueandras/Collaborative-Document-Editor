const express = require('express');
const cors = require('cors');
const Rooms = require("./Rooms/rooms");
const {connect} = require('./Database/db');
const Document = require('./Database/Document/Document');

const app = express();
const http = require('http').Server(app);

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors());

const PORT = 3001;

const rooms = new Rooms();
connect();
const defaultValue = "";

const io = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A client connected!");

  socket.on("create-document",async (message)=>{
    const { documentId } = message;
    rooms.removeFromAnyOtherRoom(socket.id)
    rooms.createRoom(documentId);
    rooms.addPermittedUsers(documentId, socket.id);
    rooms.addCurrentUsers(documentId, socket.id);
    await Document.create({_id:documentId, data:defaultValue});
  });

  socket.on("updates", async(message) => {
    const { documentId, delta } = message;
    const userList = rooms.getCurrentUsers(documentId);
    console.log(userList.length);
    console.log(documentId);
    await Document.findByIdAndUpdate(documentId, {delta});
    userList.map((sock)=>{
      console.log(delta, sock);
      // console.log(io.sockets);
      if(sock !== socket.id){
        socket.to(sock).emit("new-updates",delta);
      }
    });
    // Send client updates to everyone
    // socket.broadcast.emit("new-updates", delta);
  });

  socket.on("join-document",async(message)=>{
    const {documentId} = message;
    rooms.removeFromAnyOtherRoom(socket.id);
    rooms.addCurrentUsers(documentId, socket.id);
    rooms.addPermittedUsers(documentId, socket.id);
    const document = await Document.findById(documentId);
    console.log(document);
  });
});

app.get('/getDocumentList',(req,res)=>{
  const data = rooms.getDocuments();
  console.log(data);
  res.send({
    documents: data
  });
});

http.listen(PORT,()=>{
  console.log(`Listening on port ${PORT}`);
})