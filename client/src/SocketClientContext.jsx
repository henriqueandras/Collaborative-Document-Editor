import { createContext } from "react";
import PropTypes from "prop-types";
import { io } from "socket.io-client";
import { useState, useEffect } from "react";

export const SocketClient = createContext(null);

export default function SocketClientContext({ children }) {
  const [clientSocket, setClientSocket] = useState({
    address: "ws://0.tcp.us-cal-1.ngrok.io:18143",
    socket: io("ws://0.tcp.us-cal-1.ngrok.io:18143", {
      extraHeaders: new Headers({
        "ngrok-skip-browser-warning": "69420",
      }),
    }),
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
        address: "http://localhost:1893",
        socket: socket2,
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
