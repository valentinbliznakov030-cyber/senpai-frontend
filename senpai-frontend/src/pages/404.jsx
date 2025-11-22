import React from "react";
import { Link } from "react-router-dom";
import "../styles/error.css";

const NotFound = () => {
  return (
    <div className="serverdown-container">
      <div className="serverdown-content">
        <h1 className="serverdown-title">⚠️ Профилът не е намерен</h1>
        <p className="serverdown-subtitle">
          Профилът не е намерен. Може би е временно баннат или изтрит
        </p>

        <Link to="/" className="serverdown-btn">
          ⏪ Назад към началото
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
