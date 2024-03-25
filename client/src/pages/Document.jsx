import Quill from "quill";
import "quill/dist/quill.snow.css";
import "./styles.css";
import { useCallback, useContext, useEffect, useState, useRef } from "react";
import { SocketClient } from "../SocketClientContext";
import { useSearchParams } from "react-router-dom";
import { v4 as uuid } from "uuid";
import OperationalTransform, { comparison } from "../OperationalTransform/OperationalTransform";

function syncTimeout(time){
  const beg = Date.now();
  while(Date.now()-beg<time){
    //do nothing
  }
}

export const Document = () => {
  const ot = new OperationalTransform();
  // const defaultTransform = {ops:[{retain:0},{insert:''}]};
  const [searchParams] = useSearchParams();
  // const [ prevTransform, setPrevTransform ] = useState("BEG");
  const documentId = searchParams.get("id");
  const [quill, setQuill] = useState();
  const [ err, setErr ] = useState({
    error:"",
    resolution:""
  });
  const socket = useContext(SocketClient);
  const prevTransformationList = useRef([]);
  const version = useRef(0);
  const [userId, setUserId] = useState(0);

  const print = (str) => {
    console.log(str);
  }

  const handlerUpdateContent = (delta) => {
    console.log("recieved:", delta);
    console.log("list", prevTransformationList.current.length);
    const transformsToPerform = comparison(prevTransformationList.current, delta ,ot, print);
    console.log(`NEW: ${JSON.stringify(transformsToPerform)}, OLD: ${JSON.stringify(delta)}`);
    if("ops" in transformsToPerform.operation){
      if("retain" in transformsToPerform.operation.ops[0]){
        const content = quill.getContents() ?? "";
        const minLength = transformsToPerform.operation.ops[0].retain < content.length() ? transformsToPerform.operation.ops[0].retain : transformsToPerform.operation.ops[0].retain-1;
        const revisedOp = {ops:[{retain:minLength},transformsToPerform.operation.ops[1]]};
        console.log("minLength",content.length(), transformsToPerform.operation.ops[0].retain);

        quill.updateContents(revisedOp);
        prevTransformationList.current.push({
          operation:revisedOp,
          version:transformsToPerform.version,
          userId: delta.userId
        });
      }else{
        console.log("transformsToPerform.operation",transformsToPerform.operation);
        quill.updateContents(transformsToPerform.operation);
        prevTransformationList.current.push({
          operation:transformsToPerform.operation,
          version:transformsToPerform.version,
          userId: delta.userId
        });
      }
    }else{
      transformsToPerform.operation.forEach((newOp)=>{
        if("retain" in newOp.ops[0]){
          const content = quill.getContents() ?? "";
          const minLength = newOp.ops[0].retain < content.length() ? newOp.ops[0].retain : newOp.ops[0].retain-1;
          const revisedOp = {ops:[{retain:minLength},newOp.ops[1]]};
          console.log("minLength",content.length(), newOp.ops[0].retain);
          quill.updateContents(revisedOp);
          prevTransformationList.current.push({
            operation:revisedOp,
            version:transformsToPerform.version,
            userId: delta.userId
          });
        }else{
          console.log("newOps", newOp.ops);
          quill.updateContents(newOp.ops);
          prevTransformationList.current.push({
            operation:newOp,
            version:transformsToPerform.version,
            userId: delta.userId
          });
        }
      });
    }
    version.current = transformsToPerform.version;
    // const [newReceivedTransforms,prev] = ot.handleTransforms(prevTransform, delta);
    // newReceivedTransforms.forEach((newReceivedTransform)=>{
    //   console.log("Applying:", newReceivedTransform.ops);
    //   if("retain" in newReceivedTransform.ops[0]){
    //     const length = quill.getContents()?.ops[0]?.insert?.length || 1;
    //     newReceivedTransform.ops[0].retain = Math.min(newReceivedTransform.ops[0].retain, length-1);
    //   }
    //   quill.updateContents(newReceivedTransform.ops);
    // });
    // const arr = prevTransform === "BEG" ? [] : prevTransform;
    // setPrevTransform([...arr, prev]);
  };

  const handlerSetContent = (data) => {
    console.log(data);
    setUserId(data.userId);
    version.current = data.version;
    quill.setContents(data.delta);
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
        console.log(delta);
        const quillContent = quill.getContents();
        console.log("quillContent", quillContent);
        prevTransformationList.current.push({
          operation:delta,
          version:version.current,
          userId: userId
        })
        // syncTimeout(2000);
        setTimeout(()=>{
          socket.socket.emit("updates", {
            documentId: documentId,
            delta: delta,
            content: quillContent,
            userId: userId,
            version:version.current
          });
          version.current++
        },2000);
        // setPrevTransform(ot.ensureStructure(delta));
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
