import Quill from "quill";
import "quill/dist/quill.snow.css";
import "./styles.css";
import { useCallback, useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { v4 as uuid } from "uuid";
import { SocketClient } from "../SocketClientContext"; // Ensure this path matches your project structure

export const Document = () => {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get("id");
  const [quill, setQuill] = useState();
  const [locked, setLocked] = useState(false); // New state to track document lock status
  const [ err, setErr ] = useState({
    error:"",
    resolution:""
  });
  const { socket } = useContext(SocketClient); // Destructuring to directly get `socket`
  const userId = uuid(); // Moved out of useEffect to avoid generating a new ID on each render

  useEffect(() => {
    if (socket == null || quill == null || documentId == null) return;

    const handlerUpdateContent = (delta) => {
      console.log("received:", delta);
      quill.updateContents(delta.ops);
    };

    const handlerSetContent = (delta) => {
      console.log(delta);
      quill.setContents(delta);
    };

    const handleLockEvent = ({ documentId: docId, userId: uid }) => {
      if (documentId === docId && userId !== uid) {
        setLocked(true);
        // Optionally, display a message to the user that the document is locked
      }
    };

    const handleUnlockEvent = ({ documentId: docId }) => {
      if (documentId === docId) {
        setLocked(false);
        // Optionally, remove the lock message
      }
    };

    socket.on("new-updates", handlerUpdateContent);
    socket.on("join-document-data", handlerSetContent);
    socket.on("lock", handleLockEvent);
    socket.on("unlock", handleUnlockEvent);

    return () => {
      socket.off("new-updates", handlerUpdateContent);
      socket.off("join-document-data", handlerSetContent);
      socket.off("lock", handleLockEvent);
      socket.off("unlock", handleUnlockEvent);
    };
  }, [socket, quill, documentId]);

  useEffect(() => {
    if (socket == null || documentId == null) return;

    socket.emit("join-document", { documentId, userId });

    // Emit checkLock event to determine if the document is currently locked
    socket.emit("checkLock", { documentId, userId }, ({ locked }) => {
      setLocked(locked);
    });
  }, [socket, documentId]);

  useEffect(() => {
    if (quill == null || socket == null || documentId == null || locked) return;

    const handleChange = function (delta, oldDelta, source) {
      if (source === "user") {
        console.log(quill.getContents());
        socket.emit("updates", {
          documentId,
          delta,
        });
      }
    };

    quill.on("text-change", handleChange);

    return () => {
      quill.off("text-change", handleChange);
    };
  }, [socket, quill, documentId, locked]);

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
  if (locked) return <h1>Document is currently being edited by another user</h1>;
  return <div className="document" ref={wrapperRef}></div>;
};
