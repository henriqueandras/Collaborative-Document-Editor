import { createContext } from "react";
import PropTypes from "prop-types";
import { io } from "socket.io-client";
import { useState, useEffect } from "react";

// Create a new context for the socket.io client
export const SocketClient = createContext(null);

// Provider component for the SocketClient context
export default function SocketClientContext({ children }) {
  // Initialize the socket.io client and its state
  const [clientSocket, setClientSocket] = useState({
    // Address info of primary proxy
    address:"http://localhost:1892",
    socket: io("ws://localhost:1892", {
      extraHeaders: new Headers({
        "ngrok-skip-browser-warning": "69420",
      }),
    })
  });
  // Handle socket.io client lifecycle and connection errors
  useEffect(() => {
    // Upon connection error, attempt to connect to backup proxy
    clientSocket.socket.on("connect_error", () => {
      clientSocket.socket.close();
      // Address info of backup proxy
      const socket2 = io("ws://localhost:1893", {
        extraHeaders: new Headers({
          "ngrok-skip-browser-warning": "69420",
        }),
      });
      setClientSocket({
        address:"http://localhost:1893",
        socket: socket2
      });
    });
    clientSocket.socket.on("connect", () => {
      setClientSocket(clientSocket);
    });
  }, []);
  return (
    <SocketClient.Provider value={clientSocket}>
      {children}
    </SocketClient.Provider>
  );
}

SocketClientContext.propTypes = {
  children: PropTypes.any,
};
