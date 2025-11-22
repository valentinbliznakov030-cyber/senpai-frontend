import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx"; // <- тук вземаме App (който показва Home)
import "./styles/styles.css";
import "./styles/header.css";
import "./styles/index-styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    <App /> 
);