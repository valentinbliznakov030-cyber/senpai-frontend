import React, { useEffect, useState } from "react";
import "../styles/500.css";

const ServerDown = () => {
    const [dots, setDots] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => {
                if (prev === "...") return "";
                return prev + ".";
            });
        }, 500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="server-down-container">
            <div className="server-down-content">
                <div className="server-down-icon">
                    <div className="server-icon">
                        <div className="server-screen">
                            <div className="screen-line"></div>
                            <div className="screen-line"></div>
                            <div className="screen-line"></div>
                        </div>
                        <div className="server-base"></div>
                        <div className="server-light"></div>
                    </div>
                </div>

                <h1 className="server-down-title">
                    <span className="glitch" data-text="Сървърът е недостъпен">
                        Сървърът е недостъпен
                    </span>
                </h1>

                <p className="server-down-subtitle">
                    Сървърът не отговаря в момента{dots}
                </p>

                <div className="server-down-details">
                    <div className="detail-item">
                        <span className="detail-icon">🔧</span>
                        <span>Сървърът може да е в процес на поддръжка</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-icon">⚡</span>
                        <span>Моля, опитайте отново след няколко секунди</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-icon">🌐</span>
                        <span>Проверете интернет връзката си</span>
                    </div>
                </div>

                <div className="server-down-actions">
                    <button 
                        className="retry-btn" 
                        onClick={() => window.location.reload()}
                    >
                        <span className="retry-icon">🔄</span>
                        Опитай отново
                    </button>
                    <button 
                        className="home-btn"
                        onClick={() => window.location.href = "/"}
                    >
                        <span className="home-icon">🏠</span>
                        Начало
                    </button>
                </div>

                <div className="server-down-footer">
                    <p>Ако проблемът продължава, моля свържете се с администратора</p>
                </div>
            </div>

            {/* Animated background particles */}
            <div className="particles">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="particle" style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 3}s`,
                        animationDuration: `${3 + Math.random() * 2}s`
                    }}></div>
                ))}
            </div>
        </div>
    );
};

export default ServerDown;

