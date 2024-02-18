import Quill from "quill";
import "quill/dist/quill.snow.css";
import "./styles.css";
import { useCallback, useContext, useEffect, useState } from "react";
import {SocketClient} from "../SocketClientContext";
import {useSearchParams} from 'react-router-dom';

export const Document = () => {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('id');
  const [quill, setQuill] = useState();
  const socket = useContext(SocketClient);
  
  
  useEffect(()=>{
    if(socket == null || quill == null) return;

    const handler = (delta) => {
      console.log("recieved:",delta);
      quill.updateContents(delta);
    };

    socket.on("new-updates", handler);
  },[socket]);

  useEffect(() => {
    if( quill == null || socket == null || documentId == null) return;
    quill.on("text-change", function (delta, oldDelta, source) {
      if (source == "user") {
        console.log(delta);
        socket.emit("updates", {
          documentId:documentId,
          delta:delta
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

  if(!documentId) return <h1>No such document exists</h1>

  return <div className="document" ref={wrapperRef}></div>;
};
