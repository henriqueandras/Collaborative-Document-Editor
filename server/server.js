const express = require('express');
const cors = require('cors');
const Rooms = require("./Rooms/rooms");

const app = express();
const http = require('http').Server(app);

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cors());

const PORT = 3001;

const rooms = new Rooms();

const io = require("socket.io")(http, {
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

http.listen(PORT,()=>{
  console.log(`Listening on port ${PORT}`);
})