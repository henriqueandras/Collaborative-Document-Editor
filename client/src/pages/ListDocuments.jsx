import Button from "@mui/material/Button";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { SocketClient } from "../SocketClientContext";

export default function ListDocuments() {
  const [list, setList] = useState([]);
  const navigate = useNavigate();
  const socket = useContext(SocketClient);

  const fetchData = async () => {
    try {
      const response = await fetch(`${socket.address}/getDocumentList`, {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      console.log(response);
      console.log(data);
      setList(data.documents);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <>
      <h2
        style={{
          display: "block",
          margin: "auto",
          marginTop: "25px",
          textAlign: "center",
          fontFamily: "sans-serif",
          fontWeight: "lighter",
          fontSize: "32px",
          color: "darkslategray",
        }}
      >
        All Documents
      </h2>
      <div id="button-list">
        {list?.map((li, i) => {
          return (
            <div key={i}>
              <Button
                variant="outlined"
                style={{
                  display: "block",
                  margin: "auto",
                  marginTop: "10px",
                  width: "20vw",
                  padding: "12.5px",
                }}
                onClick={() => {
                  socket.socket.emit("join-document", {
                    documentId: li,
                  });
                  navigate(`/document?id=${li}`);
                }}
              >
                {li}
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}
