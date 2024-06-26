import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainMenu } from "./pages/MainMenu";
import { Document } from "./pages/Document";
import SocketClientContext from "./SocketClientContext";
import ListDocuments from "./pages/ListDocuments";

// Set up Frontend for the Application using React
// Important stuff is in Document.jsx
function App() {
  return (
    <SocketClientContext>
      <BrowserRouter>
        <Routes>
          <Route index element={<MainMenu />} />
        </Routes>
        <Routes>
          <Route
            path="document"
            element={<Document  />}
          />
        </Routes>
        <Routes>
          <Route path="list" element={<ListDocuments />}/>
        </Routes>
      </BrowserRouter>
    </SocketClientContext>
  );
}

export default App;
