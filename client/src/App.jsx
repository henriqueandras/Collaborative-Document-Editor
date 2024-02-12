import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainMenu } from "./pages/MainMenu";
import { Document } from "./pages/Document";

function App() {
  return (
    <>
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
      </BrowserRouter>
    </>
  );
}

export default App;
