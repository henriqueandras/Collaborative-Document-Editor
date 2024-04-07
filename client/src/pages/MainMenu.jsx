import Button from "@mui/material/Button";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { SocketClient } from "../SocketClientContext";
import { v4 as uuid } from "uuid";

export const MainMenu = () => {
  const navigate = useNavigate();
  const socket = useContext(SocketClient);

  return (
    <>
      <div id="main-menu-buttons">
        <Button
          style={{
            display: "block",
            margin: "auto",
            width: "20vw",
            height: "75px",
          }}
          variant="contained"
          onClick={async () => {
            const documentId = uuid();
            await socket.socket.emit("create-document", {
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
            width: "20vw",
            height: "75px",
            marginTop: "20px",
          }}
          variant="outlined"
          onClick={() => {
            navigate("list");
          }}
        >
          Open Existing Document
        </Button>
      </div>
    </>
  );
};
