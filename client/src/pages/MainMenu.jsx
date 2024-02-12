import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";

export const MainMenu = () => {
  const navigate = useNavigate();
  return (
    <div>
      <Button
        style={{ display: "block", margin: "auto", width: "20vw" }}
        variant="outlined"
        onClick={() => {
          navigate("document");
        }}
      >
        Create Document
      </Button>
      <Button
        style={{
          display: "block",
          margin: "auto",
          marginTop: "5vh",
          width: "20vw",
        }}
        variant="outlined"
      >
        Open Existing Document
      </Button>
    </div>
  );
};
