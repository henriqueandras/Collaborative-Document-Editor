import Quill from "quill";
import Delta from "quill-delta"
import "quill/dist/quill.snow.css";
import "./styles.css";
import { useCallback, useContext, useEffect, useState } from "react";
import { SocketClient } from "../SocketClientContext";
import { useSearchParams } from "react-router-dom";
import { v4 as uuid } from "uuid";

export const Document = () => {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get("id");
  const userId = uuid();
  const [quill, setQuill] = useState();
  const [ err, setErr ] = useState({
    error:"",
    resolution:""
  });
  const socket = useContext(SocketClient);

  const handlerUpdateContent = (delta) => {
    console.log("recieved:", delta);
    console.log("rec uid: ", delta.userId, " uid: ", userId);
    quill.updateContents(delta.ops);
    if(delta.userId === userId && delta.selection != null){
      console.log("setting selection");
      quill.setSelection(delta.selection.index, delta.selection.length);
    }
  };

  const handlerSetContent = (delta) => {
    console.log(delta);
    quill.setContents(delta);
  };

  const handlerRejoinDoc = (msg) => {
    console.log("rejoining doc...");
    socket.socket.emit("join-document", {
      documentId: documentId,
      userId: userId
    });
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
    socket.socket.on("rejoin-doc", handlerRejoinDoc);
    socket.socket.on("error_message", handleErrorMessage);
  }, [socket, quill]);

  useEffect(() => {
    
    socket.socket.emit("join-document", {
      documentId: documentId,
      userId: userId
    });
  }, [socket]);

  useEffect(() => {
    if (quill == null || socket.socket == null || documentId == null) return;
    quill.on("text-change", function (delta, oldDelta, source) {
      if (source == "user") {
        console.log(quill.getContents());
        const quillContent = quill.getContents();
        console.log("quillContent", quillContent);
        console.log("delta", delta);

        queueMicrotask(() => {
          delta.userId = userId;
          delta.selection = quill.getSelection();
          socket.socket.emit("updates", {
            documentId: documentId,
            delta: delta,
            content: quillContent
          });

          try{
            const d = new Delta(delta);
            console.log(d.slice());
            console.log("delta inverse", d.invert());
            console.log("oldDelta", oldDelta);
            quill.updateContents(d.invert(), "silent");
          }
          catch{
            quill.setContents(oldDelta);
            quill.setSelection(delta.selection.index, delta.selection.length);
          }
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
