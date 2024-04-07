const io = require("socket.io-client");

const cors = require("cors");
const express = require("express");

const app = express();
const http = require("http").Server(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Default port for the proxy server
let PORT = 1892;

// Allow port override from command line arguments
if (process.argv.length === 3) {
  PORT = Number.parseInt(process.argv[2]);
}

// Setting up the socket.io server with CORS enabled
const ioserver = require("socket.io")(http, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"], // Allowed methods
  },
});

// List of potential server endpoints to be used during leader election 
const listOfEndpoints = [
  "http://localhost:3004",
  "http://localhost:3003",
  "http://localhost:3002",
  "http://localhost:3001",
];

function get_next_endpoint(){
  const next = listOfEndpoints.shift();
  listOfEndpoints.push(next);

  return next;
}

let SERVER_ENDPOINT = get_next_endpoint();

let server_socket = io(SERVER_ENDPOINT);

// Function to setup connection with the server
function setupProxyServerConnection(server_socket){
  // Event lisgener for successful connection to the server
  server_socket.on("connect", (sock) => {
    console.log("Connected to server");
  
    // Handle leader election event
    server_socket.on("leader-elected", (message) => {
      // Close current connection and connect to the new leader server
      ioserver.fetchSockets().then((sockets)=>{
        for(const sock of sockets){
          sock.emit("error_message",{
            resolution:"RESOLVED"
          });
        }
      });

      server_socket.close();
      const { endpoint } = message;
      if(SERVER_ENDPOINT!==endpoint){
        listOfEndpoints.push(SERVER_ENDPOINT);
      }
      server_socket = io(endpoint);
      SERVER_ENDPOINT = endpoint;
      console.log("NEW LEADER: ", endpoint);

      // Recursively setup connection to the new leader
      setupProxyServerConnection(server_socket);
      server_socket.on("connect_error", () => {
        console.log("connect error to ", SERVER_ENDPOINT);
        server_socket.close();
        onConnectError(true);
      });
      // Setup client-proxy connection with the new server socket 
      setupClientProxyConnection(ioserver, server_socket);

      // on new primary server:
      //  - reset all connected client socket listeners.
      //  - ask client to rejoin document.
      server_socket.on("connect", (sock) => {
        ioserver.fetchSockets().then(sockets => {
        console.log("\n\nRequesting all clients to rejoin...")
        for (const socket of sockets) {
          socket.removeAllListeners();
          setupClientSocket(socket, server_socket);
          socket.emit("rejoin-doc", null);
        }
        });
      });
    });
  
    // Handle new updates from server, forward updates to connected clients
    server_socket.on("new-updates", async (message) => {
      const { delta, userList, senderId, userId, version, uId,prevDelta, deltaId } = message;
      // Loop through user list to send to connected clients only
      userList.map((sock) => {
        // Delta contains newest updates to document
        console.log(delta, sock);
        if (sock !== senderId) {
          // Send following parameters
          ioserver.to(sock).emit("new-updates", {
            operation: delta,
            version: version,
            userId: userId,
            uId: uId,
            prevDelta:prevDelta, 
            deltaId: deltaId
          });
        }
      });
    });
  
    // Handle document joining data
    server_socket.on("join-document-data", async (message) => {
      const { text, sId, userId, version } = message;
      console.log("join message: ", message);
      console.log("join sId: ", sId);
      // Send following parameters
      ioserver.to(sId).emit("join-document-data", {
        delta:text,
        userId:userId,
        version:version
      });
    });

    // Handle error messages from server, forward error messages to the appropriate client
    server_socket.on("error_message",(message)=>{
      const { err, resolution, sId } = message;
      // Send following parameters
      ioserver.to(sId).emit("error_message",{
        err:err,
        resolution:resolution
      });
    });
  });

}

setupProxyServerConnection(server_socket);

// Function to handle connection errors and attempt reconnection
function onConnectError(shouldInitiateElection) {
  // Close the current connection and shift to the next server endpoint
  server_socket.close();
  SERVER_ENDPOINT = get_next_endpoint();
  server_socket = io(SERVER_ENDPOINT);

  // Initiate leader election
  if(shouldInitiateElection){
    ioserver.fetchSockets().then((sockets)=>{
      for(const sock of sockets){
        sock.emit("error_message",{
          err:"Reconnecting please wait..."
        });
      }
    });
    server_socket.emit("initiate-election",{
      id:-1
    });
  }

  // Recursively setup the new connection
  setupProxyServerConnection(server_socket);
  server_socket.on("connect_error", () => {
    console.log("connect error to ", SERVER_ENDPOINT);
    onConnectError(true);
  });
}

// Initial connection error handling setup
server_socket.on("connect_error", () => {
  console.log("connect error to ", SERVER_ENDPOINT);
  onConnectError(true);
});

// Function to setup event listeners for client sockets
function setupClientSocket(socket, server_socket){
    // Event listener for "create-document" events, when received, relay to server socket
    socket.on("create-document", async (message) => {
      console.log("create document called...");
      // Emit create-document event to server socket
      server_socket.emit("create-document", {
        // Include the following parameters
        documentId: message.documentId,
        sId: socket.id,
      });
    });

    // Event listener for "join-document" events, when received, relay
    socket.on("join-document", async (message) => {
      console.log("join document called...", message);
      // Emit join-document event to server socket
      server_socket.emit("join-document", {
        // Include the following parameters 
        documentId: message.documentId,
        userId: message.userId,
        sId: socket.id,
      });
    });

    // Event listener for "updates" events, when received, relay
    socket.on("updates", async (message) => {
      console.log("updates called...", JSON.stringify(message));
      // Destructure the message to extract relevant properties 
      const { documentId, delta, content, version,userId, uId,prevDelta, deltaId } = message;
      // Emit updates event to server socket
      server_socket.emit("updates", {
        // Include the following parameters
        documentId: documentId,
        delta: delta,
        sId: socket.id,
        content: content,
        version: version,
        userId: userId,
        uId: uId,
        prevDelta:prevDelta,
        deltaId:deltaId
      });
    });

    // Listener for "disconnect" events, when received, relay
    socket.on("disconnect", async () => {
      console.log("disconnect called...");
      // Emit disconnect event to server socket
      server_socket.emit("client-disconnect", {
        // Include socket id of disconnected client
        sId: socket.id,
      });
    });
}

function setupClientProxyConnection(ioServer, server_socket){
  ioServer.on("connection", (socket) => {
    console.log("A client connected!");
    setupClientSocket(socket, server_socket);
  });

}

setupClientProxyConnection(ioserver, server_socket);

// Retriebe document list from current server endpoint and forward to client
app.get("/getDocumentList", (req, res) => {
  fetch(`${SERVER_ENDPOINT}/getDocumentList`)
    .then((result) => {
      if (result.ok) return result.json();
      else throw new Error("fetch failed!");
    })
    .then((data) => {
      // console.log(data);
      res.send({
        documents: data.documents,
      });
    })
    .catch((error) => console.error("Error:", error));
});

// Start listening on the configured port
http.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
