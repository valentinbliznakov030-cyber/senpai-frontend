import React from "react";
import "../styles/about.css";
import aboutImage from "../assets/about.jpg";

const AboutUs = () => {
  return (
    <main className="about-container">
      <div className="about-hero">
        <div className="about-content">
          <div className="about-image-wrapper">
            <div className="about-image-placeholder">
              <div className="about-image-glow"></div>
              <img 
                src={aboutImage} 
                alt="SenpaiBG Character" 
                className="about-image"
              />
            </div>
          </div>
          
          <div className="about-text">
            <h1 className="about-title">
              За <span className="gradient-text">SenpaiBG</span>
            </h1>
            
            <div className="about-description">
              <p className="about-main-text">
                Това е платформа, която <strong>real-time</strong> създава видеата и субтитрите на български по готин начин.
              </p>
              <p className="about-sub-text">
                Предлагаме иновативно решение за гледане на аниме с автоматично генерирани български субтитри, което прави анимета достъпни за всички български фенове.
              </p>
            </div>

            <div className="about-features">
              <div className="feature-card">
                <div className="feature-icon">🎬</div>
                <h3>Real-time видео</h3>
                <p>Стрийминг на високо качество</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🇧🇬</div>
                <h3>Български субтитри</h3>
                <p>Автоматично генерирани</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>Бързо и лесно</h3>
                <p>Интуитивен интерфейс</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AboutUs;

