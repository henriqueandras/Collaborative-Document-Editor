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
  const [quill, setQuill] = useState(null);
  const [err, setErr] = useState({
    error: "",
    resolution: ""
  });
  const socket = useContext(SocketClient);
  const userId = uuid();

  const [isLocked, setIsLocked] = useState(false);
  const [lockOwner, setLockOwner] = useState(null);

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
    if (socket.socket == null) return; 

    socket.socket.on("new-updates", handlerUpdateContent);
    socket.socket.on("join-document-data", handlerSetContent);
    socket.socket.on("error_message", handleErrorMessage);

    return () => {
      // Remove listeners on unmount
      socket.socket.off("new-updates", handlerUpdateContent);
      socket.socket.off("join-document-data", handlerSetContent);
      socket.socket.off("error_message", handleErrorMessage);
    }
  }, [socket]); // Only depend on socket

  useEffect(() => {
    socket.socket.emit("join-document", { documentId, userId });
  }, [socket, documentId, userId]); // Emit only when socket, documentId, or userId change

  useEffect(() => {
    const checkLockStatus = async () => {
      if (socket.socket && documentId) {
        socket.socket.emit('checkLock', { documentId, userId }, ({ locked, lockOwner }) => {
          setIsLocked(locked);
          setLockOwner(lockOwner);
        });
      }
    };

    checkLockStatus();
  }, [socket, documentId, userId]); // Same as above

  useEffect(() => {
    const handleLockEvent = (data) => {
      setIsLocked(true);
      setLockOwner(data.userId);
    };

    const handleUnlockEvent = (data) => {
      setIsLocked(false);
      setLockOwner(null);
    };

    socket.socket.on("lock", handleLockEvent);
    socket.socket.on("unlock", handleUnlockEvent);

    return () => {
      socket.socket.off("lock", handleLockEvent);
      socket.socket.off("unlock", handleUnlockEvent);
    };
  }, [socket]); // Depend only on socket

  useEffect(() => {
    if (quill == null) return;

    const handleTextChange = (delta, oldDelta, source) => {
      if (source === 'user') {
        socket.socket.emit("updates", { documentId, delta });
      }
    };

    quill.on("text-change", handleTextChange);

    return () => {
      quill.off('text-change', handleTextChange);
    };
  }, [documentId, quill, socket]); // Track quill for cleanup 

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

    if (isLocked && lockOwner !== userId) {
      q.disable(); 
    } else {
      q.enable();
    }

    setQuill(q);
  }, [isLocked, lockOwner, userId]);

  if (!documentId) return <h1>No such document exists</h1>;
  if (err.error) return <div>
    <h1>Error: {err.error}</h1>
    <h1>Resolution: {err.resolution}</h1>
  </div>

  return (
    <div className="document-container">
      {isLocked && lockOwner !== userId && (
        <div className="lock-message">
          Document locked by {lockOwner}
        </div>
      )}
      {!isLocked && (
        <button onClick={attemptLock}>Lock Document</button>
      )}
      {isLocked && lockOwner === userId && (
        <button onClick={releaseLock}>Unlock Document</button>
      )}
      <div className="document" ref={wrapperRef}></div>
    </div>
  );
};

