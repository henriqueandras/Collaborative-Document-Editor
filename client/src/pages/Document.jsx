import Quill from "quill";
import "quill/dist/quill.snow.css";
import "./styles.css";
import { useCallback, useContext, useEffect, useState, useRef } from "react";
import { SocketClient } from "../SocketClientContext";
import { useSearchParams } from "react-router-dom";
import { v4 as uuid } from "uuid";
import {
  comparison,
  adjustForQuill,
  reviseHistory,
} from "../OperationalTransform/OperationalTransform";

// QuillCursors library for adding cursors to the document so users can see each other's cursor (Work-In-Progress Feature)
import QuillCursors from "quill-cursors";
Quill.register("modules/cursors", QuillCursors);

/*
* Some commonly seen functions in this file include socket.on and socket.emit
* These are part of the networking library used and help the client communicate with the proxy and server
* socket.on is for listening to updates asynchronously from the proxy
* socket.emit is for sending updates asynchronously to the proxy
*/
export const Document = () => {
  /*
  * Various parameters needed to maintain frontend health
  * UseState from React is used to check if parameters have been initialized or not
  */
  const [searchParams] = useSearchParams(); 
  const documentId = searchParams.get("id"); 
  const [quill, setQuill] = useState(); 
  const [err, setErr] = useState({
    error: "",
    resolution: "",
  });
  const [cursor, setCursor] = useState(); 
  const socket = useContext(SocketClient);
  const prevTransformationList = useRef([]);
  const version = useRef(0);
  const userId = useRef(uuid());
  const uId = useRef(0);
  const sendList = useRef([]);

  /*
  * used for debugging purposes
  */
  const print = (str) => {
    console.log(str);
  };

  /*
  * handlerUpdateContent is a function that is called anytime the client receives new updates from the proxy. 
  * the function calls inside it are calling operational transformation functions for client-side consistency
  */
  const handlerUpdateContent = (delta) => {
    console.log("recieved:", delta);
    console.log("list", prevTransformationList.current);
    const transformsToPerform = comparison(
      prevTransformationList.current,
      delta,
      print
    );
    if (transformsToPerform.length > 0) {
      for (const op in transformsToPerform) {
        console.log(`New:`, op);
      }
    } else {
      console.log(`New: `, transformsToPerform);
    }

    if ("ops" in transformsToPerform.operation) {
      console.log(
        "transformsToPerform.operation",
        transformsToPerform.operation
      );
      quill.updateContents(adjustForQuill(transformsToPerform.operation));
      prevTransformationList.current.push({
        operation: transformsToPerform.operation,
        version: prevTransformationList.current.length + 1,
        userId: delta.userId,
        uId: delta.uId,
        prevVersion: delta.version,
        deltaId: delta.deltaId,
        og: delta.operation,
      });
    } else {
      transformsToPerform.operation.forEach((newOp) => {
        console.log("newOps", newOp.ops);
        quill.updateContents(adjustForQuill(newOp));
        prevTransformationList.current.push({
          operation: newOp,
          version: prevTransformationList.current.length + 1,
          userId: delta.userId,
          uId: delta.uId,
          prevVersion: delta.version,
          deltaId: delta.deltaId,
          og: delta.operation,
        });
      });
    }
    version.current =
      prevTransformationList.current.length > 0
        ? prevTransformationList.current[
            prevTransformationList.current.length - 1
          ].version
        : 0;
    console.log("recieved version", version.current);
  };

  /*
  * When an existing document is opened, we want to set the content of the text editor to 
  * the existing document's text data
  */
  const handlerSetContent = (data) => {
    console.log(data);
    version.current = data.version;
    quill.setContents(data.delta);
    uId.current = data.userId;
  };

  /*
  * Tell the proxy that you would like to rejoin the document
  */
  const handlerRejoinDoc = (msg) => {
    console.log("rejoining doc...");
    socket.socket.emit("join-document", {
      documentId: documentId,
      userId: uuid(),
    });
  };

  const handleErrorMessage = (message) => {
    const { err: errorMessage, resolution } = message;
    setErr({
      error: errorMessage,
      resolution: resolution,
    });
  };

  /*
  * Listen for various updates from proxy and call the 
  * Appropriate handler
  */
  useEffect(() => {
    console.log("something changes");
    if (socket.socket == null || quill == null) return;

    socket.socket.on("new-updates", handlerUpdateContent);

    socket.socket.on("join-document-data", handlerSetContent);
    socket.socket.on("rejoin-doc", handlerRejoinDoc);
    socket.socket.on("error_message", handleErrorMessage);
  }, [socket, quill]);

  /*
  * Let proxy know that you would like to access the document with the specific document id.
  */
  useEffect(() => {
    socket.socket.emit("join-document", {
      documentId: documentId,
      userId: uuid(),
    });
  }, [socket]);

  useEffect(() => {
    /*
    * We need to check when quill or documentIds are null otherwise react
    * will give errors and try to use these variables on re-renders when they are not
    * yet set.
    */
    if (
      quill == null ||
      socket.socket == null ||
      documentId == null ||
      cursor == null
    )
      return;
    quill.on("selection-change", function (range, oldRange, source) {
      if (source === "user") {
        setTimeout(() => cursor.moveCursor("cursor", range), 1);
      }
    });
    /*
    * If receiving a text-change update, check the version of the updates with the current version
    * and apply the necessary updates and deltas using operational transform and quill to correctly update the client
    */
    quill.on("text-change", function (delta, oldDelta, source) {
      if (source == "user") {
        console.log("DELTA", delta);
        const quillContent = quill.getContents();
        console.log("quillContent", quillContent);
        prevTransformationList.current.push({
          operation: delta,
          version: version.current + 1,
          userId: userId.current,
          uId: uId.current,
        });
        const ver = version.current;
        const deltaId = uuid();
        socket.socket.emit("updates", {
          documentId: documentId,
          delta: delta,
          content: quillContent,
          userId: userId.current,
          version: ver + 1,
          uId: uId.current,
          prevDelta: sendList.current[sendList.current.length - 1],
          deltaId: deltaId,
        });
        sendList.current.push({
          deltaId: deltaId,
          delta: delta,
        });

        version.current++;
        console.log("Current version", version.current);
      }
    });
  }, [socket, quill, cursor]);

  /*
  * This is just creating the text editor and the cursor objects
  * The text editor is fairly basic, only bold, italic, and underlines are used
  */
  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;
    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);
    const q = new Quill(editor, {
      modules: {
        toolbar: [[{ header: [1, 2, false] }], ["bold", "italic", "underline"]],
        cursors: {
          transformOnTextChange: true,
        },
      },
      theme: "snow", // or 'bubble'
    });
    let c = q.getModule("cursors");
    c.createCursor("cursor", "You", "blue");
    setQuill(q);
    setCursor(c);
  }, []);

  if (!documentId) return <h1>No such document exists</h1>;
  if (err.error)
    return (
      <div>
        <h1>Error: {err.error}</h1>
        <h1>Resolution: {err.resolution}</h1>
      </div>
    );
  return <div className="document" ref={wrapperRef}></div>;
};
