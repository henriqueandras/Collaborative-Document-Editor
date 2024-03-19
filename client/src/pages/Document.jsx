import Quill from "quill";
import "quill/dist/quill.snow.css";
import "./styles.css";
import { useCallback, useContext, useEffect, useState } from "react";
import { SocketClient } from "../SocketClientContext";
import { useSearchParams } from "react-router-dom";
import { v4 as uuid } from "uuid";

export const Document = () => {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get("id");
  const [quill, setQuill] = useState();
  const [ err, setErr ] = useState({
    error:"",
    resolution:""
  });
  const socket = useContext(SocketClient);

  const handlerUpdateContent = (delta) => {
    console.log("recieved:", delta);
    quill.updateContents(delta.ops);
  };

  const handlerSetContent = (delta) => {
    console.log(delta);
    quill.setContents(delta);
  };

  const handleErrorMessage = (message) => {
    const { err:errorMessage, resolution } = message;
    setErr({
      error:errorMessage,
      resolution:resolution
    });
  }

  useEffect(() => {
    console.log("something changes");
    if (socket.socket == null || quill == null) return;

    socket.socket.on("new-updates", handlerUpdateContent);

    socket.socket.on("join-document-data", handlerSetContent);
    socket.socket.on("error_message", handleErrorMessage);
  }, [socket, quill]);

  useEffect(() => {
    
    socket.socket.emit("join-document", {
      documentId: documentId,
      userId: uuid()
    });
  }, [socket]);

  useEffect(() => {
    if (quill == null || socket.socket == null || documentId == null) return;
    quill.on("text-change", function (delta, oldDelta, source) {
      if (source == "user") {
        console.log(quill.getContents());
        socket.socket.emit("updates", {
          documentId: documentId,
          delta: delta,
        });
      }
    });
  }, [socket, quill]);

  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;
    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);
    const q = new Quill(editor, {
      modules: {
        toolbar: [[{ header: [1, 2, false] }], ["bold", "italic", "underline"]],
      },
      theme: "snow", // or 'bubble'
    });
    setQuill(q);
  }, []);

  if (!documentId) return <h1>No such document exists</h1>;
  if (err.error) return <div>
    <h1>Error: {err.error}</h1>
    <h1>Resolution: {err.resolution}</h1>
  </div>
  return <div className="document" ref={wrapperRef}></div>;
};
