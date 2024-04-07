const io = require("socket.io-client");

const cors = require("cors");
const express = require("express");

const app = express();
const http = require("http").Server(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

let PORT = 1892;

if (process.argv.length === 3) {
  PORT = Number.parseInt(process.argv[2]);
}

const ioserver = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

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

function setupProxyServerConnection(server_socket){
  server_socket.on("connect", (sock) => {
    console.log("Connected to server");
  
    server_socket.on("leader-elected", (message) => {
      server_socket.close();
      const { endpoint } = message;
      if(SERVER_ENDPOINT!==endpoint){
        listOfEndpoints.push(SERVER_ENDPOINT);
      }
      server_socket = io(endpoint);
      SERVER_ENDPOINT = endpoint;
      console.log("NEW LEADER: ", endpoint);
      setupProxyServerConnection(server_socket);
      server_socket.on("connect_error", () => {
        console.log("connect error to ", SERVER_ENDPOINT);
        server_socket.close();
        onConnectError(true);
      });
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
  
    server_socket.on("new-updates", async (message) => {
      const { delta, userList, senderId } = message;
      userList.map((sock) => {
        console.log(delta, sock);
        // console.log(io.sockets);
        if (sock !== senderId) {
          ioserver.to(sock).emit("new-updates", delta);
        }
      });
    });
  
    server_socket.on("join-document-data", async (message) => {
      const { text, sId } = message;
      console.log("join message: ", message);
      console.log("join sId: ", sId);
      ioserver.to(sId).emit("join-document-data", text);
    });

    server_socket.on("error_message",(message)=>{
      const { err, resolution, sId } = message;
      ioserver.to(sId).emit("error_message",{
        err:err,
        resolution:resolution
      });
    });
  });

}

setupProxyServerConnection(server_socket);

function onConnectError(shouldInitiateElection) {
  server_socket.close();
  SERVER_ENDPOINT = get_next_endpoint();
  server_socket = io(SERVER_ENDPOINT);
  if(shouldInitiateElection){
    server_socket.emit("initiate-election",{
      id:-1
    });
  }
  setupProxyServerConnection(server_socket);
  server_socket.on("connect_error", () => {
    console.log("connect error to ", SERVER_ENDPOINT);
    onConnectError(true);
  });
}

server_socket.on("connect_error", () => {
  console.log("connect error to ", SERVER_ENDPOINT);
  onConnectError(true);
});

function setupClientSocket(socket, server_socket){
    socket.on("create-document", async (message) => {
      console.log("create document called...");
      server_socket.emit("create-document", {
        documentId: message.documentId,
        sId: socket.id,
      });
    });
    socket.on("join-document", async (message) => {
      console.log("join document called...", message);
      server_socket.emit("join-document", {
        documentId: message.documentId,
        userId: message.userId,
        sId: socket.id,
      });
    });
    socket.on("updates", async (message) => {
      console.log("updates called...", JSON.stringify(message));
      const { documentId, delta, content} = message;
      server_socket.emit("updates", {
        documentId: documentId,
        delta: delta,
        sId: socket.id,
        content: content
      });
    });
    socket.on("disconnect", async () => {
      console.log("disconnect called...");
      server_socket.emit("client-disconnect", {
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

http.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
