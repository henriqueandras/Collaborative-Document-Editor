import Quill from "quill";
import "quill/dist/quill.snow.css";
import "./styles.css";
import { useCallback, useEffect } from "react";
export const Document = () => {
  const socket = new WebSocket("ws://localhost:8080");

  socket.onopen = function () {
    console.log("[open] Connection established");
    console.log("Sending to server");
    socket.send("Hi, I'm a client!");
  };

  socket.onmessage = function (event) {
    console.log(`[message] Data received from server: ${event.data}`);
  };

  socket.onclose = function (event) {
    if (event.wasClean) {
      console.log(
        `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`
      );
    } else {
      console.error("[close] Connection died");
    }
  };

  socket.onerror = function (error) {
    console.error(`[error] ${error.message}`);
  };

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
  }, []);

  return <div className="document" ref={wrapperRef}></div>;
};
