import { createContext } from "react";
import PropTypes from  "prop-types";
import { io } from "socket.io-client";

export const SocketClient = createContext(null);

export default function SocketClientContext({children}){
    let socket = io("http://localhost:3001");
    return(
        <SocketClient.Provider value={socket}>
            {children}
        </SocketClient.Provider>
    )
}

SocketClientContext.propTypes =  {
    children: PropTypes.any
}