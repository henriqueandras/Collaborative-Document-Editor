const express = require("express");
const cors = require("cors");
const Rooms = require("./Rooms/Rooms");
const { connect } = require("./Database/db");
let Document = require("./Database/Document/Document");
const { getInsertedDataFromQuill } = require("./util/util");
const ioClient = require("socket.io-client");

const synchronizer = require("./Database/SyncDoc");

const app = express();
const http = require("http").Server(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Default port number for server
let PORT = 3001;
let useLocalDb = false;
let MONGO_PORT = 27017;

// Port number is read from command line so that we can create servers with custom ports (different numbers are needed for leader election)
if (process.argv.length >= 3) {
  PORT = Number.parseInt(process.argv[2]);
}

// Read command line argument to determine database type or custom MongoDB port
if (process.argv.length >= 4) {
  if (process.argv[3] == "local") {
    Document = require("./Database/LocalDb/localDb");
    useLocalDb = true;
  } else if (Number.isInteger(Number(process.argv[3]))) {
    MONGO_PORT = Number(process.argv[3]);
  }
}

/*
 * Although Socket.io has a Rooms feature, this is a custom-made class to handle different client
 * Connections simultaneously, so that we don't emit updates to every client (only the ones that are actively part of the document)
 */
const rooms = new Rooms();
if (!useLocalDb) {
  connect(MONGO_PORT);
} else {
  console.log("Running local in-mem db");
}

// Default document structure
const defaultValue = { updates: [], text: [], version: 0 };

const currentEndpoint = `http://10.13.68.132:${PORT}`;
// const currentEndpoint = 'ws://0.tcp.us-cal-1.ngrok.io:16707';
const endpointPORT = currentEndpoint.split(":")[2];

// Array to store connections to other servers
let otherServerSockets = [];
// Array to store connections from clients
const serverConnections = [];

// List of other server endpoints to be used during leader election
const listOfEndpoints = [
  "http://10.13.111.188:3001",
  "http://10.13.68.132:3002",
  "http://10.13.170.52:3003/",
  // "http://localhost:3004",
];
// Flag indicating if the server is currently running an election process
let running = false;
// Flag for the bully election algorithm
let bullyReceived = false;
// Object to store the current leader's info
let leader = null;

// Determine the highest port number among the endpoints to aid in leader election logic
const maxEndpoint = listOfEndpoints.reduce((acc, curr) => {
  const port = Number.parseInt(curr.split(":")[2]);
  if (port > acc) {
    acc = port;
  }
  return acc;
}, 0);

// Initialize the socket.io server with CORS enabled for all origins
const ioServer = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Establish connections to other servers excluding itself, to prevent self-connection
listOfEndpoints.forEach((serverEndpoint) => {
  if (!serverEndpoint.includes(String(endpointPORT))) {
    const socketServer = ioClient(serverEndpoint);
    // createSocketListeners(socketServer);

    synchronizer.setupPrimarySocketForSync(socketServer, Document);

    socketServer.on("bully-message", (message) => {
      bullyReceived = true;
      console.log("bully-received");
    });

    otherServerSockets.push({
      serverEndpoint: serverEndpoint,
      sockId: socketServer.id,
      socket: socketServer,
    });
  }
});

// Function to broadcast messages to all connected servers and clients
function broadcastToAll(event, message) {
  for (const {
    serverEndpoint,
    sockId,
    socket: actualSocket,
  } of otherServerSockets) {
    actualSocket.emit(event, message);
  }
  for (const sock of serverConnections) {
    sock.emit(event, message);
  }
}

// Function to create socket listeners for different events
function createSocketListeners(io) {
  // Listen for new connection
  io.on("connection", (socket) => {
    // Check if current io is the main server (ioServer)
    if (io === ioServer) {
      // If it is, add the connected socket to the list of server connections
      serverConnections.push(socket);
    }
    console.log("A client connected!");

    // middleware
    socket.use(([event, ...args], next) => {
      if (
        event === "create-document" ||
        event === "updates" ||
        event === "join-document" ||
        event === "client-disconnect"
      ) {
        console.log(`middleware called on event ${event}`);
        if (!rooms.getProxySID() || rooms.getProxySID() != socket.id) {
          console.log("New proxy, clearing rooms...");
          rooms.setProxySID(socket.id);
          rooms.removeAllCurrentUsers();
        }
      }
      next();
    });

    // Set up socket for synchronization
    synchronizer.setupBackupSocketForSync(socket, Document);

    // socket.on("bully-message", (message) => {
    //   bullyReceived = true;
    //   console.log("bully-received");
    // });

    /*
     * Check if a leader has been elected, if it has, then let each other server know who the leader is.
     * This message comes from the proxy
     */
    socket.on("leader-elected", (message) => {
      console.log("leader received");
      leader = message;
      running = false;
      console.log(`${PORT}:`, leader);
      serverConnections.forEach((s) => {
        ioServer.to(s.id).emit("leader-elected", message);
      });
    });

    /*
     * The proxy initiates an election when the primary server disconnects
     */
    socket.on("initiate-election", (message) => {
      if(running)
      {
        return;
      }
      
      leader = null;
      console.log("initiate-election called");
      if (message.id < endpointPORT) {
        socket.emit("bully-message"); // if current server that received an election has a great port number than other servers, send a bully message
      }
      running = true; // I am running in this election
      let isTop = true;
      for (const {
        serverEndpoint,
        sockId,
        socket: actualSocket,
      } of otherServerSockets) {
        const ports = serverEndpoint.split(":");
        if (ports[2] > endpointPORT) {
          console.log("is not top");
          isTop = false;
          actualSocket.emit("initiate-election", {
            id: endpointPORT,
          });
          setTimeout(() => {
            if (!bullyReceived && !leader) {
              leader = {
                leader: socket.id,
                endpoint: currentEndpoint,
              };
              // Once leader is elected broadcast to all other servers who the leader is
              broadcastToAll("leader-elected", {
                leader: socket.id,
                endpoint: currentEndpoint,
              });
            } else {
              setTimeout(() => {
                if (leader) {
                  running = false;
                } else {
                  actualSocket.emit("initiate-election", {
                    id: endpointPORT,
                  });
                }
              }, 100 + (maxEndpoint - endpointPORT) * 25); //Wait for a period of time before taking action, it takes some time for messages to get received
            }
          }, 100 + (maxEndpoint - endpointPORT) * 25);
        }
      }
      if (isTop) {
        console.log("is top");
        broadcastToAll("leader-elected", {
          leader: socket.id,
          endpoint: currentEndpoint,
        });
      }
    });

    /*
     * When we create a document, we need to create a room and make sure the correct sockets for each user are added to that room
     */
    const handleCreateDocument = async (message) => {
      const { documentId, sId } = message;
      console.log("Hello", sId);
      rooms.removeFromAnyOtherRoom(sId);
      rooms.createRoom(documentId);
      rooms.addPermittedUsers(documentId, sId);
      rooms.addCurrentUsers(documentId, sId);
      console.log("creating document: ", documentId);
      console.log(`current users: ${rooms.getAllCurrentUsers()}`);
      await synchronizer.syncCreateDocument(
        Document,
        { id: documentId, data: defaultValue },
        otherServerSockets
      );
    };

    socket.on("create-document", handleCreateDocument);

    /*
     * Listen to updates from the server,
     * we listen for things like socketId, delta (latest text change), userId, version(for operational transform)
     */
    socket.on("updates", async (message) => {
      console.log("RECIEVED UPDATES");
      const {
        documentId,
        delta,
        sId,
        content,
        userId,
        version,
        uId,
        prevDelta,
        deltaId,
      } = message;
      const userList = rooms.getCurrentUsers(documentId);
      console.log(userList);
      console.log(documentId);
      const prev = await Document.findById(documentId);

      if (!prev) {
        try {
          await handleCreateDocument({
            documentId: documentId,
            sId: sId,
          });
        } catch (e) {
          console.log(e);
        }
      }
      console.log("ops", JSON.stringify(delta.ops[1]));
      console.log("delta", JSON.stringify(delta));
      let up = [];
      let txt = [];
      let docVer = 0;
      if (prev) {
        if (prev.data) {
          up = [...prev.data.updates];
          txt = [...prev.data.text];
          docVer = prev.data.version + 1;
        }
      }
      const newData = {
        updates: [...up, ...delta.ops],
        text: [...txt, getInsertedDataFromQuill(delta)],
        content: content,
        version: docVer,
      };
      // Update database with new updates that were received
      await synchronizer.syncFindByIdAndUpdate(
        Document,
        { id: documentId, data: newData },
        otherServerSockets
      );
      // Most of the above content are specifically to deal with formatting operational transformation updates
      // As well as updating the database.

      // We need to send the updates back to the proxy, this is so that other clients (not the one who sent the update)
      // Can also get the latest updates.
      socket.emit("new-updates", {
        delta: delta,
        userList: userList,
        senderId: sId,
        userId: userId,
        version: version,
        uId: uId,
        prevDelta: prevDelta,
        deltaId: deltaId,
      });
    });

    // When client tries to join a document, perform some setup
    socket.on("join-document", async (message) => {
      const { documentId, sId, userId } = message;
      console.log("JOIN DOCUMENT", message);

      if(documentId == 0)
      {
        console.log("Invalid Doc ID: ", documentId);
        return;
      }

      const document = await Document.findById(documentId);
      console.log("document", document);
      // If document already exists
      if (document) {
        if (!rooms.includesDocument(documentId)) {
          //if no room already exists with this document, then create a new room
          rooms.createRoom(documentId);
        }

        rooms.removeFromAnyOtherRoom(sId); //Disconnect client socket from other documents when joining a new document to save processing times
        rooms.addCurrentUsers(documentId, sId);
        rooms.addPermittedUsers(documentId, sId);

        const userId = rooms.getCurrentUsers(documentId).length;
        console.log(`Userid: ${userId}`);
        socket.emit("join-document-data", {
          text: document.data.content,
          sId: sId,
          userId: userId,
          version: document.data.version,
        });
      } else {
        //Otherwise if no document exists, attempt to create one
        try {
          await handleCreateDocument({
            documentId: documentId,
            sId: sId,
          });
        } catch (e) {
          console.log(`ERROR:${e}`);
        }
        const document = await Document.findById(documentId);
        const userId = rooms.getCurrentUsers(documentId).length;
        // Send the document's content to proxy
        socket.emit("join-document-data", {
          text: document.data.content,
          sId: sId,
          userId: userId,
          version: 0,
        });
      }
      console.log(`current users: ${rooms.getAllCurrentUsers()}`);
    });
    // When a client disconnects, remove them from the room
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
