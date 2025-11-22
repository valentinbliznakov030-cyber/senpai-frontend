import React, { useEffect, useState, useRef } from "react";
import Fuse from "fuse.js";
import "../styles/index-styles.css";
import "../styles/styles.css";
import { redirectToServerDown } from "../utils/serverDownRedirect";

/* =====================================================
   safeFetch — същият модел като във watch.jsx
===================================================== */
async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const data = res.ok ? await res.json() : null;

    return {
      ok: res.ok,
      data,
      status: res.status,
      networkError: false,
    };
  } catch (err) {
    redirectToServerDown();
    return {
      ok: false,
      error: err,
      networkError: true,
    };
  }
}

const Home = () => {
  const [spotlight, setSpotlight] = useState([]);
  const [trending, setTrending] = useState([]);
  const [topAiring, setTopAiring] = useState([]);

  const [homeError, setHomeError] = useState(null);

  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderInterval = useRef(null);

  const [spotlightConsumetIds, setSpotlightConsumetIds] = useState({});

  /* =====================================================
     1️⃣ Consumet ID — не е критично → връща null
  ===================================================== */
  const findConsumetAnimeId = async (title) => {
    const result = await safeFetch(
      `http://localhost:3000/anime/animepahe/${encodeURIComponent(title)}`
    );

    if (result.networkError || !result.ok) return null;

    const data = result.data;
    if (!data?.results?.length) return null;

    const fuse = new Fuse(data.results, {
      keys: ["title"],
      threshold: 0.4,
    });

    const [bestMatch] = fuse.search(title);
    return bestMatch ? bestMatch.item.id : null;
  };

  /* =====================================================
     2️⃣ Home Data — КРИТИЧНО
  ===================================================== */
  useEffect(() => {
    const fetchHomeData = async () => {
      const result = await safeFetch("http://localhost:3030/api/v1/home");

      if (result.networkError) {
        return setHomeError("❌ Няма връзка със сървъра (network error).");
      }

      if (!result.ok || !result.data?.success) {
        return setHomeError("❌ Грешка при зареждане на началната страница.");
      }

      const data = result.data.data;

      setSpotlight(data.spotlight || []);
      setTrending(data.trending || []);
      setTopAiring(data.topAiring || []);
    };

    fetchHomeData();
  }, []);

  /* =====================================================
     3️⃣ Зареждаме Consumet IDs (не е критично)
  ===================================================== */
  useEffect(() => {
    const loadConsumetIds = async () => {
      let map = {};

      for (const anime of spotlight) {
        const id = await findConsumetAnimeId(anime.title);
        map[anime.id] = id;
      }

      setSpotlightConsumetIds(map);
    };

    if (spotlight.length > 0) loadConsumetIds();
  }, [spotlight]);

  /* =====================================================
     4️⃣ Spotlight autoplay
  ===================================================== */
  useEffect(() => {
    if (spotlight.length === 0) return;

    sliderInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % spotlight.length);
    }, 3500);

    return () => clearInterval(sliderInterval.current);
  }, [spotlight]);

  const goNext = () => {
    setCurrentSlide((prev) => (prev + 1) % spotlight.length);
    resetAutoplay();
  };

  const goPrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? spotlight.length - 1 : prev - 1));
    resetAutoplay();
  };

  const resetAutoplay = () => {
    clearInterval(sliderInterval.current);
    sliderInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % spotlight.length);
    }, 3500);
  };

  /* =====================================================
     Spotlight Slider
  ===================================================== */
  const renderSpotlightSlider = () => {
    if (spotlight.length === 0) return null;

    const anime = spotlight[currentSlide];
    const consumetId = spotlightConsumetIds[anime.id];

    const watchUrl =
      consumetId
        ? `/watch?animeTitle=${encodeURIComponent(anime.title)}&consumetAnimeId=${consumetId}&hianimeId=${anime.id}&ep=1`
        : "#";

    return (
      <div className="spotlight-slider" consumet-id={consumetId}>
        <div className="spotlight-bg">
          <img src={anime.poster} alt={anime.title} />
          <div className="spotlight-overlay"></div>
        </div>

        <div className="spotlight-content-new">
          <h2 className="spotlight-rank-new">#{anime.rank} Spotlight</h2>
          <h1 className="spotlight-title">{anime.title}</h1>

          <p className="spotlight-desc-new">
            {(anime.synopsis || "Няма описание...").slice(0, 40) + "..."}
          </p>

          <div className="spotlight-buttons">
            {consumetId ? (
              <a href={watchUrl} className="btn btn-primary">
                ▶ Гледай Сега
              </a>
            ) : (
              <button className="btn btn-primary" disabled>
                Зареждаме видео...
              </button>
            )}
          </div>
        </div>

        <button className="spotlight-arrow left" onClick={goPrev}>❮</button>
        <button className="spotlight-arrow right" onClick={goNext}>❯</button>

        <div className="spotlight-dots">
          {spotlight.map((_, index) => (
            <div
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`spotlight-dot ${currentSlide === index ? "active" : ""}`}
            ></div>
          ))}
        </div>
      </div>
    );
  };

  /* =====================================================
     Small Card
  ===================================================== */
  const renderSmallCard = (anime) => (
    <div key={anime.id} className="card small-card">
      <div className="small-card-img">
        <img src={anime.poster} alt={anime.title} />
      </div>

      <h3>{anime.title}</h3>

      <a
        href={`/anime-details?animeId=${anime.id}`}
        className="btn btn-primary"
        style={{ marginTop: "12px", width: "100%" }}
      >
        Виж
      </a>
    </div>
  );

  /* =====================================================
     5️⃣ Home Error Overlay (уникален за Home.jsx)
  ===================================================== */
  if (homeError) {
    return (
      <main className="container" style={{ position: "relative" }}>
        <section className="spotlight-section-new">
          <div className="home-error-overlay">
            <div className="home-error-box">
              <div className="home-error-title">⚠ Сървърът не отговаря</div>
              <div className="home-error-message">
                Опитайте по-късничко! Става ли?
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /* =====================================================
     6️⃣ Layout (нормален)
  ===================================================== */
  return (
    <main className="container">

      <section className="spotlight-section-new">
        {renderSpotlightSlider()}
      </section>

      <section className="trending-section">
        <div className="section-header">
          <h2>
            <span className="gradient-text">Trending</span> Анимета
          </h2>
        </div>

        <div className="grid-container">
          {trending.slice(0, 6).map(renderSmallCard)}
        </div>
      </section>

      <section className="top-airing-section">
        <div className="section-header">
          <h2>
            <span className="gradient-text">Top Airing</span> Анимета
          </h2>
        </div>

        <div className="grid-container">
          {topAiring.slice(0, 6).map(renderSmallCard)}
        </div>
      </section>

    </main>
  );
};

export default Home;
