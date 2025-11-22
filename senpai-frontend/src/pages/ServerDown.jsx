import React from "react";
import { Link } from "react-router-dom";
import "../styles/error.css";

const ServerDown = () => {
  return (
    <div className="serverdown-container">
      <div className="serverdown-content">
        <h1 className="serverdown-title">⚠️ Сървърът е офлайн</h1>
        <p className="serverdown-subtitle">
          Няма връзка със сървъра. Може временно да не работи.
        </p>

        <Link to="/" className="serverdown-btn">
          ⏪ Назад към началото
        </Link>
      </div>
    </div>
  );
};

export default ServerDown;
