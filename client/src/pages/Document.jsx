import Quill from "quill";
import "quill/dist/quill.snow.css";
import "./styles.css";
import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";

export const Document = () => {
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();

  useEffect(() => {
    const s = io("http://localhost:3001");
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  // const handler = (delta) => {
  //   quill.updateContents(delta);
  // };
  // socket.on("new-updates", handler);

  useEffect(() => {
    quill.on("text-change", function (delta, oldDelta, source) {
      if (source == "user") {
        console.log(delta);
        socket.emit("updates", delta);
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

  return <div className="document" ref={wrapperRef}></div>;
};
