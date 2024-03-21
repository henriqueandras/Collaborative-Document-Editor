import { createContext } from "react";
import PropTypes from "prop-types";
import { io } from "socket.io-client";
import { useState, useEffect } from "react";

export const SocketClient = createContext(null);

export default function SocketClientContext({ children }) {
  const [clientSocket, setClientSocket] = useState({
    address:"http://localhost:1892",
    socket: io("ws://localhost:1892", {
      extraHeaders: new Headers({
        "ngrok-skip-browser-warning": "69420",
      }),
    })
  });
  useEffect(() => {
    clientSocket.socket.on("connect_error", () => {
      clientSocket.socket.close();
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
