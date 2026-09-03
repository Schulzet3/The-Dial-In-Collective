import "./storage-shim.js";
import React from "react";
import ReactDOM from "react-dom/client";
import DialInCollective from "./DialInCollective.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DialInCollective />
  </React.StrictMode>
);
