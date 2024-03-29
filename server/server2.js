const express = require("express");
const cors = require("cors");
const Rooms = require("./Rooms/Rooms");
const { connect } = require("./Database/db");
let Document = require("./Database/Document/Document");
const { getInsertedDataFromQuill } = require("./util/util");
const ioClient = require("socket.io-client");

const synchronizer = require("./Database/SyncDoc")

const app = express();
const http = require("http").Server(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

let PORT = 3001;
// const RANK = 0;
let useLocalDb = false;
let MONGO_PORT = 27017;

if (process.argv.length >= 3) {
  PORT = Number.parseInt(process.argv[2]);
  // RANK = Number.parseInt(process.argv[3]);
}

if (process.argv.length >= 4){
  if (process.argv[3] == "local"){
    Document = require('./Database/LocalDb/localDb');
    useLocalDb = true;
  }else if(Number.isInteger(Number(process.argv[3]))){
    MONGO_PORT = Number(process.argv[3]);
  }
}

const rooms = new Rooms();
if(!useLocalDb){
  connect(MONGO_PORT);
}else{
  console.log("Running local in-mem db")
}
const defaultValue = { updates: [], text: [] };

const currentEndpoint = `http://10.59.175.70:${PORT}`;
// const currentEndpoint = 'ws://0.tcp.us-cal-1.ngrok.io:16707';
const endpointPORT = currentEndpoint.split(":")[2];

let otherServerSockets = [];
const serverConnections = [];
const listOfEndpoints = [
  "http://10.59.175.71:3001",
  "http://10.59.175.70:3002",
  "http://10.59.175.74:3003",
  // "http://localhost:3004",
];
let running = false;
let bullyReceived = false;
let leader = null;

const ioServer = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

listOfEndpoints.forEach((serverEndpoint) => {
  if (!serverEndpoint.includes(String(endpointPORT))) {
    const socketServer = ioClient(serverEndpoint);
    // createSocketListeners(socketServer);
    otherServerSockets.push({
      serverEndpoint: serverEndpoint,
      sockId: socketServer.id,
      socket: socketServer,
    });
  }
});

function broadcastToAll(event, message){
  for (const { serverEndpoint, sockId, socket:actualSocket } of otherServerSockets) {
    actualSocket.emit(event, message);
  }
  for (const sock of serverConnections){
    sock.emit(event, message);
  }
}

function createSocketListeners(io) {
  io.on("connection", (socket) => {
    if(io === ioServer){
      serverConnections.push(socket);
    }
    console.log("A client connected!");

    // middleware
    socket.use(([event, ...args], next) => {
      if(event === 'create-document' || event === 'updates' || event === 'join-document' || 
         event === 'client-disconnect')
      {
        console.log(`middleware called on event ${event}`);
        if(!rooms.getProxySID() || rooms.getProxySID() != socket.id)
        {
          console.log("New proxy, clearing rooms...")
          rooms.setProxySID(socket.id);
          rooms.removeAllCurrentUsers();
        }
      }
      next();
    });

    // Set up socket for synchronization
    synchronizer.setupSocketForSync(socket, Document);

    socket.on("bully-message", (message) => {
      bullyReceived = true;
      console.log("bully-received");
    });

    socket.on("leader-elected", (message) => {
      console.log("leader received");
      leader = message;
      running = false;
      console.log(`${PORT}:`,leader);
      serverConnections.forEach((s)=>{
        ioServer.to(s.id).emit("leader-elected",message);
      });
    });

    socket.on("initiate-election", (message) => {
      leader = null;
      console.log('initiate-election called')
      if(message.id<endpointPORT){
        socket.emit("bully-message");
      }
      running = true;
      let isTop = true;
      for (const { serverEndpoint, sockId, socket:actualSocket } of otherServerSockets) {
        const ports = serverEndpoint.split(":");
        if (ports[2] > endpointPORT) {
          console.log("is not top")
          isTop = false;
          actualSocket.emit("initiate-election", {
            id:endpointPORT
          });
          setTimeout(() => {
            if (!bullyReceived && !leader) {
              leader = {
                leader:socket.id,
                endpoint:currentEndpoint
              };
              // socket.broadcast.emit("leader-elected", {
              //   leader: io.id,
              //   endpoint: `http://localhost:${PORT}`,
              // });
              broadcastToAll("leader-elected",{
                leader: socket.id,
                endpoint: currentEndpoint,
              });
              // socket.broadcast.emit("leader-elected", {
              //   leader: io.id,
              //   endpoint: `http://localhost:${PORT}`,
              // });
            } else {
              setTimeout(() => {
                if (leader) {
                  // broadcastToAll("leader-elected",leader);
                  // socket.broadcast.emit("leader-elected", leader);
                  running = false;
                } else {
                  actualSocket.emit("initiate-election", {
                    id:endpointPORT
                  });
                }
              }, 100);
            }
          }, 100);
        }
      }
      if (isTop) {
        console.log("is top")
        broadcastToAll("leader-elected",{
          leader: socket.id,
          endpoint: currentEndpoint,
        })
        // socket.broadcast.emit("leader-elected", {
        //   leader: socket.id,
        //   endpoint: `http://localhost:${PORT}`,
        // });
      }
    });

    const handleCreateDocument = async (message) => {
      const { documentId, sId } = message;
      console.log("Hello", sId);
      rooms.removeFromAnyOtherRoom(sId);
      rooms.createRoom(documentId);
      rooms.addPermittedUsers(documentId, sId);
      rooms.addCurrentUsers(documentId, sId);
      console.log("creating document: ", documentId);
      console.log(`current users: ${rooms.getAllCurrentUsers()}`);
      // await Document.create({ _id: documentId, data: defaultValue });
      await synchronizer.syncCreateDocument(Document, {id: documentId, data: defaultValue}, otherServerSockets);
    }

    socket.on("create-document", handleCreateDocument);

    socket.on("updates", async (message) => {
      console.log("RECIEVED UPDATES");
      const { documentId, delta, sId, content } = message;
      const userList = rooms.getCurrentUsers(documentId);
      console.log(userList);
      console.log(documentId);
      const prev = await Document.findById(documentId);

      if(!prev){
        try{
          await handleCreateDocument({ 
            documentId:documentId, 
            sId:sId 
          });
        }catch(e){
          console.log(e);
        }
      }
      console.log("ops", JSON.stringify(delta.ops[1]));
      console.log("delta", JSON.stringify(delta));
      let up = [];
      let txt = [];
      if(prev){
        if(prev.data){
          up = [...prev.data.updates];
          txt = [...prev.data.text];
        }
      }
      const newData = {
        updates: [...up, ...delta.ops],
        text: [...txt, getInsertedDataFromQuill(delta)],
        content: content
      };
      // await Document.findByIdAndUpdate(documentId, { data: newData });
      await synchronizer.syncFindByIdAndUpdate(Document, {id: documentId, data: newData}, otherServerSockets);
      socket.emit("new-updates", {
        delta: delta,
        userList: userList,
        senderId: sId,
      });
    });

    socket.on("join-document", async (message) => {
      const { documentId, sId, userId } = message;
      console.log("JOIN DOCUMENT", message);
      const document = await Document.findById(documentId);
      console.log("document", document);
      if(document){
        if(!rooms.includesDocument(documentId))
        {
          rooms.createRoom(documentId);
        }

        rooms.removeFromAnyOtherRoom(sId);
        rooms.addCurrentUsers(documentId, sId);
        rooms.addPermittedUsers(documentId, sId);

        socket.emit("join-document-data", {
          text: document.data.content,
          sId: sId,
        });
      }else{
        try{
          await handleCreateDocument({ 
            documentId:documentId, 
            sId:sId 
          });
        }catch(e){
          console.log(`ERROR:${e}`);
        }
        const document = await Document.findById(documentId);
        socket.emit("join-document-data", {
          text: document.data.content,
          sId: sId,
        });
      }
      console.log(`current users: ${rooms.getAllCurrentUsers()}`);
    });

    socket.on("client-disconnect", async (message) => {
      const { sId } = message;
      rooms.removeFromAnyOtherRoom(sId);
      console.log(`current users: ${rooms.getAllCurrentUsers()}`);
    });
  });
}

createSocketListeners(ioServer);

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
