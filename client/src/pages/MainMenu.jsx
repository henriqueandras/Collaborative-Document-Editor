import Button from "@mui/material/Button";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { SocketClient } from "../SocketClientContext";
import { v4 as uuid } from "uuid";

export const MainMenu = () => {
  const navigate = useNavigate();
  const socket = useContext(SocketClient);

  return (
    <div>
      <Button
        style={{ display: "block", margin: "auto", width: "20vw" }}
        variant="outlined"
        onClick={() => {
          const documentId = uuid();
          socket.socket.emit("create-document", {
            documentId: documentId,
          });
          navigate(`document?id=${documentId}`);
        }}
      >
        Create Document
      </Button>
      <Button
        style={{
          display: "block",
          margin: "auto",
          marginTop: "5vh",
          width: "20vw",
        }}
        variant="outlined"
        onClick={() => {
          navigate("list");
        }}
      >
        Open Existing Document
      </Button>
    </div>
  );
};
